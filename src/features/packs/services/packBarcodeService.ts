import { db } from '@/infrastructure/database/dexie/db';
import { generateEAN13 } from '@/services/barcode';

/**
 * فحص تفرد الباركود عبر استدعاء Electron IPC والرجوع لكاش Dexie المحلي
 */
export async function checkBarcodeUnique(code: string, excludeId?: string): Promise<boolean> {
  const cleanCode = code.trim();
  if (!cleanCode) return true;

  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

  // 1. فحص الباركود في جدول المنتجات
  if (api?.products?.getByBarcode) {
    try {
      const res = await api.products.getByBarcode(cleanCode);
      if (res?.data) return false;
    } catch {
      /* fallback to dexie */
    }
  }
  const matchProd = await db.products.where('barcode').equals(cleanCode).first();
  if (matchProd) return false;

  // 2. فحص الباركود في جدول العبوات
  if (api?.packs?.getByBarcode) {
    try {
      const res = await api.packs.getByBarcode(cleanCode);
      if (res?.data && res.data.id !== excludeId) return false;
    } catch {
      /* fallback to dexie */
    }
  }
  const matchPack = await db.packs.where('barcode').equals(cleanCode).first();
  if (matchPack && matchPack.id !== excludeId) return false;

  return true;
}

/**
 * توليد باركود EAN-13 قياسي
 */
export function generatePackBarcode(): string {
  return generateEAN13();
}
