import type { ModelStatus } from '../types';
import { DEFAULT_MODEL_URL, MODEL_INPUT_SIZE } from '../core/coco';
import type { ObjectDetector, RawDetectionResult } from './detector.types';

const DEFAULT_WASM_PATHS = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/';

interface PendingFrame {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  options: { confThreshold: number; iouThreshold: number };
  frameId: number;
}

/**
 * Browser-side ObjectDetector backed by the ONNX inference worker.
 * Frames arriving while the worker is busy are coalesced (latest wins) so
 * the pipeline never queues unbounded work.
 */
export class OnnxDetector implements ObjectDetector {
  readonly id = 'onnx-yolov5s';
  readonly name = 'YOLOv5s ONNX (onnxruntime-web, Web Worker)';
  private worker: Worker | null = null;
  private _ready = false;
  private modelUrl: string;
  private wasmPaths: string;
  private nextFrameId = 1;
  private inFlight = false;
  private pending: PendingFrame | null = null;
  private waiters = new Map<
    number,
    { resolve: (r: RawDetectionResult) => void; reject: (e: Error) => void }
  >();
  private statusCallback: ((s: ModelStatus) => void) | null = null;
  private lastError: string | null = null;

  constructor(modelUrl = DEFAULT_MODEL_URL, wasmPaths = DEFAULT_WASM_PATHS) {
    this.modelUrl = modelUrl;
    this.wasmPaths = wasmPaths;
  }

  get ready(): boolean {
    return this._ready;
  }

  async init(onStatus: (status: ModelStatus) => void): Promise<void> {
    if (this._ready) {
      onStatus({ state: 'ready', loadMs: 0 });
      return;
    }
    this.statusCallback = onStatus;
    if (!this.worker) {
      this.worker = new Worker(new URL('./detector.worker.ts', import.meta.url), {
        type: 'module',
      });
      this.worker.addEventListener('message', this.onMessage);
      this.worker.addEventListener('error', this.onWorkerError);
    }
    this.worker.postMessage({
      type: 'init',
      modelUrl: this.modelUrl,
      wasmPaths: this.wasmPaths,
      inputSize: MODEL_INPUT_SIZE,
    });
    // Resolve when ready or error arrives (status callback already fired).
    await new Promise<void>((resolve, reject) => {
      const check = setInterval(() => {
        if (this._ready) {
          clearInterval(check);
          resolve();
        } else if (this.lastError) {
          clearInterval(check);
          reject(new Error(this.lastError));
        }
      }, 100);
    });
  }

  private onMessage = (event: MessageEvent): void => {
    const msg = event.data as
      | { type: 'progress'; phase: string; loadedBytes: number; totalBytes: number | null }
      | { type: 'ready'; loadMs: number }
      | { type: 'error'; message: string; recoverable: boolean }
      | { type: 'result'; frameId: number; latencyMs: number; detections: RawDetectionResult['detections'] };
    switch (msg.type) {
      case 'progress':
        this.statusCallback?.({
          state: 'downloading',
          loadedBytes: msg.loadedBytes,
          totalBytes: msg.totalBytes,
        });
        break;
      case 'ready':
        this._ready = true;
        this.lastError = null;
        this.statusCallback?.({ state: 'ready', loadMs: msg.loadMs });
        break;
      case 'error':
        this.lastError = msg.message;
        this.statusCallback?.({ state: 'error', message: msg.message, recoverable: msg.recoverable });
        break;
      case 'result': {
        const waiter = this.waiters.get(msg.frameId);
        if (waiter) {
          this.waiters.delete(msg.frameId);
          waiter.resolve({ detections: msg.detections, latencyMs: msg.latencyMs });
        }
        this.inFlight = false;
        if (this.pending) {
          const next = this.pending;
          this.pending = null;
          void this.dispatch(next);
        }
        break;
      }
    }
  };

  private onWorkerError = (event: ErrorEvent): void => {
    const message = event.message || 'Inference worker crashed';
    this.lastError = message;
    this.statusCallback?.({ state: 'error', message, recoverable: true });
    for (const [, w] of this.waiters) w.reject(new Error(message));
    this.waiters.clear();
    this.inFlight = false;
    this.pending = null;
  };

  async detect(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    options: { confThreshold: number; iouThreshold: number },
  ): Promise<RawDetectionResult> {
    if (!this.worker || !this._ready) throw new Error('Detector is not ready');
    const frameId = this.nextFrameId++;
    const frame: PendingFrame = { rgba, width, height, options, frameId };
    if (this.inFlight) {
      // Coalesce: replace any previously pending frame; its promise rejects
      // as superseded so callers can drop it silently.
      if (this.pending) {
        const old = this.waiters.get(this.pending.frameId);
        if (old) {
          this.waiters.delete(this.pending.frameId);
          old.reject(new Error('superseded'));
        }
      }
      this.pending = frame;
      return new Promise<RawDetectionResult>((resolve, reject) => {
        this.waiters.set(frameId, { resolve, reject });
      });
    }
    return new Promise<RawDetectionResult>((resolve, reject) => {
      this.waiters.set(frameId, { resolve, reject });
      void this.dispatch(frame);
    });
  }

  private dispatch(frame: PendingFrame): void {
    if (!this.worker) return;
    this.inFlight = true;
    // Copy into a standalone transferable buffer.
    const copy = frame.rgba.slice().buffer;
    this.worker.postMessage(
      {
        type: 'detect',
        frameId: frame.frameId,
        width: frame.width,
        height: frame.height,
        pixels: copy,
        confThreshold: frame.options.confThreshold,
        iouThreshold: frame.options.iouThreshold,
      },
      [copy],
    );
  }

  dispose(): void {
    this.worker?.removeEventListener('message', this.onMessage);
    this.worker?.removeEventListener('error', this.onWorkerError);
    this.worker?.terminate();
    this.worker = null;
    this._ready = false;
    this.waiters.clear();
    this.pending = null;
  }
}
