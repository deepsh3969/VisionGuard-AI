import type { Track } from '../types';
import { associationLabel } from '../core/candidate';
import { Badge } from './ui/Badge';

export function DetectionList({
  tracks,
  selectedTrackId,
  onSelect,
}: {
  tracks: Track[];
  selectedTrackId: number | null;
  onSelect: (id: number) => void;
}) {
  if (tracks.length === 0) {
    return (
      <div className="empty-state">
        <p>No objects detected in this frame.</p>
        <p className="faint" style={{ fontSize: '0.8rem' }}>
          Try better lighting or bring the object closer to the camera.
        </p>
      </div>
    );
  }
  return (
    <ul className="detect-list" aria-label="Detected objects">
      {tracks.map((t) => {
        const assoc = t.association?.state ?? 'no-hand';
        const tone = assoc === 'held' ? 'success' : assoc === 'uncertain' ? 'warning' : 'default';
        return (
          <li key={t.id}>
            <button
              type="button"
              className="detect-item"
              aria-pressed={selectedTrackId === t.id}
              onClick={() => onSelect(t.id)}
            >
              <span className="grow">
                <span className="detect-label">{t.label}</span>
                <br />
                <span className="detect-meta">
                  #{t.id} · {(t.confidence * 100).toFixed(1)}% · {associationLabel(assoc)}
                </span>
              </span>
              <Badge tone={tone} title="Hand association">
                {assoc === 'held' ? 'held' : assoc === 'uncertain' ? 'uncertain' : assoc === 'no-hand' ? 'no hand' : 'near'}
              </Badge>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
