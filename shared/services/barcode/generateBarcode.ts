// Barcode generation utilities — pure math, no framework dependency
// Ported from desktop: src/services/barcode/generateBarcode.ts

export const EAN13_PREFIX_RESERVED = '20';

/** حساب checksum لرقم EAN-13 (mod 10 بأوزان 1 و3) */
export function ean13Checksum(base12: string): string {
  const s = String(base12).padStart(12, '0').slice(0, 12).replace(/\D/g, '');
  if (s.length !== 12) throw new Error(`EAN13_INVALID_BASE: ${base12} (len=${s.length})`);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = Number(s[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isEan13Valid(code: string): boolean {
  const c = String(code).replace(/\D/g, '');
  if (c.length !== 13) return false;
  return ean13Checksum(c.slice(0, 12)) === c[12];
}

/** توليد EAN-13 عشوائي بالبادئة المحجوزة '20' (للاستخدام الداخلي) */
export function generateEAN13(prefix: string = EAN13_PREFIX_RESERVED): string {
  const p = String(prefix).padStart(2, '0').slice(0, 2).replace(/\D/g, '') || '20';
  const body = p + Math.floor(Math.random() * 1e10).toString().padStart(10, '0').slice(0, 10);
  return body + ean13Checksum(body);
}

/** حساب checksum لرقم EAN-8 (mod 10 بأوزان 3،1،3،1،3،1،3) */
export function ean8Checksum(base7: string): string {
  const s = String(base7).padStart(7, '0').slice(0, 7).replace(/\D/g, '');
  if (s.length !== 7) throw new Error(`EAN8_INVALID_BASE: ${base7}`);
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = Number(s[i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isEan8Valid(code: string): boolean {
  const c = String(code).replace(/\D/g, '');
  if (c.length !== 8) return false;
  return ean8Checksum(c.slice(0, 7)) === c[7];
}

/** توليد EAN-8 عشوائي */
export function generateEAN8(): string {
  const body = Math.floor(Math.random() * 1e7).toString().padStart(7, '0').slice(0, 7);
  return body + ean8Checksum(body);
}

/** حساب checksum لرقم UPC-A (mod 10 بأوزان 3،1،3،1... على 11 رقم) */
export function upcaChecksum(base11: string): string {
  const s = String(base11).padStart(11, '0').slice(0, 11).replace(/\D/g, '');
  if (s.length !== 11) throw new Error(`UPCA_INVALID_BASE: ${base11}`);
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const d = Number(s[i]);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return String((10 - (sum % 10)) % 10);
}

export function isUPCAValid(code: string): boolean {
  const c = String(code).replace(/\D/g, '');
  if (c.length !== 12) return false;
  return upcaChecksum(c.slice(0, 11)) === c[11];
}

/** توليد UPC-A عشوائي (بادئة 042 — محجوزة للاستخدام الداخلي) */
export function generateUPCA(): string {
  const prefix = '042';
  const body = prefix + Math.floor(Math.random() * 1e8).toString().padStart(8, '0').slice(0, 8);
  return body + upcaChecksum(body);
}

/** توليد CODE128 — بصيغة AN-XXXXXXXXXX مختصرة */
export function generateCode128(prefix = 'AN'): string {
  const rand = Math.random().toString(16).slice(2, 12).toUpperCase();
  return `${prefix}-${rand}`;
}

/** توليد باركود بناءً على الصيغة المختارة */
export function generateBarcode(format: 'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'qr'): string {
  switch (format) {
    case 'ean13': return generateEAN13();
    case 'ean8': return generateEAN8();
    case 'code128': return generateCode128();
    case 'code39': return generateCode128('C39');
    case 'upca': return generateUPCA();
    case 'qr': return generateCode128('QR');
    default: return generateCode128();
  }
}
