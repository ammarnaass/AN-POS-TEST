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
  let parsedItems: unknown[] = [];
  if (Array.isArray(data.items)) {
    parsedItems = data.items;
  } else if (typeof data.items === 'string') {
    try { parsedItems = JSON.parse(data.items); } catch { parsedItems = []; }
  }
  const itemsJson = JSON.stringify(parsedItems);
  const saleType = String(data.type || 'sale');
  const isReturn = saleType === 'return';
  const sign = isReturn ? 1 : -1;

  const docType = String(data.docType ?? data.doc_type ?? 'facture');
  const discountType = String(data.discountType ?? data.discount_type ?? 'percent');
  const paymentMethod = String(data.paymentMethod ?? data.payment_method ?? 'cash');
  const customerId = String(data.customerId ?? data.customer_id ?? '');
  const customerName = String(data.customerName ?? data.customer_name ?? '');
  const amountPaid = Number(data.amountPaid ?? data.amount_paid ?? 0);
  const status = String(data.status || 'paid');
  const soldBy = String(data.soldBy ?? data.sold_by ?? '');
  const cashSessionId = String(data.cashSessionId ?? data.cash_session_id ?? data.sessionId ?? data.session_id ?? '');
  const tvaAmount = Number(data.tvaAmount ?? data.tva_amount ?? 0);
  const subtotal = Number(data.subtotal ?? 0);
  const discount = Number(data.discount ?? 0);
  const total = Number(data.total ?? 0);
  const note = String(data.note ?? data.notes ?? '');

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
        docType,
        saleType,
        itemsJson,
        subtotal,
        discount,
        discountType,
        tvaAmount,
        total,
        paymentMethod,
        customerId,
        customerName,
        amountPaid,
        status,
        soldBy,
        cashSessionId,
        cashSessionId,
        note,
        data.created_at || data.createdAt || now,
        now,
      ]
    );

    // 2. إدراج بنود البيع في sale_items وتحديث المخزون
    if (Array.isArray(parsedItems)) {
      for (let i = 0; i < parsedItems.length; i++) {
        const item = parsedItems[i] as Record<string, unknown>;
        const productId = String(item.productId ?? item.product_id ?? '');
        const name = String(item.name ?? item.productName ?? item.product_name ?? 'منتج');
        const qty = Number(item.qty ?? item.quantity ?? 0);
        const unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
        const lineTotal = Number(item.lineTotal ?? item.line_total ?? (qty * unitPrice));
        const batchNumber = String(item.batchNumber ?? item.batch_number ?? '');
        const itemId = String(item.id || randomUUID());

        execute(
          'INSERT INTO sale_items (id, sale_id, product_id, name, qty, unit_price, line_total, batch_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            itemId,
            id,
            productId,
            name,
            qty,
            unitPrice,
            lineTotal,
            batchNumber,
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
                soldBy,
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
    if (cashSessionId && (paymentMethod === 'cash' || !paymentMethod) && amountPaid > 0) {
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
    try {
      execute(
        `INSERT INTO sync_tombstones (id, table_name, record_id, deleted_at) VALUES (?, 'sales', ?, datetime('now'))`,
        [randomUUID(), id]
      );
    } catch {
      /* ignore tombstone insertion error */
    }
  });
  return { success: true };
}
