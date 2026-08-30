import { session, apiCall } from '@/lib/apiClient';
import { db, ensureInit } from '@/lib/db';
import { db as unifiedDB, getStoredMode } from '@/infrastructure/database/UnifiedDB';

export interface StoreSettings {
  id?: string;
  // Store Identity & Contact
  shop_name: string;
  store_name: string;
  phone: string;
  store_phone: string;
  phone2?: string;
  email: string;
  store_email: string;
  address: string;
  store_address: string;
  city?: string;
  logo?: string;
  shop_logo?: string;

  // Legal & Tax
  commercial_register?: string; // RC
  company_rc?: string;
  tax_number?: string;          // NIF
  company_nif?: string;
  tax_article?: string;         // ART
  company_art?: string;
  company_ai?: string;          // NIS / AI
  tva_rate: number;             // e.g. 0.19
  tva_enabled?: boolean;

  // Financial & Currency
  base_currency: string;        // e.g. 'دج'
  currency: string;
  currency_code?: string;       // e.g. 'DZD'
  currencies?: string;

  // Invoicing & Receipt
  invoice_prefix: string;       // e.g. 'INV-'
  invoice_start_number: number;
  receipt_header?: string;
  receipt_footer: string;
  print_width_mm: number;       // 80 or 58
  print_language: string;

  // System & Operations
  quick_sale?: boolean;
  allow_negative_stock?: boolean;
  operating_mode?: string;
  language?: string;

  // Raw dictionary
  rawMap?: Record<string, any>;
  [key: string]: any;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  shop_name: 'متجر AN POS',
  store_name: 'متجر AN POS',
  phone: '',
  store_phone: '',
  phone2: '',
  email: '',
  store_email: '',
  address: '',
  store_address: '',
  city: '',
  commercial_register: '',
  company_rc: '',
  tax_number: '',
  company_nif: '',
  company_art: '',
  company_ai: '',
  tva_rate: 0,
  tva_enabled: true,
  base_currency: 'دج',
  currency: 'دج',
  currency_code: 'DZD',
  invoice_prefix: 'INV-',
  invoice_start_number: 1,
  receipt_footer: 'شكراً لتسوقكم معنا',
  receipt_header: '',
  print_width_mm: 80,
  print_language: 'ar',
  quick_sale: true,
  allow_negative_stock: false,
  operating_mode: 'online',
  language: 'ar',
};

/**
 * Normalizes any settings representation (array of KV pairs, DB row object, or Desktop API response)
 * into a strongly typed StoreSettings object with bidirectional field aliases.
 */
