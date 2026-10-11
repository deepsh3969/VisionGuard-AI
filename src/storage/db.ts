/**
 * Minimal IndexedDB wrapper for the scan-history store.
 * No third-party dependency; supports promise-based CRUD + index queries.
 */

export const DB_NAME = 'visionguard';
export const DB_VERSION = 1;
export const SCANS_STORE = 'scans';

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SCANS_STORE)) {
        const store = db.createObjectStore(SCANS_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('label', 'label', { unique: false });
        store.createIndex('bookmarked', 'bookmarked', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function putRecord<T>(store: string, record: T): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(record);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function getRecord<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'));
    });
  } finally {
    db.close();
  }
}

export async function getAllRecords<T>(store: string): Promise<T[]> {
  const db = await openDatabase();
  try {
    return await new Promise<T[]>((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB getAll failed'));
    });
  } finally {
    db.close();
  }
}

export async function deleteRecord(store: string, key: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function clearStore(store: string): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function estimateUsage(): Promise<{ usage: number; quota: number } | null> {
  if (navigator?.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return null;
}
