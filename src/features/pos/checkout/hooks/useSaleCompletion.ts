import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import type { Sale } from '@/types';
import { isTrialExpired, incrementTrialSales } from '@/services/trialService';
import { isLicensed } from '@/services/licenseService';
import {
  prepareSaleTransaction,
  executeAtomicSaleTransaction,
} from '../services/posSaleTransactionService';
import { handleSaleAutoPrint } from '../services/posSalePrintingService';
import type { SaleSettings, SaleCompletionParams, SaleCompletionResult } from '../types';

export function useSaleCompletion(
  settings: SaleSettings,
  onSaleSuccess?: (sale: Sale) => void
) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { clear: clearCart } = useCartStore();

  const completeSaleMutation = useMutation<SaleCompletionResult, Error, SaleCompletionParams>({
    mutationFn: async (params: SaleCompletionParams): Promise<SaleCompletionResult> => {
      // 1. التحقق من صلاحية الترخيص والفترة التجريبية
      if (
        currentUser?.role !== 'developer' &&
        !isLicensed() &&
        isTrialExpired(currentUser?.role)
      ) {
        throw new Error('انتهت فترة التجربة المجانية (7 أيام). يرجى تفعيل النظام للمتابعة.');
      }

      const currentUserName = currentUser?.name || '';

      // 2. تجهيز بيانات المعاملة وحساب فروقات المخزون والمبالغ
      const prepared = await prepareSaleTransaction(params, settings, currentUserName);

      // 3. تحديث تفاؤلي فوري لكاش المنتجات في React Query (0ms Latency)
      queryClient.setQueryData<any[]>(['products'], (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((p) => {
          const delta = prepared.deltas.get(p.id);
          if (delta === undefined) return p;
          const newQuantity = settings?.allowNegativeStock
            ? p.quantity + delta
            : Math.max(0, p.quantity + delta);
          return { ...p, quantity: newQuantity };
        });
      });

      // 4. تحديث تفاؤلي فوري لرصيد العميل إذا كان بيعاً بالآجل أو مرتجعاً على الحساب
      if (params.selectedCustomer) {
        queryClient.setQueryData<any[]>(['customers'], (old) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((c) => {
            if (c.id !== params.selectedCustomer) return c;
            if (prepared.saleType === 'return') {
              const isCustomerCreditRefund =
                params.refundMethod === 'customer_credit' ||
                (prepared.sale.paymentMethod === 'credit' && params.refundMethod !== 'cash');
              if (isCustomerCreditRefund) {
                return { ...c, balance: (c.balance || 0) - prepared.saleSummary.total };
              }
              // إذا كان الإرجاع نقداً: لا نعدل رصيد العميل تفاؤلياً
              return c;
            } else if (prepared.sale.paymentMethod === 'credit') {
              const unpaidPart = Math.max(
                0,
                prepared.saleSummary.total - (prepared.sale.paidAmount || 0)
              );
              return { ...c, balance: (c.balance || 0) + unpaidPart };
            }
            return c;
          });
        });
      }

      // 4.1 تحديث تفاؤلي فوري لجلسة الصندوق في حال الإرجاع النقدي أو البيع النقدي
      const activeSessionId = params.currentSession?.id;
      if (activeSessionId) {
        queryClient.setQueryData<any[]>(['cashSessions'], (old) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((s) => {
            if (s.id !== activeSessionId) return s;
            if (prepared.saleType === 'return') {
              const isCashRefund =
                params.refundMethod === 'cash' ||
                (!params.refundMethod && prepared.sale.paymentMethod === 'cash');
              if (isCashRefund) {
                return {
                  ...s,
                  totalReturns: (s.totalReturns || 0) + prepared.saleSummary.total,
                  actualBalance: (s.actualBalance || 0) - prepared.saleSummary.total,
                };
              }
            } else if (prepared.sale.paidAmount && prepared.sale.paidAmount > 0) {
              return {
                ...s,
                totalSales: (s.totalSales || 0) + prepared.sale.paidAmount,
                actualBalance: (s.actualBalance || 0) + prepared.sale.paidAmount,
              };
            }
            return s;
          });
        });
      }

      // 5. تنفيذ المعاملة الذرية في قاعدة البيانات (Electron IPC أو Dexie)
      await executeAtomicSaleTransaction({
        prepared,
        settings,
        currentUserName,
        currentSessionId: params.currentSession?.id,
        params,
      });

      return {
        sale: prepared.sale,
        autoPrint: params.autoPrint ?? settings.autoPrintReceipt ?? false,
      };
    },
    onSuccess: ({ sale, autoPrint }: SaleCompletionResult) => {
      // مزامنة الكاش
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales', 'return-candidates'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });

      // زيادة عدّاد مبيعات التجربة إذا كانت سارية
      if (currentUser?.role !== 'developer' && !isLicensed()) {
        incrementTrialSales();
      }

      // الطباعة التلقائية في الخلفية
      if (autoPrint && sale) {
        handleSaleAutoPrint(sale, settings, currentUser);
      }

      // تفريغ السلة
      clearCart();

      // إرسال إشعار فوري
      const isReturn = sale.type === 'return';
      const formattedTotal = Number(sale.total || 0).toLocaleString('ar-DZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      addNotification({
        title: isReturn ? 'تم تسجيل المرتجع بنجاح' : 'تم إتمام عملية البيع بنجاح',
        message: isReturn
          ? `مرتجع بقيمة ${formattedTotal} ${settings?.baseCurrency || 'دج'}`
          : `فاتورة رقم ${sale.invoiceNumber || sale.id?.slice(0, 8) || ''} بقيمة ${formattedTotal} ${settings?.baseCurrency || 'دج'}`,
        type: 'success',
        category: 'sales',
      });

      if (onSaleSuccess) {
        onSaleSuccess(sale);
      }
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      addNotification({
        title: 'خطأ في إتمام البيع',
        message: error?.message || 'حدث خطأ غير متوقع أثناء حفظ العملية',
        type: 'error',
      });
    },
  });

  return {
    completeSale: completeSaleMutation.mutate,
    completeSaleAsync: completeSaleMutation.mutateAsync,
    isPending: completeSaleMutation.isPending,
  };
}
