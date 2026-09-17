// useBarcodeScanner — BARCODE-MGMT-001 / SAFE POS
// Hook لالتقاط أحداث أجهزة قراءة الباركود (USB/Bluetooth HID)
// يعمل كـ keyboard-wedge: يميّز بين الكتابة اليدوية والمسح السريع
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';

export interface UseScannerOptions {
  onScan: (code: string) => void;
  onUnknown?: (code: string) => void;
  enabled?: boolean;                  // افتراضياً true
  respectInputFocus?: boolean;        // افتراضياً false (الماسح يعمل دائماً)
  beepOnSuccess?: boolean;
  beepOnFailure?: boolean;
}

interface BufferedKey {
  key: string;
  time: number;
}

const MAX_BUFFER_WINDOW_MS = 100;        // بين كل ضغطة وأخرى
const BURST_AVG_INTERVAL_MS = 80;    // متوسط سرعة المسح

export function useBarcodeScanner(opts: UseScannerOptions) {
  const {
    onScan,
    onUnknown,
    enabled = true,
    respectInputFocus = false,
    beepOnSuccess = true,
    beepOnFailure = true,
  } = opts;

  const bufferRef = useRef<BufferedKey[]>([]);
  const cbRef = useRef({ onScan, onUnknown, beepOnSuccess, beepOnFailure });
  cbRef.current = { onScan, onUnknown, beepOnSuccess, beepOnFailure };

  // قراءة إعدادات الماسح الحالية من network_settings
  const { data: netSettings } = useQuery({
    queryKey: ['network_settings'],
    queryFn: async () => (await db.network_settings.get('default')) ?? null,
    staleTime: 60000,
  });

  const settingsRef = useRef({
    terminator: 'Enter' as 'Enter' | 'Tab' | 'None',
    minLength: 6,
    beepEnabled: true,
    beepVolume: 0.1,
  });
  if (netSettings) {
    settingsRef.current.terminator = netSettings.scannerTerminator ?? 'Enter';
    settingsRef.current.minLength = Math.max(4, netSettings.scannerMinLength ?? 6);
    settingsRef.current.beepEnabled = netSettings.scannerBeepEnabled ?? true;
  }

  useEffect(() => {
    if (!enabled) return;

    const isFormElement = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
    };

    const flush = (reason: 'terminator' | 'burst' | 'reset'): void => {
      const buf = bufferRef.current;
      if (buf.length < 2) {
        bufferRef.current = [];
        return;
      }
      const totalTime = buf[buf.length - 1].time - buf[0].time;
      const avgInterval = totalTime / (buf.length - 1);
      const code = buf.map((k) => k.key).join('');
      bufferRef.current = [];

      const inForm = isFormElement(document.activeElement);
      const isFastBurst = avgInterval < BURST_AVG_INTERVAL_MS;

      // إذا كان التركيز داخل حقل إدخال، لا نقبل الباركود إلا إذا كان سريعاً جداً (ماسح أجهزة HID)
      if (inForm && !isFastBurst) {
        return;
      }

      if (code.length < settingsRef.current.minLength) {
        return;
      }

      if (!isFastBurst && reason === 'burst') return;

      // تأكّد أن الأحرف مقبولة (alphanumeric + رموز شائعة في الباركود)
      if (!/^[A-Za-z0-9\-./_]+$/.test(code)) return;

      // beep
      if (settingsRef.current.beepEnabled && cbRef.current.beepOnSuccess) {
        import('@/services/barcode/scannerSound').then(({ playScanOk }) => playScanOk(settingsRef.current.beepVolume));
      }
      cbRef.current.onScan(code);
      return;
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (respectInputFocus && isFormElement(document.activeElement)) return;

      // تجاهل لو لم يكن حرف قابل للطباعة
      if (e.key.length === 1) {
        bufferRef.current.push({ key: e.key, time: Date.now() });
        // إعادة تعيين buffer إذا تباعد كثيراً
        const buf = bufferRef.current;
        if (
          buf.length > 1 &&
          buf[buf.length - 1].time - buf[buf.length - 2].time > MAX_BUFFER_WINDOW_MS * 5
        ) {
          // بطيء جداً → كتابة يدوية، تفريغ
          bufferRef.current = [{ key: e.key, time: Date.now() }];
        }
      }

      // معاملة المنهي
      const term = settingsRef.current.terminator;
      const isTerminator =
        (term === 'Enter' && e.key === 'Enter') ||
        (term === 'Tab' && e.key === 'Tab');
      if (isTerminator && bufferRef.current.length > 0) {
        const buf = bufferRef.current;
        const totalTime = buf.length > 1 ? buf[buf.length - 1].time - buf[0].time : 0;
        const avgInterval = buf.length > 1 ? totalTime / (buf.length - 1) : 999;
        const isFastBurst = avgInterval < BURST_AVG_INTERVAL_MS;
        const isMinLength = buf.length >= settingsRef.current.minLength;
        const inForm = isFormElement(document.activeElement);

        // إذا كان ماسحاً سريعاً ومستوفياً للشروط أو خارج حقول الإدخال:
        // نوقف انتشار الحدث (capture) لمنع تكرار الإدخال في حقول النصوص أو إرسال النماذج
        if (!inForm || (isFastBurst && isMinLength)) {
          e.preventDefault();
          e.stopPropagation();
          flush('terminator');
          if (inForm && document.activeElement instanceof HTMLInputElement) {
            document.activeElement.value = '';
          }
          return;
        } else {
          // كتابة يدوية عادية داخل حقل إدخال: تفريغ الـ buffer وترك الحدث يمر لحقل الإدخال
          bufferRef.current = [];
          return;
        }
      }

      // burst إجباري إذا تجاوز الـ buffer حدّاً معيناً وتوقف بعد فترة قصيرة
      if (bufferRef.current.length > 40) flush('burst');
    };

    const handleBlur = (): void => {
      bufferRef.current = [];
    };

    window.addEventListener('keydown', handleKeyDown as EventListener, true);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown as EventListener, true);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, respectInputFocus]);

  // دالة إرسال "غير معروف" يدوية (لها استخدام خارجي)
  return {
    notifyUnknown: (code: string) => {
      if (settingsRef.current.beepEnabled && cbRef.current.beepOnFailure) {
        import('@/services/barcode/scannerSound').then(({ playErrorBeep }) => playErrorBeep());
      }
      cbRef.current.onUnknown?.(code);
    },
  };
}
