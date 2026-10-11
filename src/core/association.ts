import type {
  AssociationState,
  BoundingBox,
  HandDetection,
  HandObjectAssociation,
  Track,
} from '../types';
import { boxIou, pointToBoxDistance, boxCenter } from './geometry';

/**
 * Hand–object association.
 *
 * Multiple independent geometric signals are combined into a composite
 * score. No single heuristic is treated as proof that an object is held:
 * the result is one of held / uncertain / not-hand, and the UI lets the
 * user override automatic selection at any time.
 */

export const ASSOCIATION_THRESHOLDS = {
  /** Composite score ≥ this ⇒ "held". */
  held: 0.55,
  /** Composite score ≥ this (and < held) ⇒ "uncertain". */
  uncertain: 0.28,
};

export interface AssociationWeights {
  boxOverlap: number;
  palmDistance: number;
  fingertipDistance: number;
}

export const DEFAULT_ASSOCIATION_WEIGHTS: AssociationWeights = {
  boxOverlap: 0.35,
  palmDistance: 0.35,
  fingertipDistance: 0.3,
};

/** MediaPipe hand landmark indices. */
export const WRIST = 0;
export const FINGERTIPS = [4, 8, 12, 16, 20] as const;
export const PALM_LANDMARKS = [0, 5, 9, 13, 17] as const;

/** Overlap of the hand box with the object box, normalized by hand-box area. */
export function boxOverlapSignal(handBox: BoundingBox, objectBox: BoundingBox): number {
  const inter =
    Math.max(
      0,
      Math.min(handBox.x + handBox.width, objectBox.x + objectBox.width) -
        Math.max(handBox.x, objectBox.x),
    ) *
    Math.max(
      0,
      Math.min(handBox.y + handBox.height, objectBox.y + objectBox.height) -
        Math.max(handBox.y, objectBox.y),
    );
  const handArea = Math.max(1e-6, handBox.width * handBox.height);
  return Math.min(1, inter / handArea);
}

/** Palm center from a subset of landmarks. */
export function palmCenter(landmarks: HandDetection['landmarks']): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  for (const i of PALM_LANDMARKS) {
    sx += landmarks[i].x;
    sy += landmarks[i].y;
  }
  const n = PALM_LANDMARKS.length;
  return { x: sx / n, y: sy / n };
}

/** In [0,1]: 1 when the palm sits exactly on the box center. */
export function palmDistanceSignal(
  palm: { x: number; y: number },
  objectBox: BoundingBox,
): number {
  const d = pointToBoxDistance(palm.x, palm.y, objectBox);
  const scale = Math.max(Math.hypot(objectBox.width, objectBox.height), 1e-6);
  return Math.max(0, 1 - d / (0.6 * scale));
}

/** In [0,1]: mean closeness of fingertips to the object box. */
export function fingertipDistanceSignal(
  landmarks: HandDetection['landmarks'],
  objectBox: BoundingBox,
): number {
  const scale = Math.max(Math.hypot(objectBox.width, objectBox.height), 1e-6);
  let sum = 0;
  for (const i of FINGERTIPS) {
    const p = landmarks[i];
    const d = pointToBoxDistance(p.x, p.y, objectBox);
    sum += Math.max(0, 1 - d / (0.75 * scale));
  }
  return sum / FINGERTIPS.length;
}

/** Score one hand against one object box. */
export function scoreHandObject(
  hand: HandDetection,
  objectBox: BoundingBox,
  weights: AssociationWeights = DEFAULT_ASSOCIATION_WEIGHTS,
): Omit<HandObjectAssociation, 'trackId'> {
  const signals = {
    boxOverlap: boxOverlapSignal(hand.box, objectBox),
    palmDistance: palmDistanceSignal(palmCenter(hand.landmarks), objectBox),
    fingertipDistance: fingertipDistanceSignal(hand.landmarks, objectBox),
  };
  const wsum = weights.boxOverlap + weights.palmDistance + weights.fingertipDistance;
  const score =
    (weights.boxOverlap * signals.boxOverlap +
      weights.palmDistance * signals.palmDistance +
      weights.fingertipDistance * signals.fingertipDistance) /
    wsum;
  return { handIndex: hand.index, state: stateForScore(score), score, signals };
}

export function stateForScore(score: number): AssociationState {
  if (score >= ASSOCIATION_THRESHOLDS.held) return 'held';
  if (score >= ASSOCIATION_THRESHOLDS.uncertain) return 'uncertain';
  return 'not-held';
}

/**
 * Associate each track with its best hand (if any).
 * Returns the track's association field (null when no hands are visible).
 */
export function associateTracks(
  tracks: Track[],
  hands: HandDetection[],
): Array<{ trackId: number; association: HandObjectAssociation | null }> {
  if (hands.length === 0) {
    return tracks.map((t) => ({
      trackId: t.id,
      association: { trackId: t.id, handIndex: -1, state: 'no-hand', score: 0, signals: { boxOverlap: 0, palmDistance: 0, fingertipDistance: 0 } },
    }));
  }
  return tracks.map((t) => {
    let best: Omit<HandObjectAssociation, 'trackId'> | null = null;
    for (const h of hands) {
      const s = scoreHandObject(h, t.box);
      if (!best || s.score > best.score) best = s;
    }
    return {
      trackId: t.id,
      association: best ? { ...best, trackId: t.id } : null,
    };
  });
}

/**
 * Temporal consistency helper: whether an association state has been stable
 * for `needed` consecutive updates. Used to avoid announcing "held" on a
 * single lucky frame.
 */
export class AssociationStabilizer {
  private history = new Map<number, AssociationState[]>();
  private window: number;

  constructor(window = 3) {
    this.window = window;
  }

  push(trackId: number, state: AssociationState): AssociationState {
    const list = this.history.get(trackId) ?? [];
    list.push(state);
    while (list.length > this.window) list.shift();
    this.history.set(trackId, list);
    if (list.length < this.window) return 'uncertain';
    const counts = new Map<AssociationState, number>();
    for (const s of list) counts.set(s, (counts.get(s) ?? 0) + 1);
    let best: AssociationState = list[list.length - 1];
    let bestCount = -1;
    for (const [s, c] of counts) {
      if (c > bestCount) {
        best = s;
        bestCount = c;
      }
    }
    return best;
  }

  drop(trackId: number): void {
    this.history.delete(trackId);
  }
}

/** Debug helper: distance from box center to palm (for diagnostics panel). */
export function debugPalmToCenter(box: BoundingBox, hand: HandDetection): number {
  const c = boxCenter(box);
  const p = palmCenter(hand.landmarks);
  return Math.hypot(c.x - p.x, c.y - p.y);
}

export { boxIou };
