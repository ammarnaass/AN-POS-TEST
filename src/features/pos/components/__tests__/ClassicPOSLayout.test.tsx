import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ClassicPOSTopBar } from '../classic/ClassicPOSTopBar';
import { formatMoney } from '@/features/pos/utils/format';

describe('ClassicPOSTopBar (تصميم 3 - شاشة السعر 85% وزر التأكيد 15%)', () => {
  const defaultProps = {
    onNavigateBack: vi.fn(),
    onOpenCustomize: vi.fn(),
    onSettleSale: vi.fn(),
    isSalePending: false,
    cartLength: 2,
    onClearCart: vi.fn(),
    onDeleteSelectedOrLast: vi.fn(),
    onSuspendSale: vi.fn(),
    onOpenSuspended: vi.fn(),
    suspendedCount: 1,
    onSelectCustomer: vi.fn(),
    selectedCustomerName: 'عميل مميز',
    onOpenDiscount: vi.fn(),
    discountAmount: 150,
    autoPrintReceipt: true,
    onToggleAutoPrint: vi.fn(),
    onOpenReturns: vi.fn(),
    onOpenSalesHistory: vi.fn(),
    onOpenKeypad: vi.fn(),
    onSaveAsProforma: vi.fn(),
    onSaveAsOrder: vi.fn(),
    totalAmount: 12500,
    totalItemsCount: 2,
    totalUnitsCount: 5,
    currency: 'دج',
    formatMoney,
    priceTier: '1' as const,
    onSelectPriceTier: vi.fn(),
  };

  it('يعرض شاشة السعر بنسبة 85% وزر تأكيد البيع بنسبة 15% مع الإحصائيات الدقيقة', () => {
    const { container } = render(<ClassicPOSTopBar {...defaultProps} />);

    // 1. التحقق من وجود شاشة العرض الكبرى مع فئة 85%
    const priceDisplay = container.querySelector('.w-\\[85\\%\\]');
    expect(priceDisplay).toBeInTheDocument();
    expect(priceDisplay).toHaveTextContent(/الإجمالي الكلي/);
    expect(priceDisplay).toHaveTextContent(/2 سلع \(5 قطع\)/);
    expect(priceDisplay).toHaveTextContent(/عميل مميز/);
    expect(priceDisplay).toHaveTextContent(/تخفيض:/);

    // 2. التحقق من وجود زر تأكيد البيع بنسبة 15%
    const settleBtn = container.querySelector('button.w-\\[15\\%\\]');
    expect(settleBtn).toBeInTheDocument();
    expect(settleBtn).toHaveTextContent(/تأكيد بيع/);
    expect(settleBtn).toHaveTextContent(/F1/);

    // النقر على زر تأكيد البيع
    fireEvent.click(settleBtn!);
    expect(defaultProps.onSettleSale).toHaveBeenCalled();
  });

  it('يحتوي على شريط الأزرار الطولي تحتهما بكامل الوظائف والعمليات', () => {
    render(<ClassicPOSTopBar {...defaultProps} />);

    // زر خروج
    const exitBtn = screen.getByTitle(/الخروج إلى لوحة التحكم الرئيسية/);
    expect(exitBtn).toBeInTheDocument();
    fireEvent.click(exitBtn);
    expect(defaultProps.onNavigateBack).toHaveBeenCalled();

    // زر تخصيص
    const customizeBtn = screen.getByTitle(/تخصيص الواجهة ودقة العرض/);
    expect(customizeBtn).toBeInTheDocument();
    fireEvent.click(customizeBtn);
    expect(defaultProps.onOpenCustomize).toHaveBeenCalled();

    // زر تعليق البيع (F2)
    const suspendBtn = screen.getByTitle(/تعليق البيع \/ سلة جديدة/);
    expect(suspendBtn).toBeInTheDocument();
    fireEvent.click(suspendBtn);
    expect(defaultProps.onSuspendSale).toHaveBeenCalled();

    // زر مسودات (F3)
    const draftsBtn = screen.getByTitle(/قائمة الفواتير المعلقة والمسودات/);
    expect(draftsBtn).toBeInTheDocument();
    fireEvent.click(draftsBtn);
    expect(defaultProps.onOpenSuspended).toHaveBeenCalled();

    // فئات الأسعار
    const tier2Btn = screen.getByTitle(/سعر نصف الجملة س2/);
    expect(tier2Btn).toBeInTheDocument();
    fireEvent.click(tier2Btn);
    expect(defaultProps.onSelectPriceTier).toHaveBeenCalledWith('2');
  });
});
