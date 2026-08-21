// معالجات IPC المخصصة للمبيعات — wrapper رفيع حول handlers/sales.ts
// المنطق الفعلي في ../handlers/sales.ts (يُشارك مع خادم HTTP)

import { ipcMain } from 'electron';
import {
  listSales,
  getSale,
  createSale,
  updateSale,
  removeSale,
} from '../handlers/sales';

export function registerSalesIpc(): void {
  // sales:list
  ipcMain.handle('sales:list', async (_evt, opts?: {
    type?: string; docType?: string; customerId?: string; status?: string;
    search?: string; from?: string; to?: string; limit?: number; offset?: number;
  }) => listSales(opts));

  // sales:get
  ipcMain.handle('sales:get', async (_evt, id: string) => getSale(id));

  // sales:create
  ipcMain.handle('sales:create', async (_evt, data: Record<string, unknown>) =>
    createSale(data)
  );

  // sales:update
  ipcMain.handle('sales:update', async (_evt, id: string, data: Record<string, unknown>) =>
    updateSale(id, data)
  );

  // sales:remove
  ipcMain.handle('sales:remove', async (_evt, id: string) => removeSale(id));
}
