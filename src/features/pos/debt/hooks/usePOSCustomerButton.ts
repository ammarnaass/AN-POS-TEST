import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/infrastructure/database/dexie/db';
import type { Customer } from '@/types';
import { usePOSSessionStore } from '../../store/usePOSSessionStore';
import { getCustomerDebtSummary } from '../services/posCustomerDebtService';

export interface UsePOSCustomerButtonProps {
  customer?: Customer | null;
  customers?: Customer[];
  fallbackCustomerName?: string;
  onSelectCustomerModal?: () => void;
  onOpenCustomerLedgerModal?: () => void;
  onOpenSettlementModal?: () => void;
  onOpenAddDebtModal?: () => void;
  onOpenQuickNewCustomerModal?: () => void;
}

/**
 * usePOSCustomerButton
 * خطاف إدارة زر الزبون الموحد في نقطة البيع وفق المعمارية القوية المستقلة.
 * يربط الزر بالحالة المركزية وقاعدة البيانات Dexie دون أي اعتمادية قسرية على React Query،
 * مما يضمن العمل بنسبة 100% في جميع أنماط التصاميم واختبارات الوحدة.
 */
export function usePOSCustomerButton({
  customer: propCustomer,
  customers: propCustomers,
  fallbackCustomerName,
  onSelectCustomerModal,
  onOpenCustomerLedgerModal,
  onOpenSettlementModal,
  onOpenAddDebtModal,
  onOpenQuickNewCustomerModal,
}: UsePOSCustomerButtonProps = {}) {
  const selectedCustomerId = usePOSSessionStore((s) => s.selectedCustomer);
  const setSelectedCustomer = usePOSSessionStore((s) => s.setSelectedCustomer);

  const [dbCustomer, setDbCustomer] = useState<Customer | null>(null);

  // العميل المحسوب بناءً على الخصائص الممررة أو المحملة من Dexie
  const customer = useMemo(() => {
    if (propCustomer !== undefined) return propCustomer;
    if (propCustomers && selectedCustomerId) {
      return propCustomers.find((c) => c.id === selectedCustomerId) || null;
    }
    return dbCustomer;
  }, [propCustomer, propCustomers, selectedCustomerId, dbCustomer]);

  // تحميل بيانات العميل من Dexie عند تغيير الزبون المختار إذا لم يتم تمرير كائن مباشر
  useEffect(() => {
    if (propCustomer !== undefined) return;
    if (propCustomers !== undefined) return;

    if (!selectedCustomerId) {
      setDbCustomer(null);
      return;
    }

    let isMounted = true;
    db.customers
      .get(selectedCustomerId)
      .then((c) => {
        if (isMounted) {
          setDbCustomer(c || null);
        }
      })
      .catch((err) => {
        console.error('Failed to load customer in usePOSCustomerButton:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCustomerId, propCustomer, propCustomers]);

  // الاستماع لتحديثات قاعدة البيانات اللحظية عبر IPC
  useEffect(() => {
    if (propCustomer !== undefined || propCustomers !== undefined) return;
    if (!selectedCustomerId) return;

    const electron = (window as any).electronAPI;
    if (electron?.db?.onTableUpdated) {
      return electron.db.onTableUpdated((data: { table: string }) => {
        if (data.table === 'customers' || data.table === 'payments' || data.table === 'sales') {
          db.customers.get(selectedCustomerId).then((c) => {
            if (c) setDbCustomer(c);
          }).catch(() => {});
        }
      });
    }
  }, [selectedCustomerId, propCustomer, propCustomers]);

  // الملخص المالي لديون الزبون
  const debtSummary = useMemo(() => {
    return getCustomerDebtSummary(customer);
  }, [customer]);

  const isCashCustomer = !selectedCustomerId && !customer;
  const displayName = customer?.name || fallbackCustomerName || (isCashCustomer ? 'زبون نقدي' : 'زبون مسجل');
  const balance = debtSummary.balance;
  const creditLimit = debtSummary.creditLimit;
  const isLimitExceeded = debtSummary.isCreditLimitExceeded;
  const hasDebt = balance > 0;
  const hasAdvance = balance < 0;
  const remainingCredit = debtSummary.remainingCredit;

  // فتح نافذة اختيار الزبون
  const handleSelectCustomer = useCallback(() => {
    onSelectCustomerModal?.();
  }, [onSelectCustomerModal]);

  // تفريغ الزبون المختار والعودة للزبون النقدي بنقرة واحدة
  const handleClearCustomer = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedCustomer('');
    setDbCustomer(null);
  }, [setSelectedCustomer]);

  // الإجراءات المساعدة
  const handleOpenLedger = useCallback(() => {
    onOpenCustomerLedgerModal?.();
  }, [onOpenCustomerLedgerModal]);

  const handleOpenSettlement = useCallback(() => {
    onOpenSettlementModal?.();
  }, [onOpenSettlementModal]);

  const handleOpenAddDebt = useCallback(() => {
    onOpenAddDebtModal?.();
  }, [onOpenAddDebtModal]);

  const handleOpenQuickNewCustomer = useCallback(() => {
    onOpenQuickNewCustomerModal?.();
  }, [onOpenQuickNewCustomerModal]);

  return {
    selectedCustomerId,
    customer,
    displayName,
    isCashCustomer,
    balance,
    creditLimit,
    isLimitExceeded,
    hasDebt,
    hasAdvance,
    remainingCredit,
    debtSummary,
    handleSelectCustomer,
    handleClearCustomer,
    handleOpenLedger,
    handleOpenSettlement,
    handleOpenAddDebt,
    handleOpenQuickNewCustomer,
  };
}

