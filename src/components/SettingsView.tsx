import type { ScannerSettings } from '../types';
import { SliderField, SelectField } from './ui/Fields';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function SettingsView({
  settings,
  update,
  reset,
  backendId,
  voices,
}: {
  settings: ScannerSettings;
  update: (patch: Partial<ScannerSettings>) => void;
  reset: () => void;
  backendId: string;
  voices?: Array<{ uri: string; name: string; lang: string }>;
}) {
  return (
    <div className="settings-grid">
      <div className="panel">
        <div className="panel-header">
          <h2>Detection</h2>
          <Badge mono>{backendId}</Badge>
        </div>
        <div className="panel-body stack">
          <SliderField
            label="Inference interval"
            min={100}
            max={1000}
            step={50}
            value={settings.minIntervalMs}
            format={(v) => `${v} ms (~${(1000 / v).toFixed(1)} fps max)`}
            onChange={(v) => update({ minIntervalMs: v })}
          />
          <SelectField
            label="Processing resolution"
            value={String(settings.processingResolution)}
            options={[
              { value: '320', label: '320 px — fastest' },
              { value: '416', label: '416 px — balanced' },
              { value: '640', label: '640 px — most accurate' },
            ]}
            onChange={(v) => update({ processingResolution: Number(v) as ScannerSettings['processingResolution'] })}
          />
          <SliderField
            label="Confidence threshold"
            min={0.1}
            max={0.9}
            step={0.05}
            value={settings.confidenceThreshold}
            format={(v) => v.toFixed(2)}
            onChange={(v) => update({ confidenceThreshold: v })}
          />
          <SliderField
            label="NMS IoU threshold"
            min={0.2}
            max={0.8}
            step={0.05}
            value={settings.nmsIoU}
            format={(v) => v.toFixed(2)}
            onChange={(v) => update({ nmsIoU: v })}
          />
          <SliderField
            label="Box smoothing"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.smoothing}
            format={(v) => `${v.toFixed(2)} (higher = snappier)`}
            onChange={(v) => update({ smoothing: v })}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.handTrackingEnabled}
              onChange={(e) => update({ handTrackingEnabled: e.target.checked })}
            />
            Hand landmark tracking (MediaPipe)
          </label>
          <p className="faint" style={{ fontSize: '0.76rem' }}>
            Hand tracking needs a one-time model download and runs on the main thread at
            the inference rate. Disable it to reduce CPU load — objects are still detected.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Voice &amp; appearance</h2>
        </div>
        <div className="panel-body stack">
          <SliderField
            label="Speaking rate"
            min={0.5}
            max={2}
            step={0.1}
            value={settings.speechRate}
            format={(v) => `${v.toFixed(1)}×`}
            onChange={(v) => update({ speechRate: v })}
          />
          <SelectField
            label="Voice"
            value={settings.speechVoiceUri}
            options={[
              { value: '', label: 'System default' },
              ...(voices ?? []).map((v) => ({
                value: v.uri,
                label: `${v.name} (${v.lang})`,
              })),
            ]}
            onChange={(v) => update({ speechVoiceUri: v })}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.autoSpeakOnSelect}
              onChange={(e) => update({ autoSpeakOnSelect: e.target.checked })}
            />
            Announce a newly selected object once
          </label>
          <SelectField
            label="Theme"
            value={settings.theme}
            options={[
              { value: 'dark', label: 'Dark (default)' },
              { value: 'light', label: 'Light' },
            ]}
            onChange={(v) => update({ theme: v as ScannerSettings['theme'] })}
          />
          <SelectField
            label="Text size"
            value={settings.textScale}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'large', label: 'Large' },
            ]}
            onChange={(v) => update({ textScale: v as ScannerSettings['textScale'] })}
          />
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => update({ reducedMotion: e.target.checked })}
            />
            Reduce motion
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.saveSnapshots}
              onChange={(e) => update({ saveSnapshots: e.target.checked })}
            />
            Save snapshot images with scans (opt-in)
          </label>
          <p className="faint" style={{ fontSize: '0.76rem' }}>
            Snapshots are stored only in your browser’s IndexedDB on this device.
            No video or images leave your device unless you press
            “Analyze crop with vision AI”.
          </p>
          <div className="row">
            <Button onClick={reset}>Reset to defaults</Button>
          </div>
        </div>
      </div>

      <div className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-header">
          <h2>Privacy</h2>
        </div>
        <div className="panel-body stack" style={{ fontSize: '0.86rem' }}>
          <p>
            • Object detection and hand tracking run <strong>locally in your browser</strong>{' '}
            (ONNX Runtime Web + MediaPipe in a Web Worker / WASM). Camera frames are never
            uploaded by the detection pipeline.
          </p>
          <p>
            • The optional vision-language description sends <strong>only the crop of the
            selected object</strong> to the serverless <span className="mono">/api/describe</span>{' '}
            endpoint, which forwards it to a configured external provider. The notice
            “image sent externally” appears when that happens.
          </p>
          <p>
            • Scan history (including optional snapshots) is stored in IndexedDB on this
            device only. Use “Clear all” in History to delete it.
          </p>
          <p>
            • VisionGuard does not identify people or infer personal attributes.
          </p>
        </div>
      </div>
    </div>
  );
}
