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

  const mockProducts: any[] = [
    {
      id: 'p1',
      name: 'زيت نباتي ممتاز 5 لتر - صافي',
      price: 650,
      retailPrice: 650,
      wholesalePrice: 600,
      sku: 'REF-OIL-5L',
      barcode: '6131234567890',
      quantity: 25,
      status: 'active',
    },
    {
      id: 'p2',
      name: 'سكر أبيض مكرر 1 كغ',
      price: 95,
      retailPrice: 95,
      wholesalePrice: 90,
      sku: 'REF-SUGAR-1KG',
      barcode: '6139876543210',
      quantity: 50,
      status: 'active',
    },
    {
      id: 'p3',
      name: 'حليب معقم كامل الدسم 1 لتر',
      price: 110,
      retailPrice: 110,
      wholesalePrice: 105,
      sku: 'REF-MILK-1L',
      barcode: '6135555555555',
      quantity: 12,
      status: 'active',
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
    products: mockProducts,
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

  it('يعرض شريط أزرار الوظائف السفلي مع الزر الموحد لتأكيد وطبع (F1 / F2)', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    expect(screen.getByText('تأكيد وطبع')).toBeInTheDocument();
    expect(screen.getByText(/F1 \/ F2/)).toBeInTheDocument();
    expect(screen.queryByText('تأكيد الحفظ')).not.toBeInTheDocument();
    expect(screen.queryByText('الآلة الحاسبة')).not.toBeInTheDocument();
    expect(screen.queryByText('تعديل السعر')).not.toBeInTheDocument();
    expect(screen.getByText('وضع بالانتظار')).toBeInTheDocument();
    expect(screen.getByText('قائمة الانتظار')).toBeInTheDocument();
    expect(screen.getByText('إرجاع سلع')).toBeInTheDocument();
    expect(screen.getByText('سلع متنوعة')).toBeInTheDocument();
    expect(screen.getByText('نوع البحث')).toBeInTheDocument();
    expect(screen.getByText('إغلاق')).toBeInTheDocument();
    expect(screen.queryByText('حزم')).not.toBeInTheDocument();
  });

  it('يستدعي onSettleSale عند الضغط على زر تأكيد وطبع الموحد (F1 / F2)', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    const confirmBtn = screen.getByTestId('bottom-bar-confirm-print-btn');
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

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

  it('يعرض شريط تبويبات متجاوب للشاشات الصغيرة والمتوسطة ويتيح التنقل بين السلة والدفع', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    // Responsive tab buttons
    const tableTabBtn = screen.getByRole('button', { name: /جدول المواد والسلة/ });
    const checkoutTabBtn = screen.getByRole('button', { name: /الحساب والدفع/ });

    expect(tableTabBtn).toBeInTheDocument();
    expect(checkoutTabBtn).toBeInTheDocument();

    // Click checkout tab
    fireEvent.click(checkoutTabBtn);
    expect(screen.getByText('الحساب المالي والضريبي')).toBeInTheDocument();

    // Click table tab
    fireEvent.click(tableTabBtn);
    expect(screen.getAllByText('زيت نباتي ممتاز 5 لتر - صافي').length).toBeGreaterThanOrEqual(1);
  });

  it('ينتقل تلقائياً إلى تبويب الدفع عند الضغط على مفتاح F12 (الدفع السريع)', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'F12' });

    // Paid input should be focused and have value matching total
    const paidInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(paidInput).toBeInTheDocument();
    expect(Number(paidInput.value)).toBe(1775);
  });

  it('يبحث بالتسمية (Désignation) ويعرض قائمة الاقتراحات الذكية ويضيف المنتج للسلة عند النقر', () => {
    const onAddToCart = vi.fn();
    const TestComponent = () => {
      const [input, setInput] = React.useState('');
      return (
        <WorkstationPOSLayout
          {...defaultProps}
          barcodeInput={input}
          setBarcodeInput={setInput}
          onAddToCart={onAddToCart}
        />
      );
    };

    render(<TestComponent />);

    const searchInput = screen.getByPlaceholderText(/اكتب اسم المادة أو امسح الباركود/);
    fireEvent.change(searchInput, { target: { value: 'حليب' } });

    // Autocomplete dropdown should be visible with matching item
    expect(screen.getByText('حليب معقم كامل الدسم 1 لتر')).toBeInTheDocument();
    expect(screen.getByText(/Réf: REF-MILK-1L/)).toBeInTheDocument();
    expect(screen.getByText(/المتوفر: 12/)).toBeInTheDocument();

    // Click on suggestion
    fireEvent.click(screen.getByText('حليب معقم كامل الدسم 1 لتر'));
    expect(onAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p3', name: 'حليب معقم كامل الدسم 1 لتر' })
    );
  });

  it('يبحث بالمرجع (Référence) ويطابق الأصناف حسب رمز SKU/Réf ويضيف المنتج عند الضغط على Enter', () => {
    const onAddToCart = vi.fn();
    const TestComponent = () => {
      const [input, setInput] = React.useState('');
      return (
        <WorkstationPOSLayout
          {...defaultProps}
          barcodeInput={input}
          setBarcodeInput={setInput}
          onAddToCart={onAddToCart}
        />
      );
    };

    render(<TestComponent />);

    // Switch to reference mode
    const criteriaSelect = screen.getByDisplayValue(/بحث بالتسمية/);
    fireEvent.change(criteriaSelect, { target: { value: 'reference' } });

    const searchInput = screen.getByPlaceholderText(/اكتب مرجع المادة/);
    fireEvent.change(searchInput, { target: { value: 'REF-SUGAR' } });

    // Autocomplete dropdown shows sugar
    expect(screen.getAllByText('سكر أبيض مكرر 1 كغ').length).toBeGreaterThanOrEqual(2);

    // Press Enter to submit
    fireEvent.submit(searchInput.closest('form')!);
    expect(onAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p2', sku: 'REF-SUGAR-1KG' })
    );
  });

  it('يتيح التنقل بأسهم لوحة المفاتيح وإغلاق قائمة الاقتراحات بمفتاح Escape', () => {
    const TestComponent = () => {
      const [input, setInput] = React.useState('زيت');
      return (
        <WorkstationPOSLayout
          {...defaultProps}
          barcodeInput={input}
          setBarcodeInput={setInput}
        />
      );
    };

    render(<TestComponent />);

    const searchInput = screen.getByPlaceholderText(/اكتب اسم المادة أو امسح الباركود/);
    fireEvent.focus(searchInput);

    expect(screen.getByText(/نتائج البحث/)).toBeInTheDocument();

    // Press Escape to close dropdown
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.queryByText(/نتائج البحث/)).not.toBeInTheDocument();
  });

  it('يعرض سعر البيع والمبلغ الإجمالي بدقة عند إضافة منتج يحتوي على unitPrice فقط بدون price', () => {
    const cartWithUnitPriceOnly: CartItem[] = [
      {
        productId: 'p-juice',
        name: 'عصير برتقال طبيعي 1 لتر',
        unitPrice: 240,
        lineTotal: 720,
        qty: 3,
      } as any,
    ];

    render(
      <WorkstationPOSLayout
        {...defaultProps}
        cart={cartWithUnitPriceOnly}
      />
    );

    // Verify product name (appears in table row and active item bar)
    expect(screen.getAllByText('عصير برتقال طبيعي 1 لتر').length).toBeGreaterThanOrEqual(1);
    // Verify selling price (unitPrice: 240)
    expect(screen.getByText('240.00')).toBeInTheDocument();
    // Verify total amount (lineTotal: 720)
    expect(screen.getByText('720.00')).toBeInTheDocument();
  });

  it('يستدعي onSettleSale بالمبلغ الافتراضي ونقداً عند النقر على تأكيد وطبع مع إخفاء أزرار وسائل الدفع', () => {
    const onSettleSale = vi.fn();
    render(
      <WorkstationPOSLayout
        {...defaultProps}
        onSettleSale={onSettleSale}
      />
    );

    // Verify payment methods are hidden from checkout panel
    expect(screen.queryByText('طريقة الدفع (Mode de paiement)')).not.toBeInTheDocument();
    expect(screen.queryByText('بطاقة (CIB)')).not.toBeInTheDocument();

    // Click unified confirm button (F1 / F2)
    const confirmBtn = screen.getByTestId('bottom-bar-confirm-print-btn');
    fireEvent.click(confirmBtn);

    expect(onSettleSale).toHaveBeenCalledWith(1775, 'cash');
  });

  it('يستدعي onClearCart عند النقر على زر إلغاء الوصل في الشريط السفلي', () => {
    const onClearCart = vi.fn();
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <WorkstationPOSLayout
        {...defaultProps}
        onClearCart={onClearCart}
      />
    );

    const clearCartBtn = screen.getByText('إلغاء الوصل').closest('button');
    expect(clearCartBtn).toBeInTheDocument();
    fireEvent.click(clearCartBtn!);

    expect(confirmSpy).toHaveBeenCalled();
    expect(onClearCart).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('يفتح الآلة الحاسبة الذكية عند الضغط على F4 ويستدعي onEditPrice عند تعديل السعر', () => {
    const onEditPrice = vi.fn();
    render(
      <WorkstationPOSLayout
        {...defaultProps}
        onEditPrice={onEditPrice}
      />
    );

    // Verify "تعديل السعر" and "الآلة الحاسبة" buttons are hidden from bottom bar
    expect(screen.queryByText('تعديل السعر')).not.toBeInTheDocument();
    expect(screen.queryByText('الآلة الحاسبة')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bottom-bar-calculator-btn')).not.toBeInTheDocument();

    // Press F4
    fireEvent.keyDown(window, { key: 'F4' });

    // Calculator modal appears
    expect(screen.getByText(/لوحة الأرقام اللمسية/)).toBeInTheDocument();
    expect(screen.getByTestId('calculator-display-value')).toHaveTextContent('650');

    // Click quick preset +100
    const plus100Btn = screen.getByRole('button', { name: '+100' });
    fireEvent.click(plus100Btn);
    expect(screen.getByTestId('calculator-display-value')).toHaveTextContent('750');

    // Click confirm apply button
    const applyBtn = screen.getByTestId('calculator-apply-btn');
    fireEvent.click(applyBtn);

    expect(onEditPrice).toHaveBeenCalledWith('p1', 750);
  });

  it('يتيح فتح الآلة الحاسبة وتعديل كمية الصنف بالنقر على خلية الكمية في الجدول', () => {
    const onUpdateQty = vi.fn();
    render(
      <WorkstationPOSLayout
        {...defaultProps}
        onUpdateQty={onUpdateQty}
      />
    );

    // Click quantity cell in table (displayed as integer without decimals, accessible via title)
    const qtyCells = screen.getAllByTitle('انقر لتعديل الكمية بواسطة الآلة الحاسبة');
    expect(qtyCells[0]).toHaveTextContent('2');
    fireEvent.click(qtyCells[0]);

    expect(screen.getByText(/لوحة الأرقام اللمسية/)).toBeInTheDocument();

    // Display shows current item quantity: 2
    expect(screen.getByTestId('calculator-display-value')).toHaveTextContent('2');

    // Select preset or digit 5
    const fiveButtons = screen.getAllByRole('button', { name: '5' });
    fireEvent.click(fiveButtons[0]);
    expect(screen.getByTestId('calculator-display-value')).toHaveTextContent('5');

    // Click apply button
    const applyBtn = screen.getByTestId('calculator-apply-btn');
    fireEvent.click(applyBtn);

    expect(onUpdateQty).toHaveBeenCalledWith('p1', 5);
  });

  it('يعرض زر سجل المبيعات والطباعة التلقائية في الشريط العلوي ويتفاعل مع النقر', () => {
    const onToggleAutoPrint = vi.fn();
    const onOpenSalesHistory = vi.fn();

    render(
      <WorkstationPOSLayout
        {...defaultProps}
        autoPrintReceipt={true}
        onToggleAutoPrint={onToggleAutoPrint}
        onOpenSalesHistory={onOpenSalesHistory}
      />
    );

    // Sales history
    const historyBtn = screen.getByTitle('سجل المبيعات والفواتير');
    expect(historyBtn).toBeInTheDocument();
    fireEvent.click(historyBtn);
    expect(onOpenSalesHistory).toHaveBeenCalled();

    // Auto-print toggle
    const printBtn = screen.getByTitle(/الطباعة التلقائية/);
    expect(printBtn).toBeInTheDocument();
    fireEvent.click(printBtn);
    expect(onToggleAutoPrint).toHaveBeenCalled();
  });

  it('يحسب ويعرض حالة العجز (المبلغ المدفوع غير كافٍ) والمتبقي غير المسدد مع إمكانية السداد الكامل بنقرة واحدة', () => {
    render(<WorkstationPOSLayout {...defaultProps} />);

    // Total is 1775. Initially paid is 1775 (exact)
    expect(screen.getByText('حالة السداد:')).toBeInTheDocument();
    expect(screen.getByText('مدفوع بالضبط')).toBeInTheDocument();
    expect(screen.getByText('الباقي للزبون')).toBeInTheDocument();

    // User enters 1000 (less than 1775 total)
    const paidInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    fireEvent.change(paidInput, { target: { value: '1000' } });

    // Displays deficit warning and remaining unpaid amount (775.00)
    expect(screen.getByText('المبلغ المدفوع غير كافٍ:')).toBeInTheDocument();
    expect(screen.getByText('عجز نقدي')).toBeInTheDocument();
    expect(screen.getAllByText(/المتبقي غير المسدد/).length).toBeGreaterThanOrEqual(1);

    // Fast 1-click full settlement button
    const fullSettleBtn = screen.getByRole('button', { name: 'سداد المبلغ كاملاً' });
    expect(fullSettleBtn).toBeInTheDocument();

    // Click full settlement button -> sets paidAmount to total (1775)
    fireEvent.click(fullSettleBtn);
    expect(paidInput.value).toBe('1775');
    expect(screen.getByText('حالة السداد:')).toBeInTheDocument();
    expect(screen.getByText('مدفوع بالضبط')).toBeInTheDocument();

    // If customer pays surplus (e.g. 2000)
    fireEvent.change(paidInput, { target: { value: '2000' } });
    expect(screen.getByText('المبلغ المتبقي للإرجاع:')).toBeInTheDocument();
    expect(screen.getByText('فائض نقدي')).toBeInTheDocument();
    expect(screen.getByText('الباقي للزبون')).toBeInTheDocument();
  });
});

