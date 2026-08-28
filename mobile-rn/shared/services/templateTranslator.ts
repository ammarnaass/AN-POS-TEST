// Print Template Localization & Translation Engine
// Supports Arabic (ar), French (fr), English (en), and Bilingual Arabic/French (ar-fr)

export type TemplateLanguage = 'ar' | 'fr' | 'en' | 'ar-fr';

export interface TranslationDict {
  docTypes: Record<string, string>;
  columns: Record<string, string>;
  labels: Record<string, string>;
  payments: Record<string, string>;
  currency: string;
  defaultFooter: string;
}

export const TRANSLATIONS: Record<TemplateLanguage, TranslationDict> = {
  ar: {
    docTypes: {
      'thermal-receipt': 'وصل بيع',
      'sale-invoice': 'فاتورة بيع',
      'proforma': 'فاتورة شكلية (Proforma)',
      'devis': 'عرض أسعار (Devis)',
      'bl': 'سند تسليم (BL)',
      'return-invoice': 'فاتورة مرتجع',
      'purchase-invoice': 'فاتورة شراء',
      'customer-statement': 'كشف حساب زبون',
      'supplier-statement': 'كشف حساب مورد',
    },
    columns: {
      name: 'المنتج / البيان',
      qty: 'الكمية',
      unitPrice: 'السعر',
      discount: 'الخصم',
      lineTotal: 'الإجمالي',
      price: 'السعر',
      total: 'الإجمالي',
    },
    labels: {
      invoiceNumber: 'رقم الفاتورة',
      date: 'التاريخ',
      time: 'الوقت',
      customer: 'الزبون',
      cashier: 'الكاشير',
      soldBy: 'البائع',
      paymentMethod: 'طريقة الدفع',
      subtotal: 'المجموع الفرعي',
      discount: 'الخصم',
      tva: 'الرسم على القيمة المضافة (TVA)',
      total: 'المجموع النهائي',
      netToPay: 'الصافي للدفع',
      paidAmount: 'المبلغ المدفوع',
      remainingAmount: 'المبلغ المتبقي',
      copies: 'النسخ',
      phone: 'الهاتف',
      address: 'العنوان',
      rc: 'السجل التجاري',
      nif: 'الرقم الجبائي (NIF)',
      nis: 'رقم الإحصاء (NIS)',
      ai: 'المادة (AI)',
    },
    payments: {
      cash: 'نقداً',
      credit: 'آجل (كريدي)',
      card: 'بطاقة بنكية CIB / ذهبية',
      check: 'شيك بنكي',
      transfer: 'تحويل بنكي',
    },
    currency: 'دج',
    defaultFooter: 'شكراً لزيارتكم ونتمنى عودتكم قريباً',
  },

  fr: {
    docTypes: {
      'thermal-receipt': 'TICKET DE CAISSE',
      'sale-invoice': 'FACTURE DE VENTE',
      'proforma': 'FACTURE PROFORMA',
      'devis': 'DEVIS ESTIMATIF',
      'bl': 'BON DE LIVRAISON',
      'return-invoice': "FACTURE D'AVOIR",
      'purchase-invoice': "FACTURE D'ACHAT",
      'customer-statement': 'RELEVÉ DE COMPTE CLIENT',
      'supplier-statement': 'RELEVÉ DE COMPTE FOURNISSEUR',
    },
    columns: {
      name: 'Désignation',
      qty: 'Qté',
      unitPrice: 'P.U (HT/TTC)',
      discount: 'Remise',
      lineTotal: 'Montant Total',
      price: 'P.U',
      total: 'Total',
    },
    labels: {
      invoiceNumber: 'N° Facture',
      date: 'Date',
      time: 'Heure',
      customer: 'Client',
      cashier: 'Caissier',
      soldBy: 'Vendeur',
      paymentMethod: 'Mode de Paiement',
      subtotal: 'Sous-Total',
      discount: 'Remise',
      tva: 'TVA (19%)',
      total: 'Net à Payer',
      netToPay: 'Net à Payer',
      paidAmount: 'Montant Versé',
      remainingAmount: 'Reste à Payer',
      copies: 'Exemplaires',
      phone: 'Tél',
      address: 'Adresse',
      rc: 'RC',
      nif: 'NIF',
      nis: 'NIS',
      ai: 'AI',
    },
    payments: {
      cash: 'Espèces',
      credit: 'Crédit (À terme)',
      card: 'Carte CIB / Edahabia',
      check: 'Chèque Bancaire',
      transfer: 'Virement Bancaire',
    },
    currency: 'DA',
    defaultFooter: 'Merci de votre visite et à bientôt !',
  },

  'ar-fr': {
    docTypes: {
      'thermal-receipt': 'وصل بيع / TICKET',
      'sale-invoice': 'فاتورة بيع / FACTURE',
      'proforma': 'فاتورة شكلية / PROFORMA',
      'devis': 'عرض أسعار / DEVIS',
      'bl': 'سند تسليم / BON DE LIVRAISON',
      'return-invoice': 'فاتورة مرتجع / AVOIR',
      'purchase-invoice': 'فاتورة شراء / ACHAT',
      'customer-statement': 'كشف حساب / RELEVÉ',
      'supplier-statement': 'كشف حساب مورد / RELEVÉ',
    },
    columns: {
      name: 'المنتج / Désignation',
      qty: 'الكمية / Qté',
      unitPrice: 'السعر / P.U',
      discount: 'خصم / Rem.',
      lineTotal: 'المجموع / Total',
      price: 'السعر / P.U',
      total: 'المجموع / Total',
    },
    labels: {
      invoiceNumber: 'رقم الفاتورة / N°',
      date: 'التاريخ / Date',
      time: 'الوقت / Heure',
      customer: 'الزبون / Client',
      cashier: 'الكاشير / Caissier',
      soldBy: 'البائع / Vendeur',
      paymentMethod: 'طريقة الدفع / Paiement',
      subtotal: 'المجموع الفرعي / Sous-Total',
      discount: 'الخصم / Remise',
      tva: 'TVA',
      total: 'الصافي للدفع / Net à Payer',
      netToPay: 'الصافي للدفع / Net',
      paidAmount: 'المسدد / Versé',
      remainingAmount: 'المتبقي / Reste',
      copies: 'النسخ / Copies',
      phone: 'الهاتف / Tél',
      address: 'العنوان / Adresse',
      rc: 'RC',
      nif: 'NIF',
      nis: 'NIS',
      ai: 'AI',
    },
    payments: {
      cash: 'نقداً / Espèces',
      credit: 'آجل / Crédit',
      card: 'بطاقة / Carte CIB',
      check: 'شيك / Chèque',
      transfer: 'تحويل / Virement',
    },
    currency: 'دج / DA',
    defaultFooter: 'شكراً لزيارتكم • Merci de votre visite',
  },

  en: {
    docTypes: {
      'thermal-receipt': 'RECEIPT',
      'sale-invoice': 'SALES INVOICE',
      'proforma': 'PROFORMA INVOICE',
      'devis': 'PRICE QUOTATION',
      'bl': 'DELIVERY NOTE',
      'return-invoice': 'RETURN / CREDIT NOTE',
      'purchase-invoice': 'PURCHASE INVOICE',
      'customer-statement': 'CUSTOMER STATEMENT',
      'supplier-statement': 'SUPPLIER STATEMENT',
    },
    columns: {
      name: 'Item / Description',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      discount: 'Discount',
      lineTotal: 'Total',
      price: 'Price',
      total: 'Total',
    },
    labels: {
      invoiceNumber: 'Invoice No.',
      date: 'Date',
      time: 'Time',
      customer: 'Customer',
      cashier: 'Cashier',
      soldBy: 'Sales Rep',
      paymentMethod: 'Payment Method',
      subtotal: 'Subtotal',
      discount: 'Discount',
      tva: 'VAT / Tax',
      total: 'Grand Total',
      netToPay: 'Net Payable',
      paidAmount: 'Paid',
      remainingAmount: 'Balance Due',
      copies: 'Copies',
      phone: 'Phone',
      address: 'Address',
      rc: 'CR No.',
      nif: 'Tax ID (NIF)',
      nis: 'NIS',
      ai: 'AI',
    },
    payments: {
      cash: 'Cash',
      credit: 'Credit',
      card: 'Credit / Debit Card',
      check: 'Check',
      transfer: 'Bank Transfer',
    },
    currency: 'DZD',
    defaultFooter: 'Thank you for your business! See you soon.',
  },
};

