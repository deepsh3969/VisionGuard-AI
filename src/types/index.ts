/**
 * Shared domain types for VisionGuard AI.
 * All pipeline stages communicate exclusively through these types.
 */

/** Axis-aligned bounding box in a specific coordinate space. */
export interface BoundingBox {
  /** Left edge, inclusive, in `space` coordinates. */
  x: number;
  /** Top edge, inclusive, in `space` coordinates. */
  y: number;
  width: number;
  height: number;
}

/** Coordinate space a bounding box lives in. */
export type BoxSpace = 'source' | 'display' | 'input';

/** A single raw model detection (one frame, before tracking). */
export interface Detection {
  /** COCO class index (0..79) or -1 for unknown. */
  classId: number;
  label: string;
  /** Detection confidence in [0, 1] (objectness × class score for YOLOv5). */
  score: number;
  /** Box in source-frame pixel coordinates. */
  box: BoundingBox;
  space: 'source';
}

/** A detected hand with MediaPipe-style 21 landmarks. */
export interface HandDetection {
  /** Stable-per-frame index, 0 or 1 (supports up to 2 hands). */
  index: number;
  /** All 21 landmarks in source-frame pixel coordinates. */
  landmarks: Array<{ x: number; y: number; z: number }>;
  /** Bounding box enclosing all landmarks, source coordinates. */
  box: BoundingBox;
  /** Handedness label reported by the model ("Left" / "Right"). */
  handedness: string;
  score: number;
}

/** How a hand relates to a detected object. */
export type AssociationState = 'held' | 'uncertain' | 'not-held' | 'no-hand';

/** Geometric evidence linking a hand to an object. */
export interface HandObjectAssociation {
  trackId: number;
  handIndex: number;
  state: AssociationState;
  /** Composite score in [0, 1]. Not a probability. */
  score: number;
  /** Individual geometric signals, each in [0, 1]. */
  signals: {
    boxOverlap: number;
    palmDistance: number;
    fingertipDistance: number;
  };
}

/** A tracked object identity across frames. */
export interface Track {
  id: number;
  /** Current stabilized class id. */
  classId: number;
  /** Current stabilized label. */
  label: string;
  /** Current-frame confidence of the matched detection (NOT accumulated). */
  confidence: number;
  /** Smoothed box in source coordinates. */
  box: BoundingBox;
  /** Timestamp of the last matching detection (ms, performance.now()). */
  lastSeen: number;
  /** Total number of frames this track has been matched. */
  hits: number;
  association: HandObjectAssociation | null;
  /** Why this track was chosen/flagged. */
  selectionNote?: string;
}

/** One processed frame result handed to the UI. */
export interface FrameResult {
  /** Monotonic frame sequence number. */
  frameId: number;
  timestamp: number;
  sourceWidth: number;
  sourceHeight: number;
  tracks: Track[];
  hands: HandDetection[];
  /** End-to-end inference latency for this frame, ms. */
  latencyMs: number;
  /** Detector backend that produced this result. */
  backend: string;
}

/** Structured, grounded explanation of an object. */
export interface ObjectDescription {
  objectId: string;
  label: string;
  /** One-sentence summary. */
  short: string;
  /** What the object is commonly for. */
  purpose: string;
  /** Typical applications. */
  applications: string;
  /** Observable visual characteristics (grounded in what a detector sees). */
  visualCharacteristics: string;
  /** Handling guidance (general, non-certified). */
  handling: string;
  /** Extra supported facts. */
  facts: string[];
  /** Explanation depth this object supports. */
  detailLevel: 'basic' | 'moderate' | 'rich';
}

export type ExplanationMode = 'quick' | 'detailed' | 'educational';

/** Provider status so the UI never fabricates results. */
export type ProviderStatus =
  | 'ready'
  | 'loading'
  | 'unavailable'
  | 'error';

