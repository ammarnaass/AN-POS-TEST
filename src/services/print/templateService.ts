// PrintTemplate Service — POS-PRINT-001
// عمليات CRUD للقوالب + إدارة التخصيصات
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/infrastructure/database/dexie/db';
import type {
  PrintTemplate,
  TemplateAssignment,
  DocTypeKey,
  VisibilityMap,
  TemplateStyles,
  PaperSize,
  TextBlock,
  ColumnBlock,
} from '@/types/invoicePrint';
import type { PrintTemplateEntity } from '@/infrastructure/database/dexie/db';
import { PAPER_SPECS } from './paperSizes';
import { canPerform, type PrintAction } from './permissions';

const isTextBlock = (b: { type: string }): b is TextBlock => b.type === 'text';
const isColumnBlock = (b: { type: string }): b is ColumnBlock => b.type === 'column';

// BR-PRINT-006: المدير فقط يمكنه إنشاء/تعديل/حذف/تعيين القوالب
function assertPermission(action: PrintAction, role: 'admin' | 'cashier' | 'seller' | 'accountant' | undefined): void {
  if (!canPerform(action, role)) {
    throw new Error(`صلاحية غير كافية: ${action} يتطلب صلاحية المدير`);
  }
}

/**
 * الحصول على جميع القوالب
 */
export async function getAllTemplates(): Promise<PrintTemplate[]> {
  return db.print_templates.toArray();
}

/**
 * الحصول على قالب بواسطة المعرف
 */
export async function getTemplateById(id: string): Promise<PrintTemplate | undefined> {
  return db.print_templates.get(id);
}

/**
 * الحصول على القالب الافتراضي
 */
export async function getDefaultTemplate(): Promise<PrintTemplate | undefined> {
  return db.print_templates.where('isDefault').equals(1).first();
}

/**
 * إنشاء قالب جديد
 * BR-PRINT-006: المدير فقط يمكنه إنشاء القوالب
 */
export async function createTemplate(
  data: Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string,
  creatorRole: 'admin' | 'cashier' | 'seller' | 'accountant' = 'admin',
): Promise<PrintTemplate> {
  assertPermission('create_template', creatorRole);
  const now = new Date().toISOString();
  const template: PrintTemplate = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.print_templates.add(template);
  return template;
}

/**
 * تحديث قالب
 */
// BR-PRINT-006: المدير فقط يمكنه تعديل القوالب
// BR-PRINT-007: القالب يجب أن يدعم العربية RTL
// BR-PRINT-008: قالب 80mm لا يتجاوز العرض المسموح
// BR-PRINT-009: القوالب القانونية تتضمن معلومات المحل الإلزامية
export async function updateTemplate(
  id: string,
  updates: Partial<Omit<PrintTemplate, 'id' | 'createdAt' | 'createdBy'>>,
  updaterRole: 'admin' | 'cashier' | 'seller' | 'accountant' = 'admin',
): Promise<void> {
  assertPermission('edit_template', updaterRole);
  const existing = await db.print_templates.get(id);
  if (!existing) throw new Error('القالب غير موجود');
  await db.print_templates.put({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  } as PrintTemplateEntity);
}

/**
 * حذف قالب — لا يمكن حذف قوالب النظام
 * BR-PRINT-006: المدير فقط
 * BR-PRINT-004: soft delete عند وجود سجل طباعة
 */
export async function deleteTemplate(
  id: string,
  deleterRole: 'admin' | 'cashier' | 'seller' | 'accountant' = 'admin',
): Promise<{ success: boolean; error?: string; softDeleted?: boolean }> {
  assertPermission('delete_template', deleterRole);
  const template = await db.print_templates.get(id);
  if (!template) {
    return { success: false, error: 'القالب غير موجود' };
  }
  if (template.isSystem) {
    return { success: false, error: 'لا يمكن حذف قوالب النظام' };
  }

  // BR-002: لا يمكن حذف القالب الافتراضي قبل تعيين قالب آخر افتراضي
  if (template.isDefault) {
    const allTemplates = await db.print_templates.toArray();
    const otherDefaults = allTemplates.filter(t => t.isDefault && t.id !== id).length;
    if (otherDefaults === 0) {
      return {
        success: false,
        error: 'لا يمكن حذف القالب الافتراضي — عيّن قالباً آخر كافتراضي أولاً',
      };
    }
  }

  // BR-PRINT-004: soft delete إذا كان له سجل طباعة
  const usageCount = await db.print_history.where('templateId').equals(id).count();
  if (usageCount > 0) {
    await db.print_templates.put({ ...template, isSystem: false });
    // إزالة التعيينات
    const assignments = await db.template_assignments.toArray();
    for (const a of assignments) {
      if (a.templateId === id) {
        await db.template_assignments.delete(a.docType);
      }
    }
    return { success: true, softDeleted: true };
  }

  // إلغاء تعيينه إن كان افتراضياً
  const assignments = await db.template_assignments.toArray();
  for (const a of assignments) {
    if (a.templateId === id) {
      await db.template_assignments.delete(a.docType);
    }
  }

  await db.print_templates.delete(id);
  return { success: true };
}

