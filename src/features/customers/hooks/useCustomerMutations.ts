import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Customer } from '@/types';
import { generateId } from '@/utils';
import type { CustomerFormData, PaymentVoucherData } from '../types';

interface AddPaymentParams {
  customerId: string;
  amount: number;
  currentBalance: number;
  method: string;
  note: string;
  date?: string;
  customerName: string;
  customerPhone?: string;
}

export interface UseCustomerMutationsOptions {
  onAddPaymentSuccess?: (voucherData: PaymentVoucherData) => void;
  onPaymentSuccess?: (voucherData: PaymentVoucherData) => void;
  onDeleteSuccess?: () => void;
}

export function useCustomerMutations(
  optionsOrCallback?: UseCustomerMutationsOptions | ((voucher: PaymentVoucherData) => void)
) {
  const queryClient = useQueryClient();

  const options: UseCustomerMutationsOptions =
    typeof optionsOrCallback === 'function'
      ? { onPaymentSuccess: optionsOrCallback }
      : optionsOrCallback || {};

  const handlePaymentSuccess = (voucherData: PaymentVoucherData) => {
    if (typeof options.onAddPaymentSuccess === 'function') {
      options.onAddPaymentSuccess(voucherData);
    } else if (typeof options.onPaymentSuccess === 'function') {
      options.onPaymentSuccess(voucherData);
    }
  };

  const addCustomerMutation = useMutation({
    mutationFn: (data: CustomerFormData) =>
      db.customers.add({
        id: generateId(),
        name: data.name.trim(),
        phone: data.phone.trim(),
        creditLimit: Number(data.creditLimit) || 0,
        balance: Number(data.balance) || 0,
        customerType: data.customerType || 'retail',
        rc: data.rc?.trim() || undefined,
        nif: data.nif?.trim() || undefined,
        nis: data.nis?.trim() || undefined,
        address: data.address?.trim() || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (data: Customer) =>
      db.customers.update(data.id, {
        name: data.name.trim(),
        phone: data.phone.trim(),
        creditLimit: Number(data.creditLimit) || 0,
        balance: Number(data.balance) || 0,
        customerType: data.customerType || 'retail',
        rc: data.rc?.trim() || undefined,
        nif: data.nif?.trim() || undefined,
        nis: data.nis?.trim() || undefined,
        address: data.address?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => db.customers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      options.onDeleteSuccess?.();
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async ({
      customerId,
      amount,
      currentBalance,
      method,
      note,
      date,
      customerName,
      customerPhone,
    }: AddPaymentParams): Promise<PaymentVoucherData> => {
      const now = new Date();
      const paymentDate = date
        ? new Date(`${date}T${now.toTimeString().slice(0, 8)}`).toISOString()
        : now.toISOString();
      const paymentId = generateId();

      await db.payments.add({
        id: paymentId,
        date: paymentDate,
        partyType: 'customer',
        party_type: 'customer',
        partyId: customerId,
        party_id: customerId,
        customerId,
        customer_id: customerId,
        amount: Number(amount) || 0,
        type: 'credit',
        method: method as any,
        note: note || '',
        createdBy: 'الكاشير',
        created_by: 'الكاشير',
        createdAt: paymentDate,
        created_at: paymentDate,
      });

      const freshCustomer = await db.customers.get(customerId);
      const actualBalance = Number(freshCustomer?.balance ?? currentBalance ?? 0);
      const newBalance = Math.max(0, actualBalance - amount);

      await db.customers.update(customerId, {
        balance: newBalance,
        updatedAt: paymentDate,
      });

      return {
        customerName,
        customerPhone,
        amount,
        date: paymentDate,
        method,
        note,
        previousBalance: actualBalance,
        newBalance,
      };
    },
    onSuccess: (voucherData) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (voucherData) {
        handlePaymentSuccess(voucherData);
      }
    },
    onError: (error) => {
      console.error('Customer payment registration error:', error);
    },
  });

  const importCustomersMutation = useMutation({
    mutationFn: (importedList: Customer[]) =>
      db.customers.bulkAdd(
        importedList.map((c) => ({
          ...c,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    addCustomerMutation,
    updateCustomerMutation,
    deleteCustomerMutation,
    addPaymentMutation,
    importCustomersMutation,
  };
}
