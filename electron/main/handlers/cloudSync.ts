// cloudSync.ts — محرك المزامنة السحابية المزدوج (Cloud Sync Engine & CDC)
// يوفر المزامنة المركزية بين حاسوب الخادم الرئيسي (Master Node) والسحابة
// مع دعم التتبع المتزايد للتغييرات (Change Data Capture) والصمود الصامت أمام انقطاع الإنترنت

import { queryOne, queryAll, execute, transaction, getTableColumns, notifyTableChange } from './db-utils';
import { broadcastRealtimeEvent } from '../server';

export interface CloudSyncStatus {
  cloudEnabled: boolean;
  terminalRole: 'server' | 'client';
  isMasterNode: boolean;
  apiUrl: string;
  apiKeyMasked: string;
  webhookUrl: string;
  syncAuto: boolean;
  syncInterval: number;
  syncType: 'incremental' | 'full';
  state: 'idle' | 'syncing' | 'offline' | 'error' | 'disabled';
  lastSyncAt: string | null;
  lastPushAt: string | null;
  lastPullAt: string | null;
  pushedCount: number;
  pulledCount: number;
  lastError: string | null;
  syncFailCount: number;
}

// الجداول المخصصة للرفع السحابي (Outbound Egress Tables)
const CLOUD_PUSH_TABLES = [
  'sales',
  'sale_items',
  'payments',
  'customers',
  'expenses',
  'stock_movements_v2',
  'cash_sessions',
  'user_activities',
];

// الجداول المخصصة للاستقبال من السحابة (Inbound Ingress Tables)
const CLOUD_PULL_TABLES = [
  'products',
  'categories',
  'promotions',
  'packs',
  'settings',
];

let isSyncInProgress = false;
let cloudSyncTimer: NodeJS.Timeout | null = null;

/**
 * جلب حالة وإحصائيات المزامنة السحابية الحالية
 */
export function getCloudSyncStatus(): CloudSyncStatus {
  const netRow = queryOne('SELECT * FROM network_settings WHERE id = \'default\' LIMIT 1') || {};
  const settingsRow = queryOne('SELECT terminal_role, shop_name FROM settings WHERE id = \'default\' LIMIT 1') || {};
  const stateRow = queryOne('SELECT * FROM cloud_sync_state WHERE id = \'default\' LIMIT 1') || {};

  const terminalRole = ((settingsRow.terminal_role as string) || 'server') as 'server' | 'client';
  const isMasterNode = terminalRole === 'server';
  const cloudEnabled = Boolean(netRow.cloud_enabled);
  const apiUrl = String(netRow.api_url || '').trim();
  const apiKey = String(netRow.api_key || '').trim();

  let state: CloudSyncStatus['state'] = 'idle';
  if (!isMasterNode) {
    state = 'disabled';
  } else if (!cloudEnabled || !apiUrl) {
    state = 'disabled';
  } else if (isSyncInProgress) {
    state = 'syncing';
  } else if (stateRow.status === 'offline') {
    state = 'offline';
  } else if (stateRow.status === 'error') {
    state = 'error';
  } else {
    state = 'idle';
  }

  const apiKeyMasked = apiKey.length > 8
    ? `${apiKey.substring(0, 4)}••••${apiKey.substring(apiKey.length - 4)}`
    : (apiKey ? '••••••••' : '');

  return {
    cloudEnabled,
    terminalRole,
    isMasterNode,
    apiUrl,
    apiKeyMasked,
    webhookUrl: String(netRow.webhook_url || ''),
    syncAuto: Boolean(netRow.sync_auto ?? 1),
    syncInterval: Math.max(1, Number(netRow.sync_interval) || 5),
    syncType: (netRow.sync_type as any) === 'full' ? 'full' : 'incremental',
    state,
    lastSyncAt: (stateRow.last_sync_at as string) || null,
    lastPushAt: (stateRow.last_push_at as string) || null,
    lastPullAt: (stateRow.last_pull_at as string) || null,
    pushedCount: Number(stateRow.pushed_count) || 0,
    pulledCount: Number(stateRow.pulled_count) || 0,
    lastError: (stateRow.error_message as string) || null,
    syncFailCount: Number(netRow.sync_fail_count) || 0,
  };
}

/**
 * فحص ما إذا كان الخطأ ناتجاً عن انقطاع اتصال الإنترنت
 */
