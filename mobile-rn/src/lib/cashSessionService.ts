// Cash Session Service — CRUD for cash_sessions table
import { db, ensureInit } from './db';

export interface CashSession {
  id: string;
  openingBalance: number;
  closingBalance?: number;
  totalSales?: number;
  status: 'open' | 'closed';
  openedBy: string;
  openedAt: string;
  closedAt?: string;
}

export async function getOpenSession(): Promise<CashSession | null> {
  await ensureInit();
  const all = await db.cashSessions.toArray();
  const open = all.find((s: any) => s.status === 'open') as CashSession | undefined;
  return open || null;
}

export async function openSession(openingBalance: number, openedBy: string): Promise<CashSession> {
  await ensureInit();
  const session: CashSession = {
    id: 'cs-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    openingBalance,
    totalSales: 0,
    status: 'open',
    openedBy,
    openedAt: new Date().toISOString(),
  };
  await db.cashSessions.add(session as any);
  return session;
}

export async function closeSession(sessionId: string, closingBalance: number): Promise<void> {
  await ensureInit();
  const existing = await db.cashSessions.get(sessionId);
  if (!existing) throw new Error('Session not found');
  await db.cashSessions.put({
    ...existing,
    closingBalance,
    status: 'closed',
    closedAt: new Date().toISOString(),
  } as any);
}

export async function addToSessionSales(sessionId: string, amount: number): Promise<void> {
  await ensureInit();
  const existing = await db.cashSessions.get(sessionId);
  if (!existing) return;
  await db.cashSessions.put({
    ...existing,
    totalSales: ((existing as any).totalSales || 0) + amount,
  } as any);
}
