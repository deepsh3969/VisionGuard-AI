# VisionGuard AI — Architecture

## Overview

Modular TypeScript application (React + Vite). Inference logic is fully separated
from UI components; adapters make backends interchangeable.

```
┌────────────────────────────── UI (React) ──────────────────────────────┐
│ ScannerView · CameraViewport · DetectionList · ObjectPanel             │
│ DiagnosticsPanel · HistoryView · SettingsView · ShortcutsDialog        │
└───────────────▲──────────────────────────────▲─────────────────────────┘
                │ hooks                        │ hooks
┌───────────────┴──────────┐   ┌───────────────┴────────────────────────┐
│ useCamera                │   │ useScanner (orchestration)             │
│  getUserMedia lifecycle  │   │  frame grab → pipeline → selection     │
└──────────────────────────┘   └───────▲───────────────▲────────────────┘
                                       │               │
                    ┌──────────────────┴──┐   ┌────────┴───────────────┐
                    │ core/pipeline       │   │ vision/ adapters       │
                    │  FramePipeline      │   │  ObjectDetector (IF)   │
                    │  ObjectTracker      │   │   ├─ OnnxDetector      │
                    │  association        │   │   │   (worker+ORT)     │
                    │  candidate select   │   │   └─ MockDetector      │
                    └─────────────────────┘   │  HandLandmarkerAdapter │
                                              └────────▲───────────────┘
                                                       │
                              ┌────────────────────────┴──────────────────┐
                              │ vision/detector.worker.ts (Web Worker)    │
                              │  YoloSession: fetch → letterbox → NCHW    │
                              │  tensor → ORT run → decode → NMS → boxes  │
                              └───────────────────────────────────────────┘
```

## Module map

| Module | Path | Responsibility |
| --- | --- | --- |
| Types | `src/types` | All shared interfaces (Detection, Track, Hand, settings, worker protocol…) |
| Geometry | `src/core/geometry.ts` | IoU, distances, EMA, clamping |
| Preprocess | `src/core/preprocess.ts` | Letterbox transform + RGBA→NCHW float rasterization |
| YOLO postprocess | `src/core/yolo.ts` | Decode [1,N,85], confidence filter, class-aware NMS |
| COCO vocab | `src/core/coco.ts` | 80-class labels, model id, default model URL |
| Tracking | `src/core/tracking.ts` | Greedy IoU+proximity tracker, class votes, expiry |
| Association | `src/core/association.ts` | Hand↔object signals, states, temporal stabilizer |
| Pipeline | `src/core/pipeline.ts` | Pure per-frame orchestration (unit-tested) |
| Candidate | `src/core/candidate.ts` | Default object selection policy |
| Detector IF | `src/vision/detector.types.ts` | Interchangeable detector adapter interface |
| YOLO session | `src/vision/yoloSession.ts` | Download/progress, fp32/fp16 tensors, inference |
| Worker | `src/vision/detector.worker.ts` | Off-main-thread session, frame coalescing |
| ONNX adapter | `src/vision/onnxYoloDetector.ts` | `ObjectDetector` impl over the worker |
| Mock adapter | `src/vision/mockDetector.ts` | Explicitly-labeled fake detections (dev only) |
| Hands | `src/vision/handLandmarker.ts` | MediaPipe HandLandmarker (VIDEO mode, 2 hands) |
| Templates | `src/describe/templates.ts` | Audited grounded knowledge for 80 classes |
| Providers | `src/describe/*` | Template + remote VLM providers (interchangeable) |
| Voice | `src/voice/speech.ts` | Web Speech controller, announce-once policy |
| Storage | `src/storage/*` | IndexedDB wrapper, history repo, export/print |
| API client | `src/api/client.ts` | Timeouts, error normalization, upload validation |
| Serverless | `api/describe.ts` | VLM proxy; API key never reaches the client |

## Data flow (one frame)

1. `useCamera` keeps a live `HTMLVideoElement` (explicit permission, visible state,
   guaranteed `track.stop()` cleanup).
2. The rAF loop throttles to `minIntervalMs` and draws the video into a reusable
   canvas at `processingResolution` (aspect preserved).
3. `getImageData` → RGBA buffer posted to the worker (transferable).
4. Worker: letterbox → NCHW tensor (float32, auto-retry float16 for half-precision
   exports) → `InferenceSession.run` → decode + NMS → boxes mapped back through
   the letterbox inverse → clamped to source bounds.
5. Main thread: optional MediaPipe hand landmarks on the same canvas.
6. `FramePipeline.step` → tracker match (IoU 0.65 + proximity 0.35, class-gated)
   → EMA smoothing → class-vote stabilization → association scoring →
   association-state stabilization.
7. Selection policy (held > uncertain > confident/large) unless the user clicked
   a track; overlay drawn with object-fit:contain correction.
8. Descriptions are generated for the selected track (template always; remote VLM
   only on explicit user action with the crop image).
9. Speech announces a selection once per `trackId+label` key.

## Concurrency & performance

- Inference lives in a module Web Worker; the main thread never blocks on ORT.
- Only one inference is in flight; new frames **coalesce** (latest wins) and stale
  promises reject as `superseded`.
- Processing resolution and inference interval are user-configurable.
- Canvas resources are reused; camera streams are fully stopped on unmount/stop.
- React re-renders are driven by discrete frame results, not per-draw state.

## Interchangeable adapters

`ObjectDetector` (`init`, `detect`, `dispose`, `ready`, `id`, `name`) is the seam:

- **Production**: `OnnxDetector` → worker → `YoloSession`.
- **Development**: `MockDetector` (labels prefixed `MOCK`, red UI badge, only via
  `?mock=1`). A mock is never presented as real inference.
- A remote-API detector can implement the same interface without UI changes.

Description providers implement `DescriptionProvider`:
`TemplateProvider` (local, deterministic) and `RemoteVlmProvider` (serverless
proxy). Failures surface as explicit states; the UI falls back to templates with
a visible notice — never a fabricated remote answer.

## Tracking honesty note

The tracker is a **greedy one-to-one matcher** over
`0.65·IoU + 0.35·proximity` (halved across class changes) with EMA smoothing and
majority class votes. It is not Kalman filtering, DeepSORT or optical flow, and
the code/docs do not claim otherwise.

## Coordinate systems

- `source`: pixels of the processing frame (same aspect ratio as the camera
  frame; boxes from the worker are mapped here via the letterbox inverse).
- `display`: CSS pixels of the letterboxed video inside the viewport
  (`computeDisplayRect` reproduces `object-fit: contain`).
- `input`: 640×640 model tensor space (internal to the worker).
