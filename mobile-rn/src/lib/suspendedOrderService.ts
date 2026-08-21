// Suspended Orders Service — CRUD for suspended_orders table
import { db, ensureInit } from './db';

export interface SuspendedOrder {
  id: string;
  items: string; // JSON string of CartItem[]
  customerId?: string;
  customerName?: string;
  discountType?: string;
  discountValue?: number;
  suspendedAt: string;
  note?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  promoName?: string;
}

export async function getAllSuspended(): Promise<SuspendedOrder[]> {
  await ensureInit();
  const all = await db.suspendedOrders.toArray();
  return (all as unknown as SuspendedOrder[])
    .sort((a, b) => new Date(b.suspendedAt).getTime() - new Date(a.suspendedAt).getTime());
}

export async function suspendOrder(
  items: CartItem[],
  customerId?: string,
  customerName?: string,
  discountType?: string,
  discountValue?: number,
  note?: string,
): Promise<SuspendedOrder> {
  await ensureInit();
  const order: SuspendedOrder = {
    id: 'susp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    items: JSON.stringify(items),
    customerId,
    customerName,
    discountType,
    discountValue,
    suspendedAt: new Date().toISOString(),
    note,
  };
  await db.suspendedOrders.add(order as any);
  return order;
}

export function parseSuspendedItems(order: SuspendedOrder): CartItem[] {
  try {
    return JSON.parse(order.items || '[]');
  } catch {
    return [];
  }
}

export async function resumeOrder(id: string): Promise<CartItem[]> {
  await ensureInit();
  const order = await db.suspendedOrders.get(id) as SuspendedOrder | undefined;
  if (!order) throw new Error('Suspended order not found');
  const items: CartItem[] = JSON.parse(order.items || '[]');
  await db.suspendedOrders.delete(id);
  return items;
}

export async function deleteSuspended(id: string): Promise<void> {
  await ensureInit();
  await db.suspendedOrders.delete(id);
}
