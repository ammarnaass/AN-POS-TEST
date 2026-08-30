import { AppState, type AppStateStatus } from 'react-native';
import { db, ensureInit } from '@/lib/db';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';
import { session, checkServerHealth } from '@/lib/apiClient';
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

export interface FullSyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  failed: number;
  error?: string;
}

type SyncListener = (state: SyncState) => void;

// ترتيب الجداول الحساسة لضمان تكامل العلاقات عند السحب (34 جدولاً)
const TABLE_PULL_ORDER = [
  'settings',
  'roles',
  'users',
  'categories',
  'warehouses',
  'products',
  'product_barcodes',
  'promotions',
  'packs',
  'customers',
  'suppliers',
  'supplier_entries',
  'cash_sessions',
  'sales',
  'sale_items',
  'suspended_orders',
  'payments',
  'purchases',
  'purchase_items',
  'expenses',
  'capital_entries',
  'stock_movements',
  'stock_movements_v2',
  'stock_movement_lines',
  'inventory_counts',
  'inventory_count_lines',
  'print_templates',
  'template_assignments',
  'printers',
  'printer_template_mappings',
  'print_history',
  'barcode_prints',
  'user_activities',
  'audit_logs',
];

class SyncEngine {
  private listeners: SyncListener[] = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private isOnline = true;
  private isSyncing = false;
  private maxRetries = 5;
  private syncIntervalMs = 25000;
  private lastSyncTime: string | null = null;
  private cachedPendingCount = 0;
  private cachedFailedCount = 0;
  private retryBackoffMs = 5000;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private initialized = false;

  constructor() {
    this.initEngine();
  }

  private async initEngine(): Promise<void> {
    try {
      await ensureInit();
      await this.migrateLegacyQueue();
      await this.loadLastSyncTime();
      await this.refreshQueueCounts();
      this.startPeriodicSync();
      this.startHealthCheck();
      this.listenToAppState();
      this.initialized = true;
      this.notifyListeners();
    } catch (err) {
      console.warn('[SyncEngine] Initialization error:', err);
    }
  }

  /**
   * ترحيل أي عناصر قديمة مخزنة في SecureStore إلى جدول SQLite الدائم
   */
  private async migrateLegacyQueue(): Promise<void> {
    try {
      const stored = await AnposSecureStore.get('sync_queue');
      if (stored) {
        const legacyItems: any[] = JSON.parse(stored);
        if (Array.isArray(legacyItems) && legacyItems.length > 0) {
          const sqlite = unifiedDB.getSqliteDriver();
          for (const item of legacyItems) {
            const id = item.id || generateId();
            const type = item.type || 'create';
            const table = item.table || '';
            const recordId = item.recordId || item.localId || '';
            const payload = JSON.stringify(item.data || item.payload || {});
            const createdAt = item.timestamp || new Date().toISOString();
            const retries = Number(item.retries || 0);
            const status = item.status === 'failed' ? 'failed' : 'pending';
            const error = item.error || null;

            await sqlite.execute(
              `INSERT OR REPLACE INTO sync_queue 
               (id, type, table_name, record_id, payload, created_at, retries, max_retries, status, error_message)
               VALUES (?, ?, ?, ?, ?, ?, ?, 5, ?, ?)`,
              [id, type, table, recordId, payload, createdAt, retries, status, error]
            );
          }
          console.log(`[SyncEngine] 📦 تم ترحيل ${legacyItems.length} عنصر من SecureStore إلى جدول SQLite.`);
        }
        await AnposSecureStore.remove('sync_queue');
      }
    } catch (err) {
      console.warn('[SyncEngine] Legacy queue migration failed:', err);
    }
  }

  private async loadLastSyncTime(): Promise<void> {
    try {
      this.lastSyncTime = await AnposSecureStore.get('last_sync_time');
    } catch {
      /* ignore */
    }
  }

