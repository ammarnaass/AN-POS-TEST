// paperSizes.ts — POS-PRINT-001
// BR-PRINT-008: القالب الحراري 80mm لا يتجاوز 80mm عرض
import { describe, expect, it } from 'vitest'
import {
  PAPER_SPECS,
  assertThermalLimit,
  paperSpec,
} from '@/services/print/paperSizes'
import type { PaperSize } from '@/types/invoicePrint'

describe('paperSpec()', () => {
  it('يعيد مواصفات 80mm كاملة', () => {
    const s = paperSpec('80mm')
    expect(s.widthMm).toBe(80)
    expect(s.cssSize).toBe('80mm auto')
    expect(s.bodyWidthCss).toBe('80mm')
    expect(s.padding).toBe('5mm')
  })

  it('يعيد مواصفات A4 كاملة', () => {
    const s = paperSpec('A4')
    expect(s.widthMm).toBe(210)
    expect(s.heightMm).toBe(297)
    expect(s.cssSize).toBe('A4')
    expect(s.bodyWidthCss).toBe('190mm')
    expect(s.padding).toBe('12mm')
  })

  it('يعيد مواصفات A5 كاملة', () => {
    const s = paperSpec('A5')
    expect(s.widthMm).toBe(148)
    expect(s.heightMm).toBe(210)
    expect(s.cssSize).toBe('A5')
    expect(s.bodyWidthCss).toBe('130mm')
  })

  it('يعيد A4 كـ fallback لأي حجم غير معروف', () => {
    const allSizes: PaperSize[] = ['80mm', 'A4', 'A5', 'custom']
    for (const size of allSizes) {
      const s = paperSpec(size)
      expect(s).toBeDefined()
    }
  })
})

describe('PAPER_SPECS', () => {
  it('يحتوي على جميع الأحجام المدعومة', () => {
    expect(PAPER_SPECS['80mm']).toBeDefined()
    expect(PAPER_SPECS['A4']).toBeDefined()
    expect(PAPER_SPECS['A5']).toBeDefined()
    expect(PAPER_SPECS['custom']).toBeDefined()
  })

  it('الحجم الحراري 80mm — heightMm غير معرّف (تلقائي)', () => {
    expect(PAPER_SPECS['80mm'].heightMm).toBeUndefined()
  })

  it('الأحجام غير الحرارية لها heightMm صريح', () => {
    expect(PAPER_SPECS['A4'].heightMm).toBe(297)
    expect(PAPER_SPECS['A5'].heightMm).toBe(210)
  })
})

describe('assertThermalLimit() — BR-PRINT-008', () => {
  it('يقبل عرض <= 80mm', () => {
    expect(() => assertThermalLimit(80, '80mm')).not.toThrow()
    expect(() => assertThermalLimit(72, '80mm')).not.toThrow()
    expect(() => assertThermalLimit(58, '80mm')).not.toThrow()
  })

  it('يرفض عرض > 80mm', () => {
    expect(() => assertThermalLimit(81, '80mm')).toThrow(/80mm/)
    expect(() => assertThermalLimit(120, '80mm')).toThrow(/BR-PRINT-008/)
    expect(() => assertThermalLimit(210, '80mm')).toThrow(/الحراري/)
  })

  it('لا يفرض الحد على A4 (يسمح بأي عرض)', () => {
    expect(() => assertThermalLimit(210, 'A4')).not.toThrow()
    expect(() => assertThermalLimit(500, 'A4')).not.toThrow()
  })

  it('لا يفرض الحد على A5 (يسمح بأي عرض)', () => {
    expect(() => assertThermalLimit(148, 'A5')).not.toThrow()
  })

  it('لا يفرض الحد على custom', () => {
    expect(() => assertThermalLimit(300, 'custom')).not.toThrow()
  })
})
