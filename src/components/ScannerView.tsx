import { useRef } from 'react';
import type {
  DiagnosticsSnapshot,
  ExplanationMode,
  Track,
} from '../types';
import type { ScannerController } from '../hooks/useScanner';
import { CameraViewport } from './CameraViewport';
import { DetectionList } from './DetectionList';
import { ObjectPanel, describeModelBadge } from './ObjectPanel';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { validateImageFile } from '../api/client';

interface ScannerViewProps {
  scanner: ScannerController;
  explanationMode: ExplanationMode;
  onExplanationModeChange: (mode: ExplanationMode) => void;
  speech: {
    supported: boolean;
    speaking: boolean;
    speak: (text: string) => void;
    announceOnce: (key: string, text: string) => boolean;
    pause: () => void;
    resume: () => void;
    stop: () => void;
  };
  onSaveScan: (description: string) => void;
  remoteAvailable: boolean;
  saveSnapshots: boolean;
}

export function ScannerView({
  scanner,
  explanationMode,
  onExplanationModeChange,
  speech,
  onSaveScan,
  remoteAvailable,
  saveSnapshots,
}: ScannerViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadErrorRef = useRef<string | null>(null);

  const modelBadge = describeModelBadge(scanner.modelStatus);
  const diag: DiagnosticsSnapshot = {
    model: scanner.modelStatus,
    modelId: scanner.modelId,
    backendId: scanner.backendId,
    cameraState: scanner.camera.state,
    cameraError: scanner.camera.error,
    inferenceLatencyMs: scanner.latencyMs,
    processingFps: scanner.processingFps,
    handsDetected: scanner.lastFrame?.hands.length ?? 0,
    objectsDetected: scanner.tracks.length,
    workerReady: scanner.backendId === 'dev-mock' || scanner.modelStatus.state === 'ready',
    lastError: scanner.lastError,
  };

  const onFileChange = async (file: File | undefined) => {
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      uploadErrorRef.current = error;
      scanner.camera.stop();
      alert(error);
      return;
    }
    uploadErrorRef.current = null;
    try {
      await scanner.loadImage(file);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load image.');
    }
  };

  const cropDataUrl = (): string | null => {
    const canvas = scanner.grabSnapshotCanvas();
    const track = scanner.selectedTrack;
    if (!canvas || !track) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // Canvas is in frame space; crop with a small margin, clamped.
    const scale = canvas.width / (scanner.frameSize?.width ?? canvas.width);
    const margin = 0.15;
    const x = Math.max(0, (track.box.x - track.box.width * margin) * scale);
    const y = Math.max(0, (track.box.y - track.box.height * margin) * scale);
    const w = Math.min(canvas.width - x, track.box.width * scale * (1 + margin * 2));
    const h = Math.min(canvas.height - y, track.box.height * scale * (1 + margin * 2));
    if (w <= 2 || h <= 2) return null;
    const crop = document.createElement('canvas');
    const outW = Math.min(384, Math.round(w));
    const outH = Math.max(1, Math.round((h / w) * outW));
    crop.width = outW;
    crop.height = outH;
    const cctx = crop.getContext('2d');
    if (!cctx) return null;
    cctx.drawImage(canvas, x, y, w, h, 0, 0, outW, outH);
    return crop.toDataURL('image/jpeg', 0.85);
  };

  const cameraLive = scanner.camera.state === 'live';
  const placeholder = (
    <div className="viewport-placeholder">
      <p style={{ fontWeight: 650 }}>Camera is off</p>
      <p style={{ fontSize: '0.85rem', maxWidth: 360 }}>
        Start the camera or upload a photo to run real on-device object detection.
        Frames are processed locally — nothing is uploaded.
      </p>
      <Button variant="primary" onClick={() => void scanner.startCamera()}>
        Start camera
      </Button>
    </div>
  );

  return (
    <div className="scanner-grid">
      <div className="stack">
        <div className="panel">
          <div className="panel-header">
            <h2>Live scanner</h2>
            <div className="row">
              {scanner.backendId === 'dev-mock' ? (
                <Badge tone="danger" title="Development mock — not real AI inference">
                  MOCK — not real AI
                </Badge>
              ) : null}
              <Badge tone={modelBadge.tone}>{modelBadge.text}</Badge>
              {scanner.handsReady ? <Badge tone="accent">hands ready</Badge> : null}
              <Badge mono tone="default" title="Frames sent to the model per second (configured)">
                target {scanner.processingFps != null ? `${scanner.processingFps.toFixed(1)} fps` : '—'}
              </Badge>
            </div>
          </div>
          <CameraViewport
            videoRef={scanner.camera.videoRef}
            uploadPreviewUrl={scanner.uploadPreviewUrl}
            sourceType={scanner.sourceType}
            tracks={scanner.tracks}
            hands={scanner.lastFrame?.hands ?? []}
            selectedTrackId={scanner.selectedTrack?.id ?? null}
            onSelectTrack={scanner.selectTrack}
            frame={
              scanner.frameSize
                ? { frameWidth: scanner.frameSize.width, frameHeight: scanner.frameSize.height }
                : null
            }
            showLandmarks={scanner.handsReady}
            interactive={!cameraLive || scanner.tracks.length > 0}
            placeholder={placeholder}
            statusOverlay={
              <>
                {cameraLive ? <Badge tone="danger">● LIVE</Badge> : null}
                {scanner.busy ? <Badge tone="accent">analyzing…</Badge> : null}
                {scanner.lastError ? <Badge tone="danger">{scanner.lastError}</Badge> : null}
              </>
            }
          />
          <div className="viewport-controls">
            {cameraLive ? (
              <Button variant="danger" onClick={scanner.stopCamera} title="Stop the camera (S)">
                Stop camera
              </Button>
            ) : (
              <Button variant="primary" onClick={() => void scanner.startCamera()}>
                Start camera
              </Button>
            )}
            <Button onClick={() => void scanner.camera.switchCamera()} disabled={!cameraLive}>
              Switch camera
            </Button>
            <Button onClick={() => fileInputRef.current?.click()}>Upload image</Button>
            <Button onClick={scanner.reanalyze} title="Re-run detection on the current frame (R)">
              Re-analyze
            </Button>
            <Button variant="ghost" onClick={scanner.resetTracker} title="Clear tracks">
              Reset tracks
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Upload an image for analysis"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                void onFileChange(file);
              }}
            />
          </div>
          {!saveSnapshots ? (
            <div className="panel-body" style={{ paddingTop: 0 }}>
              <p className="faint" style={{ fontSize: '0.75rem' }}>
                Snapshots are not saved automatically. Enable “save snapshots” in Settings
                before saving a scan if you want an image stored in history.
              </p>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Detections</h2>
            <span className="faint mono" style={{ fontSize: '0.75rem' }}>
              {scanner.tracks.length} tracked · {scanner.lastFrame?.hands.length ?? 0} hand(s)
            </span>
          </div>
          <div className="panel-body">
            <DetectionList
              tracks={scanner.tracks}
              selectedTrackId={scanner.selectedTrack?.id ?? null}
              onSelect={scanner.selectTrack}
            />
            <div className="hand-legend" style={{ marginTop: '0.6rem' }}>
              <span>
                <span className="legend-swatch" style={{ background: '#34d399' }} />
                likely held
              </span>
              <span>
                <span className="legend-swatch" style={{ background: '#fbbf24' }} />
                uncertain (dashed)
              </span>
              <span>
                <span className="legend-swatch" style={{ background: '#7f93b5' }} />
                detected / not held
              </span>
            </div>
          </div>
        </div>

        <DiagnosticsPanel diag={diag} onRetryModel={scanner.retryModel} />
      </div>

      <ObjectPanel
        track={scanner.selectedTrack as Track | null}
        explanationMode={explanationMode}
        onExplanationModeChange={onExplanationModeChange}
        speechSupported={speech.supported}
        speaking={speech.speaking}
        onSpeak={speech.speak}
        onSpeakOnce={speech.announceOnce}
        onPause={speech.pause}
        onResume={speech.resume}
        onStop={speech.stop}
        onSaveScan={onSaveScan}
        remoteAvailable={remoteAvailable}
        grabCropDataUrl={cropDataUrl}
      />
    </div>
  );
}