function isInternetFailure(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err).toLowerCase();
  return (
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('ehostunreach') ||
    msg.includes('enetunreach') ||
    msg.includes('etimedout') ||
    msg.includes('failed to fetch') ||
    msg.includes('aborterror') ||
    msg.includes('timeout') ||
    msg.includes('network error')
  );
}

/**
 * تحديث جدول حالة المزامنة السحابية في قاعدة البيانات
 */
function updateCloudState(fields: {
  status?: string;
  errorMessage?: string | null;
  lastSyncAt?: string;
  lastPushAt?: string;
  lastPullAt?: string;
  incrementPushed?: number;
  incrementPulled?: number;
}) {
  const sets: string[] = ["updated_at = datetime('now')"];
  const params: unknown[] = [];

  if (fields.status !== undefined) {
    sets.push('status = ?');
    params.push(fields.status);
  }
  if (fields.errorMessage !== undefined) {
    sets.push('error_message = ?');
    params.push(fields.errorMessage);
  }
  if (fields.lastSyncAt !== undefined) {
    sets.push('last_sync_at = ?');
    params.push(fields.lastSyncAt);
  }
  if (fields.lastPushAt !== undefined) {
    sets.push('last_push_at = ?');
    params.push(fields.lastPushAt);
  }
  if (fields.lastPullAt !== undefined) {
    sets.push('last_pull_at = ?');
    params.push(fields.lastPullAt);
  }
  if (fields.incrementPushed && fields.incrementPushed > 0) {
    sets.push('pushed_count = pushed_count + ?');
    params.push(fields.incrementPushed);
  }
  if (fields.incrementPulled && fields.incrementPulled > 0) {
    sets.push('pulled_count = pulled_count + ?');
    params.push(fields.incrementPulled);
  }

  try {
    execute(`UPDATE cloud_sync_state SET ${sets.join(', ')} WHERE id = 'default'`, params);
  } catch {
    /* non-blocking */
  }
}

/**
 * تنفيذ دورة مزامنة سحابية كاملة أو تدريجية (CDC Push + Pull)
 */
