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

  // Unwrap wrapper object (e.g. { success: true, settings: { ... } } or { data: [ ... ] } or { data: { ... } })
  let source = input;
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    if (input.settings !== undefined && input.settings !== null) {
      source = input.settings;
    } else if (input.data !== undefined && input.data !== null) {
      source = input.data;
    }
  }

  // Case 1: Array of rows or KV pairs (or input.data was an array)
  if (Array.isArray(source)) {
    // Look for master/default row first
    const defaultRow = source.find((r: any) => r && typeof r === 'object' && (r.id === 'default' || r.id === 'master' || r.id === 'settings'));
    if (defaultRow) {
      for (const [k, v] of Object.entries(defaultRow)) {
        if (v !== null && v !== undefined && v !== '') {
          merged[k] = v;
        }
      }
    }

    // Process other rows, BUT do not overwrite non-empty values with empty strings!
    for (const r of source) {
      if (!r || typeof r !== 'object') continue;
      // Key-value pair format { key: '...', value: '...' }
      if (r.key !== undefined && r.value !== undefined && r.value !== null && r.value !== '') {
        merged[r.key] = r.value;
      }
      // Direct column format
      for (const [k, v] of Object.entries(r)) {
        if (k !== 'key' && k !== 'value' && v !== null && v !== undefined && v !== '') {
          if (!merged[k] || merged[k] === DEFAULT_STORE_SETTINGS[k] || k === 'logo' || k === 'shop_logo' || k === 'shop_name' || k === 'store_name') {
            merged[k] = v;
          }
        }
      }
    }
  } else if (source && typeof source === 'object') {
    // Case 2: Direct Object
    for (const [k, v] of Object.entries(source)) {
      if (v !== null && v !== undefined && v !== '') {
        merged[k] = v;
      }
    }
  }

  // Cross-map aliases
  const rawShopName = merged.shop_name || merged.store_name || merged.shopName || merged.name;
  const shopName = rawShopName && String(rawShopName).trim() ? String(rawShopName).trim() : DEFAULT_STORE_SETTINGS.shop_name;
  const phone = String(merged.phone || merged.store_phone || merged.shop_phone || merged.shopPhone || '').trim();
  const phone2 = String(merged.phone2 || merged.shop_phone2 || merged.shopPhone2 || '').trim();
  const email = String(merged.email || merged.store_email || merged.shop_email || merged.shopEmail || '').trim();
  const address = String(merged.address || merged.store_address || merged.shop_address || merged.shopAddress || '').trim();
  const city = String(merged.city || '').trim();
  const currency = String(merged.base_currency || merged.baseCurrency || merged.currency || merged.currency_code || DEFAULT_STORE_SETTINGS.base_currency).trim();
  const rc = String(merged.commercial_register || merged.commercialRegister || merged.company_rc || merged.companyRC || merged.rc || '').trim();
  const nif = String(merged.tax_number || merged.taxNumber || merged.company_nif || merged.companyNif || merged.companyNIF || merged.nif || merged.tax_id || '').trim();
  const art = String(merged.company_art || merged.companyArt || merged.tax_article || merged.taxArticle || merged.art || '').trim();
  const ai = String(merged.company_ai || merged.companyAI || merged.nis || merged.ai || '').trim();
  const footer = String(merged.receipt_footer || merged.receiptFooter || DEFAULT_STORE_SETTINGS.receipt_footer).trim();
  const prefix = String(merged.invoice_prefix || merged.invoicePrefix || DEFAULT_STORE_SETTINGS.invoice_prefix).trim();
  const logo = String(merged.logo || merged.shop_logo || merged.shopLogo || merged.logo_url || merged.imageUrl || '').trim();

  let tvaRate = Number(merged.tva_rate ?? merged.tvaRate ?? DEFAULT_STORE_SETTINGS.tva_rate);
  if (isNaN(tvaRate)) tvaRate = 0;

  let printWidth = Number(merged.print_width_mm ?? merged.printWidthMm ?? 80);
  if (isNaN(printWidth) || printWidth <= 0) printWidth = 80;

  return {
    ...merged,
    shop_name: shopName,
    store_name: shopName,
    shopName,
    phone,
    store_phone: phone,
    phone2,
    email,
    store_email: email,
    address,
    store_address: address,
    city,
    base_currency: currency,
    baseCurrency: currency,
    currency,
    commercial_register: rc,
    commercialRegister: rc,
    company_rc: rc,
    companyRC: rc,
    tax_number: nif,
    taxNumber: nif,
    company_nif: nif,
    companyNif: nif,
    company_art: art,
    companyArt: art,
    tax_article: art,
    taxArticle: art,
    company_ai: ai,
    companyAI: ai,
    receipt_footer: footer,
    receiptFooter: footer,
    invoice_prefix: prefix,
    invoicePrefix: prefix,
    invoice_start_number: Number(merged.invoice_start_number ?? merged.invoiceStartNumber ?? DEFAULT_STORE_SETTINGS.invoice_start_number),
    print_language: String(merged.print_language || merged.printLanguage || DEFAULT_STORE_SETTINGS.print_language),
    logo,
    shop_logo: logo,
    shopLogo: logo,
    tva_rate: tvaRate,
    tvaRate,
    print_width_mm: printWidth,
    printWidthMm: printWidth,
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

    // 1. Try GET /api/settings/default first (most direct & accurate)
    let res: any = await apiCall('GET', '/api/settings/default', undefined, 6000).catch(() => null);

    // 2. Fallbacks
    if (!res || (res.error && !res.settings && !res.data)) {
      res = await apiCall('GET', '/api/settings', undefined, 6000).catch(() => null);
    }

    if (!res || (res.error && !res.settings && !res.data)) {
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
 * Save normalized settings to local SQLite cache (single master row)
 */
export async function saveStoreSettingsToLocalSQLite(settings: StoreSettings): Promise<void> {
  try {
    await ensureInit();
    const sqlite = unifiedDB.getSqliteDriver();
    const nowIso = new Date().toISOString();

    const logo = settings.logo || settings.shop_logo || '';

    // 1. Save master row in settings table
    const masterRow = {
      id: 'default',
      shop_name: settings.shop_name || settings.store_name || DEFAULT_STORE_SETTINGS.shop_name,
      phone: settings.phone || settings.store_phone || '',
      phone2: settings.phone2 || '',
      email: settings.email || settings.store_email || '',
      address: settings.address || settings.store_address || '',
      city: settings.city || '',
      logo: logo,
      shop_logo: logo,
      tva_rate: settings.tva_rate || 0,
      print_width_mm: settings.print_width_mm || 80,
      base_currency: settings.base_currency || settings.currency || 'دج',
      invoice_prefix: settings.invoice_prefix || 'INV-',
      invoice_start_number: settings.invoice_start_number || 1,
      receipt_footer: settings.receipt_footer || '',
      commercial_register: settings.commercial_register || settings.company_rc || '',
      company_rc: settings.commercial_register || settings.company_rc || '',
      tax_number: settings.tax_number || settings.company_nif || '',
      company_nif: settings.tax_number || settings.company_nif || '',
      company_art: settings.company_art || '',
      company_ai: settings.company_ai || '',
      allow_negative_stock: settings.allow_negative_stock ? 1 : 0,
      quick_sale: settings.quick_sale ? 1 : 0,
      language: settings.language || 'ar',
      print_language: settings.print_language || 'ar',
      updated_at: nowIso,
    };

    await sqlite.create('settings', masterRow).catch(() => {});

    // Clean up any legacy dummy rows created by older versions
    try {
      await sqlite.execute("DELETE FROM settings WHERE id != 'default' AND id LIKE 's_%'");
    } catch {}
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

  // 1. Try direct default master row from local SQLite
  try {
    const sqlite = unifiedDB.getSqliteDriver();
    const defaultRow = await sqlite.get<Record<string, unknown>>('settings', 'default').catch(() => null);
    if (defaultRow && typeof defaultRow === 'object' && Object.keys(defaultRow).length > 0) {
      const normalized = normalizeStoreSettings(defaultRow);
      // Trigger background sync if connected
      if (mode === 'connected' || isConn) {
        fetchStoreSettingsFromDesktop().catch(() => {});
      }
      return normalized;
    }
  } catch {}

  // 2. Fallback to toArray()
  try {
    const rows = await db.settings.toArray().catch(() => []);
    if (rows && rows.length > 0) {
      const normalized = normalizeStoreSettings(rows);
      if (mode === 'connected' || isConn) {
        fetchStoreSettingsFromDesktop().catch(() => {});
      }
      return normalized;
    }
  } catch {}

  // 3. If local SQLite is empty and connected, fetch now
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
export async function saveStoreSettings(patch: Partial<StoreSettings>): Promise<{ success: boolean; settings?: StoreSettings; error?: string }> {
  try {
    const current = await getStoreSettings(false);
    const updated = normalizeStoreSettings({ ...current, ...patch });

    // 1. Save to local SQLite
    await saveStoreSettingsToLocalSQLite(updated);

    // 2. If in connected mode, push to Desktop POS server
    const mode = await getStoredMode();
    const isConn = await session.isConnected();
    let finalSettings = updated;

    if (mode === 'connected' || isConn) {
      try {
        const payload = {
          ...updated,
          id: 'default',
          shop_name: updated.shop_name,
          store_name: updated.shop_name,
          shopName: updated.shop_name,
          phone: updated.phone,
          store_phone: updated.phone,
          email: updated.email,
          store_email: updated.email,
          address: updated.address,
          store_address: updated.address,
          logo: updated.logo || updated.shop_logo || '',
          shop_logo: updated.logo || updated.shop_logo || '',
          shopLogo: updated.logo || updated.shop_logo || '',
          base_currency: updated.base_currency,
          currency: updated.base_currency,
        };

        let res: any = await apiCall('PUT', '/api/settings/default', payload, 8000).catch(async () => {
          return await apiCall('PUT', '/api/settings', payload, 8000).catch(async () => {
            return await apiCall('POST', '/api/settings', payload, 8000).catch(() => null);
          });
        });

        if (res && (res.settings || res.data)) {
          finalSettings = normalizeStoreSettings(res);
          await saveStoreSettingsToLocalSQLite(finalSettings);
        }
      } catch (pushErr: any) {
        console.warn('[settingService] Could not push settings to desktop:', pushErr);
      }
    }

    return { success: true, settings: finalSettings };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل حفظ الإعدادات' };
  }
}
