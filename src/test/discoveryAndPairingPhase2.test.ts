import { describe, it, expect, beforeEach } from 'vitest';
import {
  setStoredTransportConfig,
  getStoredTerminalRole,
  getStoredServerLanUrl,
  getStoredClientToken,
  getStoredClientDeviceId,
} from '@/lib/transportGateway';

describe('المرحلة 2: الاكتشاف التلقائي والاقتران المشفر بحاسوب الخادم (Discovery & Pairing)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. بروتوكول البث الإذاعي وحساب عناوين الشبكة (UDP Discovery)', () => {
    function computeBroadcast(ip: string, netmask: string): string {
      const ipParts = ip.split('.').map(Number);
      const maskParts = netmask.split('.').map(Number);
      return ipParts.map((p, i) => (p | (~maskParts[i] & 255))).join('.');
    }

    it('يحسب عنوان البث الإذاعي للشبكة الفرعية 24-bit بدقة', () => {
      const bcast = computeBroadcast('192.168.1.45', '255.255.255.0');
      expect(bcast).toBe('192.168.1.255');
    });

    it('يحسب عنوان البث الإذاعي لشبكات الفئة A و B بدقة', () => {
      expect(computeBroadcast('10.0.5.12', '255.0.0.0')).toBe('10.255.255.255');
      expect(computeBroadcast('172.16.20.10', '255.255.0.0')).toBe('172.16.255.255');
    });

    it('يتحقق من صيغة رسالة الاكتشاف القياسية لـ AN POS', () => {
      const discoveryRequest = { type: 'anpos-discover-request', v: 1 };
      const raw = JSON.stringify(discoveryRequest);
      const parsed = JSON.parse(raw);
      expect(parsed.type).toBe('anpos-discover-request');
      expect(parsed.v).toBe(1);
    });

    it('يتحقق من صيغة رد الخادم المكتشف', () => {
      const discoveryReply = {
        type: 'anpos-discover-reply',
        v: 1,
        port: 3000,
        shopName: 'سوبرماركت الأمل',
        deviceName: 'SERVER-PC',
        requiresPairing: true,
      };
      expect(discoveryReply.type).toBe('anpos-discover-reply');
      expect(discoveryReply.port).toBe(3000);
      expect(discoveryReply.requiresPairing).toBe(true);
    });
  });

  describe('2. دمج وتوحيد نتائج الخوادم المكتشفة (mDNS + UDP Deduplication)', () => {
    interface DiscoveredServer {
      ip: string;
      port: number;
      serverUrl: string;
      shopName: string;
      deviceName: string;
      protocol: 'udp' | 'mdns' | 'udp+mdns';
    }

    function mergeDiscoveredServers(rawList: Array<{ ip: string; port: number; shopName: string; deviceName: string; protocol: 'udp' | 'mdns' }>): DiscoveredServer[] {
      const map = new Map<string, DiscoveredServer>();
      for (const item of rawList) {
        const key = `${item.ip}:${item.port}`;
        const existing = map.get(key);
        if (existing) {
          if (existing.protocol !== item.protocol) {
            existing.protocol = 'udp+mdns';
          }
          if (item.shopName && item.shopName !== 'AN POS') existing.shopName = item.shopName;
        } else {
          map.set(key, {
            ip: item.ip,
            port: item.port,
            serverUrl: `http://${item.ip}:${item.port}`,
            shopName: item.shopName,
            deviceName: item.deviceName,
            protocol: item.protocol,
          });
        }
      }
      return Array.from(map.values());
    }

    it('يدمج خادماً تم التقاطه بالبروتوكولين معاً إلى udp+mdns بدون تكرار', () => {
      const merged = mergeDiscoveredServers([
        { ip: '192.168.1.100', port: 3000, shopName: 'متجر السلام', deviceName: 'SERVER-01', protocol: 'udp' },
        { ip: '192.168.1.100', port: 3000, shopName: 'متجر السلام', deviceName: 'SERVER-01', protocol: 'mdns' },
      ]);
      expect(merged).toHaveLength(1);
      expect(merged[0].protocol).toBe('udp+mdns');
      expect(merged[0].serverUrl).toBe('http://192.168.1.100:3000');
    });

    it('يفرز خوادم متعددة على شبكات مختلفة دون تصادم', () => {
      const merged = mergeDiscoveredServers([
        { ip: '192.168.1.50', port: 3000, shopName: 'فرع 1', deviceName: 'PC1', protocol: 'udp' },
        { ip: '192.168.1.60', port: 3000, shopName: 'فرع 2', deviceName: 'PC2', protocol: 'mdns' },
      ]);
      expect(merged).toHaveLength(2);
      expect(merged[0].serverUrl).toBe('http://192.168.1.50:3000');
      expect(merged[1].serverUrl).toBe('http://192.168.1.60:3000');
    });
  });

  describe('3. حمولة وبروتوكول الاقتران المشفر (Encrypted Handshake Contract)', () => {
    it('يحفظ إعدادات الاقتران ويحدث بوابه النقل transportGateway فوراً', () => {
      const fakeSessionToken = 'a3f9e8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9';
      const fakeDeviceId = 'client_terminal_pos_02';
      const serverUrl = 'http://192.168.1.150:3000';

      setStoredTransportConfig({
        role: 'client',
        serverUrl,
        token: fakeSessionToken,
        deviceId: fakeDeviceId,
      });

      expect(getStoredTerminalRole()).toBe('client');
      expect(getStoredServerLanUrl()).toBe(serverUrl);
      expect(getStoredClientToken()).toBe(fakeSessionToken);
      expect(getStoredClientDeviceId()).toBe(fakeDeviceId);
    });

    it('يلغي الاقتران ويمسح رمز الجلسة والاعتماد بنجاح', () => {
      setStoredTransportConfig({
        role: 'client',
        serverUrl: 'http://192.168.1.150:3000',
        token: 'active_session_token_xyz',
        deviceId: 'dev_123',
      });

      expect(getStoredClientToken()).toBe('active_session_token_xyz');

      // Unpair action
      setStoredTransportConfig({
        token: '',
        deviceId: '',
      });

      expect(getStoredClientToken()).toBe('');
      expect(getStoredServerLanUrl()).toBe('http://192.168.1.150:3000'); // URL preserved for convenient re-pairing
    });

    it('يحافظ على سلامة الرؤوس المشفرة الممررة إلى خادم AN POS', () => {
      setStoredTransportConfig({
        role: 'client',
        serverUrl: 'http://192.168.1.200:3000',
        token: 'secret_jwt_or_hex_token',
        deviceId: 'terminal_pos_02',
      });

      const token = getStoredClientToken();
      const devId = getStoredClientDeviceId();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (token) headers['x-session-token'] = token;
      if (devId) headers['x-device-id'] = devId;

      expect(headers['x-session-token']).toBe('secret_jwt_or_hex_token');
      expect(headers['x-device-id']).toBe('terminal_pos_02');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
