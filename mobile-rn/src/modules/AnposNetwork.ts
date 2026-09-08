import { NativeModules } from 'react-native';

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

export interface AnposNetwork {
  getIPAddresses(): Promise<NetworkInterface[]>;
  getLocalIP(): Promise<string>;
  getGateway(): Promise<string>;
  getSubnet(): Promise<string>;
  getSSID(): Promise<string>;
  isOnline(): Promise<boolean>;
  isOnWifi(): Promise<boolean>;
  discoverDesktop(timeoutMs?: number): Promise<DesktopUdpReply[]>;
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
};
