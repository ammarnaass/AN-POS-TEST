import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { POSPaymentModal } from '../modals/POSPaymentModal';

describe('POSPaymentModal — نافذة إتمام الدفع مع التوافق التام مع أحجام الشاشة', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    total: 3500,
    paymentMethod: 'cash' as const,
    setPaymentMethod: vi.fn(),
    paidAmount: 3500,
    setPaidAmount: vi.fn(),
    selectedCustomer: '',
    setSelectedCustomer: vi.fn(),
    customers: [
      { id: 'c1', name: 'أحمد بن علي', balance: 0 },
      { id: 'c2', name: 'سليم عمار', balance: 1200 },
    ],
    onOpenAddCustomer: vi.fn(),
    onConfirmPayment: vi.fn(),
    isPending: false,
    allowCardPayment: true,
    allowTransferPayment: true,
  };

  it('يرندر نافذة الدفع داخل body عبر React Portal مع خصائص التوافق مع الشاشة', () => {
    render(<POSPaymentModal {...defaultProps} />);

    expect(screen.getByText('إتمام عملية الدفع')).toBeInTheDocument();
    expect(screen.getByText('تأكيد ودفع (Enter)')).toBeInTheDocument();

    const dialogCard = document.querySelector('.glass-card');
    expect(dialogCard).toBeInTheDocument();
    expect(dialogCard?.className).toContain('flex flex-col');
    expect(dialogCard?.className).toContain('max-h-');

    // التحقق من وجود منطقة المحتوى القابلة للتمرير الداخلي
    const scrollContainer = dialogCard?.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();
  });

  it('يعرض شبكة وسائل الدفع ويتيح التبديل إلى بطاقة CIB أو دين', () => {
    const setPaymentMethod = vi.fn();
    render(<POSPaymentModal {...defaultProps} setPaymentMethod={setPaymentMethod} />);

    const creditBtn = screen.getByTitle(/آجل \(دين\)/);
    expect(creditBtn).toBeInTheDocument();
    fireEvent.click(creditBtn);
    expect(setPaymentMethod).toHaveBeenCalledWith('credit');
  });

  it('يعرض بطاقة إشعار قيد الدين وقسم الزبائن عند اختيار الدفع بالدين', () => {
    render(
      <POSPaymentModal
        {...defaultProps}
        paymentMethod="credit"
      />
    );

    expect(screen.getByTestId('credit-payment-notice-card')).toBeInTheDocument();
    expect(screen.getByText(/نظام الديون/)).toBeInTheDocument();
    expect(screen.getByText(/تحديد الزبون للبيع الآجل/)).toBeInTheDocument();
  });

  it('يستجيب للنقر على زر التأكيد ودفع', () => {
    const onConfirmPayment = vi.fn();
    render(<POSPaymentModal {...defaultProps} onConfirmPayment={onConfirmPayment} />);

    const confirmBtn = screen.getByText('تأكيد ودفع (Enter)');
    fireEvent.click(confirmBtn);
    expect(onConfirmPayment).toHaveBeenCalled();
  });
});

