import type { ModelStatus } from '../types';
import type { ObjectDetector, RawDetectionResult } from './detector.types';

/**
 * DEVELOPMENT MOCK ONLY.
 *
 * Produces deterministic, obviously-fake detections whose labels are
 * prefixed with "MOCK". It exists so the UI, tracking and description
 * layers can be exercised without a model. It is never the default backend
 * and every surface that renders its output is required to show the
 * "mock — not real AI" badge (enforced by the "MOCK" label prefix and the
 * backend id shown in diagnostics).
 */
export class MockDetector implements ObjectDetector {
  readonly id = 'dev-mock';
  readonly name = 'Development mock (NOT real AI inference)';
  private _ready = false;
  private t = 0;

  get ready(): boolean {
    return this._ready;
  }

  async init(onStatus: (status: ModelStatus) => void): Promise<void> {
    onStatus({ state: 'loading' });
    await new Promise((r) => setTimeout(r, 50));
    this._ready = true;
    onStatus({ state: 'ready', loadMs: 50 });
  }

  async detect(
    _rgba: Uint8ClampedArray,
    width: number,
    height: number,
    options: { confThreshold: number },
  ): Promise<RawDetectionResult> {
    if (!this._ready) throw new Error('Mock detector not initialized');
    const t0 = performance.now();
    this.t += 1;
    const cx = width * (0.35 + 0.15 * Math.sin(this.t / 10));
    const cy = height * 0.5;
    const w = width * 0.25;
    const h = height * 0.3;
    const score = 0.8;
    const detections: RawDetectionResult['detections'] =
      score >= options.confThreshold
        ? [
            {
              classId: -1,
              label: 'MOCK cup (test data)',
              score,
              box: { x: cx - w / 2, y: cy - h / 2, width: w, height: h },
            },
          ]
        : [];
    return { detections, latencyMs: performance.now() - t0 };
  }

  dispose(): void {
    this._ready = false;
  }
}
