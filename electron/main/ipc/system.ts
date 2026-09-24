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

  // 4. اختبار الاتصال بعنوان خادم محلي (LAN Server Ping)
  ipcMain.handle('system:testServerConnection', async (_evt, serverUrl: string) => {
    try {
      const cleanUrl = (serverUrl || '').trim().replace(/\/+$/, '');
      if (!cleanUrl) {
        return { success: false, error: 'عنوان الخادم غير محدد' };
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${cleanUrl}/api/health`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        return { success: false, status: res.status, error: `استجاب الخادم برمز خطأ (${res.status})` };
      }
      const data = await res.json();
      return { success: true, data };
    } catch (err: any) {
      const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
      return {
        success: false,
        error: isTimeout ? 'انتهت مهلة الاتصال بالخادم (4 ثوانٍ)' : (err.message || 'تعذر الوصول إلى الخادم على الشبكة'),
      };
    }
  });
}
