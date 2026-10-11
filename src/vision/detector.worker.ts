/// <reference lib="webworker" />
import { YoloSession } from './yoloSession';
import type { WorkerRequest, WorkerResponse } from '../types';

/**
 * Inference worker: hosts the ONNX session off the main thread so model
 * download, preprocessing and inference never block React rendering.
 */

const ctx = self as unknown as DedicatedWorkerGlobalScope;

let session: YoloSession | null = null;
let busy = false;
let pending: Extract<WorkerRequest, { type: 'detect' }> | null = null;

function post(message: WorkerResponse): void {
  ctx.postMessage(message);
}

ctx.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === 'init') {
    void handleInit(msg);
  } else if (msg.type === 'detect') {
    if (busy) {
      // Coalesce: keep only the newest frame while a run is in flight.
      pending = msg;
    } else {
      void handleDetect(msg);
    }
  }
});

async function handleInit(msg: Extract<WorkerRequest, { type: 'init' }>): Promise<void> {
  try {
    session?.dispose();
    session = new YoloSession({
      modelUrl: msg.modelUrl,
      wasmPaths: msg.wasmPaths,
      inputSize: msg.inputSize,
    });
    await session.init((status) => {
      if (status.state === 'downloading') {
        post({
          type: 'progress',
          phase: 'downloading',
          loadedBytes: status.loadedBytes,
          totalBytes: status.totalBytes,
        });
      } else if (status.state === 'loading') {
        post({ type: 'progress', phase: 'loading' });
      } else if (status.state === 'ready') {
        post({ type: 'ready', loadMs: status.loadMs });
      } else if (status.state === 'error') {
        post({ type: 'error', message: status.message, recoverable: status.recoverable });
      }
    });
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
      recoverable: true,
    });
  }
}

async function handleDetect(msg: Extract<WorkerRequest, { type: 'detect' }>): Promise<void> {
  if (!session || !session.ready) {
    post({ type: 'error', message: 'Detector not ready', recoverable: true });
    return;
  }
  busy = true;
  try {
    const rgba = new Uint8ClampedArray(msg.pixels);
    const result = await session.detect(rgba, msg.width, msg.height, {
      confThreshold: msg.confThreshold,
      iouThreshold: msg.iouThreshold,
    });
    post({
      type: 'result',
      frameId: msg.frameId,
      latencyMs: result.latencyMs,
      detections: result.detections,
    });
  } catch (err) {
    post({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
      recoverable: true,
    });
  } finally {
    busy = false;
    if (pending) {
      const next = pending;
      pending = null;
      void handleDetect(next);
    }
  }
}

export {};
