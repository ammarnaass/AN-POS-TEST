// طبقة بيانات الواجهة — Proxy shim يحاكي واجهة Dexie لكن يستدعي IPC
// يحل محل import { db } from '@/infrastructure/database/dexie/db'
// الهدف: تقليل تغييرات ~43 ملف مستهلك — كلها تستمر بالعمل عبر هذا الـ shim

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _apiCache: any = null;

function getElectronAPIDb(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).electronAPI?.db;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function waitForAPI(timeoutMs = 10000): Promise<any> {
  if (_apiCache) return _apiCache;
  const cached = getElectronAPIDb();
  if (cached) { _apiCache = cached; return cached; }

  return new Promise<any>((resolve, reject) => {
    const start = Date.now();

    const handler = () => {
      document.removeEventListener('electronapi-ready', handler);
      const api = getElectronAPIDb();
      if (api) { _apiCache = api; resolve(api); return; }
    };
    document.addEventListener('electronapi-ready', handler);

    let cancelled = false;
    (async () => {
      while (Date.now() - start < timeoutMs && !cancelled) {
        const api = getElectronAPIDb();
        if (api) {
          cancelled = true;
          document.removeEventListener('electronapi-ready', handler);
          _apiCache = api;
          resolve(api);
          return;
        }
        await new Promise(r => setTimeout(r, 50));
      }
      if (!cancelled) {
        cancelled = true;
        document.removeEventListener('electronapi-ready', handler);
        reject(new Error('Electron API غير متاح — تأكد من تشغيل التطبيق عبر Electron (npm run dev)'));
      }
    })();
  });
}

/**
 * تحويل camelCase → snake_case لأسماء الأعمدة عند الإرسال
 * (الواجهة تستخدم camelCase، SQLite يستخدم snake_case)
 */
function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    let snakeKey: string;
    if (k === 'companyRC') snakeKey = 'company_rc';
    else if (k === 'companyNif' || k === 'companyNIF') snakeKey = 'company_nif';
    else if (k === 'companyArt' || k === 'companyART') snakeKey = 'company_art';
    else if (k === 'companyAI') snakeKey = 'company_ai';
    else snakeKey = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = v;
  }
  return result;
}

/**
 * تحويل snake_case → camelCase للصفوف المستلمة
 */
function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    let camelKey: string;
    if (k === 'company_rc') camelKey = 'companyRC';
    else if (k === 'company_nif') camelKey = 'companyNif';
    else if (k === 'company_art') camelKey = 'companyArt';
    else if (k === 'company_ai') camelKey = 'companyAI';
    else camelKey = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = v;
  }
  return result;
}

/**
 * واجهة استعلام Dexie المقلدة
 * يدعم: toArray(), get(id), add(obj), put(obj), bulkAdd([]), bulkPut([]),
 *       update(id, patch), delete(id), count(),
 *       where(field).equals(val).first() / .toArray(),
 *       orderBy(field).reverse().limit(n).toArray() / .toArray()
 */
