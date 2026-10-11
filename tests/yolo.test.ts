import { describe, expect, it } from 'vitest';
import {
  decodeYoloOutput,
  nonMaxSuppression,
  postprocessYolo,
  type DecodedDetection,
} from '../src/core/yolo';

/** Build a synthetic [1, N, 85] tensor with configured boxes. Test data only. */
function buildTensor(
  rows: Array<{ cx: number; cy: number; w: number; h: number; obj: number; cls: number; score: number }>,
  numAnchors = 10,
  numClasses = 80,
): { data: Float32Array; shape: [number, number, number] } {
  const stride = 5 + numClasses;
  const data = new Float32Array(numAnchors * stride);
  for (const [i, r] of rows.entries()) {
    const base = i * stride;
    data[base] = r.cx;
    data[base + 1] = r.cy;
    data[base + 2] = r.w;
    data[base + 3] = r.h;
    data[base + 4] = r.obj;
    data[base + 5 + r.cls] = r.score;
  }
  return { data, shape: [1, numAnchors, stride] };
}

describe('YOLOv5 output decoding', () => {
  it('decodes a high-confidence row into a detection', () => {
    // class 41 = cup in COCO order
    const { data, shape } = buildTensor([
      { cx: 320, cy: 320, w: 100, h: 200, obj: 0.9, cls: 41, score: 0.8 },
    ]);
    const out = postprocessYolo(data, shape, 0.3, 0.45);
    expect(out).toHaveLength(1);
    expect(out[0].classId).toBe(41);
    expect(out[0].score).toBeCloseTo(0.72, 6);
    expect(out[0].box).toEqual({ x: 270, y: 220, width: 100, height: 200 });
  });

  it('filters rows below the confidence threshold', () => {
    const { data, shape } = buildTensor([
      { cx: 100, cy: 100, w: 50, h: 50, obj: 0.2, cls: 0, score: 0.5 },
    ]);
    expect(postprocessYolo(data, shape, 0.3, 0.45)).toHaveLength(0);
  });

  it('multiplies objectness by class score', () => {
    const { data, shape } = buildTensor([
      { cx: 100, cy: 100, w: 50, h: 50, obj: 0.5, cls: 3, score: 0.5 },
    ]);
    const out = postprocessYolo(data, shape, 0.2, 0.45);
    expect(out[0].score).toBeCloseTo(0.25, 6);
  });

  it('applies class-aware NMS: suppresses overlaps of the same class only', () => {
    const det = (x: number, cls: number): DecodedDetection => ({
      classId: cls,
      score: 0.9,
      box: { x, y: 0, width: 100, height: 100 },
    });
    const kept = nonMaxSuppression(
      [det(0, 0), det(10, 0), det(400, 0), det(0, 5)],
      0.45,
    );
    // Same-class overlap suppressed; different class kept; distant box kept.
    expect(kept).toHaveLength(3);
    expect(kept.map((d) => d.classId).sort()).toEqual([0, 0, 5]);
  });

  it('sorts kept detections by descending score', () => {
    const kept = nonMaxSuppression(
      [
        { classId: 1, score: 0.5, box: { x: 0, y: 0, width: 10, height: 10 } },
        { classId: 2, score: 0.9, box: { x: 500, y: 500, width: 10, height: 10 } },
      ],
      0.45,
    );
    expect(kept[0].classId).toBe(2);
  });

  it('rejects mismatched buffer length vs shape', () => {
    const data = new Float32Array(10);
    expect(() => postprocessYolo(data, [1, 2, 85], 0.3, 0.45)).toThrow();
  });

  it('accepts rank-2 outputs', () => {
    const { data } = buildTensor([{ cx: 10, cy: 10, w: 5, h: 5, obj: 0.99, cls: 7, score: 0.99 }]);
    const out = postprocessYolo(data, [10, 85], 0.5, 0.45);
    expect(out).toHaveLength(1);
    expect(out[0].classId).toBe(7);
  });

  it('skips rows with non-positive sizes', () => {
    const { data, shape } = buildTensor([
      { cx: 10, cy: 10, w: 0, h: 5, obj: 0.99, cls: 1, score: 0.99 },
    ]);
    expect(postprocessYolo(data, shape, 0.3, 0.45)).toHaveLength(0);
  });

  it('decodeYoloOutput picks argmax class', () => {
    const { data } = buildTensor([
      { cx: 1, cy: 2, w: 3, h: 4, obj: 1, cls: 10, score: 0.4 },
      { cx: 1, cy: 2, w: 3, h: 4, obj: 1, cls: 20, score: 0.9 },
    ]);
    // Override second class score manually is already set; decode first row only via stride call
    const out = decodeYoloOutput(data, 10, 85, 0.5);
    expect(out[0].classId).toBe(20);
  });
});