/**
 * Common phrase mapping from Arabic raw template labels to localized strings
 */
const PHRASE_DICTIONARY: Record<string, Record<TemplateLanguage, string>> = {
  'رقم الفاتورة': { ar: 'رقم الفاتورة', fr: 'N° Facture', 'ar-fr': 'رقم الفاتورة / N°', en: 'Invoice No.' },
  'التاريخ': { ar: 'التاريخ', fr: 'Date', 'ar-fr': 'التاريخ / Date', en: 'Date' },
  'الوقت': { ar: 'الوقت', fr: 'Heure', 'ar-fr': 'الوقت / Heure', en: 'Time' },
  'الزبون': { ar: 'الزبون', fr: 'Client', 'ar-fr': 'الزبون / Client', en: 'Customer' },
  'الكاشير': { ar: 'الكاشير', fr: 'Caissier', 'ar-fr': 'الكاشير / Caissier', en: 'Cashier' },
  'البائع': { ar: 'البائع', fr: 'Vendeur', 'ar-fr': 'البائع / Vendeur', en: 'Seller' },
  'طريقة الدفع': { ar: 'طريقة الدفع', fr: 'Mode de Paiement', 'ar-fr': 'الدفع / Paiement', en: 'Payment' },
  'المجموع الفرعي': { ar: 'المجموع الفرعي', fr: 'Sous-Total', 'ar-fr': 'المجموع / S-Total', en: 'Subtotal' },
  'الخصم': { ar: 'الخصم', fr: 'Remise', 'ar-fr': 'الخصم / Remise', en: 'Discount' },
  'الرسم على القيمة المضافة': { ar: 'الرسم على القيمة المضافة', fr: 'TVA', 'ar-fr': 'TVA', en: 'VAT' },
  'المجموع النهائي': { ar: 'المجموع النهائي', fr: 'Net à Payer', 'ar-fr': 'الصافي للدفع / Net', en: 'Grand Total' },
  'الصافي للدفع': { ar: 'الصافي للدفع', fr: 'Net à Payer', 'ar-fr': 'الصافي / Net à Payer', en: 'Net Payable' },
  'المدفوع': { ar: 'المدفوع', fr: 'Versé', 'ar-fr': 'المسدد / Versé', en: 'Paid' },
  'المتبقي': { ar: 'المتبقي', fr: 'Reste', 'ar-fr': 'المتبقي / Reste', en: 'Remaining' },
  'المنتج': { ar: 'المنتج', fr: 'Désignation', 'ar-fr': 'المنتج / Désignation', en: 'Item' },
  'الكمية': { ar: 'الكمية', fr: 'Qté', 'ar-fr': 'الكمية / Qté', en: 'Qty' },
  'السعر': { ar: 'السعر', fr: 'P.U', 'ar-fr': 'السعر / P.U', en: 'Price' },
  'الإجمالي': { ar: 'الإجمالي', fr: 'Total', 'ar-fr': 'المجموع / Total', en: 'Total' },
  'شكراً لزيارتكم ونتمنى عودتكم قريباً': {
    ar: 'شكراً لزيارتكم ونتمنى عودتكم قريباً',
    fr: 'Merci de votre visite et à bientôt',
    'ar-fr': 'شكراً لزيارتكم • Merci de votre visite',
    en: 'Thank you for your visit! See you soon.',
  },
  'شكراً لزيارتكم': {
    ar: 'شكراً لزيارتكم',
    fr: 'Merci de votre visite',
    'ar-fr': 'شكراً لزيارتكم / Merci',
    en: 'Thank you for your visit',
  },
  'نقداً': { ar: 'نقداً', fr: 'Espèces', 'ar-fr': 'نقداً / Espèces', en: 'Cash' },
  'آجل (كريدي)': { ar: 'آجل (كريدي)', fr: 'Crédit', 'ar-fr': 'آجل / Crédit', en: 'Credit' },
  'دج': { ar: 'دج', fr: 'DA', 'ar-fr': 'دج / DA', en: 'DZD' },
};

