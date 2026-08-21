// validateTemplate اختبارات — POS-PRINT-001 Sprint C
// BR-PRINT-007: دعم RTL (مضمون في renderDocumentHTML)
// BR-PRINT-008: قالب 80mm لا يتجاوز 80mm
// BR-PRINT-009: القوالب القانونية تتضمن المعلومات الإلزامية
import { describe, expect, it } from 'vitest';
import { validateTemplate } from '@/services/print/templateService';
import { DEFAULT_THERMAL_80, DEFAULT_INVOICE_A4, DEFAULT_INVOICE_A5 } from '@/services/print/defaultTemplates';
import type { PrintTemplate } from '@/types/invoicePrint';

describe('POS-PRINT-001 Sprint C: validateTemplate', () => {
  function makeTemplate(overrides: Partial<PrintTemplate> = {}): PrintTemplate {
    return {
      ...DEFAULT_THERMAL_80,
      id: 'test-template',
      name: 'قالب اختبار',
      description: '',
      supportedDocuments: ['thermal-receipt'],
      ...overrides,
    };
  }

  describe('BR-PRINT-008: قالب 80mm لا يتجاوز 80mm', () => {
    it('يقبل قالب 80mm بعرض 80', () => {
      const result = validateTemplate(makeTemplate({ paperSize: '80mm', widthMm: 80 }));
      expect(result.valid).toBe(true);
    });

    it('يقبل قالب 80mm بعرض 72', () => {
      const result = validateTemplate(makeTemplate({ paperSize: '80mm', widthMm: 72 }));
      expect(result.valid).toBe(true);
    });

    it('يرفض قالب 80mm بعرض 81', () => {
      const result = validateTemplate(makeTemplate({ paperSize: '80mm', widthMm: 81 }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('80mm'))).toBe(true);
    });

    it('يرفض قالب 80mm بعرض 120', () => {
      const result = validateTemplate(makeTemplate({ paperSize: '80mm', widthMm: 120 }));
      expect(result.valid).toBe(false);
    });

    it('لا يفرض الحد على A4 (210mm)', () => {
      const result = validateTemplate(makeTemplate({ ...DEFAULT_INVOICE_A4, id: 'test-a4' }));
      // A4 يجب أن يحقق شروط BR-PRINT-009 الأخرى، لكن ليس شرط العرض
      expect(result.errors.some(e => e.includes('80mm'))).toBe(false);
    });
  });

  describe('BR-PRINT-009: القوالب القانونية A4/A5', () => {
    it('يرفض قالب A4 بدون shopLegal.name في الترويسة', () => {
      const tpl = makeTemplate({
        ...DEFAULT_INVOICE_A4,
        id: 'bad-a4',
        layout: {
          header: [{ id: 'h-1', type: 'text', text: 'مرحباً' }],
          body: [{ id: 'b-1', type: 'text', text: '{{invoice.number}}' }],
          footer: [],
        },
      });
      const result = validateTemplate(tpl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('shopLegal.name'))).toBe(true);
    });

    it('يرفض قالب A4 بدون invoice.number في الجسم', () => {
      const tpl = makeTemplate({
        ...DEFAULT_INVOICE_A4,
        id: 'bad-a4-no-num',
        layout: {
          header: [{ id: 'h-1', type: 'text', text: '{{shopLegal.name}}' }],
          body: [{ id: 'b-1', type: 'text', text: 'فقط نص' }],
          footer: [],
        },
      });
      const result = validateTemplate(tpl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invoice.number'))).toBe(true);
    });

    it('يقبل قالب A4 مع المعلومات الإلزامية', () => {
      const result = validateTemplate(DEFAULT_INVOICE_A4);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('يقبل قالب A5 الافتراضي', () => {
      const result = validateTemplate(DEFAULT_INVOICE_A5);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('يرفض قالب بدون اسم', () => {
      const tpl = makeTemplate({ name: '' });
      const result = validateTemplate(tpl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('اسم'))).toBe(true);
    });

    it('يرفض قالب بدون supportedDocuments', () => {
      const tpl = makeTemplate({ supportedDocuments: [] });
      const result = validateTemplate(tpl);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('نوع وثيقة'))).toBe(true);
    });

    it('يقبل column block يحوي shopLegal.name (A4)', () => {
      const tpl = makeTemplate({
        ...DEFAULT_INVOICE_A4,
        id: 'col-a4',
        layout: {
          header: [
            {
              id: 'h-col',
              type: 'column',
              gap: 4,
              children: [
                { id: 'h-name', type: 'text', text: '{{shopLegal.name}}', size: 'xl', weight: 700 },
                { id: 'h-addr', type: 'text', text: '{{shopLegal.address}}', size: 'sm' },
              ],
            },
          ],
          body: [{ id: 'b-1', type: 'text', text: '{{invoice.number}}' }],
          footer: [],
        },
      });
      const result = validateTemplate(tpl);
      expect(result.errors.some(e => e.includes('shopLegal.name'))).toBe(false);
    });
  });

  describe('القوالب الافتراضية صالحة', () => {
    it('DEFAULT_THERMAL_80 صالح', () => {
      const result = validateTemplate(DEFAULT_THERMAL_80);
      expect(result.valid).toBe(true);
    });

    it('DEFAULT_INVOICE_A4 صالح', () => {
      const result = validateTemplate(DEFAULT_INVOICE_A4);
      expect(result.valid).toBe(true);
    });

    it('DEFAULT_INVOICE_A5 صالح', () => {
      const result = validateTemplate(DEFAULT_INVOICE_A5);
      expect(result.valid).toBe(true);
    });
  });
});
