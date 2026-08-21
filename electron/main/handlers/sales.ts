// منطق المبيعات — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// فلترة متقدمة + JSON items + sale_items table.
// يمسي مزامنة مع ipc/sales.ts.

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  transaction,
  serializeValue,
  toSnakeKey,
  type Row,
} from './db-utils';

function transformSale(row: Row) {
  const obj: Record<string, unknown> = { ...row };
  // JSON fields
  if (typeof obj.items === 'string') {
    try { obj.items = JSON.parse(obj.items as string); } catch { obj.items = []; }
  }
  return obj;
}

export interface SalesListOptions {
  type?: string;
  docType?: string;
  customerId?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listSales(opts?: SalesListOptions): Promise<{ data: Record<string, unknown>[] }> {
  let sql = 'SELECT * FROM sales WHERE 1=1';
  const params: unknown[] = [];

  if (opts?.type) { sql += ' AND type = ?'; params.push(opts.type); }
  if (opts?.docType) { sql += ' AND doc_type = ?'; params.push(opts.docType); }
  if (opts?.customerId) { sql += ' AND customer_id = ?'; params.push(opts.customerId); }
  if (opts?.status) { sql += ' AND status = ?'; params.push(opts.status); }
  if (opts?.search) {
    sql += ' AND (number LIKE ? OR customer_name LIKE ?)';
    const s = `%${opts.search}%`;
    params.push(s, s);
  }
  if (opts?.from) { sql += ' AND date >= ?'; params.push(opts.from); }
  if (opts?.to) { sql += ' AND date <= ?'; params.push(`${opts.to}T23:59:59.999Z`); }

  sql += ' ORDER BY date DESC';

  if (opts?.limit) { sql += ' LIMIT ?'; params.push(opts.limit); }
  if (opts?.offset) { sql += ' OFFSET ?'; params.push(opts.offset); }

  const rows = queryAll(sql, params);
  return { data: rows.map(transformSale) };
}

export async function getSale(id: string): Promise<{ data: Record<string, unknown> | null }> {
  const row = queryOne('SELECT * FROM sales WHERE id = ?', [id]);
  if (!row) return { data: null };
  // جلب البنود من sale_items
  const items = queryAll('SELECT * FROM sale_items WHERE sale_id = ?', [id]);
  const sale = transformSale(row);
  sale.saleItems = items;
  return { data: sale };
}

export async function createSale(data: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null }> {
  const id = (data.id as string) || randomUUID();
  const now = new Date().toISOString();
  const items = data.items ? JSON.stringify(data.items) : '[]';
  const saleType = (data.type as string) || 'sale';
  const isReturn = saleType === 'return';
  const sign = isReturn ? 1 : -1;

  transaction(() => {
    // 1. إدراج الفاتورة في جدول sales
    execute(
      `INSERT INTO sales (id, number, date, doc_type, type, items, subtotal, discount, discount_type,
        tva_amount, total, payment_method, customer_id, customer_name, amount_paid, status,
        sold_by, cash_session_id, session_id, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.number || '',
        data.date || now,
        data.docType || 'facture',
        saleType,
        items,
        data.subtotal || 0,
        data.discount || 0,
        data.discountType || 'percent',
        data.tvaAmount || 0,
        data.total || 0,
        data.paymentMethod || 'cash',
        data.customerId || '',
        data.customerName || '',
        data.amountPaid || 0,
        data.status || 'paid',
        data.soldBy || '',
        data.cashSessionId || '',
        data.sessionId || '',
        data.note || '',
        now,
        now,
      ]
    );

    // 2. إدراج بنود البيع في sale_items وتحديث المخزون
    if (Array.isArray(data.items)) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i] as Record<string, unknown>;
        const productId = (item.productId as string) || '';
        const qty = Number(item.qty || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const lineTotal = Number(item.lineTotal || 0);

        execute(
          'INSERT INTO sale_items (id, sale_id, product_id, name, qty, unit_price, line_total, batch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            (item.id as string) || randomUUID(),
            id,
            productId,
            item.name || '',
            qty,
            unitPrice,
            lineTotal,
            item.batchNumber || '',
          ]
        );

        // خصم/زيادة المخزون وتسجيل حركة في stock_movements للمنتجات الحقيقية
        if (productId && !productId.startsWith('custom-')) {
          try {
            execute('UPDATE products SET quantity = MAX(0, quantity + ?), updated_at = ? WHERE id = ?', [
              sign * qty,
              now,
              productId,
            ]);

            execute(
              `INSERT INTO stock_movements (id, date, type, product_id, qty, reason, reference_id, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                randomUUID(),
                now.slice(0, 10),
                isReturn ? 'return' : 'sale',
                productId,
                qty,
                `${isReturn ? 'مرتجع' : 'مبيعات'} فاتورة رقم ${data.number || ''}`,
                id,
                data.soldBy || '',
                now,
                now,
              ]
            );
          } catch {
            // تجاوز إذا كان جدول stock_movements أو product غير متوفر
          }
        }
      }
    }

    // 3. تحديث رصيد العميل في حال البيع الآجل
    const customerId = (data.customerId as string) || '';
    const total = Number(data.total || 0);
    const amountPaid = Number(data.amountPaid || 0);
    const remaining = total - amountPaid;
    if (customerId && remaining !== 0) {
      try {
        const custSign = isReturn ? -1 : 1;
        execute('UPDATE customers SET balance = balance + ?, updated_at = ? WHERE id = ?', [
          custSign * remaining,
          now,
          customerId,
        ]);
      } catch { /* ignore */ }
    }

    // 4. تحديث جلسة الصندوق في حال الدفع النقدي
    const cashSessionId = (data.cashSessionId as string) || (data.sessionId as string) || '';
    if (cashSessionId && (data.paymentMethod === 'cash' || !data.paymentMethod) && amountPaid > 0) {
      try {
        const cashSign = isReturn ? -1 : 1;
        execute('UPDATE cash_sessions SET total_sales = total_sales + ?, actual_balance = actual_balance + ?, updated_at = ? WHERE id = ?', [
          cashSign * amountPaid,
          cashSign * amountPaid,
          now,
          cashSessionId,
        ]);
      } catch { /* ignore */ }
    }
  });

  const created = queryOne('SELECT * FROM sales WHERE id = ?', [id]);
  return { data: created ? transformSale(created) : null };
}

export async function updateSale(id: string, data: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null }> {
  const entries = Object.entries(data).filter(([k]) => k !== 'id' && k !== 'items');
  const setClause = entries.map(([k]) => `${toSnakeKey(k)} = ?`).join(', ');
  const vals = entries.map(([, v]) => serializeValue(v));

  transaction(() => {
    if (data.items) {
      execute(`UPDATE sales SET ${setClause}, items = ?, updated_at = ? WHERE id = ?`,
        [...vals, JSON.stringify(data.items), new Date().toISOString(), id]);
    } else {
      execute(`UPDATE sales SET ${setClause}, updated_at = ? WHERE id = ?`,
        [...vals, new Date().toISOString(), id]);
    }
  });

  const updated = queryOne('SELECT * FROM sales WHERE id = ?', [id]);
  return { data: updated ? transformSale(updated) : null };
}

export async function removeSale(id: string): Promise<{ success: boolean }> {
  transaction(() => {
    execute('DELETE FROM sale_items WHERE sale_id = ?', [id]);
    execute('DELETE FROM sales WHERE id = ?', [id]);
  });
  return { success: true };
}
