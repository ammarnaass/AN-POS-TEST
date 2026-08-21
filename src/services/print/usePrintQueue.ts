// Print Queue Hooks — POS-PRINT-001 Phase 2
// Hooks لمتابعة طابور الطباعة + TTL sweep + المعالجة
import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getQueueJobs,
  processQueue,
  cancelJob,
  retryJob,
  deleteJob,
  enqueuePrintJob,
} from './printQueueService';
import { sweepPendingJobs } from './printQueueSweep';
import type { PrintJobStatus } from '@/infrastructure/database/dexie/db';
import type { DocTypeKey } from '@/types/invoicePrint';
import { useNotificationStore } from '@/store/notificationStore';

/**
 * Hook لجلب مهام الطابور
 */
export function usePrintQueue(status?: PrintJobStatus) {
  return useQuery({
    queryKey: ['printJobs', status ?? 'all'],
    queryFn: () => getQueueJobs(status),
    refetchInterval: 5000, // polling كل 5 ثوانٍ
  });
}

/**
 * Hook لإضافة مهمة للطابور
 */
export function useEnqueuePrintJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opts: {
      saleId: string;
      docType?: DocTypeKey;
      userId: string;
      userName: string;
      templateId?: string;
      copies?: number;
      isReprint?: boolean;
    }) => enqueuePrintJob(opts.saleId, opts.docType, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printJobs'] });
    },
  });
}

/**
 * Hook لإلغاء مهمة
 */
export function useCancelPrintJob() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  return useMutation({
    mutationFn: async (id: string) => cancelJob(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['printJobs'] });
      if (!result.cancelled) {
        addNotification({
          title: 'تعذّر الإلغاء',
          message: result.reason === 'job_in_progress'
            ? 'المهمة قيد الطباعة ولا يمكن إلغاؤها'
            : (result.reason ?? 'خطأ غير معروف'),
          type: 'warning',
        });
      }
    },
  });
}

/**
 * Hook لإعادة محاولة مهمة فاشلة
 */
export function useRetryPrintJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => retryJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printJobs'] });
    },
  });
}

/**
 * Hook لحذف مهمة نهائية
 */
export function useDeletePrintJob() {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  return useMutation({
    mutationFn: async (id: string) => deleteJob(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['printJobs'] });
      if (!result.deleted) {
        addNotification({
          title: 'تعذّر الحذف',
          message: result.reason ?? 'خطأ غير معروف',
          type: 'warning',
        });
      }
    },
  });
}

/**
 * Hook لمعالجة الطابور يدوياً
 */
export function useProcessQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => processQueue(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printJobs'] });
    },
  });
}

/**
 * استخدامات محلية لحسابات sweep + state العدّاد
 * (لوحة الطابور تستخدمها لعرض عدد المحذوفات)
 */
function useCounter() {
  const [swept, setSwept] = useState(0);
  return { swept, setSwept };
}

/**
 * Hook لتركيب TTL sweep + المعالجة التلقائية عند تنشيط التبويب
 * BR-004/005: حذف pending > 24h + إعادة معالجة عند العودة للتبويب
 * يُتركيب مرة واحدة في DashboardLayout
 */
export function usePrintQueueSweep(): { sweptCount: number } {
  const { swept, setSwept } = useCounter();

  const runSweep = useCallback(async () => {
    try {
      const removed = await sweepPendingJobs();
      if (removed > 0) setSwept((n) => n + removed);
      // إعادة معالجة أي pending متبقية (مثلاً بعد فشل قبل العودة للتبويب)
      await processQueue();
    } catch {
      // تجاهل الأخطاء في الخلفية
    }
  }, [setSwept]);

  useEffect(() => {
    // عند mount
    void runSweep();

    // عند visibilitychange (العودة للتبويب)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void runSweep();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // عند focus النافذة
    const onFocus = () => void runSweep();
    window.addEventListener('focus', onFocus);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [runSweep]);

  return { sweptCount: swept };
}
