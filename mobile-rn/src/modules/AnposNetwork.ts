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

export interface AnposNetwork {
  getIPAddresses(): Promise<NetworkInterface[]>;
  getLocalIP(): Promise<string>;
  getGateway(): Promise<string>;
  getSubnet(): Promise<string>;
  getSSID(): Promise<string>;
  isOnline(): Promise<boolean>;
  isOnWifi(): Promise<boolean>;
}

export const AnposNetwork: AnposNetwork = MOD || {
  getIPAddresses: async () => [],
  getLocalIP: async () => '192.168.1.1',
  getGateway: async () => '',
  getSubnet: async () => '192.168.1',
  getSSID: async () => '',
  isOnline: async () => true,
  isOnWifi: async () => true,
};
