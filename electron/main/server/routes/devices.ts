// مسار إدارة الأجهزة المتصلة — `/api/devices`
//
// يُوفّر واجهة موحّدة لعرض وتحديث جميع الأجهزة المسجّلة في النظام
// مع معلومات كاملة: الاسم، MAC، IP، الطراز، التطبيق، ونوع الاتصال.
//
// المسارات:
//   GET  /api/devices          → قائمة كاملة بكل الأجهزة + ملخص
//   GET  /api/devices/:id      → بيانات جهاز واحد محدد
//   PATCH /api/devices/:id     → تحديث اسم الجهاز / app_name / app_version
//
// الأمان: جميع المسارات محمية بـ x-session-token (تتحقق منها onRequest hook في index.ts)

import type { FastifyInstance } from 'fastify';
import { queryAll, queryOne, execute } from '../../handlers/db-utils';
import { generateUniqueDeviceName, resolveMacFromArp } from './pair';
import { randomUUID } from 'node:crypto';

/** أنواع الاتصال المدعومة */
const CONNECTION_TYPES = ['network', 'lan', 'usb', 'bluetooth', 'direct'] as const;
type ConnectionType = typeof CONNECTION_TYPES[number];

/**
 * بناء "بصمة الاتصال" الفريدة للجهاز:
 * تجمع MAC + IP + Model لتمييز الجهاز الفيزيائي بدون الاعتماد على ID وحده.
 */
function buildFingerprint(device: Record<string, any>): string {
  return [
    (device.mac_address as string) || '',
    (device.ip_address as string) || '',
    (device.model as string) || '',
  ]
    .map((s) => s.trim().toLowerCase())
    .join('|');
}

/**
 * تحويل صف قاعدة البيانات إلى كيان جهاز منظَّم للاستجابة
 */
function formatDevice(row: Record<string, any>) {
  return {
    id: row.id,
    device_unique_id: row.device_unique_id || '',
    device_name: row.device_name,
    device_type: row.device_type || 'mobile',
    connection_type: row.connection_type || 'network',
    ip_address: row.ip_address || '',
    mac_address: row.mac_address || '',
    port: row.port ?? null,
    model: row.model || '',
    vendor: row.vendor || '',
    app_name: row.app_name || '',
    app_version: row.app_version || '',
    status: row.status || 'offline',
    last_seen: row.last_seen || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    connection_fingerprint: buildFingerprint(row),
  };
}

/**
 * تسجيل مسارات الأجهزة
 */
