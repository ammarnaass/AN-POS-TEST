// Print Template Service — Mobile
// Full CRUD operations for templates + assignments + presets + default seeding
import { db, ensureInit } from './db';
import type {
  PrintTemplate,
  TemplateAssignment,
  DocTypeKey,
  TemplateStyles,
  VisibilityMap,
  PaperSize,
  Orientation,
  DocumentContext,
  ShopLegalInfo,
  Block,
  TextBlock,
  ImageBlock,
  RowBlock,
  ColumnBlock,
  TableBlock,
  SeparatorBlock,
  QrBlock,
  BarcodeBlock,
} from '@shared/types/invoicePrint';
import {
  DEFAULT_THERMAL_80,
  DEFAULT_INVOICE_A4,
  DEFAULT_INVOICE_A5,
  ALL_DEFAULT_TEMPLATES,
} from '@shared/services/defaultTemplates';
import { TEMPLATE_PRESETS, getPresetById, getPresetTemplateData, type PresetDef } from '@shared/services/templatePresets';
import { paperSpec } from '@shared/services/paperSizes';

export {
  DEFAULT_THERMAL_80,
  DEFAULT_INVOICE_A4,
  DEFAULT_INVOICE_A5,
  ALL_DEFAULT_TEMPLATES,
  TEMPLATE_PRESETS,
  getPresetById,
  getPresetTemplateData,
  type PresetDef,
};

// Safe JSON parser helper
function parseJson<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === 'object') return val as T;
  try {
    return JSON.parse(String(val)) as T;
  } catch {
    return fallback;
  }
}

// Normalize template fields retrieved from SQLite
function normalizeTemplate(raw: any): PrintTemplate {
  if (!raw) return raw;
  return {
    ...raw,
    visibility: parseJson(raw.visibility, DEFAULT_THERMAL_80.visibility),
    layout: parseJson(raw.layout, DEFAULT_THERMAL_80.layout),
    styles: parseJson(raw.styles, DEFAULT_THERMAL_80.styles),
    supportedDocuments: parseJson(raw.supportedDocuments || raw.supported_documents, []),
    qr: raw.qr ? parseJson(raw.qr, undefined) : undefined,
    barcode: raw.barcode ? parseJson(raw.barcode, undefined) : undefined,
    isDefault: Boolean(raw.isDefault ?? raw.is_default),
    isSystem: Boolean(raw.isSystem ?? raw.is_system),
  };
}

// ===== Initial Database Seeding =====

export async function seedDefaultTemplates(): Promise<void> {
  await ensureInit();
  const existing = await db.printTemplates.toArray();
  if (existing.length === 0) {
    // 1. Seed base default templates
    for (const tpl of ALL_DEFAULT_TEMPLATES) {
      await db.printTemplates.put(tpl);
    }

    // 2. Seed all desktop presets
    const now = new Date().toISOString();
    for (const preset of TEMPLATE_PRESETS) {
      const buildData = preset.build();
      const newTpl: PrintTemplate = {
        ...buildData,
        id: preset.id,
        name: preset.nameAr || preset.name,
        description: preset.description,
        isDefault: false,
        isSystem: false,
        createdAt: now,
        updatedAt: now,
      };
      await db.printTemplates.put(newTpl);
    }

    // 3. Seed default document type assignments
    const defaultAssignments: TemplateAssignment[] = [
      { docType: 'thermal-receipt', templateId: 'default-thermal-80' },
      { docType: 'return-invoice', templateId: 'default-thermal-80' },
      { docType: 'sale-invoice', templateId: 'default-invoice-a4' },
      { docType: 'proforma', templateId: 'default-invoice-a4' },
      { docType: 'devis', templateId: 'default-invoice-a4' },
      { docType: 'purchase-invoice', templateId: 'default-invoice-a4' },
      { docType: 'bl', templateId: 'default-invoice-a5' },
      { docType: 'customer-statement', templateId: 'default-invoice-a5' },
      { docType: 'supplier-statement', templateId: 'default-invoice-a5' },
    ];

    for (const assign of defaultAssignments) {
      await db.templateAssignments.put(assign);
    }
  }
}

// ===== Templates CRUD =====

export async function getAllTemplates(): Promise<PrintTemplate[]> {
  await ensureInit();
  await seedDefaultTemplates();
  const rawList = await db.printTemplates.toArray();
  return rawList.map(normalizeTemplate);
}

export async function getTemplateById(id: string): Promise<PrintTemplate | undefined> {
  await ensureInit();
  const raw = await db.printTemplates.get(id);
  if (!raw) {
    // Check default constants
    const found = ALL_DEFAULT_TEMPLATES.find((t) => t.id === id);
    if (found) return found;
    return undefined;
  }
  return normalizeTemplate(raw);
}

export async function getDefaultTemplate(): Promise<PrintTemplate | undefined> {
  await ensureInit();
  const all = await getAllTemplates();
  const def = all.find((t) => t.isDefault);
  return def || all[0] || DEFAULT_THERMAL_80;
}

