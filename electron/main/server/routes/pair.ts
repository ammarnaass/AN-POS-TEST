// مسار الاقتران — `/api/pair/:token` + إدارة جلسات الأجهزة.
//
// التدفّق:
//   1. الهاتف يمسح QR الذي يعرضه سطح المكتب → يحوي { ip, port, key, shopName }
//   2. يُرسل POST /api/pair { deviceName, connectionKey } → يتحقق من connectionKey
//   3. عند النجاح: يُنشئ entry في connected_devices + session_token (يُعاد للهاتف)
//   4. كل الطلبات اللاحقة تحمل x-session-token + x-device-id
//
// الجلسات محفوظة في قاعدة البيانات (device_sessions) وتُحمّل إلى الذاكرة عند بدء التشغيل.

import type { FastifyInstance } from 'fastify';
import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import * as fs from 'node:fs';
import * as child_process from 'node:child_process';
import {
  queryOne,
  queryAll,
  execute,
} from '../../handlers/db-utils';
import { licenseManager } from '../../license/licenseManager';
import { isDeveloperModeActive } from '../../handlers/auth';

/**
 * جلسات الأجهزة النشطة — مُحمّلة من قاعدة البيانات.
 * Key = session_token, Value = { deviceId, userId, pairedAt }
 */
const activeSessions = new Map<string, { deviceId: string; userId: string | null; pairedAt: string }>();

/**
 * تحميل الجلسات من قاعدة البيانات عند بدء التشغيل
 */
function loadSessionsFromDB(): void {
  try {
    execute("UPDATE device_sessions SET expires_at = datetime('now') WHERE expires_at IS NULL AND (last_seen < datetime('now', '-7 days') OR last_seen IS NULL)");
    activeSessions.clear();
    const rows = queryAll(
      "SELECT session_token, device_id, user_id, paired_at, expires_at FROM device_sessions WHERE expires_at IS NULL OR expires_at > datetime('now')"
    );
    for (const row of rows) {
      activeSessions.set(row.session_token as string, {
        deviceId: row.device_id as string,
        userId: row.user_id as string | null,
        pairedAt: row.paired_at as string,
      });
    }
    console.log(`[pair] تم تحميل ${activeSessions.size} جلسة نشطة من قاعدة البيانات`);
  } catch (err) {
    console.warn('[pair] خطأ في تحميل الجلسات:', err);
  }
}

/**
 * مقارنة آمنة زمنياً (لمكافحة توقيت التخمين)
 */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * التحقق من أن جلسة صالحة (يُستدعى من onRequest hook)
 */
export async function verifySession(token: string, deviceId?: string): Promise<boolean> {
  // أولاً: تحقق من الذاكرة (سريع)
  const session = activeSessions.get(token);
  if (session) {
    if (deviceId && session.deviceId !== deviceId) return false;
    const targetDevId = deviceId || session.deviceId;
    if (targetDevId) {
      const devRow = queryOne('SELECT status FROM connected_devices WHERE id = ?', [targetDevId]);
      if (devRow && devRow.status === 'offline') {
        activeSessions.delete(token);
        return false;
      }
    }
    // تحديث last_seen
    try {
      execute('UPDATE device_sessions SET last_seen = ? WHERE session_token = ?',
        [new Date().toISOString(), token]);
    } catch { /* non-blocking */ }
    return true;
  }

  // ثانياً: تحقق من قاعدة البيانات (إذا لم تكن في الذاكرة)
  try {
    const row = queryOne(
      "SELECT session_token, device_id FROM device_sessions WHERE session_token = ? AND (expires_at IS NULL OR expires_at > datetime('now'))",
      [token]
    );
    if (row) {
      if (deviceId && row.device_id !== deviceId) return false;
      const targetDevId = deviceId || (row.device_id as string);
      if (targetDevId) {
        const devRow = queryOne('SELECT status FROM connected_devices WHERE id = ?', [targetDevId]);
        if (devRow && devRow.status === 'offline') {
          return false;
        }
      }
      // أعد تحميلها في الذاكرة
      activeSessions.set(token, {
        deviceId: row.device_id as string,
        userId: null,
        pairedAt: new Date().toISOString(),
      });
      execute('UPDATE device_sessions SET last_seen = ? WHERE session_token = ?',
        [new Date().toISOString(), token]);
      return true;
    }
  } catch { /* ignore */ }

  return false;
}

