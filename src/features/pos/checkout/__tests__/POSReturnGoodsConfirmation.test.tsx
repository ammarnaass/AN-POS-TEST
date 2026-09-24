import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { POSReturnGoodsConfirmation } from '../components/POSReturnGoodsConfirmation';
import { DEFAULT_RETURN_REASONS } from '../types';
import type { CartItem } from '@/types';

describe('POSReturnGoodsConfirmation — تأكيد استرجاع البضاعة واختيار طريقة صرف المبلغ', () => {
  const mockCart: CartItem[] = [
    {
      productId: 'p1',
      name: 'عصير برتقال 1 لتر',
      barcode: '6131234567890',
      unitPrice: 150,
      qty: 3,
      lineTotal: 450,
      unit: 'قارورة',
    },
    {
      productId: 'p2',
      name: 'بسكويت شوكولاتة',
      barcode: '6139876543210',
      unitPrice: 50,
      qty: 2,
      lineTotal: 100,
    },
  ];

  const formatMoney = (n: number) => n.toFixed(2);

  const defaultProps = {
    cart: mockCart,
    formatMoney,
    returnReason: DEFAULT_RETURN_REASONS[0],
    customReason: '',
    onChangeReason: vi.fn(),
    onChangeCustomReason: vi.fn(),
    refundMethod: 'cash' as const,
    onChangeRefundMethod: vi.fn(),
    originalSaleNumber: 'INV-2026-0089',
    matchedCustomer: null,
  };

  it('يعرض بطاقة رقم الفاتورة الأصلية المرتبطة بالمرتجع', () => {
    render(<POSReturnGoodsConfirmation {...defaultProps} />);

    expect(screen.getByText('مرتجع مرتبط بالفاتورة الأصلية:')).toBeInTheDocument();
    expect(screen.getByText('#INV-2026-0089')).toBeInTheDocument();
  });

  it('يعرض قائمة البضائع المسترجعة مع الكميات المسترجعة بالرمز (+) وأسعار الوحدات والمجاميع', () => {
    render(<POSReturnGoodsConfirmation {...defaultProps} />);

    // رأس قسم البضائع
    expect(screen.getByText(/تأكيد استرجاع البضاعة \(2 صنف • 5 قطعة\)/)).toBeInTheDocument();
    expect(screen.getByText('إعادة للمخزون فورياً')).toBeInTheDocument();

    // تفاصيل الصنف الأول
    expect(screen.getByText('عصير برتقال 1 لتر')).toBeInTheDocument();
    expect(screen.getByText('[6131234567890]')).toBeInTheDocument();
    expect(screen.getByText('+3 قارورة')).toBeInTheDocument();
    expect(screen.getByText('450.00 دج')).toBeInTheDocument();

    // تفاصيل الصنف الثاني
    expect(screen.getByText('بسكويت شوكولاتة')).toBeInTheDocument();
    expect(screen.getByText('+2 قطعة')).toBeInTheDocument();
    expect(screen.getByText('100.00 دج')).toBeInTheDocument();
  });

  it('يتيح طي وتوسيع قائمة البضائع المسترجعة عند النقر على الرأس', () => {
    render(<POSReturnGoodsConfirmation {...defaultProps} />);

    const collapseHeader = screen.getByText(/تأكيد استرجاع البضاعة \(2 صنف • 5 قطعة\)/);
    // مفتوحة افتراضياً
    expect(screen.getByText('عصير برتقال 1 لتر')).toBeInTheDocument();

    // طي
    fireEvent.click(collapseHeader);
    expect(screen.queryByText('عصير برتقال 1 لتر')).not.toBeInTheDocument();

    // إعادة فتح
    fireEvent.click(collapseHeader);
    expect(screen.getByText('عصير برتقال 1 لتر')).toBeInTheDocument();
  });

  it('يعرض قائمة أسباب الإرجاع ويتيح تغيير السبب', () => {
    const onChangeReason = vi.fn();
    render(<POSReturnGoodsConfirmation {...defaultProps} onChangeReason={onChangeReason} />);

    const select = screen.getByLabelText('سبب الإرجاع') as HTMLSelectElement;
    expect(select.value).toBe(DEFAULT_RETURN_REASONS[0]);

    fireEvent.change(select, { target: { value: 'عيب مصنعي أو كسر' } });
    expect(onChangeReason).toHaveBeenCalledWith('عيب مصنعي أو كسر');
  });

  it('يظهر حقل كتابة السبب التفصيلي عند اختيار "أخرى"', () => {
    const onChangeCustomReason = vi.fn();
    render(
      <POSReturnGoodsConfirmation
        {...defaultProps}
        returnReason="أخرى"
        customReason="الزبون وجد سعراً أقل"
        onChangeCustomReason={onChangeCustomReason}
      />
    );

    const customInput = screen.getByPlaceholderText('اكتب سبب الإرجاع التفصيلي هنا...') as HTMLInputElement;
    expect(customInput).toBeInTheDocument();
    expect(customInput.value).toBe('الزبون وجد سعراً أقل');

    fireEvent.change(customInput, { target: { value: 'تغير في القرار' } });
    expect(onChangeCustomReason).toHaveBeenCalledWith('تغير في القرار');
  });

  it('يعرض أزرار اختيار طريقة صرف المبلغ ويتيح التبديل بين الخزينة وقيد الحساب مع الشرح المالي', () => {
    const onChangeRefundMethod = vi.fn();
    const { rerender } = render(
      <POSReturnGoodsConfirmation
        {...defaultProps}
        refundMethod="cash"
        onChangeRefundMethod={onChangeRefundMethod}
      />
    );

    // التحقق من خيار الخزينة كاش
    expect(screen.getByText('صرف نقدي فوري:')).toBeInTheDocument();
    expect(screen.getByText(/سيتم خصم قيمة المرتجع من درج نقدية المناوبة الحالية/)).toBeInTheDocument();

    // النقر على قيد في حساب الزبون
    const creditBtn = screen.getByText('قيد في حساب الزبون');
    fireEvent.click(creditBtn);
    expect(onChangeRefundMethod).toHaveBeenCalledWith('customer_credit');

    // إعادة التصيير مع customer_credit
    rerender(
      <POSReturnGoodsConfirmation
        {...defaultProps}
        refundMethod="customer_credit"
        onChangeRefundMethod={onChangeRefundMethod}
      />
    );

    expect(screen.getByText('قيد كرصيد في حساب الزبون:')).toBeInTheDocument();
    expect(screen.getByText(/سيتم خصم قيمة المرتجع من ديون الزبون السابقة/)).toBeInTheDocument();
    expect(screen.getByText(/ولن يخرج أي نقد من صندوق الكاشير/)).toBeInTheDocument();
  });

  it('يتيح اختيار وتوثيق حالة البضاعة المسترجعة (صالحة للمخزن أو تالفة) ويعرض التنبيه المناسب', () => {
    const onChangeGoodsCondition = vi.fn();
    render(
      <POSReturnGoodsConfirmation
        {...defaultProps}
        onChangeGoodsCondition={onChangeGoodsCondition}
      />
    );

    // الحالة الافتراضية صالحة
    expect(screen.getByText('حالة المخزون: متاح للبيع')).toBeInTheDocument();
    expect(screen.queryByText(/تنبيه: تم تحديد البضاعة كتالفة/)).not.toBeInTheDocument();

    // النقر على خيار بضاعة تالفة
    const damagedBtn = screen.getByText('تالفة / معيبة (تجنيب الهالك)');
    fireEvent.click(damagedBtn);

    expect(onChangeGoodsCondition).toHaveBeenCalledWith('damaged');
    expect(screen.getByText('حالة المخزون: تالف / مستبعد')).toBeInTheDocument();
    expect(screen.getByText(/تنبيه: تم تحديد البضاعة كتالفة/)).toBeInTheDocument();

    // العودة إلى خيار إعادة للمخزون
    const restockBtn = screen.getByText('إعادة للمخزون فورياً');
    fireEvent.click(restockBtn);

    expect(onChangeGoodsCondition).toHaveBeenCalledWith('restock');
    expect(screen.getByText('حالة المخزون: متاح للبيع')).toBeInTheDocument();
    expect(screen.queryByText(/تنبيه: تم تحديد البضاعة كتالفة/)).not.toBeInTheDocument();
  });

  it('يعرض تفاصيل المبلغ المنصرف من الدرج في الصرف النقدي', () => {
    render(
      <POSReturnGoodsConfirmation
        {...defaultProps}
        total={550}
        refundMethod="cash"
      />
    );

    expect(screen.getByText('المبلغ المنصرف من الدرج:')).toBeInTheDocument();
    expect(screen.getByText('-550.00 دج')).toBeInTheDocument();
  });

  it('يعرض تفاصيل حساب الزبون ورصيده عند اختيار قيد الحساب مع زبون محدد', () => {
    render(
      <POSReturnGoodsConfirmation
        {...defaultProps}
        refundMethod="customer_credit"
        matchedCustomer={{ id: 'c1', name: 'أحمد بن علي', balance: 1200 }}
      />
    );

    expect(screen.getByText('الزبون: أحمد بن علي')).toBeInTheDocument();
    expect(screen.getByText('الرصيد المسجل: 1200.00 دج')).toBeInTheDocument();
  });

  it('يعرض تنبيهاً لاختيار الزبون عند اختيار قيد الحساب بدون تحديد زبون', () => {
    render(
      <POSReturnGoodsConfirmation
        {...defaultProps}
        refundMethod="customer_credit"
        matchedCustomer={null}
      />
    );

    expect(
      screen.getByText(/يرجى تحديد حساب الزبون في قسم الدفع أدناه لإتمام القيد/)
    ).toBeInTheDocument();
  });
});
