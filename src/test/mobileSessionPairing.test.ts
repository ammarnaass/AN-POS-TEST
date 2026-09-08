import { describe, it, expect, beforeEach, vi } from 'vitest';

// 1. Logic unit test for normalizeServerUrl
function normalizeServerUrl(rawUrl: string, defaultPort: string = '4321'): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  url = url.replace(/\/+$/, '');

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (!parsed.port && defaultPort) {
        parsed.port = defaultPort;
        return parsed.toString().replace(/\/+$/, '');
      }
      return url;
    } catch {
      return url;
    }
  }

  const parts = url.split(':');
  if (parts.length === 1) {
    return `http://${url}:${defaultPort}`;
  } else if (parts.length === 2) {
    const port = parts[1].replace(/[^0-9]/g, '');
    return `http://${parts[0]}:${port || defaultPort}`;
  }

  return `http://${url}`;
}

// 2. In-memory store implementation verifying pairedDeviceStore logic contracts
interface PairedDevice {
  deviceId: string;
  serverUrl: string;
  ip: string;
  port: number;
  shopName: string;
  deviceName: string;
  version: string;
  mode: 'lan' | 'cloud';
  pairedAt: string;
  lastSeenAt: string | null;
  lastStatus: 'online' | 'offline' | 'unauthorized' | 'unknown';
}

const STORAGE_KEYS = {
  APP_MODE: 'anpos_app_mode',
  SERVER_URL: 'anpos_server_url',
  SESSION_TOKEN: 'anpos_session_token',
  DEVICE_ID: 'anpos_device_id',
  CONNECTION_KEY: 'anpos_connection_key',
  USER_ID: 'anpos_user_id',
  PAIRED_DEVICE: 'anpos_paired_device',
  KNOWN_DEVICES: 'anpos_known_devices',
} as const;

class MockSecureStore {
  private data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<boolean> {
    this.data.set(key, value);
    return true;
  }
  async remove(key: string): Promise<boolean> {
    this.data.delete(key);
    return true;
  }
  async clear(): Promise<boolean> {
    this.data.clear();
    return true;
  }
}

