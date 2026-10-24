import ExcelJS from 'exceljs';

/**
 * أسماء الحقول الممنوعة لحماية كائنات JavaScript من هجمات Prototype Pollution
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * تنقية المفاتيح لمنع تلويث النموذج الأولي (Poka-Yoke & Prototype Pollution Guard)
 */
export function sanitizeKey(key: unknown): string {
  const str = String(key ?? '').trim();
  if (FORBIDDEN_KEYS.has(str.toLowerCase())) {
    return `_${str}`;
  }
  return str;
}

/**
 * استخراج القيمة الحقيقية من الخلية بأمان مع دعم النصوص الغنية والصيغ الحسابية
 */
export function extractCellValue(cell: ExcelJS.Cell): any {
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    if (val instanceof Date) return val.toISOString();
    if ('result' in val && (val as any).result !== undefined) {
      return (val as any).result;
    }
    if ('text' in val && typeof (val as any).text === 'string') {
      return (val as any).text;
    }
    if ('richText' in val && Array.isArray((val as any).richText)) {
      return (val as any).richText.map((t: any) => t.text || '').join('');
    }
  }
  return val;
}

/**
 * دالة مساعدة لتحميل ملف عبر إنشاء رابط Blob مؤقت
 * متوافقة مع بيئة المتصفح و Electron Renderer
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || !document.createElement) {
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);

  setTimeout(() => {
    link.click();
    setTimeout(() => {
      try {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        } else if (typeof link.remove === 'function') {
          link.remove();
        }
      } catch {
        // Safe fallback in test/headless environments
      }
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Safe fallback
      }
    }, 200);
  }, 0);
}

/**
 * تصدير مصفوفة من الكائنات إلى ملف Excel (.xlsx) مع دعم كامل لاتجاه اليمين لليسار (RTL)
 */
export async function exportJsonToExcel(
  data: Record<string, any>[],
  sheetName: string = 'البيانات',
  fileName: string = 'export.xlsx'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }],
  });

  if (!data || data.length === 0) {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerBlobDownload(blob, fileName);
    return;
  }

  // استخراج العناوين وتحديد أطوال الأعمدة
  const headers = Object.keys(data[0]);
  worksheet.columns = headers.map((key) => {
    let maxLen = key.length;
    for (let i = 0; i < Math.min(data.length, 500); i++) {
      const valStr = data[i][key] !== undefined && data[i][key] !== null ? String(data[i][key]) : '';
      if (valStr.length > maxLen) {
        maxLen = valStr.length;
      }
    }
    return {
      header: key,
      key: key,
      width: Math.min(Math.max(maxLen + 4, 12), 40),
    };
  });

  // إضافة الصفوف
  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // تنسيق رأس الجدول
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FF1E293B' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 24;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBlobDownload(blob, fileName);
}

/**
 * تصدير مصفوفة ثنائية الأبعاد (AOA) مع تخصيص عرض الأعمدة وتوجيه RTL وتثبيت نص الباركود
 */
export async function exportAoaToExcel(
  aoa: (string | number)[][],
  colWidths: { wch: number }[] = [],
  sheetName: string = 'ورقة 1',
  fileName: string = 'export.xlsx',
  barcodeColIndex = 1
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: true }],
  });

  if (colWidths.length > 0) {
    worksheet.columns = colWidths.map((w) => ({ width: w.wch }));
  }

  aoa.forEach((rowValues) => {
    worksheet.addRow(rowValues);
  });

  // تأكيد تنسيق نص للباركود لمنع تحويله لترميز علمي (6.28E+12) في Excel
  if (barcodeColIndex >= 0) {
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const cell = row.getCell(barcodeColIndex + 1);
        if (cell && cell.value !== undefined && cell.value !== null && cell.value !== '') {
          cell.numFmt = '@';
        }
      }
    });
  }

  // تنسيق رأس الجدول إذا كان موجوداً
  if (aoa.length > 0) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBlobDownload(blob, fileName);
}

/**
 * تصدير مصفوفة ثنائية الأبعاد إلى ملف CSV مع رمز UTF-8 BOM لحماية الأحرف العربية
 */
export function exportAoaToCsv(
  aoa: (string | number)[][],
  fileName: string = 'export.csv'
): void {
  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = aoa.map((row) => row.map(escapeCsv).join(','));
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, fileName);
}

/**
 * قراءة ورقة العمل الأولى ككائنات مع حماية Prototype Pollution وحد أقصى للأمان
 */
export async function readExcelAsObjects(
  source: ArrayBuffer | File,
  options: { maxRows?: number } = {}
): Promise<Record<string, any>[]> {
  const maxRows = options.maxRows || 30000;
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = sanitizeKey(extractCellValue(cell));
  });

  const records: Record<string, any>[] = [];
  const totalRows = Math.min(worksheet.rowCount, maxRows + 1);

  for (let r = 2; r <= totalRows; r++) {
    const row = worksheet.getRow(r);
    // التحقق من أن الصف ليس فارغاً تماماً
    let hasData = false;
    const record: Record<string, any> = {};

    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      const val = extractCellValue(cell);
      if (val !== '' && val !== null && val !== undefined) {
        hasData = true;
      }
      record[header] = val;
    });

    if (hasData) {
      records.push(record);
    }
  }

  return records;
}

/**
 * قراءة ورقة العمل الأولى كمصفوفة ثنائية الأبعاد (2D Array) مع دعم الأمان
 */
export async function readExcelAs2DArray(
  source: ArrayBuffer | File,
  options: { maxRows?: number } = {}
): Promise<any[][]> {
  const maxRows = options.maxRows || 30000;
  const arrayBuffer = source instanceof File ? await source.arrayBuffer() : source;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    return [];
  }

  const result: any[][] = [];
  const totalRows = Math.min(worksheet.rowCount, maxRows);

  for (let r = 1; r <= totalRows; r++) {
    const row = worksheet.getRow(r);
    const rowVals: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      rowVals.push(extractCellValue(cell));
    });
    result.push(rowVals);
  }

  return result;
}
