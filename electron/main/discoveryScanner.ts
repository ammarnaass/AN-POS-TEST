// محرك اكتشاف خوادم الشبكة المحلية التلقائي (Zero-Config LAN Server Scanner)
// يدعم الاكتشاف المزدوج:
// 1. بروتوكول البث الإذاعي السريع (UDP Broadcast) على منفذ 41999
// 2. بروتوكول البونجور والـ mDNS القياسي (_anpos._tcp)
//
// يقوم بفحص الأجهزة والتحقق من صحتها عبر مسار /api/health وتحديد زمن الاستجابة (Ping)

import dgram from 'node:dgram';
import os from 'node:os';
import { Bonjour } from 'bonjour-service';
import { DISCOVERY_UDP_PORT } from './discoveryUdp';

export interface DiscoveredServer {
  ip: string;
  port: number;
  serverUrl: string;
  shopName: string;
  deviceName: string;
  protocol: 'udp' | 'mdns' | 'udp+mdns';
  version?: string;
  pingMs?: number;
  requiresPairing?: boolean;
}

/**
 * حساب عناوين البث الإذاعي (Broadcast Addresses) لجميع كروت الشبكة المحلية
 */
function getBroadcastAddresses(): string[] {
  const broadcasts = new Set<string>();
  broadcasts.add('255.255.255.255');
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal && iface.netmask) {
          const ipParts = iface.address.split('.').map(Number);
          const maskParts = iface.netmask.split('.').map(Number);
          if (ipParts.length === 4 && maskParts.length === 4) {
            const bcast = ipParts.map((p, i) => (p | (~maskParts[i] & 255))).join('.');
            broadcasts.add(bcast);
          }
        }
      }
    }
  } catch {}
  return Array.from(broadcasts);
}

/**
 * فحص الشبكة المحلية لاكتشاف خوادم AN POS المتاحة
 */
export async function scanLocalServers(timeoutMs = 3500): Promise<DiscoveredServer[]> {
  const serversMap = new Map<string, DiscoveredServer>();

  const registerDiscovered = (server: {
    ip: string;
    port: number;
    shopName: string;
    deviceName: string;
    protocol: 'udp' | 'mdns';
    requiresPairing?: boolean;
  }) => {
    let cleanIp = server.ip.trim();
    if (cleanIp.startsWith('::ffff:')) {
      cleanIp = cleanIp.substring(7);
    }
    const key = `${cleanIp}:${server.port}`;
    const existing = serversMap.get(key);
    if (existing) {
      if (existing.protocol !== server.protocol) {
        existing.protocol = 'udp+mdns';
      }
      if (server.shopName && server.shopName !== 'AN POS') {
        existing.shopName = server.shopName;
      }
      if (server.deviceName) {
        existing.deviceName = server.deviceName;
      }
    } else {
      serversMap.set(key, {
        ip: cleanIp,
        port: server.port,
        serverUrl: `http://${cleanIp}:${server.port}`,
        shopName: server.shopName || 'خادم AN POS',
        deviceName: server.deviceName || cleanIp,
        protocol: server.protocol,
        requiresPairing: server.requiresPairing ?? true,
      });
    }
  };

  // 1. تشغيل ماسح البث الإذاعي UDP Broadcast
  let udpSocket: dgram.Socket | null = null;
  try {
    udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    udpSocket.on('error', (err) => {
      console.warn('[discoveryScanner] خطأ في مقبس UDP الماسح:', err.message);
    });

    udpSocket.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString('utf8'));
        if (data?.type === 'anpos-discover-reply') {
          registerDiscovered({
            ip: rinfo.address,
            port: Number(data.port) || 3000,
            shopName: data.shopName || 'AN POS',
            deviceName: data.deviceName || rinfo.address,
            protocol: 'udp',
            requiresPairing: Boolean(data.requiresPairing),
          });
        }
      } catch {}
    });

    udpSocket.bind(0, () => {
      try {
        if (!udpSocket) return;
        udpSocket.setBroadcast(true);
        const req = Buffer.from(JSON.stringify({ type: 'anpos-discover-request', v: 1 }), 'utf8');
        const bcastAddrs = getBroadcastAddresses();
        for (const bcast of bcastAddrs) {
          udpSocket.send(req, 0, req.length, DISCOVERY_UDP_PORT, bcast, (err) => {
            if (err) {
              /* ignore individual iface error */
            }
          });
        }
      } catch (err: any) {
        console.warn('[discoveryScanner] تعذر إرسال طلب الاكتشاف عبر UDP:', err.message);
      }
    });
  } catch (err: any) {
    console.warn('[discoveryScanner] فشل إنشاء مقبس UDP الماسح:', err.message);
  }

  // 2. تشغيل ماسح Bonjour mDNS
  let bonjour: Bonjour | null = null;
  let browser: any = null;
  try {
    bonjour = new Bonjour();
    browser = bonjour.find({ type: 'anpos' }, (service) => {
      try {
        const port = Number(service.port) || 3000;
        const addresses = (service.addresses || []).filter((addr) => addr && !addr.includes(':'));
        const targetIp = addresses[0] || (service.host ? service.host.replace(/\.local\.?$/, '') : '');
        if (targetIp) {
          registerDiscovered({
            ip: targetIp,
            port,
            shopName: service.name || 'AN POS',
            deviceName: service.host || service.name || targetIp,
            protocol: 'mdns',
            requiresPairing: service.txt?.requiresPairing === 'true',
          });
        }
      } catch {}
    });
  } catch (err: any) {
    console.warn('[discoveryScanner] فشل تشغيل ماسح Bonjour:', err.message);
  }

  // انتظار انتهاء مدة المسح واستقبال الردود
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));

  // إغلاق المقابس وتنظيف الموارد
  try {
    if (udpSocket) {
      udpSocket.close();
      udpSocket = null;
    }
  } catch {}

  try {
    if (browser) {
      browser.stop();
      browser = null;
    }
    if (bonjour) {
      bonjour.destroy();
      bonjour = null;
    }
  } catch {}

  // 3. فحص الخوادم المكتشفة وتأكيد حيويتها وقياس زمن الاستجابة (Ping)
  const discoveredList = Array.from(serversMap.values());
  const verifiedList: DiscoveredServer[] = [];

  await Promise.all(
    discoveredList.map(async (server) => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${server.serverUrl}/api/health`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(tid);
        const latency = Date.now() - start;
        if (res.ok) {
          const healthData = await res.json().catch(() => ({}));
          verifiedList.push({
            ...server,
            pingMs: latency,
            version: healthData?.version || '2.5.1',
          });
        } else {
          // الخادم استجاب ولكن برمز مختلف — ما زال موجوداً
          verifiedList.push({
            ...server,
            pingMs: latency,
          });
        }
      } catch {
        // إذا تعذر فحص health لكن تم التقاطه بالبث، نحتفظ به بدون pingMs
        verifiedList.push(server);
      }
    })
  );

  // ترتيب الخوادم: أولاً التي لديها زمن استجابة (Ping)، ثم الأقل زمناً
  return verifiedList.sort((a, b) => {
    if (a.pingMs !== undefined && b.pingMs !== undefined) {
      return a.pingMs - b.pingMs;
    }
    if (a.pingMs !== undefined) return -1;
    if (b.pingMs !== undefined) return 1;
    return a.serverUrl.localeCompare(b.serverUrl);
  });
}
