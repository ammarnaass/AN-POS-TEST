import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, renderHook, act, waitFor } from '@testing-library/react';
import { usePOSSessionStore } from '@/features/pos/store/usePOSSessionStore';
import { usePOSCustomerButton } from '../hooks/usePOSCustomerButton';
import { POSCustomerButton } from '../components/POSCustomerButton';
import { db } from '@/infrastructure/database/dexie/db';
import type { Customer } from '@/types';

describe('usePOSCustomerButton — وحدة إدارة زر الزبون الموحد', () => {
  beforeEach(async () => {
    act(() => {
      usePOSSessionStore.setState({
        selectedCustomer: '',
      });
    });
    await db.customers.clear();
  });

  it('يعيد الحالة الافتراضية بدقة عندما يكون الزبون نقدي (افتراضي)', () => {
    const { result } = renderHook(() => usePOSCustomerButton());

    expect(result.current.isCashCustomer).toBe(true);
    expect(result.current.displayName).toBe('زبون نقدي');
    expect(result.current.balance).toBe(0);
    expect(result.current.hasDebt).toBe(false);
    expect(result.current.hasAdvance).toBe(false);
    expect(result.current.isLimitExceeded).toBe(false);
  });

  it('يحسب المؤشرات المالية بدقة عند تعيين زبون عليه ديون من Dexie', async () => {
    const testCustomer: Customer = {
      id: 'cust-101',
      name: 'محمد بن يحيى',
      phone: '0555123456',
      balance: 15000,
      creditLimit: 50000,
      customerType: 'retail',
      createdAt: new Date().toISOString(),
    };
    await db.customers.put(testCustomer);

    act(() => {
      usePOSSessionStore.setState({
        selectedCustomer: 'cust-101',
      });
    });

    const { result } = renderHook(() => usePOSCustomerButton());

    await waitFor(() => {
      expect(result.current.isCashCustomer).toBe(false);
      expect(result.current.displayName).toBe('محمد بن يحيى');
      expect(result.current.balance).toBe(15000);
      expect(result.current.hasDebt).toBe(true);
      expect(result.current.hasAdvance).toBe(false);
      expect(result.current.isLimitExceeded).toBe(false);
      expect(result.current.remainingCredit).toBe(35000);
    });
  });

  it('يدعم تمرير كائن customer مباشرة في الـ Hook لحساب فوري دون انتظار', () => {
    const directCustomer: Customer = {
      id: 'cust-direct',
      name: 'عميل فوري',
      balance: 5000,
      creditLimit: 20000,
      customerType: 'wholesale',
      createdAt: new Date().toISOString(),
    };

    const { result } = renderHook(() =>
      usePOSCustomerButton({ customer: directCustomer })
    );

    expect(result.current.isCashCustomer).toBe(false);
    expect(result.current.displayName).toBe('عميل فوري');
    expect(result.current.balance).toBe(5000);
    expect(result.current.hasDebt).toBe(true);
  });

  it('يرصد تنبيه تجاوز سقف الائتمان بدقة', async () => {
    const testCustomer: Customer = {
      id: 'cust-102',
      name: 'عمر القاسمي',
      balance: 60000,
      creditLimit: 50000,
      customerType: 'retail',
      createdAt: new Date().toISOString(),
    };
    await db.customers.put(testCustomer);

    act(() => {
      usePOSSessionStore.setState({
        selectedCustomer: 'cust-102',
      });
    });

    const { result } = renderHook(() => usePOSCustomerButton());

    await waitFor(() => {
      expect(result.current.isLimitExceeded).toBe(true);
      expect(result.current.hasDebt).toBe(true);
    });
  });

  it('handleClearCustomer يصفر الزبون المختار ويعيد الحالة إلى زبون نقدي بنقرة واحدة', () => {
    act(() => {
      usePOSSessionStore.setState({
        selectedCustomer: 'cust-101',
      });
    });

    const { result } = renderHook(() => usePOSCustomerButton());

    act(() => {
      result.current.handleClearCustomer();
    });

    expect(usePOSSessionStore.getState().selectedCustomer).toBe('');
  });
});

