import type { DiagnosticsSnapshot } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

export function DiagnosticsPanel({
  diag,
  onRetryModel,
}: {
  diag: DiagnosticsSnapshot;
  onRetryModel: () => void;
}) {
  const modelText =
    diag.model.state === 'ready'
      ? `ready (${Math.round(diag.model.loadMs)} ms)`
      : diag.model.state === 'downloading'
        ? diag.model.totalBytes
          ? `downloading ${Math.round((diag.model.loadedBytes / diag.model.totalBytes) * 100)}%`
          : 'downloading…'
        : diag.model.state === 'loading'
          ? 'loading…'
          : diag.model.state === 'error'
            ? `error: ${diag.model.message}`
            : 'idle';

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Diagnostics</h2>
        {diag.model.state === 'error' ? (
          <Button size="small" onClick={onRetryModel}>
            Retry model load
          </Button>
        ) : null}
      </div>
      <div className="panel-body">
        <dl className="kv-grid">
          <dt>Backend</dt>
          <dd>{diag.backendId}</dd>
          <dt>Model</dt>
          <dd title={diag.modelId}>{diag.modelId}</dd>
          <dt>Model status</dt>
          <dd>{modelText}</dd>
          <dt>Camera</dt>
          <dd>
            {diag.cameraState}
            {diag.cameraError ? ` — ${diag.cameraError}` : ''}
          </dd>
          <dt>Worker</dt>
          <dd>{diag.workerReady ? 'ready' : 'not ready'}</dd>
          <dt>Latency</dt>
          <dd>{diag.inferenceLatencyMs != null ? `${diag.inferenceLatencyMs.toFixed(1)} ms` : '—'}</dd>
          <dt>Processing FPS</dt>
          <dd>{diag.processingFps != null ? diag.processingFps.toFixed(1) : '—'}</dd>
          <dt>Hands</dt>
          <dd>{diag.handsDetected}</dd>
          <dt>Objects</dt>
          <dd>{diag.objectsDetected}</dd>
          {diag.lastError ? (
            <>
              <dt>Last error</dt>
              <dd>
                <Badge tone="danger">{diag.lastError}</Badge>
              </dd>
            </>
          ) : null}
        </dl>
        <p className="faint" style={{ marginTop: '0.7rem', fontSize: '0.75rem' }}>
          Inference runs locally in your browser via a Web Worker. Latency varies with
          device CPU/GPU and model download speed.
        </p>
      </div>
    </div>
  );
}
