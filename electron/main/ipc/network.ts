// معالجات IPC لشبكة الربط بين الهاتف وسطح المكتب
// تُكشف لواجهة سطح المكتب عبر window.electronAPI.server

import { ipcMain } from 'electron';
import {
  getPairingInfo,
  startHttpServer,
  stopHttpServer,
  isHttpServerRunning,
  getNetworkSettings,
  getOrCreateConnectionKey,
} from '../server';
import { execute, queryAll, queryOne } from '../handlers/db-utils';

/**
 * تفعيل/تعطيل خادم HTTP + إعداد network_settings
 */
export function registerNetworkIpc(): void {
  // server:status — هل الخادم يعمل؟
  ipcMain.handle('server:status', async () => {
    const settingsRow = queryOne('SELECT sync_mode FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    if (syncMode === 'single' && isHttpServerRunning()) {
      await stopHttpServer();
      execute(
        "UPDATE network_settings SET lan_enabled = 0, updated_at = ? WHERE id = 'default'",
        [new Date().toISOString()]
      );
    }
    return {
      running: isHttpServerRunning(),
      lanEnabled: Boolean(getNetworkSettings()?.lan_enabled),
      port: Number(getNetworkSettings()?.server_port) || 3000,
      syncMode,
    };
  });

  // server:enable — فتح الخادم + تحديث lan_enabled = 1
  ipcMain.handle('server:enable', async (_evt, opts?: { port?: number }) => {
    // شرط وضع التشغيل: يجب ألا يشتغل وضع المقترن مع الهاتف إذا كان الوضع جهاز واحد
    const settingsRow = queryOne('SELECT sync_mode FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    if (syncMode === 'single') {
      return {
        success: false,
        error: 'لا يمكن تشغيل خادم الربط أو إقران الهواتف في وضع "جهاز واحد". يجب تغيير وضع التشغيل أولاً إلى "عدة أجهزة (شبكة محلية LAN)".',
        running: false,
      };
    }
    const port = opts?.port ?? Number(getNetworkSettings()?.server_port) ?? 3000;
    // تحديث الإعدادات
    execute(
      "UPDATE network_settings SET lan_enabled = 1, server_port = ?, updated_at = ? WHERE id = 'default'",
      [port, new Date().toISOString()]
    );
    // تأكد من وجود connection_key
    getOrCreateConnectionKey();
    // تشغيل الخادم إن لم يعمل
    let finalPort = port;
    if (!isHttpServerRunning()) {
      const res = await startHttpServer({ port });
      finalPort = res.port;
    }
    return { success: true, port: finalPort, running: isHttpServerRunning() };
  });

  // server:disable — إيقاف الخادم + تحديث lan_enabled = 0
  ipcMain.handle('server:disable', async () => {
    await stopHttpServer();
    execute(
      "UPDATE network_settings SET lan_enabled = 0, updated_at = ? WHERE id = 'default'",
      [new Date().toISOString()]
    );
    return { success: true, running: false };
  });

  // server:pairing-info — معلومات QR (ip, port, key, shopName)
  ipcMain.handle('server:pairing-info', async () => {
    const settingsRow = queryOne('SELECT sync_mode FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    if (syncMode === 'single') {
      return null;
    }
    return getPairingInfo();
  });

  // server:regenerate-key — توليد مفتاح اتصال جديد (إبطال الأجهزة القديمة)
  ipcMain.handle('server:regenerate-key', async () => {
    const { randomBytes } = await import('node:crypto');
    const newKey = Array.from({ length: 4 }, () =>
      randomBytes(2).toString('hex').toUpperCase()
    ).join('-');
    execute(
      "UPDATE network_settings SET connection_key = ?, updated_at = ? WHERE id = 'default'",
      [newKey, new Date().toISOString()]
    );
    // جعل كل الأجهزة القديمة offline
    execute(
      "UPDATE connected_devices SET status = 'offline', updated_at = ? WHERE status = 'online'",
      [new Date().toISOString()]
    );
    return { success: true, key: newKey };
  });

  // server:connected-devices — قائمة الأجهزة المقترنة
  ipcMain.handle('server:connected-devices', async () => {
    const rows = queryAll('SELECT * FROM connected_devices ORDER BY updated_at DESC');
    return { data: rows };
  });

  // server:disconnect-device — فصل جهاز
  ipcMain.handle('server:disconnect-device', async (_evt, deviceId: string) => {
    execute(
      'UPDATE connected_devices SET status = ?, updated_at = ? WHERE id = ?',
      ['offline', new Date().toISOString(), deviceId]
    );
    return { success: true };
  });
}
