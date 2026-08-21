/**
 * AnposSecureStore — AN POS Mobile
 *
 * Priority:
 *  1. Native Android Keystore via NativeModules.AnposSecureStore (if linked)
 *  2. @react-native-async-storage/async-storage (available as package dep)
 *  3. In-memory fallback (dev only)
 */
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LINKING_ERROR = '[AnposSecureStore] Native module not linked — falling back to AsyncStorage';

interface AnposSecureStoreNative {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

const NativeModule: AnposSecureStoreNative | undefined =
  NativeModules.AnposSecureStore as AnposSecureStoreNative | undefined;

if (!NativeModule && Platform.OS !== 'web') {
  console.warn(LINKING_ERROR);
}

export interface AnposSecureStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
  getAllKeys(): Promise<string[]>;
}

/**
 * Wrap NativeModule (Android Keystore via EncryptedSharedPreferences)
 * with AsyncStorage as a fallback.
 */
const nativeAdapter: AnposSecureStore = {
  async get(key: string): Promise<string | null> {
    if (NativeModule) {
      try {
        return await NativeModule.getItem(key);
      } catch {
        // fall through to AsyncStorage
      }
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<boolean> {
    if (NativeModule) {
      try {
        await NativeModule.setItem(key, value);
        return true;
      } catch {
        // fall through to AsyncStorage
      }
    }
    try {
      await AsyncStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  async remove(key: string): Promise<boolean> {
    if (NativeModule) {
      try {
        await NativeModule.removeItem(key);
        return true;
      } catch {
        // fall through
      }
    }
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  async clear(): Promise<boolean> {
    if (NativeModule) {
      try {
        await NativeModule.clear();
        return true;
      } catch {
        // fall through
      }
    }
    try {
      await AsyncStorage.clear();
      return true;
    } catch {
      return false;
    }
  },

  async getAllKeys(): Promise<string[]> {
    if (NativeModule) {
      try {
        return await NativeModule.getAllKeys();
      } catch {
        // fall through
      }
    }
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    } catch {
      return [];
    }
  },
};

export const AnposSecureStore: AnposSecureStore = nativeAdapter;
