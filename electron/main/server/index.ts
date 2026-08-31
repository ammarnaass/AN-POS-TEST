// خادم HTTP REST داخل Electron — يكشف نفس منطق IPC عبر HTTP للهاتف على شبكة LAN.
// يعيد استخدام دوال handlers/* المشتركة.
//
// التشغيل: يستدعى من main/index.ts بعد initDatabase() والـ seed.
// الإيقاف: يستدعى عند إغلاق النافذة أو تعطيل LAN من الإعدادات.

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { app } from 'electron';
import { createHash, randomBytes } from 'node:crypto';
import os from 'node:os';
import {
  queryOne,
  execute,
  type Row,
} from '../handlers/db-utils';
import { registerAuthRoutes } from './routes/auth';
import { registerCrudRoutes } from './routes/crud';
import { registerSalesRoutes } from './routes/sales';
import { registerCashRoutes } from './routes/cash';
import { registerCategoriesRoutes } from './routes/categories';
import { registerMiscRoutes } from './routes/misc';
import { registerPairRoutes, verifySession } from './routes/pair';
import { registerDiscoveryRoutes } from './routes/discovery';
import { registerSyncRoutes } from './routes/sync';
import { registerSettingsRoutes } from './routes/settings';

export interface ServerConfig {
  port?: number;
  host?: string;     // افتراضياً 0.0.0.0 (يستمع على كل الواجهات)
}

let serverInstance: FastifyInstance | null = null;

/**
 * تحديد جميع عناوين IPv4 المحلية للجهاز (لعرضها في شاشة QR)
 */
