// معالجات IPC لتكامل النظام وتكوين ويندوز (System Integration & Auto-Launch)
// يوفر التحكم في التشغيل التلقائي مع بدء تشغيل نظام ويندوز (Windows Startup)

import { app, ipcMain } from 'electron';
import { getDatabasePath } from '../database';

export function registerSystemIpc(): void {
  // 1. الاستعلام عن حالة التشغيل التلقائي مع النظام
  ipcMain.handle('system:getAutoLaunch', async () => {
    try {
      const loginSettings = app.getLoginItemSettings();
      return { success: true, enabled: Boolean(loginSettings.openAtLogin) };
    } catch (error) {
      console.error('[system:getAutoLaunch] فشل قراءة حالة التشغيل التلقائي:', error);
      return { success: false, enabled: false, error: String(error) };
    }
  });

  // 2. تفعيل أو تعطيل التشغيل التلقائي مع بدء تشغيل نظام ويندوز
  ipcMain.handle('system:setAutoLaunch', async (_evt, enabled: boolean) => {
    try {
      const isEnable = Boolean(enabled);
      app.setLoginItemSettings({
        openAtLogin: isEnable,
        path: process.execPath,
        args: [],
      });
      const updated = app.getLoginItemSettings();
      console.log(`[system] تم ضبط التشغيل التلقائي مع بدء النظام إلى: ${isEnable ? 'مفعل' : 'معطل'}`);
      return { success: true, enabled: Boolean(updated.openAtLogin) };
    } catch (error) {
      console.error('[system:setAutoLaunch] فشل ضبط التشغيل التلقائي:', error);
      return { success: false, enabled: false, error: String(error) };
    }
  });

  // 3. جلب المسار النشط لملف قاعدة البيانات
  ipcMain.handle('system:getDatabasePath', async () => {
    try {
      const dbPath = getDatabasePath();
      return { success: true, path: dbPath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}
