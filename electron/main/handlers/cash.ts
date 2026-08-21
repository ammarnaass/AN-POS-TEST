// منطق الصندوق — دوال قابلة لإعادة الاستخدام (IPC + HTTP REST).
// فتح/إغلاق/إيداع/جلسة حالية.
// يمسي مزامنة مع ipc/cash.ts.

import { randomUUID } from 'node:crypto';
import {
  queryAll,
  queryOne,
  execute,
  type Row,
} from './db-utils';

function transformCashSession(row: Row) {
  const obj: Record<string, unknown> = { ...row };
  if (typeof obj.deposits === 'string') {
    try { obj.deposits = JSON.parse(obj.deposits as string); } catch { obj.deposits = []; }
  }
  return obj;
}

export async function listCashSessions(): Promise<{ data: Record<string, unknown>[] }> {
  const rows = queryAll('SELECT * FROM cash_sessions ORDER BY opened_at DESC');
  return { data: rows.map(transformCashSession) };
}

export async function getCashSession(id: string): Promise<{ data: Record<string, unknown> | null }> {
  const row = queryOne('SELECT * FROM cash_sessions WHERE id = ?', [id]);
  if (!row) return { data: null };
  return { data: transformCashSession(row) };
}

export async function getCurrentCashSession(): Promise<{ data: Record<string, unknown> | null }> {
  const row = queryOne("SELECT * FROM cash_sessions WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1");
  if (!row) return { data: null };
  return { data: transformCashSession(row) };
}

export async function openCashSession(data: {
  openedBy: string;
  openingBalance: number;
}): Promise<{ data: Record<string, unknown> | null }> {
  // إغلاق أي جلسة مفتوحة سابقاً
  execute("UPDATE cash_sessions SET status = 'closed', closed_at = ? WHERE status = 'open'", [new Date().toISOString()]);

  // حساب رقم الجلسة
  const lastSession = queryOne('SELECT session_number FROM cash_sessions ORDER BY session_number DESC LIMIT 1');
  const sessionNumber = lastSession ? Number(lastSession.session_number) + 1 : 1;

  const id = randomUUID();
  const now = new Date().toISOString();
  execute(
    'INSERT INTO cash_sessions (id, session_number, opened_by, opened_at, opening_balance, deposits, total_sales, total_returns, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, sessionNumber, data.openedBy, now, data.openingBalance, '[]', 0, 0, 'open', now, now]
  );

  const created = queryOne('SELECT * FROM cash_sessions WHERE id = ?', [id]);
  return { data: created ? transformCashSession(created) : null };
}

export async function closeCashSession(
  id: string,
  data: { actualBalance: number; note?: string }
): Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }> {
  const session = queryOne('SELECT * FROM cash_sessions WHERE id = ?', [id]);
  if (!session) return { error: { status: 404, detail: 'الجلسة غير موجودة' } };

  const now = new Date().toISOString();
  execute(
    'UPDATE cash_sessions SET status = ?, closed_at = ?, actual_balance = ?, note = ?, updated_at = ? WHERE id = ?',
    ['closed', now, data.actualBalance, data.note || '', now, id]
  );

  const updated = queryOne('SELECT * FROM cash_sessions WHERE id = ?', [id]);
  return { data: updated ? transformCashSession(updated) : null };
}

export async function depositCash(
  id: string,
  data: { amount: number; note?: string }
): Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }> {
  const session = queryOne('SELECT * FROM cash_sessions WHERE id = ?', [id]);
  if (!session) return { error: { status: 404, detail: 'الجلسة غير موجودة' } };

  // إضافة الإيداع إلى مصفوفة deposits
  const deposits: unknown[] = typeof session.deposits === 'string'
    ? (JSON.parse(session.deposits as string) || [])
    : [];
  deposits.push({
    amount: data.amount,
    note: data.note || '',
    createdAt: new Date().toISOString(),
  });

  execute(
    'UPDATE cash_sessions SET deposits = ?, updated_at = ? WHERE id = ?',
    [JSON.stringify(deposits), new Date().toISOString(), id]
  );

  const updated = queryOne('SELECT * FROM cash_sessions WHERE id = ?', [id]);
  return { data: updated ? transformCashSession(updated) : null };
}
