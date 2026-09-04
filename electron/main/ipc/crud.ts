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
  countRows,
  clearTable,
  bulkCreateRows,
  bulkUpdateRows,
  bulkGetRows,
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
 * تسجيل المعالجات العامة (مرة واحدة):
 * db:list, db:count, db:clear, db:get, db:create, db:update, db:remove, db:bulkCreate, db:bulkUpdate, db:bulkGet
 * كل معالج يأخذ اسم الجدول كأول معامل ويتوجّه عبر tableConfigs
 */
function registerGlobalCrudHandlers(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  // db:list
  ipcMain.handle('db:list', async (_evt, tableName: string, opts?: { search?: string; from?: string; to?: string; limit?: number; offset?: number; filter?: Record<string, unknown>; orderBy?: string; orderDir?: 'ASC' | 'DESC' | 'asc' | 'desc' }) =>
    listRows(tableName, opts)
  );

  // db:count
  ipcMain.handle('db:count', async (_evt, tableName: string, filter?: Record<string, unknown>) =>
    countRows(tableName, filter)
  );

  // db:clear
  ipcMain.handle('db:clear', async (_evt, tableName: string) =>
    clearTable(tableName)
  );

  // db:get
  ipcMain.handle('db:get', async (_evt, tableName: string, id: string) =>
    getRow(tableName, id)
  );

  // db:bulkGet
  ipcMain.handle('db:bulkGet', async (_evt, tableName: string, ids: string[]) =>
    bulkGetRows(tableName, ids)
  );

  // db:create
  ipcMain.handle('db:create', async (_evt, tableName: string, data: Record<string, unknown>) =>
    createRow(tableName, data)
  );

  // db:bulkCreate
  ipcMain.handle('db:bulkCreate', async (_evt, tableName: string, items: Record<string, unknown>[]) =>
    bulkCreateRows(tableName, items)
  );

  // db:update
  ipcMain.handle('db:update', async (_evt, tableName: string, id: string | undefined | null, data: Record<string, unknown>) =>
    updateRow(tableName, id, data)
  );

  // db:bulkUpdate
  ipcMain.handle('db:bulkUpdate', async (_evt, tableName: string, items: Record<string, unknown>[]) =>
    bulkUpdateRows(tableName, items)
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
