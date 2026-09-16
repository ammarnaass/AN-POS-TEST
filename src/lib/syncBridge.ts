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
          await db.products.delete(id);
          console.log(`[syncBridge] 🗑️ حذف منتج من كاش Dexie: ${id}`);
        } else if (id && api.products?.get) {
          const res = await api.products.get(id);
          if (res?.data) {
            await db.products.put(res.data as any);
            console.log(`[syncBridge] 📦 مزامنة منتج إلى كاش Dexie: ${res.data.name || id}`);
          }
        } else if (api.products?.list) {
          // تحديث شامل إذا لم يكن هناك معرف محدد
          const res = await api.products.list();
          if (Array.isArray(res?.data) && res.data.length > 0) {
            await db.products.bulkPut(res.data as any);
          }
        }
      }

      // ===== 2. جدول العبوات والباقات (packs) =====
      else if (table === 'packs') {
        if (action === 'delete' && id) {
          await db.packs.delete(id);
          console.log(`[syncBridge] 🗑️ حذف عبوة من كاش Dexie: ${id}`);
        } else if (id && api.packs?.get) {
          const res = await api.packs.get(id);
          if (res?.data) {
            await db.packs.put(res.data as any);
            console.log(`[syncBridge] 📦 مزامنة عبوة إلى كاش Dexie: ${res.data.name || id}`);
          }
        } else if (api.packs?.list) {
          const res = await api.packs.list();
          if (Array.isArray(res?.data) && res.data.length > 0) {
            await db.packs.bulkPut(res.data as any);
          }
        }
      }

      // ===== 3. جدول الفئات (categories) =====
      else if (table === 'categories') {
        if (action === 'delete' && id) {
          await db.categories.delete(id);
        } else if (id && api.categories?.get) {
          const res = await api.categories.get(id);
          if (res?.data) {
            await db.categories.put(res.data as any);
          }
        }
        if (api.categories?.list) {
          const res = await api.categories.list();
          if (Array.isArray(res?.data) && res.data.length > 0) {
            await db.categories.bulkPut(res.data as any);
          }
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

      // بعد اكتمال تحديث Dexie بنجاح (أو للجداول التي لا تحتاج Dexie مثل sales/settings)
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
 * مزامنة مبدئية لملء كاش Dexie من SQLite عند بدء التشغيل
 */
async function initialHydrate(api: any): Promise<void> {
  try {
    const dexieProdCount = await db.products.count();
    const dexiePackCount = await db.packs.count();

    // فحص منتجات SQLite
    if (api.products?.list) {
      const pRes = await api.products.list({ limit: 5000 });
      if (Array.isArray(pRes?.data) && pRes.data.length > 0) {
        if (dexieProdCount < pRes.data.length) {
          console.log(`[syncBridge] 📥 مزامنة مبدئية لـ ${pRes.data.length} منتج من SQLite إلى Dexie`);
          await db.products.bulkPut(pRes.data as any);
        }
      }
    }

    // فحص عبوات SQLite
    if (api.packs?.list) {
      const pkRes = await api.packs.list({ limit: 1000 });
      if (Array.isArray(pkRes?.data) && pkRes.data.length > 0) {
        if (dexiePackCount < pkRes.data.length) {
          console.log(`[syncBridge] 📥 مزامنة مبدئية لـ ${pkRes.data.length} عبوة من SQLite إلى Dexie`);
          await db.packs.bulkPut(pkRes.data as any);
        }
      }
    }
  } catch (err) {
    console.warn('[syncBridge] initialHydrate non-critical warning:', err);
  }
}
