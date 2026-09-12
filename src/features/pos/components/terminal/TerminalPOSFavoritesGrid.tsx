import React from 'react';
import { Star, Plus, Package, Search, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Product, Category } from '@/types';

export interface TerminalPOSFavoritesGridProps {
  terminalCategoryMode: 'favorites' | 'products';
  setTerminalCategoryMode: (mode: 'favorites' | 'products') => void;
  displayedFavoriteItems: Array<{
    id?: string;
    itemId?: string;
    name: string;
    barcode?: string;
    price: number;
    packQty?: number;
    packUnit?: string;
    categoryId?: string;
  }>;
  onAddToCart: (product: any, customPrice?: number) => void;
  formatMoney: (amount?: number) => string;
  currency?: string;
  quickProducts: Product[];
  priceTier: '1' | '2' | '3' | '4';
  getProductPriceByTier: (prod: Product, tier: '1' | '2' | '3' | '4') => number;
  favoriteCategories: Array<{ id: string; name: string; color?: string }>;
  selectedFavoriteCatId: string;
  setSelectedFavoriteCatId: (id: string) => void;
  activeFavoritesList: any[];
  categories: (Category | { id: string; name: string } | string)[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  allProducts?: Product[];
  products: Product[];
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onOpenCustomize: () => void;
}

export const TerminalPOSFavoritesGrid: React.FC<TerminalPOSFavoritesGridProps> = ({
  terminalCategoryMode,
  setTerminalCategoryMode,
  displayedFavoriteItems,
  onAddToCart,
  formatMoney,
  currency = 'دج',
  quickProducts,
  priceTier,
  getProductPriceByTier,
  favoriteCategories,
  selectedFavoriteCatId,
  setSelectedFavoriteCatId,
  activeFavoritesList,
  categories,
  selectedCategory,
  onSelectCategory,
  allProducts = [],
  products,
  barcodeInputRef,
  searchQuery,
  setSearchQuery,
  onOpenCustomize,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-2xs flex gap-2 h-48 sm:h-52 shrink-0">
      {/* شبكة الأصناف (منتجات سريعة أو عبوات المفضلة) */}
      <div className="flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 overflow-y-auto custom-scrollbar p-0.5">
        {terminalCategoryMode === 'favorites' ? (
          displayedFavoriteItems.length > 0 ? (
            displayedFavoriteItems.map((favItem, fIdx) => {
              const price = favItem.price;

              return (
                <button
                  key={favItem.id || `fav-${fIdx}`}
                  type="button"
                  onClick={() => {
                    onAddToCart(
                      {
                        id: `pack-${favItem.itemId}`,
                        name: favItem.name,
                        barcode: favItem.barcode,
                        retailPrice: favItem.price,
                        price: favItem.price,
                        isPack: true,
                        packId: favItem.itemId,
                        packPiecesCount: favItem.packQty || 1,
                        packUnit: favItem.packUnit || 'عبوة',
                      } as any,
                      favItem.price
                    );
                  }}
                  className="bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/60 text-slate-800 dark:text-slate-100 rounded-lg p-1.5 flex flex-col justify-between items-center text-center shadow-2xs transition group cursor-pointer active:scale-95 min-h-[46px]"
                  title={`إضافة ${favItem.name} (عبوة ×${favItem.packQty || 1}) بسعر ${formatMoney(price)} ${currency}`}
                >
                  <div className="w-full flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[9px] font-bold px-1 rounded bg-emerald-600 text-white truncate max-w-full">
                      ×{favItem.packQty || 1} {favItem.packUnit || 'عبوة'}
                    </span>
                    {favItem.barcode && (
                      <span className="text-[8px] font-mono text-slate-400 truncate max-w-[50px]">
                        {favItem.barcode}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-bold leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 line-clamp-2 w-full text-center">
                    {favItem.name}
                  </span>

                  <span className="font-bold text-[10px] font-mono px-2 py-0.5 rounded-full mt-1 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    {formatMoney(price)} {currency}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-5 text-slate-400 text-xs">
              <Star className="w-6 h-6 mb-1 text-amber-400 stroke-1" />
              <span>لا توجد عبوات أو كراتين في هذا التصنيف المفضل</span>
              <button
                type="button"
                onClick={() => navigate('/favorites')}
                className="mt-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <Plus className="w-3 h-3" />
                إدارة وإنشاء عبوات للمفضلة
              </button>
            </div>
          )
        ) : (
          quickProducts.length > 0 ? (
            quickProducts.map((prod, pIdx) => {
              const price = getProductPriceByTier(prod, priceTier);
              return (
                <button
                  key={prod.id || `qp-${pIdx}`}
                  type="button"
                  onClick={() => onAddToCart({ ...prod, price, retailPrice: price }, price)}
                  className="bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 flex flex-col justify-between items-center text-center shadow-2xs transition group cursor-pointer active:scale-95 min-h-[44px]"
                  title={`إضافة ${prod.name} بسعر ${formatMoney(price)} ${currency}`}
                >
                  <div className="w-full flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[9px] font-bold px-1 rounded bg-blue-600 text-white">
                      تجزئة
                    </span>
                    {prod.barcode && (
                      <span className="text-[8px] font-mono text-slate-400 truncate max-w-[50px]">
                        {prod.barcode}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-400 line-clamp-2">
                    {prod.name}
                  </span>
                  <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold text-[10px] font-mono px-2 py-0.5 rounded-full mt-1">
                    {formatMoney(price)} {currency}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
              <Package className="w-8 h-8 mb-2 text-blue-400 stroke-1" />
              <span>لا توجد منتجات تجزئة في هذا التصنيف</span>
            </div>
          )
        )}
      </div>

      {/* أزرار الفئات الجانبية القائمة مع مبدل الوضع السريع */}
      <div className="w-40 sm:w-44 flex flex-col gap-1 border-r border-slate-200 dark:border-slate-800 pr-1.5 overflow-y-auto custom-scrollbar max-h-full">
        {/* مبدل نمط العرض السريع: المفضلة والعبوات ★ | تصنيفات التجزئة 📦 */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 mb-1">
          <button
            type="button"
            onClick={() => {
              setTerminalCategoryMode('favorites');
              onSelectCategory('ALL');
              setSelectedFavoriteCatId('ALL');
            }}
            className={`flex-1 py-1.5 px-1 text-[10px] font-black rounded-md transition text-center cursor-pointer flex items-center justify-center gap-1 ${
              terminalCategoryMode === 'favorites'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="عرض تصنيفات المفضلة (العبوات فقط)"
          >
            <Star className="w-3 h-3 fill-current" />
            <span>العبوات (المفضلة)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTerminalCategoryMode('products');
              onSelectCategory('ALL');
            }}
            className={`flex-1 py-1.5 px-1 text-[10px] font-black rounded-md transition text-center cursor-pointer flex items-center justify-center gap-1 ${
              terminalCategoryMode === 'products'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="عرض تصنيفات التجزئة القياسية"
          >
            <Package className="w-3 h-3" />
            <span>التجزئة</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/favorites')}
            className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition cursor-pointer"
            title="إدارة وإنشاء عبوات جديدة للمفضلة"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {terminalCategoryMode === 'favorites' ? (
          <>
            <div className="px-1 py-0.5 text-[9px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-0.5 mb-0.5">
              <span>تصنيفات العبوات والمفضلة</span>
              <span className="font-mono bg-amber-100 dark:bg-amber-950/60 px-1 rounded">{favoriteCategories.length}</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFavoriteCatId('ALL')}
              className={`font-bold text-xs py-1.5 px-2 rounded-lg transition text-center cursor-pointer shadow-2xs shrink-0 active:scale-95 flex items-center justify-between ${
                selectedFavoriteCatId === 'ALL'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="عرض جميع العبوات المفضلة"
            >
              <span className="truncate">جميع العبوات</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/15">
                {activeFavoritesList.length}
              </span>
            </button>

            {favoriteCategories.map((favCat) => {
              const isSelected = selectedFavoriteCatId === favCat.id;
              const catCount = activeFavoritesList.filter((i) => i.categoryId === favCat.id).length;

              return (
                <button
                  key={favCat.id}
                  type="button"
                  onClick={() => setSelectedFavoriteCatId(favCat.id)}
                  className={`font-bold text-xs py-1.5 px-2 rounded-lg transition text-center truncate cursor-pointer shrink-0 active:scale-95 flex items-center justify-between gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={`تصفية عبوات: ${favCat.name}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: favCat.color || '#059669' }}
                    />
                    <span className="truncate">{favCat.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1 rounded bg-black/15 shrink-0">
                    {catCount}
                  </span>
                </button>
              );
            })}
          </>
        ) : (
          <>
            <div className="px-1 py-0.5 text-[9px] font-extrabold text-blue-700 dark:text-blue-400 flex items-center justify-between border-b border-blue-200/50 dark:border-blue-900/40 pb-0.5 mb-0.5">
              <span>تصنيفات منتجات التجزئة</span>
              <span className="font-mono bg-blue-100 dark:bg-blue-950/60 px-1 rounded">{categories.length}</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectCategory('ALL')}
              className={`font-bold text-xs py-1.5 px-2 rounded-lg transition text-center cursor-pointer shadow-2xs shrink-0 active:scale-95 flex items-center justify-between ${
                !selectedCategory || selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="عرض جميع أصناف التجزئة"
            >
              <span>جميع الأصناف</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/15">
                {(allProducts && allProducts.length > 0 ? allProducts : products).filter((p: any) => !p.isPack).length}
              </span>
            </button>

            {categories.map((cat, cIdx) => {
              const catId = typeof cat === 'object' && cat !== null ? (cat as any).id : String(cat);
              const catName = typeof cat === 'object' && cat !== null ? (cat as any).name : String(cat);
              const isSelected = selectedCategory === catId;
              return (
                <button
                  key={catId || `cat-${cIdx}`}
                  type="button"
                  onClick={() => onSelectCategory(catId)}
                  className={`font-bold text-xs py-2 px-2 rounded-lg transition text-center truncate cursor-pointer shrink-0 active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={`تصفية حسب: ${catName}`}
                >
                  {catName}
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* زر المزيد F10 وأيقونة البحث الجانبية */}
      <div className="flex flex-col justify-between items-center w-10 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
        <button
          type="button"
          onClick={() => {
            barcodeInputRef.current?.focus();
            if (searchQuery && setSearchQuery) setSearchQuery('');
          }}
          className="w-7 h-7 flex items-center justify-center rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer active:scale-90"
          title="البحث في أصناف المخزون"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onOpenCustomize}
          className="[writing-mode:vertical-rl] text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
          title="خيارات وتخصيص العرض (F10)"
        >
          المزيد (F10)
        </button>

        <button
          type="button"
          onClick={onOpenCustomize}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer active:scale-90"
          title="إعدادات إضافية"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
