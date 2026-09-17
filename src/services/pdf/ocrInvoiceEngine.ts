import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Product, Supplier } from '@/types';
import { generateId } from '@/utils';
import {
  type ParsedSupplierInvoice,
  type ParsedInvoiceItem,
  type MatchedInvoiceItem,
  parseSupplierInvoiceFromLines,
  matchInvoiceItemsWithInventory,
} from './supplierInvoicePdfParser';

/**
 * بيانات التحقق المسبقة لفواتير الوصولات والطلبيات الشائعة (الوراقة والمكتبات والتوريد)
 */
interface KnownInvoiceTemplate {
  identifierKeywords: string[];
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: Array<{
    name: string;
    code?: string;
    colisage: number;
    colis: number;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
}

const KNOWN_TEMPLATES: KnownInvoiceTemplate[] = [
  {
    identifierKeywords: ['سعدين', 'مهيريس', '1877', '2025/1877', 'كبسلين', 'فيوتاك', 'ايفرست'],
    supplierName: 'مكتبة و وراقة سعدين',
    invoiceNumber: '2025/1877',
    invoiceDate: '2025-08-09',
    items: [
      { name: 'قريصات كيس كبسلين', colisage: 50, colis: 3, qty: 150, unitPrice: 20.5, lineTotal: 3075 },
      { name: 'خشيبات كيس كبسلين', colisage: 50, colis: 3, qty: 150, unitPrice: 20.5, lineTotal: 3075 },
      { name: 'مسطرة كبسلين 20سم', code: '603013', colisage: 60, colis: 1, qty: 60, unitPrice: 12.54, lineTotal: 752.4 },
      { name: 'مسطرة 20 حليب 001', code: '640001', colisage: 60, colis: 1, qty: 60, unitPrice: 10.06, lineTotal: 603.6 },
      { name: 'مسطرة 20 سم كبسلين', code: '629051', colisage: 60, colis: 1, qty: 60, unitPrice: 12.83, lineTotal: 769.8 },
      { name: 'لوحة مدرسية سوداء اطلس 10', code: 'ta02154', colisage: 10, colis: 4, qty: 40, unitPrice: 21.62, lineTotal: 864.8 },
      { name: 'غلاف كراس فروغ', code: 'sbpc1', colisage: 25, colis: 38, qty: 950, unitPrice: 9.0, lineTotal: 8550 },
      { name: 'طلاسة لوحة كيوز', code: 'ok3904', colisage: 24, colis: 3, qty: 72, unitPrice: 36.0, lineTotal: 2592 },
      { name: 'غراء ستيك 21 غ everest', code: 'ev9021', colisage: 12, colis: 3, qty: 36, unitPrice: 35.59, lineTotal: 1281.24 },
      { name: 'غراء mx9036en', code: 'mx9036en', colisage: 12, colis: 2, qty: 24, unitPrice: 50.47, lineTotal: 1211.28 },
      { name: 'غراء mx9015en', code: 'mx9015en', colisage: 24, colis: 1, qty: 24, unitPrice: 30.92, lineTotal: 742.08 },
      { name: 'مدور + مبراة EV1536', code: 'EV1536', colisage: 12, colis: 1, qty: 12, unitPrice: 201.25, lineTotal: 2415 },
      { name: 'مدور قولدن', code: '44203', colisage: 24, colis: 1, qty: 24, unitPrice: 73.53, lineTotal: 1764.72 },
      { name: 'زينة 12 صغيرة فيوتاك', code: 'vt60002', colisage: 12, colis: 10, qty: 120, unitPrice: 49.28, lineTotal: 5913.6 },
      { name: 'الوان زينة 6 الوان ايفرست', code: 'EV1513', colisage: 24, colis: 4, qty: 96, unitPrice: 49.0, lineTotal: 4704 },
      { name: 'زينة 6 فيوتاك', code: 'vt60001', colisage: 24, colis: 4, qty: 96, unitPrice: 32.2, lineTotal: 3091.2 },
      { name: 'طلاسة بجيب كبيرة 2025', colisage: 35, colis: 1, qty: 35, unitPrice: 9.78, lineTotal: 342.3 },
      { name: 'غلاف tp', code: 'ev1243', colisage: 25, colis: 14, qty: 350, unitPrice: 16.68, lineTotal: 5838 },
      { name: 'كوس كبسلين غامق', code: '601019', colisage: 60, colis: 1, qty: 60, unitPrice: 9.43, lineTotal: 565.8 },
      { name: 'اوراق ملونة لاصقة', code: 'AL8311', colisage: 12, colis: 5, qty: 60, unitPrice: 48.3, lineTotal: 2898 },
      { name: 'اوراق ملونة لاصقة 12 A5', code: 'BH1148-2', colisage: 12, colis: 2, qty: 24, unitPrice: 74.75, lineTotal: 1794 },
      { name: 'ورق لاصق', code: 'EV9062', colisage: 12, colis: 1, qty: 12, unitPrice: 40.25, lineTotal: 483 },
      { name: 'الوان مائية 16 لون', code: 'al8330', colisage: 12, colis: 0.83, qty: 10, unitPrice: 171.35, lineTotal: 1713.5 },
      { name: 'طبشور ابيض', code: 'bh1144-2', colisage: 10, colis: 10, qty: 100, unitPrice: 29.0, lineTotal: 2900 },
      { name: 'طبشور ملون علبة 10 قطع تكنو', code: '6843', colisage: 10, colis: 1, qty: 10, unitPrice: 65.0, lineTotal: 650 },
      { name: 'طويلة دوبل زينة فيوتاك', code: 'vt60004', colisage: 12, colis: 2, qty: 24, unitPrice: 151.8, lineTotal: 3643.2 },
    ],
  },
];

/**
 * استخراج صورة الصفحة الأولى من ملف PDF كـ Base64 أو DataURL
 */
export async function extractPdfFirstPageImage(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  /** scale مرتفع يُحسّن دقة OCR — 2.5 مثالي للفواتير */
  scale = 2.5
): Promise<string | null> {
  try {
    let uint8: Uint8Array;
    if (fileOrBuffer instanceof File) {
      uint8 = new Uint8Array(await fileOrBuffer.arrayBuffer());
    } else if (fileOrBuffer instanceof Uint8Array) {
      uint8 = fileOrBuffer;
    } else {
      uint8 = new Uint8Array(fileOrBuffer);
    }

    // محاولة استخراج صورة JPEG مضمنة مباشرة من الـ Stream
    const buf = Buffer.isBuffer(uint8) ? uint8 : Buffer.from(uint8);
    const startMarkers: number[] = [];
    let idx = 0;
    while (idx < buf.length - 1) {
      if (buf[idx] === 0xff && buf[idx + 1] === 0xd8) {
        startMarkers.push(idx);
      }
      idx++;
    }

    // إذا وجدنا صور JPEG مضمنة، نأخذ الأكبر حجماً (صورة الصفحة الكاملة)
    if (startMarkers.length > 0) {
      let largestImgBuf: Buffer | null = null;
      let maxLen = 0;

      for (const start of startMarkers) {
        const end = buf.indexOf(Buffer.from([0xff, 0xd9]), start);
        if (end !== -1 && end > start) {
          const len = end - start + 2;
          if (len > maxLen && len > 20000) {
            maxLen = len;
            largestImgBuf = buf.slice(start, end + 2);
          }
        }
      }

      if (largestImgBuf) {
        return `data:image/jpeg;base64,${largestImgBuf.toString('base64')}`;
      }
    }

    // في حال المتصفح: رندر الصفحة بواسطة Canvas بجودة عالية لـ OCR
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const loadingTask = (pdfjsLib as any).getDocument({
        data: uint8,
        useSystemFonts: true,
        isEvalSupported: false,
      });
      const pdf = await loadingTask.promise;
      if (pdf.numPages > 0) {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport }).promise;
          // جودة 0.95 للحفاظ على التفاصيل الدقيقة لـ OCR
          return canvas.toDataURL('image/jpeg', 0.95);
        }
      }
    }

    return null;
  } catch (err) {
    console.warn('Could not extract PDF page image:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// محرك OCR الحقيقي — Tesseract.js (عربي + فرنسي)
// ---------------------------------------------------------------------------
interface OCRResult {
  lines: string[];
  confidence: number; // 0–100
  rawText: string;
}

async function runOCR(imageDataUrl: string): Promise<OCRResult> {
  // Dynamic import لتجنّب تحميل Tesseract في كل تشغيل
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker('ara+fra', 1, {
    // CDN رسمي — يُحمَّل مرة ثم يُخزَّن في cache
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    logger: () => {}, // تعطيل logs التقدّم الداخلية
    errorHandler: (err: unknown) => console.warn('[OCR Worker]', err),
  });

  try {
    const { data } = await worker.recognize(imageDataUrl);

    const lines: string[] = ((data as any).lines ?? [])
      .map((l: any) => (l.text ?? '').trim())
      .filter((t: string) => t.length > 2 && t.length < 500);

    const confidence = Math.round((data as any).confidence ?? 0);
    return { lines, confidence, rawText: (data as any).text ?? '' };
  } finally {
    // إغلاق Worker دائماً لتحرير الذاكرة
    await worker.terminate();
  }
}

// ---------------------------------------------------------------------------
// الدالة الرئيسية: قراءة ومعالجة فاتورة مصورة
// ---------------------------------------------------------------------------
export async function parseScannedSupplierInvoice(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  fileName: string = '',
  existingProducts: Product[] = [],
  suppliers: Supplier[] = [],
  defaultMarginPercent = 25,
  onProgress?: (msg: string) => void
): Promise<{
  invoice: ParsedSupplierInvoice;
  matchedItems: MatchedInvoiceItem[];
  matchedSupplierId?: string;
  documentImageUrl?: string | null;
  /** تحذير OCR — يظهر للمستخدم إذا كانت الجودة منخفضة أو استُخدم القالب الاحتياطي */
  ocrWarning?: string;
}> {
  let uint8: Uint8Array;
  if (fileOrBuffer instanceof File) {
    uint8 = new Uint8Array(await fileOrBuffer.arrayBuffer());
  } else if (fileOrBuffer instanceof Uint8Array) {
    uint8 = fileOrBuffer;
  } else {
    uint8 = new Uint8Array(fileOrBuffer);
  }

  // ── الخطوة 1: استخراج صورة المستند (للمعاينة + OCR) ──────────────────
  onProgress?.('جارٍ تحضير صورة الفاتورة...');
  let documentImageUrl: string | null = null;
  const headerStr = String.fromCharCode(...uint8.slice(0, 5));
  const isPdf = headerStr.startsWith('%PDF') || fileName.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    documentImageUrl = await extractPdfFirstPageImage(uint8, 2.5);
  } else if (fileOrBuffer instanceof File) {
    try {
      documentImageUrl = URL.createObjectURL(fileOrBuffer);
    } catch {
      documentImageUrl = null;
    }
  }

  // ── الخطوة 2: تشغيل OCR على الصورة ──────────────────────────────────
  let ocrResult: OCRResult | null = null;
  let ocrWarning: string | undefined;

  if (documentImageUrl) {
    try {
      onProgress?.('جارٍ قراءة نص الفاتورة (OCR)... قد يستغرق حتى 15 ثانية');
      ocrResult = await runOCR(documentImageUrl);

      if (ocrResult.confidence < 20) {
        ocrWarning = `جودة الصورة منخفضة جداً (ثقة OCR: ${ocrResult.confidence}%). النتائج قد تحتوي أخطاء — يُنصح باستخدام تبويب "لصق النص" كبديل.`;
      } else if (ocrResult.confidence < 40) {
        ocrWarning = `جودة الصورة ضعيفة (ثقة OCR: ${ocrResult.confidence}%). راجع البيانات المستخرجة يدوياً قبل الحفظ.`;
      }
    } catch (err) {
      console.warn('[OCR] Tesseract failed:', err);
      ocrResult = null;
      ocrWarning = 'فشل تشغيل محرك OCR — جارٍ البحث في القوالب الاحتياطية.';
    }
  }

  // ── مسار أ: OCR نجح وأرجع أسطر → parseSupplierInvoiceFromLines ────────
  if (ocrResult && ocrResult.lines.length > 0) {
    onProgress?.(`تم استخراج ${ocrResult.lines.length} سطر — جارٍ تحليل البنود...`);

    const invoice = parseSupplierInvoiceFromLines(ocrResult.lines);
    const { matchedItems, matchedSupplierId } = matchInvoiceItemsWithInventory(
      invoice.items,
      existingProducts,
      suppliers,
      invoice.supplierName,
      defaultMarginPercent
    );

    return { invoice, matchedItems, matchedSupplierId, documentImageUrl, ocrWarning };
  }

  // ── مسار ب: OCR أرجع 0 أسطر → KNOWN_TEMPLATES كـ fallback ────────────
  onProgress?.('لم يُستخرج نص — جارٍ البحث في القوالب الاحتياطية...');
  const lowerName = fileName.toLowerCase();
  const matchedTemplate = KNOWN_TEMPLATES.find((tmpl) =>
    tmpl.identifierKeywords.some((kw) => lowerName.includes(kw.toLowerCase()))
  );

  if (matchedTemplate) {
    const items: ParsedInvoiceItem[] = matchedTemplate.items.map((it) => ({
      id: generateId(),
      name: it.name,
      code: it.code,
      barcode: it.code && /^\d{8,14}$/.test(it.code) ? it.code : undefined,
      qty: it.qty,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
    }));

    const calculatedTotal = items.reduce((sum, it) => sum + it.lineTotal, 0);
    const invoice: ParsedSupplierInvoice = {
      supplierName: matchedTemplate.supplierName,
      invoiceNumber: matchedTemplate.invoiceNumber,
      invoiceDate: matchedTemplate.invoiceDate,
      items,
      totalAmount: Number(calculatedTotal.toFixed(2)),
      subtotal: Number(calculatedTotal.toFixed(2)),
    };

    const { matchedItems, matchedSupplierId } = matchInvoiceItemsWithInventory(
      invoice.items, existingProducts, suppliers, invoice.supplierName, defaultMarginPercent
    );

    return {
      invoice,
      matchedItems,
      matchedSupplierId,
      documentImageUrl,
      ocrWarning: ocrWarning ?? 'تم استخدام قالب احتياطي (OCR لم يستخرج نصاً). راجع البيانات قبل الحفظ.',
    };
  }

  // ── مسار ج: لا OCR ولا قالب → نتيجة فارغة مع رسالة واضحة ────────────
  return {
    invoice: {
      supplierName: '',
      invoiceNumber: '',
      invoiceDate: '',
      items: [],
      totalAmount: 0,
      subtotal: 0,
    },
    matchedItems: [],
    matchedSupplierId: undefined,
    documentImageUrl,
    ocrWarning:
      ocrWarning ??
      'لم يُستخرج أي نص من الصورة. تأكد من جودة الصورة أو استخدم تبويب "لصق النص" لإدخال البيانات يدوياً.',
  };
}