export function getLocalIpAddresses(): string[] {
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
 * الحصول على مفتاح الاتصال (connection_key) من network_settings.
 * إن لم يوجد، يُولّد ويُحفظ.
 */
export function getOrCreateConnectionKey(): string {
  const settings = queryOne("SELECT connection_key FROM network_settings WHERE id = 'default'");
  if (settings?.connection_key) {
    return settings.connection_key as string;
  }
  // توليد مفتاح جديد على شكل: XXXX-XXXX-XXXX-XXXX (hex كبير)
  const key = Array.from({ length: 4 }, () =>
    randomBytes(2).toString('hex').toUpperCase()
  ).join('-');
  execute("UPDATE network_settings SET connection_key = ?, updated_at = ? WHERE id = 'default'",
    [key, new Date().toISOString()]);
  return key;
}

/**
 * قراءة إعدادات الشبكة من جدول network_settings
 */
export function getNetworkSettings(): Row | null {
  return queryOne("SELECT * FROM network_settings WHERE id = 'default'");
}

/**
 * تشغيل خادم HTTP REST
 */
export async function startHttpServer(config: ServerConfig = {}): Promise<{ url: string; port: number; host: string }> {
  if (serverInstance) {
    console.warn('[http] الخادم يعمل مسبقاً');
    return { url: '', port: 0, host: '' };
  }

  const port = config.port ?? 4321;
  const host = config.host ?? '0.0.0.0';

  const netSettings = getNetworkSettings();
  const ipWhitelistRaw = (netSettings?.ip_whitelist as string) || '[]';
  let ipWhitelist: string[] = [];
  try {
    const parsed = JSON.parse(ipWhitelistRaw);
    if (Array.isArray(parsed)) ipWhitelist = parsed.map(String);
  } catch {
    // اتركها فارغة = اسمح للجميع (إذا force_https غير مفعّل)
  }

  const server = Fastify({
    logger: {
      level: app.isPackaged ? 'warn' : 'info',
      // توجيه السجلات لـ console بدل pino الافتراضي
      stream: process.stdout,
    },
    bodyLimit: 5 * 1024 * 1024, // 5 MB حد أقصى للجسم (	import Excel)
    // مُحرّك شجري بسيط لتحسين الأداء
    caseSensitive: false,
  });

  // ===== CORS =====
  const corsOrigins = (netSettings?.cors_origins as string) || '*';
  await server.register(cors, {
    origin: corsOrigins === '*' ? true : corsOrigins.split(',').map((s) => s.trim()),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-session-token', 'x-device-id', 'x-discovery', 'authorization', 'accept'],
    credentials: false,
  });

  // ===== مصادقة الجلسة لكل المسارات المحمية =====
  server.addHook('onRequest', async (request, reply) => {
    // المسارات العامة: health + pair + discover
    const path = request.url.split('?')[0];
    if (
      path.startsWith('/api/health') ||
      path.startsWith('/api/pair') ||
      path === '/api/discover'
    ) {
      return;
    }
    const token = request.headers['x-session-token'] as string | undefined;
    if (!token) {
      return reply.code(401).send({ error: { status: 401, detail: 'رمز الجلسة مطلوب (x-session-token)' } });
    }
    // التحقق من أن الجلسة موجودة في connected_devices
    const deviceId = request.headers['x-device-id'] as string | undefined;
    const valid = await verifySession(token, deviceId);
    if (!valid) {
      return reply.code(401).send({ error: { status: 401, detail: 'جلسة غير صالحة أو منتهية — يجب إعادة الاقتران' } });
    }
    // تحديث last_seen
    if (deviceId) {
      execute('UPDATE connected_devices SET last_seen = ?, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), new Date().toISOString(), deviceId]);
    }
  });

  // ===== تقييد IP (إن كان مُعيّناً) =====
  if (ipWhitelist.length > 0) {
    server.addHook('onRequest', async (request, reply) => {
      const clientIp = request.ip.split(':')[0];
      // استثناء localhost لتسهيل الاختبار المحلي
      if (clientIp === '127.0.0.1' || clientIp === '::1') return;
      if (!ipWhitelist.includes(clientIp)) {
        return reply.code(403).send({ error: { status: 403, detail: `عنوان IP غير مرخّص: ${clientIp}` } });
      }
    });
  }

  // ===== تسجيل المسارات =====
  await registerPairRoutes(server);
  await registerAuthRoutes(server);
  await registerSettingsRoutes(server);
  await registerCrudRoutes(server);
  await registerSalesRoutes(server);
  await registerCashRoutes(server);
  await registerCategoriesRoutes(server);
  await registerMiscRoutes(server);
  await registerDiscoveryRoutes(server);
  await registerSyncRoutes(server);

  // ===== health =====
  server.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    app: 'an-pos',
    version: app.getVersion(),
  }));

  // ===== معالج أخطاء موحّد =====
  server.setErrorHandler((error, _request, reply) => {
    const status = error.statusCode || 500;
    server.log.error({ err: error, status }, 'request failed');
    reply.code(status).send({
      error: {
        status,
        detail: error.message || 'خطأ داخلي في الخادم',
      },
    });
  });

  // ===== بدء الاستماع =====
  await server.listen({ port, host });
  serverInstance = server;

  console.log(`[http] 🚀 خادم AN-POS يعمل على http://${host}:${port}`);
  console.log(`[http] عناوين الوصول: ${getLocalIpAddresses().map((ip) => `http://${ip}:${port}`).join(', ')}`);

  return { url: `http://${host}:${port}`, port, host };
}

/**
 * إيقاف خادم HTTP
 */
export async function stopHttpServer(): Promise<void> {
  if (!serverInstance) return;
  await serverInstance.close();
  serverInstance = null;
  console.log('[http] 🛑 تم إيقاف خادم HTTP');
}

/**
 * هل الخادم يعمل؟
 */
export function isHttpServerRunning(): boolean {
  return serverInstance !== null;
}

/**
 * معلومات الاقتران (تُعطى لـ QR):
 * - ip (أول عنوان غير loopback)
 * - port
 * - key (connection_key)
 * - shopName
 */
export function getPairingInfo(): { ip: string; port: number; key: string; shopName: string; ips: string[] } {
  const netSettings = getNetworkSettings();
  const port = Number(netSettings?.server_port) || 4321;
  const key = getOrCreateConnectionKey();
  const settings = queryOne("SELECT shop_name FROM settings WHERE id = 'default'") || {};
  const ips = getLocalIpAddresses();
  return {
    ip: ips[0] || '127.0.0.1',
    port,
    key,
    shopName: (settings.shop_name as string) || 'AN POS',
    ips,
  };
}
