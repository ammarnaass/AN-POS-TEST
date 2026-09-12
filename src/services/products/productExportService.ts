import * as XLSX from 'xlsx';
import type { Product, Category } from '@/types';

export type ProductExportFormat = 'xlsx' | 'csv';
export type ProductExportTemplate = 'inventory_audit' | 'comprehensive';

export interface ProductExportOptions {
  format?: ProductExportFormat;
  template?: ProductExportTemplate;
  includeSummaryRow?: boolean;
  filename?: string;
  categories?: Category[];
}

/**
 * دالة مساعدة لحل اسم التصنيف بدقة من المعرف أو الكائن
 */
export function resolveCategoryName(
  product: Product,
  categories?: Category[]
): string {
  if (typeof product.category === 'object' && product.category !== null) {
    return (product.category as any).name || '';
  }

  if (product.categoryId && categories && categories.length > 0) {
    const found = categories.find((c) => c.id === product.categoryId);
    if (found?.name) return found.name;
  }

  if (typeof product.category === 'string' && product.category.trim()) {
    return product.category.trim();
  }

  return 'عام';
}

/**
 * بناء مصفوفة البيانات (AOA) لنموذج مراجعة الجرد والأسعار (الحقول الأساسية الـ 7)
 */
function buildInventoryAuditAOA(
  products: Product[],
  categories?: Category[],
  includeSummary = true
): { aoa: (string | number)[][]; colWidths: { wch: number }[] } {
  const headers = [
    'اسم المنتج',
    'الباركود',
    'التصنيف',
    'سعر التكلفة (دج)',
    'سعر الجملة (دج)',
    'سعر التجزئة (دج)',
    'الكمية الحالية',
  ];

  let totalQty = 0;
  let totalCostVal = 0;
  let totalRetailVal = 0;

  const rows: (string | number)[][] = products.map((p) => {
    const name = p.name || '';
    const barcode = p.barcode ? String(p.barcode) : '';
    const category = resolveCategoryName(p, categories);
    const costPrice = Number(p.costPrice) || 0;
    const wholesalePrice = Number(p.wholesalePrice) || 0;
    const retailPrice = Number(p.retailPrice) || 0;
    const qty = Number(p.quantity) || 0;

    totalQty += qty;
    totalCostVal += costPrice * qty;
    totalRetailVal += retailPrice * qty;

    return [name, barcode, category, costPrice, wholesalePrice, retailPrice, qty];
  });

  if (includeSummary && products.length > 0) {
    // صف فاصل أو إجمالي احترافي
    rows.push([
      'الإجمالي الكلي لـ (' + products.length + ' منتج)',
      '',
      '',
      '',
      '',
      '',
      totalQty,
    ]);
  }

  const aoa = [headers, ...rows];

  // حساب عرض الأعمدة ديناميكياً لتجنب ظهور ### في إكسل
  const colWidths = headers.map((header, colIndex) => {
    let maxLen = header.length * 1.5;
    for (let r = 0; r < rows.length; r++) {
      const val = rows[r][colIndex];
      const strLen = val !== undefined && val !== null ? String(val).length : 0;
      if (strLen > maxLen) {
        maxLen = strLen;
      }
    }
    // وضع حدود منطقية للعرض
    if (colIndex === 0) return { wch: Math.min(Math.max(maxLen + 4, 25), 45) }; // الاسم
    if (colIndex === 1) return { wch: Math.min(Math.max(maxLen + 4, 18), 26) }; // الباركود
    if (colIndex === 2) return { wch: Math.min(Math.max(maxLen + 4, 16), 26) }; // التصنيف
    return { wch: Math.min(Math.max(maxLen + 4, 15), 22) }; // الأسعار والكمية
  });

  return { aoa, colWidths };
}

/**
 * بناء مصفوفة البيانات (AOA) للنموذج الشامل لكافة بيانات ومعلومات المنتج
 */
