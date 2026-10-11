# VisionGuard AI

**Hold It. Identify It. Understand It.**

An industrial-quality visual intelligence platform that recognizes everyday objects —
including objects held in your hand — and explains them with grounded descriptions
and natural speech. Detection runs **locally in your browser** with a real ONNX model.

---

## What it does

- **Real object detection** — YOLOv5s (ONNX, 80 COCO classes) running on
  ONNX Runtime Web inside a Web Worker. No fake predictions, no random confidences.
- **Hand–object association** — MediaPipe Hand Landmarker (up to 2 hands) with
  multi-signal geometric association (box overlap, palm distance, fingertip
  proximity + temporal stabilization). States: *held*, *uncertain*, *not-held*,
  *no hand*. Manual selection always overrides.
- **Tracking & stabilization** — greedy IoU+proximity tracker with stable IDs,
  EMA box smoothing and class-vote stabilization (simple, documented matcher —
  not Kalman/DeepSORT).
- **Grounded explanations** — Quick / Detailed / Educational modes built from a
  deterministic, audited template knowledge base covering all 80 COCO classes.
  Optional external vision-language analysis of the selected crop via a
  serverless endpoint (key stays on the server; "image sent externally" is shown).
- **Speech** — read-aloud, pause/resume/stop, rate and voice selection,
  announce-once-per-object (never per frame). Web Speech API.
- **History** — IndexedDB scan history with search, date/category filters, sort,
  bookmarks, notes, JSON/CSV export, printable reports. Snapshots are **opt-in**.
- **Diagnostics** — real model status, download progress, latency, processing FPS,
  backend id, camera state and recoverable error paths.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

The first scan downloads the YOLOv5s model (~15 MB) from the official Ultralytics
GitHub release and caches it in the browser (Cache Storage). Hand tracking downloads
an additional ~7.8 MB MediaPipe model on first use.

> Camera access requires **HTTPS or localhost**.

### Useful commands

| Command             | Purpose                              |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Dev server                           |
| `npm run build`     | Type-check + production build        |
| `npm run preview`   | Serve the production build locally   |
| `npm run lint`      | ESLint                               |
| `npm run typecheck` | TypeScript project build check       |
| `npm test`          | Vitest unit + integration tests      |

### Development mock backend

`http://localhost:5173/?mock=1` loads an explicitly-labeled **MOCK** detector
(prefixes every label with “MOCK”, shows a red badge). It exists for UI
development only and is never the default.

## Architecture (short version)

```
camera/upload → preprocessing (letterbox) → YOLOv5s ONNX (Web Worker)
             → hand landmarks (MediaPipe, optional)
             → hand–object association → tracking + temporal stabilization
             → candidate selection → description (template | remote VLM)
             → text + speech + optional IndexedDB save
```

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
Model licensing: [docs/MODELS.md](docs/MODELS.md).
Problems? [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

## Supported object classes

The 80 COCO categories (person, bicycle, car … cup, laptop, cell phone, book,
scissors, toothbrush — see `src/core/coco.ts`). Unsupported classes are reported
explicitly and never given an invented description.

## Privacy & security

- Detection and hand tracking run **entirely on-device**. Frames are never uploaded.
- The optional vision-language feature sends **only the crop of the selected object**
  to the app's own `/api/describe` serverless function, which holds the API key
  server-side. The UI shows an "image sent externally" notice when used.
- Scan history lives in **your browser's IndexedDB** only. Clear it from the
  History page.
- No accounts, no telemetry, no recording, no microphone access.
- Security headers (CSP, frame-ancestors, permissions-policy) ship in `vercel.json`.
- VisionGuard does **not** identify people or infer personal attributes. Output is
  model-based estimation, not verified identification or safety advice.

## Configuration

Copy `.env.example` to `.env` (and set the same variables in Vercel):

| Variable             | Where    | Purpose                                        |
| -------------------- | -------- | ---------------------------------------------- |
| `VISION_API_KEY`     | server   | Enables remote vision-language descriptions    |
| `VISION_API_BASE`    | server   | OpenAI-compatible base URL (default OpenAI)    |
| `VISION_API_MODEL`   | server   | Model name (default `gpt-4o-mini`)             |
| `VITE_DETECTOR_MODEL_URL` | client | Override the YOLO ONNX download URL       |

Without `VISION_API_KEY` everything still works; remote analysis shows an explicit
“API unavailable” state and grounded templates are used.

## Deployment

Static build for Vercel (`vercel.json` included; `/api/describe` is a Vercel
Node function):

```bash
npm run build
vercel --prod          # or connect the GitHub repo in the Vercel dashboard
```

To enable remote descriptions, set `VISION_API_KEY` (etc.) in the Vercel project
environment variables and redeploy. A persistent Python backend is **not** required
and is not used.

## Browser support & limitations

- Chrome/Edge (recommended), recent Firefox and Safari with WebAssembly +
  Web Speech support.
- Inference speed depends on the device: a lower processing resolution and a
  higher inference interval are available in Settings for slower hardware.
- Hand tracking can fail on some GPUs; object detection keeps working without it.
- Detection is category-level estimation. Brands, contents behind labels, exact
  materials, medical/chemical identity and safety certifications are never claimed.

## Testing

`npm test` runs 112 tests: geometry/letterbox math, YOLO decode + NMS, tracking,
hand–object association, pipeline integration (mock detections, clearly labeled),
description providers (success + failure), speech controls, IndexedDB history,
search/filter/export, camera error mapping, upload validation, overlay alignment —
plus a **real-model integration test** that downloads YOLOv5s and runs genuine
inference on the official sample photo, asserting real `bus`/`person` detections.

## License

MIT for VisionGuard AI code. See [docs/MODELS.md](docs/MODELS.md) for model licenses
(YOLOv5 is AGPL-3.0 — the model weights are fetched at runtime, not vendored).