describe('POSCustomerButton — المكون المرئي بجميع الأنماط (Polymorphic Component)', () => {
  beforeEach(async () => {
    act(() => {
      usePOSSessionStore.setState({
        selectedCustomer: '',
      });
    });
    await db.customers.clear();
  });

  it('يرندر النمط الافتراضي cart_header في الوضع النقدي مع اختصار F2', () => {
    const onSelectCustomer = vi.fn();
    render(
      <POSCustomerButton
        variant="cart_header"
        onSelectCustomer={onSelectCustomer}
      />
    );

    expect(screen.getByText('زبون نقدي')).toBeInTheDocument();
    expect(screen.getByText('F2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('زبون نقدي'));
    expect(onSelectCustomer).toHaveBeenCalledTimes(1);
  });

  it('يرندر cart_header عند تعيين زبون مع شارة الدين وزر الإلغاء السريع X', async () => {
    const testCustomer: Customer = {
      id: 'cust-201',
      name: 'أحمد التاجر',
      balance: 8500,
      creditLimit: 20000,
      customerType: 'retail',
      createdAt: new Date().toISOString(),
    };
    await db.customers.put(testCustomer);

    act(() => {
      usePOSSessionStore.setState({
        selectedCustomer: 'cust-201',
      });
    });

    render(<POSCustomerButton variant="cart_header" />);

    expect(await screen.findByText('أحمد التاجر')).toBeInTheDocument();
    expect(await screen.findByText(/8.*500/)).toBeInTheDocument();

    const clearBtn = screen.getByTitle('إلغاء تعيين الزبون والعودة إلى زبون نقدي');
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(usePOSSessionStore.getState().selectedCustomer).toBe('');
  });

  it('يرندر نمط terminal لشريط التيرمينال فائق الكثافة', () => {
    const onSelectCustomer = vi.fn();
    render(
      <POSCustomerButton
        variant="terminal"
        onSelectCustomer={onSelectCustomer}
      />
    );

    const button = screen.getByRole('button', { name: /اختيار الزبون/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('زبون نقدي')).toBeInTheDocument();

    fireEvent.click(button);
    expect(onSelectCustomer).toHaveBeenCalledTimes(1);
  });

  it('يرندر نمط keypad_tile للوحة أرقام ديزاين 7', () => {
    const onSelectCustomer = vi.fn();
    render(
      <POSCustomerButton
        variant="keypad_tile"
        onSelectCustomer={onSelectCustomer}
      />
    );

    expect(screen.getByText('الزبون')).toBeInTheDocument();
    fireEvent.click(screen.getByText('الزبون'));
    expect(onSelectCustomer).toHaveBeenCalledTimes(1);
  });

  it('يدعم فتح قائمة الإجراءات السريعة (Context Menu) عند النقر بالزر الأيمن أو أيقونة السهم', async () => {
    const testCustomer: Customer = {
      id: 'cust-301',
      name: 'فارس بوعلام',
      balance: 12000,
      createdAt: new Date().toISOString(),
    };
    await db.customers.put(testCustomer);

    act(() => {
      usePOSSessionStore.setState({
        selectedCustomer: 'cust-301',
      });
    });

    const onOpenCustomerLedger = vi.fn();
    const onOpenSettlement = vi.fn();
    const onOpenAddDebt = vi.fn();

    render(
      <POSCustomerButton
        variant="cart_header"
        onOpenCustomerLedger={onOpenCustomerLedger}
        onOpenSettlement={onOpenSettlement}
        onOpenAddDebt={onOpenAddDebt}
      />
    );

    // Wait for customer name to resolve
    await screen.findByText('فارس بوعلام');

    // Open dropdown via chevron
    const chevronBtn = screen.getByTitle('خيارات وإجراءات الزبون');
    fireEvent.click(chevronBtn);

    expect(await screen.findByText('دفتر الحساب والفواتير')).toBeInTheDocument();
    expect(screen.getByText('تسديد دفعة نقدية')).toBeInTheDocument();
    expect(screen.getByText('قيد دين مباشر')).toBeInTheDocument();
    expect(screen.getByText('إلغاء التعيين (زبون نقدي)')).toBeInTheDocument();

    fireEvent.click(screen.getByText('دفتر الحساب والفواتير'));
    expect(onOpenCustomerLedger).toHaveBeenCalledTimes(1);
  });
});

