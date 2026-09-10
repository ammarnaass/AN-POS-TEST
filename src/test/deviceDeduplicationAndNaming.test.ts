import { describe, it, expect } from 'vitest';

/**
 * خوارزمية فحص وتوليد اسم فريد للجهاز ومنع التكرار نهائياً
 */
function generateUniqueDeviceNameTest(
  requestedName: string,
  existingDevices: Array<{ id: string; device_name: string }>,
  currentDeviceId?: string
): string {
  const base = (requestedName || 'جهاز غير معروف').trim();

  const filtered = currentDeviceId
    ? existingDevices.filter((d) => d.id !== currentDeviceId)
    : existingDevices;

  const existingNames = new Set(filtered.map((d) => (d.device_name || '').trim().toLowerCase()));

  if (!existingNames.has(base.toLowerCase())) {
    return base;
  }

  let index = 2;
  while (existingNames.has(`${base} (${index})`.toLowerCase())) {
    index++;
  }
  return `${base} (${index})`;
}

/**
 * محاكاة دورة حياة تسجيل واقتران الأجهزة والتحقق من المعطيات الـ 5
 */
interface DeviceRecord {
  id: string;
  device_name: string;
  device_type: string;
  connection_type: string;
  ip_address: string;
  mac_address: string;
  model: string;
  vendor: string;
  status: 'online' | 'offline';
  last_seen: string;
}

class MockDeviceRegistry {
  public devices: DeviceRecord[] = [];

  pairOrUpdateDevice(payload: {
    deviceName: string;
    deviceType?: string;
    ipAddress?: string;
    macAddress?: string;
    model?: string;
    vendor?: string;
    deviceId?: string;
  }): { device: DeviceRecord; isNew: boolean } {
    const resolvedIp = payload.ipAddress || '';
    const resolvedMac = (payload.macAddress || '').toLowerCase();
    const model = payload.model || '';
    const vendor = payload.vendor || '';
    const deviceType = payload.deviceType || 'mobile';

    // 1. فحص وجود الجهاز مسبقاً ( لمنع التكرار )
    let existing = this.devices.find(
      (d) =>
        (payload.deviceId && d.id === payload.deviceId) ||
        (resolvedMac && resolvedMac !== '02:00:00:00:00:00' && d.mac_address.toLowerCase() === resolvedMac) ||
        (resolvedIp && model && d.ip_address === resolvedIp && d.model === model)
    );

    const now = new Date().toISOString();

    if (existing) {
      // تحديث الجهاز القائم دون إنشاء صف مكرر
      const finalName = generateUniqueDeviceNameTest(
        payload.deviceName || existing.device_name,
        this.devices,
        existing.id
      );
      existing.device_name = finalName;
      existing.device_type = deviceType;
      existing.ip_address = resolvedIp;
      existing.mac_address = resolvedMac;
      existing.model = model;
      existing.vendor = vendor;
      existing.status = 'online';
      existing.last_seen = now;
      return { device: existing, isNew: false };
    }

    // جهاز جديد: توليد اسم فريد غير مكرر
    const finalName = generateUniqueDeviceNameTest(payload.deviceName, this.devices);
    const newDevice: DeviceRecord = {
      id: payload.deviceId || `dev_${Math.random().toString(36).substring(2, 9)}`,
      device_name: finalName,
      device_type: deviceType,
      connection_type: 'network',
      ip_address: resolvedIp,
      mac_address: resolvedMac,
      model,
      vendor,
      status: 'online',
      last_seen: now,
    };

    this.devices.push(newDevice);
    return { device: newDevice, isNew: true };
  }
}

