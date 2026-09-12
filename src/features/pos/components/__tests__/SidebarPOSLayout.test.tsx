import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarPOSLayout } from '../SidebarPOSLayout';
import type { CartItem, Product } from '@/types';
import { formatMoney } from '@/features/pos/utils/format';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'عصير برتقال طبيعي',
  barcode: '6130001112223',
  category: 'مشروبات',
  unit: 'علبة',
  costPrice: 80,
  wholesalePrice: 100,
  retailPrice: 120,
  salePrice1: 120,
  salePrice2: 110,
  salePrice3: 100,
  invoicePrice: 95,
  quantity: 50,
  minStockAlert: 5,
  status: 'active',
  trackStock: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('SidebarPOSLayout (تصميم 1 - العصري) Price Rendering', () => {
  const defaultProps = {
    cart: [] as CartItem[],
    onAddToCart: vi.fn(),
    onUpdateQty: vi.fn(),
    onRemoveFromCart: vi.fn(),
    onClearCart: vi.fn(),
    onEditPrice: vi.fn(),
    priceTier: '1' as const,
    onSelectPriceTier: vi.fn(),
    saleSummary: {
      subtotal: 0,
      discountAmount: 0,
      total: 0,
    },
    products: [mockProduct],
    allProducts: [mockProduct],
    categories: ['الكل', 'مشروبات'],
    selectedCategory: 'الكل',
    onSelectCategory: vi.fn(),
    barcodeInput: '',
    setBarcodeInput: vi.fn(),
    onBarcodeSubmit: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    onSettleSale: vi.fn(),
    onSuspendSale: vi.fn(),
    onOpenSuspended: vi.fn(),
    suspendedCount: 0,
    onSelectCustomer: vi.fn(),
    selectedCustomerName: 'زبون عام',
    autoPrintReceipt: false,
    onToggleAutoPrint: vi.fn(),
    onOpenDiscount: vi.fn(),
    discount: 0,
    discountType: 'percent' as const,
    onOpenFreeProduct: vi.fn(),
    onOpenReturns: vi.fn(),
    returnMode: false,
    onOpenCustomize: vi.fn(),
    wholesaleMode: false,
    toggleWholesaleMode: vi.fn(),
    formatMoney,
    currency: 'د.ج',
    isSessionOpen: true,
    isSalePending: false,
    onToggleFullscreen: vi.fn(),
    isFullscreen: false,
    onNavigateBack: vi.fn(),
  };

  it('يعرض سعر المنتج المفرد وإجمالي البند المضاف من ماسح الهاتف بدقة في السلة بدلاً من 0.00', () => {
    // منتج مضاف من قارئ الباركود (يحمل unitPrice و lineTotal)
    const scannedCartItem: CartItem = {
      productId: 'prod-1',
      name: 'عصير برتقال طبيعي',
      qty: 3,
      unitPrice: 120,
      lineTotal: 360,
      pricingType: 'retail',
    };

    render(
      <MemoryRouter>
        <SidebarPOSLayout
          {...defaultProps}
          cart={[scannedCartItem]}
          saleSummary={{ subtotal: 360, discountAmount: 0, total: 360 }}
        />
      </MemoryRouter>
    );

    // التحقق من اسم المنتج في السلة والكتالوج
    expect(screen.getAllByText('عصير برتقال طبيعي').length).toBeGreaterThan(0);

    // التحقق من عرض السعر الفردي والكمية: 120,00 د.ج × 3 قطعة
    // تنسيق ar-DZ ينتج فاصلة عشرية
    const priceTextRegex = /120[,.]00.*د\.ج.*×.*3/;
    expect(screen.getByText(priceTextRegex)).toBeInTheDocument();

    // التحقق من إجمالي السطر 360,00
    const lineTotalRegex = /360[,.]00/;
    expect(screen.getAllByText(lineTotalRegex).length).toBeGreaterThan(0);
  });

  it('يعرض أزرار أسعار التجزئة والجملة السريعة للبند ويسمح بتبديل السعر', () => {
    const scannedCartItem: CartItem = {
      productId: 'prod-1',
      name: 'عصير برتقال طبيعي',
      qty: 1,
      unitPrice: 120,
      lineTotal: 120,
      barcode: '6130001112223',
    };
    const onEditPrice = vi.fn();

    render(
      <MemoryRouter>
        <SidebarPOSLayout
          {...defaultProps}
          cart={[scannedCartItem]}
          onEditPrice={onEditPrice}
        />
      </MemoryRouter>
    );

    // أزرار فئات السعر الأربعة
    expect(screen.getByTitle(/س1 \(تجزئة\)/)).toBeInTheDocument();
    expect(screen.getByTitle(/س2 \(نصف جملة\)/)).toBeInTheDocument();
    expect(screen.getByTitle(/س3 \(جملة\)/)).toBeInTheDocument();
    expect(screen.getByTitle(/س4 \(خاص\)/)).toBeInTheDocument();

    // النقر على سعر الجملة س3 (100)
    fireEvent.click(screen.getByTitle(/س3 \(جملة\)/));
    expect(onEditPrice).toHaveBeenCalledWith('prod-1', 100);
  });

  it('يملأ حقل تعديل السعر المباشر بالسعر الحالي بدلاً من undefined', () => {
    const scannedCartItem: CartItem = {
      productId: 'prod-1',
      name: 'عصير برتقال طبيعي',
      qty: 1,
      unitPrice: 120,
      lineTotal: 120,
    };

    render(
      <MemoryRouter>
        <SidebarPOSLayout
          {...defaultProps}
          cart={[scannedCartItem]}
        />
      </MemoryRouter>
    );

    // النقر على زر "تعديل السعر"
    const editPriceBtn = screen.getByRole('button', { name: 'تعديل السعر' });
    fireEvent.click(editPriceBtn);

    // حقل الإدخال يجب أن يحتوي على القيمة "120" وليس "undefined"
    const priceInput = screen.getByPlaceholderText('السعر الجديد...') as HTMLInputElement;
    expect(priceInput).toBeInTheDocument();
    expect(priceInput.value).toBe('120');
  });

  it('يعرض سعر المنتج في بطاقة شبكة المنتجات (الكتالوج)', () => {
    render(
      <MemoryRouter>
        <SidebarPOSLayout {...defaultProps} />
      </MemoryRouter>
    );

    // التحقق من ظهور بطاقة المنتج وعرض سعر التجزئة 120,00
    expect(screen.getByText('عصير برتقال طبيعي')).toBeInTheDocument();
    const productPriceElements = screen.getAllByText(/120[,.]00/);
    expect(productPriceElements.length).toBeGreaterThan(0);
  });
});
