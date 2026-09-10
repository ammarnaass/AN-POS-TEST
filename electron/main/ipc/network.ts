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
  invalidateDeviceSessions,
  invalidateAllSessions,
} from '../server';
import { execute, queryAll, queryOne } from '../handlers/db-utils';
import { isDeveloperModeActive } from '../handlers/auth';
import { refreshAdvertisement } from '../discoveryBonjour';
import { generateUniqueDeviceName } from '../server/routes/pair';

/**
 * تفعيل/تعطيل خادم HTTP + إعداد network_settings
 */
export function registerNetworkIpc(): void {
  // server:status — هل الخادم يعمل؟
  ipcMain.handle('server:status', async () => {
    const settingsRow = queryOne('SELECT sync_mode FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    const isDev = isDeveloperModeActive();
    if (syncMode === 'single' && !isDev && isHttpServerRunning()) {
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
    // شرط وضع التشغيل: يجب ألا يشتغل وضع المقترن مع الهاتف إذا كان الوضع جهاز واحد (إلا لحساب المطور)
    const settingsRow = queryOne('SELECT sync_mode FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    const isDev = isDeveloperModeActive();
    if (syncMode === 'single' && !isDev) {
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
    if (isHttpServerRunning()) { refreshAdvertisement(); }
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
    if (syncMode === 'single' && !isDeveloperModeActive()) {
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
    invalidateAllSessions();
    return { success: true, key: newKey };
  });

  // server:connected-devices — قائمة الأجهزة المقترنة بكامل بياناتها مع تحديث زمني للحالة الحية
  ipcMain.handle('server:connected-devices', async () => {
    // تحديث الأجهزة المتوقفة التي لم ترسل نبضاً منذ أكثر من 90 ثانية إلى offline
    try {
      execute(
        "UPDATE connected_devices SET status = 'offline', updated_at = ? WHERE status = 'online' AND (last_seen IS NULL OR last_seen < datetime('now', '-90 seconds'))",
        [new Date().toISOString()]
      );
    } catch {}

    const rows = queryAll(
      `SELECT *,
         (COALESCE(mac_address,'') || '|' || COALESCE(ip_address,'') || '|' || COALESCE(model,'')) AS connection_fingerprint
       FROM connected_devices
       ORDER BY CASE WHEN status = 'online' THEN 0 ELSE 1 END, updated_at DESC`
    );
    return { data: rows };
  });

    // server:update-port — تحديث منفذ الخادم وتحديث إعلان Bonjour فوراً
  ipcMain.handle('server:update-port', async (_evt, port: number) => {
    const validPort = Number(port);
    if (!validPort || validPort < 1 || validPort > 65535) {
      return { success: false, error: 'رقم المنفذ غير صالح' };
    }
    execute(
      "UPDATE network_settings SET server_port = ?, updated_at = ? WHERE id = 'default'",
      [validPort, new Date().toISOString()]
    );
    refreshAdvertisement();
    return { success: true, port: validPort };
  });

  // server:refresh-advertising — تحديث إعلان Bonjour/mDNS
  ipcMain.handle('server:refresh-advertising', async () => {
    refreshAdvertisement();
    return { success: true };
  });

  // server:disconnect-device — فصل جهاز
  ipcMain.handle('server:disconnect-device', async (_evt, deviceId: string) => {
    execute(
      'UPDATE connected_devices SET status = ?, updated_at = ? WHERE id = ?',
      ['offline', new Date().toISOString(), deviceId]
    );
    invalidateDeviceSessions(deviceId);
    return { success: true };
  });

  // server:delete-device — حذف جهاز نهائياً من السجل
  ipcMain.handle('server:delete-device', async (_evt, deviceId: string) => {
    invalidateDeviceSessions(deviceId);
    execute('DELETE FROM device_sessions WHERE device_id = ?', [deviceId]);
    execute('DELETE FROM connected_devices WHERE id = ?', [deviceId]);
    return { success: true };
  });

  // server:rename-device — إعادة تسمية الجهاز مع ضمان عدم التكرار
  ipcMain.handle('server:rename-device', async (_evt, { deviceId, newName }: { deviceId: string; newName: string }) => {
    if (!deviceId || !newName?.trim()) {
      return { success: false, error: 'معرف الجهاز والاسم الجديد مطلوبان' };
    }
    const uniqueName = generateUniqueDeviceName(newName, deviceId);
    execute(
      'UPDATE connected_devices SET device_name = ?, updated_at = ? WHERE id = ?',
      [uniqueName, new Date().toISOString(), deviceId]
    );
    execute(
      'UPDATE device_sessions SET device_name = ? WHERE device_id = ?',
      [uniqueName, deviceId]
    );
    return { success: true, name: uniqueName };
  });
}
