import * as XLSX from 'xlsx';
import type { Product, Supplier } from '@/types';
import { generateId } from '@/utils';
import {
  type ParsedSupplierInvoice,
  type ParsedInvoiceItem,
  type MatchedInvoiceItem,
  matchInvoiceItemsWithInventory,
} from './supplierInvoicePdfParser';

/**
 * أسماء الأعمدة الشائعة في ملفات إكسل فواتير الموردين (عربي / فرنسي / إنجليزي)
 */
const COLUMN_ALIASES = {
  name: [
    'التعريف', 'التسمية', 'البيان', 'المادة', 'الصنف', 'اسم المنتج', 'اسم السلعة',
    'designation', 'désignation', 'article', 'description', 'nom', 'produit', 'item', 'libelle'
  ],
  code: [
    'الرمز', 'الكود', 'المرجع', 'كود المادة', 'رقم الصنف',
    'code', 'ref', 'réf', 'reference', 'référence', 'sku'
  ],
  barcode: [
    'الباركود', 'باركود', 'ترقيم', 'رمز الباركود',
    'barcode', 'ean', 'ean13', 'upc', 'gencod'
  ],
  colisage: [
    'التعبئة', 'تعبئة', 'كوليزاج', 'قطع/طرد', 'قطع/كرتونة',
    'colisage', 'col/emb', 'pcs/colis', 'emb', 'conditionnement'
  ],
  colis: [
    'الطرود', 'الكراتين', 'عدد الطرود', 'عدد الكراتين',
    'colis', 'nbr colis', 'nb colis', 'qte colis', 'cartons'
  ],
  qty: [
    'الكمية', 'القطع', 'العدد', 'إجمالي القطع', 'الكمية المستلمة',
    'quantite', 'quantité', 'qte', 'qté', 'qty', 'pieces', 'pièces'
  ],
  unitPrice: [
    'سعر الوحدة', 'السعر', 'سعر الشراء', 'التكلفة', 'سعر التكلفة', 'السعر الفردي',
    'pu', 'p.u', 'prix', 'prix unitaire', 'pu ht', 'prix ht', 'unit price', 'cost', 'prix achat'
  ],
  lineTotal: [
    'المجموع', 'الإجمالي', 'المبلغ', 'الإجمالي الصافي', 'المبلغ الإجمالي',
    'montant', 'total', 'total ht', 'montant ht', 'total ttc', 'line total'
  ],
  retailPrice: [
    'سعر البيع', 'سعر التجزئة', 'سعر المستهلك',
    'prix vente', 'pv', 'p.v', 'retail price', 'prix public'
  ],
};

function normalizeHeader(h: string): string {
  if (!h) return '';
  return String(h)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآءئؤ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\w\s\u0600-\u06FF]/g, '')
    .trim();
}

function findMatchingKey(header: string, aliases: string[]): boolean {
  const norm = normalizeHeader(header);
  if (!norm) return false;
  const normAliases = aliases.map((a) => normalizeHeader(a)).filter(Boolean);
  if (normAliases.some((alias) => norm === alias)) return true;
  return normAliases.some((alias) => {
    if (alias.length < 3) return norm === alias;
    const regex = new RegExp(`(^|\\s|_|-)${alias}($|\\s|_|-)`, 'i');
    return regex.test(norm);
  });
}

