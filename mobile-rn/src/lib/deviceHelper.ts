import { AnposSecureStore } from '@/modules/AnposSecureStore';
import { STORAGE_KEYS } from './storageKeys';

let _cachedPrefix: string | null = null;

/**
 * Returns a persistent 4-character uppercase alphanumeric device prefix (e.g. 'A1F2')
 * for generating collision-free invoice numbers per PRD-MOB-WS-PROD-2026.
 * Format: MOB-[DeviceID 4-chars]-YYYYMMDD-Sequence
 */
export async function getDeviceInvoicePrefix(): Promise<string> {
  if (_cachedPrefix) return _cachedPrefix;

  try {
    // 1. Check if device is paired and has a device ID
    const pairedId = await AnposSecureStore.get(STORAGE_KEYS.DEVICE_ID);
    if (pairedId) {
      const clean = pairedId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      if (clean.length >= 4) {
        _cachedPrefix = clean.slice(0, 4);
        return _cachedPrefix;
      }
    }

    // 2. Check stored standalone prefix
    const stored = await AnposSecureStore.get(STORAGE_KEYS.STANDALONE_DEVICE_PREFIX);
    if (stored && stored.length === 4) {
      _cachedPrefix = stored.toUpperCase();
      return _cachedPrefix;
    }

    // 3. Generate a new 4-char hex prefix and persist it
    const generated = Math.floor(0x1000 + Math.random() * 0xefff)
      .toString(16)
      .toUpperCase();
    await AnposSecureStore.set(STORAGE_KEYS.STANDALONE_DEVICE_PREFIX, generated).catch(() => {});
    _cachedPrefix = generated;
    return _cachedPrefix;
  } catch {
    return 'MOB1';
  }
}

/**
 * Generates an invoice number adhering to PRD-MOB-WS-PROD-2026:
 * MOB-[WS]-[DeviceID 4-chars]-YYYYMMDD-[Sequence]
 * Example: MOB-A1F2-20260908-0042 or MOB-WS-A1F2-20260908-0042
 */
export async function generateMobileInvoiceNumber(isWholesale: boolean = false): Promise<string> {
  const devicePart = await getDeviceInvoicePrefix();
  const nowIso = new Date().toISOString();
  const datePart = nowIso.slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(1000 + Math.random() * 9000);
  const prefix = isWholesale ? 'MOB-WS' : 'MOB';
  return `${prefix}-${devicePart}-${datePart}-${seq}`;
}
