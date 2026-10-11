import { describe, expect, it } from 'vitest';
import { ObjectTracker, similarity, stabilizeClass } from '../src/core/tracking';
import type { Detection } from '../src/types';

/** MOCK DETECTIONS — unit-test fixtures only, not real model output. */
function det(x: number, y: number, cls = 41, score = 0.9): Detection {
  return {
    classId: cls,
    label: `class-${cls}`,
    score,
    box: { x, y, width: 100, height: 100 },
    space: 'source',
  };
}

describe('ObjectTracker', () => {
  it('creates a track for a new detection', () => {
    const tracker = new ObjectTracker();
    const tracks = tracker.update([det(100, 100)], 0);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].classId).toBe(41);
    expect(tracks[0].hits).toBe(1);
  });

  it('keeps the same track id across small jitter', () => {
    const tracker = new ObjectTracker({ smoothing: 0.8 });
    const [t1] = tracker.update([det(100, 100)], 0);
    const [t2] = tracker.update([det(108, 96)], 100);
    expect(t2.id).toBe(t1.id);
    expect(t2.hits).toBe(2);
    // Smoothed box moved part-way toward the new detection.
    expect(t2.box.x).toBeGreaterThan(100);
    expect(t2.box.x).toBeLessThan(108);
  });

  it('creates separate tracks for distant objects', () => {
    const tracker = new ObjectTracker();
    const tracks = tracker.update([det(0, 0), det(800, 600)], 0);
    expect(tracks).toHaveLength(2);
    expect(tracks[0].id).not.toBe(tracks[1].id);
  });

  it('expires stale tracks after the timeout', () => {
    const tracker = new ObjectTracker({ trackTimeoutMs: 500 });
    tracker.update([det(0, 0)], 0);
    const tracks = tracker.update([], 1000);
    expect(tracks).toHaveLength(0);
  });

  it('reuses an id when an object leaves and re-enters within timeout', () => {
    const tracker = new ObjectTracker({ trackTimeoutMs: 1000 });
    const [t1] = tracker.update([det(0, 0)], 0);
    const [t2] = tracker.update([det(5, 5)], 400);
    expect(t2.id).toBe(t1.id);
  });

  it('resists brief class flips via majority voting', () => {
    const tracker = new ObjectTracker({ classVoteWindow: 5 });
    tracker.update([det(0, 0, 41)], 0);
    tracker.update([det(2, 2, 41)], 100);
    const [flipped] = tracker.update([det(1, 1, 39)], 200); // one bad frame
    expect(flipped.classId).toBe(41);
    const [still] = tracker.update([det(1, 1, 41)], 300);
    expect(still.classId).toBe(41);
  });

  it('switches class after sustained votes for the new class', () => {
    const tracker = new ObjectTracker({ classVoteWindow: 3 });
    tracker.update([det(0, 0, 41)], 0);
    tracker.update([det(0, 0, 39)], 100);
    tracker.update([det(0, 0, 39)], 200);
    const [t] = tracker.update([det(0, 0, 39)], 300);
    expect(t.classId).toBe(39);
  });

  it('reports current-frame confidence, not accumulated', () => {
    const tracker = new ObjectTracker();
    tracker.update([det(0, 0, 41, 0.9)], 0);
    const [t] = tracker.update([det(0, 0, 41, 0.5)], 100);
    // Trailing average of [0.9, 0.5] = 0.7, definitely not ~1.
    expect(t.confidence).toBeCloseTo(0.7, 6);
  });

  it('reset clears all tracks', () => {
    const tracker = new ObjectTracker();
    tracker.update([det(0, 0)], 0);
    tracker.reset();
    expect(tracker.activeTrackCount).toBe(0);
  });

  it('similarity prefers same class', () => {
    const a = { x: 0, y: 0, width: 100, height: 100 };
    const b = { x: 10, y: 10, width: 100, height: 100 };
    expect(similarity(a, b, true)).toBeGreaterThan(similarity(a, b, false));
  });

  it('stabilizeClass returns majority label', () => {
    const result = stabilizeClass([1, 1, 2, 1, 1], 5);
    expect(result.classId).toBe(1);
  });

  it('stabilizeClass falls back to the newest vote on ties', () => {
    const result = stabilizeClass([1, 2, 1, 2], 4);
    expect([1, 2]).toContain(result.classId);
  });
});
