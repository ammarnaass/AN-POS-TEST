import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import {
  parseProductsFromWorkbook,
  mergeImportedProducts,
  cleanNumber,
  cleanBarcode,
  isSummaryOrEmptyRow,
} from '../products/productImportService';
import type { Product, Category } from '@/types';

describe('productImportService', () => {
  const realExcelPath = path.resolve(
    __dirname,
    '../../../AN_POS_المنتجات_شامل_المنتجات_2026-09-17.xlsx'
  );

  it('يقوم بتنظيف الأرقام والعملات والرموز بدقة', () => {
    expect(cleanNumber('17.91 دج')).toBe(17.91);
    expect(cleanNumber(' 1,250.50 ')).toBe(1250.5);
    expect(cleanNumber('120 DZD')).toBe(120);
    expect(cleanNumber('')).toBe(0);
    expect(cleanNumber(null)).toBe(0);
    expect(cleanNumber(undefined, 5)).toBe(5);
    expect(cleanNumber(45.5)).toBe(45.5);
  });

  it('يقوم بتنظيف الباركود وتفادي التحويل العلمي للأرقام الطويلة', () => {
    expect(cleanBarcode(' 326112869412 ')).toBe('326112869412');
    expect(cleanBarcode(326112869412)).toBe('326112869412');
    expect(cleanBarcode('')).toBe('');
    expect(cleanBarcode(null)).toBe('');
  });

  it('يكتشف صفوف الإجماليات والصفوف الفارغة لتفادي إدخالها كمنتجات', () => {
    expect(
      isSummaryOrEmptyRow({
        'اسم المنتج': 'الإجمالي الكلي لـ (119 منتج)',
        'الكمية الحالية': 11579,
      })
    ).toBe(true);

    expect(
      isSummaryOrEmptyRow({
        'اسم المنتج': 'المجموع العام',
        'الكمية الحالية': 500,
      })
    ).toBe(true);

    expect(
      isSummaryOrEmptyRow({
        'اسم المنتج': '',
        'الباركود': '',
      })
    ).toBe(true);

    expect(
      isSummaryOrEmptyRow({
        'اسم المنتج': 'كراس 32 ص',
        'الباركود': '326112869412',
      })
    ).toBe(false);
  });

  it('يستورد ملف النسخة الاحتياطية الفعلي للمستخدم بدقة 100% وبدون أي نقص في الحقول', () => {
    if (!fs.existsSync(realExcelPath)) {
      console.warn('Real excel file not found at path, skipping test:', realExcelPath);
      return;
    }

    const fileBuffer = fs.readFileSync(realExcelPath);
    const wb = XLSX.read(fileBuffer, { type: 'buffer' });

    const existingCategories: Category[] = [
      { id: 'cat-school', name: 'ادوات المدرسية' },
    ];

    const result = parseProductsFromWorkbook(
      wb,
      'AN_POS_المنتجات_شامل_المنتجات_2026-09-17.xlsx',
      [],
      existingCategories
    );

    // 1. عدد المنتجات المستخرجة هو 119 تماماً مع تجاوز صف الإجمالي الأخير
    expect(result.validProducts.length).toBe(119);
    expect(result.skippedRows).toBe(1);

    // 2. التحقق من تطابق كافة الحقول للمنتج الأول بدقة تامة
    const p1 = result.validProducts[0];
    expect(p1.name).toBe('كراس 32 ص منصوري 2023');
    expect(p1.barcode).toBe('326112869412');
    expect(p1.sku).toBe('2023');
    expect(p1.category).toBe('ادوات المدرسية');
    expect(p1.categoryId).toBe('cat-school');
    expect(p1.unit).toBe('قطعة');
    expect(p1.costPrice).toBe(17.91);
    expect(p1.wholesalePrice).toBe(20);
    expect(p1.retailPrice).toBe(22);
    expect(p1.quantity).toBe(280);
    expect(p1.lowStockThreshold).toBe(5);
    expect(p1.wholesaleMinQty).toBe(10);
    expect(p1.status).toBe('active');
    expect(p1.createdAt).toContain('2026-09-17');

    // 3. التحقق من منتج آخر من وسط الملف
    const p3 = result.validProducts[2];
    expect(p3.name).toBe('كراس 64 ص منصوري 2024 170 قطعة');
    expect(p3.barcode).toBe('850342764009');
    expect(p3.costPrice).toBe(24);
    expect(p3.wholesalePrice).toBe(27);
    expect(p3.retailPrice).toBe(30);
    expect(p3.quantity).toBe(850);

    // 4. التحقق من كشف التصنيفات
    expect(result.detectedCategories).toContain('ادوات المدرسية');
  });

  it('يستورد بنجاح مصنف مبني برمجياً مع أعمدة بديلة وتنسيقات عملات متعددة', () => {
    const wsData = [
      ['اسم السلعة', 'كود الباركود', 'القسم', 'سعر الشراء دج', 'سعر البيع دج', 'المخزون الحالي'],
      ['شوكولاتة بالحليب', '613000111222', 'حلويات', '85.50 دج', '110.00 دج', 50],
      ['عصير برتقال 1ل', '613000333444', 'مشروبات', '120 دج', '150 دج', 24],
      ['المجموع الكلي', '', '', '', '', 74],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'السلع');

    const result = parseProductsFromWorkbook(wb, 'test.xlsx');
    expect(result.validProducts.length).toBe(2);
    expect(result.skippedRows).toBe(1);

    const prod1 = result.validProducts[0];
    expect(prod1.name).toBe('شوكولاتة بالحليب');
    expect(prod1.barcode).toBe('613000111222');
    expect(prod1.category).toBe('حلويات');
    expect(prod1.costPrice).toBe(85.5);
    expect(prod1.retailPrice).toBe(110);
    expect(prod1.quantity).toBe(50);
  });

  it('يدمج المنتجات المستوردة مع المنتجات الحالية (Upsert) بدقة وبدون تكرار', () => {
    const existing: Product[] = [
      {
        id: 'prod-old-1',
        name: 'كراس 32 ص قديم',
        barcode: '326112869412',
        category: 'عام',
        costPrice: 15,
        wholesalePrice: 18,
        retailPrice: 20,
        quantity: 50,
        lowStockThreshold: 5,
        wholesaleMinQty: 10,
        status: 'active',
        unit: 'قطعة',
      },
    ];

    const imported: Product[] = [
      {
        id: 'new-temp-id',
        name: 'كراس 32 ص منصوري 2023 مُحدّث',
        barcode: '326112869412',
        sku: '2023',
        category: 'ادوات المدرسية',
        costPrice: 17.91,
        wholesalePrice: 20,
        retailPrice: 22,
        quantity: 280,
        lowStockThreshold: 10,
        wholesaleMinQty: 10,
        status: 'active',
        unit: 'قطعة',
      },
      {
        id: 'new-temp-id-2',
        name: 'قلم جاف أزرق',
        barcode: '999888777666',
        category: 'ادوات المدرسية',
        costPrice: 10,
        wholesalePrice: 12,
        retailPrice: 15,
        quantity: 100,
        lowStockThreshold: 5,
        wholesaleMinQty: 5,
        status: 'active',
        unit: 'قطعة',
      },
    ];

    const { finalProducts, insertedCount, updatedCount } = mergeImportedProducts(
      existing,
      imported,
      'upsert'
    );

    expect(insertedCount).toBe(1); // قلم جاف أزرق
    expect(updatedCount).toBe(1);  // كراس 32 ص
    expect(finalProducts.length).toBe(2);

    // التحقق من الحفاظ على المعرف الأصلي للمنتج المحدث مع تحديث الأسعار
    const updatedProd = finalProducts.find((p) => p.barcode === '326112869412');
    expect(updatedProd?.id).toBe('prod-old-1');
    expect(updatedProd?.name).toBe('كراس 32 ص منصوري 2023 مُحدّث');
    expect(updatedProd?.costPrice).toBe(17.91);
    expect(updatedProd?.quantity).toBe(280);
  });
});
