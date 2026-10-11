import type { Detection, HandDetection, Track } from '../types';
import { ObjectTracker, type TrackerConfig } from './tracking';
import { AssociationStabilizer, associateTracks } from './association';
import { labelForClass } from './coco';

export interface PipelineConfig {
  tracker: Partial<TrackerConfig>;
  /** Frames of association-state history before trusting a state. */
  associationWindow: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  tracker: {},
  associationWindow: 3,
};

/**
 * Pure per-frame pipeline: detections + hands → tracked, association-stabilized tracks.
 * Used by the live scanner and by unit tests (with mock detections).
 */
export class FramePipeline {
  private tracker: ObjectTracker;
  private stabilizer: AssociationStabilizer;

  constructor(config: Partial<PipelineConfig> = {}) {
    this.tracker = new ObjectTracker({ ...DEFAULT_PIPELINE_CONFIG.tracker, ...config.tracker });
    this.stabilizer = new AssociationStabilizer(
      config.associationWindow ?? DEFAULT_PIPELINE_CONFIG.associationWindow,
    );
  }

  get trackerConfig(): TrackerConfig {
    return (this.tracker as unknown as { config: TrackerConfig }).config;
  }

  configureTracker(config: Partial<TrackerConfig>): void {
    this.tracker.configure(config);
  }

  reset(): void {
    this.tracker.reset();
    this.stabilizer = new AssociationStabilizer(DEFAULT_PIPELINE_CONFIG.associationWindow);
  }

  step(
    detections: Detection[],
    hands: HandDetection[],
    timestampMs: number,
  ): Track[] {
    const raw = this.tracker.update(detections, timestampMs, hands, (track, handBoxes) => {
      const [best] = associateTracks([track], handBoxes);
      return best?.association ?? null;
    });
    // Stabilize association states temporally so a single lucky frame does
    // not flip "held" on/off.
    return raw.map((t) => {
      const state = t.association
        ? this.stabilizer.push(t.id, t.association.state)
        : 'no-hand';
      const association = t.association
        ? { ...t.association, state }
        : t.association;
      return { ...t, association, label: labelForClass(t.classId) };
    });
  }
}
