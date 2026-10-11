import type { BoundingBox } from '../types';

/** Union of two boxes. */
export function boxUnion(a: BoundingBox, b: BoundingBox): BoundingBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: x2 - x, height: y2 - y };
}

/** Intersection area of two boxes (0 when disjoint). */
export function boxIntersection(a: BoundingBox, b: BoundingBox): number {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, x2 - x) * Math.max(0, y2 - y);
}

/** Intersection-over-union in [0, 1]. */
export function boxIou(a: BoundingBox, b: BoundingBox): number {
  const inter = boxIntersection(a, b);
  if (inter <= 0) return 0;
  const union = a.width * a.height + b.width * b.height - inter;
  return union <= 0 ? 0 : inter / union;
}

/** Center point of a box. */
export function boxCenter(b: BoundingBox): { x: number; y: number } {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Normalized center distance in [0, 1], scaled by the larger box diagonal. */
export function normalizedCenterDistance(a: BoundingBox, b: BoundingBox): number {
  const ca = boxCenter(a);
  const cb = boxCenter(b);
  const dist = Math.hypot(ca.x - cb.x, ca.y - cb.y);
  const scale = Math.max(
    Math.hypot(a.width, a.height),
    Math.hypot(b.width, b.height),
    1e-6,
  );
  return Math.min(1, dist / scale);
}

/** Smallest distance between a point and a box (0 if inside). */
export function pointToBoxDistance(px: number, py: number, b: BoundingBox): number {
  const dx = Math.max(b.x - px, 0, px - (b.x + b.width));
  const dy = Math.max(b.y - py, 0, py - (b.y + b.height));
  return Math.hypot(dx, dy);
}

/** Exponential moving average of two boxes. factor∈[0,1]: 1 = keep next fully. */
export function lerpBox(prev: BoundingBox, next: BoundingBox, factor: number): BoundingBox {
  const f = Math.min(1, Math.max(0, factor));
  return {
    x: prev.x + (next.x - prev.x) * f,
    y: prev.y + (next.y - prev.y) * f,
    width: prev.width + (next.width - prev.width) * f,
    height: prev.height + (next.height - prev.height) * f,
  };
}

/** Scale a box from one resolution to another (e.g., input → source). */
export function scaleBox(
  b: BoundingBox,
  scaleX: number,
  scaleY: number,
  offsetX = 0,
  offsetY = 0,
): BoundingBox {
  return {
    x: b.x * scaleX + offsetX,
    y: b.y * scaleY + offsetY,
    width: b.width * scaleX,
    height: b.height * scaleY,
  };
}

/** Clamp a box to image bounds, returning a possibly-smaller box. */
export function clampBox(b: BoundingBox, width: number, height: number): BoundingBox {
  const x = Math.min(Math.max(0, b.x), width);
  const y = Math.min(Math.max(0, b.y), height);
  const x2 = Math.min(Math.max(x, b.x + b.width), width);
  const y2 = Math.min(Math.max(y, b.y + b.height), height);
  return { x, y, width: Math.max(0, x2 - x), height: Math.max(0, y2 - y) };
}

export function boxArea(b: BoundingBox): number {
  return Math.max(0, b.width) * Math.max(0, b.height);
}
