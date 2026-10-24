import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { WorkstationPOSLayout } from '../WorkstationPOSLayout';
import type { CartItem } from '@/types';

describe('WorkstationPOSLayout (تصميم 6 - محطة العمل الاحترافية)', () => {
  const mockCart: CartItem[] = [
    {
      productId: 'p1',
      name: 'زيت نباتي ممتاز 5 لتر - صافي',
      price: 650,
      qty: 2,
    },
    {
      productId: 'p2',
      name: 'سكر أبيض مكرر 1 كغ',
      price: 95,
      qty: 5,
    },
  ];

  const defaultProps = {
    cart: mockCart,
    onAddToCart: vi.fn(),
    onUpdateQty: vi.fn(),
    onRemoveFromCart: vi.fn(),
    onClearCart: vi.fn(),
    priceTier: '1' as const,
    onSelectPriceTier: vi.fn(),
    saleSummary: {
      subtotal: 1775,
      discountAmount: 0,
      total: 1775,
    },
    products: [],
    barcodeInput: '',
    setBarcodeInput: vi.fn(),
    onBarcodeSubmit: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    onSettleSale: vi.fn(),
    onSuspendSale: vi.fn(),
    onOpenSuspended: vi.fn(),
    suspendedCount: 3,
    onSelectCustomer: vi.fn(),
    selectedCustomerName: 'ANONYME (زبون عام)',
    autoPrintReceipt: false,
    onToggleAutoPrint: vi.fn(),
    onOpenDiscount: vi.fn(),
    discount: 0,
    discountType: 'percent' as const,
    onOpenFreeProduct: vi.fn(),
    onOpenReturns: vi.fn(),
    onOpenCustomize: vi.fn(),
    formatMoney: (amount?: number | null) => (amount != null ? amount.toFixed(2) : '0.00'),
    currency: 'د.ج',
    storeName: 'سوبرماركت النور والبركة',
    userName: 'مدير النظام (Admin)',
    invoiceNumber: 3,
  };

  it('يعرض شريط الحالة العلوي الداكن مع بيانات الكاشير ورقم الفاتورة واسم المتجر', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    expect(screen.getByText(/PRO WORKSTATION/)).toBeInTheDocument();
    expect(screen.getByText('سوبرماركت النور والبركة')).toBeInTheDocument();
    expect(screen.getByText('مدير النظام (Admin)')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText(/معلق بالانتظار:/)).toBeInTheDocument();
    expect(screen.getByText('ANONYME (زبون عام)')).toBeInTheDocument();
  });

  it('يعرض شاشة العرض المالي الرقمية LED الخضراء مع الإجمالي المستحق', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    expect(screen.getByText('شاشة العرض المالي الرقمية للكاشير')).toBeInTheDocument();
    expect(screen.getByText(/المبلغ الإجمالي المستحق/)).toBeInTheDocument();
    expect(screen.getByText('LIVE SYNC READY')).toBeInTheDocument();
  });

  it('يعرض لوحة المحاسبة والدفع اليسرى مع الفئات النقدية السريعة والضريبة والصافي', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    expect(screen.getByText('الحساب المالي والضريبي')).toBeInTheDocument();
    expect(screen.getByText('المبلغ الصافي المطلوب:')).toBeInTheDocument();
    expect(screen.getByText('المبلغ المدفوع من الزبون:')).toBeInTheDocument();
    expect(screen.getByText('الباقي للزبون')).toBeInTheDocument();

    // فئات نقدية سريعة
    expect(screen.getByRole('button', { name: '+500' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+1000' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+2000' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+5000' })).toBeInTheDocument();
  });

  it('يزيد المبلغ المدفوع عند الضغط على فئة نقدية سريعة', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    const plus500Btn = screen.getByRole('button', { name: '+500' });
    fireEvent.click(plus500Btn);

    // Paid input should now have 1775 + 500 = 2275
    const paidInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(Number(paidInput.value)).toBe(2275);
  });

  it('يعرض جدول المبيعات مع أزرار التحكم بالكمية داخل السطر', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    expect(screen.getAllByText('زيت نباتي ممتاز 5 لتر - صافي').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('سكر أبيض مكرر 1 كغ')).toBeInTheDocument();

    // Find and click increase quantity for first row
    const plusButtons = screen.getAllByTitle('زيادة');
    fireEvent.click(plusButtons[0]);
    expect(defaultProps.onUpdateQty).toHaveBeenCalledWith('p1', 3);
  });

  it('يعرض شريط أزرار الوظائف السفلي (F1-F12)', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    expect(screen.getByText('تأكيد الحفظ')).toBeInTheDocument();
    expect(screen.getByText('تأكيد وطبع')).toBeInTheDocument();
    expect(screen.getByText('وضع بالانتظار')).toBeInTheDocument();
    expect(screen.getByText('قائمة الانتظار')).toBeInTheDocument();
    expect(screen.getByText('إرجاع سلع')).toBeInTheDocument();
    expect(screen.getByText('سلع متنوعة')).toBeInTheDocument();
    expect(screen.getByText('نوع البحث')).toBeInTheDocument();
    expect(screen.getByText('إغلاق')).toBeInTheDocument();
    expect(screen.queryByText('حزم')).not.toBeInTheDocument();
  });

  it('يستدعي onSettleSale عند الضغط على زر تأكيد الحفظ (F1)', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    const f1Btn = screen.getByText('تأكيد الحفظ').closest('button');
    expect(f1Btn).toBeInTheDocument();
    fireEvent.click(f1Btn!);

    expect(defaultProps.onSettleSale).toHaveBeenCalled();
  });

  it('يتفاعل مع اختصارات لوحة المفاتيح F1 و F3 و F6 و F9', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'F3' });
    expect(defaultProps.onSuspendSale).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'F6' });
    expect(defaultProps.onOpenSuspended).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'F9' });
    expect(defaultProps.onOpenCustomize).toHaveBeenCalled();
  });

  it('يعرض زر التخصيص في الشريط العلوي (بدون تكرار في الشريط السفلي) ويستدعي onOpenCustomize عند النقر', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    // Should find customize button in the top bar only (not duplicated)
    const customizeButtons = screen.getAllByRole('button', { name: /تخصيص/ });
    expect(customizeButtons).toHaveLength(1);

    fireEvent.click(customizeButtons[0]);
    expect(defaultProps.onOpenCustomize).toHaveBeenCalled();
  });

  it('يتيح تبديل الوضع الليلي والنهاري بالتزامن مع useThemeStore', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    const themeToggleBtn = screen.getByTitle(/الوضع/);
    expect(themeToggleBtn).toBeInTheDocument();
    fireEvent.click(themeToggleBtn);
  });
});
