export type { FavoriteCategory, FavoriteItem } from './store/useFavoritesStore';

export type FavoritePackType = 'bundle' | 'wholesale' | 'half_wholesale';

export interface CategoryFormData {
  name: string;
  icon: string;
  color: string;
}

/**
 * نموذج البيانات الموحد والشامل للعبوة السريعة في الإضافة والتعديل
 */
export interface FavoritePackFormData {
  id?: string;               // معرف عنصر المفضلة
  packId?: string;           // معرف كيان العبوة في قاعدة البيانات (PackEntity ID)
  
  // المنتج الأساسي المرتبط
  productId: string;
  productName: string;
  productBarcode?: string;
  productRetailPrice: number;
  productStock: number;

  // مواصفات التعبئة والوحدة
  piecesCount: number;
  unitName: string;

  // التسمية والباركود
  packName: string;
  barcode: string;

  // التسعير والخصم
  packPrice: string;
  isCustomPrice: boolean;

  // التصنيف والنوع
  targetCatId: string;
  packType: FavoritePackType;
  minWholesaleQty: number;

  // البحث وحالة الواجهة
  searchQuery?: string;
}

export interface QuickPackParams {
  productId: string;
  productName: string;
  piecesCount: number;
  unitName: string;
  packName: string;
  price: number;
  barcode?: string;
  targetCatId: string;
  packType?: FavoritePackType;
  minWholesaleQty?: number;
}

export interface EditPackParams {
  itemId: string;
  productId?: string;
  productName?: string;
  name: string;
  price: number;
  piecesCount: number;
  unitName: string;
  barcode?: string;
  targetCatId: string;
  packType?: FavoritePackType;
  minWholesaleQty?: number;
}
