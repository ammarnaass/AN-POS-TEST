// معالجات IPC لإدارة التجربة المجانية وتخزين التواريخ في Electron Main

import { ipcMain } from 'electron';
import {
  initStoredTrial,
  getStoredTrialStatus,
  incrementStoredTrialSales,
  type ElectronTrialStatus,
} from '../license/trialStorage';

export function registerTrialIpc(): void {
  // جلب الحالة الكاملة للتجربة من القرص
  ipcMain.handle('trial:get', async (): Promise<ElectronTrialStatus> => {
    return getStoredTrialStatus();
  });

  // بدء التجربة وتثبيت تاريخ البدء والانتهاء (7 أيام)
  ipcMain.handle(
    'trial:start',
    async (
      _event,
      existingStart?: string,
      existingEnd?: string,
      existingSales?: number
    ): Promise<ElectronTrialStatus> => {
      initStoredTrial(existingStart, existingEnd, existingSales);
      return getStoredTrialStatus();
    }
  );

  // زيادة عداد المبيعات
  ipcMain.handle('trial:incrementSales', async (): Promise<number> => {
    return incrementStoredTrialSales();
  });
}
