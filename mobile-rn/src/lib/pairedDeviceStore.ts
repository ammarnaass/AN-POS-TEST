import { AnposSecureStore } from '@/modules/AnposSecureStore';
import { STORAGE_KEYS } from './storageKeys';

export interface PairedDevice {
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

const MAX_KNOWN_DEVICES = 10;

/**
 * Saves or updates the currently active paired device,
 * and maintains the list of known devices (up to 10 unique by serverUrl).
 */
export async function savePairedDevice(device: PairedDevice): Promise<void> {
  try {
    // 1. Save active paired device
    await AnposSecureStore.set(STORAGE_KEYS.PAIRED_DEVICE, JSON.stringify(device));

    // 2. Add or update in known devices list
    const known = await getKnownDevices();
    const filtered = known.filter((d) => d.serverUrl !== device.serverUrl && d.deviceId !== device.deviceId);
    const updated = [device, ...filtered].slice(0, MAX_KNOWN_DEVICES);
    await AnposSecureStore.set(STORAGE_KEYS.KNOWN_DEVICES, JSON.stringify(updated));
  } catch (err) {
    console.warn('[pairedDeviceStore] Failed to save paired device:', err);
  }
}

/**
 * Returns the currently active paired device, or null if none is paired.
 */
export async function getPairedDevice(): Promise<PairedDevice | null> {
  try {
    const raw = await AnposSecureStore.get(STORAGE_KEYS.PAIRED_DEVICE);
    if (!raw) return null;
    return JSON.parse(raw) as PairedDevice;
  } catch {
    return null;
  }
}

/**
 * Returns the list of previously known paired devices (up to 10).
 */
export async function getKnownDevices(): Promise<PairedDevice[]> {
  try {
    const raw = await AnposSecureStore.get(STORAGE_KEYS.KNOWN_DEVICES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Updates the lastSeen timestamp and connectivity status of the active paired device.
 */
export async function updateLastSeen(
  status: 'online' | 'offline' | 'unauthorized' | 'unknown',
  extraMeta?: Partial<PairedDevice>
): Promise<void> {
  try {
    const current = await getPairedDevice();
    if (!current) return;

    const updated: PairedDevice = {
      ...current,
      ...extraMeta,
      lastSeenAt: new Date().toISOString(),
      lastStatus: status,
    };

    await savePairedDevice(updated);
  } catch (err) {
    console.warn('[pairedDeviceStore] Failed to update last seen:', err);
  }
}

/**
 * Removes the currently active paired device (unpair).
 */
export async function removePairedDevice(): Promise<void> {
  try {
    await AnposSecureStore.remove(STORAGE_KEYS.PAIRED_DEVICE);
  } catch (err) {
    console.warn('[pairedDeviceStore] Failed to remove paired device:', err);
  }
}

/**
 * Switches the active paired device to one of the known devices by serverUrl.
 */
export async function setActiveDevice(serverUrl: string): Promise<boolean> {
  try {
    const known = await getKnownDevices();
    const target = known.find((d) => d.serverUrl === serverUrl);
    if (!target) return false;

    await savePairedDevice(target);
    return true;
  } catch {
    return false;
  }
}
