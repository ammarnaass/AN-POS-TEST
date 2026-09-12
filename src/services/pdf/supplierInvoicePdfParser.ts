import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Product, Category, Supplier } from '@/types';
import { generateId } from '@/utils';

// إعداد worker في بيئة المتصفح الحقيقية فقط (تجنب jsdom أثناء الاختبارات في Node)
const isNodeEnv = typeof process !== 'undefined' && Boolean(process.versions?.node);
if (typeof window !== 'undefined' && !isNodeEnv) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch {
    // fallback if worker URL fails
  }
}

export interface ParsedInvoiceItem {
  id: string; // معرف مؤقت للسطر
  name: string;
  code?: string;
  barcode?: string;
  qty: number;
  unitPrice: number; // سعر التكلفة / الشراء
  lineTotal: number;
  tva?: number;
  rawText?: string;
}

export interface MatchedInvoiceItem extends ParsedInvoiceItem {
  matchedProductId?: string;
  matchedProduct?: Product;
  matchType: 'exact_barcode' | 'exact_name' | 'fuzzy_name' | 'new';
  confidence: number;
  isNewProduct: boolean;
  retailPrice: number;
  currentStockQuantity: number;
  newStockQuantity: number;
  category: string;
  unit: string;
}

export interface ParsedSupplierInvoice {
  supplierName?: string;
  matchedSupplierId?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  items: ParsedInvoiceItem[];
  totalAmount?: number;
  subtotal?: number;
  taxAmount?: number;
  rawText?: string;
}

/**
 * تنظيف وتوحيد النصوص العربية والفرنسية للمطابقة
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // إزالة التشكيل العربي والحركات
    .replace(/[أإآءئؤ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // إزالة الحركات اللاتينية
    .replace(/[\u0654\u0655]/g, '') // إزالة الهمزة التفكيكية إن وجدت
    .normalize('NFC')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ') // إزالة الرموز مع الاحتفاظ بالعربية
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * حساب نسبة التشابه بين سلسلتين نصيتين (Jaccard Similarity على الكلمات)
 */
