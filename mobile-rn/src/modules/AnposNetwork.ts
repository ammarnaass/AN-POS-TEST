import { NativeModules, Platform, Dimensions } from 'react-native';
import DeviceInfo from 'react-native-device-info';

const MOD = NativeModules.AnposNetwork as AnposNetwork | undefined;

if (!MOD) {
  console.warn('[AnposNetwork] Module not linked — using fallback');
}

export interface NetworkInterface {
  name: string;
  ip: string;
  isInternal: boolean;
}

export interface DesktopUdpReply {
  ip: string;
  raw: string;
}

export interface DeviceInfo {
  deviceName: string;
  model: string;
  manufacturer: string;
  brand: string;
  deviceType: 'mobile' | 'tablet';
  hardwareId: string;
  deviceUniqueId: string;
  macAddress: string;
  localIp: string;
  appName?: string;
  appVersion?: string;
}

export interface AnposNetwork {
  getIPAddresses(): Promise<NetworkInterface[]>;
  getLocalIP(): Promise<string>;
  getGateway(): Promise<string>;
  getSubnet(): Promise<string>;
  getSSID(): Promise<string>;
  isOnline(): Promise<boolean>;
  isOnWifi(): Promise<boolean>;
  discoverDesktop(timeoutMs?: number): Promise<DesktopUdpReply[]>;
  discoverZeroconf(timeoutMs?: number): Promise<{ ip: string; port: number; name: string }[]>;
  getDeviceInfo(): Promise<DeviceInfo>;
}

export const AnposNetwork: AnposNetwork = {
  getIPAddresses: () => MOD?.getIPAddresses?.() ?? Promise.resolve([]),
  getLocalIP: () => MOD?.getLocalIP?.() ?? Promise.resolve('192.168.1.1'),
  getGateway: () => MOD?.getGateway?.() ?? Promise.resolve(''),
  getSubnet: () => MOD?.getSubnet?.() ?? Promise.resolve('192.168.1'),
  getSSID: () => MOD?.getSSID?.() ?? Promise.resolve(''),
  isOnline: () => MOD?.isOnline?.() ?? Promise.resolve(true),
  isOnWifi: () => MOD?.isOnWifi?.() ?? Promise.resolve(true),
  discoverDesktop: (timeoutMs = 1200) => {
    if (!MOD?.discoverDesktop) return Promise.resolve([]);
    return MOD.discoverDesktop(Math.round(timeoutMs)).catch(() => []);
  },
  discoverZeroconf: (timeoutMs = 3500) => {
    if (!MOD?.discoverZeroconf) return Promise.resolve([]);
    return MOD.discoverZeroconf(Math.round(timeoutMs)).catch(() => []);
  },
  getDeviceInfo: async () => {
    // 1. استخدام مكتبة react-native-device-info القياسية كخيار أول
    try {
      const [
        realDeviceName,
        realManufacturer,
        realUniqueId,
        localIp,
      ] = await Promise.all([
        DeviceInfo.getDeviceName().catch(() => ''),
        DeviceInfo.getManufacturer().catch(() => ''),
        DeviceInfo.getUniqueId().catch(() => ''),
        AnposNetwork.getLocalIP().catch(() => '192.168.1.1'),
      ]);

      const model = (DeviceInfo.getModel() || '').trim();
      const brand = (DeviceInfo.getBrand() || '').trim();
      const isTablet = DeviceInfo.isTablet();
      const appName = DeviceInfo.getApplicationName() || 'AN POS Mobile';
      const appVersion = DeviceInfo.getVersion() || '3.0.0';

      const resolvedBrand = brand || realManufacturer || (Platform.OS === 'android' ? 'Android' : 'Apple');
      const resolvedModel = model || (Platform.OS === 'android' ? 'Device' : 'Phone');

      let computedName = (realDeviceName || '').trim();
      if (!computedName || computedName === 'Android' || computedName.toLowerCase() === 'localhost') {
        if (resolvedModel.toLowerCase().startsWith(resolvedBrand.toLowerCase())) {
          computedName = resolvedModel;
        } else {
          computedName = `${resolvedBrand} ${resolvedModel}`.trim();
        }
      }

      if (realUniqueId && computedName) {
        return {
          deviceName: computedName,
          model: resolvedModel,
          manufacturer: realManufacturer || resolvedBrand,
          brand: resolvedBrand,
          deviceType: isTablet ? 'tablet' : 'mobile',
          hardwareId: realUniqueId,
          deviceUniqueId: realUniqueId,
          macAddress: '',
          localIp,
          appName,
          appVersion,
        };
      }
    } catch (e) {
      console.warn('[AnposNetwork] DeviceInfo read error, using fallback:', e);
    }

    // 2. محاولة الجلب عبر موديول أندرويد الأصلي AnposNetworkModule
    if (MOD?.getDeviceInfo) {
      try {
        const info = await MOD.getDeviceInfo();
        if (info && (info.model || info.manufacturer || info.deviceName)) {
          const uniqueId = (info as any).hardwareId || (info as any).deviceUniqueId || '';
          return {
            ...info,
            hardwareId: uniqueId,
            deviceUniqueId: uniqueId,
            appName: (info as any).appName || 'AN POS Mobile',
            appVersion: (info as any).appVersion || '3.0.0',
          };
        }
      } catch {}
    }

    // 3. فحص العتاد الفعلي مباشرة عبر Platform.constants في React Native (Fallback أخير)
    const constants: any = Platform.constants || {};
    const rawModel = (constants.Model || constants.model || '').trim();
    const rawManufacturer = (constants.Manufacturer || constants.manufacturer || '').trim();
    const rawBrand = (constants.Brand || constants.brand || '').trim();
    const rawFingerprint = (constants.Fingerprint || constants.fingerprint || '').trim();

    const manufacturer = rawManufacturer || rawBrand || (Platform.OS === 'android' ? 'Android' : 'Apple');
    const model = rawModel || (Platform.OS === 'android' ? 'Device' : 'iPhone/iPad');

    let computedName = '';
    if (rawManufacturer && rawModel) {
      computedName = rawModel.toLowerCase().startsWith(rawManufacturer.toLowerCase())
        ? rawModel
        : `${rawManufacturer.charAt(0).toUpperCase() + rawManufacturer.slice(1)} ${rawModel}`;
    } else if (rawModel) {
      computedName = rawModel;
    } else if (rawBrand) {
      computedName = `${rawBrand.charAt(0).toUpperCase() + rawBrand.slice(1)} Device`;
    } else {
      computedName = Platform.OS === 'android' ? 'Android Device' : 'iOS Device';
    }

    const { width, height } = Dimensions.get('screen');
    const isTablet = (Platform as any).isPad || Math.min(width, height) >= 600;

    const localIp = await AnposNetwork.getLocalIP().catch(() => '192.168.1.1');
    const fallbackUniqueId = rawFingerprint.slice(0, 32) || `${manufacturer}_${model}`.replace(/\s+/g, '_');

    return {
      deviceName: computedName,
      model,
      manufacturer,
      brand: rawBrand || manufacturer,
      deviceType: isTablet ? 'tablet' : 'mobile',
      hardwareId: fallbackUniqueId,
      deviceUniqueId: fallbackUniqueId,
      macAddress: '',
      localIp,
      appName: 'AN POS Mobile',
      appVersion: '3.0.0',
    };
  },
};


