// Default Print Templates — POS-PRINT-001
// القوالب الافتراضية الثلاثة: حراري 80mm، A4، A5
import type {
  PrintTemplate,
  TemplateLayout,
  VisibilityMap,
  DEFAULT_VISIBILITY,
  DEFAULT_STYLES,
} from '../types/invoicePrint';

// ======= قالب إيصال حراري 80mm — السوبرماركت والصيدليات =======
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
      id: 'f-barcode',
      type: 'barcode',
      source: 'invoiceNumber',
      width: 180,
      height: 50,
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

// ======= قالب فاتورة A4 — الشركات والجملة =======
const invoiceA4Layout: TemplateLayout = {
  header: [
    {
      id: 'h-logo',
      type: 'image',
      src: '',
      width: 80,
      height: 80,
      align: 'right',
    },
    {
      id: 'h-info-col',
      type: 'column',
      gap: 4,
      children: [
        {
          id: 'h-name',
          type: 'text',
          text: '{{shopLegal.name}}',
          size: 'xl',
          weight: 700,
          colorVar: 'header',
          align: 'right',
        },
        {
          id: 'h-address',
          type: 'text',
          text: '{{shopLegal.address}}',
          size: 'sm',
          colorVar: 'footer',
          align: 'right',
        },
        {
          id: 'h-phone',
          type: 'text',
          text: '{{shopLegal.phone}}',
          size: 'sm',
          colorVar: 'footer',
          align: 'right',
        },
        {
          id: 'h-tax',
          type: 'text',
          text: ['RC: {{shopLegal.commercialRegister}}', 'NIF: {{shopLegal.nif}}', 'AI: {{shopLegal.ai}}'],
          size: 'sm',
          colorVar: 'footer',
          align: 'right',
        },
      ],
    },
    {
      id: 'h-sep',
      type: 'separator',
      style: 'solid',
    },
  ],
  body: [
    {
      id: 'b-meta-row',
      type: 'row',
      align: 'space-between',
      gap: 20,
      children: [
        {
          id: 'b-meta-col1',
          type: 'column',
          gap: 4,
          children: [
            { id: 'b-inv-num', type: 'text', text: 'رقم الفاتورة: {{invoice.number}}', size: 'md', weight: 600 },
            { id: 'b-inv-date', type: 'text', text: 'التاريخ: {{invoice.date}}', size: 'sm', colorVar: 'footer' },
            { id: 'b-seller', type: 'text', text: 'البائع: {{user.name}}', size: 'sm', colorVar: 'footer' },
          ],
        },
        {
          id: 'b-meta-col2',
          type: 'column',
          gap: 4,
          children: [
            { id: 'b-cust-name', type: 'text', text: 'الزبون: {{invoice.customerName}}', size: 'md', weight: 600 },
            { id: 'b-cust-phone', type: 'text', text: 'الهاتف: {{invoice.customerPhone}}', size: 'sm', colorVar: 'footer' },
            { id: 'b-cust-addr', type: 'text', text: 'العنوان: {{invoice.customerAddress}}', size: 'sm', colorVar: 'footer' },
          ],
        },
      ],
    },
    {
      id: 'b-table',
      type: 'table',
      columns: [
        { key: 'name', label: 'المنتج', align: 'right' },
        { key: 'qty', label: 'الكمية', align: 'center', format: 'number' },
        { key: 'unitPrice', label: 'سعر الوحدة', align: 'left', format: 'currency' },
        { key: 'discount', label: 'الخصم', align: 'left', format: 'currency' },
        { key: 'lineTotal', label: 'الإجمالي', align: 'left', format: 'currency' },
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
      id: 'f-sep',
      type: 'separator',
      style: 'dashed',
    },
    {
      id: 'f-qr-row',
      type: 'row',
      align: 'space-between',
      children: [
        {
          id: 'f-sign-stamp',
          type: 'column',
          gap: 4,
          children: [
            { id: 'f-sign-label', type: 'text', text: 'توقيع البائع:', size: 'sm' },
            { id: 'f-sign-box', type: 'separator', style: 'dashed' },
            { id: 'f-stamp-box', type: 'separator', style: 'dashed' },
          ],
        },
        {
          id: 'f-totals',
          type: 'column',
          gap: 4,
          children: [
            { id: 'f-tot-subtotal', type: 'row', align: 'space-between', children: [{ id: 's1', type: 'text', text: 'المجموع الفرعي:', size: 'sm' }, { id: 's2', type: 'text', text: '{{invoice.subtotal}}', size: 'sm', weight: 600 }] },
            { id: 'f-tot-discount', type: 'row', align: 'space-between', children: [{ id: 'd1', type: 'text', text: 'الخصم:', size: 'sm' }, { id: 'd2', type: 'text', text: '{{invoice.discount}}', size: 'sm' }] },
            { id: 'f-tot-tva', type: 'row', align: 'space-between', children: [{ id: 't1', type: 'text', text: 'TVA:', size: 'sm' }, { id: 't2', type: 'text', text: '{{invoice.tvaAmount}}', size: 'sm' }] },
            { id: 'f-tot-total', type: 'row', align: 'space-between', children: [{ id: 'tt1', type: 'text', text: 'الإجمالي:', size: 'lg', weight: 700, colorVar: 'primary' }, { id: 'tt2', type: 'text', text: '{{invoice.total}}', size: 'lg', weight: 700, colorVar: 'primary' }] },
          ],
        },
        { id: 'f-qr', type: 'qr', payload: 'invoiceNumber:date:total', size: 90 },
      ],
    },
    {
      id: 'f-payment',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'f-pay-method', type: 'text', text: 'طريقة الدفع: {{invoice.paymentMethod}}', size: 'sm' },
        { id: 'f-cashier', type: 'text', text: 'الكاشير: {{user.name}}', size: 'sm' },
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

// ======= قالب A5 — للتوصيل والفواتير المختصرة =======
const invoiceA5Layout: TemplateLayout = {
  header: [
    {
      id: 'h-logo',
      type: 'image',
      src: '',
      width: 50,
      height: 50,
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
      id: 'h-contact',
      type: 'text',
      text: '{{shopLegal.phone}}',
      align: 'center',
      size: 'sm',
      colorVar: 'footer',
    },
    {
      id: 'h-sep',
      type: 'separator',
      style: 'dashed',
    },
    {
      id: 'h-inv-info',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'h-inv-num', type: 'text', text: 'فاتورة #{{invoice.number}}', size: 'md', weight: 600 },
        { id: 'h-inv-date', type: 'text', text: '{{invoice.date}}', size: 'sm' },
      ],
    },
    {
      id: 'h-customer',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'h-cust-name', type: 'text', text: 'الزبون: {{invoice.customerName}}', size: 'sm' },
        { id: 'h-cust-phone', type: 'text', text: 'الهاتف: {{invoice.customerPhone}}', size: 'sm' },
      ],
    },
  ],
  body: [
    {
      id: 'b-table',
      type: 'table',
      columns: [
        { key: 'name', label: 'المنتج', align: 'right' },
        { key: 'qty', label: 'الك', align: 'center', format: 'number' },
        { key: 'lineTotal', label: 'الإجمالي', align: 'left', format: 'currency' },
      ],
      source: 'items',
      showTotal: true,
      showTva: false,
    },
  ],
  footer: [
    {
      id: 'f-sep',
      type: 'separator',
      style: 'solid',
    },
    {
      id: 'f-total-row',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'f-total-label', type: 'text', text: 'الإجمالي', size: 'lg', weight: 700, colorVar: 'primary' },
        { id: 'f-total-val', type: 'text', text: '{{invoice.total}}', size: 'lg', weight: 700, colorVar: 'primary' },
      ],
    },
    {
      id: 'f-payment',
      type: 'row',
      align: 'space-between',
      children: [
        { id: 'f-pay', type: 'text', text: 'الدفع: {{invoice.paymentMethod}}', size: 'sm' },
        { id: 'f-cashier', type: 'text', text: '{{user.name}}', size: 'sm', colorVar: 'footer' },
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

// ======= القوالب الافتراضية =======
export const DEFAULT_THERMAL_80: PrintTemplate = {
  id: 'default-thermal-80',
  name: 'إيصال حراري 80mm',
  description: 'قالب افتراضي للإيصالات الحرارية — مناسب للسوبرماركت والصيدليات',
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
    qr: false,
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
    enabled: false,
    payload: 'invoiceNumber',
  },
  isDefault: true,
  isSystem: true,
  createdBy: 'system',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const DEFAULT_INVOICE_A4: PrintTemplate = {
  id: 'default-invoice-a4',
  name: 'فاتورة A4',
  description: 'قالب افتراضي لفواتير A4 — مناسب للجملة والخدمات',
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
    primaryColor: '#0e7490',
    headerColor: '#164e63',
    footerColor: '#475569',
    tableColor: '#cbd5e1',
    logoColor: '#0e7490',
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
  name: 'فاتورة A5',
  description: 'قالب افتراضي لفواتير A5 — مناسب للتوصيل',
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
    unitPrice: false,
    discount: false,
    tva: false,
    sellerName: true,
    cashierName: true,
    paymentMethod: true,
    qr: false,
    signature: false,
    stamp: false,
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
    enabled: false,
    payload: 'invoiceNumber',
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

/** تهيئة القوالب الافتراضية في قاعدة البيانات */
export async function seedDefaultTemplates(customDb?: any): Promise<void> {
  const targetDb = customDb;
  if (!targetDb) return;
  const target = targetDb.print_templates || targetDb.printTemplates;
  if (!target) return;
  try {
    const existingCount = await target.count();
    if (existingCount > 0) return; // لا نُعيد التهيئة إن وجدت قوالب

    await target.bulkPut(ALL_DEFAULT_TEMPLATES);

    // تعيين القوالب الافتراضية لأنواع الوثائق
    const assignTarget = targetDb.template_assignments || targetDb.templateAssignments;
    if (assignTarget) {
      await assignTarget.bulkPut([
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
  } catch (err) {
    console.warn('seedDefaultTemplates error:', err);
  }
}