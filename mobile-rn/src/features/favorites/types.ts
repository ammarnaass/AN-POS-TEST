export type FavoritePackType = 'bundle' | 'wholesale' | 'half_wholesale';

export interface FavoriteCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
}

export interface FavoriteItem {
  id: string;
  categoryId: string;
  type: 'pack';
  itemId: string;
  name: string;
  barcode?: string;
  price: number;
  packQty?: number;
  packUnit?: string;
  parentProductId?: string;
  order: number;
}

/**
 * النموذج الموحد لبيانات العبوة السريعة في الإضافة والتعديل
 * (100% تطابق مع نموذج المعمارية الموحدة)
 */
export interface FavoritePackFormData {
  id?: string;               // معرف عنصر المفضلة (في التعديل)
  packId?: string;           // معرف كيان العبوة في قاعدة البيانات (Pack ID)
  productId: string;         // معرف منتج التجزئة الأصلي
  productName: string;       // اسم منتج التجزئة
  productBarcode?: string;   // باركود منتج التجزئة
  productRetailPrice: number;// سعر الحبة تجزئة
  productStock: number;      // الرصيد المتوفر في المخزن
  piecesCount: number;       // عدد القطع في العبوة (مثال: 6، 12، 24)
  unitName: string;          // مسمى وحدة التعبئة (كرتونة، طرد، باقة...)
  packName: string;          // اسم العبوة الظاهر
  barcode: string;           // باركود العبوة
  packPrice: string;         // سعر البيع الإجمالي للعبوة
  isCustomPrice: boolean;    // هل السعر مخصص أم تلقائي
  targetCatId: string;       // تصنيف المفضلة المستهدف
  packType: FavoritePackType;// نوع الباقة
  minWholesaleQty: number;   // الحد الأدنى للجملة
  searchQuery?: string;
}
