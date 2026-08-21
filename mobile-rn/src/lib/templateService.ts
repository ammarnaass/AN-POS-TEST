// Print Template Service — Mobile
// CRUD operations for templates + assignments
import { db, ensureInit } from './db';
import type {
  PrintTemplate,
  TemplateAssignment,
  DocTypeKey,
  TemplateStyles,
  VisibilityMap,
  PaperSize,
} from '../../../shared/types/invoicePrint';
import { paperSpec } from '../../../shared/services/paperSizes';

// ===== Templates =====

export async function getAllTemplates(): Promise<PrintTemplate[]> {
  await ensureInit();
  const res = await db.printTemplates.toArray();
  return res;
}

export async function getTemplateById(id: string): Promise<PrintTemplate | undefined> {
  await ensureInit();
  return db.printTemplates.get(id) as Promise<PrintTemplate | undefined>;
}

export async function getDefaultTemplate(): Promise<PrintTemplate | undefined> {
  await ensureInit();
  const all = await db.printTemplates.toArray();
  return all.find((t: any) => t.isDefault) as PrintTemplate | undefined;
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
  if (!existing) throw new Error('Template not found');
  await db.printTemplates.put({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTemplate(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await ensureInit();
  const template = await db.printTemplates.get(id) as PrintTemplate | undefined;
  if (!template) return { success: false, error: 'Template not found' };
  if (template.isSystem) return { success: false, error: 'Cannot delete system templates' };

  if (template.isDefault) {
    const all = await db.printTemplates.toArray();
    const otherDefaults = all.filter((t: any) => t.isDefault && t.id !== id);
    if (otherDefaults.length === 0) {
      return { success: false, error: 'Cannot delete the only default template' };
    }
  }

  // Remove assignments
  const assignments = await db.templateAssignments.toArray();
  for (const a of assignments) {
    if ((a as any).templateId === id) {
      await db.templateAssignments.delete((a as any).docType);
    }
  }

  await db.printTemplates.delete(id);
  return { success: true };
}

export async function setTemplateAsDefault(id: string): Promise<void> {
  await ensureInit();
  const all = await db.printTemplates.toArray();
  for (const t of all) {
    await db.printTemplates.put({
      ...t,
      isDefault: (t as any).id === id,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function duplicateTemplate(
  id: string,
  newName: string,
): Promise<PrintTemplate | null> {
  await ensureInit();
  const source = await db.printTemplates.get(id) as PrintTemplate | undefined;
  if (!source) return null;

  const now = new Date().toISOString();
  const copy: PrintTemplate = {
    ...source,
    id: 'tpl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    name: newName,
    description: `${source.description} (copy)`,
    isDefault: false,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.printTemplates.add(copy);
  return copy;
}

// ===== Assignments =====

export async function getAllAssignments(): Promise<TemplateAssignment[]> {
  await ensureInit();
  return db.templateAssignments.toArray() as Promise<TemplateAssignment[]>;
}

export async function getDocTypeAssignment(docType: DocTypeKey): Promise<TemplateAssignment | undefined> {
  await ensureInit();
  return db.templateAssignments.get(docType) as Promise<TemplateAssignment | undefined>;
}

export async function assignTemplateToDocType(
  docType: DocTypeKey,
  templateId: string,
): Promise<void> {
  await ensureInit();
  await db.templateAssignments.put({ docType, templateId });
}

// ===== Template Builder Helper =====

export function createEmptyTemplateData(
  name: string,
  description: string,
  paperSize: PaperSize,
): Omit<PrintTemplate, 'id' | 'createdAt' | 'updatedAt'> {
  const spec = paperSpec(paperSize);
  return {
    name,
    description,
    paperSize,
    orientation: 'portrait',
    widthMm: spec.widthMm,
    heightMm: spec.heightMm,
    supportedDocuments: [],
    visibility: {
      logo: true,
      shopName: true,
      invoiceNumber: true,
      customerName: true,
      customerPhone: false,
      customerAddress: false,
      barcode: paperSize === '58mm' || paperSize === '76mm' || paperSize === '80mm',
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
      font: {
        family: 'Cairo',
        size: paperSize === '58mm' ? 9 : paperSize === '76mm' ? 10 : paperSize === '80mm' ? 11 : 13,
        weight: 400,
      },
    },
    isDefault: false,
    isSystem: false,
    createdBy: 'mobile-user',
  };
}

// ===== Print History =====

export async function recordPrint(
  invoiceId: string,
  docTypeKey: DocTypeKey,
  templateId: string,
  printedBy: string,
  copies: number = 1,
): Promise<void> {
  await ensureInit();
  await db.printHistory.add({
    id: 'prh-' + Date.now(),
    invoiceId,
    invoiceType: 'sale',
    docTypeKey,
    templateId,
    printedBy,
    printedAt: new Date().toISOString(),
    copies,
    isReprint: false,
  });
}

export async function getPrintHistory(invoiceId: string): Promise<any[]> {
  await ensureInit();
  const all = await db.printHistory.toArray();
  return all.filter((r: any) => r.invoiceId === invoiceId);
}
