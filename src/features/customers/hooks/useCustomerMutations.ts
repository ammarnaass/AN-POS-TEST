import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useNotificationStore } from '@/store/notificationStore';
import type { Customer } from '@/types';
import { generateId } from '@/utils';
import type { CustomerFormData, PaymentVoucherData } from '../types';
import type { InvoiceAllocationResult } from '@/features/pos/debt/types';

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
  const addNotification = useNotificationStore((s) => s.addNotification);

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
    mutationFn: async (data: CustomerFormData) => {
      const now = new Date().toISOString();
      const newCustomer: Customer = {
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
        createdAt: now,
        updatedAt: now,
      };
      await db.customers.add(newCustomer as any);
      return newCustomer;
    },
    onSuccess: (newCust) => {
      if (newCust) {
        queryClient.setQueryData<Customer[]>(['customers'], (old = []) => {
          const exists = old.some((c) => c.id === newCust.id);
          if (exists) return old.map((c) => (c.id === newCust.id ? newCust : c));
          return [newCust, ...old];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addNotification({
        type: 'success',
        title: 'تم تسجيل الزبون',
        message: `تمت إضافة الزبون "${newCust.name}" بنجاح`,
      });
    },
    onError: (err: any) => {
      console.error('Error adding customer:', err);
      addNotification({
        type: 'error',
        title: 'خطأ في إضافة الزبون',
        message: err?.message || 'تعذر حفظ بيانات الزبون في قاعدة البيانات',
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: Customer) => {
      const updated: Partial<Customer> = {
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
      };
      await db.customers.update(data.id, updated as any);
      return { ...data, ...updated };
    },
    onSuccess: (updatedCust) => {
      if (updatedCust) {
        queryClient.setQueryData<Customer[]>(['customers'], (old = []) =>
          old.map((c) => (c.id === updatedCust.id ? updatedCust : c))
        );
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addNotification({
        type: 'success',
        title: 'تم تحديث الزبون',
        message: `تم تعديل بيانات الزبون "${updatedCust.name}" بنجاح`,
      });
    },
    onError: (err: any) => {
      console.error('Error updating customer:', err);
      addNotification({
        type: 'error',
        title: 'خطأ في تعديل الزبون',
        message: err?.message || 'تعذر تعديل بيانات الزبون في قاعدة البيانات',
      });
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

      // إذا كان الدفع نقداً، نقيد حركة إيداع في جلسة الصندوق المفتوحة لضبط الجرد النقدي
      if (method === 'cash') {
        try {
          const openSession = await db.cash_sessions.where('status').equals('open').first();
          if (openSession) {
            const newDeposit = {
              amount: Number(amount) || 0,
              note: `تحصيل دين عميل: ${customerName}`,
              createdAt: paymentDate,
            };
            await db.cash_sessions.update(openSession.id, {
              deposits: [...(openSession.deposits || []), newDeposit],
              updatedAt: new Date().toISOString(),
            });
          }
        } catch (sessionErr) {
          console.error('Failed to link cash collection to open cash session:', sessionErr);
        }
      }

      // تسوية فواتير المبيعات المعلقة بنظام FIFO
      try {
        const pendingSales = await db.sales
          .where('customerId')
          .equals(customerId)
          .filter((s) => s.type !== 'return' && s.status !== 'paid')
          .toArray();

        // فرز الفواتير من الأقدم إلى الأحدث
        const sorted = [...pendingSales].sort((a, b) => {
          const timeA = a.date ? new Date(a.date).getTime() : 0;
          const timeB = b.date ? new Date(b.date).getTime() : 0;
          return timeA - timeB;
        });

        let remainingPay = Number(amount) || 0;
        const allocations: InvoiceAllocationResult[] = [];
        for (const inv of sorted) {
          if (remainingPay <= 0) break;
          const curPaid = Number(inv.paidAmount ?? inv.amountPaid ?? 0);
          const totalInv = Number(inv.total || 0);
          const unpaid = Math.max(0, totalInv - curPaid);
          if (unpaid <= 0) continue;

          const alloc = Math.min(remainingPay, unpaid);
          const newPaid = curPaid + alloc;
          const remainingAfter = Math.max(0, totalInv - newPaid);
          const newStatus = remainingAfter === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

          await db.sales.update(inv.id, {
            paidAmount: newPaid,
            amountPaid: newPaid,
            status: newStatus,
            updatedAt: paymentDate,
          });

          allocations.push({
            saleId: inv.id,
            invoiceNumber: inv.number,
            allocatedAmount: alloc,
            remainingDebt: remainingAfter,
            previousPaid: curPaid,
            newPaid,
            newStatus,
          });

          remainingPay -= alloc;
        }

        const freshCustomer = await db.customers.get(customerId);
        const actualBalance = Number(freshCustomer?.balance ?? currentBalance ?? 0);
        // حساب الرصيد الجديد دون تصفير قسري؛ في حال تجاوز الدفعة للدين يصبح الرصيد سالباً (رصيد دائن للزبون)
        const newBalance = actualBalance - (Number(amount) || 0);

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
          allocations,
        };
      } catch (salesErr) {
        console.error('Failed to allocate payment to customer sales:', salesErr);
      }

      const freshCustomer = await db.customers.get(customerId);
      const actualBalance = Number(freshCustomer?.balance ?? currentBalance ?? 0);
      const newBalance = actualBalance - (Number(amount) || 0);

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
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      queryClient.invalidateQueries({ queryKey: ['cash_sessions'] });
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
