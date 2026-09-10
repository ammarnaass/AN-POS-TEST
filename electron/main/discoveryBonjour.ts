import { Bonjour, Service } from 'bonjour-service';
import { getNetworkSettings } from './server/index';
import { queryOne } from './handlers/db-utils';

let bonjour: Bonjour | null = null;
let publishedService: Service | null = null;

export function startBonjourAdvertising(): void {
  if (bonjour) return;

  try {
    bonjour = new Bonjour(undefined, (err) => {
      console.error('[bonjour] خطأ في خدمة Bonjour:', err);
    });
    refreshAdvertisement();
  } catch (err) {
    console.error('[bonjour] تعذر تشغيل Bonjour:', err);
  }
}

export function refreshAdvertisement(): void {
  try {
    const netSettings = getNetworkSettings();
    const settings = queryOne("SELECT shop_name FROM settings WHERE id = 'default'") || {};
    const port = Number(netSettings?.server_port) || 3000;
    const shopName = (settings.shop_name as string) || 'AN POS';

    if (publishedService) {
      try {
        publishedService.stop();
      } catch {}
      publishedService = null;
    }

    if (!bonjour) {
      bonjour = new Bonjour(undefined, (err) => {
        console.error('[bonjour] خطأ في خدمة Bonjour:', err);
      });
    }

    publishedService = bonjour.publish({
      name: shopName,
      type: 'anpos', // نوع الخدمة القياسي لـ AN POS (_anpos._tcp.local)
      port,
      txt: { requiresPairing: 'true' },
    });

    console.log(`[bonjour] 📡 تم نشر إعلان mDNS: "${shopName}" على المنفذ ${port} (anpos._tcp.local)`);
  } catch (err) {
    console.error('[bonjour] فشل تحديث إعلان Bonjour:', err);
  }
}

export function stopBonjourAdvertising(): void {
  try {
    if (publishedService) {
      publishedService.stop();
      publishedService = null;
    }
    if (bonjour) {
      bonjour.destroy();
      bonjour = null;
    }
    console.log('[bonjour] 🛑 تم إيقاف إعلان Bonjour');
  } catch (err) {
    console.warn('[bonjour] خطأ عند إيقاف Bonjour:', err);
  }
}
