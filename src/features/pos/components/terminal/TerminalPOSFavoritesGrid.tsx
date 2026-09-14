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
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-2xs flex gap-2.5 h-52 sm:h-56 shrink-0">
      {/* شبكة الأصناف والعبوات (ممتدة لتستفيد من المساحة الكاملة) */}
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 overflow-y-auto custom-scrollbar p-0.5">
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
                  className="bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/70 text-slate-800 dark:text-slate-100 rounded-xl p-2 flex flex-col justify-between items-center text-center shadow-2xs hover:shadow-xs transition-all group cursor-pointer active:scale-95 min-h-[58px]"
                  title={`إضافة ${favItem.name} (عبوة ×${favItem.packQty || 1}) بسعر ${formatMoney(price)} ${currency}`}
                >
                  <div className="w-full flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-emerald-600 text-white truncate max-w-full">
                      ×{favItem.packQty || 1} {favItem.packUnit || 'عبوة'}
                    </span>
                    {favItem.barcode && (
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-400 truncate max-w-[55px]">
                        {favItem.barcode}
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-300 line-clamp-2 w-full text-center my-0.5">
                    {favItem.name}
                  </span>

                  <span className="font-bold text-xs font-mono px-2.5 py-0.5 rounded-full mt-1 bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-200">
                    {formatMoney(price)} {currency}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-6 text-slate-400 text-xs">
              <Star className="w-7 h-7 mb-1.5 text-amber-400 stroke-1" />
              <span className="font-bold text-slate-600 dark:text-slate-300">لا توجد عبوات أو كراتين في هذا التصنيف المفضل</span>
              <button
                type="button"
                onClick={() => navigate('/favorites')}
                className="mt-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline flex items-center gap-1.5 cursor-pointer bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إدارة وإنشاء عبوات للمفضلة</span>
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
                  className="bg-slate-50 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl p-2 flex flex-col justify-between items-center text-center shadow-2xs hover:shadow-xs transition-all group cursor-pointer active:scale-95 min-h-[56px]"
                  title={`إضافة ${prod.name} بسعر ${formatMoney(price)} ${currency}`}
                >
                  <div className="w-full flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-600 text-white">
                      تجزئة
                    </span>
                    {prod.barcode && (
                      <span className="text-[9px] font-mono text-slate-400 dark:text-slate-400 truncate max-w-[55px]">
                        {prod.barcode}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold leading-tight group-hover:text-blue-700 dark:group-hover:text-blue-300 line-clamp-2 my-0.5">
                    {prod.name}
                  </span>
                  <span className="bg-blue-100 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200 font-bold text-xs font-mono px-2.5 py-0.5 rounded-full mt-1">
                    {formatMoney(price)} {currency}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-8 text-slate-400 text-xs">
              <Package className="w-8 h-8 mb-2 text-blue-400 stroke-1" />
              <span className="font-bold text-slate-600 dark:text-slate-300">لا توجد منتجات تجزئة في هذا التصنيف</span>
            </div>
          )
        )}
      </div>

      {/* قائمة التصنيفات الجانبية مع مبدل النمط (المفضلة ★ / التجزئة 📦) */}
      <div className="w-44 sm:w-48 flex flex-col gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2 overflow-y-auto custom-scrollbar max-h-full shrink-0">
        {/* مبدل نمط العرض السريع */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 mb-0.5">
          <button
            type="button"
            onClick={() => {
              setTerminalCategoryMode('favorites');
              onSelectCategory('ALL');
              setSelectedFavoriteCatId('ALL');
            }}
            className={`flex-1 py-1.5 px-1 text-[11px] font-extrabold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
              terminalCategoryMode === 'favorites'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="عرض تصنيفات المفضلة (العبوات والكراتين)"
          >
            <Star className="w-3 h-3 fill-current" />
            <span>العبوات</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTerminalCategoryMode('products');
              onSelectCategory('ALL');
            }}
            className={`flex-1 py-1.5 px-1 text-[11px] font-extrabold rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
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
            className="p-1.5 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
            title="إدارة وإنشاء عبوات جديدة للمفضلة"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {terminalCategoryMode === 'favorites' ? (
          <>
            <div className="px-1 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-1">
              <span>تصنيفات العبوات والمفضلة</span>
              <span className="font-mono bg-amber-100 dark:bg-amber-950/60 px-1.5 rounded text-[9px]">{favoriteCategories.length}</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFavoriteCatId('ALL')}
              className={`font-bold text-xs py-2 px-2.5 rounded-xl transition text-center cursor-pointer shadow-2xs shrink-0 active:scale-95 flex items-center justify-between ${
                selectedFavoriteCatId === 'ALL'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="عرض جميع العبوات المفضلة"
            >
              <span className="truncate">جميع العبوات</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15">
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
                  className={`font-bold text-xs py-2 px-2.5 rounded-xl transition text-center truncate cursor-pointer shrink-0 active:scale-95 flex items-center justify-between gap-1 ${
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
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15 shrink-0">
                    {catCount}
                  </span>
                </button>
              );
            })}
          </>
        ) : (
          <>
            <div className="px-1 py-0.5 text-[10px] font-extrabold text-blue-700 dark:text-blue-400 flex items-center justify-between border-b border-blue-200/50 dark:border-blue-900/40 pb-1">
              <span>تصنيفات منتجات التجزئة</span>
              <span className="font-mono bg-blue-100 dark:bg-blue-950/60 px-1.5 rounded text-[9px]">{categories.length}</span>
            </div>

            <button
              type="button"
              onClick={() => onSelectCategory('ALL')}
              className={`font-bold text-xs py-2 px-2.5 rounded-xl transition text-center cursor-pointer shadow-2xs shrink-0 active:scale-95 flex items-center justify-between ${
                !selectedCategory || selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="عرض جميع أصناف التجزئة"
            >
              <span>جميع الأصناف</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/15">
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
                  className={`font-bold text-xs py-2 px-2.5 rounded-xl transition text-center truncate cursor-pointer shrink-0 active:scale-95 ${
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
    </div>
  );
};