function buildComprehensiveAOA(
  products: Product[],
  categories?: Category[],
  includeSummary = true
): { aoa: (string | number)[][]; colWidths: { wch: number }[] } {
  const headers = [
    'اسم المنتج',
    'الباركود',
    'كود الصنف (SKU)',
    'التصنيف',
    'الوحدة',
    'سعر التكلفة (دج)',
    'سعر الجملة (دج)',
    'سعر التجزئة (دج)',
    'الكمية الحالية',
    'إجمالي التكلفة (دج)',
    'إجمالي البيع (دج)',
    'هامش الربح (%)',
    'حد التنبيه (المخزون)',
    'الحد الأدنى للجملة',
    'تاريخ الصلاحية',
    'رقم الدفعة',
    'المتغير / المقاس',
    'موقع التخزين / الرف',
    'الحالة',
    'تاريخ الإضافة',
  ];

  let totalQty = 0;
  let totalCostVal = 0;
  let totalRetailVal = 0;

  const rows: (string | number)[][] = products.map((p) => {
    const name = p.name || '';
    const barcode = p.barcode ? String(p.barcode) : '';
    const sku = p.sku ? String(p.sku) : '';
    const category = resolveCategoryName(p, categories);
    const unit = p.unit || 'قطعة';
    const costPrice = Number(p.costPrice) || 0;
    const wholesalePrice = Number(p.wholesalePrice) || 0;
    const retailPrice = Number(p.retailPrice) || 0;
    const qty = Number(p.quantity) || 0;

    const rowCostTotal = costPrice * qty;
    const rowRetailTotal = retailPrice * qty;
    const margin =
      costPrice > 0
        ? Number((((retailPrice - costPrice) / costPrice) * 100).toFixed(1))
        : 0;

    totalQty += qty;
    totalCostVal += rowCostTotal;
    totalRetailVal += rowRetailTotal;

    const lowStock = p.lowStockThreshold !== undefined ? Number(p.lowStockThreshold) : 0;
    const minWholesale = p.wholesaleMinQty !== undefined ? Number(p.wholesaleMinQty) : 0;
    const expiry = p.expiryDate ? String(p.expiryDate).slice(0, 10) : '';
    const batch = p.batchNumber ? String(p.batchNumber) : '';
    const variant = p.variant ? String(p.variant) : '';
    const location = p.location ? String(p.location) : '';
    const status = p.status === 'inactive' ? 'غير نشط' : 'نشط';
    const createdAt = p.createdAt ? String(p.createdAt).slice(0, 10) : '';

    return [
      name,
      barcode,
      sku,
      category,
      unit,
      costPrice,
      wholesalePrice,
      retailPrice,
      qty,
      Number(rowCostTotal.toFixed(2)),
      Number(rowRetailTotal.toFixed(2)),
      margin,
      lowStock,
      minWholesale,
      expiry,
      batch,
      variant,
      location,
      status,
      createdAt,
    ];
  });

  if (includeSummary && products.length > 0) {
    rows.push([
      'الإجمالي الكلي لـ (' + products.length + ' منتج)',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalQty,
      Number(totalCostVal.toFixed(2)),
      Number(totalRetailVal.toFixed(2)),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  }

  const aoa = [headers, ...rows];

  const colWidths = headers.map((header, colIndex) => {
    let maxLen = header.length * 1.5;
    for (let r = 0; r < rows.length; r++) {
      const val = rows[r][colIndex];
      const strLen = val !== undefined && val !== null ? String(val).length : 0;
      if (strLen > maxLen) {
        maxLen = strLen;
      }
    }
    if (colIndex === 0) return { wch: Math.min(Math.max(maxLen + 4, 25), 45) }; // الاسم
    if (colIndex === 1) return { wch: Math.min(Math.max(maxLen + 4, 18), 26) }; // الباركود
    if (colIndex === 2) return { wch: Math.min(Math.max(maxLen + 4, 14), 22) }; // SKU
    if (colIndex === 3) return { wch: Math.min(Math.max(maxLen + 4, 16), 26) }; // التصنيف
    return { wch: Math.min(Math.max(maxLen + 4, 14), 22) };
  });

  return { aoa, colWidths };
}

/**
 * إنشاء ورقة عمل SheetJS منسقة مع حماية الباركود وتوجيه اليمين لليسار
 */
function createFormattedWorksheet(
  aoa: (string | number)[][],
  colWidths: { wch: number }[],
  barcodeColIndex = 1
): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // 1. تعيين اتجاه الورقة RTL لتظهر من اليمين لليسار في Microsoft Excel
  ws['!views'] = [{ RTL: true }];

  // 2. ضبط عرض الأعمدة
  ws['!cols'] = colWidths;

  // 3. تأكيد نوع خلية الباركود كنص 's' لتجنب التحويل إلى ترميز علمي في Excel (6.281E+12)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let R = 1; R <= range.e.r; R++) {
    const barcodeCellAddress = XLSX.utils.encode_cell({ r: R, c: barcodeColIndex });
    const cell = ws[barcodeCellAddress];
    if (cell && cell.v !== undefined && cell.v !== '') {
      cell.t = 's'; // Force string type
      cell.v = String(cell.v);
      cell.z = '@'; // Explicit text format
    }
  }

  return ws;
}

/**
 * الدالة الرئيسية لتصدير قائمة المنتجات إلى Excel (.xlsx) أو CSV (.csv)
 */
export async function exportProductsToFile(
  products: Product[],
  options: ProductExportOptions = {}
): Promise<{ success: boolean; filename: string; count: number }> {
  if (!products || products.length === 0) {
    throw new Error('لا توجد منتجات لتصديرها');
  }

  const format = options.format || 'xlsx';
  const template = options.template || 'inventory_audit';
  const includeSummary = options.includeSummaryRow !== false;
  const categories = options.categories || [];

  const dateStr = new Date().toISOString().slice(0, 10);
  const templateSuffix =
    template === 'inventory_audit' ? 'جرد_مراجعة_الأسعار' : 'شامل_المنتجات';

  const defaultFilename =
    options.filename || `AN_POS_المنتجات_${templateSuffix}_${dateStr}.${format}`;

  // بناء مصفوفة البيانات حسب القالب
  const { aoa, colWidths } =
    template === 'inventory_audit'
      ? buildInventoryAuditAOA(products, categories, includeSummary)
      : buildComprehensiveAOA(products, categories, includeSummary);

  const barcodeColIndex = 1;
  const ws = createFormattedWorksheet(aoa, colWidths, barcodeColIndex);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const sheetTitle =
      template === 'inventory_audit' ? 'مراجعة الأسعار والجرد' : 'بيانات المنتجات الشاملة';
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    XLSX.writeFile(wb, defaultFilename);
  } else {
    // CSV Export مع رمز UTF-8 BOM (\uFEFF) لضمان توافق الحروف العربية 100% مع Excel
    const csvContent = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return {
    success: true,
    filename: defaultFilename,
    count: products.length,
  };
}
