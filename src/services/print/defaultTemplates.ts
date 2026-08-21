// Default Print Templates — POS-PRINT-001
// القوالب الافتراضية الثلاثة المتكاملة:
// 1. حراري 80mm — إيصالات الكاشير والسوبرماركت
// 2. فاتورة A4 (210×297 ملم) — الفواتير التجارية الكاملة، الجملة، Proforma، و Devis
// 3. فاتورة A5 (148×210 ملم) — وصولات التسليم (BL)، كشوفات الحساب، وطلبات التوصيل

import type {
  PrintTemplate,
  TemplateLayout,
} from '@/types/invoicePrint';

// ======= 1. قالب إيصال حراري 80mm — السوبرماركت والصيدليات =======
const thermal80Layout: TemplateLayout = {
  header: [
    {
      id: 'h-logo',
      type: 'image',
      src: '',
      width: 60,
      height: 60,
      align: 'center',
    },
    {
      id: 'h-name',
      type: 'text',
      text: '{{shopLegal.name}}',
      align: 'center',
      size: 'lg',
      weight: 700,
      colorVar: 'primary',
    },
    {
      id: 'h-info',
      type: 'text',
      text: ['{{shopLegal.phone}}', '{{shopLegal.address}}'],
      align: 'center',
      size: 'sm',
      colorVar: 'footer',
    },
    {
      id: 'h-sep',
      type: 'separator',
      style: 'dashed',
    },
  ],
  body: [
    {
      id: 'b-number',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'b-num-label', type: 'text', text: 'رقم الفاتورة', size: 'sm', align: 'right' },
        { id: 'b-num-val', type: 'text', text: '{{invoice.number}}', size: 'sm', align: 'left', weight: 600 },
      ],
    },
    {
      id: 'b-date',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'b-date-label', type: 'text', text: 'التاريخ', size: 'sm', align: 'right' },
        { id: 'b-date-val', type: 'text', text: '{{invoice.date}}', size: 'sm', align: 'left' },
      ],
    },
    {
      id: 'b-customer',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'b-cust-label', type: 'text', text: 'الزبون', size: 'sm', align: 'right' },
        { id: 'b-cust-val', type: 'text', text: '{{invoice.customerName}}', size: 'sm', align: 'left' },
      ],
    },
    {
      id: 'b-cashier',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'b-cash-label', type: 'text', text: 'الكاشير', size: 'sm', align: 'right' },
        { id: 'b-cash-val', type: 'text', text: '{{user.name}}', size: 'sm', align: 'left' },
      ],
    },
    {
      id: 'b-sep-table',
      type: 'separator',
      style: 'solid',
    },
    {
      id: 'b-table',
      type: 'table',
      columns: [
        { key: 'name', label: 'المنتج', align: 'right' },
        { key: 'qty', label: 'الكمية', align: 'center', format: 'number' },
        { key: 'unitPrice', label: 'السعر', align: 'left', format: 'currency' },
        { key: 'lineTotal', label: 'الإجمالي', align: 'left', format: 'currency' },
      ],
      source: 'items',
      showTotal: true,
      showDiscount: true,
      showTva: false,
    },
  ],
  footer: [
    {
      id: 'f-sep',
      type: 'separator',
      style: 'dashed',
    },
    {
      id: 'f-total',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'f-total-label', type: 'text', text: 'الإجمالي', size: 'lg', weight: 700, colorVar: 'primary' },
        { id: 'f-total-val', type: 'text', text: '{{invoice.total}}', size: 'xl', weight: 700, colorVar: 'primary' },
      ],
    },
    {
      id: 'f-payment',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'f-pay-label', type: 'text', text: 'طريقة الدفع', size: 'sm' },
        { id: 'f-pay-val', type: 'text', text: '{{invoice.paymentMethod}}', size: 'sm' },
      ],
    },
    {
      id: 'f-qr',
      type: 'qr',
      payload: 'invoiceNumber:date:total',
      size: 100,
    },
    {
      id: 'f-footer',
      type: 'text',
      text: '{{shopLegal.footer}}',
      align: 'center',
      size: 'sm',
      colorVar: 'footer',
    },
  ],
};

