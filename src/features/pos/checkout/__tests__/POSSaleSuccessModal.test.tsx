import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { POSSaleSuccessModal } from '../modals/POSSaleSuccessModal';
import type { Sale } from '@/types';

describe('POSSaleSuccessModal — نافذة نجاح البيع مع إشعار الدفع بالدين', () => {
  const baseSale: Sale = {
    id: 'sale-1',
    number: 'INV-1001',
    total: 5000,
    paidAmount: 5000,
    paymentMethod: 'cash',
    status: 'paid',
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    type: 'sale',
    docType: 'facture',
    items: [],
  };

  it('يرندر حالة البيع النقدي القياسية دون بطاقة تنبيه الديون', () => {
    render(
      <POSSaleSuccessModal
        isOpen={true}
        onClose={vi.fn()}
        completedSale={baseSale}
      />
    );

    expect(screen.getByText('تمت عملية البيع بنجاح')).toBeInTheDocument();
    expect(screen.getByText(/INV-1001/)).toBeInTheDocument();
    expect(screen.queryByTestId('credit-sale-alert-card')).not.toBeInTheDocument();
  });

  it('يرندر إشعاراً مخصصاً وبطاقة تنبيه واضحة عند الدفع بالدين بالكامل', () => {
    const creditSale: Sale = {
      ...baseSale,
      paymentMethod: 'credit',
      status: 'unpaid',
      paidAmount: 0,
      customerName: 'محمد أمين',
      customerId: 'cust-1',
    };

    render(
      <POSSaleSuccessModal
        isOpen={true}
        onClose={vi.fn()}
        completedSale={creditSale}
      />
    );

    // التحقق من عنوان النجاح الخاص بالدين
    expect(screen.getByText('تم تسجيل البيع بالآجل (دين) بنجاح')).toBeInTheDocument();

    // التحقق من بطاقة التنبيه
    expect(screen.getByText('إشعار: قيد دين على الحساب')).toBeInTheDocument();
    expect(screen.getByText('دين كامل')).toBeInTheDocument();
    expect(screen.getByText('محمد أمين')).toBeInTheDocument();
    expect(screen.getAllByText(/5.*000.*دج/).length).toBeGreaterThanOrEqual(1);
  });


  it('يرندر إشعار الدفعة الجزئية مع توضيح المدفوع نقداً والدين المتبقي', () => {
    const partialSale: Sale = {
      ...baseSale,
      paymentMethod: 'credit',
      status: 'partial',
      total: 10000,
      paidAmount: 4000, // دفع 4000، المتبقي دين 6000
      customerName: 'ياسين بلال',
      customerId: 'cust-2',
    };

    render(
      <POSSaleSuccessModal
        isOpen={true}
        onClose={vi.fn()}
        completedSale={partialSale}
      />
    );

    expect(screen.getByText('تم تسجيل البيع بالآجل (دين) بنجاح')).toBeInTheDocument();
    expect(screen.getByText('دفعة جزئية + دين')).toBeInTheDocument();
    expect(screen.getByText('ياسين بلال')).toBeInTheDocument();
    expect(screen.getByText(/6.*000.*دج/)).toBeInTheDocument(); // الدين المتبقي
    expect(screen.getByText(/4.*000.*دج/)).toBeInTheDocument(); // المدفوع نقداً
  });

  it('يرندر بطاقة إشعار توثيق البيع الفوري للبيع القياسي', () => {
    render(
      <POSSaleSuccessModal
        isOpen={true}
        onClose={vi.fn()}
        completedSale={baseSale}
      />
    );

    expect(screen.getByText('إشعار: تم تسجيل وحفظ عملية البيع بنجاح')).toBeInTheDocument();
    expect(screen.getByText('توثيق فوري')).toBeInTheDocument();
    expect(screen.getByText(/تم تسجيل الفاتورة في سجل المبيعات والصندوق/)).toBeInTheDocument();
  });

  it('يرندر بطاقة إشعار توثيق المرتجعات عند إرجاع فاتورة', () => {
    const returnSale: Sale = {
      ...baseSale,
      type: 'return',
      status: 'refunded',
      total: -3000,
      paidAmount: -3000,
    };

    render(
      <POSSaleSuccessModal
        isOpen={true}
        onClose={vi.fn()}
        completedSale={returnSale}
      />
    );

    expect(screen.getByText('إشعار: تم تسجيل حركة المرتجع واسترجاع المبلغ')).toBeInTheDocument();
    expect(screen.getByText('توثيق المرتجعات')).toBeInTheDocument();
    expect(screen.getByText(/تم تحديث المخزون وحركة الصندوق/)).toBeInTheDocument();
  });

  it('يرندر عناصر التوافق مع أحجام الشاشة وزر مركز الإشعارات', () => {
    render(
      <POSSaleSuccessModal
        isOpen={true}
        onClose={vi.fn()}
        completedSale={baseSale}
      />
    );

    // التحقق من زر فتح مركز الإشعارات
    const notifBtn = screen.getByTitle('فتح مركز الإشعارات');
    expect(notifBtn).toBeInTheDocument();

    // التحقق من وجود أزرار الطباعة وزر فاتورة جديدة
    expect(screen.getByText(/إيصال حراري/)).toBeInTheDocument();
    expect(screen.getByText(/فاتورة جديدة/)).toBeInTheDocument();

    // التحقق من أن النافذة مصيرة عبر Portal داخل document.body
    const dialogElement = document.querySelector('.glass-card');
    expect(dialogElement).toBeInTheDocument();
    expect(dialogElement?.className).toContain('max-h-');
    expect(dialogElement?.className).toContain('flex flex-col');
  });
});