/**
 * حفظ الجلسة في قاعدة البيانات
 */
function persistSession(
  sessionToken: string,
  deviceId: string,
  deviceName: string,
  userId?: string,
): void {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    execute(
      `INSERT INTO device_sessions (id, session_token, device_id, device_name, user_id, paired_at, last_seen, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, sessionToken, deviceId, deviceName, userId || null, now, now, now]
    );
  } catch (err) {
    console.warn('[pair] خطأ في حفظ الجلسة:', err);
  }
}

/**
 * حذف الجلسة من قاعدة البيانات
 */
function deleteSession(sessionToken: string): void {
  try {
    execute('DELETE FROM device_sessions WHERE session_token = ?', [sessionToken]);
  } catch { /* ignore */ }
}

/**
 * استخراج عنوان MAC العتادي من جدول الـ ARP الخاص بنظام التشغيل
 */
export function resolveMacFromArp(ip: string): string {
  if (!ip || ip === '127.0.0.1' || ip === 'localhost' || ip === '::1') return '';
  const cleanIp = ip.replace(/^::ffff:/, '');
  try {
    if (process.platform === 'linux') {
      if (fs.existsSync('/proc/net/arp')) {
        const content = fs.readFileSync('/proc/net/arp', 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts[0] === cleanIp && parts[3] && parts[3] !== '00:00:00:00:00:00') {
            return parts[3].toLowerCase();
          }
        }
      }
    } else if (process.platform === 'win32') {
      const stdout = child_process.execSync(`arp -a ${cleanIp}`, { encoding: 'utf8', timeout: 1500 });
      const match = stdout.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/);
      if (match) {
        return match[0].replace(/-/g, ':').toLowerCase();
      }
    } else if (process.platform === 'darwin') {
      const stdout = child_process.execSync(`arp -n ${cleanIp}`, { encoding: 'utf8', timeout: 1500 });
      const match = stdout.match(/([0-9a-fA-F]{1,2}:){5}[0-9a-fA-F]{1,2}/);
      if (match) {
        return match[0].toLowerCase();
      }
    }
  } catch {
    // Non-blocking fallback
  }
  return '';
}

/**
 * توليد اسم فريد للجهاز ومنع التكرار نهائياً في النظام.
 * إذا كان الاسم مستخدماً لجهاز آخر، يتم إلحاق رقم تسلسلي تصاعدي: "Device (2)", "Device (3)" ...
 */
export function generateUniqueDeviceName(requestedName: string, currentDeviceId?: string): string {
  const base = (requestedName || 'جهاز غير معروف').trim();

  // استعلام عن كل الأسماء المسجلة للأجهزة الأخرى
  const query = currentDeviceId
    ? 'SELECT device_name FROM connected_devices WHERE id != ?'
    : 'SELECT device_name FROM connected_devices';
  const params = currentDeviceId ? [currentDeviceId] : [];
  const rows = queryAll(query, params);

  const existingNames = new Set(
    rows.map((r: any) => ((r.device_name as string) || '').trim().toLowerCase())
  );

  if (!existingNames.has(base.toLowerCase())) {
    return base;
  }

  // إذا كان الاسم مكرراً، نبحث عن أول ترقيم شاغر
  let index = 2;
  while (existingNames.has(`${base} (${index})`.toLowerCase())) {
    index++;
  }
  return `${base} (${index})`;
}

export interface PairPayload {
  deviceName: string;
  connectionKey: string;
  deviceType?: string;
  deviceUniqueId?: string;
  deviceModel?: string;
  deviceBrand?: string;
  ipAddress?: string;
  macAddress?: string;
  model?: string;
  vendor?: string;
  deviceId?: string;
  hardwareId?: string;
  appName?: string;
  appVersion?: string;
}

/**
 * إقران جهاز جديد أو إعادة ربط جهاز قائم — يتحقق من connection_key
 * ويمنع التكرار ويضمن تفرد الاسم ويخزن كافة المعطيات الـ 5 (الاسم، MAC، IP، الطراز، النوع).
 */
async function pairDevice(
  payload: PairPayload,
  clientIp?: string
): Promise<{
  success: boolean;
  sessionToken?: string;
  deviceId?: string;
  deviceName?: string;
  macAddress?: string;
  ipAddress?: string;
  model?: string;
  vendor?: string;
  deviceType?: string;
  appName?: string;
  appVersion?: string;
  error?: { status: number; detail: string };
}> {
  // مفتاح الاتصال المخزّن
  const settings = queryOne("SELECT connection_key FROM network_settings WHERE id = 'default'");
  if (!settings?.connection_key) {
    return { error: { status: 500, detail: 'مفتاح الاتصال غير مهيّأ على سطح المكتب' } };
  }
  if (!payload.connectionKey || !safeEqual(payload.connectionKey, settings.connection_key as string)) {
    return { error: { status: 401, detail: 'مفتاح الاتصال غير صحيح' } };
  }
  if (!payload.deviceName) {
    return { error: { status: 422, detail: 'اسم الجهاز مطلوب' } };
  }

  // 1. تحديد عنوان IP الفعلي
  let resolvedIp = (payload.ipAddress || clientIp || '').trim();
  if (resolvedIp.startsWith('::ffff:')) {
    resolvedIp = resolvedIp.substring(7);
  }
  if (resolvedIp === '::1' || resolvedIp === 'localhost') {
    resolvedIp = '127.0.0.1';
  }

  // 2. تحديد عنوان MAC الفعلي (من الحمولة أولاً، أو من جدول الـ ARP)
  let resolvedMac = (payload.macAddress || '').trim().toLowerCase();
  if (!resolvedMac || resolvedMac === '02:00:00:00:00:00' || resolvedMac === '00:00:00:00:00:00') {
    const arpMac = resolveMacFromArp(resolvedIp);
    if (arpMac) resolvedMac = arpMac;
  }

  // 3. تحديد نوع الجهاز واسم الطراز والشركة المصنعة وبيانات التطبيق والمعرف الفريد
  const deviceUniqueId = (payload.deviceUniqueId || payload.hardwareId || '').trim();
  const deviceType = (payload.deviceType || 'mobile').trim();
  const model = (payload.deviceModel || payload.model || '').trim();
  const vendor = (payload.deviceBrand || payload.vendor || '').trim();
  const appName = (payload.appName || '').trim();
  const appVersion = (payload.appVersion || '').trim();

  // فحص الحد الأقصى لأجهزة الهاتف المصرح بربطها من الترخيص
  const isDev = isDeveloperModeActive();
  const maxAllowed = isDev ? 999 : licenseManager.getMaxMobileDevices();

  // 4. فحص ما إذا كان هذا الجهاز الفعلي مسجلاً مسبقاً ( لمنع إنشاء صفوف مكررة لنفس الجهاز )
  let existingDevice: any = null;

  // أ. بالمعرّف الفريد الثابت device_unique_id أولاً (الأولوية القصوى لمنع التكرار)
  if (deviceUniqueId) {
    existingDevice = queryOne("SELECT * FROM connected_devices WHERE device_unique_id = ? AND device_unique_id != ''", [deviceUniqueId]);
  }

  // ب. بالمعرّف الصريح إن تم تمريره
  if (!existingDevice && payload.deviceId) {
    existingDevice = queryOne('SELECT * FROM connected_devices WHERE id = ?', [payload.deviceId]);
  }

  // ج. بعنوان MAC إن كان فريداً وصالحاً
  if (!existingDevice && resolvedMac && resolvedMac !== '02:00:00:00:00:00' && resolvedMac !== '00:00:00:00:00:00') {
    existingDevice = queryOne('SELECT * FROM connected_devices WHERE LOWER(mac_address) = LOWER(?)', [resolvedMac]);
  }

  // د. بعنوان IP ومطابقة الطراز في حال عدم توفر MAC
  if (!existingDevice && resolvedIp && model && resolvedIp !== '127.0.0.1') {
    existingDevice = queryOne('SELECT * FROM connected_devices WHERE ip_address = ? AND model = ?', [resolvedIp, model]);
  }

  const deviceId = existingDevice ? (existingDevice.id as string) : randomUUID();
  const now = new Date().toISOString();

  // 5. ضمان عدم تكرار اسم الجهاز (Collision Prevention)
  // إذا كان الجهاز قديماً واسمه لم يتغير، نحتفظ به. وإن طُلب اسم جديد أو كان جهازاً جديداً، نضمن تفرده.
  const finalDeviceName = generateUniqueDeviceName(
    payload.deviceName || (existingDevice?.device_name as string) || 'هاتف محمول',
    deviceId
  );

  // تنظيف الجلسات القديمة لنفس الجهاز
  try {
    execute(
      "UPDATE device_sessions SET expires_at = datetime('now') WHERE expires_at IS NULL AND (last_seen < datetime('now', '-1 day') OR device_id = ? OR device_name = ?)",
      [deviceId, finalDeviceName]
    );
    for (const [token] of activeSessions.entries()) {
      const activeRow = queryOne(
        "SELECT id FROM device_sessions WHERE session_token = ? AND (expires_at IS NULL OR expires_at > datetime('now'))",
        [token]
      );
      if (!activeRow) {
        activeSessions.delete(token);
      }
    }
  } catch {}

  const currentCountRow = queryOne(
    `SELECT COUNT(DISTINCT COALESCE(NULLIF(c.device_unique_id, ''), c.id, s.device_id)) as count
     FROM device_sessions s
     LEFT JOIN connected_devices c ON s.device_id = c.id
     WHERE s.expires_at IS NULL OR s.expires_at > datetime('now')`
  );
  const currentCount = typeof currentCountRow?.count === 'number'
    ? (currentCountRow.count as number)
    : activeSessions.size;

  if (!isDev && !existingDevice && currentCount >= maxAllowed) {
    return {
      error: {
        status: 403,
        detail: `تم الوصول للحد الأقصى لعدد الأجهزة المرخصة لهذا المتجر (${maxAllowed} أجهزة). يرجى فصل جهاز قديم أو ترقية الترخيص.`,
      },
    };
  }

  // 6. حفظ أو تحديث بيانات الجهاز في جدول connected_devices (مع كافة الحقول)
  if (existingDevice) {
    execute(
      `UPDATE connected_devices SET
        device_name = ?,
        device_type = ?,
        connection_type = 'network',
        ip_address = ?,
        mac_address = ?,
        status = 'online',
        last_seen = ?,
        vendor = ?,
        model = ?,
        device_unique_id = CASE WHEN ? != '' THEN ? ELSE device_unique_id END,
        app_name = ?,
        app_version = ?,
        updated_at = ?
       WHERE id = ?`,
      [
        finalDeviceName,
        deviceType || existingDevice.device_type || 'mobile',
        resolvedIp || existingDevice.ip_address || '',
        resolvedMac || existingDevice.mac_address || '',
        now,
        vendor || existingDevice.vendor || '',
        model || existingDevice.model || '',
        deviceUniqueId,
        deviceUniqueId,
        appName || existingDevice.app_name || '',
        appVersion || existingDevice.app_version || '',
        now,
        deviceId,
      ]
    );
  } else {
    execute(
      `INSERT INTO connected_devices (
        id, device_name, device_type, connection_type, ip_address, mac_address, status, last_seen, vendor, model, device_unique_id, app_name, app_version, created_at, updated_at
      ) VALUES (?, ?, ?, 'network', ?, ?, 'online', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        deviceId,
        finalDeviceName,
        deviceType,
        resolvedIp,
        resolvedMac,
        now,
        vendor,
        model,
        deviceUniqueId,
        appName,
        appVersion,
        now,
        now,
      ]
    );
  }

  // توليد session_token آمن 32 بايت = 64 hex
  const sessionToken = randomBytes(32).toString('hex');

  // حفظ في الذاكرة + قاعدة البيانات
  activeSessions.set(sessionToken, { deviceId, userId: null, pairedAt: now });
  persistSession(sessionToken, deviceId, finalDeviceName);

  return {
    success: true,
    sessionToken,
    deviceId,
    deviceName: finalDeviceName,
    macAddress: resolvedMac,
    ipAddress: resolvedIp,
    model,
    vendor,
    deviceType,
    appName,
    appVersion,
  };
}