// ======= 2. قالب A4 (210×297 ملم) — الفواتير التجارية الرسمية والجملة =======
const invoiceA4Layout: TemplateLayout = {
  header: [
    {
      id: 'h-top-row',
      type: 'row',
      align: 'space-between',
      gap: 16,
      children: [
        {
          id: 'h-company-col',
          type: 'column',
          gap: 3,
          children: [
            { id: 'h-name', type: 'text', text: '{{shopLegal.name}}', size: 'xl', weight: 800, colorVar: 'primary' },
            { id: 'h-address', type: 'text', text: 'العنوان: {{shopLegal.address}}', size: 'sm', colorVar: 'footer' },
            { id: 'h-phone', type: 'text', text: 'الهاتف: {{shopLegal.phone}}', size: 'sm', colorVar: 'footer' },
            { id: 'h-email', type: 'text', text: 'البريد: {{shopLegal.email}}', size: 'sm', colorVar: 'footer' },
          ],
        },
        {
          id: 'h-legal-col',
          type: 'column',
          gap: 3,
          children: [
            { id: 'h-title-badge', type: 'text', text: 'فاتورة تجارية / Facture Commerciale', size: 'lg', weight: 800, colorVar: 'header' },
            { id: 'h-rc', type: 'text', text: 'السجل التجاري (RC): {{shopLegal.commercialRegister}}', size: 'sm', colorVar: 'footer' },
            { id: 'h-nif', type: 'text', text: 'الرقم الجبائي (NIF): {{shopLegal.nif}}', size: 'sm', colorVar: 'footer' },
            { id: 'h-ai', type: 'text', text: 'رقم المادة (AI): {{shopLegal.ai}}', size: 'sm', colorVar: 'footer' },
          ],
        },
      ],
    },
    {
      id: 'h-sep-main',
      type: 'separator',
      style: 'solid',
      thickness: 2,
      colorVar: 'primary',
    },
  ],
  body: [
    {
      id: 'b-meta-cards',
      type: 'row',
      align: 'space-between',
      gap: 16,
      children: [
        {
          id: 'b-doc-meta',
          type: 'column',
          gap: 4,
          children: [
            { id: 'b-inv-num', type: 'text', text: 'رقم الفاتورة: {{invoice.number}}', size: 'md', weight: 700 },
            { id: 'b-inv-date', type: 'text', text: 'تاريخ الإصدار: {{invoice.date}}', size: 'sm' },
            { id: 'b-pay-mode', type: 'text', text: 'طريقة الدفع: {{invoice.paymentMethod}}', size: 'sm' },
            { id: 'b-seller', type: 'text', text: 'المسؤول / البائع: {{user.name}}', size: 'sm', colorVar: 'footer' },
          ],
        },
        {
          id: 'b-cust-meta',
          type: 'column',
          gap: 4,
          children: [
            { id: 'b-cust-title', type: 'text', text: 'معلومات العميل / الزبون', size: 'md', weight: 700, colorVar: 'header' },
            { id: 'b-cust-name', type: 'text', text: 'الاسم / الشركة: {{invoice.customerName}}', size: 'sm', weight: 600 },
            { id: 'b-cust-phone', type: 'text', text: 'الهاتف: {{invoice.customerPhone}}', size: 'sm' },
            { id: 'b-cust-addr', type: 'text', text: 'العنوان: {{invoice.customerAddress}}', size: 'sm', colorVar: 'footer' },
          ],
        },
      ],
    },
    {
      id: 'b-sep-pre-table',
      type: 'separator',
      style: 'solid',
    },
    {
      id: 'b-table',
      type: 'table',
      columns: [
        { key: 'name', label: 'تعيين الصنف (Désignation)', align: 'right' },
        { key: 'qty', label: 'الكمية (Qté)', align: 'center', format: 'number' },
        { key: 'unitPrice', label: 'سعر الوحدة (P.U)', align: 'left', format: 'currency' },
        { key: 'discount', label: 'الخصم (Remise)', align: 'left', format: 'currency' },
        { key: 'lineTotal', label: 'الإجمالي (Montant)', align: 'left', format: 'currency' },
      ],
      source: 'items',
      showSubtotal: true,
      showDiscount: true,
      showTva: true,
      showTotal: true,
    },
  ],
  footer: [
    {
      id: 'f-sep-foot',
      type: 'separator',
      style: 'solid',
    },
    {
      id: 'f-signatures-row',
      type: 'row',
      align: 'space-between',
      gap: 20,
      children: [
        {
          id: 'f-seller-sign',
          type: 'column',
          gap: 6,
          children: [
            { id: 'f-sign-label', type: 'text', text: 'ختم وتوقيع البائع (Cachet & Signature)', size: 'sm', weight: 600 },
            { id: 'f-sign-box', type: 'text', text: '\n\n\n_______________________', size: 'sm', colorVar: 'footer' },
          ],
        },
        {
          id: 'f-qr-wrap',
          type: 'column',
          gap: 2,
          children: [
            { id: 'f-qr', type: 'qr', payload: 'invoiceNumber:date:total', size: 105 },
            { id: 'f-qr-lbl', type: 'text', text: 'رمز التحقق الرقمي', size: 'sm', align: 'center', colorVar: 'footer' },
          ],
        },
        {
          id: 'f-client-sign',
          type: 'column',
          gap: 6,
          children: [
            { id: 'f-recv-label', type: 'text', text: 'استلام وتوقيع العميل (Accusé de réception)', size: 'sm', weight: 600 },
            { id: 'f-recv-box', type: 'text', text: '\n\n\n_______________________', size: 'sm', colorVar: 'footer' },
          ],
        },
      ],
    },
    {
      id: 'f-sep-final',
      type: 'separator',
      style: 'dashed',
    },
    {
      id: 'f-footer',
      type: 'text',
      text: '{{shopLegal.footer}} · البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة الأصلية',
      align: 'center',
      size: 'sm',
      colorVar: 'footer',
    },
  ],
};

