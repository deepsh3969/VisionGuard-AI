import { useCallback, useEffect, useState } from 'react';
import type { ScannerSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = 'visionguard.settings.v1';

function loadSettings(): ScannerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ScannerSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function persist(settings: ScannerSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or blocked — settings still apply for this session.
  }
}

function applyToDocument(settings: ScannerSettings): void {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.dataset.textScale = settings.textScale;
  root.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false';
  root.style.colorScheme = settings.theme;
}

export function useSettings() {
  const [settings, setSettings] = useState<ScannerSettings>(() => {
    const s = loadSettings();
    return s;
  });

  useEffect(() => {
    applyToDocument(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<ScannerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = { ...DEFAULT_SETTINGS };
    persist(next);
    setSettings(next);
  }, []);

  return { settings, update, reset };
}
