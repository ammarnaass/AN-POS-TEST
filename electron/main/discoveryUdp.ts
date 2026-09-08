import dgram from 'node:dgram';
import os from 'node:os';
import { getNetworkSettings } from './server/index';
import { queryOne } from './handlers/db-utils';

export const DISCOVERY_UDP_PORT = 41999; // ثابت للأبد — منفصل عن server_port

let socket: dgram.Socket | null = null;

export function startDiscoveryListener(): void {
  if (socket) return;

  try {
    const s = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    s.on('error', (err) => {
      console.warn('[discovery-udp] خطأ في مقبس UDP:', err.message);
    });

    s.on('message', (msg, rinfo) => {
      try {
        const data = JSON.parse(msg.toString('utf8'));
        if (data?.type !== 'anpos-discover-request') return;

        const netSettings = getNetworkSettings();
        const settings = queryOne("SELECT shop_name FROM settings WHERE id = 'default'") || {};
        const reply = JSON.stringify({
          type: 'anpos-discover-reply',
          v: 1,
          port: Number(netSettings?.server_port) || 4321,
          shopName: (settings.shop_name as string) || 'AN POS',
          deviceName: os.hostname(),
          requiresPairing: true,
        });

        const replyBuffer = Buffer.from(reply, 'utf8');
        s.send(replyBuffer, 0, replyBuffer.length, rinfo.port, rinfo.address, (sendErr) => {
          if (sendErr) {
            console.warn('[discovery-udp] تعذر إرسال الرد:', sendErr.message);
          }
        });
      } catch {
        /* تجاهل الرسائل غير الصالحة */
      }
    });

    s.bind(DISCOVERY_UDP_PORT, '0.0.0.0', () => {
      console.log(`[discovery-udp] 📡 يستمع لاكتشاف الأجهزة على منفذ UDP ${DISCOVERY_UDP_PORT}`);
    });

    socket = s;
  } catch (err: any) {
    console.warn('[discovery-udp] تعذر تشغيل مستمع UDP:', err?.message || err);
    socket = null;
  }
}

export function stopDiscoveryListener(): void {
  if (!socket) return;
  try {
    socket.close();
  } catch {
    /* ignore */
  }
  socket = null;
  console.log('[discovery-udp] تم إيقاف مستمع UDP');
}
