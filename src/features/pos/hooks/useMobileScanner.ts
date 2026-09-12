// useMobileScanner — MOBILE-SCANNER-001
// هوك يستمع لأحداث 'pos:barcode-scan' من main process (عبر preload)
// أو عبر SSE (Server-Sent Events) في بيئات المتصفح خارج Electron
// عندما يرسل الهاتف باركود عبر /api/pos/scan، يُعالجه ويُضيفه إلى سلة POS

import { useEffect, useRef } from 'react';

export type MobileScanData = {
  barcode: string;
  qty?: number;
  product?: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    isPack?: boolean;
    packPiecesCount?: number;
    packUnit?: string;
  } | null;
  fromMobile?: boolean;
};

export interface UseMobileScannerOptions {
  onScan: (
    code: string,
    qty?: number,
    extra?: { fromMobile?: boolean; product?: MobileScanData['product'] }
  ) => void;
  enabled?: boolean;
}

/**
 * يستمع لأحداث المسح القادمة من الهاتف عبر IPC أو SSE
 * يُعيد نفس السلوك كـ useBarcodeScanner لكن من مصدر الهاتف مع دعم الكميات
 */
export function useMobileScanner({ onScan, enabled = true }: UseMobileScannerOptions) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    const api = (window as any).electronAPI?.pos;

    // 1) إذا كنا داخل Electron: نستخدم IPC السريع
    if (api?.onMobileScan) {
      const unsubscribe = api.onMobileScan((data: MobileScanData) => {
        const barcode = (data?.barcode || '').trim();
        if (!barcode) return;
        const qty = Math.max(1, Number(data?.qty) || 1);
        onScanRef.current(barcode, qty, {
          fromMobile: true,
          product: data?.product,
        });
      });

      return () => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }

    // 2) إذا كنا في المتصفح العادي خارج Electron: نستخدم SSE stream
    if (typeof EventSource !== 'undefined') {
      let eventSource: EventSource | null = null;
      try {
        eventSource = new EventSource('/api/pos/events');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.barcode) {
              const barcode = String(data.barcode).trim();
              if (!barcode) return;
              const qty = Math.max(1, Number(data?.qty) || 1);
              onScanRef.current(barcode, qty, {
                fromMobile: true,
                product: data?.product,
              });
            }
          } catch {
            // ignore non-json pings
          }
        };
      } catch (err) {
        // SSE not supported or unreachable
      }

      return () => {
        if (eventSource) {
          eventSource.close();
        }
      };
    }
  }, [enabled]);
}

