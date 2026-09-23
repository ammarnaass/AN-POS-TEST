import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import type { InvoiceStatusToggleParams, InvoiceStatusToggleResult } from '../types';
import { toggleInvoicePaymentStatus } from '../services/posInvoiceStatusService';

export function useInvoiceStatusToggle() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const mutation = useMutation<InvoiceStatusToggleResult, Error, InvoiceStatusToggleParams>({
    mutationFn: (params) => toggleInvoicePaymentStatus(params),
    onSuccess: (result) => {
      // مزامنة كافة كاشات البيانات ذات الصلة
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      const isPaid = result.newStatus === 'paid';
      addNotification({
        title: isPaid ? 'تم تسديد الفاتورة بنجاح' : 'تم تحويل الفاتورة لدين',
        message: isPaid
          ? `تم تغيير حالة الفاتورة #${result.saleNumber} إلى مدفوعة وخصم المبلغ من دين الزبون`
          : `تم تغيير حالة الفاتورة #${result.saleNumber} إلى غير مسددة وقيد المبلغ كدين على الزبون`,
        type: 'success',
      });
    },
    onError: (error) => {
      addNotification({
        title: 'خطأ في تغيير حالة الفاتورة',
        message: error?.message || 'حدث خطأ أثناء تحديث حالة الفاتورة والرصيد',
        type: 'error',
      });
    },
  });

  return {
    toggleStatusMutation: mutation,
    isToggling: mutation.isPending,
    togglePaymentStatus: mutation.mutateAsync,
  };
}