export function normalizeStoreSettings(input: any): StoreSettings {
  const merged: Record<string, any> = { ...DEFAULT_STORE_SETTINGS };

  if (!input) return merged as StoreSettings;

  // Case 1: Array of rows (either key-value pairs or row objects from SQLite / Dexie)
  if (Array.isArray(input)) {
    for (const r of input) {
      if (!r || typeof r !== 'object') continue;
      // Key-value pair format
      if (r.key !== undefined && r.value !== undefined) {
        merged[r.key] = r.value;
      }
      // Direct column format (e.g. { id: 'default', shop_name: '...', phone: '...' })
      for (const [k, v] of Object.entries(r)) {
        if (k !== 'key' && k !== 'value' && v !== null && v !== undefined) {
          merged[k] = v;
        }
      }
    }
  } else if (typeof input === 'object') {
    // Case 2: Object from API (e.g. { settings: { ... } } or { data: { ... } } or direct { shop_name: '...' })
    const source = input.settings || input.data || input;
    if (typeof source === 'object') {
      for (const [k, v] of Object.entries(source)) {
        if (v !== null && v !== undefined) {
          merged[k] = v;
        }
      }
    }
  }

  // Cross-map aliases
  const shopName = String(merged.shop_name || merged.store_name || merged.shopName || DEFAULT_STORE_SETTINGS.shop_name).trim();
  const phone = String(merged.phone || merged.store_phone || merged.shop_phone || '').trim();
  const email = String(merged.email || merged.store_email || merged.shop_email || '').trim();
  const address = String(merged.address || merged.store_address || merged.shop_address || '').trim();
  const currency = String(merged.base_currency || merged.currency || merged.currency_code || DEFAULT_STORE_SETTINGS.base_currency).trim();
  const rc = String(merged.commercial_register || merged.company_rc || merged.rc || '').trim();
  const nif = String(merged.tax_number || merged.company_nif || merged.nif || merged.tax_id || '').trim();
  const art = String(merged.company_art || merged.tax_article || merged.art || '').trim();
  const ai = String(merged.company_ai || merged.nis || merged.ai || '').trim();
  const footer = String(merged.receipt_footer || merged.receiptFooter || DEFAULT_STORE_SETTINGS.receipt_footer).trim();
  const prefix = String(merged.invoice_prefix || merged.invoicePrefix || DEFAULT_STORE_SETTINGS.invoice_prefix).trim();

  let tvaRate = Number(merged.tva_rate ?? merged.tvaRate ?? DEFAULT_STORE_SETTINGS.tva_rate);
  if (isNaN(tvaRate)) tvaRate = 0;

  let printWidth = Number(merged.print_width_mm ?? merged.printWidthMm ?? 80);
  if (isNaN(printWidth) || printWidth <= 0) printWidth = 80;

  return {
    ...merged,
    shop_name: shopName,
    store_name: shopName,
    phone,
    store_phone: phone,
    email,
    store_email: email,
    address,
    store_address: address,
    base_currency: currency,
    currency,
    commercial_register: rc,
    company_rc: rc,
    tax_number: nif,
    company_nif: nif,
    company_art: art,
    tax_article: art,
    company_ai: ai,
    receipt_footer: footer,
    invoice_prefix: prefix,
    invoice_start_number: Number(merged.invoice_start_number ?? DEFAULT_STORE_SETTINGS.invoice_start_number),
    print_language: String(merged.print_language || merged.printLanguage || DEFAULT_STORE_SETTINGS.print_language),
    tva_rate: tvaRate,
    print_width_mm: printWidth,
    rawMap: merged,
  };
}

/**
 * Fetch settings from Desktop POS server directly over HTTP
 */
export async function fetchStoreSettingsFromDesktop(): Promise<{
  success: boolean;
  settings?: StoreSettings;
  error?: string;
}> {
  try {
    const isConn = await session.isConnected();
    if (!isConn) {
      return { success: false, error: 'غير متصل بتطبيق سطح المكتب' };
    }

    const serverUrl = await session.getServerUrl();
    if (!serverUrl) {
      return { success: false, error: 'عنوان خادم سطح المكتب غير متوفر' };
    }

    // Try /api/settings first
    let res: any = await apiCall('GET', '/api/settings', undefined, 6000).catch(() => null);

    // If /api/settings is not directly available, try /api/pair/info or /api/sync/pull
    if (!res || (res.error && !res.settings)) {
      res = await apiCall('GET', '/api/pair/info', undefined, 4000).catch(() => null);
    }

    if (!res) {
      return { success: false, error: 'تعذر استلام بيانات المحل من خادم سطح المكتب' };
    }

    const normalized = normalizeStoreSettings(res);

    // Save to local SQLite cache
    await saveStoreSettingsToLocalSQLite(normalized);

    return { success: true, settings: normalized };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل الاتصال بسطح المكتب' };
  }
}

/**
 * Save normalized settings to local SQLite cache (both as single master row and KV entries)
 */
