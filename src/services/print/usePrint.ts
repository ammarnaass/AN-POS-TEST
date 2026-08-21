// Print Integration Hook — POS-PRINT-001
// Hook مخصص لدمج الطباعة في نقطة البيع
import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { printDocument, openPreviewWindow, getLastPrint } from '@/services/print/printService';
import type { DocTypeKey, PrintHistoryRecord } from '@/types/invoicePrint';

interface UsePrintOptions {
  userId: string;
  userName: string;
}

interface PrintResult {
  success: boolean;
  error?: string;
  printedAt?: string;
}

/**
 * Hook لطباعة الفواتير من نقطة البيع
 */
export function usePrintSale(options: UsePrintOptions) {
  const { userId, userName } = options;
  const [lastResult, setLastResult] = useState<PrintResult | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      saleId,
      docType = 'sale-invoice',
      templateId,
      printerId,
      copies = 1,
      isReprint = false,
    }: {
      saleId: string;
      docType?: DocTypeKey;
      templateId?: string;
      printerId?: string;
      copies?: number;
      isReprint?: boolean;
    }) => {
      return printDocument(saleId, docType, {
        userId,
        userName,
        templateId,
        printerId,
        copies,
        isReprint,
      });
    },
    onSuccess: (result) => {
      setLastResult({
        success: result.success,
        error: result.error,
        printedAt: result.success ? new Date().toISOString() : undefined,
      });
    },
    onError: (err) => {
      setLastResult({ success: false, error: String(err) });
    },
  });

  /**
   * طباعة فاتورة بيع
   */
  const printSale = useCallback(
    (saleId: string, docType: DocTypeKey = 'sale-invoice', templateId?: string) => {
      mutation.mutate({ saleId, docType, templateId });
    },
    [mutation],
  );

  /**
   * طباعة إيصال حراري
   */
  const printReceipt = useCallback(
    (saleId: string, templateId?: string) => {
      mutation.mutate({ saleId, docType: 'thermal-receipt', templateId });
    },
    [mutation],
  );

  /**
   * إعادة طباعة فاتورة
   */
  const reprintSale = useCallback(
    (saleId: string, templateId?: string, copies = 1) => {
      mutation.mutate({ saleId, docType: 'sale-invoice', templateId, copies, isReprint: true });
    },
    [mutation],
  );

  return {
    printSale,
    printReceipt,
    reprintSale,
    isPrinting: mutation.isPending,
    lastResult,
    error: mutation.error,
  };
}

/**
 * Hook للمعاينة
 */
export function usePrintPreview(options: UsePrintOptions) {
  const { userId, userName } = options;

  const openPreview = useCallback(
    async (saleId: string, docType: DocTypeKey = 'sale-invoice', templateId?: string) => {
      await openPreviewWindow(saleId, docType, { userId, userName, templateId });
    },
    [userId, userName],
  );

  return { openPreview };
}

/**
 * Hook لسجل الطباعة
 */
export function usePrintHistory(saleId: string) {
  const [history, setHistory] = useState<PrintHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const records = await getLastPrint(saleId);
      setHistory(records ? [records] : []);
    } finally {
      setLoading(false);
    }
  }, [saleId]);

  return { history, loading, refresh: loadHistory };
}