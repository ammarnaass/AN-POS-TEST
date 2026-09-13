import { db, type PackEntity } from '@/infrastructure/database/dexie/db';
import type { FavoritePackType } from '../types';

/**
 * حساب السعر التلقائي للعبوة بناءً على سعر حبة التجزئة وعدد القطع
 */
export function calculateQuickPackPrice(baseUnitPrice: number, piecesCount: number): number {
  const price = Number(baseUnitPrice || 0);
  const count = Math.max(1, Number(piecesCount || 1));
  return price * count;
}

/**
 * توليد الاسم المقترح القياسي للكرتونة أو العبوة
 */
export function generateQuickPackName(
  unitName: string,
  productName: string,
  piecesCount: number
): string {
  const cleanUnit = (unitName || '').trim() || 'كرتونة';
  const pieces = Math.max(1, piecesCount || 1);
  const suffix =
    pieces === 1
      ? '1 قطعة'
      : pieces >= 3 && pieces <= 10
      ? `${pieces} قطع`
      : `${pieces} قطعة`;
  return `${cleanUnit} ${productName.trim()} (${suffix})`;
}

export interface BuildPackEntityParams {
  id: string;
  name: string;
  barcode?: string;
  packPrice: number;
  unitName?: string;
  piecesCount: number;
  productId: string;
  productName?: string;
  packType?: FavoritePackType;
  minWholesaleQty?: number;
}

/**
 * بناء كائن PackEntity جديد جاهز للحفظ المزدوج
 */
export function buildQuickPackEntity({
  id,
  name,
  barcode,
  packPrice,
  unitName,
  piecesCount,
  productId,
  productName,
  packType = 'bundle',
  minWholesaleQty = 1,
}: BuildPackEntityParams): PackEntity {
  const now = new Date().toISOString();
  return {
    id,
    name: name.trim(),
    barcode: barcode?.trim() || '',
    packPrice,
    pack_price: packPrice,
    packType,
    unitName: (unitName || '').trim() || 'كرتونة',
    piecesCount,
    minWholesaleQty,
    items: [
      {
        productId,
        qty: piecesCount,
        name: productName,
      },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * بناء كائن PackEntity محدث مع مزامنة المنتج الأساسي الجديد والبنود بدقة
 */
export function buildUpdatedPackEntity(
  existingPack: PackEntity,
  params: BuildPackEntityParams
): PackEntity {
  const now = new Date().toISOString();
  const pieces = Math.max(1, params.piecesCount || 1);
  const finalUnit = (params.unitName || '').trim() || existingPack.unitName || 'كرتونة';
  const finalPackType = params.packType || existingPack.packType || 'bundle';
  const finalMinWholesale = params.minWholesaleQty ?? existingPack.minWholesaleQty ?? 1;

  // تحديث بنود المنتجات المرتبطة (مع دعم تغيير المنتج الأساسي بالكامل)
  const updatedItems = [
    {
      productId: params.productId,
      qty: pieces,
      name: params.productName || (existingPack.items?.[0]?.name ?? ''),
    },
  ];

  return {
    ...existingPack,
    name: params.name.trim(),
    barcode: params.barcode?.trim() || '',
    packPrice: params.packPrice,
    pack_price: params.packPrice,
    packType: finalPackType,
    unitName: finalUnit,
    piecesCount: pieces,
    minWholesaleQty: finalMinWholesale,
    items: updatedItems,
    updatedAt: now,
  };
}

/**
 * الحفظ المزدوج للعبوة في SQLite (عبر Electron API) مع الرجوع التلقائي إلى Dexie
 */
export async function savePackDualPersistence(
  packData: PackEntity,
  isUpdate: boolean = false
): Promise<void> {
  const api = typeof window !== 'undefined' ? (window as any).electronAPI : null;

  // 1. Electron SQLite persistence
  if (api?.packs) {
    try {
      if (isUpdate && api.packs.update) {
        await api.packs.update(packData);
      } else if (!isUpdate && api.packs.create) {
        await api.packs.create(packData);
      }
    } catch (err) {
      console.warn('SQLite packs persistence fallback to Dexie:', err);
    }
  }

  // 2. Dexie Client DB persistence
  await db.packs.put(packData as any);
}
