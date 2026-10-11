import { describe, expect, it } from 'vitest';
import {
  AssociationStabilizer,
  ASSOCIATION_THRESHOLDS,
  associateTracks,
  boxOverlapSignal,
  fingertipDistanceSignal,
  palmCenter,
  palmDistanceSignal,
  scoreHandObject,
  stateForScore,
} from '../src/core/association';
import type { HandDetection, Track } from '../src/types';

function makeHand(cx: number, cy: number): HandDetection {
  // Landmarks clustered around (cx, cy) — palm + fingertips close to center.
  const landmarks = Array.from({ length: 21 }, () => ({ x: cx, y: cy, z: 0 }));
  landmarks[8] = { x: cx + 2, y: cy + 2, z: 0 };
  return {
    index: 0,
    landmarks,
    box: { x: cx - 40, y: cy - 40, width: 80, height: 80 },
    handedness: 'Right',
    score: 0.95,
  };
}

function makeTrack(box: { x: number; y: number; width: number; height: number }): Track {
  return {
    id: 1,
    classId: 41,
    label: 'cup',
    confidence: 0.9,
    box,
    lastSeen: 0,
    hits: 3,
    association: null,
  };
}

describe('hand–object association', () => {
  it('scores a hand centered on an object as held', () => {
    const hand = makeHand(300, 300);
    const result = scoreHandObject(hand, { x: 250, y: 250, width: 100, height: 100 });
    expect(result.state).toBe('held');
    expect(result.score).toBeGreaterThanOrEqual(ASSOCIATION_THRESHOLDS.held);
    expect(result.signals.boxOverlap).toBeGreaterThan(0.5);
  });

  it('scores a distant hand as not-held', () => {
    const hand = makeHand(50, 50);
    const result = scoreHandObject(hand, { x: 900, y: 900, width: 100, height: 100 });
    expect(result.state).toBe('not-held');
  });

  it('maps composite scores through thresholds', () => {
    expect(stateForScore(0.9)).toBe('held');
    expect(stateForScore(0.4)).toBe('uncertain');
    expect(stateForScore(0.1)).toBe('not-held');
  });

  it('computes palm center as the mean of palm landmarks', () => {
    const hand = makeHand(100, 200);
    const palm = palmCenter(hand.landmarks);
    expect(palm.x).toBeCloseTo(100);
    expect(palm.y).toBeCloseTo(200);
  });

  it('overlap signal is 0 for disjoint boxes and >0 when overlapping', () => {
    const hand = { x: 0, y: 0, width: 100, height: 100 };
    expect(boxOverlapSignal(hand, { x: 500, y: 500, width: 10, height: 10 })).toBe(0);
    // 50×50 overlap over 100×100 hand area = 0.25
    expect(boxOverlapSignal(hand, { x: 50, y: 50, width: 100, height: 100 })).toBeCloseTo(0.25, 6);
  });

  it('palm distance signal decreases with distance', () => {
    const box = { x: 0, y: 0, width: 100, height: 100 };
    const near = palmDistanceSignal({ x: 50, y: 50 }, box);
    const far = palmDistanceSignal({ x: 800, y: 800 }, box);
    expect(near).toBeGreaterThan(far);
  });

  it('fingertip signal is higher when fingertips touch the box', () => {
    const box = { x: 250, y: 250, width: 100, height: 100 };
    const touching = makeHand(300, 300);
    const away = makeHand(20, 20);
    expect(fingertipDistanceSignal(touching.landmarks, box)).toBeGreaterThan(
      fingertipDistanceSignal(away.landmarks, box),
    );
  });

  it('reports no-hand state when no hands are visible', () => {
    const tracks = [makeTrack({ x: 0, y: 0, width: 50, height: 50 })];
    const [result] = associateTracks(tracks, []);
    expect(result.association?.state).toBe('no-hand');
  });

  it('picks the best hand for each track', () => {
    const tracks = [makeTrack({ x: 250, y: 250, width: 100, height: 100 })];
    const hands = [makeHand(20, 20), makeHand(300, 300)];
    hands[1].index = 1;
    const [result] = associateTracks(tracks, hands);
    expect(result.association?.handIndex).toBe(1);
    expect(result.association?.state).toBe('held');
  });

  it('stabilizer requires a window of consistent states', () => {
    const stab = new AssociationStabilizer(3);
    expect(stab.push(1, 'held')).toBe('uncertain');
    expect(stab.push(1, 'held')).toBe('uncertain');
    expect(stab.push(1, 'held')).toBe('held');
    expect(stab.push(1, 'not-held')).toBe('held'); // 2 held vs 1 not-held
  });
});
