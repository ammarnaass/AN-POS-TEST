import { useRef, useCallback, useState, useEffect } from 'react';
import type { PaymentMethod, RefundMethod } from '../types';
import {
  calculateChange,
  calculateEffectivePaid,
  isCashAmountSufficient,
} from '../services/posPaymentCalculationService';
import { useCreditSaleValidation } from '@/features/pos/debt';

export interface UsePOSPaymentModalParams {
  isOpen: boolean;
  total: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  paidAmount: number;
  setPaidAmount: (amount: number) => void;
  selectedCustomer: string;
  customers: Array<{ id: string; name: string; phone?: string; balance?: number; creditLimit?: number }>;
  isPending: boolean;
  onConfirmPayment: (
    paid?: number,
    custId?: string,
    method?: string,
    refundMethod?: RefundMethod,
    returnReason?: string,
    transactionReference?: string
  ) => void;
  isReturn?: boolean;
  refundMethod?: RefundMethod;
  setRefundMethod?: (method: RefundMethod) => void;
  initialReturnReason?: string;
  onReturnReasonChange?: (reason: string) => void;
}

export function usePOSPaymentModal({
  isOpen,
  total,
  paymentMethod,
  setPaymentMethod,
  paidAmount,
  setPaidAmount,
  selectedCustomer,
  customers,
  isPending,
  onConfirmPayment,
  isReturn = false,
  refundMethod: propRefundMethod,
  setRefundMethod: propSetRefundMethod,
  initialReturnReason,
  onReturnReasonChange,
}: UsePOSPaymentModalParams) {
  const customerSelectRef = useRef<HTMLSelectElement>(null);
  const paidInputRef = useRef<HTMLInputElement>(null);

  const [localRefundMethod, setLocalRefundMethod] = useState<RefundMethod>(propRefundMethod || 'cash');
  const [returnReason, setReturnReason] = useState<string>(initialReturnReason || 'طلب الزبون (تراجع عن الشراء)');
  const [customReason, setCustomReason] = useState<string>('');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [goodsCondition, setGoodsCondition] = useState<'restock' | 'damaged'>('restock');

  // مزامنة الحالة المحلية عند فتح النافذة أو تغير القيمة من السياق الخارجي
  useEffect(() => {
    if (isOpen) {
      setTransactionReference('');
      setGoodsCondition('restock');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && propRefundMethod) {
      setLocalRefundMethod(propRefundMethod);
    }
  }, [isOpen, propRefundMethod]);

  useEffect(() => {
    if (isOpen && initialReturnReason) {
      setReturnReason(initialReturnReason);
    }
  }, [isOpen, initialReturnReason]);

  const handleChangeReturnReason = useCallback(
    (reason: string) => {
      setReturnReason(reason);
      onReturnReasonChange?.(reason);
    },
    [onReturnReasonChange]
  );

  const effectiveReturnReason =
    returnReason === 'أخرى' && customReason.trim()
      ? customReason.trim()
      : returnReason;

  // الحالة المحلية هي المصدر الوحيد للحقيقة داخل المودال بعد المزامنة
  const activeRefundMethod = localRefundMethod;

  const matchedCustomer = customers.find((c) => c.id === selectedCustomer);
  const isCreditSale = isReturn
    ? activeRefundMethod === 'customer_credit'
    : paymentMethod === 'credit';

  const creditValidation = useCreditSaleValidation({
    customer: matchedCustomer,
    saleTotal: total,
    isCreditSale,
    isOpen,
  });

  const isConfirmDisabled =
    isPending ||
    (isReturn && activeRefundMethod === 'customer_credit' && !selectedCustomer) ||
    (!isReturn && isCreditSale && (!selectedCustomer || creditValidation.isConfirmDisabled));
    // ملاحظة: في وضع الإرجاع لا نتحقق من سقف الدين لأن المرتجع يُنقص الدين ولا يزيده

  const handleSelectRefundMethod = useCallback(
    (method: RefundMethod) => {
      setLocalRefundMethod(method);
      propSetRefundMethod?.(method);
      if (method === 'cash') {
        setPaymentMethod('cash');
        setPaidAmount(total);
      } else {
        setPaymentMethod('credit');
        setPaidAmount(0);
      }
    },
    [propSetRefundMethod, setPaymentMethod, setPaidAmount, total]
  );

  const handleConfirm = useCallback(() => {
    if (isPending) return;

    if (isReturn) {
      if (activeRefundMethod === 'customer_credit' && !selectedCustomer) {
        customerSelectRef.current?.focus();
        return;
      }
      const finalPaid = activeRefundMethod === 'cash' ? total : 0;
      const finalMethod = activeRefundMethod === 'cash' ? 'cash' : 'credit';
      onConfirmPayment(finalPaid, selectedCustomer, finalMethod, activeRefundMethod, effectiveReturnReason);
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomer) {
      customerSelectRef.current?.focus();
      return;
    }

    if (creditValidation.isCreditLimitExceeded && !creditValidation.overrideCreditLimit) {
      return;
    }

    const finalPaid = calculateEffectivePaid(paymentMethod, paidAmount, total);
    onConfirmPayment(
      finalPaid,
      selectedCustomer,
      paymentMethod,
      undefined,
      undefined,
      transactionReference.trim() || undefined
    );
  }, [
    isPending,
    isReturn,
    activeRefundMethod,
    effectiveReturnReason,
    paymentMethod,
    selectedCustomer,
    creditValidation,
    paidAmount,
    total,
    transactionReference,
    onConfirmPayment,
  ]);

  const handleSelectPaymentMethod = useCallback(
    (method: PaymentMethod) => {
      setPaymentMethod(method);
      if (method === 'credit') {
        setPaidAmount(0);
      } else if (paidAmount === 0) {
        setPaidAmount(total);
      }
    },
    [setPaymentMethod, setPaidAmount, paidAmount, total]
  );

  const changeDue = calculateChange(total, paidAmount);
  const isPaidSufficient = isCashAmountSufficient(total, paidAmount);

  return {
    customerSelectRef,
    paidInputRef,
    matchedCustomer,
    creditValidation,
    isCreditSale,
    isConfirmDisabled,
    handleConfirm,
    handleSelectPaymentMethod,
    handleSelectRefundMethod,
    refundMethod: activeRefundMethod,
    returnReason,
    customReason,
    setReturnReason: handleChangeReturnReason,
    setCustomReason,
    effectiveReturnReason,
    transactionReference,
    setTransactionReference,
    goodsCondition,
    setGoodsCondition,
    changeDue,
    isPaidSufficient,
  };
}