  /**
   * تحديث أعداد العمليات المعلقة والفاشلة مباشرة من جدول SQLite
   */
  async refreshQueueCounts(): Promise<void> {
    try {
      await ensureInit();
      const sqlite = unifiedDB.getSqliteDriver();
      const pendingRes = await sqlite.execute(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending' OR status = 'processing'`
      );
      const failedRes = await sqlite.execute(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'`
      );

      this.cachedPendingCount = Number((pendingRes as any)?.[0]?.count || 0);
      this.cachedFailedCount = Number((failedRes as any)?.[0]?.count || 0);
    } catch {
      /* fallback on error */
    }
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(): SyncState {
    return {
      isOnline: this.isOnline,
      isConnected: session.isConnectedSync(),
      isSyncing: this.isSyncing,
      pendingCount: this.cachedPendingCount,
      failedCount: this.cachedFailedCount,
      lastSyncTime: this.lastSyncTime,
      connectionMode: session.isConnectedSync() ? 'connected' : 'standalone',
    };
  }

  /**
   * مراقبة حالة فتح وتصغير التطبيق (Foreground / Background)
   */
  private listenToAppState(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        console.log('[SyncEngine] 📱 عاد التطبيق إلى الواجهة الأمامية — فحص الاتصال والمزامنة...');
        await this.checkConnectivityAndSync();
      }
    });
  }

  /**
   * تشغيل فحص دوري لحالة الخادم والاتصال
   */
  private startHealthCheck(): void {
    if (this.healthInterval) clearInterval(this.healthInterval);
    this.healthInterval = setInterval(async () => {
      if (!session.isConnectedSync()) return;
      await this.checkConnectivityAndSync();
    }, 15000);
  }

  private async checkConnectivityAndSync(): Promise<void> {
    if (!session.isConnectedSync()) return;
    const url = await session.getServerUrl();
    if (!url) return;

    const health = await checkServerHealth(url);
    const prevOnline = this.isOnline;
    this.isOnline = health.ok;

    // إذا استعاد التطبيق الاتصال بالإنترنت وكان هناك عمليات معلقة، نفذ تفريغ فوري للطابور
    if (!prevOnline && this.isOnline) {
      console.log('[SyncEngine] 🌐 تم استعادة الاتصال بالخادم — بدء تفريغ الطابور وسحب التحديثات...');
      this.retryBackoffMs = 5000;
      this.processQueue().then(() => this.pullUpdates());
    }

    this.notifyListeners();
  }

  /**
   * بدء المزامنة الدورية الخلفية
   */
  startPeriodicSync(): void {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      if (this.isOnline && session.isConnectedSync() && !this.isSyncing) {
        this.pullUpdates().catch(() => {});
      }
    }, this.syncIntervalMs);
  }

  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * إدراج عملية جديدة في جدول SQLite الدائم
   */
  async enqueue(
    type: SyncOperation['type'],
    table: string,
    recordId: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    await ensureInit();
    const id = generateId();
    const nowIso = new Date().toISOString();
    const payload = JSON.stringify(data);

    try {
      const sqlite = unifiedDB.getSqliteDriver();
      await sqlite.execute(
        `INSERT INTO sync_queue (id, type, table_name, record_id, payload, created_at, retries, max_retries, status)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'pending')`,
        [id, type, table, recordId, payload, nowIso, this.maxRetries]
      );

      this.cachedPendingCount += 1;
      this.notifyListeners();

      // إذا كان الاتصال متاحاً، ادفع العملية فوراً
      if (this.isOnline && session.isConnectedSync()) {
        this.processQueue().catch(() => {});
      }

      return id;
    } catch (err) {
      console.error('[SyncEngine] Failed to enqueue operation to SQLite:', err);
      return id;
    }
  }

  /**
   * جلب العمليات المعلقة من جدول SQLite
   */
  async getPendingOperations(limit = 50): Promise<SyncOperation[]> {
    await ensureInit();
    try {
      const sqlite = unifiedDB.getSqliteDriver();
      const rows: any = await sqlite.execute(
        `SELECT * FROM sync_queue 
         WHERE status = 'pending' 
         ORDER BY created_at ASC 
         LIMIT ?`,
        [limit]
      );

      if (!Array.isArray(rows)) return [];

      return rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        table: row.table_name,
        recordId: row.record_id,
        data: typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {}),
        timestamp: row.created_at,
        retries: Number(row.retries || 0),
        maxRetries: Number(row.max_retries || 5),
        status: row.status,
        error: row.error_message,
      }));
    } catch (err) {
      console.warn('[SyncEngine] Failed to fetch pending operations:', err);
      return [];
    }
  }

  /**
   * معالجة ودفع العمليات المعلقة في الطابور إلى سطح المكتب
   */
  async processQueue(): Promise<number> {
    if (this.isSyncing || !this.isOnline || !session.isConnectedSync()) return 0;
    this.isSyncing = true;
    this.notifyListeners();

    let processedCount = 0;

    try {
      await ensureInit();
      const sqlite = unifiedDB.getSqliteDriver();
      const pendingOps = await this.getPendingOperations(50);

      if (pendingOps.length === 0) {
        await this.refreshQueueCounts();
        this.isSyncing = false;
        this.notifyListeners();
        return 0;
      }

      // وسم العمليات الجاري إرسالها بحالة processing
      const opIds = pendingOps.map((op) => op.id);
      const placeholders = opIds.map(() => '?').join(',');
      await sqlite.execute(
        `UPDATE sync_queue SET status = 'processing' WHERE id IN (${placeholders})`,
        opIds
      );

      const serverUrl = await session.getServerUrl();
      const headers = session.getHeaders();

      const response = await fetch(`${serverUrl}/api/sync/push`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operations: pendingOps.map((op) => ({
            id: op.id,
            entity: op.table,
            operation: op.type,
            localId: op.recordId,
            payload: op.data,
            timestamp: op.timestamp,
          })),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const resultsArray = Array.isArray(result?.results) ? result.results : [];

        for (const op of pendingOps) {
          const resItem = resultsArray.find((r: any) => r.id === op.id);
          if (resItem && resItem.success) {
            // حذف العملية المكتملة بنجاح من SQLite لتوفير المساحة
            await sqlite.execute(`DELETE FROM sync_queue WHERE id = ?`, [op.id]);
            processedCount++;
          } else {
            const nextRetries = op.retries + 1;
            const errMsg = resItem?.error || 'Unknown push rejection';
            const nextStatus = nextRetries >= op.maxRetries ? 'failed' : 'pending';

            await sqlite.execute(
              `UPDATE sync_queue 
               SET retries = ?, error_message = ?, status = ? 
               WHERE id = ?`,
              [nextRetries, errMsg, nextStatus, op.id]
            );
          }
        }
        // إعادة ضبط معامل التراجع الأسي عند النجاح
        this.retryBackoffMs = 5000;
      } else if (response.status === 404 || response.status === 405) {
        // خطأ 404 على /api/sync/push — استخدام سائق REST المباشر كبديل
        for (const op of pendingOps) {
          try {
            const restDriver = (unifiedDB as any).restDriver;
            if (restDriver) {
              if (op.type === 'create') {
                await restDriver.create(op.table, op.data);
              } else if (op.type === 'update') {
                await restDriver.update(op.table, op.recordId, op.data);
              } else if (op.type === 'delete') {
                await restDriver.remove(op.table, op.recordId);
              }
              await sqlite.execute(`DELETE FROM sync_queue WHERE id = ?`, [op.id]);
              processedCount++;
            }
          } catch (restErr: any) {
            const nextRetries = op.retries + 1;
            const errMsg = restErr?.message || 'REST push fallback error';
            const nextStatus = nextRetries >= op.maxRetries ? 'failed' : 'pending';
            await sqlite.execute(
              `UPDATE sync_queue 
               SET retries = ?, error_message = ?, status = ? 
               WHERE id = ?`,
              [nextRetries, errMsg, nextStatus, op.id]
            );
          }
        }
        this.retryBackoffMs = 5000;
      } else {
        // خطأ آخر من الخادم
        const errMsg = `HTTP ${response.status}`;
        for (const op of pendingOps) {
          const nextRetries = op.retries + 1;
          const nextStatus = nextRetries >= op.maxRetries ? 'failed' : 'pending';
          await sqlite.execute(
            `UPDATE sync_queue 
             SET retries = ?, error_message = ?, status = ? 
             WHERE id = ?`,
            [nextRetries, errMsg, nextStatus, op.id]
          );
        }
        this.scheduleBackoffRetry();
      }
    } catch (error) {
      this.isOnline = false;
      const errMsg = error instanceof Error ? error.message : 'Network error';
      try {
        const sqlite = unifiedDB.getSqliteDriver();
        await sqlite.execute(
          `UPDATE sync_queue 
           SET retries = retries + 1, 
               error_message = ?, 
               status = CASE WHEN retries + 1 >= max_retries THEN 'failed' ELSE 'pending' END 
           WHERE status = 'processing'`,
          [errMsg]
        );
      } catch {
        /* ignore */
      }
      this.scheduleBackoffRetry();
    } finally {
      await this.refreshQueueCounts();
      this.isSyncing = false;
      this.notifyListeners();
    }

    return processedCount;
  }

  /**
   * جدولة إعادة المحاولة بنظام التراجع الأسي (Exponential Backoff)
   */
  private scheduleBackoffRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (this.isOnline && session.isConnectedSync() && !this.isSyncing) {
        this.processQueue().catch(() => {});
      }
    }, this.retryBackoffMs);

    // مضاعفة وقت الانتظار للمحاولة التالية بحد أقصى دقيقة واحدة
    this.retryBackoffMs = Math.min(this.retryBackoffMs * 2, 60000);
  }

  /**
   * سحب التعديلات الحديثة من خادم سطح المكتب وتطبيقها محلياً
   */
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
          tables: TABLE_PULL_ORDER,
        }),
      });

      if (!response.ok) return 0;
      const result = await response.json();
      if (!result.success || !result.changes) return 0;

      let appliedCount = 0;

      // تطبيق التغييرات بالترتيب المنطقي للجداول مباشرة في SQLite المحلي
      const sqlite = unifiedDB.getSqliteDriver();

      for (const table of TABLE_PULL_ORDER) {
        const changes = result.changes[table];
        if (!Array.isArray(changes) || changes.length === 0) continue;

        for (const change of changes as Array<{ id: string; operation: string; data: Record<string, unknown> }>) {
          try {
            if (change.operation === 'delete') {
              await sqlite.remove(table, change.id);
            } else {
              await sqlite.create(table, { ...change.data, id: change.id });
            }
            appliedCount++;
          } catch {
            /* ignore individual record errors to preserve continuity */
          }
        }
      }

      if (result.lastSyncTime) {
        this.lastSyncTime = result.lastSyncTime;
        await AnposSecureStore.set('last_sync_time', this.lastSyncTime!);
        this.notifyListeners();
      }

      // سحب آمن للمستخدمين والأدوار (Read-Only) دون تسريب كلمات المرور
      this.pullUsersReadOnly().catch(() => {});

      return appliedCount;
    } catch {
      return 0;
    }
  }

  /**
   * سحب المستخدمين والأدوار بصيغة آمنة للقراءة فقط دون كلمات المرور
   */
  async pullUsersReadOnly(): Promise<void> {
    if (!this.isOnline || !session.isConnectedSync()) return;
    try {
      const serverUrl = await session.getServerUrl();
      const headers = session.getHeaders();
      const response = await fetch(`${serverUrl}/api/sync/users-readonly`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && Array.isArray(data.users)) {
        const sqlite = unifiedDB.getSqliteDriver();
        for (const u of data.users) {
          try {
            await sqlite.create('users', u);
          } catch {}
        }
      }
      if (data.success && Array.isArray(data.roles)) {
        const sqlite = unifiedDB.getSqliteDriver();
        for (const r of data.roles) {
          try {
            await sqlite.create('roles', r);
          } catch {}
        }
      }
    } catch {
      /* ignore */
    }
  }

  /**
   * تنفيذ دورة مزامنة كاملة (Push ثم Pull) مع تقرير إحصائي
   */
  async fullSync(): Promise<FullSyncResult> {
    if (!session.isConnectedSync()) {
      return { success: false, pushed: 0, pulled: 0, failed: 0, error: 'غير متصل بسطح المكتب' };
    }

    try {
      this.isSyncing = true;
      this.notifyListeners();

      const pushed = await this.processQueue();
      const pulled = await this.pullUpdates();
      await this.refreshQueueCounts();

      return {
        success: true,
        pushed,
        pulled,
        failed: this.cachedFailedCount,
      };
    } catch (err) {
      await this.refreshQueueCounts();
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        failed: this.cachedFailedCount,
        error: err instanceof Error ? err.message : 'فشل التزامن الكامل',
      };
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * سحب نسخة كاملة لتهيئة قاعدة البيانات في أول تشغيل
   */
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
        body: JSON.stringify({ tables: TABLE_PULL_ORDER }),
      });

      if (!response.ok) return false;
      const result = await response.json();
      if (!result.success || !result.data) return false;

      const sqlite = unifiedDB.getSqliteDriver();

      for (const table of TABLE_PULL_ORDER) {
        const records = result.data[table];
        if (!Array.isArray(records) || records.length === 0) continue;

        for (const record of records) {
          try {
            const r = record as Record<string, unknown>;
            await sqlite.create(table, r);
          } catch {
            /* ignore individual item errors */
          }
        }
      }

      this.lastSyncTime = result.timestamp || new Date().toISOString();
      await AnposSecureStore.set('last_sync_time', this.lastSyncTime!);
      this.notifyListeners();
      return true;
    } catch {
      return false;
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * إعادة تفعيل كافة العمليات الفاشلة للمحاولة مجدداً
   */
  async retryFailed(): Promise<void> {
    try {
      await ensureInit();
      const sqlite = unifiedDB.getSqliteDriver();
      await sqlite.execute(
        `UPDATE sync_queue 
         SET status = 'pending', retries = 0, error_message = NULL 
         WHERE status = 'failed'`
      );
      this.retryBackoffMs = 5000;
      await this.refreshQueueCounts();
      this.notifyListeners();

      if (this.isOnline && session.isConnectedSync()) {
        this.processQueue().catch(() => {});
      }
    } catch (err) {
      console.warn('[SyncEngine] Failed to retry failed operations:', err);
    }
  }

  /**
   * تفريغ وحذف جميع عناصر طابور المزامنة
   */
  async clearQueue(): Promise<void> {
    try {
      await ensureInit();
      const sqlite = unifiedDB.getSqliteDriver();
      await sqlite.execute(`DELETE FROM sync_queue`);
      this.cachedPendingCount = 0;
      this.cachedFailedCount = 0;
      this.notifyListeners();
    } catch (err) {
      console.warn('[SyncEngine] Failed to clear sync queue:', err);
    }
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

import { useEffect, useState } from 'react';

export const syncEngine = new SyncEngine();

export function useSyncEngine(): SyncState & {
  processQueue: () => Promise<number>;
  retryFailed: () => Promise<void>;
  pullUpdates: () => Promise<number>;
  fullSync: () => Promise<FullSyncResult>;
  bulkSync: () => Promise<boolean>;
  clearQueue: () => Promise<void>;
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
    fullSync: () => syncEngine.fullSync(),
    bulkSync: () => syncEngine.bulkSync(),
    clearQueue: () => syncEngine.clearQueue(),
  };
}