/**
 * فصل جهاز (إلغاء الاقتران)
 */
export async function unpairDevice(deviceId: string, sessionToken: string): Promise<{ success: boolean }> {
  // حذف من الذاكرة
  const session = activeSessions.get(sessionToken);
  if (session?.deviceId === deviceId) {
    activeSessions.delete(sessionToken);
  }

  // حذف من قاعدة البيانات
  deleteSession(sessionToken);

  execute('UPDATE connected_devices SET status = ?, updated_at = ? WHERE id = ?',
    ['offline', new Date().toISOString(), deviceId]);
  return { success: true };
}

/**
 * إبطال كافة جلسات جهاز محدد (عند فصله من سطح المكتب)
 */
export function invalidateDeviceSessions(deviceId: string): void {
  for (const [token, session] of activeSessions.entries()) {
    if (session.deviceId === deviceId) {
      activeSessions.delete(token);
    }
  }
  try {
    execute(
      "UPDATE device_sessions SET expires_at = datetime('now') WHERE device_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))",
      [deviceId]
    );
  } catch (err) {
    console.warn('[pair] خطأ في إبطال جلسات الجهاز:', err);
  }
}

/**
 * تفريغ وإبطال كافة الجلسات النشطة (عند تجديد المفتاح السري لسطح المكتب)
 */
