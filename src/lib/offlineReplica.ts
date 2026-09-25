// offlineReplica.ts — التخزين المؤقت المحلي (Local Offline Read Replica)
// يحتفظ بنسخة محلية فائقة السرعة للقراءة من جداول المنتجات، التصنيفات، العبوات، والعملاء
// تعمل فورياً (0ms) وتسمح للكاشير بمواصلة العمل والبيع حتى عند انقطاع كابل الشبكة

const REPLICA_DB_NAME = 'anpos_offline_replica';
const REPLICA_DB_VERSION = 1;

const STORES = ['products', 'categories', 'packs', 'customers', 'settings', 'sales', 'general'];

let dbInstance: IDBDatabase | null = null;
const memoryStore = new Map<string, Map<string, any>>();

/**
 * تهيئة قاعدة بيانات IndexedDB المحلية للتخزين المؤقت
 */
export async function getReplicaDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return null;
  }

  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(REPLICA_DB_NAME, REPLICA_DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
      };

      request.onsuccess = (event: any) => {
        dbInstance = event.target.result as IDBDatabase;
        resolve(dbInstance);
      };

      request.onerror = () => {
        console.warn('[offlineReplica] تعذر فتح IndexedDB، استخدام مخزن الذاكرة البديل');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

function getMemoryStore(table: string): Map<string, any> {
  const storeName = STORES.includes(table) ? table : 'general';
  if (!memoryStore.has(storeName)) {
    memoryStore.set(storeName, new Map());
  }
  return memoryStore.get(storeName)!;
}

/**
 * حفظ عنصر واحد في النسخة المحلية
 */
export async function saveReplicaItem(table: string, item: any): Promise<void> {
  if (!item) return;
  const storeName = STORES.includes(table) ? table : 'general';
  const id = String(item.id ?? item.key ?? item.docType ?? item.doc_type ?? 'default');
  const record = { ...item, id };

  // حفظ في الذاكرة أولاً
  getMemoryStore(storeName).set(id, record);

  const db = await getReplicaDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * حفظ مصفوفة عناصر دفعة واحدة في النسخة المحلية
 */
export async function saveReplicaBatch(table: string, items: any[]): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) return;
  const storeName = STORES.includes(table) ? table : 'general';

  const mem = getMemoryStore(storeName);
  for (const item of items) {
    if (!item) continue;
    const id = String(item.id ?? item.key ?? item.docType ?? item.doc_type ?? 'default');
    mem.set(id, { ...item, id });
  }

  const db = await getReplicaDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        if (!item) continue;
        const id = String(item.id ?? item.key ?? item.docType ?? item.doc_type ?? 'default');
        store.put({ ...item, id });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * استرجاع عنصر من النسخة المحلية
 */
export async function getReplicaItem(table: string, id: string): Promise<any | null> {
  const storeName = STORES.includes(table) ? table : 'general';
  const key = String(id);

  // فحص الذاكرة أولاً
  const fromMem = getMemoryStore(storeName).get(key);
  if (fromMem) return fromMem;

  const db = await getReplicaDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * سرد وتصفية العناصر من النسخة المحلية مع دعم البحث والترتيب والحد الأقصى
 */
export async function listReplicaItems(
  table: string,
  opts: {
    search?: string;
    filter?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDir?: 'ASC' | 'DESC' | 'asc' | 'desc';
  } = {}
): Promise<{ data: any[]; total: number }> {
  const storeName = STORES.includes(table) ? table : 'general';
  let allItems: any[] = [];

  const db = await getReplicaDb();
  if (db) {
    allItems = await new Promise<any[]>((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(Array.from(getMemoryStore(storeName).values()));
      } catch {
        resolve(Array.from(getMemoryStore(storeName).values()));
      }
    });
  } else {
    allItems = Array.from(getMemoryStore(storeName).values());
  }

  let filtered = allItems;

  // 1. تصفية الحقول (Filter)
  if (opts.filter && typeof opts.filter === 'object') {
    filtered = filtered.filter((item) => {
      for (const [k, v] of Object.entries(opts.filter!)) {
        if (v === undefined || v === null) continue;
        if (item[k] !== v) return false;
      }
      return true;
    });
  }

  // 2. البحث النصي (Search)
  if (opts.search && typeof opts.search === 'string') {
    const s = opts.search.trim().toLowerCase();
    filtered = filtered.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const barcode = String(item.barcode || '').toLowerCase();
      const sku = String(item.sku || '').toLowerCase();
      const phone = String(item.phone || '').toLowerCase();
      const num = String(item.number || '').toLowerCase();
      return name.includes(s) || barcode.includes(s) || sku.includes(s) || phone.includes(s) || num.includes(s);
    });
  }

  const total = filtered.length;

  // 3. الترتيب (Sorting)
  if (opts.orderBy) {
    const field = opts.orderBy;
    const isDesc = opts.orderDir?.toUpperCase() === 'DESC';
    filtered.sort((a, b) => {
      const valA = a[field] ?? '';
      const valB = b[field] ?? '';
      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });
  }

  // 4. التصفح (Pagination)
  const offset = Number(opts.offset) || 0;
  const limit = opts.limit !== undefined ? Number(opts.limit) : filtered.length;
  const paged = filtered.slice(offset, offset + limit);

  return { data: paged, total };
}

/**
 * حذف عنصر من النسخة المحلية
 */
export async function removeReplicaItem(table: string, id: string): Promise<void> {
  const storeName = STORES.includes(table) ? table : 'general';
  const key = String(id);

  getMemoryStore(storeName).delete(key);

  const db = await getReplicaDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * تفريغ جدول محلي بالكامل
 */
export async function clearReplicaTable(table: string): Promise<void> {
  const storeName = STORES.includes(table) ? table : 'general';
  getMemoryStore(storeName).clear();

  const db = await getReplicaDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * سحب وتحديث النسخة المحلية من الخادم بالكامل عند بدء الاتصال
 */
export async function syncReplicaPull(
  serverUrl: string,
  token: string,
  deviceId: string
): Promise<number> {
  if (!serverUrl) return 0;
  const cleanUrl = serverUrl.trim().replace(/\/+$/, '');

  try {
    const res = await fetch(`${cleanUrl}/api/sync/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-session-token': token,
        'x-device-id': deviceId,
      },
      body: JSON.stringify({ tables: ['products', 'categories', 'packs', 'customers', 'settings'] }),
    });

    if (!res.ok) return 0;
    const json = await res.json();
    if (!json?.data || typeof json.data !== 'object') return 0;

    let count = 0;
    for (const [table, rows] of Object.entries(json.data)) {
      if (Array.isArray(rows) && rows.length > 0) {
        await saveReplicaBatch(table, rows);
        count += rows.length;
      }
    }
    console.log(`[offlineReplica] 📦 تم سحب وتحديث النسخة المحلية: ${count} سجل`);
    return count;
  } catch (err) {
    console.warn('[offlineReplica] تعذر سحب التحديثات من الخادم:', err);
    return 0;
  }
}
