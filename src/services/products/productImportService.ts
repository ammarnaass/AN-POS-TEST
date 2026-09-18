import * as XLSX from 'xlsx';
import type { Product, Category } from '@/types';
import { generateId } from '@/utils';
import { categoriesApi } from '@/services/api/categoriesApi';

export interface ProductImportSummary {
  filename: string;
  totalRows: number;
  validProducts: Product[];
  skippedRows: number;
  detectedCategories: string[];
  newCategories: string[];
  existingMatchCount: number;
  newProductsCount: number;
}

/**
 * تطبيع النصوص لمقارنة العناوين بدقة وتجاوز الفروقات البسيطة
 */
function normalizeHeaderKey(key: string): string {
  if (!key) return '';
  return key
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\(\)\[\]\{\}\/\\,\-_\.]/g, ' ') // إزالة الأقواس والشرطات
    .replace(/\s+/g, ' ') // توحيد المسافات
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * قاموس شامل للمطابقة الذكية للأعمدة
 */
const HEADER_DICTIONARY = {
  name: [
    'اسم المنتج',
    'الاسم',
    'اسم السلعة',
    'الصنف',
    'المنتج',
    'اسم الصنف',
    'اسم الماده',
    'name',
    'product name',
    'productname',
    'item name',
    'item',
    'title',
    'designation',
  ],
  barcode: [
    'الباركود',
    'باركود',
    'كود الباركود',
    'رقم الباركود',
    'رمز الباركود',
    'barcode',
    'code barre',
    'codebarre',
    'upc',
    'ean',
    'code',
  ],
  sku: [
    'كود الصنف',
    'كود الصنف sku',
    'رمز الصنف',
    'الرمز',
    'المعرف',
    'كود الماده',
    'رقم المرجع',
    'sku',
    'item code',
    'itemcode',
    'code article',
    'reference',
    'ref',
  ],
  category: [
    'التصنيف',
    'الفئة',
    'القسم',
    'عائلة المنتج',
    'المجموعة',
    'النوع',
    'category',
    'categorie',
    'group',
    'family',
    'department',
  ],
  unit: [
    'الوحدة',
    'نوع الوحدة',
    'وحدة القياس',
    'العبوة',
    'unit',
    'unite',
    'uom',
  ],
  costPrice: [
    'سعر التكلفة',
    'سعر التكلفة دج',
    'التكلفة',
    'سعر الشراء',
    'سعر الشراء دج',
    'تكلفة',
    'ثمن الشراء',
    'costprice',
    'cost price',
    'cost',
    'purchase price',
    'purchaseprice',
    'prix achat',
    'prix d achat',
  ],
  wholesalePrice: [
    'سعر الجملة',
    'سعر الجملة دج',
    'سعر نصف الجملة',
    'الجملة',
    'wholesaleprice',
    'wholesale price',
    'wholesale',
    'prix gros',
    'prix de gros',
  ],
  retailPrice: [
    'سعر التجزئة',
    'سعر التجزئة دج',
    'سعر البيع',
    'سعر البيع دج',
    'البيع',
    'التجزئة',
    'ثمن البيع',
    'retailprice',
    'retail price',
    'price',
    'sale price',
    'saleprice',
    'selling price',
    'prix vente',
    'prix de vente',
  ],
  quantity: [
    'الكمية الحالية',
    'الكمية',
    'الرصيد',
    'المخزون',
    'الكمية المتوفرة',
    'رصيد المخزون',
    'المتوفر',
    'المخزون الحالي',
    'quantity',
    'qty',
    'stock',
    'stock qty',
    'current stock',
    'quantite',
    'qte',
  ],
  lowStockThreshold: [
    'حد التنبيه',
    'حد التنبيه المخزون',
    'حد الطلب',
    'الحد الادنى للمخزون',
    'حد المخزون الادنى',
    'تنبيه النواقص',
    'lowstockthreshold',
    'low stock threshold',
    'min stock',
    'minstock',
    'alert threshold',
    'reorder point',
  ],
  wholesaleMinQty: [
    'الحد الادنى للجملة',
    'اقل كمية للجملة',
    'كمية الجملة الصغرى',
    'wholesaleminqty',
    'wholesale min qty',
    'min wholesale qty',
  ],
  expiryDate: [
    'تاريخ الصلاحية',
    'تاريخ انتهاء الصلاحية',
    'انتهاء الصلاحية',
    'الصلاحية',
    'expirydate',
    'expiry date',
    'expiration date',
    'date peremption',
    'exp date',
  ],
  batchNumber: [
    'رقم الدفعة',
    'الدفعة',
    'رقم الوجبة',
    'batchnumber',
    'batch number',
    'batch',
    'lot',
    'numero lot',
  ],
  variant: [
    'المتغير المقاس',
    'المقاس',
    'المتغير',
    'النوع المقاس',
    'الحجم',
    'اللون',
    'variant',
    'size',
    'taille',
    'variation',
  ],
  location: [
    'موقع التخزين الرف',
    'الموقع',
    'الرف',
    'مكان التخزين',
    'موقع التخزين',
    'مكان الرف',
    'location',
    'shelf',
    'storage location',
    'emplacement',
    'rayon',
  ],
  status: [
    'الحالة',
    'حالة المنتج',
    'status',
    'state',
    'etat',
  ],
  createdAt: [
    'تاريخ الاضافة',
    'تاريخ الانشاء',
    'تاريخ التسجيل',
    'createdat',
    'created at',
    'date creation',
  ],
  profitMargin: [
    'هامش الربح',
    'هامش الربح %',
    'نسبة الربح',
    'profit margin',
    'margin',
  ],
};

