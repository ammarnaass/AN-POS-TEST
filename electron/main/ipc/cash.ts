// معالجات IPC للصندوق — wrapper رفيع حول handlers/cash.ts
// المنطق الفعلي في ../handlers/cash.ts (يُشارك مع خادم HTTP)

import { ipcMain } from 'electron';
import {
  listCashSessions,
  getCashSession,
  getCurrentCashSession,
  openCashSession,
  closeCashSession,
  depositCash,
} from '../handlers/cash';

export function registerCashIpc(): void {
  // cash:list
  ipcMain.handle('cash:list', async () => listCashSessions());

  // cash:get
  ipcMain.handle('cash:get', async (_evt, id: string) => getCashSession(id));

  // cash:current — الجلسة المفتوحة الحالية
  ipcMain.handle('cash:current', async () => getCurrentCashSession());

  // cash:open
  ipcMain.handle('cash:open', async (_evt, data: { openedBy: string; openingBalance: number }) =>
    openCashSession(data)
  );

  // cash:close
  ipcMain.handle('cash:close', async (_evt, id: string, data: { actualBalance: number; note?: string }) =>
    closeCashSession(id, data)
  );

  // cash:deposit — إيداع نقدي في الجلسة
  ipcMain.handle('cash:deposit', async (_evt, id: string, data: { amount: number; note?: string }) =>
    depositCash(id, data)
  );
}
