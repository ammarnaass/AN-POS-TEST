// خدمة اكتشاف الأجهزة على سطح المكتب — ترد على استعلامات الهاتف
// تعمل كـ HTTP endpoint يستجيب لطلبات /api/discover

import type { FastifyInstance } from 'fastify';
import os from 'node:os';
import { queryOne, execute } from '../../handlers/db-utils';

/**
 * الحصول على جميع عناوين IP المحلية
 */
function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const list of Object.values(interfaces)) {
    if (!list) continue;
    for (const iface of list) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

/**
 * تسجيل مسار الاكتشاف — ي respond لطلبات Android
 */
export async function registerDiscoveryRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/discover — endpoint مفتوح (لا يتطلب session)
  // يستخدمه الهاتف لاكتشاف الحاسوب على الشبكة
  server.get('/api/discover', async (_request, reply) => {
    const settings = queryOne("SELECT shop_name FROM settings WHERE id = 'default'") || {};
    const netSettings = queryOne("SELECT * FROM network_settings WHERE id = 'default'") || {};
    const ips = getLocalIpAddresses();

    return reply.send({
      type: 'anpos-discover',
      deviceName: os.hostname(),
      shopName: (settings.shop_name as string) || 'AN POS',
      port: Number(netSettings?.server_port) || 4321,
      ips,
      version: '1.0.0',
      platform: os.platform(),
      arch: os.arch(),
    });
  });

  // POST /api/discover/register — تسجيل الجهاز في network_settings
  server.post('/api/discover/register', async (request, reply) => {
    const body = request.body as { deviceName?: string; deviceType?: string };
    const sessionToken = request.headers['x-session-token'] as string;
    const deviceId = request.headers['x-device-id'] as string;

    if (!sessionToken || !deviceId) {
      return reply.code(401).send({ error: { status: 401, detail: 'غير مصرح' } });
    }

    // تحديث معلومات الجهاز
    execute(
      'UPDATE connected_devices SET device_name = ?, device_type = ?, last_seen = ?, updated_at = ? WHERE id = ?',
      [
        body.deviceName || 'Mobile Device',
        body.deviceType || 'mobile',
        new Date().toISOString(),
        new Date().toISOString(),
        deviceId,
      ]
    );

    return reply.send({ success: true });
  });

  console.log('[discovery] مسارات الاكتشاف مسجلة');
}