export async function createTemplate(
  data: Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<PrintTemplate> {
  await ensureInit();
  const now = new Date().toISOString();
  const template: PrintTemplate = {
    ...data,
    id: 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    createdAt: now,
    updatedAt: now,
  };
  await db.printTemplates.add(template);
  return template;
}

export async function updateTemplate(
  id: string,
  updates: Partial<Omit<PrintTemplate, 'id' | 'createdAt'>>,
): Promise<void> {
  await ensureInit();
  const existing = await db.printTemplates.get(id);
  if (!existing) {
    // If updating a system template for the first time, save it directly
    const sys = ALL_DEFAULT_TEMPLATES.find((t) => t.id === id);
    if (sys) {
      await db.printTemplates.put({
        ...sys,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    throw new Error('Template not found');
  }
  await db.printTemplates.put({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTemplate(
  id: string,
): Promise<{ success: boolean; error?: string; softDeleted?: boolean }> {
  await ensureInit();
  const template = await getTemplateById(id);
  if (!template) return { success: false, error: 'القالب غير موجود' };
  if (template.isSystem) return { success: false, error: 'لا يمكن حذف القوالب الأساسية للنظام' };

  if (template.isDefault) {
    const all = await getAllTemplates();
    const otherDefaults = all.filter((t) => t.isDefault && t.id !== id);
    if (otherDefaults.length === 0) {
      return { success: false, error: 'لا يمكن حذف القالب الافتراضي الوحيد' };
    }
  }

  // Remove assignments pointing to this template
  try {
    const assignments = await db.templateAssignments.toArray();
    for (const a of assignments) {
      if ((a as any).templateId === id) {
        await db.templateAssignments.delete((a as any).docType || (a as any).id);
      }
    }
  } catch {}

  await db.printTemplates.delete(id);
  return { success: true };
}

export async function setTemplateAsDefault(id: string): Promise<void> {
  await ensureInit();
  const all = await getAllTemplates();
  for (const t of all) {
    await db.printTemplates.put({
      ...t,
      isDefault: t.id === id,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function duplicateTemplate(
  id: string,
  newName: string,
): Promise<PrintTemplate | null> {
  await ensureInit();
  const source = await getTemplateById(id);
  if (!source) return null;

  const now = new Date().toISOString();
  const copy: PrintTemplate = {
    ...source,
    id: 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    name: newName,
    description: `${source.description || ''} (نسخة)`,
    isDefault: false,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.printTemplates.add(copy);
  return copy;
}

export async function createFromPreset(presetId: string): Promise<PrintTemplate | null> {
  await ensureInit();
  const preset = getPresetById(presetId);
  if (!preset) return null;

  const buildData = preset.build();
  const now = new Date().toISOString();
  const newTpl: PrintTemplate = {
    ...buildData,
    id: 'tpl-preset-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: preset.nameAr || preset.name,
    description: preset.description,
    isDefault: false,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.printTemplates.put(newTpl);
  return newTpl;
}

export async function importAllPresets(): Promise<number> {
  await ensureInit();
  const now = new Date().toISOString();
  let count = 0;

  for (const preset of TEMPLATE_PRESETS) {
    const existing = await db.printTemplates.get(preset.id);
    if (!existing) {
      const buildData = preset.build();
      const newTpl: PrintTemplate = {
        ...buildData,
        id: preset.id,
        name: preset.nameAr || preset.name,
        description: preset.description,
        isDefault: false,
        isSystem: false,
        createdAt: now,
        updatedAt: now,
      };
      await db.printTemplates.put(newTpl);
      count++;
    }
  }

  return count;
}

// ===== Assignments =====

export async function getAllAssignments(): Promise<TemplateAssignment[]> {
  await ensureInit();
  await seedDefaultTemplates();
  const res = await db.templateAssignments.toArray();
  return res as TemplateAssignment[];
}

export async function getDocTypeAssignment(docType: DocTypeKey): Promise<TemplateAssignment | undefined> {
  await ensureInit();
  const all = await getAllAssignments();
  return all.find((a: any) => a.docType === docType);
}

export async function assignTemplateToDocType(
  docType: DocTypeKey,
  templateId: string,
): Promise<void> {
  await ensureInit();
  await db.templateAssignments.put({
    id: docType,
    docType,
    templateId,
  });
}

// ===== Template Builder Helpers =====

export function createEmptyTemplateData(
  name: string,
  description: string,
  paperSize: PaperSize,
  theme: 'cyan' | 'blue' | 'emerald' | 'crimson' | 'amber' | 'slate' = 'cyan',
): Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'> {
  const spec = paperSpec(paperSize);

  const themeColors: Record<string, { primary: string; header: string; footer: string; table: string; logo: string }> = {
    cyan: { primary: '#0891b2', header: '#0e7490', footer: '#475569', table: '#e2e8f0', logo: '#0891b2' },
    blue: { primary: '#2563eb', header: '#1d4ed8', footer: '#64748b', table: '#dbeafe', logo: '#2563eb' },
    emerald: { primary: '#059669', header: '#047857', footer: '#64748b', table: '#d1fae5', logo: '#059669' },
    crimson: { primary: '#dc2626', header: '#b91c1c', footer: '#57534e', table: '#fee2e2', logo: '#dc2626' },
    amber: { primary: '#d97706', header: '#b45309', footer: '#44403c', table: '#fef3c7', logo: '#d97706' },
    slate: { primary: '#334155', header: '#1e293b', footer: '#94a3b8', table: '#f1f5f9', logo: '#334155' },
  };

  const selectedColors = themeColors[theme] || themeColors.cyan;
  const isThermal = paperSize === '58mm' || paperSize === '76mm' || paperSize === '80mm';

  return {
    name,
    description,
    paperSize,
    orientation: 'portrait',
    widthMm: spec.widthMm,
    heightMm: spec.heightMm,
    supportedDocuments: isThermal
      ? ['thermal-receipt', 'return-invoice']
      : ['sale-invoice', 'proforma', 'devis'],
    visibility: {
      logo: true,
      shopName: true,
      invoiceNumber: true,
      customerName: true,
      customerPhone: false,
      customerAddress: false,
      barcode: isThermal,
      unitPrice: true,
      discount: true,
      tva: false,
      sellerName: false,
      cashierName: true,
      paymentMethod: true,
      qr: true,
      signature: !isThermal,
      stamp: !isThermal,
    },
    layout: {
      header: [
        { id: 'h-name', type: 'text', text: '{{shopLegal.name}}', align: 'center', size: 'lg', weight: 700, colorVar: 'primary' },
        { id: 'h-phone', type: 'text', text: '{{shopLegal.phone}}', align: 'center', size: 'sm', colorVar: 'footer' },
        { id: 'h-sep', type: 'separator', style: 'dashed' },
      ],
      body: [
        {
          id: 'b-num-row',
          type: 'row',
          align: 'space-between',
          children: [
            { id: 'b-num-lbl', type: 'text', text: 'رقم الفاتورة', size: 'sm' },
            { id: 'b-num-val', type: 'text', text: '{{invoice.number}}', size: 'sm', weight: 700 },
          ],
        },
        {
          id: 'b-date-row',
          type: 'row',
          align: 'space-between',
          children: [
            { id: 'b-date-lbl', type: 'text', text: 'التاريخ', size: 'sm' },
            { id: 'b-date-val', type: 'text', text: '{{invoice.date}}', size: 'sm' },
          ],
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
          showSubtotal: true,
          showDiscount: true,
          showTva: false,
          showTotal: true,
        },
      ],
      footer: [
        { id: 'f-sep', type: 'separator', style: 'dashed' },
        { id: 'f-qr', type: 'qr', payload: 'invoiceNumber:date:total', size: 100 },
        { id: 'f-foot', type: 'text', text: 'شكراً لتسوقكم معنا', align: 'center', size: 'sm', colorVar: 'footer' },
      ],
    },
    styles: {
      primaryColor: selectedColors.primary,
      headerColor: selectedColors.header,
      footerColor: selectedColors.footer,
      tableColor: selectedColors.table,
      logoColor: selectedColors.logo,
      font: {
        family: 'Cairo',
        size: isThermal ? (paperSize === '58mm' ? 9 : 11) : 13,
        weight: 400,
      },
    },
    isDefault: false,
    isSystem: false,
    createdBy: 'mobile-user',
  };
}

// ===== Variables Interpolation for Mobile =====

export function interpolateVariables(text: string, ctx: Record<string, any>): string {
  if (!text) return '';
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const aliasMap: Record<string, string> = {
      store_name: 'shopLegal.name',
      shop_name: 'shopLegal.name',
      store_phone: 'shopLegal.phone',
      store_address: 'shopLegal.address',
      invoice_number: 'invoice.number',
      invoice_date: 'invoice.date',
      invoice_total: 'invoice.total',
      total: 'invoice.total',
      subtotal: 'invoice.subtotal',
      cashier_name: 'user.name',
      cashier: 'user.name',
    };
    const resolved = aliasMap[path] || path;
    const parts = resolved.split('.');
    let val: any = ctx;
    for (const p of parts) {
      if (val === null || val === undefined) return '';
      val = val[p];
    }
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') {
      return val.toLocaleString('ar-DZ');
    }
    return String(val);
  });
}

// ===== Print History =====

export async function recordPrint(
  invoiceId: string,
  docTypeKey: DocTypeKey,
  templateId: string,
  printedBy: string,
  copies: number = 1,
  printerName: string = 'طابعة الهاتف',
  isReprint: boolean = false,
): Promise<void> {
  await ensureInit();
  await db.printHistory.add({
    id: 'prh-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    referenceId: invoiceId,
    referenceType: 'sale',
    invoiceId,
    docTypeKey,
    templateId,
    printedBy,
    printedAt: new Date().toISOString(),
    copies,
    printerName,
    isReprint,
  });
}

export async function getPrintHistory(invoiceId: string): Promise<any[]> {
  await ensureInit();
  const all = await db.printHistory.toArray();
  return all
    .filter((r: any) => r.invoiceId === invoiceId || r.referenceId === invoiceId)
    .sort((a: any, b: any) => new Date(b.printedAt).getTime() - new Date(a.printedAt).getTime());
}
