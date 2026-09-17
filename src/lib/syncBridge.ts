// syncBridge.ts — جسر المزامنة الحي بالاتجاهين (SQLite ↔ Dexie ↔ React Query)
// يستمع لأحداث db:table-updated المنبعثة من Electron Main عبر IPC
// (التي تحدث عندما يرسل تطبيق الموبايل بيانات عبر /api/sync/push أو عند أي كتابة في SQLite).
// يقوم بتحديث كاش Dexie فوراً، ثم إبطال كاش React Query بالتسلسل الصحيح لضمان ظهور البيانات الحديثة دائماً.

import { db } from '@/infrastructure/database/dexie/db';
import type { QueryClient } from '@tanstack/react-query';

let isBridgeInitialized = false;

/**
 * دالة مساعدة مركزية لإبطال استعلامات React Query بعد اكتمال المزامنة في Dexie
 * تحتفظ بنفس منطق المفاتيح بالكامل لمنع أي تعارض أو قراءة بيانات قديمة
 */
function invalidateQueriesForTable(qc: QueryClient | undefined, table?: string) {
  if (!qc) return;

  if (table) {
    // تحديث فوري لكافة الكويريز المرتبطة بالجدول المعدل
    qc.invalidateQueries({ queryKey: [table] });

    if (table === 'settings') {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['network_settings'] });
    } else if (table === 'products' || table === 'categories') {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    } else if (table === 'packs') {
      qc.invalidateQueries({ queryKey: ['packs'] });
    } else if (table === 'sales' || table === 'sales_items') {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['cash_sessions'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    } else if (table === 'cash_sessions' || table === 'cash_transactions') {
      qc.invalidateQueries({ queryKey: ['cash_sessions'] });
      qc.invalidateQueries({ queryKey: ['cash'] });
    } else if (table === 'users' || table === 'roles') {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['roles'] });
    }
  } else {
    qc.invalidateQueries();
  }
}

/**
 * بدء تشغيل جسر المزامنة الحي الموحد
 */
export function initSyncBridge(queryClient?: QueryClient): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isBridgeInitialized) return () => {};

  const api = (window as any).electronAPI;
  if (!api?.db?.onTableUpdated) {
    console.log('[syncBridge] Electron IPC غير متاح (وضع المتصفح)');
    return () => {};
  }

  isBridgeInitialized = true;
  console.log('[syncBridge] 🚀 بدء تشغيل جسر المزامنة الحي الموحد (SQLite ↔ Dexie ↔ React Query)');

  // مزامنة مبدئية سريعة عند الإقلاع
  initialHydrate(api)
    .then(() => {
      if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['packs'] });
      }
    })
    .catch((err) => {
      console.warn('[syncBridge] خطأ في المزامنة المبدئية:', err);
    });

  // الاستماع المستمر لتحديثات الجداول (المستمع الموحد الوحيد)
  const unsubscribe = api.db.onTableUpdated(async (payload: { table?: string; action?: string; id?: string }) => {
    try {
      const table = payload?.table;
      const action = payload?.action || 'update';
      const id = payload?.id;

      if (!table) {
        invalidateQueriesForTable(queryClient, undefined);
        return;
      }

      // ===== 1. جدول المنتجات (products) =====
      if (table === 'products') {
        if (action === 'delete' && id) {
          await db.products.delete(id).catch(() => {});
        }
      }

      // ===== 2. جدول العبوات والباقات (packs) =====
      else if (table === 'packs') {
        if (action === 'delete' && id) {
          await db.packs.delete(id).catch(() => {});
        }
      }

      // ===== 3. جدول الفئات (categories) =====
      else if (table === 'categories') {
        if (action === 'delete' && id) {
          await db.categories.delete(id).catch(() => {});
        }
      }

      // ===== 4. جدول العملاء (customers) =====
      else if (table === 'customers' && id && api.db?.get) {
        if (action === 'delete') {
          await db.customers.delete(id);
        } else {
          const res = await api.db.get('customers', id);
          if (res?.data) {
            await db.customers.put(res.data as any);
          }
        }
      }

      // ===== 5. جدول الموردين (suppliers) =====
      else if (table === 'suppliers' && id && api.db?.get) {
        if (action === 'delete') {
          await db.suppliers.delete(id);
        } else {
          const res = await api.db.get('suppliers', id);
          if (res?.data) {
            await db.suppliers.put(res.data as any);
          }
        }
      }

      // ===== 6. جدول الجلسات النقدية (cash_sessions) =====
      else if (table === 'cash_sessions' && id && api.db?.get) {
        if (action === 'delete') {
          await db.cash_sessions.delete(id);
        } else {
          const res = await api.db.get('cash_sessions', id);
          if (res?.data) {
            await db.cash_sessions.put(res.data as any);
          }
        }
      }

      // ===== 7. جدول المبيعات (sales) =====
      else if (table === 'sales') {
        if (action === 'delete' && id) {
          await db.sales.delete(id);
          console.log(`[syncBridge] 🗑️ حذف فاتورة من كاش Dexie: ${id}`);
        } else if (id && api.sales?.get) {
          const res = await api.sales.get(id);
          if (res?.data) {
            await db.sales.put(res.data as any);
            console.log(`[syncBridge] 🧾 مزامنة فاتورة إلى كاش Dexie: ${res.data.number || id}`);
          }
        }
      }

      // بعد اكتمال تحديث Dexie بنجاح
      invalidateQueriesForTable(queryClient, table);
    } catch (bridgeErr) {
      console.warn('[syncBridge] خطأ أثناء تطبيق تحديث الجدول:', bridgeErr);
      if (payload?.table) {
        invalidateQueriesForTable(queryClient, payload.table);
      }
    }
  });

  return () => {
    if (typeof unsubscribe === 'function') unsubscribe();
    isBridgeInitialized = false;
  };
}

/**
 * مزامنة مبدئية عند بدء التشغيل
 */
async function initialHydrate(_api: any): Promise<void> {
  // SQLite هو مصدر الحقيقة المركزي المباشر عبر IPC shim
  return Promise.resolve();
}