export function invalidateAllSessions(): void {
  activeSessions.clear();
  try {
    execute(
      "UPDATE device_sessions SET expires_at = datetime('now') WHERE expires_at IS NULL OR expires_at > datetime('now')"
    );
  } catch (err) {
    console.warn('[pair] خطأ في إبطال كافة الجلسات:', err);
  }
}

/**
 * مسارات الاقتران
 */
export async function registerPairRoutes(server: FastifyInstance): Promise<void> {
  loadSessionsFromDB();

  // POST /api/pair — اقتران جهاز جديد
  // public (لا يتطلب session token)
  const handlePairRequest = async (request: any, reply: any) => {
    const body = (request.body || {}) as any;
    const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip || request.socket?.remoteAddress;
    const result = await pairDevice(
      {
        deviceName: body.deviceName || '',
        connectionKey: body.connectionKey || body.key || body.code || body.pairingToken || '',
        deviceType: body.deviceType,
        deviceUniqueId: body.deviceUniqueId || body.hardwareId || (request.headers['x-device-unique-id'] as string) || '',
        deviceModel: body.deviceModel || body.model || '',
        deviceBrand: body.deviceBrand || body.vendor || '',
        ipAddress: body.ipAddress,
        macAddress: body.macAddress,
        model: body.model || body.deviceModel,
        vendor: body.vendor || body.deviceBrand,
        deviceId: body.deviceId,
        hardwareId: body.hardwareId || body.deviceUniqueId,
        appName: body.appName || body.app_name,
        appVersion: body.appVersion || body.app_version,
      },
      clientIp
    );
    if (result.error) {
      return reply.code(result.error.status).send({ error: result.error });
    }
    return reply.code(200).send(result);
  };

  server.post('/api/pair', handlePairRequest);
  server.post('/api/pair/confirm', handlePairRequest);

  // POST /api/pair/unpair — إلغاء اقتران (يتطلب session + deviceId من hook)
  server.post('/api/pair/unpair', async (request, reply) => {
    const sessionToken = request.headers['x-session-token'] as string;
    const deviceId = request.headers['x-device-id'] as string;
    if (!sessionToken || !deviceId) {
      return reply.code(422).send({ error: { status: 422, detail: 'deviceId + sessionToken مطلوبان' } });
    }
    await unpairDevice(deviceId, sessionToken);
    return reply.send({ success: true });
  });

  // GET /api/pair/info — معلومات الخادم (IPs، shopName، وبيانات المحل) — متاح قبل الاقتران
  server.get('/api/pair/info', async () => {
    const settings = queryOne("SELECT * FROM settings WHERE id = 'default'") || {};
    return {
      shopName: (settings.shop_name as string) || 'AN POS',
      shop_name: (settings.shop_name as string) || 'AN POS',
      requiresKey: true,
      settings,
      data: settings,
    };
  });

  // GET /api/pair/devices — قائمة الأجهزة المقترنة (يتطلب session)
  server.get('/api/pair/devices', async (request, reply) => {
    const sessionToken = request.headers['x-session-token'] as string;
    if (!sessionToken) {
      return reply.code(401).send({ error: { status: 401, detail: 'غير مصرح' } });
    }
    const devices = queryAll(
      'SELECT id, device_name, device_type, status, last_seen FROM connected_devices ORDER BY last_seen DESC'
    );
    return reply.send({ devices });
  });

  // POST & GET /api/heartbeat — نبض الجهاز وتأكيد الحالة الحية وتحديث المعطيات الخمسة
  const handleHeartbeat = async (request: any, reply: any) => {
    const sessionToken = request.headers['x-session-token'] as string | undefined;
    const deviceId = request.headers['x-device-id'] as string | undefined;

    if (!sessionToken || !deviceId) {
      return reply.code(401).send({ error: { status: 401, detail: 'معرف الجلسة ومعرف الجهاز مطلوبان' } });
    }

    const valid = await verifySession(sessionToken, deviceId);
    if (!valid) {
      return reply.code(401).send({ error: { status: 401, detail: 'جلسة غير صالحة — يرجى إعادة الاقتران' } });
    }

    let clientIp = request.ip;
    if (clientIp.startsWith('::ffff:')) clientIp = clientIp.substring(7);

    const body = (request.body || {}) as Record<string, any>;
    const rawDevName = (request.headers['x-device-name'] ? decodeURIComponent(request.headers['x-device-name'] as string) : body.deviceName) as string | undefined;
    const rawModel = (request.headers['x-device-model'] ? decodeURIComponent(request.headers['x-device-model'] as string) : body.model) as string | undefined;
    const rawVendor = (request.headers['x-device-vendor'] ? decodeURIComponent(request.headers['x-device-vendor'] as string) : body.vendor) as string | undefined;
    const rawType = ((request.headers['x-device-type'] as string) || body.deviceType) as string | undefined;
    const rawMac = ((request.headers['x-device-mac'] as string) || body.macAddress) as string | undefined;
    const rawAppName = (request.headers['x-app-name'] ? decodeURIComponent(request.headers['x-app-name'] as string) : body.appName || body.app_name) as string | undefined;
    const rawAppVersion = ((request.headers['x-app-version'] as string) || body.appVersion || body.app_version) as string | undefined;

    const arpMac = resolveMacFromArp(clientIp);
    const effectiveMac = arpMac || rawMac;

    const existing = queryOne('SELECT * FROM connected_devices WHERE id = ?', [deviceId]);
    if (existing) {
      const isLoopback = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost';
      const newIp = !isLoopback ? clientIp : (existing.ip_address || clientIp);
      const newMac = effectiveMac || existing.mac_address || '';
      const newModel = rawModel || existing.model || '';
      const newVendor = rawVendor || existing.vendor || '';
      const newType = rawType || existing.device_type || 'mobile';
      const newAppName = rawAppName || existing.app_name || '';
      const newAppVersion = rawAppVersion || existing.app_version || '';

      let newName = (existing.device_name as string) || 'Mobile Device';
      if ((newName === 'AN POS Mobile' || newName === 'Mobile Device') && rawDevName && rawDevName !== 'AN POS Mobile') {
        newName = generateUniqueDeviceName(rawDevName, deviceId);
        execute('UPDATE device_sessions SET device_name = ? WHERE device_id = ?', [newName, deviceId]);
      }

      execute(
        `UPDATE connected_devices SET
          device_name = ?,
          device_type = ?,
          ip_address = ?,
          mac_address = ?,
          model = ?,
          vendor = ?,
          app_name = ?,
          app_version = ?,
          status = 'online',
          last_seen = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          newName,
          newType,
          newIp,
          newMac,
          newModel,
          newVendor,
          newAppName,
          newAppVersion,
          new Date().toISOString(),
          new Date().toISOString(),
          deviceId,
        ]
      );

      return reply.send({
        ok: true,
        status: 'online',
        deviceId,
        deviceName: newName,
        ip: newIp,
        mac: newMac,
        model: newModel,
        vendor: newVendor,
        appName: newAppName,
        appVersion: newAppVersion,
        serverTime: new Date().toISOString(),
      });
    }

    return reply.code(404).send({ error: { status: 404, detail: 'الجهاز غير مسجل' } });
  };

  server.post('/api/heartbeat', handleHeartbeat);
  server.get('/api/heartbeat', handleHeartbeat);

  // POST /api/devices/heartbeat — نبض الجهاز المخصص بالمعرف الفريد
  server.post('/api/devices/heartbeat', async (request: any, reply: any) => {
    const body = (request.body || {}) as Record<string, any>;
    const deviceUniqueId = (body.deviceUniqueId || request.headers['x-device-unique-id'] || body.hardwareId) as string | undefined;
    const sessionToken = request.headers['x-session-token'] as string | undefined;
    const deviceId = (request.headers['x-device-id'] || body.deviceId) as string | undefined;

    let targetDevice: any = null;
    if (deviceUniqueId) {
      targetDevice = queryOne("SELECT * FROM connected_devices WHERE device_unique_id = ? AND device_unique_id != ''", [deviceUniqueId]);
    }
    if (!targetDevice && deviceId) {
      targetDevice = queryOne('SELECT * FROM connected_devices WHERE id = ?', [deviceId]);
    }
    if (!targetDevice && sessionToken) {
      const sess = queryOne('SELECT device_id FROM device_sessions WHERE session_token = ?', [sessionToken]);
      if (sess?.device_id) {
        targetDevice = queryOne('SELECT * FROM connected_devices WHERE id = ?', [sess.device_id]);
      }
    }

    if (targetDevice) {
      const now = new Date().toISOString();
      execute(
        `UPDATE connected_devices SET status = 'online', last_seen = ?, updated_at = ? WHERE id = ?`,
        [now, now, targetDevice.id]
      );
      if (sessionToken) {
        execute(
          `UPDATE device_sessions SET last_seen = ? WHERE session_token = ?`,
          [now, sessionToken]
        );
      }
      return reply.send({
        ok: true,
        status: 'online',
        deviceId: targetDevice.id,
        deviceUniqueId: targetDevice.device_unique_id,
        deviceName: targetDevice.device_name,
        lastSeen: now,
      });
    }

    return reply.code(404).send({ error: { status: 404, detail: 'الجهاز غير مسجل' } });
  });

  console.log('[pair] مسارات الاقتران ونبض الأجهزة مسجلة');
}