export async function saveStoreSettingsToLocalSQLite(settings: StoreSettings): Promise<void> {
  try {
    await ensureInit();
    const sqlite = unifiedDB.getSqliteDriver();
    const nowIso = new Date().toISOString();

    // 1. Save master row in settings table
    const masterRow = {
      id: 'default',
      shop_name: settings.shop_name,
      phone: settings.phone,
      phone2: settings.phone2 || '',
      email: settings.email,
      address: settings.address,
      city: settings.city || '',
      logo: settings.logo || '',
      tva_rate: settings.tva_rate,
      print_width_mm: settings.print_width_mm,
      base_currency: settings.base_currency,
      invoice_prefix: settings.invoice_prefix,
      invoice_start_number: settings.invoice_start_number || 1,
      receipt_footer: settings.receipt_footer,
      commercial_register: settings.commercial_register || '',
      company_rc: settings.commercial_register || '',
      tax_number: settings.tax_number || '',
      company_nif: settings.tax_number || '',
      company_art: settings.company_art || '',
      company_ai: settings.company_ai || '',
      allow_negative_stock: settings.allow_negative_stock ? 1 : 0,
      quick_sale: settings.quick_sale ? 1 : 0,
      language: settings.language || 'ar',
      print_language: settings.print_language || 'ar',
      updated_at: nowIso,
    };

    await sqlite.create('settings', masterRow).catch(() => {});

    // 2. Also save / update key-value pairs for Dexie where('key').equals(...) compatibility
    const kvPairs = [
      { key: 'store_name', value: settings.shop_name },
      { key: 'shop_name', value: settings.shop_name },
      { key: 'store_address', value: settings.address },
      { key: 'address', value: settings.address },
      { key: 'store_phone', value: settings.phone },
      { key: 'phone', value: settings.phone },
      { key: 'store_email', value: settings.email },
      { key: 'currency', value: settings.base_currency },
      { key: 'base_currency', value: settings.base_currency },
      { key: 'tva_rate', value: String(settings.tva_rate) },
      { key: 'receipt_footer', value: settings.receipt_footer },
      { key: 'invoice_prefix', value: settings.invoice_prefix },
      { key: 'commercial_register', value: settings.commercial_register || '' },
      { key: 'company_rc', value: settings.commercial_register || '' },
      { key: 'tax_number', value: settings.tax_number || '' },
      { key: 'company_nif', value: settings.tax_number || '' },
      { key: 'company_art', value: settings.company_art || '' },
      { key: 'company_ai', value: settings.company_ai || '' },
    ];

    for (const kv of kvPairs) {
      const existing = await db.settings.where('key').equals(kv.key).toArray().catch(() => []);
      if (existing.length > 0) {
        await db.settings.update(existing[0].id, { value: kv.value, updated_at: nowIso }).catch(() => {});
      } else {
        await db.settings.add({ id: `s_${kv.key}`, key: kv.key, value: kv.value, created_at: nowIso, updated_at: nowIso }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[settingService] Error saving settings to local SQLite:', err);
  }
}

/**
 * Main getter: Retrieves store settings.
 * In connected mode, it attempts to fetch from desktop server first and fallback to SQLite cache.
 * In standalone mode, it reads directly from SQLite cache.
 */
export async function getStoreSettings(forceRefresh = false): Promise<StoreSettings> {
  await ensureInit();
  const mode = await getStoredMode();
  const isConn = await session.isConnected();

  if ((mode === 'connected' || isConn) && forceRefresh) {
    const remote = await fetchStoreSettingsFromDesktop();
    if (remote.success && remote.settings) {
      return remote.settings;
    }
  }

  // Load from local SQLite
  try {
    const rows = await db.settings.toArray().catch(() => []);
    if (rows && rows.length > 0) {
      const normalized = normalizeStoreSettings(rows);
      // If connected but haven't fetched from server yet, trigger background fetch
      if (mode === 'connected' || isConn) {
        fetchStoreSettingsFromDesktop().catch(() => {});
      }
      return normalized;
    }
  } catch {}

  // If local SQLite is empty and connected, fetch now
  if (mode === 'connected' || isConn) {
    const remote = await fetchStoreSettingsFromDesktop();
    if (remote.success && remote.settings) {
      return remote.settings;
    }
  }

  return DEFAULT_STORE_SETTINGS;
}

/**
 * Save updated settings:
 * Updates local SQLite and (if in connected mode) pushes changes to Desktop POS server.
 */
export async function saveStoreSettings(patch: Partial<StoreSettings>): Promise<{ success: boolean; error?: string }> {
  try {
    const current = await getStoreSettings(false);
    const updated = normalizeStoreSettings({ ...current, ...patch });

    // 1. Save to local SQLite
    await saveStoreSettingsToLocalSQLite(updated);

    // 2. If in connected mode, push to Desktop POS server
    const mode = await getStoredMode();
    const isConn = await session.isConnected();
    if (mode === 'connected' || isConn) {
      try {
        await apiCall('PUT', '/api/settings', updated, 6000).catch(async () => {
          // If PUT fails, try POST
          await apiCall('POST', '/api/settings', updated, 6000).catch(() => {});
        });
      } catch (pushErr: any) {
        console.warn('[settingService] Could not push settings to desktop:', pushErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل حفظ الإعدادات' };
  }
}