/**
 * تعيين قالب افتراضي
 * BR-PRINT-006: المدير فقط
 */
export async function setTemplateAsDefault(
  id: string,
  assignerRole: 'admin' | 'cashier' | 'seller' | 'accountant' = 'admin',
): Promise<void> {
  assertPermission('set_default_template', assignerRole);
  // إلغاء التعيين السابق + تعيين الجديد في عملية واحدة
  const all = await db.print_templates.toArray();
  const updated = all.map((t) => ({
    ...t,
    isDefault: t.id === id,
  }));
  await db.print_templates.bulkPut(updated as unknown as Parameters<typeof db.print_templates.bulkPut>[0]);
}

/**
 * نسخ قالب
 */
export async function duplicateTemplate(
  id: string,
  newName: string,
  createdBy: string,
): Promise<PrintTemplate | null> {
  const source = await db.print_templates.get(id);
  if (!source) return null;

  const now = new Date().toISOString();
  const copy: PrintTemplate = {
    ...source,
    id: uuidv4(),
    name: newName,
    description: `${source.description} (نسخة)`,
    isDefault: false,
    isSystem: false,
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
  await db.print_templates.add(copy);
  return copy;
}

// ====== Template Assignments ======

/**
 * الحصول على تعيين قالب لنوع وثيقة
 */
export async function getDocTypeAssignment(docType: DocTypeKey): Promise<TemplateAssignment | undefined> {
  return db.template_assignments.get(docType);
}

/**
 * تعيين قالب لنوع وثيقة
 * BR-PRINT-006: المدير فقط
 */
export async function assignTemplateToDocType(
  docType: DocTypeKey,
  templateId: string,
  assignerRole: 'admin' | 'cashier' | 'seller' | 'accountant' = 'admin',
): Promise<void> {
  assertPermission('assign_template', assignerRole);
  await db.template_assignments.put({ docType, templateId });
}

/**
 * الحصول على جميع التعيينات
 */
export async function getAllAssignments(): Promise<TemplateAssignment[]> {
  return db.template_assignments.toArray();
}

/**
 * الحصول على القالب المعرف لنوع وثيقة
 */
export { getTemplateForDocType } from './printService';

// ====== Template Builder Helpers ======

/**
 * إنشاء قالب فارغ مع تخطيط افتراضي
 */
export function createEmptyTemplate(
  name: string,
  description: string,
  paperSize: PaperSize,
  createdBy: string,
): Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'> {
  const now = new Date().toISOString();
  return {
    name,
    description,
    paperSize,
    orientation: 'portrait',
    widthMm: paperSize === '58mm' ? 58 : paperSize === '76mm' ? 76 : paperSize === '80mm' ? 80 : paperSize === 'A5' ? 148 : 210,
    heightMm: (paperSize === '58mm' || paperSize === '76mm' || paperSize === '80mm') ? undefined : paperSize === 'A5' ? 210 : 297,
    supportedDocuments: [],
    visibility: {
      logo: true,
      shopName: true,
      invoiceNumber: true,
      customerName: true,
      customerPhone: false,
      customerAddress: false,
      barcode: (paperSize === '58mm' || paperSize === '76mm' || paperSize === '80mm'),
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
    layout: { header: [], body: [], footer: [] },
    styles: {
      primaryColor: '#0891b2',
      headerColor: '#0e7490',
      footerColor: '#64748b',
      tableColor: '#e2e8f0',
      logoColor: '#0891b2',
      font: { family: 'Cairo', size: (paperSize === '58mm' ? 9 : paperSize === '76mm' ? 10 : paperSize === '80mm' ? 11 : 13), weight: 400 },
    },
    isDefault: false,
    isSystem: false,
    createdBy,
  };
}

/**
 * التحقق من صحة القالب (BR-PRINT-007, BR-PRINT-008, BR-PRINT-009)
 */
export function validateTemplate(template: PrintTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // BR-PRINT-007: يجب دعم اللغة العربية و RTL
  // (نفترض أن كل القوالب تدعم RTL افتراضياً)

  // BR-PRINT-009: قوالب A4 القانونية يجب أن تتضمن المعلومات الإلزامية
  if (template.paperSize === 'A4') {
    const allHeaderText = JSON.stringify(template.layout.header || []);
    if (!allHeaderText.includes('shopLegal.name')) {
      errors.push('قالب قانوني يجب أن يتضمن اسم المحل ({{shopLegal.name}}) في الترويسة');
    }
    // A4 يجب أن يتضمن على الأقل رقم الفاتورة
    const bodyText = JSON.stringify(template.layout.body || []);
    if (!bodyText.includes('invoice.number')) {
      errors.push('قالب قانوني يجب أن يتضمن رقم الفاتورة ({{invoice.number}})');
    }
  }

  // BR-PRINT-008: القالب الحراري لا يتجاوز عرضه المحدد
  const thermalSizes: PaperSize[] = ['58mm', '76mm', '80mm'];
  if (thermalSizes.includes(template.paperSize) && template.widthMm > (PAPER_SPECS[template.paperSize]?.widthMm ?? 80)) {
    errors.push(`القالب الحراري ${template.paperSize} يجب ألا يتجاوز عرض ${PAPER_SPECS[template.paperSize]?.widthMm ?? 80}mm`);
  }

  // التحقق من وجود اسم
  if (!template.name || template.name.trim().length === 0) {
    errors.push('يجب أن يكون للقالب اسم');
  }

  // التحقق من وجود supportedDocuments
  if (!template.supportedDocuments || template.supportedDocuments.length === 0) {
    errors.push('يجب أن يدعم القالب نوع وثيقة واحد على الأقل');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * تحديث إعدادات النمط
 */
export function updateTemplateStyles(
  template: PrintTemplate,
  styleUpdates: Partial<TemplateStyles>,
): PrintTemplate {
  return {
    ...template,
    styles: { ...template.styles, ...styleUpdates },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * تحديث إعدادات الرؤية
 */
export function updateTemplateVisibility(
  template: PrintTemplate,
  visibilityUpdates: Partial<VisibilityMap>,
): PrintTemplate {
  return {
    ...template,
    visibility: { ...template.visibility, ...visibilityUpdates },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * تصدير القالب كـ JSON
 */
export async function exportTemplateAsJson(id: string): Promise<string | null> {
  const template = await db.print_templates.get(id);
  if (!template) return null;
  return JSON.stringify(template, null, 2);
}

/**
 * استيراد قالب من JSON
 */
export async function importTemplateFromJson(
  json: string,
  createdBy: string,
): Promise<{ success: boolean; template?: PrintTemplate; error?: string }> {
  try {
    const data = JSON.parse(json) as PrintTemplate;
    // التحقق من صحة البيانات
    if (!data.name || !data.paperSize || !data.layout) {
      return { success: false, error: 'بيانات القالب غير صالحة' };
    }
    const now = new Date().toISOString();
    const template: PrintTemplate = {
      ...data,
      id: uuidv4(),
      isDefault: false,
      isSystem: false,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
    await db.print_templates.add(template);
    return { success: true, template };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export { TEMPLATE_PRESETS, type PresetDef } from './templatePresets';
import { TEMPLATE_PRESETS } from './templatePresets';

export function getPresetById(presetId: string) {
  return TEMPLATE_PRESETS.find((p) => p.id === presetId);
}

export async function createFromPreset(presetId: string, createdBy = 'user'): Promise<PrintTemplate | null> {
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
    createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await db.print_templates.put(newTpl as PrintTemplateEntity);
  return newTpl;
}

export async function importAllPresets(createdBy = 'user'): Promise<number> {
  const now = new Date().toISOString();
  let count = 0;

  for (const preset of TEMPLATE_PRESETS) {
    const existing = await db.print_templates.get(preset.id);
    if (!existing) {
      const buildData = preset.build();
      const newTpl: PrintTemplate = {
        ...buildData,
        id: preset.id,
        name: preset.nameAr || preset.name,
        description: preset.description,
        isDefault: false,
        isSystem: false,
        createdBy,
        createdAt: now,
        updatedAt: now,
      };
      await db.print_templates.put(newTpl as PrintTemplateEntity);
      count++;
    }
  }
  return count;
}