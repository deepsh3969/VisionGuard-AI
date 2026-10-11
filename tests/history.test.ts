import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyFilter,
  clearHistory,
  createScanId,
  deleteScan,
  distinctLabels,
  getScan,
  listScans,
  saveScan,
  updateScan,
} from '../src/storage/history';
import {
  buildPrintableReport,
  downloadTextFile,
  toCsvExport,
  toJsonExport,
} from '../src/storage/export';
import { clearStore, openDatabase, SCANS_STORE } from '../src/storage/db';
import type { ScanRecord } from '../src/types';

function scan(overrides: Partial<ScanRecord> = {}): ScanRecord {
  return {
    id: createScanId(),
    timestamp: Date.now(),
    classId: 41,
    label: 'cup',
    confidence: 0.87,
    summary: 'A cup — a small open container for drinking.',
    description: null,
    modelId: 'yolov5s.onnx',
    sourceType: 'camera',
    associationState: 'held',
    snapshotDataUrl: null,
    notes: '',
    bookmarked: false,
    ...overrides,
  };
}

beforeEach(async () => {
  await openDatabase();
  await clearStore(SCANS_STORE);
});

describe('history persistence (IndexedDB)', () => {
  it('saves and retrieves a scan', async () => {
    const record = scan();
    await saveScan(record);
    const loaded = await getScan(record.id);
    expect(loaded?.label).toBe('cup');
    expect(loaded?.confidence).toBeCloseTo(0.87);
  });

  it('lists scans sorted newest first by default', async () => {
    await saveScan(scan({ id: 'a', timestamp: 1000 }));
    await saveScan(scan({ id: 'b', timestamp: 3000 }));
    await saveScan(scan({ id: 'c', timestamp: 2000 }));
    const all = await listScans();
    expect(all.map((s) => s.id)).toEqual(['b', 'c', 'a']);
  });

  it('deletes a single scan', async () => {
    const record = scan({ id: 'del-me' });
    await saveScan(record);
    await deleteScan('del-me');
    expect(await getScan('del-me')).toBeUndefined();
  });

  it('clears all history', async () => {
    await saveScan(scan({ id: 'x' }));
    await saveScan(scan({ id: 'y' }));
    await clearHistory();
    expect(await listScans()).toHaveLength(0);
  });

  it('updates notes and bookmarks', async () => {
    await saveScan(scan({ id: 'n1' }));
    const updated = await updateScan('n1', { notes: 'kitchen mug', bookmarked: true });
    expect(updated?.notes).toBe('kitchen mug');
    expect(updated?.bookmarked).toBe(true);
    const loaded = await getScan('n1');
    expect(loaded?.bookmarked).toBe(true);
  });

  it('returns null when patching a missing scan', async () => {
    expect(await updateScan('missing', { notes: 'x' })).toBeNull();
  });
});

describe('search and filtering', () => {
  const records: ScanRecord[] = [
    scan({
      id: '1',
      label: 'cup',
      timestamp: 1000,
      summary: 'A cup — small drinking container.',
      notes: 'blue mug',
      bookmarked: true,
    }),
    scan({
      id: '2',
      label: 'laptop',
      timestamp: 2000,
      summary: 'A laptop — portable computer.',
      confidence: 0.5,
    }),
    scan({
      id: '3',
      label: 'cup',
      timestamp: 3000,
      summary: 'A cup — small drinking container.',
      confidence: 0.95,
      sourceType: 'upload',
    }),
  ];

  it('filters by search text across label and notes', () => {
    expect(applyFilter(records, { search: 'mug' })).toHaveLength(1);
    expect(applyFilter(records, { search: 'cup' })).toHaveLength(2);
  });

  it('filters by label', () => {
    expect(applyFilter(records, { label: 'laptop' })).toHaveLength(1);
  });

  it('filters by date range inclusively', () => {
    expect(applyFilter(records, { from: 1500, to: 2500 })).toHaveLength(1);
    expect(applyFilter(records, { from: 2000, to: 2000 })).toHaveLength(1);
  });

  it('filters bookmarked only', () => {
    expect(applyFilter(records, { bookmarkedOnly: true })).toHaveLength(1);
  });

  it('sorts by confidence', () => {
    const sorted = applyFilter(records, { sort: 'confidence' });
    expect(sorted[0].confidence).toBeCloseTo(0.95);
  });

  it('sorts oldest first when requested', () => {
    const sorted = applyFilter(records, { sort: 'oldest' });
    expect(sorted[0].id).toBe('1');
  });

  it('lists distinct labels', () => {
    expect(distinctLabels(records)).toEqual(['cup', 'laptop']);
  });
});

describe('data export', () => {
  const records = [
    scan({ id: 'a,1', label: 'cup', notes: 'has "quotes", and, commas' }),
    scan({ id: 'b', label: 'book', confidence: null }),
  ];

  it('exports valid JSON with metadata', () => {
    const json = JSON.parse(toJsonExport(records)) as { app: string; count: number; scans: ScanRecord[] };
    expect(json.app).toBe('VisionGuard AI');
    expect(json.count).toBe(2);
    expect(json.scans[0].id).toBe('a,1');
  });

  it('escapes CSV fields per RFC 4180', () => {
    const csv = toCsvExport(records);
    const lines = csv.split('\r\n');
    expect(lines[0]).toContain('id,timestamp');
    expect(lines[1]).toContain('"a,1"');
    expect(lines[1]).toContain('"has ""quotes"", and, commas"');
    // null confidence renders as an empty CSV field
    expect(lines[2]).toContain('book,,held');
  });

  it('builds a printable report containing the summary and safety note', () => {
    const html = buildPrintableReport(records[0]);
    expect(html).toContain('A cup');
    expect(html).toContain('not a verified identification');
    expect(html).toContain('VisionGuard AI');
  });

  it('downloadTextFile is available in DOM environments', () => {
    expect(typeof downloadTextFile).toBe('function');
  });
});
