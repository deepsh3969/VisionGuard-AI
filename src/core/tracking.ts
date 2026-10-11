import type { BoundingBox, Detection, HandDetection, Track } from '../types';
import { boxIou, lerpBox, normalizedCenterDistance } from './geometry';
import { labelForClass } from './coco';

/**
 * Multi-object tracker: greedy one-to-one matching over a similarity matrix
 * of IoU + inverse center distance with class consistency gating, EMA box
 * smoothing, and temporal class-vote stabilization.
 *
 * This is intentionally a simple, documented tracker — not Kalman/DeepSORT.
 */

export interface TrackerConfig {
  /** Minimum IoU or proximity to consider a match. */
  matchThreshold: number;
  /** EMA factor for box smoothing; 1 = no smoothing. */
  smoothing: number;
  /** Milliseconds before an unmatched track is expired. */
  trackTimeoutMs: number;
  /** Length of the class-vote window for label stabilization. */
  classVoteWindow: number;
  /** Minimum matched frames before a track is emitted. */
  minHits: number;
}

export const DEFAULT_TRACKER_CONFIG: TrackerConfig = {
  matchThreshold: 0.15,
  smoothing: 0.6,
  trackTimeoutMs: 900,
  classVoteWindow: 5,
  minHits: 1,
};

interface InternalTrack extends Track {
  boxRaw: BoundingBox;
  classVotes: number[];
  recentScores: number[];
}

export class ObjectTracker {
  private tracks: InternalTrack[] = [];
  private nextId = 1;
  private config: TrackerConfig;

  constructor(config: Partial<TrackerConfig> = {}) {
    this.config = { ...DEFAULT_TRACKER_CONFIG, ...config };
  }

  configure(config: Partial<TrackerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  reset(): void {
    this.tracks = [];
    this.nextId = 1;
  }

  get activeTrackCount(): number {
    return this.tracks.length;
  }

  /**
   * Advance the tracker with one frame of detections.
   * @param detections raw detections in source coordinates (already NMS'd)
   * @param timestampMs monotonic clock (performance.now())
   * @param handBoxes optional hand boxes used later for association
   */
  update(
    detections: Detection[],
    timestampMs: number,
    handBoxes: HandDetection[] = [],
    associate?: (track: Track, hands: HandDetection[]) => Track['association'],
  ): Track[] {
    this.expire(timestampMs);

    const pairs: Array<{ ti: number; di: number; sim: number }> = [];
    for (let ti = 0; ti < this.tracks.length; ti++) {
      for (let di = 0; di < detections.length; di++) {
        const t = this.tracks[ti];
        const d = detections[di];
        const sim = similarity(t.boxRaw, d.box, t.classId === d.classId);
        if (sim >= this.config.matchThreshold) pairs.push({ ti, di, sim });
      }
    }
    pairs.sort((a, b) => b.sim - a.sim);

    const matchedTracks = new Set<number>();
    const matchedDets = new Set<number>();
    for (const p of pairs) {
      if (matchedTracks.has(p.ti) || matchedDets.has(p.di)) continue;
      matchedTracks.add(p.ti);
      matchedDets.add(p.di);
      this.applyMatch(this.tracks[p.ti], detections[p.di], timestampMs);
    }

    for (let di = 0; di < detections.length; di++) {
      if (matchedDets.has(di)) continue;
      this.tracks.push(this.createTrack(detections[di], timestampMs));
    }

    const result: Track[] = [];
    for (const t of this.tracks) {
      if (t.hits < this.config.minHits) continue;
      const stabilized = stabilizeClass(t.classVotes, this.config.classVoteWindow);
      t.classId = stabilized.classId;
      t.label = labelForClass(stabilized.classId);
      // Confidence shown is a short trailing average of recent matched
      // detection scores — NOT a combination of independent posteriors.
      t.confidence =
        t.recentScores.length > 0
          ? t.recentScores.reduce((a, b) => a + b, 0) / t.recentScores.length
          : 0;
      if (associate) {
        t.association = associate(t, handBoxes);
      }
      result.push({ ...t, box: { ...t.box } });
    }
    return result;
  }

  private createTrack(d: Detection, ts: number): InternalTrack {
    return {
      id: this.nextId++,
      classId: d.classId,
      label: d.label,
      confidence: d.score,
      box: { ...d.box },
      boxRaw: { ...d.box },
      lastSeen: ts,
      hits: 1,
      association: null,
      classVotes: [d.classId],
      recentScores: [d.score],
    };
  }

  private applyMatch(t: InternalTrack, d: Detection, ts: number): void {
    const f = Math.min(1, Math.max(0, this.config.smoothing));
    t.boxRaw = { ...d.box };
    t.box = lerpBox(t.box, d.box, f);
    t.lastSeen = ts;
    t.hits += 1;
    t.classVotes.push(d.classId);
    if (t.classVotes.length > this.config.classVoteWindow * 2) {
      t.classVotes = t.classVotes.slice(-this.config.classVoteWindow * 2);
    }
    t.recentScores.push(d.score);
    if (t.recentScores.length > 4) t.recentScores.shift();
  }

  private expire(timestampMs: number): void {
    this.tracks = this.tracks.filter(
      (t) => timestampMs - t.lastSeen <= this.config.trackTimeoutMs,
    );
  }
}

/** Combined similarity in [0,1]: 0.65·IoU + 0.35·proximity, class-gated. */
export function similarity(a: BoundingBox, b: BoundingBox, sameClass: boolean): number {
  const iou = boxIou(a, b);
  const prox = 1 - normalizedCenterDistance(a, b);
  const raw = 0.65 * iou + 0.35 * prox;
  return sameClass ? raw : raw * 0.5;
}

/** Majority vote over the most recent `window` class ids. */
export function stabilizeClass(
  votes: number[],
  window: number,
): { classId: number; label: string } {
  const recent = votes.slice(-window);
  const counts = new Map<number, number>();
  for (const v of recent) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = recent[recent.length - 1] ?? -1;
  let bestCount = -1;
  for (const [cls, count] of counts) {
    if (count > bestCount || (count === bestCount && cls === best)) {
      best = cls;
      bestCount = count;
    }
  }
  return { classId: best, label: '' }; // label filled by caller via coco.ts
}