function createTableProxy(table: string) {
  return {
    toArray: async () => {
      const api = await waitForAPI();
      const res = await api.list(table);
      return res.data.map(toCamel);
    },

    get: async (id: string) => {
      const api = await waitForAPI();
      const res = await api.get(table, id);
      return res?.data ? toCamel(res.data) : undefined;
    },

    add: async (obj: Record<string, unknown>) => {
      const api = await waitForAPI();
      const res = await api.create(table, toSnake(obj));
      return res?.data ? toCamel(res.data) : undefined;
    },

    put: async (obj: Record<string, unknown>) => {
      const api = await waitForAPI();
      const res = await api.update(table, obj.id as string, toSnake(obj));
      return res?.data ? toCamel(res.data) : undefined;
    },

    bulkAdd: async (items: Record<string, unknown>[]) => {
      const api = await waitForAPI();
      await Promise.all(items.map((i) => api.create(table, toSnake(i))));
    },

    bulkPut: async (items: Record<string, unknown>[]) => {
      const api = await waitForAPI();
      await Promise.all(items.map((i) => api.update(table, i.id as string, toSnake(i))));
    },

    update: async (id: string, patch: Record<string, unknown>) => {
      const api = await waitForAPI();
      const res = await api.update(table, id, toSnake(patch));
      return res?.data ? toCamel(res.data) : undefined;
    },

    delete: async (id: string) => {
      const api = await waitForAPI();
      await api.remove(table, id);
    },

    count: async () => {
      const api = await waitForAPI();
      const res = await api.list(table);
      return res.data.length;
    },

    where: (field: string) => ({
      equals: (value: unknown) => ({
        first: async () => {
          const api = await waitForAPI();
          const res = await api.list(table);
          const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          const row = res.data.find((r: Record<string, unknown>) => r[snakeField] === value);
          return row ? toCamel(row) : undefined;
        },
        toArray: async () => {
          const api = await waitForAPI();
          const res = await api.list(table);
          const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          return res.data
            .filter((r: Record<string, unknown>) => r[snakeField] === value)
            .map(toCamel);
        },
      }),
      notEqual: (value: unknown) => ({
        toArray: async () => {
          const api = await waitForAPI();
          const res = await api.list(table);
          const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          return res.data
            .filter((r: Record<string, unknown>) => r[snakeField] !== value)
            .map(toCamel);
        },
      }),
      anyOf: (values: unknown[]) => ({
        toArray: async () => {
          const api = await waitForAPI();
          const res = await api.list(table);
          const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
          const set = new Set(values);
          return res.data
            .filter((r: Record<string, unknown>) => set.has(r[snakeField]))
            .map(toCamel);
        },
      }),
    }),

    orderBy: (field: string) => {
      const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
      const sortAsc = (rows: Record<string, unknown>[]) =>
        [...rows].sort((a, b) => {
          const av = a[snakeField] as string | number;
          const bv = b[snakeField] as string | number;
          if (av < bv) return -1;
          if (av > bv) return 1;
          return 0;
        });
      const sortDesc = (rows: Record<string, unknown>[]) => sortAsc(rows).reverse();

      return {
        reverse: () => ({
          limit: (n: number) => ({
            toArray: async () => {
              const api = await waitForAPI();
              const res = await api.list(table);
              return sortDesc(res.data).slice(0, n).map(toCamel);
            },
          }),
          toArray: async () => {
            const api = await waitForAPI();
            const res = await api.list(table);
            return sortDesc(res.data).map(toCamel);
          },
        }),
        toArray: async () => {
          const api = await waitForAPI();
          const res = await api.list(table);
          return sortAsc(res.data).map(toCamel);
        },
      };
    },

    bulkGet: async (ids: string[]) => {
      const api = await waitForAPI();
      const res = await api.list(table);
      const set = new Set(ids);
      return res.data
        .filter((r: Record<string, unknown>) => set.has(r.id))
        .map(toCamel);
    },

    clear: async () => {
      const api = await waitForAPI();
      const res = await api.list(table);
      await Promise.all(res.data.map((r: Record<string, unknown>) => api.remove(table, r.id)));
    },
  };
}

/**
 * الـ db Proxy — يحاكي Dexie's db.<table>
 * db.products.toArray(), db.sales.get(id), إلخ
 * db.transaction('rw', [t1, t2], async () => {...}) — يحاكي Dexie transactions بـ execution متسلسل
 *
 * ملاحظة: IPC/SQLite لا يدعم transactions موزّعة عبر الـ shim، لذا هذا يُحاكيها فقط —
 * يُنفّذ الـ callback بشكل متسلسل. هذا كافٍ لأن جميع المستهلكين يستخدمون النمط
 * التسلسلي: db.transaction('rw', [...], async () => { await db.X.add(...); ... }).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = new Proxy({} as any, {
  get(_target, prop: string) {
    if (typeof prop !== 'string') return undefined;
    // transaction(mode, tables, callback) — يحاكي Dexie. نتجاهل mode/tables ونُنفّذ الـ callback
    // متسلسلاً، ثم نُرجع Promise يُحاكي Dexie's Transaction (يُدعم .then/.catch).
    if (prop === 'transaction') {
      // متوافق مع نمطَي Dexie:
      //   db.transaction('rw', [db.x, db.y], async () => {...})   // tables كمصفوفة
      //   db.transaction('rw', db.x, db.y, async () => {...})      // tables كـ args متعددة
      // ونُرجع Promise يحاكي Dexie's Transaction (يُدعم .then/.catch فقط — لا يحتاج التطبيق النمط المتقدم).
      return (mode: string, ...rest: unknown[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cb = rest[rest.length - 1] as (...args: any[]) => unknown | Promise<unknown>;
        try {
          return Promise.resolve(cb());
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          return Promise.reject(e);
        }
      };
    }
    if (prop === 'open' || prop === 'close' || prop === 'delete') {
      return async () => {};
    }
    return createTableProxy(prop);
  },
});
