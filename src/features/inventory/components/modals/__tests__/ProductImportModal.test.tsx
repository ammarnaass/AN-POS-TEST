import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductImportModal } from '../ProductImportModal';
import type { ProductImportSummary } from '@/services/products/productImportService';

describe('ProductImportModal', () => {
  const mockSummary: ProductImportSummary = {
    filename: 'AN_POS_المنتجات_شامل_المنتجات_2026-09-17.xlsx',
    totalRows: 121,
    validProducts: [
      {
        id: 'p-1',
        name: 'كراس 32 ص منصوري 2023',
        barcode: '326112869412',
        sku: '2023',
        category: 'ادوات المدرسية',
        unit: 'قطعة',
        costPrice: 17.91,
        wholesalePrice: 20,
        retailPrice: 22,
        quantity: 280,
        lowStockThreshold: 5,
        wholesaleMinQty: 10,
        status: 'active',
      },
      {
        id: 'p-2',
        name: 'كراس 48 ص منصوري 2024',
        barcode: '954104184972',
        sku: '2024',
        category: 'ادوات المدرسية',
        unit: 'قطعة',
        costPrice: 21,
        wholesalePrice: 24,
        retailPrice: 26,
        quantity: 210,
        lowStockThreshold: 5,
        wholesaleMinQty: 10,
        status: 'active',
      },
    ],
    skippedRows: 1,
    detectedCategories: ['ادوات المدرسية'],
    newCategories: ['ادوات المدرسية'],
    existingMatchCount: 0,
    newProductsCount: 2,
  };

  it('يعرض تفاصيل الملف والبيانات الإحصائية وجدول المعاينة بدقة', () => {
    render(
      <ProductImportModal
        open={true}
        onClose={vi.fn()}
        summary={mockSummary}
        onConfirm={vi.fn()}
        isImporting={false}
      />
    );

    expect(screen.getByText('معاينة وتأكيد استيراد المنتجات من ملف Excel')).toBeInTheDocument();
    expect(screen.getByText('AN_POS_المنتجات_شامل_المنتجات_2026-09-17.xlsx')).toBeInTheDocument();

    // البطاقات الإحصائية
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ادوات المدرسية').length).toBeGreaterThan(0);

    // جدول المعاينة
    expect(screen.getByText('كراس 32 ص منصوري 2023')).toBeInTheDocument();
    expect(screen.getByText('326112869412')).toBeInTheDocument();
    expect(screen.getByText('17.91 دج')).toBeInTheDocument();
    expect(screen.getByText('22.00 دج')).toBeInTheDocument();
    expect(screen.getByText('280')).toBeInTheDocument();
  });

  it('يستدعي onConfirm بالوضع المحدد عند النقر على زر التأكيد', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ProductImportModal
        open={true}
        onClose={vi.fn()}
        summary={mockSummary}
        onConfirm={onConfirm}
        isImporting={false}
      />
    );

    // الوضع الافتراضي هو upsert
    const confirmBtn = screen.getByRole('button', {
      name: /تأكيد واستيراد الآن \(2 منتج\)/,
    });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith('upsert');
  });

  it('يسمح بتبديل وضع الاستيراد إلى تخطي المنتجات المكررة', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ProductImportModal
        open={true}
        onClose={vi.fn()}
        summary={mockSummary}
        onConfirm={onConfirm}
        isImporting={false}
      />
    );

    // اختيار وضع تخطي المكرر
    const skipRadio = screen.getByDisplayValue('skip_duplicates');
    fireEvent.click(skipRadio);

    const confirmBtn = screen.getByRole('button', {
      name: /تأكيد واستيراد الآن \(2 منتج\)/,
    });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith('skip_duplicates');
  });
});
