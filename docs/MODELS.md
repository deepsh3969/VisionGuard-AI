# Models, datasets and licensing

## Object detection — YOLOv5s (ONNX)

| Field | Value |
| --- | --- |
| File | `yolov5s.onnx` (~14.7 MB) |
| Source (default) | `https://github.com/ultralytics/yolov5/releases/download/v7.0/yolov5s.onnx` |
| Exported by | Ultralytics YOLOv5 v7.0 release asset |
| Input | `[1,3,640,640]` RGB, 0..1 (float16 for this export; auto-detected) |
| Output | `[1,25200,85]` — xywh + objectness + 80 COCO class scores |
| Classes | 80 COCO categories (`src/core/coco.ts`) |
| Training data | MS COCO 2017 (images & labels; see COCO terms) |
| License | **AGPL-3.0** (Ultralytics YOLOv5 repository & release artifacts) |
| Runtime | onnxruntime-web 1.17.3 (MIT) — WASM, single-threaded, Web Worker |

The weights are **downloaded at runtime** and cached in the browser's Cache
Storage; they are not vendored in this repository. AGPL obligations apply to the
YOLOv5 software/weights themselves; this application's own code is MIT. If you
redistribute a build that includes modified YOLOv5 components, review AGPL
requirements. Override the download location with `VITE_DETECTOR_MODEL_URL`
(e.g., a self-hosted copy) if needed.

## Hand landmarks — MediaPipe Hand Landmarker

| Field | Value |
| --- | --- |
| File | `hand_landmarker.task` (~7.8 MB, float16) |
| Source | `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` |
| WASM runtime | `@mediapipe/tasks-vision` 0.10.14 via jsDelivr CDN |
| License | MediaPipe models are distributed under the Apache-2.0 license (see the MediaPipe repository) |

Hand tracking is optional; disabling it removes this download and its CPU cost.

## Vision-language descriptions (optional)

Not a local model. When configured, the crop of the selected object is sent to
an OpenAI-compatible chat-completions endpoint through the serverless
`/api/describe` function. Model default: `gpt-4o-mini` (OpenAI terms apply).
Without configuration, the app uses its local audited template knowledge base.

## Template knowledge base

Hand-authored, grounded descriptions for the 80 COCO classes in
`src/describe/templates.ts`. Covered by tests that reject brand names,
certification claims, hidden-content claims and similar inventiveness.

## Test fixtures

- `tests/fixtures/yolov5s.onnx` and `tests/fixtures/bus.jpg` are downloaded on
  demand by the integration test and are **gitignored** (large binaries are never
  committed). Sample photo: `ultralytics/yolov5` repository `data/images/bus.jpg`.
