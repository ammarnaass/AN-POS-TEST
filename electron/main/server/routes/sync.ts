// مسارات المزامنة المتقدمة — push/pull بين الهاتف وسطح المكتب
//
// POST /api/sync/push — الهاتف يرسل العمليات المعلقة مع ضمان الذرية ومنع التكرار (Idempotency)
// POST /api/sync/pull — الهاتف يطلب التحديثات منذ آخر مزامنة (Delta Sync)
// GET  /api/sync/status — حالة المزامنة وإحصائيات الطابور
// POST /api/sync/bulk — جلب نسخة كاملة من البيانات عند أول اقتران

import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  queryOne,
  queryAll,
  execute,
  transaction,
  getTableColumns,
  serializeValue,
  toSnakeKey,
} from '../../handlers/db-utils';
import { createSale, updateSale, removeSale } from '../../handlers/sales';
import {
  createRow,
  updateRow,
  removeRow,
  resolveTableName,
} from '../../handlers/crud';
import { normalizeBody } from '../middleware/normalizeFields';

// الجداول القابلة للمزامنة (34 جدولاً تشمل كافة الميزات والمستندات)
const SYNCABLE_TABLES = [
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

/**
 * معالجة عملية sync واحدة بحماية كاملة ومنع تكرار (Idempotent Sync Execution)
 */
function applySyncOperation(
  rawEntity: string,
  operation: string,
  localId: string,
  rawPayload: Record<string, unknown>,
): { success: boolean; error?: string } {
  try {
    const entity = resolveTableName(rawEntity);
    if (!SYNCABLE_TABLES.includes(entity)) {
      return { success: false, error: `الجدول ${entity} غير قابل للمزامنة` };
    }

    const payload = normalizeBody(rawPayload || {});

    // ===== معالجة مخصصة للإعدادات (Settings) مع حماية ضد الحقول غير الصالحة =====
    if (entity === 'settings') {
      const settingsId = localId || 'default';
      const validCols = getTableColumns('settings');
      const safePayload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(payload)) {
        const snake = toSnakeKey(k);
        if (validCols.has(snake)) {
          safePayload[snake] = v;
        } else if (validCols.has(k)) {
          safePayload[k] = v;
        }
      }
      updateRow('settings', settingsId, safePayload);
      return { success: true };
    }

    // ===== معالجة مخصصة للفواتير (Sales) =====
    if (entity === 'sales') {
      if (operation === 'create') {
        const existing = queryOne('SELECT id FROM sales WHERE id = ?', [localId]);
        if (existing) {
          return { success: true };
        }
        createSale({ ...payload, id: localId });
        return { success: true };
      }
      if (operation === 'update') {
        updateSale(localId, payload);
        return { success: true };
      }
      if (operation === 'delete') {
        removeSale(localId);
        return { success: true };
      }
    }

    // ===== معالجة مخصصة لبنود الفواتير (Sale Items) لمنع الازدواجية مع createSale =====
    if (entity === 'sale_items' && operation === 'create') {
      const existing = queryOne('SELECT id FROM sale_items WHERE id = ?', [localId]);
      if (existing) {
        return { success: true };
      }
    }

    // ===== معالجة عامة لبقية الجداول باستخدام createRow / updateRow / removeRow =====
    switch (operation) {
      case 'create': {
        const existing = queryOne(`SELECT id FROM ${entity} WHERE id = ?`, [localId]);
        if (existing) {
          updateRow(entity, localId, payload);
          return { success: true };
        }
        createRow(entity, { ...payload, id: localId });
        return { success: true };
      }

      case 'update': {
        updateRow(entity, localId, payload);
        return { success: true };
      }

      case 'delete': {
        removeRow(entity, localId);
        return { success: true };
      }

      default:
        return { success: false, error: `عملية غير معروفة: ${operation}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'خطأ غير معروف' };
  }
}

/**
 * تسجيل مسارات المزامنة
 */
export async function registerSyncRoutes(server: FastifyInstance): Promise<void> {
  // POST /api/sync/push — استقبال العمليات المعلقة من الهاتف مع معالجة ذرية
  server.post('/api/sync/push', async (request, reply) => {
    const body = request.body as {
      operations: Array<{
        id: string;
        entity: string;
        operation: 'create' | 'update' | 'delete';
        localId: string;
        payload: Record<string, unknown>;
        timestamp: string;
      }>;
    };

    if (!body.operations || !Array.isArray(body.operations)) {
      return reply.code(422).send({ error: { status: 422, detail: 'operations array مطلوب' } });
    }

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    // تنفيذ كل عملية داخل الحماية مع تسجيل النتائج
    for (const op of body.operations) {
      let opResult: { success: boolean; error?: string };

      try {
        opResult = transaction(() => {
          return applySyncOperation(op.entity, op.operation, op.localId, op.payload || {});
        });
      } catch (err) {
        opResult = {
          success: false,
          error: err instanceof Error ? err.message : 'فشل تنفيذ العملية',
        };
      }

      results.push({ id: op.id, ...opResult });

      // حفظ في جدول سجل المزامنة (sync_queue) للمراجعة والتدقيق
      try {
        const existingSync = queryOne('SELECT id FROM sync_queue WHERE id = ?', [op.id]);
        if (existingSync) {
          execute(
            `UPDATE sync_queue SET status = ?, synced_at = datetime('now') WHERE id = ?`,
            [opResult.success ? 'completed' : 'failed', op.id]
          );
        } else {
          execute(
            `INSERT INTO sync_queue (id, entity, operation, local_id, payload, created_at, synced_at, status)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
            [
              op.id,
              op.entity,
              op.operation,
              op.localId,
              JSON.stringify(op.payload || {}),
              op.timestamp || new Date().toISOString(),
              opResult.success ? 'completed' : 'failed',
            ]
          );
        }
      } catch {
        /* non-blocking */
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return reply.send({
      success: true,
      processed: results.length,
      succeeded: successCount,
      failed: results.length - successCount,
      results,
      serverTime: new Date().toISOString(),
    });
  });

  // POST /api/sync/pull — جلب التعديلات الجديدة منذ آخر مزامنة بما فيها المحذوفات
  server.post('/api/sync/pull', async (request, reply) => {
    const body = (request.body || {}) as {
      lastSyncTime?: string;
      tables?: string[];
    };

    const lastSync = body.lastSyncTime || '1970-01-01T00:00:00.000Z';
    const tables = body.tables || SYNCABLE_TABLES;
    const serverTime = new Date().toISOString();

    const changes: Record<string, Array<{ id: string; operation: string; data: Record<string, unknown> }>> = {};

    for (const table of tables) {
      if (!SYNCABLE_TABLES.includes(table)) continue;

      const tableChanges: Array<{ id: string; operation: string; data: Record<string, unknown> }> = [];
      const deletedIds = new Set<string>();

      // 1. فحص السجلات المحذوفة من جدول sync_tombstones
      try {
        const tombstoneRows = queryAll(
          'SELECT record_id FROM sync_tombstones WHERE table_name = ? AND deleted_at > ?',
          [table, lastSync]
        );
        for (const tr of tombstoneRows) {
          const recordId = String(tr.record_id);
          deletedIds.add(recordId);
          tableChanges.push({
            id: recordId,
            operation: 'delete',
            data: {},
          });
        }
      } catch {
        /* ignore if tombstone table is unavailable */
      }

      // 2. فحص السجلات المحدثة والمنشأة
      try {
        const columns = getTableColumns(table);
        let sql = `SELECT * FROM ${table} WHERE 1=1`;
        const params: unknown[] = [];

        if (columns.has('updated_at') && columns.has('created_at')) {
          sql += ` AND (updated_at > ? OR created_at > ?)`;
          params.push(lastSync, lastSync);
        } else if (columns.has('updated_at')) {
          sql += ` AND updated_at > ?`;
          params.push(lastSync);
        } else if (columns.has('created_at')) {
          sql += ` AND created_at > ?`;
          params.push(lastSync);
        }

        if (columns.has('updated_at')) {
          sql += ` ORDER BY updated_at ASC LIMIT 500`;
        } else {
          sql += ` LIMIT 500`;
        }

        const rows = queryAll(sql, params);

        for (const row of rows as Record<string, unknown>[]) {
          const rowId = String(row.id);
          if (deletedIds.has(rowId)) continue;

          const isDeleted =
            row.deleted === 1 ||
            row.deleted === true ||
            Boolean(row.deleted_at) ||
            row.status === 'deleted';

          tableChanges.push({
            id: rowId,
            operation: isDeleted ? 'delete' : 'update',
            data: row,
          });
        }
      } catch {
        // تخطي الجدول في حال حدوث أي خطأ
      }

      if (tableChanges.length > 0) {
        changes[table] = tableChanges;
      }
    }

    return reply.send({
      success: true,
      lastSyncTime: serverTime,
      changes,
      totalRecords: Object.values(changes).reduce((sum, arr) => sum + arr.length, 0),
    });
  });

  // GET /api/sync/status — إحصائيات حالة المزامنة
  server.get('/api/sync/status', async (_request, reply) => {
    let pending = 0;
    let failed = 0;
    let lastSyncTime: string | null = null;

    try {
      const pendingRow = queryOne("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'");
      const failedRow = queryOne("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'");
      const lastSyncRow = queryOne(
        "SELECT synced_at FROM sync_queue WHERE status = 'completed' ORDER BY synced_at DESC LIMIT 1"
      );

      pending = Number(pendingRow?.count) || 0;
      failed = Number(failedRow?.count) || 0;
      lastSyncTime = (lastSyncRow?.synced_at as string) || null;
    } catch {
      /* ignore if sync_queue is not ready */
    }

    return reply.send({
      success: true,
      pending,
      failed,
      lastSyncTime,
      serverTime: new Date().toISOString(),
    });
  });

  // POST /api/sync/bulk — جلب نسخة كاملة وسريعة لتهيئة الهاتف
  server.post('/api/sync/bulk', async (request, reply) => {
    const body = (request.body || {}) as {
      tables?: string[];
    };

    const tables = body.tables || SYNCABLE_TABLES;
    const data: Record<string, Record<string, unknown>[]> = {};

    for (const table of tables) {
      if (!SYNCABLE_TABLES.includes(table)) continue;
      try {
        const columns = getTableColumns(table);
        let sql = `SELECT * FROM ${table}`;
        if (columns.has('deleted')) {
          sql += ` WHERE deleted = 0 OR deleted IS NULL`;
        }
        sql += ` LIMIT 2500`;
        const rows = queryAll(sql);
        data[table] = rows;
      } catch {
        data[table] = [];
      }
    }

    return reply.send({
      success: true,
      data,
      totalRecords: Object.values(data).reduce((sum, arr) => sum + arr.length, 0),
      timestamp: new Date().toISOString(),
    });
  });

  // GET /api/sync/users-readonly — جلب المستخدمين والأدوار دون تسريب كلمات المرور أو الـ PINs
  server.get('/api/sync/users-readonly', async (_request, reply) => {
    try {
      const users = queryAll(
        'SELECT id, username, name, email, phone, role, role_id, status, created_at, updated_at FROM users WHERE status != \x27deleted\x27'
      );
      const roles = queryAll(
        'SELECT id, name, description, permissions, is_system, created_at FROM roles'
      );
      return reply.send({
        success: true,
        users,
        roles,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      return reply.code(500).send({ error: { status: 500, detail: (err as Error).message } });
    }
  });

  // تنظيف السجلات المحذوفة القديمة الأقدم من 90 يوماً
  try {
    execute("DELETE FROM sync_tombstones WHERE deleted_at < datetime('now', '-90 days')");
  } catch {
    /* non-blocking */
  }

  console.log('[sync] ✅ مسارات المزامنة المتقدمة مسجلة بنجاح');
}

