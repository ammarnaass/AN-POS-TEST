import { NativeModules } from 'react-native';

const MOD = NativeModules.AnposCamera as AnposCamera | undefined;

export type ScanFormat = 'qr' | 'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'upce';

export interface ScanResult {
  code: string;
  format: ScanFormat;
}

export type ScanCallback = (result: ScanResult) => void;

export interface AnposCamera {
  requestPermission(): Promise<boolean>;
  isPermissionGranted(): Promise<boolean>;
  startScan(callback: ScanCallback): void;
  stopScan(): void;
  addListener: ScanCallback;
  removeListeners: () => void;
}

export const AnposCamera: AnposCamera = MOD || {
  requestPermission: async () => true,
  isPermissionGranted: async () => true,
  startScan: (_callback: ScanCallback) => console.warn('Camera module not linked'),
  stopScan: () => {},
  addListener: () => {},
  removeListeners: () => {},
};