export function parseExcelSupplierInvoiceData(
  sheetData: any[][],
  existingProducts: Product[] = [],
  suppliers: Supplier[] = [],
  defaultMarginPercent = 25
): {
  invoice: ParsedSupplierInvoice;
  matchedItems: MatchedInvoiceItem[];
  matchedSupplierId?: string;
} {
  if (!sheetData || sheetData.length === 0) {
    throw new Error('ملف الإكسل فارغ أو لا يحتوي على بيانات صالحة.');
  }

  // 1. البحث عن سطر الترويسة (Header Row)
  let headerRowIndex = -1;
  let colIndexes: Record<string, number> = {};

  for (let r = 0; r < Math.min(sheetData.length, 25); r++) {
    const row = sheetData[r];
    if (!Array.isArray(row)) continue;

    const rowStrings = row.map((cell) => normalizeHeader(String(cell || '')));
    let nameIdx = -1;
    let qtyIdx = -1;
    let priceIdx = -1;

    rowStrings.forEach((str, cIdx) => {
      if (str) {
        if (nameIdx === -1 && findMatchingKey(str, COLUMN_ALIASES.name)) nameIdx = cIdx;
        if (qtyIdx === -1 && findMatchingKey(str, COLUMN_ALIASES.qty)) qtyIdx = cIdx;
        if (priceIdx === -1 && findMatchingKey(str, COLUMN_ALIASES.unitPrice)) priceIdx = cIdx;
      }
    });

    if (nameIdx !== -1 && (qtyIdx !== -1 || priceIdx !== -1)) {
      headerRowIndex = r;
      break;
    }
  }

  // إذا لم نجد الترويسة بالأسماء، نفترض أول سطر يحتوي على أكثر من 3 خلايا ممتلئة
  if (headerRowIndex === -1) {
    for (let r = 0; r < Math.min(sheetData.length, 10); r++) {
      if (sheetData[r]?.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length >= 3) {
        headerRowIndex = r;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('لم يتم التعرف على بنود السلع في ملف الإكسل. تأكد من وجود أعمدة الاسم والكمية والسعر.');
  }

  const headerRow = sheetData[headerRowIndex] || [];
  const usedIndices = new Set<number>();

  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (colIndexes[key] !== undefined) continue;
    headerRow.forEach((cell, idx) => {
      if (colIndexes[key] !== undefined || usedIndices.has(idx)) return;
      if (findMatchingKey(String(cell || ''), aliases)) {
        colIndexes[key] = idx;
        usedIndices.add(idx);
      }
    });
  }

  // تعيين بدائل افتراضية في حال عدم وضوح الأسماء
  if (colIndexes.name === undefined) colIndexes.name = 1; // العمود الثاني غالباً اسم السلعة
  if (colIndexes.qty === undefined) colIndexes.qty = 2; // العمود الثالث غالباً الكمية
  if (colIndexes.unitPrice === undefined) colIndexes.unitPrice = 3; // العمود الرابع غالباً السعر
  if (colIndexes.lineTotal === undefined) colIndexes.lineTotal = 4;

  const items: ParsedInvoiceItem[] = [];
  let supplierName: string | undefined;
  let invoiceNumber: string | undefined;
  let invoiceDate: string | undefined;

  // البحث عن بيانات الترويسة في الأسطر السابقة لجدول السلع
  for (let r = 0; r < headerRowIndex; r++) {
    const rowText = (sheetData[r] || []).map((c) => String(c || '').trim()).join(' ');
    if (!supplierName) {
      const suppMatch = rowText.match(/(?:fournisseur|supplier|المورد)\s*[:#\-]?\s*(.+)/i);
      if (suppMatch) supplierName = suppMatch[1].trim();
    }
    if (!invoiceNumber) {
      const invMatch = rowText.match(/(?:facture|invoice|فاتورة|وصل|bl)\s*(?:n[°o.]?|رقم)?\s*[:#\-]?\s*([A-Za-z0-9\-_/]{3,25})/i);
      if (invMatch) invoiceNumber = invMatch[1].trim();
    }
    if (!invoiceDate) {
      const dateMatch = rowText.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
      if (dateMatch) invoiceDate = dateMatch[1].replace(/\//g, '-');
    }
  }

  // قراءة أسطر البيانات
  for (let r = headerRowIndex + 1; r < sheetData.length; r++) {
    const row = sheetData[r];
    if (!row || row.length === 0) continue;

    const rawName = String(row[colIndexes.name] || '').trim();
    if (!rawName || rawName.length < 2) continue;

    // تجاهل أسطر الإجماليات
    if (/^(?:total|totaux|المجموع|الإجمالي|net\s*a\s*payer|الصافي)/i.test(rawName)) continue;

    let colisage = colIndexes.colisage !== undefined ? parseFloat(String(row[colIndexes.colisage] || '0').replace(',', '.')) : 0;
    let colis = colIndexes.colis !== undefined ? parseFloat(String(row[colIndexes.colis] || '0').replace(',', '.')) : 0;
    let rawQty = colIndexes.qty !== undefined ? parseFloat(String(row[colIndexes.qty] || '0').replace(',', '.')) : 0;
    let unitPrice = colIndexes.unitPrice !== undefined ? parseFloat(String(row[colIndexes.unitPrice] || '0').replace(',', '.')) : 0;
    let lineTotal = colIndexes.lineTotal !== undefined ? parseFloat(String(row[colIndexes.lineTotal] || '0').replace(',', '.')) : 0;

    // حساب الكمية الإجمالية إذا كان الملف مسجلاً بالكراتين والتعبئة
    let qty = rawQty;
    if (colis > 0 && colisage > 0) {
      if (qty === 0 || qty === colis) {
        qty = colis * colisage;
      }
    } else if (qty <= 0 && colis > 0) {
      qty = colis;
    }

    if (qty <= 0 || isNaN(qty)) qty = 1;
    if (isNaN(unitPrice) || unitPrice < 0) unitPrice = 0;

    if (lineTotal <= 0 && unitPrice > 0 && qty > 0) {
      lineTotal = Number((qty * unitPrice).toFixed(2));
    } else if (unitPrice <= 0 && lineTotal > 0 && qty > 0) {
      unitPrice = Number((lineTotal / qty).toFixed(2));
    }

    const code = colIndexes.code !== undefined ? String(row[colIndexes.code] || '').trim() || undefined : undefined;
    const barcode = colIndexes.barcode !== undefined ? String(row[colIndexes.barcode] || '').trim() || undefined : undefined;

    items.push({
      id: generateId(),
      name: rawName,
      code,
      barcode: barcode || (code && /^\d{8,14}$/.test(code) ? code : undefined),
      colisage: colisage > 0 ? colisage : undefined,
      colis: colis > 0 ? colis : undefined,
      qty,
      unitPrice: Number(unitPrice.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2)),
    });
  }

  if (items.length === 0) {
    throw new Error('لم يتم العثور على أسطر منتجات صالحة في ملف الإكسل.');
  }

  const calculatedTotal = items.reduce((sum, it) => sum + it.lineTotal, 0);

  const invoice: ParsedSupplierInvoice = {
    supplierName,
    invoiceNumber: invoiceNumber || `INV-XLS-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 900 + 100)}`,
    invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
    items,
    totalAmount: Number(calculatedTotal.toFixed(2)),
    subtotal: Number(calculatedTotal.toFixed(2)),
  };

  const { matchedItems, matchedSupplierId } = matchInvoiceItemsWithInventory(
    invoice.items,
    existingProducts,
    suppliers,
    invoice.supplierName,
    defaultMarginPercent
  );

  return {
    invoice,
    matchedItems,
    matchedSupplierId,
  };
}

/**
 * تحليل ملف إكسل من Buffer أو File
 */
export async function parseExcelSupplierInvoice(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  existingProducts: Product[] = [],
  suppliers: Supplier[] = [],
  defaultMarginPercent = 25
) {
  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof Uint8Array) {
    const copy = new Uint8Array(fileOrBuffer.byteLength);
    copy.set(fileOrBuffer);
    arrayBuffer = copy.buffer;
  } else {
    arrayBuffer = fileOrBuffer;
  }

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('ملف الإكسل لا يحتوي على صفحات عمل.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const sheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  return parseExcelSupplierInvoiceData(
    sheetData,
    existingProducts,
    suppliers,
    defaultMarginPercent
  );
}