describe('Stage 0 & 1: Port Normalization & Paired Device Store Logic', () => {
  let store: MockSecureStore;

  const MAX_KNOWN_DEVICES = 10;

  async function getPairedDevice(): Promise<PairedDevice | null> {
    const raw = await store.get(STORAGE_KEYS.PAIRED_DEVICE);
    return raw ? JSON.parse(raw) : null;
  }

  async function getKnownDevices(): Promise<PairedDevice[]> {
    const raw = await store.get(STORAGE_KEYS.KNOWN_DEVICES);
    return raw ? JSON.parse(raw) : [];
  }

  async function savePairedDevice(device: PairedDevice): Promise<void> {
    await store.set(STORAGE_KEYS.PAIRED_DEVICE, JSON.stringify(device));
    const known = await getKnownDevices();
    const filtered = known.filter((d) => d.serverUrl !== device.serverUrl && d.deviceId !== device.deviceId);
    const updated = [device, ...filtered].slice(0, MAX_KNOWN_DEVICES);
    await store.set(STORAGE_KEYS.KNOWN_DEVICES, JSON.stringify(updated));
  }

  async function updateLastSeen(
    status: 'online' | 'offline' | 'unauthorized' | 'unknown',
    extraMeta?: Partial<PairedDevice>
  ): Promise<void> {
    const current = await getPairedDevice();
    if (!current) return;
    const updated: PairedDevice = {
      ...current,
      ...extraMeta,
      lastSeenAt: new Date().toISOString(),
      lastStatus: status,
    };
    await savePairedDevice(updated);
  }

  async function removePairedDevice(): Promise<void> {
    await store.remove(STORAGE_KEYS.PAIRED_DEVICE);
  }

  async function setActiveDevice(serverUrl: string): Promise<boolean> {
    const known = await getKnownDevices();
    const target = known.find((d) => d.serverUrl === serverUrl);
    if (!target) return false;
    await savePairedDevice(target);
    return true;
  }

  beforeEach(() => {
    store = new MockSecureStore();
  });

  describe('normalizeServerUrl with unified port 4321', () => {
    it('defaults plain IP to port 4321', () => {
      expect(normalizeServerUrl('192.168.1.15')).toBe('http://192.168.1.15:4321');
      expect(normalizeServerUrl('localhost')).toBe('http://localhost:4321');
    });

    it('preserves existing custom port when specified in host:port', () => {
      expect(normalizeServerUrl('192.168.1.15:3000')).toBe('http://192.168.1.15:3000');
      expect(normalizeServerUrl('10.0.2.2:8080')).toBe('http://10.0.2.2:8080');
    });

    it('preserves existing custom port in URL with scheme', () => {
      expect(normalizeServerUrl('http://192.168.1.50:5000/')).toBe('http://192.168.1.50:5000');
      expect(normalizeServerUrl('https://pos.cloud.anpos.app')).toBe('https://pos.cloud.anpos.app:4321');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeServerUrl('')).toBe('');
      expect(normalizeServerUrl('   ')).toBe('');
    });
  });

  describe('pairedDeviceStore operations', () => {
    const sampleDevice: PairedDevice = {
      deviceId: 'dev_123',
      serverUrl: 'http://192.168.1.100:4321',
      ip: '192.168.1.100',
      port: 4321,
      shopName: 'متجر الأنوار',
      deviceName: 'كاشير رئيسي',
      version: '3.0.0',
      mode: 'lan',
      pairedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      lastStatus: 'online',
    };

    it('saves and retrieves active paired device', async () => {
      await savePairedDevice(sampleDevice);
      const retrieved = await getPairedDevice();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.shopName).toBe('متجر الأنوار');
      expect(retrieved?.ip).toBe('192.168.1.100');
      expect(retrieved?.port).toBe(4321);
      expect(retrieved?.lastStatus).toBe('online');
    });

    it('updates lastSeen status and metadata cleanly', async () => {
      await savePairedDevice(sampleDevice);
      await updateLastSeen('offline');
      let retrieved = await getPairedDevice();
      expect(retrieved?.lastStatus).toBe('offline');

      await updateLastSeen('online', { shopName: 'اسم جديد للمتجر' });
      retrieved = await getPairedDevice();
      expect(retrieved?.lastStatus).toBe('online');
      expect(retrieved?.shopName).toBe('اسم جديد للمتجر');
    });

    it('caps known devices at maximum 10 items without duplicates', async () => {
      for (let i = 1; i <= 15; i++) {
        await savePairedDevice({
          ...sampleDevice,
          deviceId: `dev_${i}`,
          serverUrl: `http://192.168.1.${i}:4321`,
          ip: `192.168.1.${i}`,
        });
      }

      const known = await getKnownDevices();
      expect(known.length).toBe(10);
      expect(known[0].serverUrl).toBe('http://192.168.1.15:4321');
    });

    it('removes paired device on unpair', async () => {
      await savePairedDevice(sampleDevice);
      expect(await getPairedDevice()).not.toBeNull();

      await removePairedDevice();
      expect(await getPairedDevice()).toBeNull();
    });

    it('switches active device to an existing known device', async () => {
      const dev1 = { ...sampleDevice, serverUrl: 'http://192.168.1.1:4321', deviceId: 'dev_1' };
      const dev2 = { ...sampleDevice, serverUrl: 'http://192.168.1.2:4321', deviceId: 'dev_2', shopName: 'فرع 2' };

      await savePairedDevice(dev1);
      await savePairedDevice(dev2);

      expect((await getPairedDevice())?.shopName).toBe('فرع 2');

      const switched = await setActiveDevice('http://192.168.1.1:4321');
      expect(switched).toBe(true);
      expect((await getPairedDevice())?.deviceId).toBe('dev_1');
    });
  });

  describe('Stage 2: session.invalidate contract', () => {
    it('clears credentials, switches mode to standalone, and marks status unauthorized', async () => {
      // Setup connected session state
      await store.set(STORAGE_KEYS.SESSION_TOKEN, 'active-session-token');
      await store.set(STORAGE_KEYS.DEVICE_ID, 'device-999');
      await store.set(STORAGE_KEYS.APP_MODE, 'connected');
      await savePairedDevice({
        deviceId: 'device-999',
        serverUrl: 'http://192.168.1.50:4321',
        ip: '192.168.1.50',
        port: 4321,
        shopName: 'سوبرماركت المدينة',
        deviceName: 'POS 1',
        version: '1.0',
        mode: 'lan',
        pairedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        lastStatus: 'online',
      });

      // Execute session.invalidate
      const invalidate = async (reason: string = 'unauthorized') => {
        await Promise.all([
          store.remove(STORAGE_KEYS.SESSION_TOKEN),
          store.remove(STORAGE_KEYS.DEVICE_ID),
          store.set(STORAGE_KEYS.APP_MODE, 'standalone'),
        ]);
        await updateLastSeen('unauthorized');
      };

      await invalidate('unauthorized');

      expect(await store.get(STORAGE_KEYS.SESSION_TOKEN)).toBeNull();
      expect(await store.get(STORAGE_KEYS.DEVICE_ID)).toBeNull();
      expect(await store.get(STORAGE_KEYS.APP_MODE)).toBe('standalone');

      const dev = await getPairedDevice();
      expect(dev).not.toBeNull();
      expect(dev?.lastStatus).toBe('unauthorized');
      expect(dev?.shopName).toBe('سوبرماركت المدينة'); // metadata preserved for quick re-pairing
    });
  });
});
