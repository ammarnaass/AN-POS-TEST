// معالجات IPC لإدارة الترخيص والتفعيل في Electron Main

import { ipcMain } from 'electron';
import { licenseManager } from '../license/licenseManager';
import { computeHardwareFingerprint } from '../license/hardwareFingerprint';

export function registerLicenseIpc(): void {
  // جلب الحالة الكاملة للترخيص
  ipcMain.handle('license:status', async () => {
    return licenseManager.getStatus();
  });

  // تفعيل مفتاح جديد
  ipcMain.handle('license:activate', async (_event, keyOrContent: string) => {
    return licenseManager.activate(keyOrContent);
  });

  // إلغاء التفعيل
  ipcMain.handle('license:deactivate', async () => {
    return licenseManager.deactivate();
  });

  // جلب بصمة العتاد الحالية
  ipcMain.handle('license:fingerprint', async () => {
    return computeHardwareFingerprint();
  });
}
