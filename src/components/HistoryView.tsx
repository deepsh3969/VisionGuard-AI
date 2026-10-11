import { useMemo, useState } from 'react';
import type { ScanRecord } from '../types';
import { applyFilter, type ScanFilter } from '../storage/history';
import {
  downloadTextFile,
  openPrintableReport,
  toCsvExport,
  toJsonExport,
} from '../storage/export';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function HistoryView({
  scans,
  loading,
  error,
  usage,
  onRefresh,
  onDelete,
  onClear,
  onPatch,
}: {
  scans: ScanRecord[];
  loading: boolean;
  error: string | null;
  usage: { usage: number; quota: number } | null;
  onRefresh: (filter?: ScanFilter) => void;
  onDelete: (id: string) => Promise<void>;
  onClear: () => Promise<void>;
  onPatch: (id: string, patch: Partial<Pick<ScanRecord, 'notes' | 'bookmarked'>>) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [label, setLabel] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'confidence'>('newest');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  const filter: ScanFilter = useMemo(
    () => ({
      search: search || undefined,
      label: label || undefined,
      sort,
      from: from ? new Date(from).getTime() : undefined,
      to: to ? new Date(to).setHours(23, 59, 59, 999) : undefined,
      bookmarkedOnly: bookmarkedOnly || undefined,
    }),
    [search, label, sort, from, to, bookmarkedOnly],
  );

  const visible = useMemo(() => applyFilter(scans, filter), [scans, filter]);
  const labels = useMemo(() => [...new Set(scans.map((s) => s.label))].sort(), [scans]);

  return (
    <div className="stack">
      <div className="panel">
        <div className="panel-header">
          <h2>Scan history</h2>
          <div className="row">
            <Button
              size="small"
              onClick={() => downloadTextFile(`visionguard-scans-${Date.now()}.json`, toJsonExport(visible), 'application/json')}
              disabled={visible.length === 0}
            >
              Export JSON
            </Button>
            <Button
              size="small"
              onClick={() => downloadTextFile(`visionguard-scans-${Date.now()}.csv`, toCsvExport(visible), 'text/csv')}
              disabled={visible.length === 0}
            >
              Export CSV
            </Button>
            <Button
              size="small"
              variant="danger"
              onClick={() => {
                if (confirm('Delete ALL scan history? This cannot be undone.')) void onClear();
              }}
              disabled={scans.length === 0}
            >
              Clear all
            </Button>
          </div>
        </div>
        <div className="panel-body stack">
          <div className="row">
            <input
              type="search"
              placeholder="Search label, summary or notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search scans"
              style={{ flex: 2, minWidth: 200 }}
            />
            <select
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              aria-label="Filter by category"
              style={{ flex: 1, minWidth: 140 }}
            >
              <option value="">All categories</option>
              {labels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              aria-label="Sort order"
              style={{ flex: 1, minWidth: 130 }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="confidence">Confidence</option>
            </select>
          </div>
          <div className="row">
            <label className="faint" style={{ fontSize: '0.8rem' }}>
              From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="faint" style={{ fontSize: '0.8rem' }}>
              To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={bookmarkedOnly}
                onChange={(e) => setBookmarkedOnly(e.target.checked)}
              />
              Bookmarked only
            </label>
            <Button size="small" variant="ghost" onClick={() => onRefresh(filter)}>
              Refresh
            </Button>
            <span className="faint" style={{ fontSize: '0.75rem' }}>
              {visible.length} of {scans.length} scans
              {usage ? ` · storage ${formatBytes(usage.usage)} / ${formatBytes(usage.quota)}` : ''}
            </span>
          </div>
          {error ? <div className="error-banner" role="alert">{error}</div> : null}
          {loading ? (
            <p className="muted">
              <span className="spinner" aria-hidden="true" /> Loading…
            </p>
          ) : null}
        </div>
      </div>

      {visible.length === 0 && !loading ? (
        <div className="panel">
          <div className="empty-state">
            <p>No saved scans yet.</p>
            <p className="faint" style={{ fontSize: '0.85rem' }}>
              Identify an object in the scanner and press “Save to history”.
            </p>
          </div>
        </div>
      ) : null}

      <ul className="history-list" aria-label="Saved scans">
        {visible.map((scan) => (
          <li key={scan.id} className="history-item">
            {scan.snapshotDataUrl ? (
              <img className="history-thumb" src={scan.snapshotDataUrl} alt={`Snapshot: ${scan.label}`} />
            ) : (
              <div className="history-thumb empty">no snapshot</div>
            )}
            <div className="stack" style={{ gap: '0.45rem' }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <strong>{scan.label}</strong>
                <span className="row">
                  {scan.bookmarked ? <Badge tone="accent">bookmarked</Badge> : null}
                  {scan.confidence != null ? (
                    <Badge mono>{(scan.confidence * 100).toFixed(1)}%</Badge>
                  ) : null}
                  <Badge tone={scan.sourceType === 'camera' ? 'default' : 'warning'}>{scan.sourceType}</Badge>
                </span>
              </div>
              <p className="faint mono" style={{ fontSize: '0.72rem' }}>
                {new Date(scan.timestamp).toLocaleString()} · {scan.modelId} · {scan.associationState}
              </p>
              <p style={{ fontSize: '0.88rem' }}>{scan.summary}</p>
              <div className="row">
                <input
                  type="text"
                  placeholder="Add a note…"
                  defaultValue={scan.notes}
                  aria-label={`Notes for ${scan.label}`}
                  onBlur={(e) => {
                    if (e.target.value !== scan.notes) void onPatch(scan.id, { notes: e.target.value });
                  }}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <Button
                  size="small"
                  onClick={() => void onPatch(scan.id, { bookmarked: !scan.bookmarked })}
                  aria-pressed={scan.bookmarked}
                >
                  {scan.bookmarked ? 'Unbookmark' : 'Bookmark'}
                </Button>
                <Button size="small" onClick={() => openPrintableReport(scan)}>
                  Print report
                </Button>
                <Button
                  size="small"
                  variant="danger"
                  onClick={() => {
                    if (confirm('Delete this scan?')) void onDelete(scan.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