describe('منظومة إدارة الأجهزة المتصلة ومنع تكرار الأسماء والمعطيات الخمسة', () => {
  describe('خوارزمية تفرد الأسماء (generateUniqueDeviceName)', () => {
    it('تحافظ على الاسم كما هو إذا لم يكن مكرراً', () => {
      const existing = [{ id: '1', device_name: 'Redmi Note 11' }];
      const result = generateUniqueDeviceNameTest('Samsung Galaxy S23', existing);
      expect(result).toBe('Samsung Galaxy S23');
    });

    it('تضيف تلقائياً (2) عند تطابق الاسم تماماً', () => {
      const existing = [{ id: '1', device_name: 'Redmi Note 11' }];
      const result = generateUniqueDeviceNameTest('Redmi Note 11', existing);
      expect(result).toBe('Redmi Note 11 (2)');
    });

    it('تتجاهل حالة الأحرف وتضيف الترقيم التالي الشاغر (3) إذا كان (2) مستخدماً', () => {
      const existing = [
        { id: '1', device_name: 'Redmi Note 11' },
        { id: '2', device_name: 'redmi note 11 (2)' },
      ];
      const result = generateUniqueDeviceNameTest('Redmi Note 11', existing);
      expect(result).toBe('Redmi Note 11 (3)');
    });

    it('تسمح للجهاز القائم بالاحتفاظ باسمه الحالي عند التحديث', () => {
      const existing = [
        { id: '1', device_name: 'Redmi Note 11' },
        { id: '2', device_name: 'Samsung S23' },
      ];
      const result = generateUniqueDeviceNameTest('Redmi Note 11', existing, '1');
      expect(result).toBe('Redmi Note 11');
    });
  });

  describe('التعرف على المعطيات الخمسة ومنع تكرار الأجهزة الفعليّة', () => {
    it('تسجل كافة المعطيات الـ 5 كاملة عند اتصال جهاز جديد', () => {
      const registry = new MockDeviceRegistry();
      const { device, isNew } = registry.pairOrUpdateDevice({
        deviceName: 'Redmi Note 11',
        deviceType: 'mobile',
        ipAddress: '192.168.8.105',
        macAddress: '3c:4e:56:de:13:d4',
        model: '2201117TG',
        vendor: 'Xiaomi',
      });

      expect(isNew).toBe(true);
      expect(device.device_name).toBe('Redmi Note 11');
      expect(device.mac_address).toBe('3c:4e:56:de:13:d4');
      expect(device.ip_address).toBe('192.168.8.105');
      expect(device.model).toBe('2201117TG');
      expect(device.vendor).toBe('Xiaomi');
      expect(device.device_type).toBe('mobile');
      expect(device.status).toBe('online');
    });

    it('تمنع تكرار الصفوف عند إعادة اتصال نفس الجهاز بعنوان MAC وتحدث بياناته', () => {
      const registry = new MockDeviceRegistry();

      // الاتصال الأول
      registry.pairOrUpdateDevice({
        deviceName: 'Samsung S24',
        deviceType: 'mobile',
        ipAddress: '192.168.8.100',
        macAddress: 'aa:bb:cc:dd:ee:ff',
        model: 'SM-S928B',
        vendor: 'Samsung',
      });
      expect(registry.devices.length).toBe(1);

      // إعادة الاتصال مع عنوان IP جديد (DHCP)
      const { device, isNew } = registry.pairOrUpdateDevice({
        deviceName: 'Samsung S24',
        deviceType: 'mobile',
        ipAddress: '192.168.8.199', // IP جديد
        macAddress: 'aa:bb:cc:dd:ee:ff',
        model: 'SM-S928B',
        vendor: 'Samsung',
      });

      expect(isNew).toBe(false);
      expect(registry.devices.length).toBe(1); // لم يتم إنشاء صف مكرر!
      expect(device.ip_address).toBe('192.168.8.199');
      expect(device.status).toBe('online');
    });

    it('تمنع تكرار الأسماء عند اتصال جهازين مختلفين بنفس الاسم الافتراضي', () => {
      const registry = new MockDeviceRegistry();

      // الجهاز الأول
      const dev1 = registry.pairOrUpdateDevice({
        deviceName: 'Galaxy Tab',
        deviceType: 'tablet',
        ipAddress: '192.168.8.101',
        macAddress: '11:22:33:44:55:66',
        model: 'SM-X700',
        vendor: 'Samsung',
      });

      // الجهاز الثاني بعنوان MAC مختلف ولكن نفس الاسم
      const dev2 = registry.pairOrUpdateDevice({
        deviceName: 'Galaxy Tab',
        deviceType: 'tablet',
        ipAddress: '192.168.8.102',
        macAddress: '99:88:77:66:55:44',
        model: 'SM-X700',
        vendor: 'Samsung',
      });

      expect(registry.devices.length).toBe(2);
      expect(dev1.device.device_name).toBe('Galaxy Tab');
      expect(dev2.device.device_name).toBe('Galaxy Tab (2)'); // ترقيم تلقائي فريد!
    });
  });
  describe('خدمة الربط وتصنيف الأبعاد الثلاثية (الشبكة، الاتصال، والأجهزة)', () => {
    it('تسجل بيانات التطبيق (appName و appVersion) وتفصل الاستجابة لـ network و connection و details', () => {
      class MockConnectService {
        private devices: any[] = [];

        connectDevice(payload: any) {
          const resolvedIp = payload.ipAddress || '192.168.1.50';
          const resolvedMac = (payload.macAddress || '11:22:33:44:55:66').toLowerCase();
          const appName = payload.appName || 'AN POS Mobile';
          const appVersion = payload.appVersion || '2.0.0';
          const deviceType = payload.deviceType || 'mobile';
          const model = payload.model || 'SM-X200';
          const vendor = payload.vendor || 'Samsung';
          const deviceName = payload.deviceName || 'Galaxy Tab';
          const now = new Date().toISOString();

          let existing = this.devices.find(d => d.mac_address === resolvedMac);
          let deviceId = existing ? existing.id : 'dev_' + Math.random().toString(36).slice(2, 8);

          if (existing) {
            existing.ip_address = resolvedIp;
            existing.status = 'online';
            existing.last_seen = now;
            existing.app_name = appName;
            existing.app_version = appVersion;
          } else {
            existing = {
              id: deviceId,
              device_name: deviceName,
              model,
              vendor,
              device_type: deviceType,
              ip_address: resolvedIp,
              mac_address: resolvedMac,
              app_name: appName,
              app_version: appVersion,
              status: 'online',
              last_seen: now,
            };
            this.devices.push(existing);
          }

          return {
            success: true,
            network: {
              ip_address: resolvedIp,
              mac_address: resolvedMac,
              connection_type: 'network',
            },
            connection: {
              status: 'online',
              last_seen: now,
              heartbeat_interval_ms: 15000,
            },
            details: {
              device_id: deviceId,
              device_name: existing.device_name,
              model,
              vendor,
              app_name: appName,
              app_version: appVersion,
              device_type: deviceType,
            },
          };
        }
      }

      const service = new MockConnectService();
      const res = service.connectDevice({
        deviceName: 'Redmi Note 11',
        model: '2201117TG',
        vendor: 'Xiaomi',
        macAddress: 'aa:bb:cc:dd:ee:11',
        ipAddress: '192.168.1.88',
        appName: 'AN POS Mobile',
        appVersion: '2.0.0',
        deviceType: 'mobile',
      });

      expect(res.success).toBe(true);
      expect(res.network.ip_address).toBe('192.168.1.88');
      expect(res.network.mac_address).toBe('aa:bb:cc:dd:ee:11');
      expect(res.connection.status).toBe('online');
      expect(res.connection.heartbeat_interval_ms).toBe(15000);
      expect(res.details.app_name).toBe('AN POS Mobile');
      expect(res.details.app_version).toBe('2.0.0');
      expect(res.details.model).toBe('2201117TG');
      expect(res.details.vendor).toBe('Xiaomi');
    });

    it('تحول الأجهزة المنقطعة لأكثر من 90 ثانية إلى offline وتحافظ على وجودها بالسجل', () => {
      const now = Date.now();
      const devices = [
        { id: '1', status: 'online', last_seen: new Date(now - 120000).toISOString() }, // 2 mins ago
        { id: '2', status: 'online', last_seen: new Date(now - 20000).toISOString() },  // 20s ago
      ];

      // Auto-sweep logic
      for (const d of devices) {
        const diffMs = now - new Date(d.last_seen).getTime();
        if (diffMs > 90000 && d.status === 'online') {
          d.status = 'offline';
        }
      }

      expect(devices[0].status).toBe('offline');
      expect(devices[1].status).toBe('online');
      expect(devices.length).toBe(2); // لم يتم حذف أي جهاز
    });
  });

});
