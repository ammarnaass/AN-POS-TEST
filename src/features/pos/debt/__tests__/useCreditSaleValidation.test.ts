import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreditSaleValidation } from '../hooks/useCreditSaleValidation';
import type { Customer } from '@/types';

describe('useCreditSaleValidation', () => {
  const sampleCustomer: Customer = {
    id: 'cust-1',
    name: 'أحمد بن علي',
    phone: '0555123456',
    creditLimit: 50000,
    balance: 10000,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  it('allows non-credit payment without restrictions', () => {
    const { result } = renderHook(() =>
      useCreditSaleValidation({
        customer: sampleCustomer,
        saleTotal: 25000,
        isCreditSale: false,
      })
    );

    expect(result.current.isCreditSale).toBe(false);
    expect(result.current.isConfirmDisabled).toBe(false);
    expect(result.current.validationError).toBeNull();
  });

  it('blocks credit payment if no customer is selected', () => {
    const { result } = renderHook(() =>
      useCreditSaleValidation({
        customer: null,
        saleTotal: 5000,
        isCreditSale: true,
      })
    );

    expect(result.current.isCreditSale).toBe(true);
    expect(result.current.isConfirmDisabled).toBe(true);
    expect(result.current.validationError).toContain('يجب اختيار زبون مسجل');
  });

  it('permits credit sale within customer credit limit', () => {
    const { result } = renderHook(() =>
      useCreditSaleValidation({
        customer: sampleCustomer, // balance 10,000, limit 50,000
        saleTotal: 20000, // projected: 30,000 <= 50,000
        isCreditSale: true,
      })
    );

    expect(result.current.projectedDebt).toBe(30000);
    expect(result.current.isCreditLimitExceeded).toBe(false);
    expect(result.current.creditExcessAmount).toBe(0);
    expect(result.current.isConfirmDisabled).toBe(false);
  });

  it('detects credit limit excess and blocks confirmation unless supervisor overrides', () => {
    const { result } = renderHook(() =>
      useCreditSaleValidation({
        customer: sampleCustomer, // balance 10,000, limit 50,000
        saleTotal: 45000, // projected: 55,000 > 50,000
        isCreditSale: true,
      })
    );

    expect(result.current.projectedDebt).toBe(55000);
    expect(result.current.isCreditLimitExceeded).toBe(true);
    expect(result.current.creditExcessAmount).toBe(5000);
    expect(result.current.isConfirmDisabled).toBe(true);
    expect(result.current.validationError).toContain('تجاوز سقف الائتمان');

    // Supervisor override
    act(() => {
      result.current.setOverrideCreditLimit(true);
    });

    expect(result.current.overrideCreditLimit).toBe(true);
    expect(result.current.isConfirmDisabled).toBe(false);
  });

  it('identifies advance credit (negative customer balance)', () => {
    const advanceCustomer: Customer = {
      ...sampleCustomer,
      balance: -5000,
    };

    const { result } = renderHook(() =>
      useCreditSaleValidation({
        customer: advanceCustomer,
        saleTotal: 3000,
        isCreditSale: true,
      })
    );

    expect(result.current.hasCreditAdvance).toBe(true);
    expect(result.current.projectedDebt).toBe(-2000);
    expect(result.current.isCreditLimitExceeded).toBe(false);
  });
});
