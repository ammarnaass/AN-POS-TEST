import { NativeModules } from 'react-native';

const MOD = NativeModules.AnposCamera as AnposCamera | undefined;

export type ScanFormat = 'qr' | 'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'upce' | 'unknown';

export interface ScanResult {
  code: string;
  format: ScanFormat;
}

export type ScanCallback = (result: ScanResult) => void;

export interface AnposCamera {
  requestPermission(): Promise<boolean>;
  isPermissionGranted(): Promise<boolean>;
  startScan(): void;
  stopScan(): void;
  pickImage(): Promise<string | null>;
  capturePhoto(): Promise<string | null>;
  addListener: ScanCallback;
  removeListeners: () => void;
}

export const AnposCamera: AnposCamera = MOD || {
  requestPermission: async () => true,
  isPermissionGranted: async () => true,
  startScan: () => console.warn('Camera module not linked'),
  stopScan: () => {},
  pickImage: async () => null,
  capturePhoto: async () => null,
  addListener: () => {},
  removeListeners: () => {},
};

export default AnposCamera;
