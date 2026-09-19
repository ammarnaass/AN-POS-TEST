// syncBridge.ts — جسر المزامنة الحي (SQLite ➔ React Query)
// يستمع لأحداث db:table-updated المنبعثة من Electron Main عبر IPC
// (التي تحدث عند أي كتابة في SQLite أو عند مزامنة تطبيق الموبايل).
// يقوم بإبطال كاش React Query بالتسلسل الصحيح مع دمج وتأخير زمني (debounce)
// لمنع حلقات التكرار اللانهائية (Infinite Loops) وتفادي إجهاد معالج العرض.

import type { QueryClient } from '@tanstack/react-query';

let isBridgeInitialized = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingTables = new Set<string>();

/**
 * دالة مساعدة مركزية لإبطال استعلامات React Query
 */
function invalidateQueriesForTable(qc: QueryClient | undefined, table?: string) {
  if (!qc) return;

  if (table) {
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
      qc.invalidateQueries({ queryKey: ['cashSessions'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
    } else if (table === 'cash_sessions' || table === 'cash_transactions') {
      qc.invalidateQueries({ queryKey: ['cash_sessions'] });
      qc.invalidateQueries({ queryKey: ['cashSessions'] });
      qc.invalidateQueries({ queryKey: ['cash'] });
    } else if (table === 'users' || table === 'roles') {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['roles'] });
    } else if (table === 'customers') {
      qc.invalidateQueries({ queryKey: ['customers'] });
    } else if (table === 'suppliers') {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    }
  } else {
    qc.invalidateQueries();
  }
}

/**
 * تنفيذ إبطال الكاش المجمّع لمنع تكرار التحديثات
 */
function flushPendingInvalidations(qc: QueryClient | undefined) {
  if (!qc || pendingTables.size === 0) return;

  const tables = Array.from(pendingTables);
  pendingTables.clear();

  for (const table of tables) {
    invalidateQueriesForTable(qc, table);
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
  console.log('[syncBridge] 🚀 بدء تشغيل جسر المزامنة الحي (SQLite ➔ React Query)');

  // الاستماع المستمر لتحديثات الجداول (المستمع الموحد الوحيد)
  // ملاحظة حرجة: لا يتم استدعاء db.put أو db.delete هنا إطلاقاً، لأن db هو Proxy يكتب مباشرة إلى SQLite!
  // أي كتابة هنا ستؤدي إلى حلقة تكرار لانهائية (Infinite IPC Ping-Pong Loop) وتجميد المتصفح.
  const unsubscribe = api.db.onTableUpdated((payload: { table?: string; action?: string; id?: string }) => {
    try {
      const table = payload?.table;
      if (!table) {
        invalidateQueriesForTable(queryClient, undefined);
        return;
      }

      pendingTables.add(table);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        flushPendingInvalidations(queryClient);
      }, 50);
    } catch (bridgeErr) {
      console.warn('[syncBridge] خطأ أثناء معالجة إشعار تحديث الجدول:', bridgeErr);
    }
  });

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    pendingTables.clear();
    if (typeof unsubscribe === 'function') unsubscribe();
    isBridgeInitialized = false;
  };
}