// ======= 3. قالب A5 (148×210 ملم) — وصولات التسليم (BL) والتوصيل السريع =======
const invoiceA5Layout: TemplateLayout = {
  header: [
    {
      id: 'h-top',
      type: 'row',
      align: 'space-between',
      children: [
        {
          id: 'h-shop-info',
          type: 'column',
          gap: 2,
          children: [
            { id: 'h-name', type: 'text', text: '{{shopLegal.name}}', size: 'lg', weight: 800, colorVar: 'primary' },
            { id: 'h-contact', type: 'text', text: '{{shopLegal.phone}} · {{shopLegal.address}}', size: 'sm', colorVar: 'footer' },
          ],
        },
        {
          id: 'h-bl-title',
          type: 'column',
          gap: 2,
          children: [
            { id: 'h-doc-type', type: 'text', text: 'وصل تسليم / Bon de Livraison', size: 'md', weight: 700, colorVar: 'header' },
            { id: 'h-doc-num', type: 'text', text: 'رقم: {{invoice.number}}', size: 'sm', weight: 600 },
          ],
        },
      ],
    },
    {
      id: 'h-sep',
      type: 'separator',
      style: 'solid',
      thickness: 1.5,
      colorVar: 'primary',
    },
    {
      id: 'h-meta-row',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'h-cust', type: 'text', text: 'الزبون: {{invoice.customerName}}', size: 'sm', weight: 600 },
        { id: 'h-cust-phone', type: 'text', text: 'الهاتف: {{invoice.customerPhone}}', size: 'sm' },
        { id: 'h-date', type: 'text', text: 'التاريخ: {{invoice.date}}', size: 'sm' },
      ],
    },
  ],
  body: [
    {
      id: 'b-table',
      type: 'table',
      columns: [
        { key: 'name', label: 'المنتج / Désignation', align: 'right' },
        { key: 'qty', label: 'الكمية (Qté)', align: 'center', format: 'number' },
        { key: 'unitPrice', label: 'السعر (P.U)', align: 'left', format: 'currency' },
        { key: 'lineTotal', label: 'الإجمالي (Total)', align: 'left', format: 'currency' },
      ],
      source: 'items',
      showSubtotal: true,
      showDiscount: true,
      showTotal: true,
    },
  ],
  footer: [
    {
      id: 'f-sep',
      type: 'separator',
      style: 'solid',
    },
    {
      id: 'f-bottom-row',
      type: 'row',
      align: 'space-between',
      gap: 12,
      children: [
        {
          id: 'f-sign-client',
          type: 'column',
          gap: 4,
          children: [
            { id: 'f-sign-lbl', type: 'text', text: 'توقيع المستلم (Reçu par)', size: 'sm', weight: 600 },
            { id: 'f-sign-line', type: 'text', text: '\n\n_______________', size: 'sm', colorVar: 'footer' },
          ],
        },
        {
          id: 'f-qr',
          type: 'qr',
          payload: 'invoiceNumber:date:total',
          size: 80,
        },
        {
          id: 'f-sign-deliver',
          type: 'column',
          gap: 4,
          children: [
            { id: 'f-deliv-lbl', type: 'text', text: 'الموزع / الكاشير: {{user.name}}', size: 'sm' },
            { id: 'f-pay', type: 'text', text: 'طريقة الدفع: {{invoice.paymentMethod}}', size: 'sm', weight: 600 },
          ],
        },
      ],
    },
    {
      id: 'f-footer',
      type: 'text',
      text: '{{shopLegal.footer}}',
      align: 'center',
      size: 'sm',
      colorVar: 'footer',
    },
  ],
};

