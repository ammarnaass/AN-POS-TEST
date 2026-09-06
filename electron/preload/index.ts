// Preload script — يكشف IPC API للواجهة عبر contextBridge
// الأمان: contextIsolation=true, nodeIntegration=false
// الواجهة تستدعي window.electronAPI.<namespace>.<method>(...args)

import { contextBridge, ipcRenderer } from 'electron';


const electronAPI = {
  // ===== CRUD عام =====
  db: {
    list: (table: string, opts?: { search?: string; from?: string; to?: string; limit?: number; offset?: number; filter?: Record<string, unknown>; orderBy?: string; orderDir?: 'ASC' | 'DESC' | 'asc' | 'desc' }) =>
      ipcRenderer.invoke('db:list', table, opts),
    count: (table: string, filter?: Record<string, unknown>) =>
      ipcRenderer.invoke('db:count', table, filter),
    clear: (table: string) =>
      ipcRenderer.invoke('db:clear', table),
    get: (table: string, id: string) =>
      ipcRenderer.invoke('db:get', table, id),
    bulkGet: (table: string, ids: string[]) =>
      ipcRenderer.invoke('db:bulkGet', table, ids),
    create: (table: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('db:create', table, data),
    bulkCreate: (table: string, items: Record<string, unknown>[]) =>
      ipcRenderer.invoke('db:bulkCreate', table, items),
    update: (table: string, id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('db:update', table, id, data),
    bulkUpdate: (table: string, items: Record<string, unknown>[]) =>
      ipcRenderer.invoke('db:bulkUpdate', table, items),
    remove: (table: string, id: string) =>
      ipcRenderer.invoke('db:remove', table, id),
    onTableUpdated: (callback: (data: { table: string; action?: string; id?: string }) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on('db:table-updated', listener);
      return () => {
        ipcRenderer.removeListener('db:table-updated', listener);
      };
    },
  },

  // ===== المصادقة (بدون JWT) =====
  auth: {
    login: (username: string, pin: string) =>
      ipcRenderer.invoke('auth:login', username, pin),
    register: (data: { username: string; name: string; pin: string; phone?: string; email?: string; role?: string; roleId?: string; callerRole?: string }) =>
      ipcRenderer.invoke('auth:register', data),
    getCurrentUser: (userId: string) =>
      ipcRenderer.invoke('auth:me', userId),
    logout: (userId: string) =>
      ipcRenderer.invoke('auth:logout', userId),
    resetPassword: (userId: string, newPin: string) =>
      ipcRenderer.invoke('auth:reset-password', userId, newPin),
    checkRegistrationAllowed: () =>
      ipcRenderer.invoke('auth:check-registration-allowed'),
  },

  // ===== المبيعات (مسارات مخصصة) =====
  sales: {
    list: (opts?: { type?: string; docType?: string; customerId?: string; status?: string; search?: string; from?: string; to?: string; limit?: number; offset?: number }) =>
      ipcRenderer.invoke('sales:list', opts),
    get: (id: string) =>
      ipcRenderer.invoke('sales:get', id),
    create: (data: Record<string, unknown>) =>
      ipcRenderer.invoke('sales:create', data),
    update: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('sales:update', id, data),
    remove: (id: string) =>
      ipcRenderer.invoke('sales:remove', id),
  },

  // ===== الصندوق (مسارات مخصصة) =====
  cash: {
    list: () =>
      ipcRenderer.invoke('cash:list'),
    get: (id: string) =>
      ipcRenderer.invoke('cash:get', id),
    open: (data: { openedBy: string; openingBalance: number }) =>
      ipcRenderer.invoke('cash:open', data),
    close: (id: string, data: { actualBalance: number; note?: string }) =>
      ipcRenderer.invoke('cash:close', id, data),
    deposit: (id: string, data: { amount: number; note?: string }) =>
      ipcRenderer.invoke('cash:deposit', id, data),
    current: () =>
      ipcRenderer.invoke('cash:current'),
  },

  // ===== الفئات (مع JOIN product_count) =====
  categories: {
    list: () =>
      ipcRenderer.invoke('categories:list'),
    get: (id: string) =>
      ipcRenderer.invoke('categories:get', id),
    create: (data: Record<string, unknown>) =>
      ipcRenderer.invoke('categories:create', data),
    update: (id: string, data: Record<string, unknown>) =>
      ipcRenderer.invoke('categories:update', id, data),
    remove: (id: string) =>
      ipcRenderer.invoke('categories:remove', id),
  },

  // ===== سجل طباعة الباركود =====
  barcodePrints: {
    list: (opts?: { productId?: string }) =>
      ipcRenderer.invoke('barcodePrints:list', opts),
    create: (data: Record<string, unknown>) =>
      ipcRenderer.invoke('barcodePrints:create', data),
    remove: (id: string) =>
      ipcRenderer.invoke('barcodePrints:remove', id),
  },

  // ===== المدفوعات =====
  payments: {
    list: (opts?: { partyId?: string; partyType?: string }) =>
      ipcRenderer.invoke('payments:list', opts),
    create: (data: Record<string, unknown>) =>
      ipcRenderer.invoke('payments:create', data),
  },

  // ===== قيود الموردين =====
  supplierEntries: {
    list: (opts?: { supplierId?: string }) =>
      ipcRenderer.invoke('supplierEntries:list', opts),
    create: (data: Record<string, unknown>) =>
      ipcRenderer.invoke('supplierEntries:create', data),
  },

  // ===== نشاطات المستخدمين =====
  activities: {
    list: (opts?: { userId?: string; action?: string; limit?: number }) =>
      ipcRenderer.invoke('activities:list', opts),
    log: (data: { userId: string; action: string; entityType?: string; entityId?: string; details?: string }) =>
      ipcRenderer.invoke('activities:log', data),
  },

  // ===== استيراد Excel =====
  upload: {
    products: (rows: Record<string, unknown>[]) =>
      ipcRenderer.invoke('upload:products', rows),
    customers: (rows: Record<string, unknown>[]) =>
      ipcRenderer.invoke('upload:customers', rows),
  },

  // ===== ترحيل البيانات =====
  migration: {
    importFromIndexedDB: (data: Record<string, unknown[]>) =>
      ipcRenderer.invoke('migration:import', data),
    checkStatus: () =>
      ipcRenderer.invoke('migration:status'),
  },

  // ===== أدوات عامة =====
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getPath: (name: string) => ipcRenderer.invoke('app:path', name),
  },

  // ===== نافذة إدخال نص (بديل prompt()) =====
  prompt: (message: string, defaultValue?: string) =>
    ipcRenderer.invoke('prompt:show', message, defaultValue),

  // ===== خادم HTTP للهاتف (LAN pairing) =====
  server: {
    status: () =>
      ipcRenderer.invoke('server:status'),
    enable: (opts?: { port?: number }) =>
      ipcRenderer.invoke('server:enable', opts),
    disable: () =>
      ipcRenderer.invoke('server:disable'),
    pairingInfo: () =>
      ipcRenderer.invoke('server:pairing-info'),
    regenerateKey: () =>
      ipcRenderer.invoke('server:regenerate-key'),
    connectedDevices: () =>
      ipcRenderer.invoke('server:connected-devices'),
    disconnectDevice: (deviceId: string) =>
      ipcRenderer.invoke('server:disconnect-device', deviceId),
  },

  // ===== نظام الترخيص والتفعيل (Ed25519) =====
  license: {
    getStatus: () =>
      ipcRenderer.invoke('license:status'),
    activate: (keyOrContent: string) =>
      ipcRenderer.invoke('license:activate', keyOrContent),
    deactivate: () =>
      ipcRenderer.invoke('license:deactivate'),
    getFingerprint: () =>
      ipcRenderer.invoke('license:fingerprint'),
  },

  // ===== إدارة التجربة المجانية 7 أيام =====
  trial: {
    get: () =>
      ipcRenderer.invoke('trial:get'),
    start: (existingStart?: string, existingEnd?: string, existingSales?: number) =>
      ipcRenderer.invoke('trial:start', existingStart, existingEnd, existingSales),
    incrementSales: () =>
      ipcRenderer.invoke('trial:incrementSales'),
  },

  // ===== محرك الطباعة الصامتة لسطح المكتب =====
  print: {
    silent: (html: string, options?: { silent?: boolean; deviceName?: string; copies?: number; color?: boolean }) =>
      ipcRenderer.invoke('print:silent', html, options),
    getPrinters: () =>
      ipcRenderer.invoke('print:getPrinters'),
  },
};

try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('[preload] electronAPI exposed successfully');
  ipcRenderer.send('preload:status', 'ready');
} catch (err) {
  console.error('[preload] exposeInMainWorld failed:', err);
  ipcRenderer.send('preload:status', 'error:' + (err instanceof Error ? err.message : String(err)));
}

// إشارة للـ renderer أن API جاهز — أسرع من polling
window.addEventListener('DOMContentLoaded', () => {
  document.dispatchEvent(new Event('electronapi-ready'));
});

export type ElectronAPI = typeof electronAPI;
