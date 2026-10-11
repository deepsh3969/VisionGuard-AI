import { useCallback, useEffect, useState } from 'react';
import type { ScanRecord } from '../types';
import {
  clearHistory,
  createScanId,
  deleteScan,
  listScans,
  saveScan,
  updateScan,
  type ScanFilter,
} from '../storage/history';
import { estimateUsage } from '../storage/db';

export function useHistory() {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);

  const refresh = useCallback(async (filter?: ScanFilter) => {
    setLoading(true);
    setError(null);
    try {
      const records = await listScans(filter ?? {});
      setScans(records);
      setUsage(await estimateUsage());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (record: Omit<ScanRecord, 'id'>): Promise<ScanRecord> => {
      const full: ScanRecord = { ...record, id: createScanId() };
      await saveScan(full);
      await refresh();
      return full;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteScan(id);
      await refresh();
    },
    [refresh],
  );

  const clear = useCallback(async () => {
    await clearHistory();
    await refresh();
  }, [refresh]);

  const patch = useCallback(
    async (id: string, patchData: Partial<Pick<ScanRecord, 'notes' | 'bookmarked'>>) => {
      await updateScan(id, patchData);
      await refresh();
    },
    [refresh],
  );

  return { scans, loading, error, usage, refresh, add, remove, clear, patch };
}