// ======= القوالب الافتراضية المعرفة في النظام =======
export const DEFAULT_THERMAL_80: PrintTemplate = {
  id: 'default-thermal-80',
  name: 'إيصال حراري 80mm',
  description: 'قالب افتراضي للإيصالات الحرارية — مناسب للسوبرماركت والصيدليات ونقاط البيع',
  paperSize: '80mm',
  orientation: 'portrait',
  widthMm: 80,
  supportedDocuments: ['thermal-receipt', 'return-invoice'],
  visibility: {
    logo: true,
    shopName: true,
    invoiceNumber: true,
    customerName: true,
    customerPhone: false,
    customerAddress: false,
    barcode: true,
    unitPrice: true,
    discount: false,
    tva: false,
    sellerName: false,
    cashierName: true,
    paymentMethod: true,
    qr: true,
    signature: false,
    stamp: false,
  },
  layout: thermal80Layout,
  styles: {
    primaryColor: '#0891b2',
    headerColor: '#0e7490',
    footerColor: '#64748b',
    tableColor: '#e2e8f0',
    logoColor: '#0891b2',
    font: {
      family: 'Cairo',
      size: 12,
      weight: 400,
    },
  },
  barcode: {
    enabled: true,
    source: 'invoiceNumber',
  },
  qr: {
    enabled: true,
    payload: 'invoiceNumber:date:total',
  },
  isDefault: true,
  isSystem: true,
  createdBy: 'system',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const DEFAULT_INVOICE_A4: PrintTemplate = {
  id: 'default-invoice-a4',
  name: 'فاتورة A4 (قياسية)',
  description: 'قالب رسمي كامل لفواتير A4 — مناسب للجملة، الخدمات، الفواتير الأولية (Proforma) وعروض الأسعار (Devis)',
  paperSize: 'A4',
  orientation: 'portrait',
  widthMm: 210,
  heightMm: 297,
  supportedDocuments: ['sale-invoice', 'proforma', 'devis', 'purchase-invoice'],
  visibility: {
    logo: true,
    shopName: true,
    invoiceNumber: true,
    customerName: true,
    customerPhone: true,
    customerAddress: true,
    barcode: false,
    unitPrice: true,
    discount: true,
    tva: true,
    sellerName: true,
    cashierName: true,
    paymentMethod: true,
    qr: true,
    signature: true,
    stamp: true,
  },
  layout: invoiceA4Layout,
  styles: {
    primaryColor: '#0284c7',
    headerColor: '#0369a1',
    footerColor: '#475569',
    tableColor: '#cbd5e1',
    logoColor: '#0284c7',
    font: {
      family: 'Cairo',
      size: 13,
      weight: 400,
    },
  },
  barcode: {
    enabled: false,
    source: 'invoiceNumber',
  },
  qr: {
    enabled: true,
    payload: 'invoiceNumber:date:total',
  },
  isDefault: false,
  isSystem: true,
  createdBy: 'system',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const DEFAULT_INVOICE_A5: PrintTemplate = {
  id: 'default-invoice-a5',
  name: 'فاتورة A5 / وصل تسليم',
  description: 'قالب افتراضي لفواتير A5 — مثالي لوصولات التسليم (BL)، كشوفات الحساب، وطلبات التوزيع',
  paperSize: 'A5',
  orientation: 'portrait',
  widthMm: 148,
  heightMm: 210,
  supportedDocuments: ['bl', 'customer-statement', 'supplier-statement'],
  visibility: {
    logo: true,
    shopName: true,
    invoiceNumber: true,
    customerName: true,
    customerPhone: true,
    customerAddress: false,
    barcode: false,
    unitPrice: true,
    discount: true,
    tva: false,
    sellerName: true,
    cashierName: true,
    paymentMethod: true,
    qr: true,
    signature: true,
    stamp: true,
  },
  layout: invoiceA5Layout,
  styles: {
    primaryColor: '#0891b2',
    headerColor: '#0e7490',
    footerColor: '#64748b',
    tableColor: '#e2e8f0',
    logoColor: '#0891b2',
    font: {
      family: 'Cairo',
      size: 12,
      weight: 400,
    },
  },
  barcode: {
    enabled: false,
    source: 'invoiceNumber',
  },
  qr: {
    enabled: true,
    payload: 'invoiceNumber:date:total',
  },
  isDefault: false,
  isSystem: true,
  createdBy: 'system',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

/** جميع القوالب الافتراضية */
export const ALL_DEFAULT_TEMPLATES: PrintTemplate[] = [
  DEFAULT_THERMAL_80,
  DEFAULT_INVOICE_A4,
  DEFAULT_INVOICE_A5,
];

/** تهيئة وتحديث القوالب الافتراضية في قاعدة البيانات */
export async function seedDefaultTemplates(): Promise<void> {
  const { db } = await import('@/infrastructure/database/dexie/db');
  
  // نضمن وجود أو تحديث القوالب النظامية دائماً بأحدث التصاميم
  await db.print_templates.bulkPut(ALL_DEFAULT_TEMPLATES);

  // تعيين القوالب الافتراضية لأنواع الوثائق إذا لم تكن موجودة
  const existingAssignments = await db.template_assignments.count();
  if (existingAssignments === 0) {
    await db.template_assignments.bulkPut([
      { docType: 'thermal-receipt', templateId: 'default-thermal-80' },
      { docType: 'return-invoice', templateId: 'default-thermal-80' },
      { docType: 'sale-invoice', templateId: 'default-invoice-a4' },
      { docType: 'proforma', templateId: 'default-invoice-a4' },
      { docType: 'devis', templateId: 'default-invoice-a4' },
      { docType: 'purchase-invoice', templateId: 'default-invoice-a4' },
      { docType: 'bl', templateId: 'default-invoice-a5' },
      { docType: 'customer-statement', templateId: 'default-invoice-a5' },
      { docType: 'supplier-statement', templateId: 'default-invoice-a5' },
    ]);
  }
}