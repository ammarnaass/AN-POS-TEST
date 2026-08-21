// مصنع CRUD عام عبر IPC — wrapper رفيع حول handlers/crud.ts
// يسجل 5 معالجات IPC عالمية (مرة واحدة) ويتوجّه حسب اسم الجدول
// المنطق الفعلي في ../handlers/crud.ts (يُشارك مع خادم HTTP)

import { ipcMain } from 'electron';
import {
  registerCrudConfig,
  listRows,
  getRow,
  createRow,
  updateRow,
  removeRow,
  type CrudConfig,
} from '../handlers/crud';

/**
 * هل تم تسجيل المعالجات العامة؟ (نمنع التسجيل المكرر)
 */
let handlersRegistered = false;

/**
 * تسجيل إعدادات CRUD لجدول — يضيفها إلى tableConfigs
 * المعالجات العامة تُسجل مرة واحدة فقط (registerGlobalCrudHandlers)
 */
export function registerCrudIpc(config: CrudConfig): void {
  registerCrudConfig(config);
  registerGlobalCrudHandlers();
}

/**
 * تسجيل المعالجات العامة الخمسة (مرة واحدة):
 * db:list, db:get, db:create, db:update, db:remove
 * كل معالج يأخذ اسم الجدول كأول معامل ويتوجّه عبر tableConfigs
 */
function registerGlobalCrudHandlers(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  // db:list
  ipcMain.handle('db:list', async (_evt, tableName: string, opts?: { search?: string; from?: string; to?: string; limit?: number; offset?: number }) =>
    listRows(tableName, opts)
  );

  // db:get
  ipcMain.handle('db:get', async (_evt, tableName: string, id: string) =>
    getRow(tableName, id)
  );

  // db:create
  ipcMain.handle('db:create', async (_evt, tableName: string, data: Record<string, unknown>) =>
    createRow(tableName, data)
  );

  // db:update
  ipcMain.handle('db:update', async (_evt, tableName: string, id: string | undefined | null, data: Record<string, unknown>) =>
    updateRow(tableName, id, data)
  );

  // db:remove
  ipcMain.handle('db:remove', async (_evt, tableName: string, id: string) =>
    removeRow(tableName, id)
  );
}

export function registerListIpc(
  channel: string,
  handler: (opts?: Record<string, unknown>) => Promise<{ data: unknown[] }>
): void {
  ipcMain.handle(channel, async (_evt, opts) => handler(opts));
}
