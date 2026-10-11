import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DescriptionResult,
  ExplanationMode,
  ModelStatus,
  Track,
} from '../types';
import { TemplateProvider } from '../describe/templateProvider';
import { RemoteVlmProvider } from '../describe/remoteProvider';
import { associationLabel } from '../core/candidate';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Tabs } from './ui/Tabs';

const templateProvider = new TemplateProvider();
const remoteProvider = new RemoteVlmProvider();

export function useRemoteAvailability() {
  const [available, setAvailable] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void remoteProvider.refreshAvailability().then((status) => {
      if (!cancelled) {
        setAvailable(status === 'ready');
        setChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return { available, checked };
}

interface ObjectPanelProps {
  track: Track | null;
  explanationMode: ExplanationMode;
  onExplanationModeChange: (mode: ExplanationMode) => void;
  speechSupported: boolean;
  speaking: boolean;
  onSpeak: (text: string) => void;
  onSpeakOnce: (key: string, text: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSaveScan: (description: string) => void;
  remoteAvailable: boolean;
  grabCropDataUrl: (() => string | null) | null;
}

export function ObjectPanel({
  track,
  explanationMode,
  onExplanationModeChange,
  speechSupported,
  speaking,
  onSpeak,
  onSpeakOnce,
  onPause,
  onResume,
  onStop,
  onSaveScan,
  remoteAvailable,
  grabCropDataUrl,
}: ObjectPanelProps) {
  const [quickText, setQuickText] = useState('');
  const [detailedText, setDetailedText] = useState('');
  const [educationalText, setEducationalText] = useState('');
  const [remoteResult, setRemoteResult] = useState<DescriptionResult | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const requestSeq = useRef(0);

  const build = useCallback(
    async (mode: ExplanationMode, label: string, confidence: number) => {
      const result = await templateProvider.describe({ label, mode, confidence });
      return result.text;
    },
    [],
  );

  useEffect(() => {
    setRemoteResult(null);
    setRemoteError(null);
    if (!track) {
      setQuickText('');
      setDetailedText('');
      setEducationalText('');
      return;
    }
    const seq = ++requestSeq.current;
    let cancelled = false;
    void (async () => {
      const [q, d, e] = await Promise.all([
        build('quick', track.label, track.confidence),
        build('detailed', track.label, track.confidence),
        build('educational', track.label, track.confidence),
      ]);
      if (cancelled || seq !== requestSeq.current) return;
      setQuickText(q);
      setDetailedText(d);
      setEducationalText(e);
      // Announce new selection once (never per frame).
      onSpeakOnce(
        `track-${track.id}-${track.label}`,
        `${track.label}. ${q}`,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [track, build, onSpeakOnce]);

  const analyzeWithVlm = useCallback(async () => {
    if (!track || !grabCropDataUrl) return;
    const seq = ++requestSeq.current;
    setRemoteLoading(true);
    setRemoteError(null);
    try {
      const image = grabCropDataUrl();
      if (!image) throw new Error('Could not capture a crop of the selected object.');
      const result = await remoteProvider.describe({
        label: track.label,
        mode: explanationMode,
        imageDataUrl: image,
        confidence: track.confidence,
      });
      if (seq === requestSeq.current) setRemoteResult(result);
    } catch (err) {
      if (seq === requestSeq.current) {
        setRemoteError(
          err instanceof Error
            ? err.message
            : 'Vision API request failed. Falling back to the local template description.',
        );
      }
    } finally {
      if (seq === requestSeq.current) setRemoteLoading(false);
    }
  }, [track, explanationMode, grabCropDataUrl]);

  if (!track) {
    return (
      <div className="panel">
        <div className="panel-header">
          <h2>Selected object</h2>
        </div>
        <div className="empty-state">
          <p>Point the camera at an object to identify it.</p>
          <p className="faint" style={{ fontSize: '0.82rem' }}>
            Hold the object steady in good light. Detected items appear in the list —
            click one to inspect it.
          </p>
        </div>
      </div>
    );
  }

  const assoc = track.association?.state ?? 'no-hand';
  const activeText =
    explanationMode === 'quick'
      ? quickText
      : explanationMode === 'detailed'
        ? detailedText
        : educationalText;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Selected object</h2>
        <Badge tone={assoc === 'held' ? 'success' : assoc === 'uncertain' ? 'warning' : 'default'}>
          {associationLabel(assoc)}
        </Badge>
      </div>
      <div className="stack" style={{ padding: '0.9rem' }}>
        <div className="object-title">
          <span className="object-name">{track.label}</span>
          <span className="mono faint">track #{track.id}</span>
        </div>
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="section-label">Model confidence</span>
            <span className="mono">{(track.confidence * 100).toFixed(1)}%</span>
          </div>
          <div
            className="confidence-bar"
            role="meter"
            aria-valuenow={Math.round(track.confidence * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Detection confidence"
          >
            <div className="confidence-fill" style={{ width: `${Math.min(100, track.confidence * 100)}%` }} />
          </div>
        </div>

        {assoc === 'uncertain' ? (
          <div className="info-banner">
            Hand association is uncertain — the object is detected, but geometric evidence
            does not strongly indicate it is being held. You can still select and explain it.
          </div>
        ) : null}

        <Tabs
          label="Explanation depth"
          items={[
            { id: 'quick', label: 'Quick' },
            { id: 'detailed', label: 'Detailed' },
            { id: 'educational', label: 'Educational' },
          ]}
          active={explanationMode}
          onChange={(id) => onExplanationModeChange(id as ExplanationMode)}
        />
        <p className="description-text" aria-live="polite">
          {activeText}
        </p>

        <div className="row">
          {speechSupported ? (
            <>
              <Button variant="primary" onClick={() => onSpeak(activeText)} disabled={speaking}>
                {speaking ? 'Speaking…' : 'Read aloud'}
              </Button>
              <Button onClick={onPause} disabled={!speaking}>
                Pause
              </Button>
              <Button onClick={onResume} disabled={!speaking}>
                Resume
              </Button>
              <Button variant="danger" onClick={onStop} disabled={!speaking}>
                Stop
              </Button>
            </>
          ) : (
            <Badge tone="warning">Speech synthesis unavailable in this browser</Badge>
          )}
          <Button onClick={() => onSaveScan(activeText)}>Save to history</Button>
        </div>

        <hr className="divider" />
        <div className="stack" style={{ gap: '0.5rem' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="section-label">Visual analysis (external vision model)</span>
            {remoteResult?.transmittedExternally ? (
              <Badge tone="warning" title="Image was sent to an external API">
                image sent externally
              </Badge>
            ) : null}
          </div>
          <p className="faint" style={{ fontSize: '0.78rem' }}>
            Optional. Sends only this object’s crop to a configured vision-language API.
            The API key stays on the server. Without configuration, local templates are used.
          </p>
          <div className="row">
            <Button
              onClick={() => void analyzeWithVlm()}
              disabled={remoteLoading || !remoteAvailable}
              title={remoteAvailable ? 'Analyze crop with the vision API' : 'Vision API is not configured on the server'}
            >
              {remoteLoading ? <span className="spinner" aria-hidden="true" /> : null}
              {remoteLoading ? 'Analyzing…' : 'Analyze crop with vision AI'}
            </Button>
            {!remoteAvailable ? (
              <Badge tone="warning">API unavailable — template fallback only</Badge>
            ) : null}
          </div>
          {remoteError ? (
            <div className="error-banner" role="alert">
              <span>{remoteError}</span>
              <span className="faint">Showing the grounded template description instead.</span>
            </div>
          ) : null}
          {remoteResult ? (
            <div className="stack" style={{ gap: '0.35rem' }}>
              <Badge tone="accent">vision model · {remoteResult.provider}</Badge>
              <p className="description-text">{remoteResult.text}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function describeModelBadge(status: ModelStatus): { tone: 'success' | 'warning' | 'danger' | 'default'; text: string } {
  switch (status.state) {
    case 'ready':
      return { tone: 'success', text: 'Model ready' };
    case 'downloading':
      return {
        tone: 'warning',
        text: status.totalBytes
          ? `Downloading model ${Math.round((status.loadedBytes / status.totalBytes) * 100)}%`
          : `Downloading model…`,
      };
    case 'loading':
      return { tone: 'warning', text: 'Loading model…' };
    case 'error':
      return { tone: 'danger', text: 'Model error' };
    default:
      return { tone: 'default', text: 'Model idle' };
  }
}
