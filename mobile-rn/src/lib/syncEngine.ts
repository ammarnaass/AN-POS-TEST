import { db } from '@/lib/db';
import { session } from '@/lib/apiClient';
import { generateId } from '@shared/utils';
import { AnposSecureStore } from '@/modules/AnposSecureStore';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  recordId: string;
  data: Record<string, unknown>;
  timestamp: string;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
}

export interface SyncState {
  isOnline: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: string | null;
  connectionMode: 'standalone' | 'connected';
}

type SyncListener = (state: SyncState) => void;

class SyncEngine {
  private queue: SyncOperation[] = [];
  private listeners: SyncListener[] = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;
  private isSyncing = false;
  private maxRetries = 3;
  private syncIntervalMs = 30000;
  private lastSyncTime: string | null = null;

  constructor() {
    this.loadQueue();
    this.loadLastSyncTime();
  }

  private async loadLastSyncTime(): Promise<void> {
    try {
      this.lastSyncTime = await AnposSecureStore.get('last_sync_time');
    } catch {}
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  getState(): SyncState {
    return {
      isOnline: this.isOnline,
      isConnected: session.isConnectedSync(),
      isSyncing: this.isSyncing,
      pendingCount: this.queue.filter(op => op.status === 'pending').length,
      failedCount: this.queue.filter(op => op.status === 'failed').length,
      lastSyncTime: this.lastSyncTime,
      connectionMode: session.isConnectedSync() ? 'connected' : 'standalone',
    };
  }

  async enqueue(
    type: SyncOperation['type'],
    table: string,
    recordId: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    const operation: SyncOperation = {
      id: generateId(),
      type, table, recordId, data,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: this.maxRetries,
      status: 'pending',
    };
    this.queue.push(operation);
    this.saveQueue();
    this.notifyListeners();
    if (this.isOnline && session.isConnectedSync()) {
      this.processQueue();
    }
    return operation.id;
  }

  async processQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline || !session.isConnectedSync()) return;
    this.isSyncing = true;
    this.notifyListeners();

    const pendingOps = this.queue.filter(op => op.status === 'pending');
    if (pendingOps.length === 0) {
      this.isSyncing = false;
      this.notifyListeners();
      return;
    }

    try {
      const serverUrl = await session.getServerUrl();
      const headers = session.getHeaders();

      const response = await fetch(`${serverUrl}/api/sync/push`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operations: pendingOps.map(op => ({
            id: op.id, entity: op.table, operation: op.type,
            localId: op.recordId, payload: op.data, timestamp: op.timestamp,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.results) {
          for (const r of result.results) {
            const op = this.queue.find(o => o.id === r.id);
            if (op) {
              op.status = r.success ? 'completed' : 'failed';
              if (!r.success) op.error = r.error;
            }
          }
        }
      } else {
        for (const op of pendingOps) {
          op.retries += 1;
          op.error = `HTTP ${response.status}`;
          if (op.retries >= op.maxRetries) op.status = 'failed';
        }
      }
    } catch (error) {
      for (const op of pendingOps) {
        op.retries += 1;
        op.error = error instanceof Error ? error.message : 'Network error';
        if (op.retries >= op.maxRetries) op.status = 'failed';
      }
    }

    this.queue = this.queue.filter(op => op.status !== 'completed');
    this.saveQueue();
    this.isSyncing = false;
    this.setLastSyncTime();
    this.notifyListeners();
  }

  async pullUpdates(): Promise<number> {
    if (!this.isOnline || !session.isConnectedSync()) return 0;

    try {
      const serverUrl = await session.getServerUrl();
      const headers = session.getHeaders();

      const response = await fetch(`${serverUrl}/api/sync/pull`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastSyncTime: this.lastSyncTime || '1970-01-01T00:00:00.000Z',
        }),
      });

      if (!response.ok) return 0;
      const result = await response.json();
      if (!result.success || !result.changes) return 0;

      let appliedCount = 0;
      for (const [table, changes] of Object.entries(result.changes)) {
        if (!Array.isArray(changes)) continue;
        for (const change of changes as Array<{ id: string; operation: string; data: Record<string, unknown> }>) {
          try {
            if (change.operation === 'delete') {
              await db[table]?.delete(change.id);
            } else {
              const existing = await db[table]?.get(change.id);
              if (existing) {
                await db[table]?.update(change.id, change.data);
              } else {
                await db[table]?.add({ ...change.data, id: change.id });
              }
            }
            appliedCount++;
          } catch {}
        }
      }

      if (appliedCount > 0) {
        this.lastSyncTime = result.lastSyncTime || new Date().toISOString();
        await AnposSecureStore.set('last_sync_time', this.lastSyncTime!);
        this.notifyListeners();
      }
      return appliedCount;
    } catch { return 0; }
  }

  async bulkSync(): Promise<boolean> {
    if (!this.isOnline || !session.isConnectedSync()) return false;

    try {
      this.isSyncing = true;
      this.notifyListeners();

      const serverUrl = await session.getServerUrl();
      const headers = session.getHeaders();

      const response = await fetch(`${serverUrl}/api/sync/bulk`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) return false;
      const result = await response.json();
      if (!result.success || !result.data) return false;

      for (const [table, records] of Object.entries(result.data)) {
        if (!Array.isArray(records)) continue;
        for (const record of records) {
          try {
            const r = record as Record<string, unknown>;
            const id = String(r.id);
            const existing = await db[table]?.get(id);
            if (existing) {
              await db[table]?.update(id, r);
            } else {
              await db[table]?.add(r);
            }
          } catch {}
        }
      }

      this.lastSyncTime = result.timestamp || new Date().toISOString();
      await AnposSecureStore.set('last_sync_time', this.lastSyncTime!);
      this.notifyListeners();
      return true;
    } catch { return false; } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  async retryFailed(): Promise<void> {
    const failedOps = this.queue.filter(op => op.status === 'failed');
    for (const op of failedOps) {
      op.status = 'pending';
      op.retries = 0;
      op.error = undefined;
    }
    this.saveQueue();
    this.notifyListeners();
    if (this.isOnline && session.isConnectedSync()) {
      this.processQueue();
    }
  }

  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners();
  }

  private saveQueue(): void {
    try {
      AnposSecureStore.set('sync_queue', JSON.stringify(this.queue));
    } catch {}
  }

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AnposSecureStore.get('sync_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {}
  }

  private async setLastSyncTime(): Promise<void> {
    this.lastSyncTime = new Date().toISOString();
    await AnposSecureStore.set('last_sync_time', this.lastSyncTime);
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

import { useEffect, useState } from 'react';

export const syncEngine = new SyncEngine();

export function useSyncEngine(): SyncState & {
  processQueue: () => void;
  retryFailed: () => void;
  pullUpdates: () => void;
} {
  const [state, setState] = useState<SyncState>(syncEngine.getState());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newState) => setState(newState));
    return unsubscribe;
  }, []);

  return {
    ...state,
    processQueue: () => syncEngine.processQueue(),
    retryFailed: () => syncEngine.retryFailed(),
    pullUpdates: () => syncEngine.pullUpdates(),
  };
}
