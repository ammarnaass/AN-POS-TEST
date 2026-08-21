// منطق إضافي — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// يشمل: barcodePrints, payments, supplierEntries, activities, upload.
// يمسي مزامنة مع ipc/register.ts (المسارات المخصصة غير الفئات).

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  serializeValue,
  type Row,
} from './db-utils';

// ===== barcodePrints =====

export async function listBarcodePrints(opts?: { productId?: string }): Promise<{ data: Row[] }> {
  let sql = 'SELECT * FROM barcode_prints WHERE 1=1';
  const params: unknown[] = [];
  if (opts?.productId) { sql += ' AND product_id = ?'; params.push(opts.productId); }
  sql += ' ORDER BY created_at DESC';
  return { data: queryAll(sql, params) };
}

export async function createBarcodePrint(data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> {
  const id = (data.id as string) || randomUUID();
  const cols = ['id'];
  const vals: unknown[] = [id];
  const map: Record<string, string> = {
    productId: 'product_id', labelSize: 'label_size', barcodeType: 'barcode_type',
    showCompany: 'show_company', showProduct: 'show_product', showSku: 'show_sku',
    showPrice: 'show_price', showBarcode: 'show_barcode', enlargePrice: 'enlarge_price',
    printOptions: 'print_options',
  };
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id') continue;
    const col = map[k] || k;
    cols.push(col);
    vals.push(serializeValue(v));
  }
  const placeholders = cols.map(() => '?').join(', ');
  execute(`INSERT INTO barcode_prints (${cols.join(', ')}) VALUES (${placeholders})`, vals);
  return { data: { id, ...data } };
}

export async function removeBarcodePrint(id: string): Promise<{ success: boolean }> {
  execute('DELETE FROM barcode_prints WHERE id = ?', [id]);
  return { success: true };
}

// ===== payments =====

export async function listPayments(opts?: { partyId?: string; partyType?: string }): Promise<{ data: Row[] }> {
  let sql = 'SELECT * FROM payments WHERE 1=1';
  const params: unknown[] = [];
  if (opts?.partyId) { sql += ' AND party_id = ?'; params.push(opts.partyId); }
  if (opts?.partyType) { sql += ' AND party_type = ?'; params.push(opts.partyType); }
  sql += ' ORDER BY date DESC';
  return { data: queryAll(sql, params) };
}

export async function createPayment(data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> {
  const id = (data.id as string) || randomUUID();
  const now = new Date().toISOString();
  execute(
    'INSERT INTO payments (id, date, party_type, party_id, customer_id, amount, type, method, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id, data.date || now, data.partyType || 'customer', data.partyId || '',
      data.customerId || data.partyId || '', data.amount || 0,
      data.type || 'debit', data.method || 'cash', data.note || '',
      data.createdBy || '', now,
    ]
  );
  return { data: { id, ...data } };
}

// ===== supplierEntries =====

export async function listSupplierEntries(opts?: { supplierId?: string }): Promise<{ data: Row[] }> {
  let sql = 'SELECT * FROM supplier_entries WHERE 1=1';
  const params: unknown[] = [];
  if (opts?.supplierId) { sql += ' AND supplier_id = ?'; params.push(opts.supplierId); }
  sql += ' ORDER BY date DESC';
  return { data: queryAll(sql, params) };
}

export async function createSupplierEntry(data: Record<string, unknown>): Promise<{ data: Record<string, unknown> }> {
  const id = (data.id as string) || randomUUID();
  execute(
    'INSERT INTO supplier_entries (id, supplier_id, date, type, amount, items, invoice_number, paid_amount, remaining_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id, data.supplierId || '', data.date || new Date().toISOString(),
      data.type || 'purchase', data.amount || 0, JSON.stringify(data.items || []),
      data.invoiceNumber || '', data.paidAmount || 0, data.remainingBalance || 0,
    ]
  );
  return { data: { id, ...data } };
}

// ===== activities =====

export async function listActivities(opts?: { userId?: string; action?: string; limit?: number }): Promise<{ data: Row[] }> {
  let sql = 'SELECT * FROM user_activities WHERE 1=1';
  const params: unknown[] = [];
  if (opts?.userId) { sql += ' AND user_id = ?'; params.push(opts.userId); }
  if (opts?.action) { sql += ' AND action = ?'; params.push(opts.action); }
  sql += ' ORDER BY performed_at DESC';
  if (opts?.limit) { sql += ' LIMIT ?'; params.push(opts.limit); }
  return { data: queryAll(sql, params) };
}

export async function logActivity(data: {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: string;
}): Promise<{ success: boolean }> {
  const id = randomUUID();
  execute(
    'INSERT INTO user_activities (id, user_id, action, entity_type, entity_id, details, performed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.userId, data.action, data.entityType || '', data.entityId || '', data.details || '', new Date().toISOString()]
  );
  return { success: true };
}

// ===== upload (Excel import) =====

export async function uploadProducts(rows: Record<string, unknown>[]): Promise<{ imported: number; total: number }> {
  let count = 0;
  for (const row of rows) {
    const id = (row.id as string) || randomUUID();
    try {
      execute(
        `INSERT OR IGNORE INTO products (id, name, barcode, sku, category, unit, cost_price, retail_price, quantity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, row.name || '', row.barcode || '', row.sku || '', row.category || '',
          row.unit || 'قطعة', row.costPrice || 0, row.retailPrice || 0, row.quantity || 0,
          new Date().toISOString(), new Date().toISOString(),
        ]
      );
      count++;
    } catch {
      // تجاهل الصفوف الفاشلة
    }
  }
  return { imported: count, total: rows.length };
}

export async function uploadCustomers(rows: Record<string, unknown>[]): Promise<{ imported: number; total: number }> {
  let count = 0;
  for (const row of rows) {
    const id = (row.id as string) || randomUUID();
    try {
      execute(
        'INSERT OR IGNORE INTO customers (id, name, phone, credit_limit, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id, row.name || '', row.phone || '', row.creditLimit || 0, row.balance || 0,
          new Date().toISOString(), new Date().toISOString(),
        ]
      );
      count++;
    } catch {
      // تجاهل
    }
  }
  return { imported: count, total: rows.length };
}