export async function registerDevicesRoutes(server: FastifyInstance): Promise<void> {

  // ─── GET /api/devices ────────────────────────────────────────────────────
  // قائمة كاملة بكل الأجهزة مع ملخص إحصائي
  server.get('/api/devices', async (_request, reply) => {
    const rows = queryAll(
      `SELECT * FROM connected_devices ORDER BY
         CASE WHEN status = 'online' THEN 0 ELSE 1 END,
         last_seen DESC`
    ) as Record<string, any>[];

    const devices = rows.map(formatDevice);

    // ملخص إحصائي
    const total = devices.length;
    const online = devices.filter((d) => d.status === 'online').length;

    const byType: Record<string, number> = {};
    const byConnection: Record<string, number> = {};
    const byApp: Record<string, number> = {};

    for (const d of devices) {
      byType[d.device_type] = (byType[d.device_type] ?? 0) + 1;
      byConnection[d.connection_type] = (byConnection[d.connection_type] ?? 0) + 1;
      if (d.app_name) {
        byApp[d.app_name] = (byApp[d.app_name] ?? 0) + 1;
      }
    }

    return reply.send({
      devices,
      summary: {
        total,
        online,
        offline: total - online,
        by_type: byType,
        by_connection: byConnection,
        by_app: byApp,
      },
    });
  });

  // ─── GET /api/devices/:id ─────────────────────────────────────────────────
  // بيانات جهاز واحد محدد بمعرّفه
  server.get<{ Params: { id: string } }>('/api/devices/:id', async (request, reply) => {
    const { id } = request.params;
    if (!id) {
      return reply.code(422).send({ error: { status: 422, detail: 'معرّف الجهاز مطلوب' } });
    }

    const row = queryOne('SELECT * FROM connected_devices WHERE id = ?', [id]) as Record<string, any> | null;
    if (!row) {
      return reply.code(404).send({ error: { status: 404, detail: 'الجهاز غير موجود' } });
    }

    return reply.send({ device: formatDevice(row) });
  });

  // ─── PATCH /api/devices/:id ───────────────────────────────────────────────
  // تحديث اسم الجهاز / app_name / app_version
  server.patch<{ Params: { id: string }; Body: Record<string, any> }>(
    '/api/devices/:id',
    async (request, reply) => {
      const { id } = request.params;
      const body = (request.body || {}) as Record<string, any>;

      if (!id) {
        return reply.code(422).send({ error: { status: 422, detail: 'معرّف الجهاز مطلوب' } });
      }

      const existing = queryOne('SELECT * FROM connected_devices WHERE id = ?', [id]) as Record<string, any> | null;
      if (!existing) {
        return reply.code(404).send({ error: { status: 404, detail: 'الجهاز غير موجود' } });
      }

      const now = new Date().toISOString();
      const updates: string[] = [];
      const params: (string | number | null)[] = [];

      // اسم الجهاز — مع ضمان التفرد
      if (typeof body.device_name === 'string' && body.device_name.trim()) {
        const uniqueName = generateUniqueDeviceName(body.device_name.trim(), id);
        updates.push('device_name = ?');
        params.push(uniqueName);
      }

      // اسم التطبيق
      if (typeof body.app_name === 'string') {
        updates.push('app_name = ?');
        params.push(body.app_name.trim());
      }

      // إصدار التطبيق
      if (typeof body.app_version === 'string') {
        updates.push('app_version = ?');
        params.push(body.app_version.trim());
      }

      // نوع الجهاز
      if (typeof body.device_type === 'string' && body.device_type.trim()) {
        updates.push('device_type = ?');
        params.push(body.device_type.trim());
      }

      if (updates.length === 0) {
        return reply.code(422).send({ error: { status: 422, detail: 'لا توجد حقول قابلة للتحديث في الطلب' } });
      }

      updates.push('updated_at = ?');
      params.push(now);
      params.push(id);

      execute(
        `UPDATE connected_devices SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      const updated = queryOne('SELECT * FROM connected_devices WHERE id = ?', [id]) as Record<string, any>;
      return reply.send({ success: true, device: formatDevice(updated) });
    }
  );

  
  // ─── POST /api/devices/connect & /api/devices/register ─────────────────────
  // مسار مخصص لتسجيل وحفظ وتحديث اتصال الأجهزة ومعطياتها الخمسة مع منع التكرار
  const handleDeviceConnect = async (request: any, reply: any) => {
    const body = (request.body || {}) as Record<string, any>;

    // 1. تحديد عنوان IP الفعلي
    let clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip || request.socket?.remoteAddress || '';
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }
    if (clientIp === '::1' || clientIp === 'localhost') {
      clientIp = '127.0.0.1';
    }
    const resolvedIp = (body.ipAddress || clientIp || '').trim();

    // 2. تحديد عنوان MAC الفعلي (من الحمولة أولاً، أو من جدول ARP)
    let rawMac = (body.macAddress || (request.headers['x-device-mac'] as string) || '').trim().toLowerCase();
    if (!rawMac || rawMac === '02:00:00:00:00:00' || rawMac === '00:00:00:00:00:00') {
      const arpMac = resolveMacFromArp(resolvedIp);
      if (arpMac) rawMac = arpMac;
    }
    const resolvedMac = rawMac;

    // 3. تحديد نوع وطراز والشركة والتطبيق والعتاد
    const rawDevName = (body.deviceName || (request.headers['x-device-name'] ? decodeURIComponent(request.headers['x-device-name'] as string) : '') || 'جهاز شبكة').trim();
    const model = (body.model || (request.headers['x-device-model'] ? decodeURIComponent(request.headers['x-device-model'] as string) : '') || '').trim();
    const vendor = (body.vendor || (request.headers['x-device-vendor'] ? decodeURIComponent(request.headers['x-device-vendor'] as string) : '') || '').trim();
    const deviceType = (body.deviceType || (request.headers['x-device-type'] as string) || 'mobile').trim();
    const connectionType = (body.connectionType || 'network').trim();
    const appName = (body.appName || body.app_name || (request.headers['x-app-name'] ? decodeURIComponent(request.headers['x-app-name'] as string) : '') || 'AN POS Mobile').trim();
    const appVersion = (body.appVersion || body.app_version || (request.headers['x-app-version'] as string) || '2.0.0').trim();
    const hardwareId = (body.hardwareId || (request.headers['x-device-hardware-id'] as string) || '').trim();
    const deviceUniqueId = (body.deviceUniqueId || hardwareId || (request.headers['x-device-unique-id'] as string) || '').trim();

    // 4. خوارزمية كشف ومنع التكرار (Deduplication Engine)
    let existingDevice: any = null;

    // أ. بالمعرّف الفريد الثابت device_unique_id أولاً
    if (deviceUniqueId) {
      existingDevice = queryOne("SELECT * FROM connected_devices WHERE device_unique_id = ? AND device_unique_id != ''", [deviceUniqueId]);
    }

    // ب. فحص بمعرف الجهاز إن تم تقديمه
    if (!existingDevice && body.deviceId) {
      existingDevice = queryOne('SELECT * FROM connected_devices WHERE id = ?', [body.deviceId]);
    }

    // ج. فحص بعنوان MAC العتادي إن وجد وكان صالحاً
    if (!existingDevice && resolvedMac && resolvedMac !== '02:00:00:00:00:00' && resolvedMac !== '00:00:00:00:00:00') {
      existingDevice = queryOne('SELECT * FROM connected_devices WHERE LOWER(mac_address) = LOWER(?)', [resolvedMac]);
    }

    // د. فحص بمطابقة (IP + Model) للأجهزة المحلية
    if (!existingDevice && resolvedIp && model && resolvedIp !== '127.0.0.1') {
      existingDevice = queryOne('SELECT * FROM connected_devices WHERE ip_address = ? AND model = ?', [resolvedIp, model]);
    }

    const deviceId = existingDevice ? (existingDevice.id as string) : (body.deviceId || randomUUID());
    const now = new Date().toISOString();

    // 5. ضمان تفرد الاسم ومنع التصادم (Collision Prevention)
    const finalDeviceName = generateUniqueDeviceName(
      rawDevName || (existingDevice?.device_name as string) || 'جهاز شبكة',
      deviceId
    );

    let isNew = false;
    if (existingDevice) {
      execute(
        `UPDATE connected_devices SET
          device_name = ?,
          device_type = ?,
          connection_type = ?,
          ip_address = ?,
          mac_address = ?,
          model = ?,
          vendor = ?,
          device_unique_id = CASE WHEN ? != '' THEN ? ELSE device_unique_id END,
          app_name = ?,
          app_version = ?,
          status = 'online',
          last_seen = ?,
          updated_at = ?
         WHERE id = ?`,
        [
          finalDeviceName,
          deviceType || existingDevice.device_type || 'mobile',
          connectionType,
          resolvedIp || existingDevice.ip_address || '',
          resolvedMac || existingDevice.mac_address || '',
          model || existingDevice.model || '',
          vendor || existingDevice.vendor || '',
          deviceUniqueId,
          deviceUniqueId,
          appName || existingDevice.app_name || '',
          appVersion || existingDevice.app_version || '',
          now,
          now,
          deviceId,
        ]
      );
    } else {
      isNew = true;
      execute(
        `INSERT INTO connected_devices (
          id, device_name, device_type, connection_type, ip_address, mac_address, status, last_seen, vendor, model, device_unique_id, app_name, app_version, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'online', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deviceId,
          finalDeviceName,
          deviceType,
          connectionType,
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

    const saved = queryOne('SELECT * FROM connected_devices WHERE id = ?', [deviceId]) as Record<string, any>;

    return reply.send({
      success: true,
      isNew,
      device: formatDevice(saved),
      network: {
        ip_address: resolvedIp,
        mac_address: resolvedMac,
        connection_type: connectionType,
      },
      connection: {
        status: 'online',
        last_seen: now,
        heartbeat_interval_ms: 15000,
      },
      details: {
        device_id: deviceId,
        device_name: finalDeviceName,
        model,
        vendor,
        app_name: appName,
        app_version: appVersion,
        device_type: deviceType,
      },
    });
  };

  server.post('/api/devices/connect', handleDeviceConnect);
  server.post('/api/devices/register', handleDeviceConnect);
  server.post('/api/devices/ping', handleDeviceConnect);

  console.log('[devices] مسارات الأجهزة مسجلة: GET /api/devices, GET /api/devices/:id, PATCH /api/devices/:id');
}
