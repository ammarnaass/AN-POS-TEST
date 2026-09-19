import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdvancedTerminalPOSLayout } from '../AdvancedTerminalPOSLayout';
import type { CartItem, Product } from '@/types';

describe('AdvancedTerminalPOSLayout (تصميم 6 - نقطة البيع المتقدمة)', () => {
  const mockCart: CartItem[] = [
    {
      productId: 'prod-water',
      name: 'مياه معدنية لالة خديجة 1.5 لتر',
      qty: 2,
      unitPrice: 45,
      lineTotal: 90,
      barcode: '6130141001',
    } as any,
    {
      productId: 'prod-choc',
      name: 'شوكولاتة ميلكا بالبندق 100 غ',
      qty: 1,
      unitPrice: 280,
      lineTotal: 280,
      barcode: '7622210604',
    } as any,
    {
      productId: 'prod-coffee',
      name: 'قهوة مطحونة فاميكو بور موكا 250 غ',
      qty: 3,
      unitPrice: 360,
      lineTotal: 1080,
      barcode: '6131445012',
      isOffer: true,
    } as any,
  ];

  const defaultProps = {
    cart: mockCart,
    onAddToCart: vi.fn(),
    onUpdateQty: vi.fn(),
    onRemoveFromCart: vi.fn(),
    onClearCart: vi.fn(),
    onEditPrice: vi.fn(),
    saleSummary: {
      subtotal: 1450,
      discountAmount: 0,
      total: 1450,
      tvaAmount: 231.51,
    },
    products: [] as Product[],
    allProducts: [] as Product[],
    categories: [],
    selectedCategory: 'all',
    onSelectCategory: vi.fn(),
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
    selectedCustomerName: 'زبون عام (نقداً)',
    autoPrintReceipt: true,
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
    priceTier: '1' as const,
    onSelectPriceTier: vi.fn(),
    onNewOrder: vi.fn(),
    invoiceNumber: 1,
    formatMoney: (val?: number) => (val !== undefined ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'),
    currency: 'دج',
    userName: 'المسؤول',
    isSessionOpen: true,
    isSalePending: false,
    onToggleFullscreen: vi.fn(),
    isFullscreen: false,
    onNavigateBack: vi.fn(),
  };

  it('renders top operational functional buttons with exact labels, shortcuts, and verified flexy hidden', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    // 1. تأكيد ودفع F1
    expect(screen.getByText('تأكيد ودفع')).toBeInTheDocument();
    expect(screen.getAllByText('F1').length).toBeGreaterThanOrEqual(1);

    // 2. سجل المبيعات / مرتجع F2
    expect(screen.getByText('سجل / مرتجع')).toBeInTheDocument();
    expect(screen.getByText('F2')).toBeInTheDocument();

    // 3. دفع سريع F7
    expect(screen.getByText('دفع سريع')).toBeInTheDocument();
    expect(screen.getByText('F7')).toBeInTheDocument();

    // 4. خصم الفاتورة F6
    expect(screen.getByText('خصم الفاتورة')).toBeInTheDocument();
    expect(screen.getByText('F6')).toBeInTheDocument();

    // 5. إلغاء الوصل F8
    expect(screen.getByText('إلغاء الوصل')).toBeInTheDocument();
    expect(screen.getByText('F8')).toBeInTheDocument();

    // 6. وصل جديد F9
    expect(screen.getByText('وصل جديد')).toBeInTheDocument();
    expect(screen.getByText('F9')).toBeInTheDocument();

    // 7. في الانتظار F12
    expect(screen.getByText('في الانتظار')).toBeInTheDocument();
    expect(screen.getByText('(3) F12')).toBeInTheDocument();

    // 8. تعريفة 1 (تجزئة)
    expect(screen.getByText('تعريفة 1')).toBeInTheDocument();
    expect(screen.getByText('تجزئة')).toBeInTheDocument();

    // 9. التحقق من إخفاء زر تعبئة رصيد فليكسي
    expect(screen.queryByText('تعبئة رصيد')).not.toBeInTheDocument();
    expect(screen.queryByText('فليكسي نت')).not.toBeInTheDocument();

    // 10. قفل المحطة
    expect(screen.getByText('قفل المحطة')).toBeInTheDocument();
    expect(screen.getByText('LOCK')).toBeInTheDocument();

    // شارات المحطة والاتصال
    expect(screen.getByText('متصل (أونلاين)')).toBeInTheDocument();
    expect(screen.getByText('S19C150-POS')).toBeInTheDocument();
  });

  it('supports direct cart row quantity adjustments and clear cart', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    // زيادة الكمية (+1) للسطر الأول
    const plusBtns = screen.getAllByTitle('زيادة الكمية (+1)');
    expect(plusBtns.length).toBe(3);
    fireEvent.click(plusBtns[0]);
    expect(defaultProps.onUpdateQty).toHaveBeenCalledWith('prod-water', 3);

    // إنقاص الكمية (-1) للسطر الأول
    const minusBtns = screen.getAllByTitle('إنقاص الكمية (-1)');
    expect(minusBtns.length).toBe(2);
    fireEvent.click(minusBtns[0]);
    expect(defaultProps.onUpdateQty).toHaveBeenCalledWith('prod-water', 1);

    // إلغاء الوصل بالكامل (F8)
    const clearCartBtn = screen.getByTitle('إلغاء وتفريغ الوصل بالكامل (F8)');
    fireEvent.click(clearCartBtn);
    expect(defaultProps.onClearCart).toHaveBeenCalled();
  });

  it('renders the giant neon live display and receipt info', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    // المبلغ الإجمالي الكبير 1,450.00
    const giantDigits = screen.getAllByText('1,450.00');
    expect(giantDigits.length).toBeGreaterThan(0);

    // بطاقة الزبون
    expect(screen.getByText('زبون عام (نقداً)')).toBeInTheDocument();

    // رقم الوصل النشط 0000001
    expect(screen.getByText('0000001')).toBeInTheDocument();
  });

  it('renders the sales data table with items, special offer badge and placeholders', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    // بنود السلة الثلاثة
    expect(screen.getByText('مياه معدنية لالة خديجة 1.5 لتر')).toBeInTheDocument();
    expect(screen.getByText('شوكولاتة ميلكا بالبندق 100 غ')).toBeInTheDocument();
    expect(screen.getByText('قهوة مطحونة فاميكو بور موكا 250 غ')).toBeInTheDocument();

    // شارة العرض الخاص
    expect(screen.getByText('عرض خاص')).toBeInTheDocument();

    // أسطر الانتظار الفارغة (Placeholder)
    const placeholders = screen.getAllByText('في انتظار إدخال المادة...');
    expect(placeholders.length).toBeGreaterThan(0);

    // تذييل إحصائيات الجدول
    expect(screen.getByText('عدد الأسطر:')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('إجمالي القطع:')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument(); // 2 + 1 + 3 = 6
  });

  it('calculates change accurately when cash denomination buttons are clicked', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    // النقر على زر فئة 2000 دج
    const btn2000 = screen.getByText('2000 دج');
    fireEvent.click(btn2000);

    // المقبوض أصبح 2000 والفكة أصبحت 550 (2000 - 1450 = 550)
    expect(screen.getByText('2,000.00')).toBeInTheDocument();
    expect(screen.getByText('550.00')).toBeInTheDocument();
  });

  it('renders the 2x8 favorites grid and triggers item addition', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    expect(screen.getByText('الأزرار السريعة والمفضلة (FAV)')).toBeInTheDocument();
    expect(screen.getByText('صفحة 1/2')).toBeInTheDocument();

    // سلع المفضلة الظاهرة
    expect(screen.getByText('باجيت (خبز)')).toBeInTheDocument();
    expect(screen.getByText('حليب 25 دج')).toBeInTheDocument();
    expect(screen.getByText('كيس 10 دج')).toBeInTheDocument();

    // النقر على باجيت خبز يضيف المادة
    const baguetteBtn = screen.getByText('باجيت (خبز)');
    fireEvent.click(baguetteBtn);

    expect(defaultProps.onAddToCart).toHaveBeenCalled();
  });

  it('allows toggling between favorites mode and retail products mode in bottom pad', () => {
    const mockProducts: Product[] = [
      {
        id: 'prod-milk',
        name: 'حليب كونديا معقم 1 لتر',
        barcode: '6130001',
        sku: 'MILK-1L',
        unit: 'علبة',
        costPrice: 90,
        retailPrice: 120,
        wholesalePrice: 110,
        wholesaleMinQty: 6,
        quantity: 50,
        lowStockThreshold: 5,
        category: 'ألبان',
        status: 'active',
      },
    ];

    render(<AdvancedTerminalPOSLayout {...defaultProps} products={mockProducts} />);

    // Initially in Favorites Mode
    expect(screen.getByText('المفضلة والعبوات')).toBeInTheDocument();
    expect(screen.getByText('سلع التجزئة')).toBeInTheDocument();

    // Switch to Retail Products Mode
    const retailTabBtn = screen.getByText('سلع التجزئة');
    fireEvent.click(retailTabBtn);

    // Retail product should be visible
    expect(screen.getByText('حليب كونديا معقم 1 لتر')).toBeInTheDocument();
    expect(screen.getAllByText('تجزئة').length).toBeGreaterThanOrEqual(2);

    // Clicking retail product calls onAddToCart
    fireEvent.click(screen.getByText('حليب كونديا معقم 1 لتر'));
    expect(defaultProps.onAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'حليب كونديا معقم 1 لتر' }),
      120
    );
  });

  it('renders bottom system status bar matching the hardware display specs', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    expect(screen.getByText('EPSON TM-T20III (جاهزة)')).toBeInTheDocument();
    expect(screen.getByText('قاعدة البيانات المحلية:')).toBeInTheDocument();
    expect(screen.getByText('متصلة')).toBeInTheDocument();
    expect(screen.getByText('SAMSUNG S19C150')).toBeInTheDocument();
    expect(screen.getByText('V 4.8.2 PRO')).toBeInTheDocument();
  });

  it('triggers touch D-Pad interactions and quick actions', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    const confirmBtn = screen.getByTitle('تأكيد / الانتقال للدفع (Enter)');
    fireEvent.click(confirmBtn);

    expect(defaultProps.onSettleSale).toHaveBeenCalled();
  });

  it('provides screen compatibility features: navigation back, fullscreen toggle, customization, and top bar collapse', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    // 1. زر الرجوع/الخروج (موجود في الشريط العلوي + الشريط الجانبي الأيسر)
    const backBtns = screen.getAllByTitle(/الخروج إلى لوحة التحكم الرئيسية|الرجوع إلى الصفحة الرئيسية/);
    expect(backBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(backBtns[0]);
    expect(defaultProps.onNavigateBack).toHaveBeenCalled();

    // 2. زر تكبير الواجهة / ملء الشاشة
    const fullscreenBtn = screen.getByTitle('تكبير الواجهة وملء الشاشة (F11)');
    expect(fullscreenBtn).toBeInTheDocument();
    fireEvent.click(fullscreenBtn);
    expect(defaultProps.onToggleFullscreen).toHaveBeenCalled();

    // 3. زر تخصيص التصميم
    const customizeBtn = screen.getByTitle('تخصيص الواجهة واختيار القوالب');
    expect(customizeBtn).toBeInTheDocument();
    fireEvent.click(customizeBtn);
    expect(defaultProps.onOpenCustomize).toHaveBeenCalled();

    // 4. زر إخفاء الشريط العلوي (Collapse)
    const collapseBtn = screen.getByTitle('إخفاء الشريط العلوي لتكبير مساحة الشاشة');
    expect(collapseBtn).toBeInTheDocument();
    fireEvent.click(collapseBtn);

    // التحقق من ظهور الشريط المضغوط البديل
    expect(screen.getByTitle('إظهار شريط الأوامر الكامل (F1-F12)')).toBeInTheDocument();

    // استعادة الشريط الكامل
    const expandBtn = screen.getByTitle('إظهار شريط الأوامر الكامل (F1-F12)');
    fireEvent.click(expandBtn);

    // التأكد من عودة شريط F1-F12
    expect(screen.getByText('وصل جديد')).toBeInTheDocument();
  });

  it('activates price edit mode and allows inline price updates via F4', () => {
    const onEditPrice = vi.fn();
    render(<AdvancedTerminalPOSLayout {...defaultProps} onEditPrice={onEditPrice} />);

    // 1. النقر على زر F4 السعر
    const priceBtn = screen.getByTitle('تعديل سعر الصنف المحدد في السلة (F4)');
    expect(priceBtn).toBeInTheDocument();
    fireEvent.click(priceBtn);

    // 2. يظهر حقل إدخال السعر في جدول المبيعات
    const confirmPriceBtn = screen.getByTitle('تأكيد السعر (Enter)');
    expect(confirmPriceBtn).toBeInTheDocument();

    // 3. النقر على تأكيد السعر يستدعي onEditPrice
    fireEvent.click(confirmPriceBtn);
    expect(onEditPrice).toHaveBeenCalled();
  });

  it('opens product search modal when clicking search button F10', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    // 1. زر بحث السلع F10 في الشريط الجانبي
    const searchBtn = screen.getByTitle('البحث السريع واستعراض قائمة السلع (F10)');
    expect(searchBtn).toBeInTheDocument();
    fireEvent.click(searchBtn);

    // 2. تظهر نافذة بحث واستعراض السلع والمواد
    expect(screen.getByText('بحث واستعراض السلع والمواد')).toBeInTheDocument();

    // 3. إغلاق النافذة
    const closeBtn = screen.getByTitle('إغلاق (Esc)');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('بحث واستعراض السلع والمواد')).not.toBeInTheDocument();
  });

  it('triggers onOpenAddProduct when clicking add button with empty input', () => {
    const onOpenAddProduct = vi.fn();
    render(<AdvancedTerminalPOSLayout {...defaultProps} onOpenAddProduct={onOpenAddProduct} />);

    // زر إضافة (+) والحقل فارغ
    const addBtn = screen.getByTitle('إضافة منتج جديد للمحل');
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);

    expect(onOpenAddProduct).toHaveBeenCalled();
  });

  it('handles F1-F12 and modal Escape keyboard shortcuts correctly', () => {
    const onSettleSale = vi.fn();
    const onOpenReturns = vi.fn();
    const onOpenFreeProduct = vi.fn();
    const onOpenDiscount = vi.fn();
    const onClearCart = vi.fn();
    const onNewOrder = vi.fn();
    const onOpenSuspended = vi.fn();
    const onNavigateBack = vi.fn();

    render(
      <AdvancedTerminalPOSLayout
        {...defaultProps}
        onSettleSale={onSettleSale}
        onOpenReturns={onOpenReturns}
        onOpenFreeProduct={onOpenFreeProduct}
        onOpenDiscount={onOpenDiscount}
        onClearCart={onClearCart}
        onNewOrder={onNewOrder}
        onOpenSuspended={onOpenSuspended}
        onNavigateBack={onNavigateBack}
        suspendedCount={3}
      />
    );

    // F1 -> onSettleSale
    fireEvent.keyDown(window, { key: 'F1' });
    expect(onSettleSale).toHaveBeenCalledTimes(1);

    // F2 -> onOpenReturns
    fireEvent.keyDown(window, { key: 'F2' });
    expect(onOpenReturns).toHaveBeenCalledTimes(1);

    // F5 -> onOpenFreeProduct
    fireEvent.keyDown(window, { key: 'F5' });
    expect(onOpenFreeProduct).toHaveBeenCalledTimes(1);

    // F6 -> onOpenDiscount
    fireEvent.keyDown(window, { key: 'F6' });
    expect(onOpenDiscount).toHaveBeenCalledTimes(1);

    // F7 -> Quick Settle (also calls onSettleSale)
    fireEvent.keyDown(window, { key: 'F7' });
    expect(onSettleSale).toHaveBeenCalledTimes(2);

    // F8 -> onClearCart
    fireEvent.keyDown(window, { key: 'F8' });
    expect(onClearCart).toHaveBeenCalledTimes(1);

    // F9 -> onNewOrder
    fireEvent.keyDown(window, { key: 'F9' });
    expect(onNewOrder).toHaveBeenCalledTimes(1);

    // F12 -> onOpenSuspended (since suspendedCount > 0)
    fireEvent.keyDown(window, { key: 'F12' });
    expect(onOpenSuspended).toHaveBeenCalledTimes(1);

    // F10 -> Opens Product Search Modal
    fireEvent.keyDown(window, { key: 'F10' });
    expect(screen.getByText('بحث واستعراض السلع والمواد')).toBeInTheDocument();

    // Escape while modal is open -> Closes modal and DOES NOT call onNavigateBack
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('بحث واستعراض السلع والمواد')).not.toBeInTheDocument();
    expect(onNavigateBack).not.toHaveBeenCalled();

    // Escape when no modal is open -> Calls onNavigateBack
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onNavigateBack).toHaveBeenCalledTimes(1);
  });

  it('renders and supports toggling between Day (Light) and Night (Dark) mode', () => {
    render(<AdvancedTerminalPOSLayout {...defaultProps} />);

    // 1. Check Day/Night toggle button exists in full top bar
    const themeBtn = screen.getByTitle(/التحويل إلى الوضع (النهاري|الليلي)/);
    expect(themeBtn).toBeInTheDocument();

    // 2. Click to toggle
    fireEvent.click(themeBtn);

    // 3. Now collapse the top bar
    const collapseBtn = screen.getByTitle('إخفاء الشريط العلوي لتكبير مساحة الشاشة');
    fireEvent.click(collapseBtn);

    // 4. Check Day/Night toggle button exists in collapsed top bar and can be clicked
    const collapsedThemeBtn = screen.getByTitle(/التحويل إلى الوضع (النهاري|الليلي)/);
    expect(collapsedThemeBtn).toBeInTheDocument();
    fireEvent.click(collapsedThemeBtn);
  });

  it('correctly retrieves and displays barcodes for cart items including items missing direct barcode', () => {
    const productsWithBarcodes: Product[] = [
      {
        id: 'prod-juice',
        name: 'عصير رامي برتقال 1 لتر',
        barcode: '6130999888',
        sku: 'RAMY-ORANGE',
        retailPrice: 150,
      } as any,
    ];

    const cartWithoutDirectBarcode: CartItem[] = [
      {
        productId: 'prod-juice',
        name: 'عصير رامي برتقال 1 لتر',
        qty: 1,
        unitPrice: 150,
        lineTotal: 150,
        // barcode is missing intentionally to test dynamic retrieval
      } as any,
    ];

    render(
      <AdvancedTerminalPOSLayout
        {...defaultProps}
        cart={cartWithoutDirectBarcode}
        products={productsWithBarcodes}
        allProducts={productsWithBarcodes}
      />
    );

    // The table should dynamically resolve and display the barcode '6130999888'
    expect(screen.getByText('6130999888')).toBeInTheDocument();
  });

  it('triggers onSettleSale when Enter is pressed on empty barcode input and cart has items', () => {
    const onSettleSale = vi.fn();
    const onOpenAddProduct = vi.fn();

    render(
      <AdvancedTerminalPOSLayout
        {...defaultProps}
        cart={mockCart}
        onSettleSale={onSettleSale}
        onOpenAddProduct={onOpenAddProduct}
        barcodeInput=""
      />
    );

    const barcodeField = screen.getByPlaceholderText('مسح الباركود أو ادخل اسم السلعة...');
    fireEvent.submit(barcodeField.closest('form')!);

    expect(onSettleSale).toHaveBeenCalledTimes(1);
    expect(onOpenAddProduct).not.toHaveBeenCalled();
  });
});