export async function executeCloudSync(options?: {
  forceFull?: boolean;
}): Promise<{
  success: boolean;
  pushed: number;
  pulled: number;
  error?: string;
  state: CloudSyncStatus['state'];
}> {
  if (isSyncInProgress) {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      error: 'عملية مزامنة سحابية أخرى قيد التنفيذ حالياً',
      state: 'syncing',
    };
  }

  const netRow = queryOne('SELECT * FROM network_settings WHERE id = \'default\' LIMIT 1') || {};
  const settingsRow = queryOne('SELECT id, shop_name, terminal_role FROM settings WHERE id = \'default\' LIMIT 1') || {};
  const terminalRole = (settingsRow.terminal_role as string) || 'server';

  // 1. قاعدة حصرية المزامنة عبر الخادم (Single Egress Master Node Rule)
  if (terminalRole === 'client') {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      error: 'المزامنة السحابية تتم حصرياً عبر حاسوب الخادم الرئيسي (Master Node)',
      state: 'disabled',
    };
  }

  const cloudEnabled = Boolean(netRow.cloud_enabled);
  const apiUrl = String(netRow.api_url || '').trim().replace(/\/+$/, '');
  const apiKey = String(netRow.api_key || '').trim();

  if (!cloudEnabled || !apiUrl) {
    return {
      success: false,
      pushed: 0,
      pulled: 0,
      error: 'الربط السحابي غير مفعل أو عنوان API غير محدد في إعدادات الشبكة',
      state: 'disabled',
    };
  }

  isSyncInProgress = true;
  updateCloudState({ status: 'syncing', errorMessage: null });

  const stateRow = queryOne('SELECT * FROM cloud_sync_state WHERE id = \'default\' LIMIT 1') || {};
  const isFull = Boolean(options?.forceFull || (netRow.sync_type === 'full'));
  const lastSyncAt = isFull ? '1970-01-01T00:00:00.000Z' : ((stateRow.last_sync_at as string) || '1970-01-01T00:00:00.000Z');
  const nowIso = new Date().toISOString();

  let totalPushed = 0;
  let totalPulled = 0;

  try {
    console.log(`[cloudSync] ☁️ بدء المزامنة السحابية (${isFull ? 'كاملة' : 'تدريجية'}) منذ ${lastSyncAt}...`);

    // =========================================================================
    // الخطوة 1: استخراج التغييرات المحلية المتزايدة (CDC Push) ورفعها للسحابة
    // =========================================================================
    const outboundChanges: Record<string, Array<{ id: string; operation: 'create' | 'update' | 'delete'; data: Record<string, unknown> }>> = {};

    for (const table of CLOUD_PUSH_TABLES) {
      try {
        const cols = getTableColumns(table);
        let querySql = `SELECT * FROM ${table} WHERE 1=1`;
        const queryParams: unknown[] = [];

        if (cols.has('updated_at') && cols.has('created_at')) {
          querySql += ' AND (updated_at > ? OR created_at > ?)';
          queryParams.push(lastSyncAt, lastSyncAt);
        } else if (cols.has('updated_at')) {
          querySql += ' AND updated_at > ?';
          queryParams.push(lastSyncAt);
        } else if (cols.has('created_at')) {
          querySql += ' AND created_at > ?';
          queryParams.push(lastSyncAt);
        }

        querySql += ' LIMIT 500';
        const rows = queryAll(querySql, queryParams) as Record<string, unknown>[];

        if (rows.length > 0) {
          outboundChanges[table] = rows.map((row) => ({
            id: String(row.id),
            operation: Boolean(row.deleted_at || row.deleted === 1) ? 'delete' : 'update',
            data: row,
          }));
          totalPushed += rows.length;
        }
      } catch (err) {
        console.warn(`[cloudSync] تعذر تتبع CDC للجدول ${table}:`, err);
      }
    }

    // إرسال التغييرات إلى مسار السحابة (Cloud Push Endpoint)
    const pushEndpoint = apiUrl.endsWith('/api') ? `${apiUrl}/sync/push` : `${apiUrl}/api/sync/push`;
    const pushHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}`, 'x-api-key': apiKey } : {}),
      'x-store-id': String(settingsRow.id || 'store_default'),
      'x-store-name': encodeURIComponent(String(settingsRow.shop_name || 'AN POS')),
    };

    const pushController = new AbortController();
    const pushTimeout = setTimeout(() => pushController.abort(), 20000);

    const pushRes = await fetch(pushEndpoint, {
      method: 'POST',
      headers: pushHeaders,
      signal: pushController.signal,
      body: JSON.stringify({
        storeId: String(settingsRow.id || 'store_default'),
        syncType: isFull ? 'full' : 'incremental',
        timestamp: nowIso,
        changes: outboundChanges,
      }),
    }).finally(() => clearTimeout(pushTimeout));

    if (!pushRes.ok) {
      const errText = await pushRes.text().catch(() => `HTTP ${pushRes.status}`);
      throw new Error(`استجابة غير صالحة من السحابة أثناء الرفع (HTTP ${pushRes.status}): ${errText}`);
    }

    // =========================================================================
    // الخطوة 2: سحب التعديلات الجديدة من السحابة (Cloud Pull) وحسم النزاعات
    // =========================================================================
    const pullEndpoint = apiUrl.endsWith('/api') ? `${apiUrl}/sync/pull` : `${apiUrl}/api/sync/pull`;
    const pullController = new AbortController();
    const pullTimeout = setTimeout(() => pullController.abort(), 20000);

    const pullRes = await fetch(pullEndpoint, {
      method: 'POST',
      headers: pushHeaders,
      signal: pullController.signal,
      body: JSON.stringify({
        storeId: String(settingsRow.id || 'store_default'),
        lastSyncTime: lastSyncAt,
        tables: CLOUD_PULL_TABLES,
      }),
    }).finally(() => clearTimeout(pullTimeout));

    if (pullRes.ok) {
      const pullData = await pullRes.json();
      const incomingChanges: Record<string, Array<{ id: string; operation: string; data: Record<string, unknown> }>> =
        pullData?.changes || {};

      // تطبيق التعديلات الواردة من السحابة بسياسة Master-Wins للبيانات التعريفية
      for (const [table, changes] of Object.entries(incomingChanges)) {
        if (!CLOUD_PULL_TABLES.includes(table) || !Array.isArray(changes) || changes.length === 0) continue;

        transaction(() => {
          for (const ch of changes) {
            const rowId = ch.id;
            const data = ch.data || {};
            const op = ch.operation || 'update';

            if (op === 'delete') {
              execute(`DELETE FROM ${table} WHERE id = ?`, [rowId]);
              notifyTableChange(table, 'delete', rowId);
            } else {
              // Master-Wins: إدراج أو تحديث السجل
              const existing = queryOne(`SELECT id FROM ${table} WHERE id = ?`, [rowId]);
              const cols = getTableColumns(table);
              const validKeys = Object.keys(data).filter((k) => cols.has(k) && k !== 'id');

              if (existing) {
                if (validKeys.length > 0) {
                  const setClause = validKeys.map((k) => `${k} = ?`).join(', ');
                  const setVals = validKeys.map((k) => {
                    const v = data[k];
                    return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
                  });
                  execute(`UPDATE ${table} SET ${setClause}, updated_at = ? WHERE id = ?`, [...setVals, nowIso, rowId]);
                  notifyTableChange(table, 'update', rowId);
                }
              } else {
                const insertKeys = ['id', ...validKeys];
                const placeholders = insertKeys.map(() => '?').join(', ');
                const insertVals = [rowId, ...validKeys.map((k) => {
                  const v = data[k];
                  return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
                })];
                execute(`INSERT INTO ${table} (${insertKeys.join(', ')}) VALUES (${placeholders})`, insertVals);
                notifyTableChange(table, 'create', rowId);
              }
            }

            // إشعار فوري لجميع أجهزة الكاشير المقترنة بالشبكة المحلية
            if (table === 'products') {
              broadcastRealtimeEvent('product:updated', { id: rowId, action: op });
            }
            totalPulled++;
          }
        });
      }
    }

    // =========================================================================
    // الخطوة 3: تحديث سجل النجاح وإعادة ضبط عدادات الأخطاء
    // =========================================================================
    updateCloudState({
      status: 'idle',
      errorMessage: null,
      lastSyncAt: nowIso,
      lastPushAt: nowIso,
      lastPullAt: nowIso,
      incrementPushed: totalPushed,
      incrementPulled: totalPulled,
    });

    try {
      execute("UPDATE network_settings SET sync_fail_count = 0, updated_at = datetime('now') WHERE id = 'default'");
    } catch {}

    console.log(`[cloudSync] ✅ تمت المزامنة السحابية بنجاح: ${totalPushed} سجل رُفع، ${totalPulled} سجل استُلم`);
    return {
      success: true,
      pushed: totalPushed,
      pulled: totalPulled,
      state: 'idle',
    };
  } catch (err: any) {
    const isOffline = isInternetFailure(err);
    const errorMsg = err?.message || 'خطأ غير معروف في الاتصال بالسحابة';

    console.warn(`[cloudSync] ${isOffline ? '🌐 انقطاع الإنترنت' : '⚠️ خطأ سحابي'}:`, errorMsg);

    updateCloudState({
      status: isOffline ? 'offline' : 'error',
      errorMessage: errorMsg,
    });

    try {
      execute("UPDATE network_settings SET sync_fail_count = sync_fail_count + 1, updated_at = datetime('now') WHERE id = 'default'");
    } catch {}

    return {
      success: false,
      pushed: 0,
      pulled: 0,
      error: errorMsg,
      state: isOffline ? 'offline' : 'error',
    };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * بدء أو إعادة ضبط المجدول التلقائي للمزامنة السحابية في الخادم الرئيسي
 */
export function restartCloudSyncScheduler(): void {
  if (cloudSyncTimer) {
    clearInterval(cloudSyncTimer);
    cloudSyncTimer = null;
  }

  const netRow = queryOne('SELECT * FROM network_settings WHERE id = \'default\' LIMIT 1') || {};
  const settingsRow = queryOne('SELECT terminal_role FROM settings WHERE id = \'default\' LIMIT 1') || {};
  const terminalRole = (settingsRow.terminal_role as string) || 'server';

  // المجدول يشتغل فقط في الخادم الرئيسي وعند تفعيل الخيارين
  if (terminalRole !== 'server' || !netRow.cloud_enabled || !netRow.sync_auto || !netRow.api_url) {
    return;
  }

  const intervalMinutes = Math.max(1, Number(netRow.sync_interval) || 5);
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[cloudSync] ⏰ تشغيل المجدول التلقائي للمزامنة السحابية كل ${intervalMinutes} دقيقة`);

  cloudSyncTimer = setInterval(() => {
    executeCloudSync().catch(() => {});
  }, intervalMs);
}

/**
 * إيقاف المجدول عند إغلاق التطبيق
 */
export function stopCloudSyncScheduler(): void {
  if (cloudSyncTimer) {
    clearInterval(cloudSyncTimer);
    cloudSyncTimer = null;
  }
}
