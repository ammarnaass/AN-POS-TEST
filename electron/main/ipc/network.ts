import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { ipcMain, app } from 'electron';
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
import { scanLocalServers } from '../discoveryScanner';

/**
 * تفعيل/تعطيل خادم HTTP + إعداد network_settings
 */
export function registerNetworkIpc(): void {
  // server:status — هل الخادم يعمل؟
  ipcMain.handle('server:status', async () => {
    const settingsRow = queryOne('SELECT sync_mode, terminal_role FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    const terminalRole = (settingsRow?.terminal_role as string) || 'server';
    const isDev = isDeveloperModeActive();
    if (syncMode === 'single' && terminalRole !== 'server' && !isDev && isHttpServerRunning()) {
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
      terminalRole,
    };
  });

  // server:enable — فتح الخادم + تحديث lan_enabled = 1
  ipcMain.handle('server:enable', async (_evt, opts?: { port?: number }) => {
    // شرط وضع التشغيل: يجب ألا يشتغل وضع المقترن مع الهاتف إذا كان الوضع جهاز واحد (إلا لحساب المطور أو إذا كان خادماً)
    const settingsRow = queryOne('SELECT sync_mode, terminal_role FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    const terminalRole = (settingsRow?.terminal_role as string) || 'server';
    const isDev = isDeveloperModeActive();
    if (syncMode === 'single' && terminalRole !== 'server' && !isDev) {
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
    const settingsRow = queryOne('SELECT sync_mode, terminal_role FROM settings WHERE id = \'default\' LIMIT 1');
    const syncMode = (settingsRow?.sync_mode as string) || 'single';
    const terminalRole = (settingsRow?.terminal_role as string) || 'server';
    if (syncMode === 'single' && terminalRole !== 'server' && !isDeveloperModeActive()) {
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

  // =========================================================================
  // المرحلة 2: الاكتشاف التلقائي والاقتران المشفر بحاسوب الخادم (Auto-Discovery & Pairing)
  // =========================================================================

  // server:scanLocalServers — فحص الشبكة المحلية عبر mDNS و UDP للعثور على خوادم AN POS
  ipcMain.handle('server:scanLocalServers', async () => {
    try {
      const servers = await scanLocalServers(3200);
      return { success: true, servers };
    } catch (err: any) {
      console.warn('[ipc/network] خطأ أثناء فحص الخوادم:', err);
      return { success: false, servers: [], error: err?.message || 'فشل فحص خوادم الشبكة المحلية' };
    }
  });

  // server:pairWithServer — إرسال طلب اقتران موثق بمفتاح الاتصال إلى الخادم وتخزين رمز الجلسة
  ipcMain.handle('server:pairWithServer', async (_evt, params: {
    serverUrl: string;
    connectionKey: string;
    terminalCode?: string;
    deviceName?: string;
  }) => {
    try {
      const cleanUrl = (params?.serverUrl || '').trim().replace(/\/+$/, '');
      if (!cleanUrl) {
        return { success: false, error: 'عنوان الخادم مطلوب (Server URL)' };
      }
      const cleanKey = (params?.connectionKey || '').trim();
      if (!cleanKey) {
        return { success: false, error: 'رمز الاقتران السري (Connection Key) مطلوب' };
      }

      // تحديد أو توليد معرّف فريد ثابت لهذا الجهاز العميل لمنع التكرار
      const currentSettings = queryOne("SELECT client_device_id, terminal_code FROM settings WHERE id = 'default'") || {};
      let deviceUniqueId = (currentSettings.client_device_id as string) || '';
      if (!deviceUniqueId) {
        deviceUniqueId = `client_${os.hostname()}_${randomUUID().substring(0, 8)}`;
      }
      const finalTerminalCode = (params.terminalCode || (currentSettings.terminal_code as string) || 'T02').trim().toUpperCase();
      const hostName = os.hostname();
      const deviceName = (params.deviceName || `${finalTerminalCode} (${hostName})`).trim();

      const payload = {
        deviceName,
        connectionKey: cleanKey,
        deviceType: 'desktop_client',
        deviceUniqueId,
        model: `${os.type()} ${os.arch()}`,
        vendor: 'AN-POS Client Terminal',
        appName: 'AN POS Desktop Terminal',
        appVersion: app.getVersion(),
      };

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(`${cleanUrl}/api/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-device-unique-id': deviceUniqueId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(tid);

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.error) {
        return {
          success: false,
          error: result?.error?.detail || `فشل الاقتران (كود: ${response.status})`,
        };
      }

      if (!result.sessionToken || !result.deviceId) {
        return { success: false, error: 'لم يُرجع الخادم رمز جلسة صالح' };
      }

      // حفظ بيانات الاقتران والاعتماد في قاعدة بيانات العميل المحلية
      execute(
        `UPDATE settings SET
          terminal_role = 'client',
          server_lan_url = ?,
          terminal_code = ?,
          client_token = ?,
          client_device_id = ?,
          updated_at = ?
         WHERE id = 'default'`,
        [cleanUrl, finalTerminalCode, result.sessionToken, result.deviceId, new Date().toISOString()]
      );

      return {
        success: true,
        sessionToken: result.sessionToken,
        deviceId: result.deviceId,
        serverUrl: cleanUrl,
        terminalCode: finalTerminalCode,
        deviceName: result.deviceName || deviceName,
      };
    } catch (err: any) {
      console.error('[ipc/network] خطأ أثناء الاقتران بالخادم:', err);
      return {
        success: false,
        error: err?.message || 'تعذر الاتصال بالخادم. يرجى التأكد من تشغيل الخادم وصحة عنوان IP والشبكة.',
      };
    }
  });

  // server:unpairServer — إلغاء اقتران العميل بالخادم وحذف رمز الجلسة
  ipcMain.handle('server:unpairServer', async (_evt, params?: { serverUrl?: string }) => {
    try {
      const settingsRow = queryOne("SELECT server_lan_url, client_token, client_device_id FROM settings WHERE id = 'default'") || {};
      const targetUrl = (params?.serverUrl || (settingsRow.server_lan_url as string) || '').trim().replace(/\/+$/, '');
      const token = (settingsRow.client_token as string) || '';
      const deviceId = (settingsRow.client_device_id as string) || '';

      if (targetUrl && token && deviceId) {
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 3000);
          await fetch(`${targetUrl}/api/pair/unpair`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-session-token': token,
              'x-device-id': deviceId,
            },
            signal: controller.signal,
          });
          clearTimeout(tid);
        } catch {
          // تجاهل أي خطأ بالشبكة خلال فك الارتباط
        }
      }

      // مسح رمز الجلسة والاعتماد محلياً
      execute(
        `UPDATE settings SET
          client_token = '',
          client_device_id = '',
          updated_at = ?
         WHERE id = 'default'`,
        [new Date().toISOString()]
      );

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'تعذر إلغاء الاقتران' };
    }
  });
}
