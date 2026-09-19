import { db, ensureInit } from '@/lib/db';
import { syncEngine } from '@/lib/syncEngine';
import type { Pack } from '@shared/types';
import type { FavoritePackFormData, FavoritePackType } from '../types';
import { useFavoritesStore } from '../store/useFavoritesStore';

/**
 * حساب السعر التلقائي للعبوة بناءً على سعر حبة التجزئة وعدد القطع
 */
export function calculateQuickPackPrice(baseUnitPrice: number, piecesCount: number): number {
  const price = Number(baseUnitPrice || 0);
  const count = Math.max(1, Number(piecesCount || 1));
  return price * count;
}

/**
 * توليد الاسم المقترح القياسي للكرتونة أو العبوة بالعربية
 */
export function generateQuickPackName(
  unitName: string,
  productName: string,
  piecesCount: number
): string {
  const cleanUnit = (unitName || '').trim() || 'كرتونة';
  const cleanProduct = (productName || '').trim();
  const pieces = Math.max(1, piecesCount || 1);
  const suffix =
    pieces === 1
      ? '1 قطعة'
      : pieces >= 3 && pieces <= 10
      ? `${pieces} قطع`
      : `${pieces} قطعة`;
  return `${cleanUnit} ${cleanProduct} (${suffix})`;
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
 * بناء كائن Pack جديد
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
  packType = 'wholesale',
  minWholesaleQty = 1,
}: BuildPackEntityParams): Pack {
  const now = new Date().toISOString();
  return {
    id,
    name: name.trim(),
    barcode: barcode?.trim() || '',
    packPrice,
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
    pack_price: packPrice,
    unit_name: (unitName || '').trim() || 'كرتونة',
    pack_type: packType,
    min_wholesale_qty: minWholesaleQty,
  } as any;
}

/**
 * حفظ العبوة بشكل مزدوج:
 * 1. في جدول db.packs بقاعدة بيانات SQLite المحلية
 * 2. إخطار محرك المزامنة syncEngine
 * 3. في مخزن المفضلة useFavoritesStore
 */
export async function saveFavoritePackDual(
  formData: FavoritePackFormData,
  isUpdate: boolean = false
): Promise<{ pack: Pack; favoriteItemId?: string }> {
  await ensureInit();

  const finalPackPrice = parseFloat(formData.packPrice) || 0;
  const packId = formData.packId || `pack-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const pieces = Math.max(1, formData.piecesCount || 1);

  const packEntity = buildQuickPackEntity({
    id: packId,
    name: formData.packName,
    barcode: formData.barcode,
    packPrice: finalPackPrice,
    unitName: formData.unitName,
    piecesCount: pieces,
    productId: formData.productId,
    productName: formData.productName,
    packType: formData.packType,
    minWholesaleQty: formData.minWholesaleQty,
  });

  // 1. حفظ في قاعدة بيانات SQLite المحلية
  if (isUpdate && formData.packId) {
    try {
      await db.packs.update(formData.packId, packEntity as any);
    } catch {
      await db.packs.put(packEntity as any);
    }
  } else {
    await db.packs.put(packEntity as any);
  }

  // 2. إشعار محرك المزامنة
  try {
    await syncEngine.enqueue(isUpdate ? 'update' : 'create', 'packs', packId, packEntity as any).catch(() => {});
  } catch (err) {
    console.warn('Sync notification error:', err);
  }

  // 3. حفظ/تحديث في مخزن المفضلة
  const store = useFavoritesStore.getState();
  let favItem: any = null;

  if (isUpdate && formData.id) {
    store.updateItem(formData.id, {
      categoryId: formData.targetCatId,
      itemId: packId,
      name: formData.packName,
      barcode: formData.barcode,
      price: finalPackPrice,
      packQty: pieces,
      packUnit: formData.unitName,
      parentProductId: formData.productId,
    });
  } else {
    favItem = store.addItemToCategory({
      categoryId: formData.targetCatId,
      type: 'pack',
      itemId: packId,
      name: formData.packName,
      barcode: formData.barcode,
      price: finalPackPrice,
      packQty: pieces,
      packUnit: formData.unitName,
      parentProductId: formData.productId,
    });
  }

  return { pack: packEntity, favoriteItemId: favItem?.id || formData.id };
}
