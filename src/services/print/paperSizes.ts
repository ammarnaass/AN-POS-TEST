// تعريف أحجام الورق المتوافقة مع متطلبات BR-PRINT-008 (الحراري 80mm max)
import type { PaperSize } from '@/types/invoicePrint';

export interface PaperSpec {
  widthMm: number;
  heightMm?: number; // undefined => تلقائي (thermal)
  cssSize: string; // @page size
  bodyWidthCss: string; // max-width في body
  padding: string;
  fontSize: string;
}

export const PAPER_SPECS: Record<PaperSize, PaperSpec> = {
  // POS-PRINT-001 / FR-018: دعم 58mm (طابعات مدمجة محمولة)
  '58mm': {
    widthMm: 58,
    heightMm: undefined,
    cssSize: '58mm auto',
    bodyWidthCss: '58mm',
    padding: '3mm',
    fontSize: '10px',
  },
  // POS-PRINT-001 / FR-018: دعم 76mm (نوعية حرارية شائعة)
  '76mm': {
    widthMm: 76,
    heightMm: undefined,
    cssSize: '76mm auto',
    bodyWidthCss: '76mm',
    padding: '4mm',
    fontSize: '11px',
  },
  '80mm': {
    widthMm: 80,
    heightMm: undefined,
    cssSize: '80mm auto',
    bodyWidthCss: '80mm',
    padding: '5mm',
    fontSize: '12px',
  },
  A4: {
    widthMm: 210,
    heightMm: 297,
    cssSize: 'A4',
    bodyWidthCss: '190mm',
    padding: '12mm',
    fontSize: '13px',
  },
  A5: {
    widthMm: 148,
    heightMm: 210,
    cssSize: 'A5',
    bodyWidthCss: '130mm',
    padding: '8mm',
    fontSize: '12px',
  },
  custom: {
    widthMm: 210,
    heightMm: 297,
    cssSize: 'A4',
    bodyWidthCss: '190mm',
    padding: '10mm',
    fontSize: '13px',
  },
};

export function paperSpec(size: PaperSize): PaperSpec {
  return PAPER_SPECS[size] ?? PAPER_SPECS.A4;
}

// BR-PRINT-008: القالب الحراري لا يتجاوز عرضه المحدد
export function assertThermalLimit(widthMm: number, paperSize: PaperSize): void {
  const thermalSizes: PaperSize[] = ['58mm', '76mm', '80mm'];
  if (thermalSizes.includes(paperSize)) {
    const limit = PAPER_SPECS[paperSize].widthMm;
    if (widthMm > limit) {
      throw new Error(`القالب الحراري ${paperSize} يجب ألا يتجاوز عرض ${limit}mm (BR-PRINT-008)`);
    }
  }
}