/**
 * تنظيف الأرقام من أي نصوص أو رموز عملات وتحويلها بأمان إلى Number
 */
export function cleanNumber(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;

  const str = String(val).trim();
  // إزالة رموز العملات مثل دج، DZD، €، $، الفواصل، والمسافات
  const cleaned = str
    .replace(/[دجDZD\$€£]/gi, '')
    .replace(/,/g, '')
    .trim();

  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

/**
 * تنظيف سلاسل الباركود لمنع الصيغ العلمية وحذف المسافات
 */
export function cleanBarcode(val: any): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'number') {
    // لمنع تحويل الأرقام الطويلة مثل 326112869412 إلى صيغ غير مرغوبة
    return BigInt(Math.floor(val)).toString();
  }
  return String(val).trim();
}

/**
 * تنظيف النصوص
 */
export function cleanString(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * كشف ما إذا كان الصف هو صف إجمالي تجميعي أو صف فارغ
 */
export function isSummaryOrEmptyRow(rowObj: Record<string, any>): boolean {
  const values = Object.values(rowObj).filter(
    (v) => v !== undefined && v !== null && String(v).trim() !== ''
  );
  if (values.length === 0) return true;

  // فحص أول 3 قيم نصية في الصف
  for (const val of values.slice(0, 3)) {
    const s = String(val).trim();
    if (
      s.startsWith('الإجمالي') ||
      s.startsWith('الاجمالي') ||
      s.startsWith('المجموع') ||
      s.toLowerCase().startsWith('total') ||
      s.toLowerCase().startsWith('summary')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * بناء خريطة الأعمدة من العناوين الفعلية إلى الحقول القياسية
 */
function buildColumnMapping(headers: string[]): Record<keyof typeof HEADER_DICTIONARY, string | null> {
  const mapping: any = {};

  for (const [field, aliases] of Object.entries(HEADER_DICTIONARY)) {
    let matchedHeader: string | null = null;

    // 1. بحث بمطابقة تامة بعد التطبيع
    for (const header of headers) {
      const normalizedHeader = normalizeHeaderKey(header);
      for (const alias of aliases) {
        const normalizedAlias = normalizeHeaderKey(alias);
        if (normalizedHeader === normalizedAlias) {
          matchedHeader = header;
          break;
        }
      }
      if (matchedHeader) break;
    }

    // 2. بحث جزئي إذا لم نجد مطابقة تامة
    if (!matchedHeader) {
      for (const header of headers) {
        const normalizedHeader = normalizeHeaderKey(header);
        for (const alias of aliases) {
          const normalizedAlias = normalizeHeaderKey(alias);
          if (
            normalizedHeader.includes(normalizedAlias) ||
            normalizedAlias.includes(normalizedHeader)
          ) {
            matchedHeader = header;
            break;
          }
        }
        if (matchedHeader) break;
      }
    }

    mapping[field] = matchedHeader;
  }

  return mapping;
}

/**
 * قراءة وتحليل بيانات المنتجات من مصنف Excel (WorkBook)
 */
export function parseProductsFromWorkbook(
  wb: XLSX.WorkBook,
  filename = 'imported-products.xlsx',
  existingProducts: Product[] = [],
  existingCategories: Category[] = []
): ProductImportSummary {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('الملف لا يحتوي على أي صفحات بيانات.');
  }

  const ws = wb.Sheets[sheetName];
  // قراءة الصفوف كمصفوفة من الكائنات
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
  if (rawRows.length === 0) {
    throw new Error('الصفحة الأولى فارغة ولا تحتوي على أي صفوف أو منتجات.');
  }

  // استخراج العناوين من أول صف
  const firstRow = rawRows[0];
  const headers = Object.keys(firstRow);
  const colMap = buildColumnMapping(headers);

  // إعداد مجموعات الفحص السريع
  const existingBarcodeSet = new Set(
    existingProducts.map((p) => String(p.barcode || '').trim()).filter(Boolean)
  );
  const existingCategoryNames = new Set(
    existingCategories.map((c) => c.name.trim().toLowerCase())
  );

  const validProducts: Product[] = [];
  let skippedRows = 0;
  let existingMatchCount = 0;
  const detectedCategoryNames = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    if (isSummaryOrEmptyRow(row)) {
      skippedRows++;
      continue;
    }

    // استخراج اسم المنتج
    const nameCol = colMap.name;
    const rawName = nameCol ? cleanString(row[nameCol]) : '';

    // إذا كان الاسم فارغاً أو يبدأ بالإجمالي
    if (!rawName || rawName.startsWith('الإجمالي') || rawName.startsWith('المجموع')) {
      skippedRows++;
      continue;
    }

    // استخراج الباركود وكود الصنف
    const barcodeCol = colMap.barcode;
    let barcode = barcodeCol ? cleanBarcode(row[barcodeCol]) : '';

    const skuCol = colMap.sku;
    const sku = skuCol ? cleanString(row[skuCol]) : '';

    // إذا لم يكن هناك باركود، نستخدم SKU كباركود أو نولد باركود بديل
    if (!barcode && sku) {
      barcode = sku;
    }

    // استخراج التصنيف
    const categoryCol = colMap.category;
    let category = categoryCol ? cleanString(row[categoryCol]) : '';
    if (!category) category = 'عام';
    detectedCategoryNames.add(category);

    // البحث عن categoryId إذا كان موجوداً مسبقاً
    const matchedCategory = existingCategories.find(
      (c) => c.name.trim().toLowerCase() === category.toLowerCase()
    );
    const categoryId = matchedCategory ? matchedCategory.id : null;

    // استخراج الوحدة والأسعار
    const unitCol = colMap.unit;
    const unit = unitCol && cleanString(row[unitCol]) ? cleanString(row[unitCol]) : 'قطعة';

    const costCol = colMap.costPrice;
    const costPrice = costCol ? cleanNumber(row[costCol], 0) : 0;

    const wholesaleCol = colMap.wholesalePrice;
    const wholesalePrice = wholesaleCol ? cleanNumber(row[wholesaleCol], 0) : 0;

    const retailCol = colMap.retailPrice;
    const retailPrice = retailCol ? cleanNumber(row[retailCol], 0) : 0;

    const qtyCol = colMap.quantity;
    const quantity = qtyCol ? cleanNumber(row[qtyCol], 0) : 0;

    const lowStockCol = colMap.lowStockThreshold;
    const lowStockThreshold = lowStockCol ? cleanNumber(row[lowStockCol], 5) : 5;

    const minWholesaleCol = colMap.wholesaleMinQty;
    const wholesaleMinQty = minWholesaleCol ? cleanNumber(row[minWholesaleCol], 1) : 1;

    // بيانات الحفظ والموقع والمتغيرات
    const expiryCol = colMap.expiryDate;
    const expiryDate = expiryCol ? cleanString(row[expiryCol]) : '';

    const batchCol = colMap.batchNumber;
    const batchNumber = batchCol ? cleanString(row[batchCol]) : '';

    const variantCol = colMap.variant;
    const variant = variantCol ? cleanString(row[variantCol]) : '';

    const locationCol = colMap.location;
    const location = locationCol ? cleanString(row[locationCol]) : '';

    // الحالة
    const statusCol = colMap.status;
    const rawStatus = statusCol ? cleanString(row[statusCol]).toLowerCase() : 'active';
    const status: 'active' | 'inactive' =
      rawStatus === 'غير نشط' ||
      rawStatus === 'معطل' ||
      rawStatus === 'inactive' ||
      rawStatus === '0' ||
      rawStatus === 'false'
        ? 'inactive'
        : 'active';

    // تاريخ الإضافة
    const createdCol = colMap.createdAt;
    const rawCreated = createdCol ? cleanString(row[createdCol]) : '';
    const nowIso = new Date().toISOString();
    const createdAt = rawCreated ? (rawCreated.length === 10 ? `${rawCreated}T12:00:00.000Z` : rawCreated) : nowIso;

    // حساب هامش الربح إذا لم يتوفر
    const margin =
      costPrice > 0
        ? Number((((retailPrice - costPrice) / costPrice) * 100).toFixed(1))
        : 0;

    // فحص ما إذا كان الباركود مسجلاً مسبقاً
    if (barcode && existingBarcodeSet.has(barcode)) {
      existingMatchCount++;
    }

    const product: Product = {
      id: generateId(),
      name: rawName,
      barcode,
      sku,
      category,
      categoryId,
      unit,
      costPrice,
      wholesalePrice,
      retailPrice,
      quantity,
      lowStockThreshold,
      wholesaleMinQty,
      profitMargin: margin,
      expiryDate,
      batchNumber,
      variant,
      location,
      status,
      stockable: true,
      highlighted: false,
      allowNegativeStock: false,
      createdAt,
      updatedAt: nowIso,
    };

    validProducts.push(product);
  }

  // التصنيفات الجديدة التي تحتاج إنشاء
  const newCategories = Array.from(detectedCategoryNames).filter(
    (name) => !existingCategoryNames.has(name.trim().toLowerCase()) && name.trim() !== ''
  );

  return {
    filename,
    totalRows: rawRows.length,
    validProducts,
    skippedRows,
    detectedCategories: Array.from(detectedCategoryNames),
    newCategories,
    existingMatchCount,
    newProductsCount: validProducts.length - existingMatchCount,
  };
}

/**
 * قراءة وتحليل ملف مستورد (File) عبر المتصفح
 */
export async function parseProductsFromFile(
  file: File,
  existingProducts: Product[] = [],
  existingCategories: Category[] = []
): Promise<ProductImportSummary> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  return parseProductsFromWorkbook(wb, file.name, existingProducts, existingCategories);
}

/**
 * مزامنة وإنشاء التصنيفات الجديدة تلقائياً وربطها بالمعرفات
 */
export async function syncMissingCategories(
  categoryNames: string[],
  existingCategories: Category[]
): Promise<{ updatedCategories: Category[]; createdCount: number }> {
  const existingMap = new Map<string, Category>();
  for (const cat of existingCategories) {
    existingMap.set(cat.name.trim().toLowerCase(), cat);
  }

  const allCategories = [...existingCategories];
  let createdCount = 0;

  for (const name of categoryNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();

    if (!existingMap.has(lower)) {
      try {
        const created = await categoriesApi.create({
          name: trimmed,
          description: 'تصنيف مستورد تلقائياً من ملف المنتجات',
          color: '#10B981',
          icon: 'FolderTree',
        });

        const newCat: Category = {
          id: created.id,
          name: trimmed,
          color: '#10B981',
          icon: 'FolderTree',
          description: 'تصنيف مستورد تلقائياً من ملف المنتجات',
          productCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        allCategories.push(newCat);
        existingMap.set(lower, newCat);
        createdCount++;
      } catch (err) {
        console.warn(`تعذر إنشاء التصنيف "${trimmed}" تلقائياً:`, err);
      }
    }
  }

  return { updatedCategories: allCategories, createdCount };
}

/**
 * دمج المنتجات المستوردة مع المنتجات الحالية وفق الوضع المختار (Upsert أو تخطي)
 */
export function mergeImportedProducts(
  existingProducts: Product[],
  importedProducts: Product[],
  mode: 'upsert' | 'skip_duplicates' = 'upsert',
  allCategories: Category[] = []
): {
  finalProducts: Product[];
  toSaveProducts: Product[];
  insertedCount: number;
  updatedCount: number;
} {
  const categoryMap = new Map<string, string>();
  for (const c of allCategories) {
    categoryMap.set(c.name.trim().toLowerCase(), c.id);
  }

  const existingBarcodeMap = new Map<string, Product>();
  for (const p of existingProducts) {
    if (p.barcode) {
      existingBarcodeMap.set(p.barcode.trim(), p);
    }
  }

  const toSaveProducts: Product[] = [];
  const updatedExistingMap = new Map<string, Product>();
  let insertedCount = 0;
  let updatedCount = 0;

  for (const imp of importedProducts) {
    const cleanBar = imp.barcode ? imp.barcode.trim() : '';
    const existing = cleanBar ? existingBarcodeMap.get(cleanBar) : undefined;

    // ربط categoryId الصحيح إذا توفر في التصنيفات
    const resolvedCatId =
      imp.category && categoryMap.has(imp.category.trim().toLowerCase())
        ? categoryMap.get(imp.category.trim().toLowerCase()) || null
        : imp.categoryId || null;

    if (existing) {
      if (mode === 'upsert') {
        // تحديث المنتج الحالي مع الحفاظ على معرفه وبياناته غير المذكورة
        const updated: Product = {
          ...existing,
          name: imp.name || existing.name,
          sku: imp.sku || existing.sku,
          category: imp.category || existing.category,
          categoryId: resolvedCatId ?? existing.categoryId,
          unit: imp.unit || existing.unit,
          costPrice: imp.costPrice,
          wholesalePrice: imp.wholesalePrice,
          retailPrice: imp.retailPrice,
          quantity: imp.quantity,
          lowStockThreshold: imp.lowStockThreshold,
          wholesaleMinQty: imp.wholesaleMinQty,
          profitMargin: imp.profitMargin || existing.profitMargin,
          expiryDate: imp.expiryDate || existing.expiryDate,
          batchNumber: imp.batchNumber || existing.batchNumber,
          variant: imp.variant || existing.variant,
          location: imp.location || existing.location,
          status: imp.status || existing.status,
          updatedAt: new Date().toISOString(),
        };

        updatedExistingMap.set(updated.id, updated);
        toSaveProducts.push(updated);
        updatedCount++;
      }
      // إذا كان mode === 'skip_duplicates'، لا نفعل شيئاً للمنتج الموجود مسبقاً
    } else {
      // منتج جديد تماماً
      const newProduct: Product = {
        ...imp,
        id: imp.id || generateId(),
        categoryId: resolvedCatId,
        updatedAt: new Date().toISOString(),
      };
      toSaveProducts.push(newProduct);
      insertedCount++;
    }
  }

  // بناء القائمة النهائية للمخزون
  const finalProducts: Product[] = [];

  for (const p of existingProducts) {
    if (updatedExistingMap.has(p.id)) {
      finalProducts.push(updatedExistingMap.get(p.id)!);
    } else {
      finalProducts.push(p);
    }
  }

  // إضافة المنتجات الجديدة بالكامل
  for (const p of toSaveProducts) {
    if (!existingBarcodeMap.has(p.barcode?.trim() || '')) {
      finalProducts.push(p);
    }
  }

  return {
    finalProducts,
    toSaveProducts,
    insertedCount,
    updatedCount,
  };
}
