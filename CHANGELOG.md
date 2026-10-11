# Changelog

All notable changes to VisionGuard AI are documented here.

## [1.0.0] — 2026-10-11

### Added

- Real in-browser object detection with YOLOv5s ONNX (Ultralytics v7.0 export)
  on ONNX Runtime Web, hosted in a Web Worker with model download progress,
  coalesced frame scheduling and error recovery.
- Automatic float16 input fallback for the half-precision model export.
- MediaPipe Hand Landmarker adapter (up to two hands) with graceful degradation
  when unavailable.
- Multi-signal hand–object association (box overlap, palm distance, fingertip
  proximity) with temporal state stabilization and manual override.
- Greedy IoU+proximity multi-object tracker with stable IDs, EMA smoothing,
  class-vote stabilization and stale-track expiry.
- Grounded template knowledge base for all 80 COCO classes (Quick / Detailed /
  Educational explanations) with tests enforcing the no-brands/no-invention rules.
- Optional remote vision-language description via serverless `/api/describe`
  (OpenAI-compatible, key server-side, explicit "image sent externally" notice,
  explicit unavailable/error states).
- Web Speech assistant: read aloud, pause/resume/stop, rate, voice selection,
  announce-once-per-object policy, keyboard controls, ARIA live status.
- Scanner UI: aligned detection overlay with object-fit correction, hand
  skeleton rendering, detection list, selected-object panel, diagnostics,
  upload mode, re-analyze, camera switch, mock-backend badge.
- IndexedDB scan history: search, date/category filters, sort, bookmarks, notes,
  delete/clear, JSON + CSV export, printable reports, opt-in snapshots,
  storage estimate display.
- Settings: inference interval, processing resolution, confidence/NMS thresholds,
  smoothing, hand tracking toggle, auto-speak, snapshots, speech, theme
  (dark/light), text size, reduced motion.
- Keyboard shortcuts with accessible help dialog; responsive layout.
- Security headers in `vercel.json` (CSP, frame-ancestors, permissions-policy,
  nosniff, referrer-policy).
- Test suite (112 tests) including a real-model integration test that verifies
  genuine YOLOv5s detections on the official sample photo.
- Documentation: README, architecture, model licensing, troubleshooting.

### Notes

- The previous VisionGuard repository did not exist locally or on GitHub at the
  time of implementation; this release establishes the production baseline.
