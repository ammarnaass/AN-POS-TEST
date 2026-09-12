import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product, Category } from '@/types';

const mockWriteFile = vi.fn();

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return {
    ...actual,
    writeFile: (...args: any[]) => mockWriteFile(...args),
  };
});

import * as XLSX from 'xlsx';
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

  beforeEach(() => {
    mockWriteFile.mockReset();
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
      let capturedBook: XLSX.WorkBook | null = null;
      mockWriteFile.mockImplementation((wb: XLSX.WorkBook) => {
        capturedBook = wb;
      });

      const result = await exportProductsToFile(mockProducts, {
        format: 'xlsx',
        template: 'inventory_audit',
        categories: mockCategories,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockWriteFile).toHaveBeenCalled();

      expect(capturedBook).not.toBeNull();
      const sheet = capturedBook!.Sheets['مراجعة الأسعار والجرد'];
      expect(sheet).toBeDefined();

      // Check RTL view
      expect(sheet['!views']).toEqual([{ RTL: true }]);

      // Check column headers in row 1
      const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      const headers = json[0];
      expect(headers).toEqual([
        'اسم المنتج',
        'الباركود',
        'التصنيف',
        'سعر التكلفة (دج)',
        'سعر الجملة (دج)',
        'سعر التجزئة (دج)',
        'الكمية الحالية',
      ]);

      // Row 1 data (first product)
      expect(json[1][0]).toBe('عصير برتقال 1 لتر');
      expect(json[1][1]).toBe('6281000001234');
      expect(json[1][2]).toBe('المشروبات');
      expect(json[1][3]).toBe(120);
      expect(json[1][4]).toBe(140);
      expect(json[1][5]).toBe(160);
      expect(json[1][6]).toBe(50);

      // Verify barcode cell type is explicit text ('s')
      const barcodeCell = sheet['B2'];
      expect(barcodeCell.t).toBe('s');
      expect(barcodeCell.z).toBe('@');
    });

    it('exports products in comprehensive template (20 fields)', async () => {
      let capturedBook: XLSX.WorkBook | null = null;
      mockWriteFile.mockImplementation((wb: XLSX.WorkBook) => {
        capturedBook = wb;
      });

      const result = await exportProductsToFile(mockProducts, {
        format: 'xlsx',
        template: 'comprehensive',
        categories: mockCategories,
      });

      expect(result.success).toBe(true);
      expect(capturedBook).not.toBeNull();
      const sheet = capturedBook!.Sheets['بيانات المنتجات الشاملة'];
      expect(sheet).toBeDefined();

      const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
      const headers = json[0];
      expect(headers.length).toBe(20);
      expect(headers[0]).toBe('اسم المنتج');
      expect(headers[1]).toBe('الباركود');
      expect(headers[2]).toBe('كود الصنف (SKU)');
      expect(headers[3]).toBe('التصنيف');
      expect(headers[8]).toBe('الكمية الحالية');
    });

    it('throws error when product list is empty', async () => {
      await expect(exportProductsToFile([], { format: 'xlsx' })).rejects.toThrow(
        'لا توجد منتجات لتصديرها'
      );
    });
  });

  describe('exportProductsToFile - CSV (.csv)', () => {
    it('triggers CSV download with UTF-8 BOM', async () => {
      let createdBlob: Blob | null = null;
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = vi.fn((blob: any) => {
        createdBlob = blob;
        return 'blob:mock-url';
      });
      URL.revokeObjectURL = vi.fn();

      const linkClickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        set href(val: string) {},
        set download(val: string) {},
        click: linkClickSpy,
      } as any);

      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      const result = await exportProductsToFile(mockProducts, {
        format: 'csv',
        template: 'inventory_audit',
        categories: mockCategories,
      });

      expect(result.success).toBe(true);
      expect(linkClickSpy).toHaveBeenCalled();
      expect(createdBlob).not.toBeNull();

      // Read blob content to verify UTF-8 BOM bytes (0xEF, 0xBB, 0xBF)
      const arrayBuffer = await (createdBlob as any).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      expect(bytes[0]).toBe(0xEF);
      expect(bytes[1]).toBe(0xBB);
      expect(bytes[2]).toBe(0xBF);

      const text = await (createdBlob as any).text();
      expect(text).toContain('اسم المنتج');
      expect(text).toContain('عصير برتقال 1 لتر');

      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });
  });
});