export function calculateTextSimilarity(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  const wordsA = new Set(normA.split(' ').filter((w) => w.length > 1));
  const wordsB = new Set(normB.split(' ').filter((w) => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * استخراج الأسطر النصية مرتبة حسب الإحداثيات من ملف الـ PDF
 */
export async function extractTextLinesFromPdf(
  fileOrBuffer: File | ArrayBuffer | Uint8Array
): Promise<string[]> {
  let data: ArrayBuffer | Uint8Array;

  if (fileOrBuffer instanceof File) {
    data = await fileOrBuffer.arrayBuffer();
  } else {
    data = fileOrBuffer;
  }

  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    interface TextItemPos {
      text: string;
      x: number;
      y: number;
      height: number;
    }

    const items: TextItemPos[] = [];
    for (const item of content.items) {
      if ('str' in item && typeof item.str === 'string' && item.str.trim()) {
        const x = item.transform[4];
        const y = item.transform[5];
        const height = Math.abs(item.transform[3]) || 10;
        items.push({ text: item.str, x, y, height });
      }
    }

    // تجميع العناصر على نفس السطر بناءً على تقارب الإحداثي Y
    const yThreshold = 3.5;
    const linesGrouped: { y: number; items: TextItemPos[] }[] = [];

    for (const item of items) {
      let foundLine = linesGrouped.find((g) => Math.abs(g.y - item.y) <= yThreshold);
      if (foundLine) {
        foundLine.items.push(item);
      } else {
        linesGrouped.push({ y: item.y, items: [item] });
      }
    }

    // فرز الأسطر من الأعلى للأسفل (الإحداثي Y يتناقص نحو الأسفل في الـ PDF)
    linesGrouped.sort((a, b) => b.y - a.y);

    for (const group of linesGrouped) {
      // فرز الكلمات داخل السطر من اليسار إلى اليمين
      group.items.sort((a, b) => a.x - b.x);
      const lineText = group.items
        .map((it) => it.text.trim())
        .filter(Boolean)
        .join(' ')
        .trim();

      if (lineText) {
        allLines.push(lineText);
      }
    }
  }

  return allLines;
}

/**
 * تحليل وتفكيك سطر جدول الفاتورة لاستخراج الاسم والكمية وسعر الوحدة والإجمالي
 */
export function parseInvoiceLine(line: string): ParsedInvoiceItem | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 5) return null;

  // تجاهل أسطر الترويسات المعروفة
  const ignorePatterns = [
    /^(?:designation|d[ée]signation|article|ref|r[ée]f|code|qte|qt[ée]|quantit[ée]|p\.?u|prix|montant|total|tva|remise|تسمية|البيان|المادة|الصنف|الكمية|السعر|الوحدة|المجموع|الإجمالي|الضريبة)\b/i,
    /^(?:total\s*ttc|total\s*ht|net\s*[àa]\s*payer|tva\s*\d|solde|arr[êe]t[ée]|page\s*\d|rc\s*:|nif\s*:|nis\s*:|rib\s*:|banque)/i,
    /^(?:المجموع\s*العام|المبلغ\s*الصافي|الرصيد|رقم\s*التسجيل|الهاتف|العنوان)/i,
  ];

  for (const pattern of ignorePatterns) {
    if (pattern.test(trimmed)) return null;
  }

  // استخراج الأرقام من نهاية السطر (الكمية، سعر الوحدة، الإجمالي)
  // مثال: "عصير رامي 1لتر 24 120.00 2880.00" أو "EAU MINERALE 1.5L 12 35 420"
  // نبحث عن نمط: اسم المنتج متبوعاً بـ 2 إلى 4 أرقام
  const tokenMatches = trimmed.match(
    /(.+?)\s+([\d.,]+)\s+([\d.,]+)(?:\s+([\d.,]+))?(?:\s+([\d.,]+))?$/
  );

  if (!tokenMatches) return null;

  const rawNamePart = tokenMatches[1].trim();
  const rawNum1 = tokenMatches[2].replace(/\s/g, '').replace(',', '.');
  const rawNum2 = tokenMatches[3].replace(/\s/g, '').replace(',', '.');
  const rawNum3 = tokenMatches[4]?.replace(/\s/g, '').replace(',', '.');
  const rawNum4 = tokenMatches[5]?.replace(/\s/g, '').replace(',', '.');

  const n1 = parseFloat(rawNum1);
  const n2 = parseFloat(rawNum2);
  const n3 = rawNum3 ? parseFloat(rawNum3) : null;
  const n4 = rawNum4 ? parseFloat(rawNum4) : null;

  if (isNaN(n1) || isNaN(n2)) return null;

  let qty = 1;
  let unitPrice = 0;
  let lineTotal = 0;

  // تحديد ترتيب الأرقام (كمية، سعر، إجمالي) أو (كود، كمية، سعر، إجمالي)
  if (n4 !== null && n3 !== null) {
    // 4 أرقام: غالباً (كود/مرجع، كمية، سعر وحدة، إجمالي) أو (كمية، سعر، خصم، إجمالي)
    qty = n2;
    unitPrice = n3;
    lineTotal = n4;
  } else if (n3 !== null) {
    // 3 أرقام: النمط الأكثر شيوعاً (الكمية، سعر الوحدة، الإجمالي)
    // نحدد أيها الكمية بناءً على العملية الرياضية: هل n1 * n2 ≈ n3 ؟
    const calc1 = Math.abs(n1 * n2 - n3);
    const calc2 = Math.abs(n2 * n3 - n1);

    if (calc1 <= Math.max(n3 * 0.05, 1)) {
      qty = n1;
      unitPrice = n2;
      lineTotal = n3;
    } else if (calc2 <= Math.max(n1 * 0.05, 1)) {
      qty = n2;
      unitPrice = n3;
      lineTotal = n1;
    } else {
      // افتراض أولي: كمية ثم سعر ثم إجمالي
      qty = n1;
      unitPrice = n2;
      lineTotal = n3;
    }
  } else {
    // رقمان: كمية وسعر وحدة
    qty = n1;
    unitPrice = n2;
    lineTotal = Number((qty * unitPrice).toFixed(2));
  }

  // إذا كانت الكمية سالبة أو صفر أو السعر غير منطقي
  if (qty <= 0 || unitPrice <= 0) return null;

  // فحص إذا كان اسم السلعة يحتوي على كود أو باركود في بدايته
  let code: string | undefined = undefined;
  let cleanedName = rawNamePart;

  const codeMatch = rawNamePart.match(/^([A-Za-z0-9\-_]{3,15})\s+(.+)$/);
  if (codeMatch && /^\d+$/.test(codeMatch[1]) && codeMatch[1].length >= 8) {
    // يبدو كباركود EAN
    code = codeMatch[1];
    cleanedName = codeMatch[2];
  } else if (codeMatch && codeMatch[1].length <= 12) {
    code = codeMatch[1];
    cleanedName = codeMatch[2];
  }

  // تنظيف الاسم من الأرقام المنفصلة أو الرموز في النهاية
  cleanedName = cleanedName.replace(/\s+-\s*$/, '').trim();

  // الاسم يجب أن يحتوي على حروف وليس فقط أرقام
  if (!/[a-zA-Z\u0600-\u06FF]/.test(cleanedName)) return null;

  return {
    id: generateId(),
    name: cleanedName,
    code,
    barcode: code && /^\d{8,14}$/.test(code) ? code : undefined,
    qty,
    unitPrice: Number(unitPrice.toFixed(2)),
    lineTotal: Number(lineTotal.toFixed(2)),
    rawText: line,
  };
}

