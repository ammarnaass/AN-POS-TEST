import { describe, it, expect, beforeEach, vi } from 'vitest';
import { posDebtNotificationService } from '../services/posDebtNotificationService';
import { useNotificationStore } from '@/store/notificationStore';
import type { Sale } from '@/types';

describe('posDebtNotificationService (خدمة إشعارات نظام الديون والبيع الآجل)', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      activeToasts: [],
      isCenterOpen: false,
      soundEnabled: true,
    });
    vi.clearAllMocks();
  });

  const mockSale: Sale = {
    id: 'sale-debt-101',
    number: 'INV-2026-101',
    invoiceNumber: 'INV-2026-101',
    date: new Date().toISOString(),
    items: [],
    subtotal: 5000,
    total: 5000,
    paidAmount: 0,
    customerId: 'cust-1',
    customerName: 'أحمد بن علي',
    paymentMethod: 'credit',
    status: 'unpaid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('يطلق إشعار بيع كامل بالآجل بفئة debt وبيانات الديون المهيكلة', () => {
    posDebtNotificationService.notifyCreditSale({
      sale: mockSale,
      debtAmount: 5000,
      currency: 'دج',
      customerName: 'أحمد بن علي',
      customerId: 'cust-1',
      newBalance: 12000,
      creditLimit: 20000,
    });

    const store = useNotificationStore.getState();
    expect(store.notifications).toHaveLength(1);
    const notif = store.notifications[0];

    expect(notif.category).toBe('debt');
    expect(notif.type).toBe('warning');
    expect(notif.title).toContain('تم تسجيل بيع بالآجل');
    expect(notif.message).toContain('INV-2026-101');
    expect(notif.message).toContain('أحمد بن علي');
    expect(notif.action?.label).toBe('سجل ديون الزبائن');
    expect(notif.action?.link).toBe('/customers?id=cust-1');

    expect(notif.debtMetadata).toBeDefined();
    expect(notif.debtMetadata?.actionType).toBe('credit_sale');
    expect(notif.debtMetadata?.debtAmount).toBe(5000);
    expect(notif.debtMetadata?.newBalance).toBe(12000);
    expect(notif.debtMetadata?.isCreditLimitExceeded).toBe(false);
  });

  it('يطلق إشعار بيع جزئي مع بيان المبلغ المدفوع نقداً والمبلغ المقيد ديناً', () => {
    posDebtNotificationService.notifyPartialCreditSale({
      sale: { ...mockSale, paidAmount: 2000 },
      debtAmount: 3000,
      paidAmount: 2000,
      currency: 'دج',
      customerName: 'أحمد بن علي',
      customerId: 'cust-1',
      newBalance: 8000,
    });

    const notif = useNotificationStore.getState().notifications[0];
    expect(notif.category).toBe('debt');
    expect(notif.title).toBe('تم تسجيل بيع جزئي وقيد دين متبقي');
    expect(notif.debtMetadata?.actionType).toBe('partial_sale');
    expect(notif.debtMetadata?.paidAmount).toBe(2000);
    expect(notif.debtMetadata?.debtAmount).toBe(3000);
  });

  it('يطلق إشعار تسديد دين الزبون بنجاح مع الفئة debt والإجراء المالي', () => {
    posDebtNotificationService.notifyDebtSettlement({
      customerId: 'cust-2',
      customerName: 'سمير قادري',
      settledAmount: 4500,
      newBalance: 0,
      currency: 'دج',
      paymentMethod: 'cash',
      receiptNumber: 'RCP-8899',
    });

    const notif = useNotificationStore.getState().notifications[0];
    expect(notif.category).toBe('debt');
    expect(notif.type).toBe('success');
    expect(notif.title).toBe('تم تسجيل تسديد الدين بنجاح');
    expect(notif.message).toContain('RCP-8899');
    expect(notif.action?.label).toBe('كشف حساب الزبون');
    expect(notif.debtMetadata?.actionType).toBe('debt_settlement');
    expect(notif.debtMetadata?.newBalance).toBe(0);
  });

  it('يطلق إشعار إضافة دين يدوي مع ضبط النوع على error عند تجاوز سقف الائتمان', () => {
    posDebtNotificationService.notifyAddDebt({
      customerId: 'cust-3',
      customerName: 'خالد تواتي',
      amount: 15000,
      currency: 'دج',
      newBalance: 35000,
      creditLimit: 30000,
      isLimitExceeded: true,
    });

    const notif = useNotificationStore.getState().notifications[0];
    expect(notif.category).toBe('debt');
    expect(notif.type).toBe('error');
    expect(notif.title).toContain('تجاوز سقف الائتمان');
    expect(notif.debtMetadata?.actionType).toBe('add_debt');
    expect(notif.debtMetadata?.isCreditLimitExceeded).toBe(true);
  });
});
