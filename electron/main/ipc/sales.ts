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
import { licenseManager } from '../license/licenseManager';
import { getStoredTrialStatus, incrementStoredTrialSales } from '../license/trialStorage';

export function registerSalesIpc(): void {
  // sales:list
  ipcMain.handle('sales:list', async (_evt, opts?: {
    type?: string; docType?: string; customerId?: string; status?: string;
    search?: string; from?: string; to?: string; limit?: number; offset?: number;
  }) => listSales(opts));

  // sales:get
  ipcMain.handle('sales:get', async (_evt, id: string) => getSale(id));

  // sales:create
  ipcMain.handle('sales:create', async (_evt, data: Record<string, unknown>) => {
    if (!licenseManager.isLicensed()) {
      const trial = getStoredTrialStatus();
      if (trial.isExpired || trial.clockTampered) {
        throw new Error('TRIAL_EXPIRED: انتهت فترة التجربة المجانية أو تم رصد تلاعب بساعة النظام. يرجى تفعيل النسخة الرسمية للمتابعة.');
      }
      incrementStoredTrialSales();
    }
    return createSale(data);
  });

  // sales:update
  ipcMain.handle('sales:update', async (_evt, id: string, data: Record<string, unknown>) =>
    updateSale(id, data)
  );

  // sales:remove
  ipcMain.handle('sales:remove', async (_evt, id: string) => removeSale(id));
}