/**
 * Get translated text for a common phrase
 */
export function translatePhrase(text: string, lang: TemplateLanguage = 'ar'): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (PHRASE_DICTIONARY[trimmed] && PHRASE_DICTIONARY[trimmed][lang]) {
    return PHRASE_DICTIONARY[trimmed][lang];
  }
  return text;
}

/**
 * Format currency according to language
 */
export function formatCurrency(amount: number, lang: TemplateLanguage = 'ar'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const formattedNumber = Number(amount || 0).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formattedNumber} ${dict.currency}`;
}

/**
 * Format date according to language
 */
export function formatDate(dateString: string | number | Date, lang: TemplateLanguage = 'ar'): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }) + ' ' + d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
}

/**
 * Get translated doc type name
 */
export function getLocalizedDocType(docType: string, lang: TemplateLanguage = 'ar'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  return dict.docTypes[docType] || dict.docTypes['sale-invoice'] || 'فاتورة بيع';
}

/**
 * Get translated payment method
 */
export function getLocalizedPaymentMethod(method: string, lang: TemplateLanguage = 'ar'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const normalized = (method || '').toLowerCase();
  if (normalized.includes('cash') || normalized.includes('نقد')) return dict.payments.cash;
  if (normalized.includes('credit') || normalized.includes('آجل') || normalized.includes('كريدي')) return dict.payments.credit;
  if (normalized.includes('card') || normalized.includes('بطاق') || normalized.includes('cib')) return dict.payments.card;
  if (normalized.includes('check') || normalized.includes('شيك')) return dict.payments.check;
  if (normalized.includes('transfer') || normalized.includes('تحويل')) return dict.payments.transfer;
  return method || dict.payments.cash;
}

/**
 * Translate table columns
 */
export function getLocalizedColumns(
  columns?: Array<{ key: string; label: string; align?: string; format?: string }>,
  lang: TemplateLanguage = 'ar'
): Array<{ key: string; label: string; align?: string; format?: string }> {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  if (!columns || columns.length === 0) {
    return [
      { key: 'name', label: dict.columns.name, align: lang === 'ar' ? 'right' : 'left' },
      { key: 'qty', label: dict.columns.qty, align: 'center', format: 'number' },
      { key: 'unitPrice', label: dict.columns.unitPrice, align: 'right', format: 'currency' },
      { key: 'lineTotal', label: dict.columns.lineTotal, align: 'right', format: 'currency' },
    ];
  }

  return columns.map((col) => {
    let newLabel = col.label;
    if (dict.columns[col.key]) {
      newLabel = dict.columns[col.key];
    } else {
      newLabel = translatePhrase(col.label, lang);
    }
    return {
      ...col,
      label: newLabel,
    };
  });
}
