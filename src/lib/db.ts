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
async function waitForAPI(timeoutMs?: number): Promise<any> {
  if (_apiCache) return _apiCache;
  const cached = getElectronAPIDb();
  if (cached) { _apiCache = cached; return cached; }

  const isTest = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test');
  const actualTimeout = timeoutMs ?? (isTest ? 100 : 10000);

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
      while (Date.now() - start < actualTimeout && !cancelled) {
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

const snakeCache = new Map<string, string>();
const camelCache = new Map<string, string>();

export function getSnakeKey(k: string): string {
  let res = snakeCache.get(k);
  if (!res) {
    if (k === 'companyRC') res = 'company_rc';
    else if (k === 'companyNif' || k === 'companyNIF') res = 'company_nif';
    else if (k === 'companyArt' || k === 'companyART') res = 'company_art';
    else if (k === 'companyAI') res = 'company_ai';
    else res = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    snakeCache.set(k, res);
  }
  return res;
}

export function getCamelKey(k: string): string {
  let res = camelCache.get(k);
  if (!res) {
    if (k === 'company_rc') res = 'companyRC';
    else if (k === 'company_nif') res = 'companyNif';
    else if (k === 'company_art') res = 'companyArt';
    else if (k === 'company_ai') res = 'companyAI';
    else res = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    camelCache.set(k, res);
  }
  return res;
}

/**
 * تحويل camelCase → snake_case لأسماء الأعمدة عند الإرسال
 * (الواجهة تستخدم camelCase، SQLite يستخدم snake_case)
 */
function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[getSnakeKey(k)] = v;
  }
  return result;
}

/**
 * تحويل snake_case → camelCase للصفوف المستلمة
 */
function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[getCamelKey(k)] = v;
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
      if (typeof api.bulkCreate === 'function') {
        await api.bulkCreate(table, items.map(toSnake));
      } else {
        await Promise.all(items.map((i) => api.create(table, toSnake(i))));
      }
    },

    bulkPut: async (items: Record<string, unknown>[]) => {
      const api = await waitForAPI();
      if (typeof api.bulkUpdate === 'function') {
        await api.bulkUpdate(table, items.map(toSnake));
      } else {
        await Promise.all(items.map((i) => api.update(table, i.id as string, toSnake(i))));
      }
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
      if (typeof api.count === 'function') {
        const res = await api.count(table);
        return typeof res?.count === 'number' ? res.count : 0;
      }
      const res = await api.list(table);
      return res.data.length;
    },

    where: (field: string) => ({
      equals: (value: unknown) => ({
        first: async () => {
          const api = await waitForAPI();
          const snakeField = getSnakeKey(field);
          const res = await api.list(table, { filter: { [snakeField]: value }, limit: 1 });
          if (res?.data && res.data.length > 0) {
            return toCamel(res.data[0]);
          }
          return undefined;
        },
        toArray: async () => {
          const api = await waitForAPI();
          const snakeField = getSnakeKey(field);
          const res = await api.list(table, { filter: { [snakeField]: value } });
          return res.data.map(toCamel);
        },
      }),
      notEqual: (value: unknown) => ({
        toArray: async () => {
          const api = await waitForAPI();
          const snakeField = getSnakeKey(field);
          const res = await api.list(table, { filter: { [snakeField]: { $ne: value } } });
          return res.data.map(toCamel);
        },
      }),
      anyOf: (values: unknown[]) => ({
        toArray: async () => {
          const api = await waitForAPI();
          const snakeField = getSnakeKey(field);
          const res = await api.list(table, { filter: { [snakeField]: values } });
          return res.data.map(toCamel);
        },
      }),
    }),

    orderBy: (field: string) => {
      const snakeField = getSnakeKey(field);
      return {
        reverse: () => ({
          limit: (n: number) => ({
            toArray: async () => {
              const api = await waitForAPI();
              const res = await api.list(table, { orderBy: snakeField, orderDir: 'DESC', limit: n });
              return res.data.map(toCamel);
            },
          }),
          toArray: async () => {
            const api = await waitForAPI();
            const res = await api.list(table, { orderBy: snakeField, orderDir: 'DESC' });
            return res.data.map(toCamel);
          },
        }),
        toArray: async () => {
          const api = await waitForAPI();
          const res = await api.list(table, { orderBy: snakeField, orderDir: 'ASC' });
          return res.data.map(toCamel);
        },
      };
    },

    bulkGet: async (ids: string[]) => {
      if (!ids || ids.length === 0) return [];
      const api = await waitForAPI();
      if (typeof api.bulkGet === 'function') {
        const res = await api.bulkGet(table, ids);
        return (res?.data || []).map(toCamel);
      }
      const res = await api.list(table, { filter: { id: ids } });
      return (res?.data || []).map(toCamel);
    },

    clear: async () => {
      const api = await waitForAPI();
      if (typeof api.clear === 'function') {
        await api.clear(table);
      } else {
        const res = await api.list(table);
        await Promise.all(res.data.map((r: Record<string, unknown>) => api.remove(table, r.id)));
      }
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