export interface DescriptionResult {
  text: string;
  mode: ExplanationMode;
  provider: 'template' | 'remote-vlm';
  providerStatus: ProviderStatus;
  /** Human-readable error when providerStatus is 'error'. */
  error?: string;
  /** True when the request image was transmitted to an external service. */
  transmittedExternally: boolean;
  generatedAt: number;
}

/** Saved scan record (persisted). */
export interface ScanRecord {
  id: string;
  timestamp: number;
  classId: number;
  label: string;
  confidence: number | null;
  summary: string;
  description: ObjectDescription | null;
  modelId: string;
  sourceType: 'camera' | 'upload';
  associationState: AssociationState;
  snapshotDataUrl: string | null;
  notes: string;
  bookmarked: boolean;
}

/** Detector lifecycle state. */
export type ModelStatus =
  | { state: 'idle' }
  | { state: 'downloading'; loadedBytes: number; totalBytes: number | null }
  | { state: 'loading' }
  | { state: 'ready'; loadMs: number }
  | { state: 'error'; message: string; recoverable: boolean };

export interface DiagnosticsSnapshot {
  model: ModelStatus;
  modelId: string;
  backendId: string;
  cameraState: 'idle' | 'starting' | 'live' | 'error';
  cameraError: string | null;
  inferenceLatencyMs: number | null;
  processingFps: number | null;
  handsDetected: number;
  objectsDetected: number;
  workerReady: boolean;
  lastError: string | null;
}

/** Camera pipeline settings. */
export interface ScannerSettings {
  /** Minimum milliseconds between inference runs (lower = faster). */
  minIntervalMs: number;
  /** Longest side of the frame sent to the model. */
  processingResolution: 320 | 416 | 640;
  /** Minimum detection confidence [0,1]. */
  confidenceThreshold: number;
  /** NMS IoU threshold [0,1]. */
  nmsIoU: number;
  /** EMA smoothing factor for boxes (0 = frozen, 1 = no smoothing). */
  smoothing: number;
  /** Run hand landmark detection. */
  handTrackingEnabled: boolean;
  /** Automatically speak a newly selected object once. */
  autoSpeakOnSelect: boolean;
  /** Persist snapshot images with scans (opt-in). */
  saveSnapshots: boolean;
  /** Speech rate multiplier. */
  speechRate: number;
  /** Preferred voice URI (empty = system default). */
  speechVoiceUri: string;
  /** Explanation depth. */
  explanationMode: ExplanationMode;
  theme: 'dark' | 'light';
  textScale: 'normal' | 'large';
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: ScannerSettings = {
  minIntervalMs: 250,
  processingResolution: 640,
  confidenceThreshold: 0.35,
  nmsIoU: 0.45,
  smoothing: 0.6,
  handTrackingEnabled: true,
  autoSpeakOnSelect: true,
  saveSnapshots: false,
  speechRate: 1,
  speechVoiceUri: '',
  explanationMode: 'quick',
  theme: 'dark',
  textScale: 'normal',
  reducedMotion: false,
};

/** Worker protocol: main → worker. */
export type WorkerRequest =
  | {
      type: 'init';
      modelUrl: string;
      wasmPaths: string;
      inputSize: number;
    }
  | {
      type: 'detect';
      frameId: number;
      width: number;
      height: number;
      /** RGBA pixel buffer (transferable). */
      pixels: ArrayBuffer;
      confThreshold: number;
      iouThreshold: number;
    };

/** Worker protocol: worker → main. */
export type WorkerResponse =
  | { type: 'progress'; phase: 'downloading'; loadedBytes: number; totalBytes: number | null }
  | { type: 'progress'; phase: 'loading' }
  | { type: 'ready'; loadMs: number }
  | { type: 'error'; message: string; recoverable: boolean }
  | {
      type: 'result';
      frameId: number;
      latencyMs: number;
      /** Detections with boxes already mapped to source-frame coordinates. */
      detections: Array<{ classId: number; label: string; score: number; box: BoundingBox }>;
    };
