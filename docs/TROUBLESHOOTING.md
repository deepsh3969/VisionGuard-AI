# Troubleshooting

## Camera never starts

- Camera access requires **HTTPS or localhost**. Opening the built `dist/index.html`
  via `file://` will not work.
- Check the browser's site permissions (camera icon in the address bar).
- The app maps permission errors explicitly ("denied", "no camera", "in use").
- Close other apps that may hold the camera (video conferencing tools).

## Model download fails or is stuck

- The model is fetched from GitHub Releases (`github.com` / `objects.githubusercontent.com`).
  Corporate proxies or blocked networks will fail — the error appears in the
  diagnostics panel with a **Retry model load** button.
- You can self-host the file and point `VITE_DETECTOR_MODEL_URL` at it.
- The download is cached after the first success.

## Hand tracking unavailable

- MediaPipe needs its WASM from `cdn.jsdelivr.net` and the `.task` model from
  `storage.googleapis.com`. If either is blocked, object detection still works —
  the "hands ready" badge simply won't appear.
- Some integrated GPUs fail the GPU delegate; the adapter reports an error and
  the scanner keeps running without hands.

## Inference is slow

- Lower **Processing resolution** (Settings → Detection) to 320 px.
- Increase the **Inference interval** (e.g., 500 ms ≈ 2 fps).
- Close other GPU-heavy tabs.
- Reported latency/FPS in Diagnostics are measured, not estimated.

## Speech doesn't speak

- Web Speech API availability varies (notably iOS Safari requires a user gesture
  first — press "Read aloud" once).
- Check the selected voice in Settings; some OS voices are download-only.

## Remote "vision AI" button disabled

- The server needs `VISION_API_KEY` (see `.env.example`). Without it the endpoint
  answers 503 and the UI shows "API unavailable — template fallback only".
  Locally, use `vercel dev` to run the serverless function with your env vars.

## "Superseded" frames / flickering selection

- Frames arriving while inference is busy are coalesced (latest wins). This is
  intentional back-pressure. Increase the interval if the device can't keep up.

## Clearing data

- History → **Clear all** deletes every scan (including snapshots) from IndexedDB.
- Model caches: DevTools → Application → Cache Storage / Cache.

## Reporting issues

Include: browser + OS, the diagnostics panel contents (backend, model status,
latency), and the console error text.
