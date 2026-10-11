import type { ScanRecord } from '../types';
import {
  clearStore,
  deleteRecord,
  getAllRecords,
  getRecord,
  putRecord,
  SCANS_STORE,
} from './db';

export interface ScanFilter {
  search?: string;
  /** Inclusive date range (epoch ms). */
  from?: number;
  to?: number;
  label?: string;
  bookmarkedOnly?: boolean;
  sort?: 'newest' | 'oldest' | 'confidence';
}

export function createScanId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `scan_${rand}`;
}

export async function saveScan(record: ScanRecord): Promise<void> {
  await putRecord(SCANS_STORE, record);
}

export async function getScan(id: string): Promise<ScanRecord | undefined> {
  return getRecord<ScanRecord>(SCANS_STORE, id);
}

export async function listScans(filter: ScanFilter = {}): Promise<ScanRecord[]> {
  let records = await getAllRecords<ScanRecord>(SCANS_STORE);
  records = applyFilter(records, filter);
  return records;
}

export function applyFilter(records: ScanRecord[], filter: ScanFilter): ScanRecord[] {
  let out = [...records];
  if (filter.search) {
    const q = filter.search.toLowerCase();
    out = out.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q),
    );
  }
  if (filter.from != null) out = out.filter((r) => r.timestamp >= filter.from!);
  if (filter.to != null) out = out.filter((r) => r.timestamp <= filter.to!);
  if (filter.label) out = out.filter((r) => r.label === filter.label);
  if (filter.bookmarkedOnly) out = out.filter((r) => r.bookmarked);
  switch (filter.sort) {
    case 'oldest':
      out.sort((a, b) => a.timestamp - b.timestamp);
      break;
    case 'confidence':
      out.sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1));
      break;
    case 'newest':
    default:
      out.sort((a, b) => b.timestamp - a.timestamp);
  }
  return out;
}

export async function deleteScan(id: string): Promise<void> {
  await deleteRecord(SCANS_STORE, id);
}

export async function clearHistory(): Promise<void> {
  await clearStore(SCANS_STORE);
}

export async function updateScan(
  id: string,
  patch: Partial<Pick<ScanRecord, 'notes' | 'bookmarked'>>,
): Promise<ScanRecord | null> {
  const existing = await getScan(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  await saveScan(next);
  return next;
}

export function distinctLabels(records: ScanRecord[]): string[] {
  return [...new Set(records.map((r) => r.label))].sort();
}
