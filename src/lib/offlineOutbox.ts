// offlineOutbox.ts — طابور العمليات المعلقة دون اتصال (Offline Outbox Queue)
// يسجل جميع المعاملات المحلية (مبيعات، مدفوعات، تعديلات) عند انقطاع الاتصال بالخادم
// ويقوم بتفريغها تلقائياً عند عودة الاتصال مع ضمان الذرية ومنع التكرار (Idempotency)

import { useState, useEffect, useCallback } from 'react';
import {
  getStoredServerLanUrl,
  getStoredClientToken,
  getStoredClientDeviceId,
  getStoredTerminalRole,
} from './transportGateway';
import { realtimeEventBus } from './realtimeEventBus';

export interface OfflineOutboxItem {
  id: string; // Idempotency Key (UUID)
  entity: string; // اسم الجدول مثل 'sales', 'payments', 'customers'
  operation: 'create' | 'update' | 'delete';
  localId: string;
  payload: Record<string, unknown>;
  timestamp: string; // ISO String
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  attempts: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const OUTBOX_DB_NAME = 'anpos_offline_outbox';
const OUTBOX_DB_VERSION = 1;
const OUTBOX_STORE_NAME = 'outbox';

let dbInstance: IDBDatabase | null = null;
const memoryOutbox = new Map<string, OfflineOutboxItem>();
const OUTBOX_LISTENERS = new Set<() => void>();

let isFlushing = false;
let lastSyncedAt: string | null = null;
let periodicInterval: ReturnType<typeof setInterval> | null = null;

function notifyOutboxListeners() {
  OUTBOX_LISTENERS.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  });
}

/**
 * تهيئة قاعدة بيانات IndexedDB لطابور الـ Outbox
 */
