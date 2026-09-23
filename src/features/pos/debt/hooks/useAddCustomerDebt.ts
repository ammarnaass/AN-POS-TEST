import { useState, useMemo, useCallback } from 'react';
import { useNotificationStore } from '@/store/notificationStore';
import type { Customer } from '@/types';
import { addCustomerDebtRecord } from '../services/posCustomerDebtService';
import { printPOSDebtAdditionSlip } from '../services/posDebtReceiptService';
import { posDebtNotificationService } from '../services/posDebtNotificationService';
import type { AddCustomerDebtResult } from '../types';

export interface UseAddCustomerDebtProps {
  customer?: Customer | null;
  currentSessionId?: string | null;
  shopName?: string;
  currencySymbol?: string;
  onSuccess?: (result: AddCustomerDebtResult) => void;
  onClose?: () => void;
}

export function useAddCustomerDebt({
  customer,
  currentSessionId,
  shopName = 'نقطة البيع',
  currencySymbol = 'دج',
  onSuccess,
  onClose,
}: UseAddCustomerDebtProps) {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [overrideCreditLimit, setOverrideCreditLimit] = useState<boolean>(false);
  const [printReceipt, setPrintReceipt] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount) || 0;
  const currentBalance = Number(customer?.balance || 0);
  const creditLimit = Number(customer?.creditLimit || 0);
  const projectedBalance = currentBalance + numericAmount;

  const isLimitExceeded = Boolean(customer?.id) && creditLimit > 0 && projectedBalance > creditLimit;
  const excessAmount = isLimitExceeded ? projectedBalance - creditLimit : 0;

  // Preset reasons
  const commonReasons = [
    'رصيد سابق / افتتاح حساب',
    'بضاعة إضافية / طلبية سابقة',
    'خدمة صيانة / تصليح',
    'مصاريف نقل وتوصيل',
    'قيد تسوية يدوي',
  ];

  // Preset amounts
  const amountPresets = [500, 1000, 2000, 5000, 10000, 20000];

  const handleApplyPresetAmount = useCallback((presetVal: number) => {
    setAmount(String(presetVal));
    setError(null);
  }, []);

  const handleAddPresetAmount = useCallback((presetVal: number) => {
    setAmount((prev) => {
      const current = Number(prev) || 0;
      return String(current + presetVal);
    });
    setError(null);
  }, []);

  const resetForm = useCallback(() => {
    setAmount('');
    setReason('');
    setNote('');
    setOverrideCreditLimit(false);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!customer?.id) {
      setError('يرجى اختيار زبون مسجل لإضافة الدين.');
      return;
    }

    if (numericAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }

    if (isLimitExceeded && !overrideCreditLimit) {
      setError(`تجاوز سقف الائتمان بمقدار ${excessAmount.toLocaleString('fr-DZ')} ${currencySymbol}. يتطلب تفعيل تصريح المشرف.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await addCustomerDebtRecord({
        customerId: customer.id,
        customerName: customer.name,
        amount: numericAmount,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
        overrideCreditLimit,
        currentSessionId,
      });

      if (printReceipt) {
        printPOSDebtAdditionSlip(
          result,
          customer.name,
          customer.phone,
          shopName,
          currencySymbol
        );
      }

      posDebtNotificationService.notifyAddDebt({
        customerId: customer.id,
        customerName: customer.name,
        amount: numericAmount,
        currency: currencySymbol,
        newBalance: result.newBalance,
        creditLimit,
        isLimitExceeded,
      });

      resetForm();
      onSuccess?.(result);
      onClose?.();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تسجيل قيد الدين.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    customer,
    numericAmount,
    isLimitExceeded,
    overrideCreditLimit,
    excessAmount,
    currencySymbol,
    reason,
    note,
    currentSessionId,
    printReceipt,
    shopName,
    resetForm,
    onSuccess,
    onClose,
  ]);

  return {
    amount,
    setAmount,
    numericAmount,
    reason,
    setReason,
    note,
    setNote,
    overrideCreditLimit,
    setOverrideCreditLimit,
    printReceipt,
    setPrintReceipt,
    isSubmitting,
    error,
    currentBalance,
    creditLimit,
    projectedBalance,
    isLimitExceeded,
    excessAmount,
    commonReasons,
    amountPresets,
    handleApplyPresetAmount,
    handleAddPresetAmount,
    handleSubmit,
    resetForm,
  };
}
