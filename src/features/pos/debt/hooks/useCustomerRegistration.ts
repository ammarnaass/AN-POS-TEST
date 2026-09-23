import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import type { Customer } from '@/types';
import type { QuickCustomerInput } from '../types';
import { createQuickCustomerRecord } from '../services/posCustomerDebtService';

export interface UseCustomerRegistrationOptions {
  onSuccess?: (newCustomer: Customer) => void;
  onClose?: () => void;
}

export function useCustomerRegistration(options: UseCustomerRegistrationOptions = {}) {
  const { onSuccess, onClose } = options;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | ''>(50000);
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale' | 'semi_wholesale'>('retail');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const resetForm = useCallback(() => {
    setName('');
    setPhone('');
    setCreditLimit(50000);
    setAddress('');
    setCustomerType('retail');
    setError(null);
    setIsSubmitting(false);
  }, []);

  const registerCustomer = useCallback(
    async (customInput?: Partial<QuickCustomerInput>) => {
      const finalName = (customInput?.name ?? name).trim();
      const finalPhone = (customInput?.phone ?? phone).trim();
      const finalLimit = customInput?.creditLimit ?? (typeof creditLimit === 'number' ? creditLimit : 50000);
      const finalAddress = (customInput?.address ?? address).trim();
      const finalType = customInput?.customerType ?? customerType;

      if (!finalName) {
        setError('اسم الزبون مطلوب.');
        return null;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const newCustomer = await createQuickCustomerRecord({
          name: finalName,
          phone: finalPhone,
          creditLimit: finalLimit,
          address: finalAddress,
          customerType: finalType,
        });

        // Optimistically update query cache immediately so customer is ready and visible
        queryClient.setQueryData<Customer[]>(['customers'], (old) => {
          if (!old) return [newCustomer];
          const exists = old.some((c) => c.id === newCustomer.id);
          return exists ? old.map((c) => (c.id === newCustomer.id ? newCustomer : c)) : [...old, newCustomer];
        });

        // Invalidate customers list across React Query in background
        queryClient.invalidateQueries({ queryKey: ['customers'] });

        addNotification({
          title: 'تم تسجيل الزبون بنجاح',
          message: `${newCustomer.name} أصبح متاحاً الآن في الفاتورة`,
          type: 'success',
        });

        resetForm();
        onSuccess?.(newCustomer);
        onClose?.();
        return newCustomer;
      } catch (err: any) {
        const errMsg = err?.message || 'تعذر حفظ بيانات الزبون الجديد.';
        setError(errMsg);
        addNotification({
          title: 'خطأ في تسجيل الزبون',
          message: errMsg,
          type: 'error',
        });
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [name, phone, creditLimit, address, customerType, queryClient, addNotification, resetForm, onSuccess, onClose]
  );

  return {
    name,
    setName,
    phone,
    setPhone,
    creditLimit,
    setCreditLimit,
    address,
    setAddress,
    customerType,
    setCustomerType,
    isSubmitting,
    error,
    resetForm,
    registerCustomer,
  };
}
