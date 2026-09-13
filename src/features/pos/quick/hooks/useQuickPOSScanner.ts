import { useRef, useCallback } from 'react';
import type { Product } from '@/types';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import { useMobileScanner } from '@/features/pos/hooks/useMobileScanner';
import { parseAndAddScannedCode } from '@/services/barcode/parseAndAddScannedCode';

interface UseQuickPOSScannerParams {
  products: Product[];
  packs: any[];
  allowNegativeStock: boolean;
  addItem: (item: any) => void;
  playBeep: () => void;
  onClearSearch: () => void;
  addNotification: (notification: any) => void;
}

export function useQuickPOSScanner({
  products,
  packs,
  allowNegativeStock,
  addItem,
  playBeep,
  onClearSearch,
  addNotification,
}: UseQuickPOSScannerParams) {
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const handleBarcodeScan = useCallback(
    async (code: string, scanQty = 1, extraData?: { fromMobile?: boolean; product?: any }) => {
      const cleanCode = code.trim();
      if (!cleanCode) return;

      // منع المسح المزدوج المتزامن لنفس الباركود خلال 400ms (حماية من التكرار بين القارئ وحقل الإدخال)
      const now = Date.now();
      if (
        !extraData?.fromMobile &&
        lastScanRef.current.code === cleanCode &&
        now - lastScanRef.current.time < 400
      ) {
        return;
      }
      lastScanRef.current = { code: cleanCode, time: now };

      const effectiveQty = Math.max(1, Number(scanQty) || 1);

      const result = await parseAndAddScannedCode(cleanCode, {
        products: products as any,
        packs: packs as any,
        promotions: [],
        addItem,
        qty: effectiveQty,
        allowNegativeStock,
      });

      if (result.added) {
        onClearSearch();
        playBeep();
        if (extraData?.fromMobile) {
          addNotification({
            title: '📱 مسح عبر الهاتف',
            message: `تمت إضافة "${result.name || code}" (${effectiveQty}×) مباشرة إلى السلة`,
            type: 'success',
          });
        }
      } else {
        addNotification({
          title: extraData?.fromMobile ? '📱 مسح عبر الهاتف: غير موجود' : 'المنتج غير موجود',
          message: `${result.message ?? 'لم يتم العثور على باركود'}: ${code}`,
          type: 'warning',
        });
      }
    },
    [products, packs, addItem, playBeep, onClearSearch, addNotification, allowNegativeStock]
  );

  // قارئ الباركود العتادي (USB / Keyboard Emulation)
  useBarcodeScanner({
    onScan: (barcode) => {
      handleBarcodeScan(barcode);
    },
  });

  // كاشف الهاتف المحمول (عبر الشبكة المحلية / SSE)
  useMobileScanner({
    onScan: (barcode, qty, extra) => {
      handleBarcodeScan(barcode, qty, extra);
    },
    enabled: true,
  });

  return {
    handleBarcodeScan,
  };
}
