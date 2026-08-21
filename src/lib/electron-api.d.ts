// تعريف نوع واجهة Electron API للواجهة الأمامية
// يُستورد في الملفات التي تحتاج type safety مع window.electronAPI

export interface ElectronAPI {
  db: {
    list: (table: string, opts?: { search?: string; from?: string; to?: string; limit?: number; offset?: number }) => Promise<{ data: Record<string, unknown>[] }>;
    get: (table: string, id: string) => Promise<{ data: Record<string, unknown> | null }>;
    create: (table: string, data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
    update: (table: string, id: string, data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
    remove: (table: string, id: string) => Promise<{ success: boolean }>;
  };
  auth: {
    login: (username: string, pin: string) => Promise<{ user?: unknown; error?: { status: number; detail: string } }>;
    register: (data: { username: string; name: string; pin: string; phone?: string; email?: string }) => Promise<{ user?: unknown; error?: { status: number; detail: string } }>;
    getCurrentUser: (userId: string) => Promise<{ user?: unknown; error?: { status: number; detail: string } }>;
    logout: (userId: string) => Promise<{ success: boolean }>;
  };
  sales: {
    list: (opts?: { type?: string; docType?: string; customerId?: string; status?: string; search?: string; from?: string; to?: string; limit?: number; offset?: number }) => Promise<{ data: Record<string, unknown>[] }>;
    get: (id: string) => Promise<{ data: Record<string, unknown> | null }>;
    create: (data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
    update: (id: string, data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
    remove: (id: string) => Promise<{ success: boolean }>;
  };
  cash: {
    list: () => Promise<{ data: Record<string, unknown>[] }>;
    get: (id: string) => Promise<{ data: Record<string, unknown> | null }>;
    open: (data: { openedBy: string; openingBalance: number }) => Promise<{ data: Record<string, unknown> | null }>;
    close: (id: string, data: { actualBalance: number; note?: string }) => Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }>;
    deposit: (id: string, data: { amount: number; note?: string }) => Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }>;
    current: () => Promise<{ data: Record<string, unknown> | null }>;
  };
  categories: {
    list: () => Promise<{ data: Record<string, unknown>[] }>;
    get: (id: string) => Promise<{ data: Record<string, unknown> | null }>;
    create: (data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }>;
    update: (id: string, data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null; error?: { status: number; detail: string } }>;
    remove: (id: string) => Promise<{ success: boolean; error?: { status: number; detail: string } }>;
  };
  barcodePrints: {
    list: (opts?: { productId?: string }) => Promise<{ data: Record<string, unknown>[] }>;
    create: (data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>;
    remove: (id: string) => Promise<{ success: boolean }>;
  };
  payments: {
    list: (opts?: { partyId?: string; partyType?: string }) => Promise<{ data: Record<string, unknown>[] }>;
    create: (data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>;
  };
  supplierEntries: {
    list: (opts?: { supplierId?: string }) => Promise<{ data: Record<string, unknown>[] }>;
    create: (data: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>;
  };
  activities: {
    list: (opts?: { userId?: string; action?: string; limit?: number }) => Promise<{ data: Record<string, unknown>[] }>;
    log: (data: { userId: string; action: string; entityType?: string; entityId?: string; details?: string }) => Promise<{ success: boolean }>;
  };
  upload: {
    products: (rows: Record<string, unknown>[]) => Promise<{ imported: number; total: number }>;
    customers: (rows: Record<string, unknown>[]) => Promise<{ imported: number; total: number }>;
  };
  migration: {
    importFromIndexedDB: (data: Record<string, unknown[]>) => Promise<{ success: boolean; totalImported: number; stats: Record<string, number> }>;
    checkStatus: () => Promise<{ completed: boolean }>;
  };
  app: {
    getVersion: () => Promise<string>;
    getPath: (name: string) => Promise<string | null>;
  };
  prompt: (message: string, defaultValue?: string) => Promise<string | null>;
  server: {
    status: () => Promise<{ running: boolean; lanEnabled: boolean; port: number }>;
    enable: (opts?: { port?: number }) => Promise<{ success: boolean; port: number; running: boolean }>;
    disable: () => Promise<{ success: boolean; running: boolean }>;
    pairingInfo: () => Promise<{ ip: string; port: number; key: string; shopName: string; ips: string[] }>;
    regenerateKey: () => Promise<{ success: boolean; key: string }>;
    connectedDevices: () => Promise<{ data: Array<Record<string, unknown>> }>;
    disconnectDevice: (deviceId: string) => Promise<{ success: boolean }>;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
