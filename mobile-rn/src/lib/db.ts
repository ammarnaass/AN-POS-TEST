import { db as unifiedDB, getStoredMode, setStoredMode, type AppMode } from '@/infrastructure/database/UnifiedDB';
import type { Product, Sale, Customer, Supplier, User } from '@shared/types';

let initPromise: Promise<void> | null = null;
let isInitialized = false;

export async function ensureInit(): Promise<void> {
  if (!isInitialized) {
    if (!initPromise) {
      initPromise = unifiedDB.init().then(() => {
        isInitialized = true;
      }).catch((err) => {
        initPromise = null;
        throw err;
      });
    }
    await initPromise;
  }
}

export const db = new Proxy({} as any, {
  get(_target: any, prop: string) {
    if (typeof prop !== 'string') return undefined;
    const tableName = TABLE_ALIASES[prop] || prop;
    return createTableProxy(tableName);
  },
});

const TABLE_ALIASES: Record<string, string> = {
  products: 'products',
  categories: 'categories',
  customers: 'customers',
  suppliers: 'suppliers',
  sales: 'sales',
  saleItems: 'sale_items',
  purchases: 'purchases',
  purchaseItems: 'purchase_items',
  expenses: 'expenses',
  users: 'users',
  roles: 'roles',
  cashSessions: 'cash_sessions',
  promotions: 'promotions',
  packs: 'packs',
  payments: 'payments',
  printTemplates: 'print_templates',
  printers: 'printers',
  settings: 'settings',
  warehouses: 'warehouses',
  stockMovements: 'stock_movements',
  stockMovementsV2: 'stock_movements_v2',
  stockMovementLines: 'stock_movement_lines',
  inventoryCounts: 'inventory_counts',
  inventoryCountLines: 'inventory_count_lines',
  suspendedOrders: 'suspended_orders',
  capitalEntries: 'capital_entries',
  networkSettings: 'network_settings',
  connectedDevices: 'connected_devices',
  productBarcodes: 'product_barcodes',
  barcodePrints: 'barcode_prints',
  auditLogs: 'audit_logs',
  userActivities: 'user_activities',
  supplierEntries: 'supplier_entries',
  printHistory: 'print_history',
  printJobs: 'print_jobs',
  templateAssignments: 'template_assignments',
  printerTemplateMappings: 'printer_template_mappings',
  printFailureCounter: 'print_failure_counter',
  syncQueue: 'sync_queue',
};

type TableProxy = {
  toArray: () => Promise<any[]>;
  get: (id: string) => Promise<any | null>;
  add: (data: any) => Promise<any>;
  put: (data: any) => Promise<any>;
  update: (id: string, data: any) => Promise<boolean>;
  delete: (id: string) => Promise<boolean>;
  count?: () => Promise<number>;
  where?: (field: string) => {
    equals: (val: unknown) => {
      toArray: () => Promise<any[]>;
      first: () => Promise<any | undefined>;
      count: () => Promise<number>;
    };
    first: () => Promise<any | undefined>;
  };
  orderBy?: (field: string) => {
    reverse: () => { limit: (n: number) => Promise<any[]> };
  };
  filter?: (fn: (row: any) => boolean) => {
    toArray: () => Promise<any[]>;
    first: () => Promise<any | undefined>;
    count: () => Promise<number>;
  };
  bulkAdd?: (records: any[]) => Promise<void>;
  bulkPut?: (records: any[]) => Promise<void>;
};

function createTableProxy(table: string): TableProxy {
  return {
    toArray: async () => {
      await ensureInit();
      const res = await unifiedDB.list(table);
      return res.data;
    },
    get: async (id: string) => {
      await ensureInit();
      return unifiedDB.get(table, id);
    },
    add: async (data: Record<string, unknown>) => {
      await ensureInit();
      return unifiedDB.create(table, data);
    },
    put: async (data: Record<string, unknown>) => {
      await ensureInit();
      const id = data.id as string;
      if (id) {
        const existing = await unifiedDB.get(table, id);
        if (existing) {
          await unifiedDB.update(table, id, data);
          return data;
        }
      }
      return unifiedDB.create(table, data);
    },
    update: async (id: string, patch: Record<string, unknown>) => {
      await ensureInit();
      return unifiedDB.update(table, id, patch);
    },
    delete: async (id: string) => {
      await ensureInit();
      return unifiedDB.remove(table, id);
    },
    count: async () => {
      await ensureInit();
      const res = await unifiedDB.list(table);
      return res.total;
    },
    where: (field: string) => ({
      equals: (val: unknown) => ({
        async toArray(): Promise<any[]> {
          await ensureInit();
          const r = await unifiedDB.list(table, { filters: { [field]: val } });
          return r.data;
        },
        async first(): Promise<any | undefined> {
          await ensureInit();
          const r = await unifiedDB.list(table, { filters: { [field]: val }, limit: 1 });
          return r.data[0];
        },
        async count(): Promise<number> {
          await ensureInit();
          const r = await unifiedDB.list(table, { filters: { [field]: val } });
          return r.total;
        },
      }),
      first: async (): Promise<any | undefined> => {
        await ensureInit();
        const r = await unifiedDB.list(table, { limit: 1 });
        return r.data[0];
      },
    }),
    orderBy: (field: string) => ({
      reverse: () => ({
        limit: (n: number): Promise<any[]> => {
          return unifiedDB.list(table, { sortBy: field, sortOrder: 'desc', limit: n }).then((r) => r.data);
        },
      }),
    }),
    filter: (fn: (row: any) => boolean) => ({
      async toArray(): Promise<any[]> {
        await ensureInit();
        const res = await unifiedDB.list(table);
        return res.data.filter(fn);
      },
      async first(): Promise<any | undefined> {
        await ensureInit();
        const res = await unifiedDB.list(table);
        return res.data.find(fn);
      },
      async count(): Promise<number> {
        await ensureInit();
        const res = await unifiedDB.list(table);
        return res.data.filter(fn).length;
      },
    }),
    bulkAdd: async (records: Record<string, unknown>[]) => {
      await ensureInit();
      await unifiedDB.batchCreate(table, records);
    },
    bulkPut: async (records: Record<string, unknown>[]) => {
      await ensureInit();
      await unifiedDB.batchUpdate(table, records);
    },
  };
}

export { getStoredMode, setStoredMode, type AppMode };
export type { Product, Sale, Customer, Supplier, User };
