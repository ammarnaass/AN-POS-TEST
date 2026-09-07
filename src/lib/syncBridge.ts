// syncBridge.ts — جسر المزامنة الحي بالاتجاهين (SQLite ↔ Dexie)
// يستمع لأحداث db:table-updated المنبعثة من Electron Main عبر IPC
// (التي تحدث عندما يرسل تطبيق الموبايل بيانات عبر /api/sync/push أو عند أي كتابة في SQLite).
// يقوم بتحديث كاش Dexie فوراً لضمان ظهور البيانات في كل واجهات الديسكتوب المتصلة بـ Dexie.

import { db } from '@/infrastructure/database/dexie/db';

let isBridgeInitialized = false;

/**
 * بدء تشغيل جسر المزامنة الحي
 */
export function initSyncBridge(): () => void {
  if (typeof window === 'undefined') return () => {};
  if (isBridgeInitialized) return () => {};

  const api = (window as any).electronAPI;
  if (!api?.db?.onTableUpdated) {
    console.log('[syncBridge] Electron IPC غير متاح (وضع المتصفح)');
    return () => {};
  }

  isBridgeInitialized = true;
  console.log('[syncBridge] 🚀 بدء تشغيل جسر المزامنة الحي (SQLite ↔ Dexie)');

  // مزامنة مبدئية سريعة عند الإقلاع
  initialHydrate(api).catch((err) => {
    console.warn('[syncBridge] خطأ في المزامنة المبدئية:', err);
  });

  // الاستماع المستمر لتحديثات الجداول
  const unsubscribe = api.db.onTableUpdated(async (payload: { table?: string; action?: string; id?: string }) => {
    try {
      const table = payload?.table;
      const action = payload?.action || 'update';
      const id = payload?.id;

      if (!table) return;

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
      if (table === 'packs') {
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
      if (table === 'categories') {
        if (action === 'delete' && id) {
          await db.categories.delete(id);
        } else if (id && api.categories?.get) {
          const res = await api.categories.get(id);
          if (res?.data) {
            await db.categories.put(res.data as any);
          }
        }
      }

      // ===== 4. جدول العملاء (customers) =====
      if (table === 'customers' && id && api.db?.get) {
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
      if (table === 'suppliers' && id && api.db?.get) {
        if (action === 'delete') {
          await db.suppliers.delete(id);
        } else {
          const res = await api.db.get('suppliers', id);
          if (res?.data) {
            await db.suppliers.put(res.data as any);
          }
        }
      }
    } catch (bridgeErr) {
      console.warn('[syncBridge] خطأ أثناء تطبيق تحديث الجدول:', bridgeErr);
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
