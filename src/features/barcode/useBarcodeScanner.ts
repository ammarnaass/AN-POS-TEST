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
    queryFn: () => db.network_settings.get('default'),
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

      // معايير الكشف:
      //   - رمز نهاية (terminator) واضح: اقبل قبل minLength فقط
      //   - burst سريع: متوسط الفترة تحت BURST_AVG_INTERVAL_MS
      const isFastBurst = avgInterval < BURST_AVG_INTERVAL_MS || reason === 'terminator';
      if (code.length < settingsRef.current.minLength) {
        // قصير جداً → ربما كتابة يدوية
        if (reason !== 'terminator') return;
      }
      if (!isFastBurst && reason !== 'terminator') return;

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
        e.preventDefault();
        const last = bufferRef.current[bufferRef.current.length - 1];
        // المنهي ليس جزءاً من الباركود
        if (last && last.key !== e.key) {
          flush('terminator');
        }
        return;
      }

      // burst إجباري إذا تجاوز الـ buffer حدّاً معيناً وتوقف بعد فترة قصيرة
      if (bufferRef.current.length > 40) flush('burst');
    };

    const handleBlur = (): void => {
      bufferRef.current = [];
    };

    window.addEventListener('keydown', handleKeyDown as EventListener);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown as EventListener);
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
