// Print Queue Sweep — POS-PRINT-001 Phase 2
// TTL sweep: حذف تلقائي للمهام المعلّقة بعد 24 ساعة
// BR-004: الفاتورة المؤجلة تحتفظ في الطابور لمدة أقصاها 24 ساعة
// BR-005: حذف الطلبات المعلقة تلقائياً بعد 24 ساعة
import { db } from '@/infrastructure/database/dexie/db';

// 24 ساعة بالمللي ثانية
export const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * نظافة الطابور — يحذف المهام pending بعمر > 24h (BR-004/005)
 * @returns عدد المهام المحذوفة
 */
export async function sweepPendingJobs(): Promise<number> {
  const pending = await db.print_jobs
    .where('status').equals('pending')
    .toArray();

  const now = Date.now();
  const stale = pending.filter((j) => {
    const created = new Date(j.createdAt).getTime();
    return (now - created) > TTL_MS;
  });

  if (stale.length === 0) return 0;

  const staleIds = stale.map((j) => j.id);
  await db.print_jobs.bulkDelete(staleIds);
  return stale.length;
}

/**
 * نظافة شاملة — تحذف أيضاً النهائيات القديمة (success/failed/cancelled) > 24h
 * للحفاظ على حجم الطابور صغيراً
 * @returns عدد المهام المحذوفة
 */
export async function sweepAllStaleJobs(): Promise<number> {
  const all = await db.print_jobs.toArray();
  const now = Date.now();
  const stale = all.filter((j) => {
    if (j.status === 'pending' || j.status === 'printing') return false;
    const ref = j.processedAt ?? j.createdAt;
    return (now - new Date(ref).getTime()) > TTL_MS;
  });

  if (stale.length === 0) return 0;
  await db.print_jobs.bulkDelete(stale.map((j) => j.id));
  return stale.length;
}
