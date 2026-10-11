import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { BoundingBox, HandDetection, ModelStatus } from '../types';
import { boxUnion } from '../core/geometry';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

type MediaSource = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement | ImageBitmap;

/**
 * MediaPipe Hand Landmarker adapter (runs on the main thread at a lower
 * frequency than object detection). Supports up to two hands.
 */
export class HandLandmarkerAdapter {
  private landmarker: HandLandmarker | null = null;
  private _ready = false;

  get ready(): boolean {
    return this._ready;
  }

  async init(onStatus: (status: ModelStatus) => void): Promise<void> {
    if (this._ready) return;
    onStatus({ state: 'loading' });
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      onStatus({ state: 'downloading', loadedBytes: 0, totalBytes: null });
      const modelResponse = await fetch(MODEL_URL);
      if (!modelResponse.ok) {
        throw new Error(`Hand model download failed: HTTP ${modelResponse.status}`);
      }
      const modelBuffer = await modelResponse.arrayBuffer();
      this.landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer: new Uint8Array(modelBuffer), delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.4,
        minHandPresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });
      this._ready = true;
      onStatus({ state: 'ready', loadMs: 0 });
    } catch (err) {
      this._ready = false;
      onStatus({
        state: 'error',
        message: err instanceof Error ? err.message : String(err),
        recoverable: true,
      });
      throw err;
    }
  }

  /**
   * Detect hands in a media source.
   * @param timestampMs monotonic milliseconds (required to be increasing in VIDEO mode)
   * @param sourceWidth pixel width of the source (landmarks arrive normalized)
   * @param sourceHeight pixel height of the source
   */
  detect(source: MediaSource, timestampMs: number, sourceWidth: number, sourceHeight: number): HandDetection[] {
    const lm = this.landmarker;
    if (!lm || !this._ready) return [];
    let result;
    try {
      result = lm.detectForVideo(source, timestampMs);
    } catch {
      // MediaPipe throws on non-increasing timestamps; skip this frame.
      return [];
    }
    const hands: HandDetection[] = [];
    const landmarks = result.landmarks ?? [];
    const handednesses = result.handednesses ?? [];
    for (let i = 0; i < landmarks.length; i++) {
      const pts = landmarks[i];
      if (!pts || pts.length === 0) continue;
      const px = pts.map((p) => ({ x: p.x * sourceWidth, y: p.y * sourceHeight, z: p.z ?? 0 }));
      let box: BoundingBox = { x: px[0].x, y: px[0].y, width: 0, height: 0 };
      for (let j = 1; j < px.length; j++) {
        box = boxUnion(box, { x: px[j].x, y: px[j].y, width: 0, height: 0 });
      }
      // Give zero-size union boxes a minimal extent so downstream math works.
      if (box.width <= 0) box = { ...box, width: 1 };
      if (box.height <= 0) box = { ...box, height: 1 };
      const cat = handednesses[i]?.[0];
      hands.push({
        index: i,
        landmarks: px,
        box,
        handedness: cat?.categoryName ?? 'Unknown',
        score: cat?.score ?? 0,
      });
    }
    return hands;
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this._ready = false;
  }
}