describe('POSPaymentModal — وضع الإرجاع: التبديل بين الخزينة وقيد الدين', () => {
  const returnProps = {
    isOpen: true,
    onClose: vi.fn(),
    total: 2000,
    paymentMethod: 'cash' as const,
    setPaymentMethod: vi.fn(),
    paidAmount: 2000,
    setPaidAmount: vi.fn(),
    selectedCustomer: '',
    setSelectedCustomer: vi.fn(),
    customers: [
      { id: 'c1', name: 'أحمد بن علي', balance: 5000, creditLimit: 10000 },
      { id: 'c2', name: 'سليم عمار', balance: 1200 },
    ],
    onOpenAddCustomer: vi.fn(),
    onConfirmPayment: vi.fn(),
    isPending: false,
    allowCardPayment: false,
    allowTransferPayment: false,
    isReturn: true,
    refundMethod: 'cash' as const,
    setRefundMethod: vi.fn(),
  };

  it('يعرض عنوان وضع الإرجاع ومختار طريقة الاسترداد', () => {
    render(<POSPaymentModal {...returnProps} />);

    expect(screen.getByText('إتمام عملية استرجاع المبيعات (مرتجع)')).toBeInTheDocument();
    expect(screen.getByText('نقداً من الخزينة')).toBeInTheDocument();
    expect(screen.getByText('قيد في حساب الزبون')).toBeInTheDocument();
  });

  it('يبدّل بنجاح من "نقداً من الخزينة" إلى "قيد في حساب الزبون" والعكس', () => {
    const setPaymentMethod = vi.fn();
    const setPaidAmount = vi.fn();
    const setRefundMethod = vi.fn();

    render(
      <POSPaymentModal
        {...returnProps}
        setPaymentMethod={setPaymentMethod}
        setPaidAmount={setPaidAmount}
        setRefundMethod={setRefundMethod}
      />
    );

    // التبديل إلى قيد في حساب الزبون
    const customerCreditBtn = screen.getByText('قيد في حساب الزبون');
    fireEvent.click(customerCreditBtn);

    expect(setRefundMethod).toHaveBeenCalledWith('customer_credit');
    expect(setPaymentMethod).toHaveBeenCalledWith('credit');
    expect(setPaidAmount).toHaveBeenCalledWith(0);

    // التبديل العكسي إلى نقداً من الخزينة
    const cashBtn = screen.getByText('نقداً من الخزينة');
    fireEvent.click(cashBtn);

    expect(setRefundMethod).toHaveBeenCalledWith('cash');
    expect(setPaymentMethod).toHaveBeenCalledWith('cash');
    expect(setPaidAmount).toHaveBeenCalledWith(2000);
  });

  it('يعطّل زر التأكيد عند اختيار "قيد في حساب الزبون" بدون تحديد زبون ويعرض نصاً توجيهياً', () => {
    render(
      <POSPaymentModal
        {...returnProps}
        refundMethod="customer_credit"
        selectedCustomer=""
      />
    );

    const confirmBtn = screen.getByText('يرجى تحديد الزبون أولاً');
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toBeDisabled();
  });

  it('يعرض قسم اختيار الزبون مع عنوان المرتجع عند اختيار "قيد في حساب الزبون"', () => {
    render(
      <POSPaymentModal
        {...returnProps}
        refundMethod="customer_credit"
      />
    );

    expect(screen.getByText(/تحديد حساب الزبون لقيد قيمة المرتجع/)).toBeInTheDocument();
    expect(screen.getByText(/يجب اختيار زبون من القائمة لقيد قيمة المرتجع/)).toBeInTheDocument();
  });

  it('يفعّل زر التأكيد عند اختيار "قيد في حساب الزبون" مع تحديد زبون', () => {
    const onConfirmPayment = vi.fn();
    render(
      <POSPaymentModal
        {...returnProps}
        refundMethod="customer_credit"
        selectedCustomer="c1"
        onConfirmPayment={onConfirmPayment}
      />
    );

    const confirmBtn = screen.getByText(/تأكيد استرجاع المبلغ/);
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(onConfirmPayment).toHaveBeenCalledWith(
      0,
      'c1',
      'credit',
      'customer_credit',
      expect.any(String)
    );
  });

  it('يرسل refundMethod=cash مع المبلغ الكامل عند تأكيد الاسترجاع النقدي', () => {
    const onConfirmPayment = vi.fn();
    render(
      <POSPaymentModal
        {...returnProps}
        refundMethod="cash"
        onConfirmPayment={onConfirmPayment}
      />
    );

    const confirmBtn = screen.getByText(/تأكيد استرجاع المبلغ/);
    fireEvent.click(confirmBtn);
    expect(onConfirmPayment).toHaveBeenCalledWith(
      2000,
      '',
      'cash',
      'cash',
      expect.any(String)
    );
  });

  it('يعرض بطاقة تأثير الدين على الزبون مع خصم المرتجع عند اختيار قيد الدين مع زبون', () => {
    render(
      <POSPaymentModal
        {...returnProps}
        refundMethod="customer_credit"
        selectedCustomer="c1"
      />
    );

    // يجب أن يظهر إشعار قيد المرتجع
    expect(screen.getByText(/قيد المرتجع في حساب الزبون/)).toBeInTheDocument();

    // يجب أن يعرض الدين الحالي والمتوقع بعد المرتجع
    expect(screen.getByText('الدين الحالي:')).toBeInTheDocument();
    expect(screen.getByText('الدين بعد المرتجع:')).toBeInTheDocument();
  });

  it('يعرض تفاصيل البضاعة المسترجعة ورقم الفاتورة الأصلية ويتيح تغيير سبب الإرجاع', () => {
    const onConfirmPayment = vi.fn();
    const mockCart = [
      {
        productId: 'p1',
        name: 'حليب الصومام 1 لتر',
        barcode: '6130001',
        unitPrice: 120,
        qty: 2,
        lineTotal: 240,
        unit: 'علبة',
      },
    ];

    render(
      <POSPaymentModal
        {...returnProps}
        cart={mockCart as any}
        returnContext={{
          originalSaleId: 'sale-999',
          originalSaleNumber: 'INV-2026-0042',
          reason: 'عيب مصنعي أو كسر',
        }}
        total={240}
        onConfirmPayment={onConfirmPayment}
      />
    );

    // 1. التحقق من رقم الفاتورة الأصلية
    expect(screen.getByText(/INV-2026-0042/)).toBeInTheDocument();

    // 2. التحقق من كارت تأكيد البضائع
    expect(screen.getByTestId('pos-return-goods-confirmation')).toBeInTheDocument();
    expect(screen.getByText(/1 صنف • 2 قطعة/)).toBeInTheDocument();
    expect(screen.getByText('حليب الصومام 1 لتر')).toBeInTheDocument();
    expect(screen.getByText('+2 علبة')).toBeInTheDocument();
    expect(screen.getByText(/إعادة للمخزون فورياً/)).toBeInTheDocument();

    // 3. التحقق من سبب الإرجاع الممرر
    const reasonSelect = screen.getByLabelText('سبب الإرجاع') as HTMLSelectElement;
    expect(reasonSelect.value).toBe('عيب مصنعي أو كسر');

    // 4. تأكيد الاسترجاع وتمرير السبب المختار
    const confirmBtn = screen.getByText(/تأكيد استرجاع المبلغ/);
    fireEvent.click(confirmBtn);

    expect(onConfirmPayment).toHaveBeenCalledWith(
      240,
      '',
      'cash',
      'cash',
      'عيب مصنعي أو كسر'
    );
  });
});
