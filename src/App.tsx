import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header, type AppPage } from './components/Header';
import { ScannerView } from './components/ScannerView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { ShortcutsDialog } from './components/ShortcutsDialog';
import { useScanner } from './hooks/useScanner';
import { useSettings } from './hooks/useSettings';
import { useHistory } from './hooks/useHistory';
import { speechController } from './voice/speech';
import { useRemoteAvailability } from './components/ObjectPanel';
import type { ScanRecord } from './types';

const MOCK_PARAM = new URLSearchParams(window.location.search).get('mock') === '1';

export default function App() {
  const { settings, update, reset } = useSettings();
  const [page, setPage] = useState<AppPage>('scanner');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [speechState, setSpeechState] = useState(() => speechController.getState());
  const history = useHistory();
  const remote = useRemoteAvailability();

  const scanner = useScanner({ settings, useMockBackend: MOCK_PARAM });

  // Speech configuration follows settings.
  useEffect(() => {
    speechController.setRate(settings.speechRate);
    speechController.setVoiceUri(settings.speechVoiceUri);
  }, [settings.speechRate, settings.speechVoiceUri]);

  useEffect(() => speechController.subscribe(setSpeechState), []);

  const speak = useCallback((text: string) => {
    speechController.speak(text);
  }, []);

  const announceOnce = useCallback(
    (key: string, text: string) => {
      if (!settings.autoSpeakOnSelect) return false;
      return speechController.announceOnce(key, text);
    },
    [settings.autoSpeakOnSelect],
  );

  const pause = useCallback(() => speechController.pause(), []);
  const resume = useCallback(() => speechController.resume(), []);
  const stopSpeech = useCallback(() => speechController.stop(), []);

  const grabCropForSave = useCallback((): string | null => {
    const canvas = scanner.grabSnapshotCanvas();
    const track = scanner.selectedTrack;
    if (!canvas || !track || !settings.saveSnapshots) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const scale = canvas.width / (scanner.frameSize?.width ?? canvas.width);
    const margin = 0.15;
    const x = Math.max(0, (track.box.x - track.box.width * margin) * scale);
    const y = Math.max(0, (track.box.y - track.box.height * margin) * scale);
    const w = Math.min(canvas.width - x, track.box.width * scale * (1 + margin * 2));
    const h = Math.min(canvas.height - y, track.box.height * scale * (1 + margin * 2));
    if (w <= 2 || h <= 2) return null;
    const crop = document.createElement('canvas');
    const outW = Math.min(480, Math.round(w));
    const outH = Math.max(1, Math.round((h / w) * outW));
    crop.width = outW;
    crop.height = outH;
    const cctx = crop.getContext('2d');
    if (!cctx) return null;
    cctx.drawImage(canvas, x, y, w, h, 0, 0, outW, outH);
    return crop.toDataURL('image/jpeg', 0.82);
  }, [scanner, settings.saveSnapshots]);

  const saveScan = useCallback(
    (description: string) => {
      const track = scanner.selectedTrack;
      if (!track) return;
      const record: Omit<ScanRecord, 'id'> = {
        timestamp: Date.now(),
        classId: track.classId,
        label: track.label,
        confidence: track.confidence,
        summary: description,
        description: null,
        modelId: scanner.modelId,
        sourceType: scanner.sourceType,
        associationState: track.association?.state ?? 'no-hand',
        snapshotDataUrl: grabCropForSave(),
        notes: '',
        bookmarked: false,
      };
      void history.add(record).then(() => {
        speechController.announceOnce(
          `saved-${track.id}-${track.label}-${record.timestamp}`,
          'Scan saved to history.',
        );
      });
    },
    [scanner, history, grabCropForSave],
  );

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (e.key === 'Escape') {
        speechController.stop();
        setShowShortcuts(false);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        if (scanner.camera.state === 'live') scanner.stopCamera();
        else void scanner.startCamera();
      } else if (key === 'r') {
        e.preventDefault();
        scanner.reanalyze();
      } else if (key === 'c') {
        e.preventDefault();
        const text = document.querySelector('.description-text')?.textContent ?? '';
        if (text) saveScan(text);
      } else if (key === 'h') {
        e.preventDefault();
        setPage('history');
      } else if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        setShowShortcuts(true);
      } else if (key === ' ') {
        e.preventDefault();
        if (speechController.getState().speaking) speechController.stop();
        else {
          const text = document.querySelector('.description-text')?.textContent ?? '';
          if (text) speechController.speak(text);
        }
      } else if (/^[1-9]$/.test(key)) {
        const idx = Number(key) - 1;
        const track = scanner.tracks[idx];
        if (track) {
          e.preventDefault();
          scanner.selectTrack(track.id);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [scanner, saveScan]);

  const diagAnnouncement = useMemo(() => {
    if (scanner.modelStatus.state === 'error') {
      return `Model failed to load: ${scanner.modelStatus.message}`;
    }
    return '';
  }, [scanner.modelStatus]);

  return (
    <div className="app-shell">
      <Header page={page} onNavigate={setPage} onShowShortcuts={() => setShowShortcuts(true)} />
      <main className="app-main">
        <p className="sr-only" role="status" aria-live="polite">
          {diagAnnouncement}
        </p>
        {page === 'scanner' ? (
          <ScannerView
            scanner={scanner}
            explanationMode={settings.explanationMode}
            onExplanationModeChange={(mode) => update({ explanationMode: mode })}
            speech={{
              supported: speechState.supported,
              speaking: speechState.speaking,
              speak,
              announceOnce,
              pause,
              resume,
              stop: stopSpeech,
            }}
            onSaveScan={saveScan}
            remoteAvailable={remote.available}
            saveSnapshots={settings.saveSnapshots}
          />
        ) : null}
        {page === 'history' ? (
          <HistoryView
            scans={history.scans}
            loading={history.loading}
            error={history.error}
            usage={history.usage}
            onRefresh={(f) => void history.refresh(f)}
            onDelete={history.remove}
            onClear={history.clear}
            onPatch={history.patch}
          />
        ) : null}
        {page === 'settings' ? (
          <SettingsView
            settings={settings}
            update={update}
            reset={reset}
            backendId={scanner.backendId}
            voices={speechState.voices}
          />
        ) : null}
      </main>
      <footer className="footer-note">
        VisionGuard AI · detection runs locally (YOLOv5s ONNX) · not a verified
        identification or safety advice · Hold It. Identify It. Understand It.
      </footer>
      <ShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
