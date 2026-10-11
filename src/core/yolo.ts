import type { BoundingBox } from '../types';
import { boxIou } from './geometry';

/**
 * YOLOv5 ONNX output decoding and NMS.
 *
 * The Ultralytics YOLOv5 v7.0 ONNX export emits a single tensor of shape
 * [1, numAnchors, 5 + numClasses] where each row is:
 *   [cx, cy, w, h, objectness, classScore0..classScore79]
 * in model-input pixel coordinates (e.g. 640×640). Confidence of a class is
 * objectness × classScore (no square-root or accumulation across frames).
 */

export interface YoloRawRow {
  box: BoundingBox;
  objectness: number;
  classScores: Float32Array;
}

export interface DecodedDetection {
  classId: number;
  score: number;
  box: BoundingBox;
}

/**
 * Decode a [numAnchors, 5+numClasses] prediction matrix into candidate
 * detections above `confThreshold`. `data` is row-major.
 */
export function decodeYoloOutput(
  data: Float32Array,
  numAnchors: number,
  stride: number,
  confThreshold: number,
): DecodedDetection[] {
  const numClasses = stride - 5;
  if (numClasses <= 0) throw new Error(`Invalid stride ${stride}`);
  const out: DecodedDetection[] = [];
  for (let i = 0; i < numAnchors; i++) {
    const base = i * stride;
    const objectness = data[base + 4];
    if (objectness < confThreshold) continue;
    let bestClass = -1;
    let bestScore = 0;
    for (let c = 0; c < numClasses; c++) {
      const s = data[base + 5 + c];
      if (s > bestScore) {
        bestScore = s;
        bestClass = c;
      }
    }
    const score = objectness * bestScore;
    if (bestClass < 0 || score < confThreshold) continue;
    const cx = data[base];
    const cy = data[base + 1];
    const w = data[base + 2];
    const h = data[base + 3];
    if (!(w > 0 && h > 0)) continue;
    out.push({
      classId: bestClass,
      score,
      box: { x: cx - w / 2, y: cy - h / 2, width: w, height: h },
    });
  }
  return out;
}

/**
 * Class-aware greedy non-maximum suppression.
 * Returns kept detections sorted by descending score.
 */
export function nonMaxSuppression(
  detections: DecodedDetection[],
  iouThreshold: number,
  maxDetections = 100,
): DecodedDetection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept: DecodedDetection[] = [];
  const byClass = new Map<number, DecodedDetection[]>();
  for (const det of sorted) {
    const list = byClass.get(det.classId) ?? [];
    let suppressed = false;
    for (const k of list) {
      if (boxIou(det.box, k.box) >= iouThreshold) {
        suppressed = true;
        break;
      }
    }
    if (!suppressed) {
      kept.push(det);
      list.push(det);
      byClass.set(det.classId, list);
      if (kept.length >= maxDetections) break;
    }
  }
  return kept;
}

/** Full post-process: decode → confidence filter → NMS. */
export function postprocessYolo(
  data: Float32Array,
  shape: readonly number[],
  confThreshold: number,
  iouThreshold: number,
): DecodedDetection[] {
  // Accept [1, N, S] or [N, S].
  let numAnchors: number;
  let stride: number;
  if (shape.length === 3 && shape[0] === 1) {
    numAnchors = shape[1];
    stride = shape[2];
  } else if (shape.length === 2) {
    numAnchors = shape[0];
    stride = shape[1];
  } else {
    throw new Error(`Unsupported YOLO output shape [${shape.join(', ')}]`);
  }
  if (data.length !== numAnchors * stride) {
    throw new Error(
      `Output length ${data.length} does not match shape ${numAnchors}×${stride}`,
    );
  }
  const decoded = decodeYoloOutput(data, numAnchors, stride, confThreshold);
  return nonMaxSuppression(decoded, iouThreshold);
}