/**
 * تحليل شامل لمصفوفة أسطر الفاتورة واستخراج الرأس والبنود
 */
export function parseSupplierInvoiceFromLines(lines: string[]): ParsedSupplierInvoice {
  let supplierName: string | undefined;
  let invoiceNumber: string | undefined;
  let invoiceDate: string | undefined;
  let totalAmount: number | undefined;
  let subtotal: number | undefined;

  const items: ParsedInvoiceItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. استخراج رقم الفاتورة
    if (!invoiceNumber) {
      const invMatch = line.match(
        /(?:facture|invoice|فاتورة|وصل|bl|bon\s*de\s*livraison)\s*(?:n[°o.]?|num[ée]ro|رقم)?\s*[:#\-]?\s*([A-Za-z0-9\-_/]{3,25})/i
      );
      if (invMatch) {
        invoiceNumber = invMatch[1].trim();
      }
    }

    // 2. استخراج التاريخ
    if (!invoiceDate) {
      const dateMatch = line.match(
        /(?:date|تاريخ|le)\s*[:#\-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
      ) || line.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/);

      if (dateMatch) {
        invoiceDate = dateMatch[1].replace(/\//g, '-');
      }
    }

    // 3. استخراج اسم المورد من الترويسة
    if (!supplierName && i < 12) {
      const explicitSuppMatch = line.match(
        /(?:fournisseur|supplier|المورد)\s*[:#\-]?\s*(.+)/i
      );
      if (explicitSuppMatch && explicitSuppMatch[1].trim().length > 2) {
        supplierName = explicitSuppMatch[1].trim();
      } else if (
        /\b(?:sarl|eurl|spa|snc|ets|st[ée]|comptoir|distribution|import|export|شركة)\b/i.test(line) &&
        line.length < 80 &&
        !/(?:client|facture|invoice|date|total|page)/i.test(line)
      ) {
        supplierName = line.trim();
      }
    }

    // 4. استخراج الإجمالي الكلي
    const totalMatch = line.match(
      /(?:total\s*ttc|net\s*[àa]\s*payer|المجموع\s*الإجمالي|المبلغ\s*الإجمالي|الصافي\s*للدفع)\s*[:#\-]?\s*([\d\s,.]+)/i
    );
    if (totalMatch) {
      const rawVal = totalMatch[1].replace(/\s/g, '').replace(',', '.');
      const val = parseFloat(rawVal);
      if (!isNaN(val) && val > 0) {
        totalAmount = Number(val.toFixed(2));
      }
    }

    // 5. تحليل بنود وسلع الفاتورة
    const parsedItem = parseInvoiceLine(line);
    if (parsedItem) {
      items.push(parsedItem);
    }
  }

  // إذا لم نجد رقم فاتورة، نولد معرّف مقترح
  if (!invoiceNumber) {
    const d = invoiceDate ? invoiceDate.replace(/[^\d]/g, '') : new Date().toISOString().slice(0, 10);
    invoiceNumber = `INV-${d}-${Math.floor(Math.random() * 900 + 100)}`;
  }

  // إذا لم نجد التاريخ نستخدم اليوم
  if (!invoiceDate) {
    invoiceDate = new Date().toISOString().slice(0, 10);
  }

  // حساب الإجمالي من مجموع السطور إذا لم يُستخرج بدقة
  const calculatedTotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
  if (!totalAmount || Math.abs(totalAmount - calculatedTotal) > calculatedTotal * 0.2) {
    totalAmount = Number(calculatedTotal.toFixed(2));
  }

  return {
    supplierName,
    invoiceNumber,
    invoiceDate,
    items,
    totalAmount,
    subtotal: totalAmount,
    rawText: lines.join('\n'),
  };
}

/**
 * محرك مطابقة بنود الفاتورة مع منتجات المخزون الحالي
 */
export function matchInvoiceItemsWithInventory(
  parsedItems: ParsedInvoiceItem[],
  existingProducts: Product[],
  suppliers: Supplier[] = [],
  supplierName?: string,
  defaultMarginPercent = 25
): {
  matchedItems: MatchedInvoiceItem[];
  matchedSupplierId?: string;
} {
  // 1. مطابقة المورد
  let matchedSupplierId: string | undefined = undefined;
  if (supplierName && suppliers.length > 0) {
    const foundSupplier = suppliers.find(
      (s) => calculateTextSimilarity(s.name, supplierName) >= 0.6
    );
    if (foundSupplier) {
      matchedSupplierId = foundSupplier.id;
    }
  }

  // 2. مطابقة المنتجات
  const matchedItems: MatchedInvoiceItem[] = parsedItems.map((item) => {
    let matchedProduct: Product | undefined = undefined;
    let matchType: 'exact_barcode' | 'exact_name' | 'fuzzy_name' | 'new' = 'new';
    let confidence = 0;

    // أ. المطابقة بالباركود أولاً (أعلى دقة 100%)
    if (item.barcode || item.code) {
      const searchCode = (item.barcode || item.code || '').trim().toLowerCase();
      matchedProduct = existingProducts.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === searchCode) ||
          (p.sku && p.sku.toLowerCase() === searchCode)
      );
      if (matchedProduct) {
        matchType = 'exact_barcode';
        confidence = 1.0;
      }
    }

    // ب. المطابقة بالاسم التام
    if (!matchedProduct) {
      const normItemName = normalizeText(item.name);
      matchedProduct = existingProducts.find(
        (p) => normalizeText(p.name) === normItemName
      );
      if (matchedProduct) {
        matchType = 'exact_name';
        confidence = 0.95;
      }
    }

    // ج. المطابقة التقريبية بالاسم (Fuzzy Match)
    if (!matchedProduct) {
      let bestScore = 0;
      let bestProd: Product | undefined = undefined;

      for (const p of existingProducts) {
        const score = calculateTextSimilarity(item.name, p.name);
        if (score > bestScore && score >= 0.65) {
          bestScore = score;
          bestProd = p;
        }
      }

      if (bestProd) {
        matchedProduct = bestProd;
        matchType = 'fuzzy_name';
        confidence = Number(bestScore.toFixed(2));
      }
    }

    const isNew = !matchedProduct;
    const currentStock = matchedProduct ? Number(matchedProduct.quantity) || 0 : 0;
    const newStock = currentStock + item.qty;

    // تحديد سعر البيع: إذا كان المنتج موجوداً نأخذ سعر البيع الحالي، أو نحسبه بالهامش
    let retailPrice = 0;
    if (matchedProduct && matchedProduct.retailPrice > 0) {
      retailPrice = Number(matchedProduct.retailPrice);
    } else {
      retailPrice = Math.round(item.unitPrice * (1 + defaultMarginPercent / 100));
    }

    const category = matchedProduct
      ? typeof matchedProduct.category === 'object' && matchedProduct.category !== null
        ? (matchedProduct.category as any).name
        : String(matchedProduct.category || 'عام')
      : 'عام';

    const unit = matchedProduct?.unit || 'قطعة';

    return {
      ...item,
      matchedProductId: matchedProduct?.id,
      matchedProduct,
      matchType,
      confidence,
      isNewProduct: isNew,
      retailPrice,
      currentStockQuantity: currentStock,
      newStockQuantity: newStock,
      category,
      unit,
    };
  });

  return {
    matchedItems,
    matchedSupplierId,
  };
}

/**
 * الدالة الرئيسية: قراءة ملف PDF وتفكيكه ومطابقته مع المخزون في خطوة واحدة
 */
export async function parsePdfSupplierInvoice(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  existingProducts: Product[] = [],
  suppliers: Supplier[] = [],
  defaultMarginPercent = 25
): Promise<{
  invoice: ParsedSupplierInvoice;
  matchedItems: MatchedInvoiceItem[];
  matchedSupplierId?: string;
}> {
  const lines = await extractTextLinesFromPdf(fileOrBuffer);
  const invoice = parseSupplierInvoiceFromLines(lines);

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
 * تحليل نص حر للفاتورة (في حال لصق النص يدوياً)
 */
export function parseTextSupplierInvoice(
  text: string,
  existingProducts: Product[] = [],
  suppliers: Supplier[] = [],
  defaultMarginPercent = 25
): {
  invoice: ParsedSupplierInvoice;
  matchedItems: MatchedInvoiceItem[];
  matchedSupplierId?: string;
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const invoice = parseSupplierInvoiceFromLines(lines);

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
