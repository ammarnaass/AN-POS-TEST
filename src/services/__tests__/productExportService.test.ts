import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Product, Category } from '@/types';
import ExcelJS from 'exceljs';
import {
  exportProductsToFile,
  resolveCategoryName,
} from '../products/productExportService';

describe('productExportService', () => {
  const mockCategories: Category[] = [
    { id: 'cat-1', name: 'المشروبات' },
    { id: 'cat-2', name: 'المواد الغذائية' },
  ];

  const mockProducts: Product[] = [
    {
      id: 'p-1',
      name: 'عصير برتقال 1 لتر',
      barcode: '6281000001234',
      sku: 'JUICE-01',
      category: '',
      categoryId: 'cat-1',
      unit: 'علبة',
      costPrice: 120,
      wholesalePrice: 140,
      retailPrice: 160,
      quantity: 50,
      lowStockThreshold: 10,
      wholesaleMinQty: 6,
      status: 'active',
      expiryDate: '2026-12-31',
      batchNumber: 'B-99',
      variant: '1 لتر',
      location: 'الرف A1',
      createdAt: '2026-01-01T10:00:00.000Z',
    },
    {
      id: 'p-2',
      name: 'شوكولاتة بالحليب',
      barcode: '0123456789012',
      category: 'حلويات',
      unit: 'قطعة',
      costPrice: 80,
      wholesalePrice: 95,
      retailPrice: 110,
      quantity: 100,
      lowStockThreshold: 15,
      wholesaleMinQty: 10,
      status: 'active',
    },
  ];

  let linkClickSpy: ReturnType<typeof vi.fn>;
  let createdBlob: Blob | null = null;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    createdBlob = null;
    linkClickSpy = vi.fn();

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn((blob: any) => {
      createdBlob = blob;
      return 'blob:mock-url';
    });
    URL.revokeObjectURL = vi.fn();

    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      style: { display: '' },
      click: linkClickSpy,
    } as any);

    vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  describe('resolveCategoryName', () => {
    it('resolves category name from categoryId using categories array', () => {
      const name = resolveCategoryName(mockProducts[0], mockCategories);
      expect(name).toBe('المشروبات');
    });

    it('resolves category string when categoryId is absent', () => {
      const name = resolveCategoryName(mockProducts[1], mockCategories);
      expect(name).toBe('حلويات');
    });

    it('handles category as object with name property', () => {
      const prod = { ...mockProducts[0], category: { name: 'فئة كائنية' } as any };
      const name = resolveCategoryName(prod, mockCategories);
      expect(name).toBe('فئة كائنية');
    });

    it('defaults to عام if no category info is provided', () => {
      const prod = { ...mockProducts[0], category: '', categoryId: undefined };
      const name = resolveCategoryName(prod, []);
      expect(name).toBe('عام');
    });
  });

  describe('exportProductsToFile - Excel (.xlsx)', () => {
    it('exports products in inventory_audit template (7 main fields)', async () => {
      const result = await exportProductsToFile(mockProducts, {
        format: 'xlsx',
        template: 'inventory_audit',
        categories: mockCategories,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);

      // Verify blob was created with Excel MIME type
      expect(createdBlob).not.toBeNull();
      expect(createdBlob!.type).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      // Verify the workbook content by parsing the captured blob buffer with ExcelJS
      const arrayBuffer = await createdBlob!.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const sheet = workbook.getWorksheet('مراجعة الأسعار والجرد');
      expect(sheet).toBeDefined();
      expect(sheet!.views).toEqual([expect.objectContaining({ rightToLeft: true })]);

      // Check column headers in row 1
      const headerRow = sheet!.getRow(1);
      const headers = [
        headerRow.getCell(1).value,
        headerRow.getCell(2).value,
        headerRow.getCell(3).value,
        headerRow.getCell(4).value,
        headerRow.getCell(5).value,
        headerRow.getCell(6).value,
        headerRow.getCell(7).value,
      ];
      expect(headers).toEqual([
        'اسم المنتج',
        'الباركود',
        'التصنيف',
        'سعر التكلفة (دج)',
        'سعر الجملة (دج)',
        'سعر التجزئة (دج)',
        'الكمية الحالية',
      ]);

      // Row 2 data (first product)
      const row2 = sheet!.getRow(2);
      expect(row2.getCell(1).value).toBe('عصير برتقال 1 لتر');
      expect(row2.getCell(2).value).toBe('6281000001234');
      expect(row2.getCell(3).value).toBe('المشروبات');
      expect(row2.getCell(4).value).toBe(120);
      expect(row2.getCell(5).value).toBe(140);
      expect(row2.getCell(6).value).toBe(160);
      expect(row2.getCell(7).value).toBe(50);

      // Verify barcode cell numFmt is explicit text ('@')
      expect(row2.getCell(2).numFmt).toBe('@');
    });

    it('exports products in comprehensive template (20 fields)', async () => {
      const result = await exportProductsToFile(mockProducts, {
        format: 'xlsx',
        template: 'comprehensive',
        categories: mockCategories,
      });

      expect(result.success).toBe(true);

      const arrayBuffer = await createdBlob!.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const sheet = workbook.getWorksheet('بيانات المنتجات الشاملة');
      expect(sheet).toBeDefined();

      const headerRow = sheet!.getRow(1);
      expect(headerRow.actualCellCount).toBe(20);
      expect(headerRow.getCell(1).value).toBe('اسم المنتج');
      expect(headerRow.getCell(2).value).toBe('الباركود');
      expect(headerRow.getCell(3).value).toBe('كود الصنف (SKU)');
      expect(headerRow.getCell(4).value).toBe('التصنيف');
      expect(headerRow.getCell(9).value).toBe('الكمية الحالية');
    });

    it('throws error when product list is empty', async () => {
      await expect(exportProductsToFile([], { format: 'xlsx' })).rejects.toThrow(
        'لا توجد منتجات لتصديرها'
      );
    });
  });

  describe('exportProductsToFile - CSV (.csv)', () => {
    it('triggers CSV download with UTF-8 BOM', async () => {
      const result = await exportProductsToFile(mockProducts, {
        format: 'csv',
        template: 'inventory_audit',
        categories: mockCategories,
      });

      expect(result.success).toBe(true);
      expect(createdBlob).not.toBeNull();

      const arrayBuffer = await createdBlob!.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      expect(bytes[0]).toBe(0xEF);
      expect(bytes[1]).toBe(0xBB);
      expect(bytes[2]).toBe(0xBF);

      const text = await createdBlob!.text();
      expect(text).toContain('اسم المنتج');
      expect(text).toContain('عصير برتقال 1 لتر');
    });
  });
});
