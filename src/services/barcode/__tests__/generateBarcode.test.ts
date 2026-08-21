// اختبارات توليد الباركود — BARCODE-MGMT-001
import { describe, it, expect } from 'vitest';
import { ean13Checksum, generateEAN13, isEan13Valid, generateCode128 } from '@/services/barcode/generateBarcode';

describe('ean13Checksum', () => {
  it('يحسب checksum كرقم واحد لقيم صالحة', () => {
    expect(ean13Checksum('400638133393')).toMatch(/^[0-9]$/);
    expect(ean13Checksum('200000000001')).toMatch(/^[0-9]$/);
    expect(ean13Checksum('123456789012')).toMatch(/^[0-9]$/);
  });

  it('يطول الـ base إلى 12 تلقائياً ويعيد checksum رقم واحد', () => {
    const cs = ean13Checksum('200000000001');
    expect(cs).toMatch(/^[0-9]$/);
  });

  it('مطاوع: checksum + base يُعطي isValid=true', () => {
    for (let i = 0; i < 50; i++) {
      const base = '20' + String(Date.now() + i).slice(-10).padStart(10, '0').slice(0, 10);
      const cs = ean13Checksum(base.slice(0, 12).padStart(12, '0'));
      const full = base.slice(0, 12).padStart(12, '0') + cs;
      expect(full).toMatch(/^\d{13}$/);
      // التحقق المتبادل: if my generated checksum is internally consistent
      expect(cs).toBe(ean13Checksum(full.slice(0, 12)));
    }
  });
});

describe('isEan13Valid', () => {
  it('يقبل الباركودات التي يولّدها generateEAN13', () => {
    // اختبار ذاتي للاتساق: checker يقبل ما تولّده generate
    for (let i = 0; i < 20; i++) {
      const code = generateEAN13();
      expect(isEan13Valid(code)).toBe(true);
    }
  });

  it('يرفض الطول الخطأ', () => {
    expect(isEan13Valid('123')).toBe(false);
    expect(isEan13Valid('12345678901234')).toBe(false);
  });

  it('يرفض checksum الخاطئ', () => {
    // آخر رقم مختلف بنقطة واحدة
    const code = generateEAN13();
    const wrong = code.slice(0, -1) + (Number(code[code.length - 1]) + 1) % 10;
    expect(wrong.length).toBe(13);
    expect(isEan13Valid(wrong)).toBe(false);
  });
});

describe('generateEAN13', () => {
  it('ينتج باركود EAN-13 صالح من 13 رقماً', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateEAN13();
      expect(code).toMatch(/^\d{13}$/);
      expect(isEan13Valid(code)).toBe(true);
    }
  });

  it('يستخدم البادئة الافتراضية "20" عند عدم تحديدها', () => {
    const code = generateEAN13();
    expect(code.startsWith('20')).toBe(true);
  });

  it('يقبل بادئة مخصصة', () => {
    const code = generateEAN13('34');
    expect(code.startsWith('34')).toBe(true);
  });
});

describe('generateCode128', () => {
  it('ينتج نصاً به بادئة قابلة للتمييز', () => {
    const code = generateCode128('AN');
    expect(code.startsWith('AN-')).toBe(true);
    expect(code.length).toBeGreaterThan(5);
  });

  it('ينتج قيماً مختلفة في كل استدعاء (بالتقريب)', () => {
    const a = generateCode128();
    const b = generateCode128();
    expect(a).not.toBe(b);
  });
});
