import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { POSSalePaymentConfirmation } from '../components/POSSalePaymentConfirmation';

describe('POSSalePaymentConfirmation — المعمارية القوية لإتمام عملية الدفع', () => {
  const mockCart = [
    {
      productId: 'p1',
      name: 'قهوة سريعة التحضير 200غ',
      barcode: '6130002',
      unitPrice: 450,
      qty: 2,
      lineTotal: 900,
      unit: 'علبة',
    },
    {
      productId: 'p2',
      name: 'سكر أبيض 1 كغ',
      barcode: '6130003',
      unitPrice: 90,
      qty: 3,
      lineTotal: 270,
      unit: 'كيس',
    },
  ];

  const defaultProps = {
    total: 1170,
    cart: mockCart as any,
    formatMoney: (val: number) => val.toLocaleString(),
    paymentMethod: 'cash' as const,
    onSelectPaymentMethod: vi.fn(),
    paidAmount: 1170,
    setPaidAmount: vi.fn(),
    changeDue: 0,
    isPaidSufficient: true,
    allowCardPayment: true,
    allowTransferPayment: true,
    selectedCustomer: '',
    setSelectedCustomer: vi.fn(),
    customers: [
      { id: 'c1', name: 'أحمد بن علي', balance: 0 },
      { id: 'c2', name: 'سليم عمار', balance: 1500, creditLimit: 5000 },
    ],
    onOpenAddCustomer: vi.fn(),
    transactionReference: '',
    setTransactionReference: vi.fn(),
    onConfirm: vi.fn(),
    creditValidation: {
      matchedCustomer: null,
      currentBalance: 0,
      creditLimit: 0,
      isCreditLimitExceeded: false,
      creditExcessAmount: 0,
      hasCreditAdvance: false,
      overrideCreditLimit: false,
      setOverrideCreditLimit: vi.fn(),
      isConfirmDisabled: false,
    },
  };

  describe('1. الركن الأول: تأكيد العملية وملخص بنود السلة', () => {
    it('يعرض كارت تأكيد بنود العملية مع إجمالي الأصناف والقطع وهوية الزبون', () => {
      render(<POSSalePaymentConfirmation {...defaultProps} />);

      // التحقق من الحاوية الرئيسية
      expect(screen.getByTestId('pos-sale-payment-confirmation')).toBeInTheDocument();

      // التحقق من عدد الأصناف والقطع: 2 صنف • 5 قطع
      expect(screen.getByText(/تأكيد بنود العملية \(2 صنف • 5 قطعة\)/)).toBeInTheDocument();

      // التحقق من هوية الزبون الافتراضية
      expect(screen.getByText('زبون نقدي عام')).toBeInTheDocument();
    });

    it('يعرض اسم الزبون المسجل عند تمرير selectedCustomer', () => {
      render(<POSSalePaymentConfirmation {...defaultProps} selectedCustomer="c1" />);
      expect(screen.getByText('أحمد بن علي')).toBeInTheDocument();
    });

    it('يتيح توسيع وطي قائمة معاينة بنود الفاتورة', () => {
      render(<POSSalePaymentConfirmation {...defaultProps} />);

      // في البداية القائمة مطوية
      expect(screen.queryByText('قهوة سريعة التحضير 200غ')).not.toBeInTheDocument();

      // النقر على شريط التأكيد لتوسيع المعاينة
      const toggleBar = screen.getByTitle('انقر لمعاينة/إخفاء تفاصيل بنود الفاتورة');
      fireEvent.click(toggleBar);

      // ظهور المنتجات والأسعار
      expect(screen.getByText('قهوة سريعة التحضير 200غ')).toBeInTheDocument();
      expect(screen.getByText('سكر أبيض 1 كغ')).toBeInTheDocument();
      expect(screen.getByText(/900 دج/)).toBeInTheDocument();
      expect(screen.getByText(/270 دج/)).toBeInTheDocument();

      // النقر مرة أخرى لإخفائها
      fireEvent.click(toggleBar);
      expect(screen.queryByText('قهوة سريعة التحضير 200غ')).not.toBeInTheDocument();
    });
  });

  describe('2. الركن الثاني: اختيار وسيلة السداد والواجهات المخصصة', () => {
    it('يعرض أزرار وسائل الدفع ويتيح التبديل بينها عبر onSelectPaymentMethod', () => {
      const onSelectPaymentMethod = vi.fn();
      render(
        <POSSalePaymentConfirmation
          {...defaultProps}
          onSelectPaymentMethod={onSelectPaymentMethod}
        />
      );

      // فحص أزرار الوسائل
      const cardBtn = screen.getByTitle(/بطاقة \(F2\)/);
      const transferBtn = screen.getByTitle(/تحويل \(F3\)/);
      const creditBtn = screen.getByTitle(/آجل \(دين\) \(F4\)/);

      expect(cardBtn).toBeInTheDocument();
      expect(transferBtn).toBeInTheDocument();
      expect(creditBtn).toBeInTheDocument();

      fireEvent.click(cardBtn);
      expect(onSelectPaymentMethod).toHaveBeenCalledWith('card');

      fireEvent.click(creditBtn);
      expect(onSelectPaymentMethod).toHaveBeenCalledWith('credit');
    });

    it('يوفر فئات الأوراق النقدية الجزائرية السريعة (200، 500، 1000، 2000 دج) في الدفع النقدي', () => {
      const setPaidAmount = vi.fn();
      render(
        <POSSalePaymentConfirmation
          {...defaultProps}
          paymentMethod="cash"
          setPaidAmount={setPaidAmount}
        />
      );

      // أزرار فئات الأوراق النقدية
      const note2000 = screen.getByText('2000 دج');
      const note1000 = screen.getByText('1000 دج');
      const note500 = screen.getByText('500 دج');
      const note200 = screen.getByText('200 دج');

      expect(note2000).toBeInTheDocument();
      expect(note1000).toBeInTheDocument();
      expect(note500).toBeInTheDocument();
      expect(note200).toBeInTheDocument();

      fireEvent.click(note2000);
      expect(setPaidAmount).toHaveBeenCalledWith(2000);

      fireEvent.click(note500);
      expect(setPaidAmount).toHaveBeenCalledWith(500);
    });

    it('يعرض واجهة الدفع بالبطاقة مع حقل رقم المرجع البنكي TPE', () => {
      const setTransactionReference = vi.fn();
      render(
        <POSSalePaymentConfirmation
          {...defaultProps}
          paymentMethod="card"
          transactionReference=""
          setTransactionReference={setTransactionReference}
        />
      );

      expect(screen.getByText('الدفع عبر البطاقة الذهبية / CIB')).toBeInTheDocument();
      expect(screen.getByText(/تأكد من تمرير البطاقة في جهاز TPE/)).toBeInTheDocument();

      const input = screen.getByPlaceholderText(/TPE-88421/);
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'AUTH-12345' } });
      expect(setTransactionReference).toHaveBeenCalledWith('AUTH-12345');
    });

    it('يعرض واجهة التحويل مع حقل رقم الإيصال أو مرجع CCP/BaridiMob', () => {
      const setTransactionReference = vi.fn();
      render(
        <POSSalePaymentConfirmation
          {...defaultProps}
          paymentMethod="transfer"
          transactionReference=""
          setTransactionReference={setTransactionReference}
        />
      );

      expect(screen.getByText('الدفع عبر التحويل البنكي أو البريدي')).toBeInTheDocument();
      const input = screen.getByPlaceholderText(/حوالة بريدية/);
      expect(input).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'CCP-9988' } });
      expect(setTransactionReference).toHaveBeenCalledWith('CCP-9988');
    });

    it('يعرض واجهة الدين وقسم الزبائن عند اختيار وسيلة السداد الآجلة', () => {
      render(
        <POSSalePaymentConfirmation
          {...defaultProps}
          paymentMethod="credit"
        />
      );

      expect(screen.getByTestId('credit-payment-notice-card')).toBeInTheDocument();
      expect(screen.getByText(/نظام الديون/)).toBeInTheDocument();
      expect(screen.getByText(/تحديد الزبون للبيع الآجل/)).toBeInTheDocument();
    });
  });

  describe('3. الركن الثالث: حساب الفكة الذكي وفئات الصرف المقترحة', () => {
    it('يعرض حالة "مدفوع بالضبط" عندما يغطي المبلغ الإجمالي تماماً دون فكة', () => {
      render(
        <POSSalePaymentConfirmation
          {...defaultProps}
          paymentMethod="cash"
          paidAmount={1170}
          total={1170}
          changeDue={0}
          isPaidSufficient={true}
        />
      );

      expect(screen.getByText('مدفوع بالضبط')).toBeInTheDocument();
      expect(screen.getByText('حالة السداد:')).toBeInTheDocument();
    });

    it('يعرض الفكة الواجب إرجاعها مع فئات الأوراق النقدية المقترحة عندما يدفع الزبون أكثر', () => {
      render(
        <POSSalePaymentConfirmation
          {...defaultProps}
          paymentMethod="cash"
          paidAmount={2000}
          total={1170}
          changeDue={830}
          isPaidSufficient={true}
        />
      );

      // الفكة الإجمالية
      expect(screen.getByText(/المبلغ المتبقي للزبون \(الفكة\):/)).toBeInTheDocument();
      expect(screen.getByText('830 دج')).toBeInTheDocument();

      // شريط تفكيك الفئات: 830 دج = 500 + 200 + 100 + 20 + 10
      expect(screen.getByText('فئات الفكة المقترحة:')).toBeInTheDocument();
      expect(screen.getByText(/1× 500 دج/)).toBeInTheDocument();
      expect(screen.getByText(/1× 200 دج/)).toBeInTheDocument();
      expect(screen.getByText(/1× 100 دج/)).toBeInTheDocument();
      expect(screen.getByText(/1× 20 دج/)).toBeInTheDocument();
      expect(screen.getByText(/1× 10 دج/)).toBeInTheDocument();
    });

    it('يعرض تنبيه العجز مع زر إكمال المبلغ عند دفع مبلغ أقل من المطلوب', () => {
      const setPaidAmount = vi.fn();
      render(
        <POSSalePaymentConfirmation
          {...defaultProps}
          paymentMethod="cash"
          paidAmount={1000}
          total={1170}
          changeDue={0}
          isPaidSufficient={false}
          setPaidAmount={setPaidAmount}
        />
      );

      expect(screen.getByText('المبلغ المدفوع غير كافٍ:')).toBeInTheDocument();
      expect(screen.getByText(/المتبقي غير المسدد:/)).toBeInTheDocument();
      expect(screen.getAllByText(/170/).length).toBeGreaterThanOrEqual(1);

      // زر سداد المبلغ كاملاً
      const completeBtn = screen.getByText('سداد المبلغ كاملاً');
      expect(completeBtn).toBeInTheDocument();
      fireEvent.click(completeBtn);
      expect(setPaidAmount).toHaveBeenCalledWith(1170);
    });
  });
});
