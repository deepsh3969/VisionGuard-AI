import { describe, expect, it } from 'vitest';
import {
  boxArea,
  boxCenter,
  boxIntersection,
  boxIou,
  boxUnion,
  clampBox,
  lerpBox,
  normalizedCenterDistance,
  pointToBoxDistance,
  scaleBox,
} from '../src/core/geometry';

describe('geometry', () => {
  it('computes IoU of identical boxes as 1', () => {
    const b = { x: 10, y: 10, width: 50, height: 40 };
    expect(boxIou(b, b)).toBeCloseTo(1, 6);
  });

  it('computes IoU of disjoint boxes as 0', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 20, y: 20, width: 10, height: 10 };
    expect(boxIou(a, b)).toBe(0);
  });

  it('computes partial IoU correctly', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 5, y: 0, width: 10, height: 10 };
    // inter = 5*10 = 50, union = 100+100-50 = 150
    expect(boxIou(a, b)).toBeCloseTo(50 / 150, 6);
  });

  it('unions boxes', () => {
    const u = boxUnion({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 });
    expect(u).toEqual({ x: 0, y: 0, width: 15, height: 15 });
  });

  it('measures intersection area', () => {
    expect(boxIntersection({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 })).toBe(25);
  });

  it('computes centers', () => {
    expect(boxCenter({ x: 0, y: 0, width: 10, height: 20 })).toEqual({ x: 5, y: 10 });
  });

  it('normalizes center distance to [0,1]', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const far = { x: 1000, y: 1000, width: 10, height: 10 };
    expect(normalizedCenterDistance(a, a)).toBe(0);
    expect(normalizedCenterDistance(a, far)).toBe(1);
  });

  it('computes point-to-box distance (0 inside)', () => {
    const b = { x: 0, y: 0, width: 10, height: 10 };
    expect(pointToBoxDistance(5, 5, b)).toBe(0);
    expect(pointToBoxDistance(13, 5, b)).toBeCloseTo(3, 6);
  });

  it('lerps boxes', () => {
    const a = { x: 0, y: 0, width: 10, height: 10 };
    const b = { x: 10, y: 10, width: 20, height: 20 };
    const mid = lerpBox(a, b, 0.5);
    expect(mid.x).toBeCloseTo(5);
    expect(mid.width).toBeCloseTo(15);
  });

  it('scales boxes with offsets', () => {
    const scaled = scaleBox({ x: 10, y: 10, width: 100, height: 50 }, 2, 3, 5, 7);
    expect(scaled).toEqual({ x: 25, y: 37, width: 200, height: 150 });
  });

  it('clamps boxes to image bounds', () => {
    const c = clampBox({ x: -10, y: -10, width: 200, height: 200 }, 100, 50);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    expect(c.width).toBe(100);
    expect(c.height).toBe(50);
  });

  it('computes area', () => {
    expect(boxArea({ x: 0, y: 0, width: 3, height: 4 })).toBe(12);
  });
});
