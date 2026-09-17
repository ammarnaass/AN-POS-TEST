// معالج إعدادات المتجر والتطبيق — معالج مجال متخصص (Domain Handler)
// يستخرج المنطق وتسوية الحقول من crud.ts إلى وحدة ذات أمان عالي للأنواع

import { queryOne, execute, notifyTableChange, type Row } from './db-utils';

export interface StoreSettings {
  id: string;
  shop_name: string;
  phone: string;
  phone2?: string;
  email?: string;
  address?: string;
  city?: string;
  logo?: string;
  tva_rate: number;
  print_width_mm: number;
  sync_mode: string;
  currencies: string;
  base_currency: string;
  invoice_prefix: string;
  invoice_start_number: number;
  receipt_footer: string;
  zakat_enabled?: number;
  nisab_threshold?: number;
  shop_logo?: string;
  language?: string;
  print_language?: string;
  commercial_register?: string;
  company_rc?: string;
  tax_number?: string;
  company_nif?: string;
  tax_article?: string;
  company_art?: string;
  company_ai?: string;
  tax_id?: string;
  allow_self_registration?: number;
  default_role?: string;
  [key: string]: unknown;
}

/**
 * تسوية حقول الإعدادات مع معالجة الأسماء البديلة (CamelCase و Snake_case)
 */
export function normalizeSettingsPayload(raw: Record<string, unknown>): Record<string, unknown> {
  let data = raw;
  if (raw && typeof raw === 'object' && 'data' in raw && raw.data && typeof raw.data === 'object') {
    data = raw.data as Record<string, unknown>;
  }

  const normalized: Record<string, unknown> = {};

  const rawShopName = data.shop_name ?? data.shopName ?? data.store_name ?? data.name;
  if (rawShopName !== undefined && rawShopName !== null) {
    normalized.shop_name = String(rawShopName).trim();
  }

  const rawAddress = data.address ?? data.store_address ?? data.shop_address ?? data.shopAddress;
  if (rawAddress !== undefined && rawAddress !== null) {
    const addr = String(rawAddress).trim();
    normalized.address = addr;
    normalized.shop_address = addr;
  }

  const rawPhone = data.phone ?? data.store_phone ?? data.shop_phone ?? data.shopPhone;
  if (rawPhone !== undefined && rawPhone !== null) {
    normalized.phone = String(rawPhone).trim();
  }

  const rawPhone2 = data.phone2 ?? data.shop_phone2 ?? data.shopPhone2;
  if (rawPhone2 !== undefined && rawPhone2 !== null) {
    const p2 = String(rawPhone2).trim();
    normalized.phone2 = p2;
    normalized.shop_phone2 = p2;
  }

  const rawEmail = data.email ?? data.store_email ?? data.shop_email ?? data.shopEmail;
  if (rawEmail !== undefined && rawEmail !== null) {
    const em = String(rawEmail).trim();
    normalized.email = em;
    normalized.shop_email = em;
  }

  if (data.city !== undefined && data.city !== null) {
    normalized.city = String(data.city).trim();
  }

  const rawLogo = data.logo ?? data.shop_logo ?? data.shopLogo ?? data.logo_url ?? data.imageUrl;
  if (rawLogo !== undefined && rawLogo !== null) {
    const lg = String(rawLogo).trim();
    normalized.logo = lg;
    normalized.shop_logo = lg;
  }

  const rawRc = data.commercial_register ?? data.commercialRegister ?? data.company_rc ?? data.companyRC ?? data.rc;
  if (rawRc !== undefined && rawRc !== null) {
    const rc = String(rawRc).trim();
    normalized.commercial_register = rc;
    normalized.company_rc = rc;
  }

  const rawNif = data.tax_number ?? data.taxNumber ?? data.company_nif ?? data.companyNif ?? data.companyNIF ?? data.nif ?? data.tax_id;
  if (rawNif !== undefined && rawNif !== null) {
    const nif = String(rawNif).trim();
    normalized.tax_number = nif;
    normalized.company_nif = nif;
  }

  const rawArt = data.tax_article ?? data.taxArticle ?? data.company_art ?? data.companyArt ?? data.art;
  if (rawArt !== undefined && rawArt !== null) {
    const art = String(rawArt).trim();
    normalized.tax_article = art;
    normalized.company_art = art;
  }

  const rawAi = data.company_ai ?? data.companyAI ?? data.nis ?? data.ai;
  if (rawAi !== undefined && rawAi !== null) {
    normalized.company_ai = String(rawAi).trim();
  }

  const rawCurrency = data.base_currency ?? data.baseCurrency ?? data.currency ?? data.currency_code;
  if (rawCurrency !== undefined && rawCurrency !== null) {
    normalized.base_currency = String(rawCurrency).trim();
  }

  const rawFooter = data.receipt_footer ?? data.receiptFooter;
  if (rawFooter !== undefined && rawFooter !== null) {
    normalized.receipt_footer = String(rawFooter).trim();
  }

  const rawPrefix = data.invoice_prefix ?? data.invoicePrefix;
  if (rawPrefix !== undefined && rawPrefix !== null) {
    normalized.invoice_prefix = String(rawPrefix).trim();
  }

  const rawStartNum = data.invoice_start_number ?? data.invoiceStartNumber;
  if (rawStartNum !== undefined && rawStartNum !== null) {
    normalized.invoice_start_number = Number(rawStartNum) || 1;
  }

  const rawTva = data.tva_rate ?? data.tvaRate;
  if (rawTva !== undefined && rawTva !== null) {
    normalized.tva_rate = Number(rawTva) || 0;
  }

  const rawPrintWidth = data.print_width_mm ?? data.printWidthMm;
  if (rawPrintWidth !== undefined && rawPrintWidth !== null) {
    normalized.print_width_mm = Number(rawPrintWidth) || 80;
  }

  const rawPrintLang = data.print_language ?? data.printLanguage;
  if (rawPrintLang !== undefined && rawPrintLang !== null) {
    normalized.print_language = String(rawPrintLang).trim();
  }

  if (data.language !== undefined && data.language !== null) {
    normalized.language = String(data.language).trim();
  }

  // تمرير أي حقول أخرى تم ضبطها بالفعل
  for (const [key, val] of Object.entries(data)) {
    if (!(key in normalized)) {
      normalized[key] = val;
    }
  }

  return normalized;
}

/**
 * جلب سجل الإعدادات الافتراضي للمتجر
 */
export function getStoreSettings(): Row | null {
  return queryOne("SELECT * FROM settings WHERE id = 'default' LIMIT 1");
}

/**
 * تحديث إعدادات المتجر
 */
export function updateStoreSettings(data: Record<string, unknown>): { data: Row | null; error?: { status: number; detail: string } } {
  const norm = normalizeSettingsPayload(data);
  delete norm.id;

  const keys = Object.keys(norm);
  if (keys.length === 0) {
    return { data: getStoreSettings() };
  }

  const setClauses = keys.map((k) => `"${k}" = ?`).join(', ');
  const values = keys.map((k) => norm[k]);

  // التأكد من وجود سجل الإعدادات أولاً
  execute(
    "INSERT OR IGNORE INTO settings (id, shop_name) VALUES ('default', 'متجري')"
  );

  execute(`UPDATE settings SET ${setClauses} WHERE id = 'default'`, values);
  notifyTableChange('settings', 'update', 'default');

  return { data: getStoreSettings() };
}
