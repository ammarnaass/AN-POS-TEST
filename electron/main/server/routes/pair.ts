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
import {
  queryOne,
  queryAll,
  execute,
} from '../../handlers/db-utils';

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
 * إقران جهاز جديد — يتحقق من connection_key ويُنشئ entry + session_token.
 */
async function pairDevice(
  payload: { deviceName: string; connectionKey: string; deviceType?: string }
): Promise<{ success: boolean; sessionToken?: string; deviceId?: string; error?: { status: number; detail: string } }> {
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

  // إنشاء entry في connected_devices
  const deviceId = randomUUID();
  const now = new Date().toISOString();
  execute(
    'INSERT INTO connected_devices (id, device_name, device_type, connection_type, status, last_seen, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      deviceId,
      payload.deviceName,
      payload.deviceType || 'mobile',
      'network',
      'online',
      now,
      now,
      now,
    ]
  );

  // توليد session_token آمن 32 بايت = 64 hex
  const sessionToken = randomBytes(32).toString('hex');

  // حفظ في الذاكرة + قاعدة البيانات
  activeSessions.set(sessionToken, { deviceId, userId: null, pairedAt: now });
  persistSession(sessionToken, deviceId, payload.deviceName);

  return { success: true, sessionToken, deviceId };
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
 * مسارات الاقتران
 */
export async function registerPairRoutes(server: FastifyInstance): Promise<void> {
  loadSessionsFromDB();

  // POST /api/pair — اقتران جهاز جديد
  // public (لا يتطلب session token)
  server.post('/api/pair', async (request, reply) => {
    const body = request.body as { deviceName?: string; connectionKey?: string; deviceType?: string };
    const result = await pairDevice({
      deviceName: body.deviceName || '',
      connectionKey: body.connectionKey || '',
      deviceType: body.deviceType,
    });
    if (result.error) {
      return reply.code(result.error.status).send({ error: result.error });
    }
    return reply.code(200).send(result);
  });

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

  // GET /api/pair/info — معلومات الخادم (IPs، shopName) — متاح قبل الاقتران لعرضه في الـ QR
  server.get('/api/pair/info', async () => {
    const settings = queryOne("SELECT shop_name FROM settings WHERE id = 'default'") || {};
    return {
      shopName: (settings.shop_name as string) || 'AN POS',
      requiresKey: true,
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

  console.log('[pair] مسارات الاقتران مسجلة');
}