export async function getOutboxDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return null;
  }

  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(OUTBOX_DB_NAME, OUTBOX_DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(OUTBOX_STORE_NAME)) {
          const store = db.createObjectStore(OUTBOX_STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event: any) => {
        dbInstance = event.target.result as IDBDatabase;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('[offlineOutbox] تعذر فتح IndexedDB، استخدام مخزن الذاكرة البديل');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'outbox_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

/**
 * إضافة عملية جديدة إلى طابور المعاملات المعلقة
 */
export async function enqueueOutboxItem(params: {
  entity: string;
  operation: 'create' | 'update' | 'delete';
  localId: string;
  payload: Record<string, unknown>;
  id?: string;
}): Promise<OfflineOutboxItem> {
  const now = new Date().toISOString();
  const item: OfflineOutboxItem = {
    id: params.id || generateUuid(),
    entity: params.entity,
    operation: params.operation,
    localId: params.localId,
    payload: params.payload || {},
    timestamp: now,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  // حفظ في الذاكرة أولاً
  memoryOutbox.set(item.id, item);

  const db = await getOutboxDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(OUTBOX_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OUTBOX_STORE_NAME);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  console.log(`[offlineOutbox] 📥 تم تسجيل عملية معلقة: ${item.entity}:${item.operation} (${item.localId})`);
  notifyOutboxListeners();

  // محاولة تفريغ الطابور تلقائياً إذا كان الجهاز متصلاً بالشبكة
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    setTimeout(() => {
      flushOutbox().catch(() => {});
    }, 100);
  }

  return item;
}

/**
 * الحصول على عدد العمليات المعلقة التي تنتظر المزامنة
 */
export async function getPendingOutboxCount(): Promise<number> {
  const db = await getOutboxDb();
  if (db) {
    return new Promise<number>((resolve) => {
      try {
        const tx = db.transaction(OUTBOX_STORE_NAME, 'readonly');
        const store = tx.objectStore(OUTBOX_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const list: OfflineOutboxItem[] = req.result || [];
          const count = list.filter((it) => it.status === 'pending' || it.status === 'failed' || it.status === 'syncing').length;
          resolve(count);
        };
        req.onerror = () => {
          const memCount = Array.from(memoryOutbox.values()).filter(
            (it) => it.status === 'pending' || it.status === 'failed' || it.status === 'syncing'
          ).length;
          resolve(memCount);
        };
      } catch {
        const memCount = Array.from(memoryOutbox.values()).filter(
          (it) => it.status === 'pending' || it.status === 'failed' || it.status === 'syncing'
        ).length;
        resolve(memCount);
      }
    });
  }

  return Array.from(memoryOutbox.values()).filter(
    (it) => it.status === 'pending' || it.status === 'failed' || it.status === 'syncing'
  ).length;
}

/**
 * جلب قائمة العمليات المعلقة لرفعها دفعة واحدة
 */
export async function getPendingOutboxItems(limit = 100): Promise<OfflineOutboxItem[]> {
  const db = await getOutboxDb();
  let allItems: OfflineOutboxItem[] = [];

  if (db) {
    allItems = await new Promise<OfflineOutboxItem[]>((resolve) => {
      try {
        const tx = db.transaction(OUTBOX_STORE_NAME, 'readonly');
        const store = tx.objectStore(OUTBOX_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(Array.from(memoryOutbox.values()));
      } catch {
        resolve(Array.from(memoryOutbox.values()));
      }
    });
  } else {
    allItems = Array.from(memoryOutbox.values());
  }

  return allItems
    .filter((it) => it.status === 'pending' || it.status === 'failed')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit);
}

/**
 * تحديث حالة عناصر في الـ Outbox
 */
async function updateOutboxItemsStatus(
  updates: Array<{ id: string; status: OfflineOutboxItem['status']; errorMessage?: string; incrementAttempts?: boolean }>
): Promise<void> {
  const now = new Date().toISOString();
  const db = await getOutboxDb();

  for (const upd of updates) {
    // تحديث في الذاكرة
    const memItem = memoryOutbox.get(upd.id);
    if (memItem) {
      memItem.status = upd.status;
      memItem.updatedAt = now;
      if (upd.errorMessage !== undefined) memItem.errorMessage = upd.errorMessage;
      if (upd.incrementAttempts) {
        memItem.attempts = (memItem.attempts || 0) + 1;
        memItem.lastAttemptAt = now;
      }
    }
  }

  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(OUTBOX_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OUTBOX_STORE_NAME);

        for (const upd of updates) {
          const req = store.get(upd.id);
          req.onsuccess = () => {
            const item: OfflineOutboxItem | undefined = req.result;
            if (item) {
              item.status = upd.status;
              item.updatedAt = now;
              if (upd.errorMessage !== undefined) item.errorMessage = upd.errorMessage;
              if (upd.incrementAttempts) {
                item.attempts = (item.attempts || 0) + 1;
                item.lastAttemptAt = now;
              }
              store.put(item);
            }
          };
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  notifyOutboxListeners();
}

/**
 * حذف العمليات المكتملة لتفريغ المساحة
 */
export async function clearCompletedOutboxItems(): Promise<void> {
  // حذف من الذاكرة
  for (const [id, item] of memoryOutbox.entries()) {
    if (item.status === 'completed') {
      memoryOutbox.delete(id);
    }
  }

  const db = await getOutboxDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(OUTBOX_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OUTBOX_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const items: OfflineOutboxItem[] = req.result || [];
          for (const item of items) {
            if (item.status === 'completed') {
              store.delete(item.id);
            }
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  notifyOutboxListeners();
}

/**
 * تفريغ وحذف طابور المعاملات بالكامل (إعادة ضبط)
 */
export async function clearOutbox(): Promise<void> {
  memoryOutbox.clear();
  const db = await getOutboxDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(OUTBOX_STORE_NAME, 'readwrite');
        const store = tx.objectStore(OUTBOX_STORE_NAME);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  notifyOutboxListeners();
}

/**
 * عامل المعالجة التلقائية والتفريغ المباشر (Outbox Dispatcher)
 * يرسل العمليات المجمعة دفعة واحدة عبر POST /api/sync/push
 */
export async function flushOutbox(config?: {
  serverUrl?: string;
  token?: string;
  deviceId?: string;
}): Promise<{ pushed: number; failed: number; total: number }> {
  // منع المعالجة المتزامنة المزدوجة لنفس الدفعة
  if (isFlushing) {
    return { pushed: 0, failed: 0, total: 0 };
  }

  const role = getStoredTerminalRole();
  if (role === 'server') {
    // الخادم المحلي لا يحتاج لتفريغ outbox إلى نفسه
    return { pushed: 0, failed: 0, total: 0 };
  }

  const serverUrl = config?.serverUrl || getStoredServerLanUrl();
  if (!serverUrl) {
    return { pushed: 0, failed: 0, total: 0 };
  }

  const token = config?.token || getStoredClientToken();
  const deviceId = config?.deviceId || getStoredClientDeviceId();

  const pendingItems = await getPendingOutboxItems(50);
  if (pendingItems.length === 0) {
    return { pushed: 0, failed: 0, total: 0 };
  }

  isFlushing = true;
  notifyOutboxListeners();

  try {
    // 1. تعليم العناصر بأنها قيد المعالجة (syncing)
    await updateOutboxItemsStatus(
      pendingItems.map((it) => ({ id: it.id, status: 'syncing' }))
    );

    // 2. تجهيز حمولة العمليات للـ push
    const operations = pendingItems.map((it) => ({
      id: it.id,
      entity: it.entity,
      operation: it.operation,
      localId: it.localId,
      payload: it.payload,
      timestamp: it.timestamp,
    }));

    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
        ...(deviceId ? { 'x-device-id': deviceId } : {}),
      },
      body: JSON.stringify({ operations }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      console.warn(`[offlineOutbox] ❌ فشل تفريغ الدفعة (HTTP ${res.status}): ${errText}`);
      // إعادة العناصر لحالة failed مع زيادة محاولات الإعادة
      await updateOutboxItemsStatus(
        pendingItems.map((it) => ({
          id: it.id,
          status: 'failed',
          errorMessage: `HTTP ${res.status}`,
          incrementAttempts: true,
        }))
      );
      return { pushed: 0, failed: pendingItems.length, total: pendingItems.length };
    }

    const responseData = await res.json();
    const serverResults: Array<{ id: string; success: boolean; error?: string }> =
      responseData?.results || [];

    const resultsMap = new Map<string, { success: boolean; error?: string }>();
    for (const r of serverResults) {
      resultsMap.set(r.id, r);
    }

    let pushedCount = 0;
    let failedCount = 0;
    const itemUpdates: Array<{
      id: string;
      status: OfflineOutboxItem['status'];
      errorMessage?: string;
      incrementAttempts?: boolean;
    }> = [];

    for (const item of pendingItems) {
      const resItem = resultsMap.get(item.id);
      if (resItem?.success) {
        pushedCount++;
        itemUpdates.push({ id: item.id, status: 'completed' });
      } else {
        failedCount++;
        itemUpdates.push({
          id: item.id,
          status: 'failed',
          errorMessage: resItem?.error || 'Unknown server error',
          incrementAttempts: true,
        });
      }
    }

    await updateOutboxItemsStatus(itemUpdates);
    // تنظيف العناصر المكتملة
    await clearCompletedOutboxItems();

    lastSyncedAt = new Date().toISOString();
    console.log(
      `[offlineOutbox] 🚀 تم تفريغ الدفعة بنجاح: ${pushedCount} مكتملة، ${failedCount} فشلت`
    );

    return { pushed: pushedCount, failed: failedCount, total: pendingItems.length };
  } catch (err: any) {
    console.warn('[offlineOutbox] ⚠️ استثناء أثناء تفريغ الطابور:', err?.message || err);
    await updateOutboxItemsStatus(
      pendingItems.map((it) => ({
        id: it.id,
        status: 'failed',
        errorMessage: err?.message || 'Network fetch failure',
        incrementAttempts: true,
      }))
    );
    return { pushed: 0, failed: pendingItems.length, total: pendingItems.length };
  } finally {
    isFlushing = false;
    notifyOutboxListeners();
  }
}

/**
 * الاشتراك في تغييرات طابور المعاملات
 */
export function subscribeToOutbox(callback: () => void): () => void {
  OUTBOX_LISTENERS.add(callback);
  return () => {
    OUTBOX_LISTENERS.delete(callback);
  };
}

/**
 * تهيئة المراقبة التلقائية للشبكة والتفريغ الدوري
 */
export function initOutboxDispatcher(): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. الاستماع لعودة الاتصال في المتصفح
  const handleOnline = () => {
    console.log('[offlineOutbox] 🌐 عادت الشبكة (online event)، جاري تفريغ الطابور...');
    flushOutbox().catch(() => {});
  };
  window.addEventListener('online', handleOnline);

  // 2. الاستماع لأحداث ناقل الأحداث الحية عند تحول الحالة إلى connected
  let unsubscribeBus = () => {};
  try {
    if (realtimeEventBus && typeof realtimeEventBus.onStatusChange === 'function') {
      unsubscribeBus = realtimeEventBus.onStatusChange((st) => {
        if (st?.state === 'connected') {
          console.log('[offlineOutbox] ⚡ تم الاتصال بالخادم (realtimeEventBus connected)، بدء التفريغ...');
          flushOutbox().catch(() => {});
        }
      });
    } else if (realtimeEventBus && typeof (realtimeEventBus as any).on === 'function') {
      unsubscribeBus = (realtimeEventBus as any).on('status', (st: any) => {
        if (st?.state === 'connected') {
          console.log('[offlineOutbox] ⚡ تم الاتصال بالخادم (realtimeEventBus connected)، بدء التفريغ...');
          flushOutbox().catch(() => {});
        }
      });
    }
  } catch (err) {
    console.warn('[offlineOutbox] تعذر ربط مستمع الأحداث الحية:', err);
  }

  // 3. فحص دوري كل 25 ثانية إذا كانت هناك عناصر معلقة
  if (!periodicInterval) {
    periodicInterval = setInterval(async () => {
      const count = await getPendingOutboxCount();
      if (count > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
        flushOutbox().catch(() => {});
      }
    }, 25000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    if (typeof unsubscribeBus === 'function') {
      unsubscribeBus();
    }
    if (periodicInterval) {
      clearInterval(periodicInterval);
      periodicInterval = null;
    }
  };
}

/**
 * خطاف React لمراقبة حالة الـ Outbox وعرضها في الشاشات
 */
export function useOutboxStatus() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(isFlushing);
  const [syncedAt, setSyncedAt] = useState<string | null>(lastSyncedAt);

  const refresh = useCallback(async () => {
    const count = await getPendingOutboxCount();
    setPendingCount(count);
    setSyncing(isFlushing);
    setSyncedAt(lastSyncedAt);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribeToOutbox(() => {
      refresh();
    });
    return unsub;
  }, [refresh]);

  const flushNow = useCallback(async () => {
    const res = await flushOutbox();
    await refresh();
    return res;
  }, [refresh]);

  return {
    pendingCount,
    isSyncing: syncing,
    lastSyncedAt: syncedAt,
    flushNow,
    refresh,
  };
}
