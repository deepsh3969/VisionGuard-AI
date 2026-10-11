import * as ort from 'onnxruntime-web';
import { computeLetterbox, inputBoxToSource, rasterizeLetterbox } from '../core/preprocess';
import { postprocessYolo } from '../core/yolo';
import { clampBox } from '../core/geometry';
import { labelForClass, MODEL_INPUT_SIZE } from '../core/coco';
import type { ModelStatus } from '../types';
import type { RawDetectionResult } from './detector.types';

export interface YoloSessionOptions {
  modelUrl: string;
  wasmPaths: string;
  inputSize?: number;
  /** Execution providers; default ['wasm']. */
  executionProviders?: string[];
}

/**
 * Direct ONNX Runtime Web session wrapper. Runs in the browser worker (and
 * in Node for integration tests). Handles model download with progress,
 * tensor preprocessing, inference and YOLOv5 postprocessing.
 */
export class YoloSession {
  private session: ort.InferenceSession | null = null;
  private inputSize: number;
  private options: YoloSessionOptions;
  /** Some YOLOv5 ONNX exports use fp16 inputs; auto-detected on first run. */
  private inputDtype: 'float32' | 'float16' = 'float32';

  constructor(options: YoloSessionOptions) {
    this.options = options;
    this.inputSize = options.inputSize ?? MODEL_INPUT_SIZE;
  }

  get ready(): boolean {
    return this.session !== null;
  }

  async init(onStatus: (status: ModelStatus) => void): Promise<void> {
    if (this.session) return;
    ort.env.wasm.wasmPaths = this.options.wasmPaths;
    // Single-threaded WASM: works without cross-origin isolation headers.
    ort.env.wasm.numThreads = 1;

    onStatus({ state: 'downloading', loadedBytes: 0, totalBytes: null });
    const modelBytes = await fetchModel(this.options.modelUrl, (loaded, total) => {
      onStatus({ state: 'downloading', loadedBytes: loaded, totalBytes: total });
    });
    onStatus({ state: 'loading' });
    const t0 = performance.now();
    this.session = await ort.InferenceSession.create(modelBytes, {
      executionProviders: this.options.executionProviders ?? ['wasm'],
    });
    onStatus({ state: 'ready', loadMs: performance.now() - t0 });
  }

  async detect(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    options: { confThreshold: number; iouThreshold: number },
  ): Promise<RawDetectionResult> {
    const session = this.session;
    if (!session) throw new Error('Detector is not initialized');
    const t0 = performance.now();

    const transform = computeLetterbox(width, height, this.inputSize);
    const chw = rasterizeLetterbox(rgba, width, height, transform);
    const dims: number[] = [1, 3, this.inputSize, this.inputSize];

    let output: ort.Tensor;
    try {
      output =
        this.inputDtype === 'float16'
          ? await runSession(session, 'float16', toFloat16Bits(chw), dims)
          : await runSession(session, 'float32', chw, dims);
    } catch (err) {
      // Half-precision exports reject float32 inputs — retry in float16.
      if (this.inputDtype === 'float32' && /float16/i.test(err instanceof Error ? err.message : String(err))) {
        this.inputDtype = 'float16';
        output = await runSession(session, 'float16', toFloat16Bits(chw), dims);
      } else {
        throw err;
      }
    }

    const shape = output.dims.map(Number);
    const data =
      output.data instanceof Float32Array
        ? output.data
        : Float32Array.from(output.data as ArrayLike<number>);

    const decoded = postprocessYolo(data, shape, options.confThreshold, options.iouThreshold);
    const detections = decoded.map((d) => {
      const sourceBox = inputBoxToSource(d.box, transform);
      return {
        classId: d.classId,
        label: labelForClass(d.classId),
        score: d.score,
        box: clampBox(sourceBox, width, height),
      };
    });

    return { detections, latencyMs: performance.now() - t0 };
  }

  dispose(): void {
    this.session?.release();
    this.session = null;
  }
}

async function runSession(
  session: ort.InferenceSession,
  dtype: 'float32' | 'float16',
  data: Float32Array | Uint16Array,
  dims: number[],
): Promise<ort.Tensor> {
  const tensor = new ort.Tensor(dtype, data, dims);
  const inputName = session.inputNames[0];
  const feeds: Record<string, ort.Tensor> = { [inputName]: tensor };
  const outputMap = await session.run(feeds);
  const output = outputMap[session.outputNames[0]];
  if (!output || output.data.length === 0) {
    throw new Error('Model produced an empty output tensor');
  }
  return output;
}

/**
 * Convert float32 values to IEEE 754 half-precision bits.
 * Handles the [0,1] range used by image preprocessing (no denormals needed).
 */
export function toFloat16Bits(values: Float32Array): Uint16Array {
  const out = new Uint16Array(values.length);
  const buf = new ArrayBuffer(4);
  const f32 = new Float32Array(buf);
  const u32 = new Uint32Array(buf);
  for (let i = 0; i < values.length; i++) {
    f32[0] = values[i];
    const x = u32[0];
    const sign = (x >>> 16) & 0x8000;
    const exp = ((x >>> 23) & 0xff) - 127 + 15;
    if (exp <= 0) {
      out[i] = sign;
    } else if (exp >= 31) {
      out[i] = sign | 0x7c00;
    } else {
      out[i] = sign | (exp << 10) | ((x >>> 13) & 0x3ff);
    }
  }
  return out;
}

/** Fetch a model URL with byte-level progress. */
export async function fetchModel(
  url: string,
  onProgress: (loaded: number, total: number | null) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Model download failed: HTTP ${response.status} for ${url}`);
  }
  const lengthHeader = response.headers.get('content-length');
  const total = lengthHeader ? Number(lengthHeader) : null;

  if (!response.body) {
    const buf = await response.arrayBuffer();
    onProgress(buf.byteLength, buf.byteLength);
    return buf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.byteLength;
      onProgress(loaded, total);
    }
  }
  const out = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}
