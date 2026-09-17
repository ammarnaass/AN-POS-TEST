// scaleService.ts — خدمة الاتصال بالموازين الإلكترونية التجارية (RS232 / Web Serial / USB)
// تدعم الموازين الأكثر انتشاراً: CAS (AP/ER/PD)، Mettler Toledo، والبروتوكولات المعيارية المستمرة

export interface ScaleReading {
  weight: number;      // الوزن بالكيلوغرام (kg)
  unit: 'kg' | 'g';   // الوحدة المقروءة
  stable: boolean;     // هل قراءة الوزن مستقرة (Stable Weight)
  raw: string;         // النص الخام المستلم من الميزان
  timestamp: number;
}

export type ScaleProtocol = 'cas' | 'toledo' | 'continuous' | 'generic';

/**
 * فك شفرة السلاسل النصية المستلمة من الميزان واستخراج الوزن الدقيق
 */
export function parseScaleData(rawData: string, protocol: ScaleProtocol = 'generic'): ScaleReading | null {
  if (!rawData || typeof rawData !== 'string') return null;
  const clean = rawData.trim();
  if (!clean) return null;

  let weight = 0;
  let unit: 'kg' | 'g' = 'kg';
  let stable = true;

  try {
    switch (protocol) {
      case 'cas': {
        // CAS AP-1 / ER-Plus: "ST,GS,+  1.250kg" أو "US,GS,+  0.840kg"
        const isStable = clean.startsWith('ST');
        const match = clean.match(/([+-]?\s*[0-9]+(?:\.[0-9]+)?)\s*(kg|g)?/i);
        if (match) {
          const rawNum = parseFloat(match[1].replace(/\s+/g, ''));
          const rawUnit = (match[2] || 'kg').toLowerCase();
          unit = rawUnit === 'g' ? 'g' : 'kg';
          weight = unit === 'g' ? rawNum / 1000 : rawNum;
          stable = isStable;
        } else {
          return null;
        }
        break;
      }

      case 'toledo': {
        // Mettler Toledo: "S  1.250 kg" أو "D  1.250"
        const isStable = clean.startsWith('S');
        const match = clean.match(/([+-]?\s*[0-9]+(?:\.[0-9]+)?)/);
        if (match) {
          weight = parseFloat(match[1].replace(/\s+/g, ''));
          stable = isStable;
        } else {
          return null;
        }
        break;
      }

      case 'continuous':
      case 'generic':
      default: {
        // بروتوكول مرن يستخرج أي رقم عشري متبوعاً باختيارياً بـ kg أو كغ
        const match = clean.match(/([0-9]+(?:\.[0-9]+)?)/);
        if (match) {
          const val = parseFloat(match[1]);
          if (clean.toLowerCase().includes('g') && !clean.toLowerCase().includes('kg')) {
            unit = 'g';
            weight = val / 1000;
          } else {
            weight = val;
          }
          stable = !clean.toLowerCase().includes('us'); // Unstable
        } else {
          return null;
        }
        break;
      }
    }

    if (isNaN(weight) || weight <= 0) return null;

    return {
      weight: Math.round(weight * 1000) / 1000,
      unit,
      stable,
      raw: clean,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * فحص دعم المتصفح أو Electron لواجهة Web Serial API
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * قراءة الوزن المباشر عبر منفذ السيريال (RS232 / USB COM Port)
 */
export async function readWeightFromSerial(baudRate: number = 9600): Promise<ScaleReading> {
  if (!isWebSerialSupported()) {
    throw new Error('منفذ السيريال (Web Serial) غير مدعوم في هذا المتصفح');
  }

  const serial = (navigator as any).serial;
  let port: any = null;

  try {
    // طلب اختيار المنفذ من المستخدم أو المنفذ المصرح له مسبقاً
    const ports = await serial.getPorts();
    if (ports && ports.length > 0) {
      port = ports[0];
    } else {
      port = await serial.requestPort();
    }

    await port.open({ baudRate });

    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();

    let accumulatedText = '';
    const startTime = Date.now();
    const timeoutMs = 3000;

    try {
      while (Date.now() - startTime < timeoutMs) {
        const { value, done } = await Promise.race([
          reader.read(),
          new Promise<{ value: undefined; done: true }>((_, reject) =>
            setTimeout(() => reject(new Error('مهلة قراءة الميزان انتهت (3 ثوانٍ)')), timeoutMs)
          ),
        ]);

        if (done) break;
        if (value) {
          accumulatedText += value;
          const reading = parseScaleData(accumulatedText);
          if (reading && reading.weight > 0) {
            return reading;
          }
        }
      }
    } finally {
      reader.releaseLock();
      await readableStreamClosed.catch(() => {});
      await port.close().catch(() => {});
    }

    throw new Error('لم يتم استلام قراءة وزن صالحة من الميزان');
  } catch (err: any) {
    if (port && port.readable) {
      try {
        await port.close();
      } catch {
        /* ignore */
      }
    }
    throw new Error(err?.message || 'فشل الاتصال بمنفذ الميزان الإلكتروني');
  }
}
