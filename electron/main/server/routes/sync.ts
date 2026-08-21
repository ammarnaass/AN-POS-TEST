// مسارات المزامنة — push/pull بين الهاتف والسطح المكتب
//
// POST /api/sync/push — الهاتف يرسل العمليات المعلقة
// POST /api/sync/pull — الهاتف يطلب التحديثات منذ آخر مزامنة
// GET  /api/sync/status — حالة المزامنة

import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { queryOne, queryAll, execute } from '../../handlers/db-utils';

// الجداول القابلة للمزامنة
const SYNCABLE_TABLES = [
  'products', 'categories', 'customers', 'suppliers',
  'sales', 'sale_items', 'purchases', 'purchase_items',
  'expenses', 'cash_sessions', 'payments',
  'promotions', 'packs', 'print_templates',
  'stock_movements', 'stock_movements_v2',
];

/**
 * معالجة عملية sync واحدة
 */
function applySyncOperation(
  entity: string,
  operation: string,
  localId: string,
  payload: Record<string, unknown>,
): { success: boolean; error?: string } {
  try {
    if (!SYNCABLE_TABLES.includes(entity)) {
      return { success: false, error: `الجدول ${entity} غير قابل للمزامنة` };
    }

    switch (operation) {
      case 'create': {
        // تحقق من عدم التكرار
        const existing = queryOne(`SELECT id FROM ${entity} WHERE id = ?`, [localId]);
        if (existing) {
          // يحدث بدلاً من إنشاء
          const fields = Object.keys(payload).filter(k => k !== 'id');
          if (fields.length > 0) {
            const sets = fields.map(f => `${f} = ?`).join(', ');
            const values = fields.map(f => payload[f]);
            execute(`UPDATE ${entity} SET ${sets}, updated_at = datetime('now') WHERE id = ?`,
              [...values, localId]);
          }
          return { success: true };
        }
        const fields = ['id', ...Object.keys(payload)];
        const placeholders = fields.map(() => '?').join(', ');
        const values = [localId, ...fields.slice(1).map(f => payload[f])];
        execute(`INSERT INTO ${entity} (${fields.join(', ')}) VALUES (${placeholders})`, values);
        return { success: true };
      }

      case 'update': {
        const fields = Object.keys(payload).filter(k => k !== 'id');
        if (fields.length === 0) return { success: true };
        const sets = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => payload[f]);
        execute(`UPDATE ${entity} SET ${sets}, updated_at = datetime('now') WHERE id = ?`,
          [...values, localId]);
        return { success: true };
      }

      case 'delete': {
        execute(`DELETE FROM ${entity} WHERE id = ?`, [localId]);
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
  // POST /api/sync/push — الهاتف يُرسل عملياته المعلقة
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

    for (const op of body.operations) {
      const result = applySyncOperation(op.entity, op.operation, op.localId, op.payload);
      results.push({ id: op.id, ...result });

      // سجل في sync_queue للمراجعة
      try {
        execute(
          `INSERT INTO sync_queue (id, entity, operation, local_id, payload, created_at, synced_at, status)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
          [op.id, op.entity, op.operation, op.localId, JSON.stringify(op.payload),
           op.timestamp, result.success ? 'completed' : 'failed']
        );
      } catch { /* non-blocking */ }
    }

    const successCount = results.filter(r => r.success).length;
    return reply.send({
      success: true,
      processed: results.length,
      succeeded: successCount,
      failed: results.length - successCount,
      results,
    });
  });

  // POST /api/sync/pull — الهاتف يطلب التحديثات
  server.post('/api/sync/pull', async (request, reply) => {
    const body = request.body as {
      lastSyncTime?: string;
      tables?: string[];
    };

    const lastSync = body.lastSyncTime || '1970-01-01T00:00:00.000Z';
    const tables = body.tables || SYNCABLE_TABLES;

    const changes: Record<string, Array<{ id: string; operation: string; data: Record<string, unknown> }>> = {};

    for (const table of tables) {
      if (!SYNCABLE_TABLES.includes(table)) continue;

      try {
        // جلب التحديثات منذ آخر مزامنة
        const rows = queryAll(
          `SELECT * FROM ${table} WHERE updated_at > ? OR created_at > ? ORDER BY updated_at ASC LIMIT 500`,
          [lastSync, lastSync]
        );

        if (rows.length > 0) {
          changes[table] = rows.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            operation: 'update',
            data: row,
          }));
        }

        // جلب المحذوفات (إذا كان الجدول يدعم updated_at)
        const deleted = queryAll(
          `SELECT id FROM ${table} WHERE updated_at > ? AND (status = 'deleted' OR deleted = 1)`,
          [lastSync]
        );
        if (deleted.length > 0) {
          if (!changes[table]) changes[table] = [];
          for (const d of deleted) {
            changes[table].push({
              id: String(d.id),
              operation: 'delete',
              data: { id: d.id },
            });
          }
        }
      } catch {
        // تخطي الجدول إذا حدث خطأ
      }
    }

    return reply.send({
      success: true,
      lastSyncTime: new Date().toISOString(),
      changes,
      totalRecords: Object.values(changes).reduce((sum, arr) => sum + arr.length, 0),
    });
  });

  // GET /api/sync/status — حالة المزامنة
  server.get('/api/sync/status', async (_request, reply) => {
    const pendingCount = queryOne(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'"
    );
    const failedCount = queryOne(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'failed'"
    );
    const lastSync = queryOne(
      "SELECT synced_at FROM sync_queue WHERE status = 'completed' ORDER BY synced_at DESC LIMIT 1"
    );

    return reply.send({
      success: true,
      pending: Number(pendingCount?.count) || 0,
      failed: Number(failedCount?.count) || 0,
      lastSyncTime: lastSync?.synced_at || null,
    });
  });

  // POST /api/sync/bulk — مزامنة كبيرة (أول اتصال)
  server.post('/api/sync/bulk', async (request, reply) => {
    const body = request.body as {
      tables?: string[];
    };

    const tables = body.tables || SYNCABLE_TABLES;
    const data: Record<string, Record<string, unknown>[]> = {};

    for (const table of tables) {
      if (!SYNCABLE_TABLES.includes(table)) continue;
      try {
        const rows = queryAll(`SELECT * FROM ${table} LIMIT 2000`);
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

  console.log('[sync] مسارات المزامنة مسجلة');
}
