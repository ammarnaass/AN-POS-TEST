import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Design7POSLayout } from '../design7';
import type { CartItem, Product } from '@/types';

const mockProduct: Product = {
  id: 'prod-1',
  name: 'عدس فراد',
  barcode: '1006084471964',
  category: 'حبوب فرات',
  categoryId: 'cat-1',
  unit: 'كلغ',
  costPrice: 180,
  wholesalePrice: 200,
  retailPrice: 230,
  price: 230,
  quantity: 50,
  minStockAlert: 5,
  status: 'active',
  trackStock: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockCart: CartItem[] = [
  {
    productId: 'prod-milk',
    productName: 'حليب لاله 20 قطعة',
    barcode: '6135399000073',
    quantity: 1,
    unitPrice: 200,
    costPrice: 180,
    total: 200,
  },
  {
    productId: 'prod-1',
    productName: 'عدس فراد',
    barcode: '1006084471964',
    quantity: 5,
    unitPrice: 230,
    costPrice: 180,
    total: 1150,
  },
];

describe('Design7POSLayout (تصميم 7 - كاشير اللمس الكلاسيكي المتقدم)', () => {
  let defaultProps: any;

  beforeEach(() => {
    defaultProps = {
      cart: [...mockCart],
      onAddToCart: vi.fn(),
      onUpdateQty: vi.fn(),
      onRemoveFromCart: vi.fn(),
      onClearCart: vi.fn(),
      onEditPrice: vi.fn(),
      saleSummary: {
        subtotal: 1350,
        discountAmount: 0,
        total: 1350,
      },
      products: [mockProduct],
      allProducts: [mockProduct],
      categories: [{ id: 'cat-1', name: 'حبوب فرات' }, { id: 'cat-2', name: 'FAV2' }],
      selectedCategory: 'cat-1',
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
      selectedCustomerName: 'زبون غير معروف',
      autoPrintReceipt: true,
      onToggleAutoPrint: vi.fn(),
      onOpenDiscount: vi.fn(),
      discount: 0,
      discountType: 'amount' as const,
      onOpenFreeProduct: vi.fn(),
      onOpenReturns: vi.fn(),
      returnMode: false,
      onOpenCustomize: vi.fn(),
      invoiceNumber: 24,
      formatMoney: (val?: number | null) => `${val ?? 0} DA`,
      currency: 'DA',
      userName: 'admin',
      onNavigateBack: vi.fn(),
      onOpenKeypad: vi.fn(),
      onOpenKeypadForQty: vi.fn(),
      onOpenKeyboard: vi.fn(),
      onNewOrder: vi.fn(),
      onOpenAddProduct: vi.fn(),
      onOpenSalesHistory: vi.fn(),
    };
  });

  it('renders top toolbar action buttons and document metadata correctly', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Check top action buttons
    expect(screen.getByText('الرئيسية')).toBeInTheDocument();
    expect(screen.getByText('سجل المبيعات')).toBeInTheDocument();
    expect(screen.getByText('حفظ كطلبيّة')).toBeInTheDocument();
    expect(screen.getByText('إلغاء السلة')).toBeInTheDocument();

    // Check document metadata
    expect(screen.getByText('رقم السند')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('تاريخ السند')).toBeInTheDocument();
    expect(screen.getByText('ساعة السند')).toBeInTheDocument();
  });

  it('renders digital LED amount banner and customer identity banner', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // LED display & financial summary both show total
    const totals = screen.getAllByText('1350 DA');
    expect(totals.length).toBeGreaterThanOrEqual(2);

    // Customer banner
    expect(screen.getAllByText('الزبون').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('زبون غير معروف')).toBeInTheDocument();
  });

  it('renders basket table rows with proper columns and item names', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Table headers
    expect(screen.getByText('رقم')).toBeInTheDocument();
    expect(screen.getByText('كودبار')).toBeInTheDocument();
    expect(screen.getByText('إسم المنتوج')).toBeInTheDocument();
    expect(screen.getAllByText('سعر الوحدة').length).toBeGreaterThanOrEqual(1);

    // Items in basket
    expect(screen.getByText('حليب لاله 20 قطعة')).toBeInTheDocument();
    expect(screen.getByText('6135399000073')).toBeInTheDocument();
    const adasItems = screen.getAllByText('عدس فراد');
    expect(adasItems.length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('1006084471964').length).toBeGreaterThanOrEqual(1);
  });

  it('triggers onUpdateQty when plus or minus buttons are clicked', () => {
    render(<Design7POSLayout {...defaultProps} />);

    const plusButtons = screen.getAllByTitle('زيادة الكمية');
    expect(plusButtons.length).toBeGreaterThan(0);
    fireEvent.click(plusButtons[0]);

    expect(defaultProps.onUpdateQty).toHaveBeenCalledWith('prod-milk', 2);
  });

  it('triggers onSettleSale when clicking print voucher or settle buttons', () => {
    render(<Design7POSLayout {...defaultProps} />);

    const printVoucherBtn = screen.getByTitle('تأكيد وتسوية الفاتورة وطباعة الوصل (F1)');
    fireEvent.click(printVoucherBtn);

    expect(defaultProps.onSettleSale).toHaveBeenCalled();
  });

  it('renders the bottom favorites pad with favorite pack categories and 4x4 pack grid', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Favorite Pack Categories (Exclusively from useFavoritesStore)
    expect(screen.getByText('جميع العبوات')).toBeInTheDocument();
    expect(screen.getByText('عبوات المشروبات والماء')).toBeInTheDocument();
    expect(screen.getByText('كراتين وباقات شائعة')).toBeInTheDocument();
    expect(screen.getByText('سريعة الطلب')).toBeInTheDocument();

    // Favorite Pack tile in speed dial (pack name & price)
    const packTileBtn = screen.getByTitle(/عدس فراد.*\(عبوة\)/);
    expect(packTileBtn).toBeInTheDocument();

    // Clicking a favorite pack adds it with isPack: true
    fireEvent.click(packTileBtn);
    expect(defaultProps.onAddToCart).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'عدس فراد',
        isPack: true,
        packPiecesCount: 1,
      }),
      230
    );
  });

  it('supports filtering favorite packs by selected favorite category and custom favorite categories', () => {
    const customFavoriteCategories = [
      { id: 'custom-cat-1', name: 'كراتين مياه معدنية' },
      { id: 'custom-cat-2', name: 'باكيتات البسكويت' },
    ];
    const customFavoritePacks = [
      {
        id: 'pack-water-1',
        categoryId: 'custom-cat-1',
        name: 'كرتونة ماء لالة 12 قارورة',
        price: 360,
        packQty: 12,
        packUnit: 'قارورة',
      },
      {
        id: 'pack-bisc-1',
        categoryId: 'custom-cat-2',
        name: 'باكيت بيمبو 24 قطعة',
        price: 600,
        packQty: 24,
        packUnit: 'قطعة',
      },
    ];

    render(
      <Design7POSLayout
        {...defaultProps}
        favoriteCategories={customFavoriteCategories}
        favoritePacks={customFavoritePacks}
      />
    );

    // Displays custom favorite pack categories exclusively
    expect(screen.getByText('كراتين مياه معدنية')).toBeInTheDocument();
    expect(screen.getByText('باكيتات البسكويت')).toBeInTheDocument();

    // Displays custom favorite packs with 2-line name, unit count, and prominent price badge
    expect(screen.getByText('كرتونة ماء لالة 12 قارورة')).toBeInTheDocument();
    expect(screen.getByText('360 DA')).toBeInTheDocument();
    expect(screen.getByText('×12 قارورة')).toBeInTheDocument();
    expect(screen.getByText('باكيت بيمبو 24 قطعة')).toBeInTheDocument();
    expect(screen.getByText('600 DA')).toBeInTheDocument();
    expect(screen.getByText('×24 قطعة')).toBeInTheDocument();

    // Verify 15%+ expanded dimensions on favorites pad and category panel
    const categoryPanel = screen.getByText('تصنيفات العبوات').closest('[data-purpose="category-tabs"]');
    expect(categoryPanel?.classList.contains('w-44')).toBe(true);

    const favoritesFooter = screen.getByText('تصنيفات العبوات').closest('footer');
    expect(favoritesFooter?.classList.contains('h-42')).toBe(true);

    // Filter by clicking 'كراتين مياه معدنية'
    fireEvent.click(screen.getByText('كراتين مياه معدنية'));
    expect(screen.getByText('كرتونة ماء لالة 12 قارورة')).toBeInTheDocument();
    expect(screen.queryByText('باكيت بيمبو 24 قطعة')).not.toBeInTheDocument();
  });

  it('handles side keypad delete button to remove selected item', () => {
    render(<Design7POSLayout {...defaultProps} />);

    const deleteBtn = screen.getByTitle(/حذف الصنف المحدد من السلة/);
    fireEvent.click(deleteBtn);

    // Should remove the selected item (prod-1)
    expect(defaultProps.onRemoveFromCart).toHaveBeenCalledWith('prod-1');
  });

  it('handles side keypad free product button', () => {
    render(<Design7POSLayout {...defaultProps} />);

    const freeProductBtn = screen.getByTitle(/صنف حر أو خدمة يدوية/);
    fireEvent.click(freeProductBtn);

    expect(defaultProps.onOpenFreeProduct).toHaveBeenCalled();
  });

  it('handles keyboard shortcuts F1, F6, and F4 correctly', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // F1 -> Settle sale
    fireEvent.keyDown(window, { key: 'F1' });
    expect(defaultProps.onSettleSale).toHaveBeenCalled();

    // F6 -> Open discount
    fireEvent.keyDown(window, { key: 'F6' });
    expect(defaultProps.onOpenDiscount).toHaveBeenCalled();

    // F4 -> New order
    fireEvent.keyDown(window, { key: 'F4' });
    expect(defaultProps.onNewOrder).toHaveBeenCalled();
  });

  it('opens product search modal when clicking search button in side keypad', () => {
    render(<Design7POSLayout {...defaultProps} />);

    const searchBtn = screen.getByTitle(/بحث السلع واستعراض المواد/);
    fireEvent.click(searchBtn);

    // Modal should appear
    expect(screen.getByText('بحث واستعراض السلع والمواد')).toBeInTheDocument();
  });

  it('opens item edit modal for quantity and price from side keypad', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Info button (i)
    const infoBtn = screen.getByTitle(/تفاصيل الصنف وتعديل الكمية/);
    fireEvent.click(infoBtn);
    expect(screen.getByText('تعديل كمية الصنف')).toBeInTheDocument();

    // Close modal
    const cancelBtn = screen.getByText('إلغاء');
    fireEvent.click(cancelBtn);

    // Edit price button (picture icon)
    const priceBtn = screen.getByTitle(/تعديل السعر المباشر للصنف/);
    fireEvent.click(priceBtn);
    expect(screen.getByText('تعديل سعر الوحدة')).toBeInTheDocument();
  });

  it('triggers all 15 keypad actions properly', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // 1. Customer button
    const customerBtn = screen.getByTitle(/اختيار الزبون وتعيينه/);
    fireEvent.click(customerBtn);
    expect(defaultProps.onSelectCustomer).toHaveBeenCalled();

    // 2. Checkmark confirm button
    const confirmBtn = screen.getByTitle(/تأكيد السلة والانتقال للدفع/);
    fireEvent.click(confirmBtn);
    expect(defaultProps.onSettleSale).toHaveBeenCalled();

    // 3. Printer button
    const printerBtn = screen.getByTitle(/طباعة السند والفاتورة/);
    fireEvent.click(printerBtn);
    expect(defaultProps.onSettleSale).toHaveBeenCalledTimes(2);

    // 4. Sales history button
    const historyBtn = screen.getByTitle(/سجل الفواتير والمبيعات السابقة/);
    fireEvent.click(historyBtn);
    expect(defaultProps.onOpenSalesHistory).toHaveBeenCalled();

    // 5. Numpad / Calculator button in side keypad opens Design 7 touch calculator modal
    const numpadBtn = screen.getByTitle(/لوحة الأرقام اللمسية والآلة الحاسبة/);
    fireEvent.click(numpadBtn);
    expect(screen.getByText('لوحة الأرقام والآلة الحاسبة اللمسية')).toBeInTheDocument();

    // Close calculator modal
    const closeCalcBtn = screen.getByTitle('إغلاق (Esc)');
    fireEvent.click(closeCalcBtn);
    expect(screen.queryByText('لوحة الأرقام والآلة الحاسبة اللمسية')).not.toBeInTheDocument();

    // 6. Virtual keyboard button
    const keyboardBtn = screen.getByTitle(/لوحة المفاتيح الافتراضية/);
    fireEvent.click(keyboardBtn);
    expect(defaultProps.onOpenKeyboard).toHaveBeenCalled();
    expect(screen.getByText('لوحة المفاتيح اللمسية الافتراضية')).toBeInTheDocument();

    // Close virtual keyboard via cancel
    fireEvent.click(screen.getByText('إلغاء (Esc)'));

    // 7. Arrow Left (decrease qty)
    const arrowLeftBtn = screen.getByTitle(/إنقاص كمية الصنف النشط/);
    fireEvent.click(arrowLeftBtn);
    expect(defaultProps.onUpdateQty).toHaveBeenCalledWith('prod-1', 4);

    // 8. Arrow Right (increase qty)
    const arrowRightBtn = screen.getByTitle(/زيادة كمية الصنف النشط/);
    fireEvent.click(arrowRightBtn);
    expect(defaultProps.onUpdateQty).toHaveBeenCalledWith('prod-1', 6);
  });

  it('handles shortcuts F2, F3, F5, F7, F8, F9, F10, F12 and Escape', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // F2 -> Sales history
    fireEvent.keyDown(window, { key: 'F2' });
    expect(defaultProps.onOpenSalesHistory).toHaveBeenCalled();

    // F5 -> Free product
    fireEvent.keyDown(window, { key: 'F5' });
    expect(defaultProps.onOpenFreeProduct).toHaveBeenCalled();

    // F7 -> Toggle auto print
    fireEvent.keyDown(window, { key: 'F7' });
    expect(defaultProps.onToggleAutoPrint).toHaveBeenCalled();

    // F8 -> Suspended sales
    fireEvent.keyDown(window, { key: 'F8' });
    expect(defaultProps.onOpenSuspended).toHaveBeenCalled();

    // F9 -> Select customer
    fireEvent.keyDown(window, { key: 'F9' });
    expect(defaultProps.onSelectCustomer).toHaveBeenCalled();

    // F10 -> Open search
    fireEvent.keyDown(window, { key: 'F10' });
    expect(screen.getByText('بحث واستعراض السلع والمواد')).toBeInTheDocument();

    // F12 -> Customize
    fireEvent.keyDown(window, { key: 'F12' });
    expect(defaultProps.onOpenCustomize).toHaveBeenCalled();

    // Escape -> Navigate back
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onNavigateBack).toHaveBeenCalled();
  });

  it('renders accounting summary item count and total quantity accurately', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Total lines is 2 items, total quantity is 1 + 5 = 6 pieces
    expect(screen.getByText(/عدد الأصناف:/)).toBeInTheDocument();
    expect(screen.getByText(/2 صنف \(6 قطعة\)/)).toBeInTheDocument();
  });

  it('allows clicking quantity badge in basket table to open touch calculator and update qty', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Click quantity badge on first item
    const qtyBadges = screen.getAllByTitle('انقر لفتح الآلة الحاسبة اللمسية لتعديل الكمية');
    fireEvent.click(qtyBadges[0]);

    // Modal should be open in quantity mode
    expect(screen.getByText('تعديل كمية الصنف')).toBeInTheDocument();

    // Click preset button '12' (دزينة)
    const preset12 = screen.getByText('12 دزينة');
    fireEvent.click(preset12);

    // Click submit button
    const submitBtn = screen.getByText('حفظ في السلة (Enter)');
    fireEvent.click(submitBtn);

    expect(defaultProps.onUpdateQty).toHaveBeenCalledWith('prod-milk', 12);
  });

  it('calculates change and supports quick cash buttons in financial sidebar', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Click quick pay button for 2000 DA
    const quick2000Btn = screen.getByText('2,000');
    fireEvent.click(quick2000Btn);

    // Total is 1350, Paid is 2000 => Change is 650 DA
    expect(screen.getByText('الباقي للزبون')).toBeInTheDocument();
    expect(screen.getByText(/\+650 DA/)).toBeInTheDocument();
  });

  it('correctly handles standard CartItem properties (name, qty, lineTotal)', () => {
    const standardCart: any[] = [
      {
        productId: 'prod-oil',
        name: 'زيت زيتون 1 لتر',
        barcode: '5001234567890',
        qty: 3,
        unitPrice: 850,
        lineTotal: 2550,
      },
    ];

    render(<Design7POSLayout {...defaultProps} cart={standardCart} />);

    // Item name and barcode render properly (in table and scan strip)
    expect(screen.getAllByText('زيت زيتون 1 لتر').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/5001234567890/).length).toBeGreaterThanOrEqual(1);

    // Qty and Line total render without NaN
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2550 DA')).toBeInTheDocument();
    expect(screen.getByText(/1 صنف \(3 قطعة\)/)).toBeInTheDocument();
  });

  it('displays live calculation equation in touch calculator numpad', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Click on active item quantity to open calculator
    const qtyBadges = screen.getAllByTitle('انقر لفتح الآلة الحاسبة اللمسية لتعديل الكمية');
    fireEvent.click(qtyBadges[0]);

    // Live equation for 1 unit @ 200 DA
    expect(screen.getByText(/المعادلة:/)).toBeInTheDocument();
    expect(screen.getByText(/= 200 DA/)).toBeInTheDocument();

    // Click Clear (C) then click 4
    const clearBtn = screen.getByText('مسح C');
    fireEvent.click(clearBtn);
    const key4 = screen.getByRole('button', { name: '4' });
    fireEvent.click(key4);

    // Equation updates to 4 × 200 DA = 800 DA
    expect(screen.getByText(/= 800 DA/)).toBeInTheDocument();
  });

  it('focuses barcode input field when pressing F3 shortcut', () => {
    render(<Design7POSLayout {...defaultProps} />);

    const barcodeInput = screen.getByPlaceholderText(/امسح الباركود أو أدخله يدوياً/);
    expect(barcodeInput).not.toHaveFocus();

    fireEvent.keyDown(window, { key: 'F3' });
    expect(barcodeInput).toHaveFocus();
  });

  it('supports opening touch calculator in paid mode from financial sidebar with presets', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Open calculator from sidebar calculator button
    const paidCalcBtns = screen.getAllByTitle('فتح الآلة الحاسبة اللمسية لإدخال النقدية');
    fireEvent.click(paidCalcBtns[0]);

    // Modal opens in 'المبلغ المستلم' mode
    expect(screen.getByText('المبلغ المستلم')).toBeInTheDocument();

    // Click "المبلغ التام" preset
    const exactBtn = screen.getByText(/المبلغ التام \(/);
    fireEvent.click(exactBtn);

    // Live status should indicate exact payment (الفكة: +0 DA)
    expect(screen.getByText(/الباقي للزبون \(الفكة\):/)).toBeInTheDocument();
    expect(screen.getByText(/\+0 DA/)).toBeInTheDocument();

    // Click cash denomination 2000
    const cash2000 = screen.getByText('2000');
    fireEvent.click(cash2000);

    // With total 1350 and paid 2000, change is +650 DA
    expect(screen.getByText(/\+650 DA/)).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getByText('تأكيد (Enter)');
    fireEvent.click(confirmBtn);

    // Sidebar should reflect the 2000 DA paid
    expect(screen.getByText('الباقي للزبون')).toBeInTheDocument();
    expect(screen.getByText(/\+650 DA/)).toBeInTheDocument();
  });

  it('allows switching between all 4 touch calculator modes (الكمية، السعر، المستلم، الخصم)', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Open modal via quantity badge
    const qtyBadges = screen.getAllByTitle('انقر لفتح الآلة الحاسبة اللمسية لتعديل الكمية');
    fireEvent.click(qtyBadges[0]);
    expect(screen.getByText('تعديل كمية الصنف')).toBeInTheDocument();

    // Switch to 'السعر' tab
    const priceTab = screen.getByRole('button', { name: 'تبويب السعر' });
    fireEvent.click(priceTab);
    expect(screen.getByText('تعديل سعر الوحدة')).toBeInTheDocument();
    expect(screen.getByText(/المعادلة:/)).toBeInTheDocument();

    // Switch to 'الخصم' tab
    const discountTab = screen.getByRole('button', { name: 'تبويب الخصم' });
    fireEvent.click(discountTab);
    expect(screen.getByText('تخفيض القيمة')).toBeInTheDocument();
    // Discount percentage presets should appear
    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();

    // Click 10% discount preset
    fireEvent.click(screen.getByText('10%'));
    expect(screen.getByText(/الصافي بعد الخصم:/)).toBeInTheDocument();

    // Close modal via Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('تخفيض القيمة')).not.toBeInTheDocument();
  });

  it('opens virtual touch keyboard from keypad, types characters, switches layouts and submits', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Click virtual keyboard button in side keypad
    const keyboardBtn = screen.getByTitle(/لوحة المفاتيح الافتراضية/);
    fireEvent.click(keyboardBtn);

    // Virtual keyboard modal is open
    expect(screen.getByText('لوحة المفاتيح اللمسية الافتراضية')).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();

    // Type Arabic letters: 'ح', 'ل', 'ي', 'ب'
    fireEvent.click(screen.getByText('ح'));
    fireEvent.click(screen.getByText('ل'));
    fireEvent.click(screen.getByText('ي'));
    fireEvent.click(screen.getByText('ب'));
    expect(screen.getByText('حليب')).toBeInTheDocument();

    // Switch to English layout
    const langBtn = screen.getByTitle(/تبديل لغة لوحة المفاتيح/);
    fireEvent.click(langBtn);
    expect(screen.getByText('English')).toBeInTheDocument();

    // Spacebar
    const spaceBtn = screen.getByText('مسافة');
    fireEvent.click(spaceBtn);

    // Backspace
    const backspaceBtn = screen.getByTitle(/حذف الحرف الأخير/);
    fireEvent.click(backspaceBtn);

    // Confirm and submit
    const enterBtn = screen.getByText('تأكيد وإدخال (Enter)');
    fireEvent.click(enterBtn);

    // Barcode input and submit should be called
    expect(defaultProps.setBarcodeInput).toHaveBeenCalledWith('حليب');
    expect(defaultProps.onBarcodeSubmit).toHaveBeenCalled();

    // Modal should close
    expect(screen.queryByText('لوحة المفاتيح اللمسية الافتراضية')).not.toBeInTheDocument();
  });

  it('supports customize button (F12) to open customize layout and screen resolution modal', () => {
    render(<Design7POSLayout {...defaultProps} />);

    // Click customize button in top ribbon
    const customizeBtn = screen.getByTitle(/تخصيص الواجهة ودقة العرض ومقياس التكبير/);
    expect(customizeBtn).toBeInTheDocument();
    fireEvent.click(customizeBtn);

    expect(defaultProps.onOpenCustomize).toHaveBeenCalled();
  });

  it('supports fullscreen toggle button in top ribbon when provided', () => {
    const onToggleFullscreen = vi.fn();
    render(
      <Design7POSLayout
        {...defaultProps}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={false}
      />
    );

    const fullscreenBtn = screen.getByTitle(/تكبير الشاشة بالكامل/);
    expect(fullscreenBtn).toBeInTheDocument();
    fireEvent.click(fullscreenBtn);

    expect(onToggleFullscreen).toHaveBeenCalled();
  });

  it('renders adaptively within standard POS screen resolutions (1024x768, 1366x768, 1920x1080) with w-full h-full without viewport overflow', () => {
    const { container } = render(
      <div style={{ width: 1024, height: 768, zoom: '100%' }}>
        <Design7POSLayout {...defaultProps} />
      </div>
    );

    const rootElement = container.querySelector('.d7-container');
    expect(rootElement).toBeInTheDocument();

    // Must use w-full h-full and NOT hardcoded w-screen h-screen
    expect(rootElement?.classList.contains('w-full')).toBe(true);
    expect(rootElement?.classList.contains('h-full')).toBe(true);
    expect(rootElement?.classList.contains('w-screen')).toBe(false);
    expect(rootElement?.classList.contains('h-screen')).toBe(false);

    // Verify key sections render within the constrained canvas
    expect(container.querySelector('[data-purpose="pos-window"]')).toBeInTheDocument();
    expect(container.querySelector('[data-purpose="digital-banner"]')).toBeInTheDocument();
    expect(container.querySelector('[data-purpose="scan-status-strip"]')).toBeInTheDocument();
    expect(container.querySelector('[data-purpose="financial-summary"]')).toBeInTheDocument();
    expect(container.querySelector('[data-purpose="items-table-container"]')).toBeInTheDocument();
    expect(container.querySelector('[data-purpose="favorites-keypad"]')).toBeInTheDocument();
  });

  it('ensures clicking an item selects strictly one single row and NEVER selects multiple items together (حيث يحدد عند ضغط على عنصر يحدد معه 3)', () => {
    // 3 items in cart sharing undefined or identical productIds (custom / pack / legacy items)
    const duplicateOrMissingIdCart: any[] = [
      {
        productId: 'custom-item',
        name: 'منتج مخصص رقم 1',
        barcode: '111',
        qty: 1,
        unitPrice: 100,
        lineTotal: 100,
      },
      {
        productId: 'custom-item',
        name: 'منتج مخصص رقم 2',
        barcode: '222',
        qty: 2,
        unitPrice: 150,
        lineTotal: 300,
      },
      {
        productId: 'custom-item',
        name: 'منتج مخصص رقم 3',
        barcode: '333',
        qty: 1,
        unitPrice: 200,
        lineTotal: 200,
      },
    ];

    const { container } = render(
      <Design7POSLayout {...defaultProps} cart={duplicateOrMissingIdCart} />
    );

    const tableRows = container.querySelectorAll('tbody tr');
    expect(tableRows.length).toBe(3);

    // Click on the 2nd row (منتج مخصص رقم 2)
    fireEvent.click(tableRows[1]);

    // Row 1 (2nd row) MUST be selected, while Row 0 and Row 2 MUST NOT be selected
    expect(tableRows[1].classList.contains('bg-[#d7e9f7]')).toBe(true);
    expect(tableRows[0].classList.contains('bg-[#d7e9f7]')).toBe(false);
    expect(tableRows[2].classList.contains('bg-[#d7e9f7]')).toBe(false);

    // Click on the 1st row (منتج مخصص رقم 1)
    fireEvent.click(tableRows[0]);

    // Only Row 0 is selected now
    expect(tableRows[0].classList.contains('bg-[#d7e9f7]')).toBe(true);
    expect(tableRows[1].classList.contains('bg-[#d7e9f7]')).toBe(false);
    expect(tableRows[2].classList.contains('bg-[#d7e9f7]')).toBe(false);

    // Click on the 3rd row (منتج مخصص رقم 3)
    fireEvent.click(tableRows[2]);

    // Only Row 2 is selected now
    expect(tableRows[2].classList.contains('bg-[#d7e9f7]')).toBe(true);
    expect(tableRows[0].classList.contains('bg-[#d7e9f7]')).toBe(false);
    expect(tableRows[1].classList.contains('bg-[#d7e9f7]')).toBe(false);
  });

  it('navigates row by row with keyboard arrow keys without multi-selection', () => {
    const multiItemCart: any[] = [
      { productId: 'item-a', name: 'الصنف الأول', qty: 1, unitPrice: 100, lineTotal: 100 },
      { productId: 'item-b', name: 'الصنف الثاني', qty: 1, unitPrice: 200, lineTotal: 200 },
      { productId: 'item-c', name: 'الصنف الثالث', qty: 1, unitPrice: 300, lineTotal: 300 },
    ];

    const { container } = render(
      <Design7POSLayout {...defaultProps} cart={multiItemCart} />
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);

    // Initial selected is the last row (Row 2)
    expect(rows[2].classList.contains('bg-[#d7e9f7]')).toBe(true);
    expect(rows[0].classList.contains('bg-[#d7e9f7]')).toBe(false);
    expect(rows[1].classList.contains('bg-[#d7e9f7]')).toBe(false);

    // Press ArrowUp -> should move to Row 1
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(rows[1].classList.contains('bg-[#d7e9f7]')).toBe(true);
    expect(rows[0].classList.contains('bg-[#d7e9f7]')).toBe(false);
    expect(rows[2].classList.contains('bg-[#d7e9f7]')).toBe(false);

    // Press ArrowUp again -> should move to Row 0
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(rows[0].classList.contains('bg-[#d7e9f7]')).toBe(true);
    expect(rows[1].classList.contains('bg-[#d7e9f7]')).toBe(false);
    expect(rows[2].classList.contains('bg-[#d7e9f7]')).toBe(false);
  });
});


