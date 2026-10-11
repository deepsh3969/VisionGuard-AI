import type { BoundingBox, ModelStatus } from '../types';

/**
 * Interchangeable detector adapter interface.
 * Implementations: ONNX YOLO (real), development mock (explicitly fake).
 * The UI never talks to a concrete implementation directly.
 */
export interface ObjectDetector {
  /** Stable identifier shown in diagnostics, e.g. "onnx-yolov5s". */
  readonly id: string;
  /** Human-readable name. */
  readonly name: string;
  /** True when the model is loaded and able to accept frames. */
  readonly ready: boolean;
  /** Load the model (downloads if needed). Emits status via onStatus. */
  init(onStatus: (status: ModelStatus) => void): Promise<void>;
  /**
   * Run detection on one RGBA frame.
   * Boxes are returned in source-frame pixel coordinates.
   */
  detect(
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    options: { confThreshold: number; iouThreshold: number },
  ): Promise<RawDetectionResult>;
  /** Release resources. */
  dispose(): void;
}

export interface RawDetectionResult {
  detections: Array<{ classId: number; label: string; score: number; box: BoundingBox }>;
  latencyMs: number;
}
