import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { POSCreditPaymentSection } from '@/features/pos/debt';
import { POSPaymentModal } from '../modals/POSPaymentModal';

describe('POS Payment & Debt Notice Cards — إشعارات الدفع بالدين في شاشة إتمام العملية', () => {
  const mockCustomer = {
    id: 'cust-101',
    name: 'أحمد التاجر',
    phone: '0550123456',
    balance: 2000,
    creditLimit: 20000,
  };

  const defaultCreditValidation = {
    isCreditSale: true,
    matchedCustomer: mockCustomer as any,
    currentBalance: 2000,
    creditLimit: 20000,
    projectedDebt: 7000,
    isCreditLimitExceeded: false,
    creditExcessAmount: 0,
    hasCreditAdvance: false,
    overrideCreditLimit: false,
    setOverrideCreditLimit: vi.fn(),
    isConfirmDisabled: false,
  };

  describe('1. POSCreditPaymentSection — بطاقة إشعار قيد الدين الديناميكية', () => {
    it('يعرض بطاقة إشعار قيد الدين عند اختيار الزبون وتوضيح المبلغ المقيد في سجل الديون', () => {
      render(
        <POSCreditPaymentSection
          selectedCustomer="cust-101"
          setSelectedCustomer={vi.fn()}
          customers={[mockCustomer]}
          onOpenAddCustomer={vi.fn()}
          saleTotal={5000}
          creditValidation={defaultCreditValidation}
          paidAmount={0}
          setPaidAmount={vi.fn()}
          currencySymbol="دج"
        />
      );

      // التحقق من ظهور بطاقة الإشعار الديناميكية
      expect(screen.getByTestId('dynamic-debt-notice-card')).toBeInTheDocument();
      expect(screen.getByText('إشعار: سيتم تسجيل الفاتورة كدين على الزبون')).toBeInTheDocument();
      expect(screen.getByText('دين كامل')).toBeInTheDocument();
      expect(screen.getAllByText(/أحمد التاجر/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/نظام ديون الزبائن والإشعارات المالية/)).toBeInTheDocument();
    });

    it('يحدث حالة الإشعار إلى دين جزئي متبقي عند وجود دفعة أولى مسددة نقداً', () => {
      render(
        <POSCreditPaymentSection
          selectedCustomer="cust-101"
          setSelectedCustomer={vi.fn()}
          customers={[mockCustomer]}
          onOpenAddCustomer={vi.fn()}
          saleTotal={5000}
          creditValidation={defaultCreditValidation}
          paidAmount={2000} // متبقي 3000
          setPaidAmount={vi.fn()}
          currencySymbol="دج"
        />
      );

      expect(screen.getByText('دين جزئي متبقي')).toBeInTheDocument();
      expect(screen.getAllByText(/3.*000.*دج/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. POSPaymentModal — كرت إشعار المعاملة الآجلة عند اختيار وسيلة الدفع بالدين', () => {
    it('يعرض كرت إشعار مالي مخصص (نظام الديون) عند تحديد وسيلة الدفع كـ credit', () => {
      render(
        <POSPaymentModal
          isOpen={true}
          onClose={vi.fn()}
          total={5000}
          paymentMethod="credit"
          setPaymentMethod={vi.fn()}
          paidAmount={0}
          setPaidAmount={vi.fn()}
          selectedCustomer="cust-101"
          setSelectedCustomer={vi.fn()}
          customers={[mockCustomer]}
          onOpenAddCustomer={vi.fn()}
          onConfirmPayment={vi.fn()}
          isPending={false}
        />
      );

      // التحقق من كرت الإشعار المخصص للدفع بالدين
      expect(screen.getByTestId('credit-payment-notice-card')).toBeInTheDocument();
      expect(screen.getByText('إشعار: إتمام المعاملة بالآجل (قيد دين على الحساب)')).toBeInTheDocument();
      expect(screen.getByText('نظام الديون')).toBeInTheDocument();
      expect(
        screen.getByText(/سيتم تسجيل هذه الفاتورة كدين رسمي في سجل الزبون وإرسال إشعار فوري بحركتها المالية/)
      ).toBeInTheDocument();
    });

    it('لا يعرض كرت إشعار الدفع بالدين عند اختيار الدفع النقدي', () => {
      render(
        <POSPaymentModal
          isOpen={true}
          onClose={vi.fn()}
          total={5000}
          paymentMethod="cash"
          setPaymentMethod={vi.fn()}
          paidAmount={5000}
          setPaidAmount={vi.fn()}
          selectedCustomer=""
          setSelectedCustomer={vi.fn()}
          customers={[]}
          onOpenAddCustomer={vi.fn()}
          onConfirmPayment={vi.fn()}
          isPending={false}
        />
      );

      expect(screen.queryByTestId('credit-payment-notice-card')).not.toBeInTheDocument();
    });
  });
});
