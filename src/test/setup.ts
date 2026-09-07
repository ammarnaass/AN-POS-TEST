import '@testing-library/jest-dom/vitest';

// jsdom لا يوفر ResizeObserver — @dnd-kit/dom يحتاجه عبر ResizeNotifier
if (typeof globalThis.ResizeObserver === 'undefined') {
  // @ts-expect-error polyfill for jsdom
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom لا يوفر matchMedia — نحتاجه لتطبيقات RTL
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// crypto.randomUUID متوفر في معظم بيئات الاختبار لكن نضمنه
if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error polyfill for old environments
  globalThis.crypto = {};
}
if (typeof globalThis.crypto.randomUUID !== 'function') {
  // @ts-expect-error polyfill for old environments
  globalThis.crypto.randomUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
}

// توفير electronAPI mock متزامن لبيئة الاختبار (Vitest / JSDOM)
if (typeof window !== 'undefined') {
  const store: Record<string, Map<string, any>> = {};
  function getTable(table: string) {
    if (!store[table]) store[table] = new Map();
    return store[table];
  }

  function matchesFilter(row: any, filter?: Record<string, unknown>): boolean {
    if (!filter) return true;
    for (const [key, val] of Object.entries(filter)) {
      const rowVal = row[key];
      if (val !== null && typeof val === 'object' && '$ne' in (val as any)) {
        if (rowVal === (val as any).$ne) return false;
      } else if (Array.isArray(val)) {
        if (!val.includes(rowVal)) return false;
      } else {
        if (rowVal !== val) return false;
      }
    }
    return true;
  }

  (window as any).electronAPI = {
    db: {
      list: async (table: string, opts?: { filter?: Record<string, unknown>; limit?: number; orderBy?: string; orderDir?: string }) => {
        let rows = Array.from(getTable(table).values());
        if (opts?.filter) {
          rows = rows.filter((r) => matchesFilter(r, opts.filter));
        }
        if (opts?.limit && opts.limit > 0) {
          rows = rows.slice(0, opts.limit);
        }
        return { data: rows };
      },
      get: async (table: string, id: string) => ({ data: getTable(table).get(id) || null }),
      create: async (table: string, data: any) => {
        const id = data.id || data.doc_type || data.docType || data.key || globalThis.crypto.randomUUID();
        const row = { ...data, id };
        getTable(table).set(id, row);
        return { data: row };
      },
      update: async (table: string, id: string, data: any) => {
        const existing = getTable(table).get(id) || {};
        const updated = { ...existing, ...data, id };
        getTable(table).set(id, updated);
        return { data: updated };
      },
      remove: async (table: string, id: string) => {
        getTable(table).delete(id);
        return { success: true };
      },
      bulkCreate: async (table: string, items: any[]) => {
        items.forEach((it) => {
          const id = it.id || it.doc_type || it.docType || it.key || globalThis.crypto.randomUUID();
          getTable(table).set(id, { ...it, id });
        });
        return { count: items.length };
      },
      bulkUpdate: async (table: string, items: any[]) => {
        items.forEach((it) => {
          const id = it.id || it.doc_type || it.docType || it.key;
          if (id) {
            const existing = getTable(table).get(id) || {};
            getTable(table).set(id, { ...existing, ...it });
          }
        });
        return { count: items.length };
      },
      clear: async (table: string) => {
        getTable(table).clear();
      },
      clearAll: async () => {
        Object.keys(store).forEach((t) => getTable(t).clear());
      },
      onTableUpdated: () => () => {},
    },
    products: {
      list: async () => ({ data: Array.from(getTable('products').values()) }),
      get: async (id: string) => ({ data: getTable('products').get(id) || null }),
      getByBarcode: async (barcode: string) => {
        const found = Array.from(getTable('products').values()).find((p: any) => p.barcode === barcode);
        return { data: found || null };
      },
      create: async (data: any) => {
        const id = data.id || globalThis.crypto.randomUUID();
        const row = { ...data, id };
        getTable('products').set(id, row);
        return { data: row };
      },
      update: async (id: string, data: any) => {
        const existing = getTable('products').get(id) || {};
        const updated = { ...existing, ...data, id };
        getTable('products').set(id, updated);
        return { data: updated };
      },
      delete: async (id: string) => {
        getTable('products').delete(id);
        return { success: true };
      },
      remove: async (id: string) => {
        getTable('products').delete(id);
        return { success: true };
      },
    },
    packs: {
      list: async () => ({ data: Array.from(getTable('packs').values()) }),
      get: async (id: string) => ({ data: getTable('packs').get(id) || null }),
      getByBarcode: async (barcode: string) => {
        const found = Array.from(getTable('packs').values()).find((p: any) => p.barcode === barcode);
        return { data: found || null };
      },
      create: async (data: any) => {
        const id = data.id || globalThis.crypto.randomUUID();
        const row = { ...data, id };
        getTable('packs').set(id, row);
        return { data: row };
      },
      update: async (id: string, data: any) => {
        const existing = getTable('packs').get(id) || {};
        const updated = { ...existing, ...data, id };
        getTable('packs').set(id, updated);
        return { data: updated };
      },
      delete: async (id: string) => {
        getTable('packs').delete(id);
        return { success: true };
      },
      remove: async (id: string) => {
        getTable('packs').delete(id);
        return { success: true };
      },
    },
  };
}

