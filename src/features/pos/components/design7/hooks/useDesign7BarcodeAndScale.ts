import React, { useRef, useEffect, useCallback } from 'react';
import type { CartItem } from '@/types';
import { readWeightFromSerial } from '@/services/hardware/scaleService';

export interface UseDesign7BarcodeAndScaleProps {
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  activeItem?: CartItem | null;
  onUpdateQty: (productId: string, qty: number) => void;
}

export function useDesign7BarcodeAndScale({
  onBarcodeSubmit,
  activeItem,
  onUpdateQty,
}: UseDesign7BarcodeAndScaleProps) {
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input on layout mount
  useEffect(() => {
    const timer = setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // تسليم معالجة الباركود مع الحفاظ الفوري على التركيز داخل الحقل ومنع فقدانه
  const handleBarcodeSubmit = useCallback(
    (e?: React.FormEvent) => {
      onBarcodeSubmit(e);
      barcodeInputRef.current?.focus();
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 40);
    },
    [onBarcodeSubmit]
  );

  // قراءة الوزن الحي من الميزان الذكي المتصل (RS232 / USB Serial)
  const handleReadScale = useCallback(async () => {
    try {
      const reading = await readWeightFromSerial();
      if (reading && reading.weight > 0) {
        const targetId = activeItem?.productId || (activeItem as any)?.id;
        if (targetId) {
          onUpdateQty(targetId, reading.weight);
        }
      }
    } catch {
      // في حال فشل الاتصال بالميزان: إعادة التركيز إلى حقل الباركود
      barcodeInputRef.current?.focus();
    }
  }, [activeItem, onUpdateQty]);

  return {
    barcodeInputRef,
    handleBarcodeSubmit,
    handleReadScale,
  };
}
