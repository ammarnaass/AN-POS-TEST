import React, { useState } from 'react';
import { Star, Package, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import type { Category } from '@/types';
import type { AdvancedTerminalFavoriteItem } from '../types';

export interface Design6FavoritesPadProps {
  onSelectFavorite: (fav: any) => void;
  customFavorites?: AdvancedTerminalFavoriteItem[];
  displayedFavoriteItems?: any[];
  quickProducts?: any[];
  favoriteCategories?: Array<{ id: string; name: string; color?: string }>;
  selectedFavoriteCatId?: string;
  setSelectedFavoriteCatId?: (id: string) => void;
  categories?: (Category | { id: string; name: string } | string)[];
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
  terminalCategoryMode?: 'favorites' | 'products';
  setTerminalCategoryMode?: (mode: 'favorites' | 'products') => void;
  onOpenFavoritesManagement?: () => void;
}

const DEFAULT_PAGE_1_FAVORITES: AdvancedTerminalFavoriteItem[] = [
  { id: 'fav-01', label: 'مفضلة 01', name: 'باجيت (خبز)', price: 15 },
  { id: 'fav-02', label: 'مفضلة 02', name: 'حليب 25 دج', price: 25 },
  { id: 'fav-03', label: 'مفضلة 03', name: 'ماء 0.5 لتر', price: 30 },
  { id: 'fav-04', label: 'مفضلة 04', name: 'ماء 1.5 لتر', price: 45 },
  { id: 'fav-05', label: 'مفضلة 05', name: 'بيض (بالحبة)', price: 20 },
  { id: 'fav-06', label: 'مفضلة 06', name: 'سكر 1 كغ', price: 100 },
  { id: 'fav-07', label: 'مفضلة 07', name: 'قهوة 250 غ', price: 280 },
  { id: 'fav-08', label: 'مفضلة 08', name: 'زيت 1 لتر', price: 170 },
  { id: 'fav-09', label: 'مفضلة 09', name: 'زيت 5 لتر', price: 650 },
  { id: 'fav-10', label: 'مفضلة 10', name: 'عصير علبة', price: 60 },
  { id: 'fav-11', label: 'مفضلة 11', name: 'كيس 10 دج', price: 10, highlightColor: 'crimson' },
  { id: 'fav-12', label: 'مفضلة 12', name: 'ياغورت', price: 35 },
  { id: 'fav-13', label: 'مفضلة 13', name: 'صابون', price: 80 },
  { id: 'fav-14', label: 'مفضلة 14', name: 'جبن مقسم', price: 140 },
  { id: 'fav-15', label: 'مفضلة 15', name: 'بسكويت', price: 50 },
  { id: 'fav-16', label: 'مفضلة 16', name: 'شحن 100', price: 100 },
];

const DEFAULT_PAGE_2_FAVORITES: AdvancedTerminalFavoriteItem[] = [
  { id: 'fav-17', label: 'مفضلة 17', name: 'طماطم مصبرة', price: 240 },
  { id: 'fav-18', label: 'مفضلة 18', name: 'عجائن 500 غ', price: 70 },
  { id: 'fav-19', label: 'مفضلة 19', name: 'تونة معلبة', price: 180 },
  { id: 'fav-20', label: 'مفضلة 20', name: 'أرز 1 كغ', price: 160 },
  { id: 'fav-21', label: 'مفضلة 21', name: 'حمص 500 غ', price: 150 },
  { id: 'fav-22', label: 'مفضلة 22', name: 'شاي أخضر', price: 120 },
  { id: 'fav-23', label: 'مفضلة 23', name: 'فرينة 1 كغ', price: 70 },
  { id: 'fav-24', label: 'مفضلة 24', name: 'سميد 1 كغ', price: 90 },
  { id: 'fav-25', label: 'مفضلة 25', name: 'خل 1 لتر', price: 60 },
  { id: 'fav-26', label: 'مفضلة 26', name: 'ملح طعام', price: 30 },
  { id: 'fav-27', label: 'مفضلة 27', name: 'شوكولاتة', price: 150 },
  { id: 'fav-28', label: 'مفضلة 28', name: 'مشروب غازي 1 لتر', price: 110 },
  { id: 'fav-29', label: 'مفضلة 29', name: 'حفاظات أطفال', price: 450 },
  { id: 'fav-30', label: 'مفضلة 30', name: 'شامبو 400 مل', price: 320 },
  { id: 'fav-31', label: 'مفضلة 31', name: 'معجون أسنان', price: 180 },
  { id: 'fav-32', label: 'مفضلة 32', name: 'جافيل 1 لتر', price: 85 },
];

const ALL_DEFAULT_FAVORITES: AdvancedTerminalFavoriteItem[] = [
  ...DEFAULT_PAGE_1_FAVORITES,
  ...DEFAULT_PAGE_2_FAVORITES,
];

export const Design6FavoritesPad: React.FC<Design6FavoritesPadProps> = ({
  onSelectFavorite,
  customFavorites,
  displayedFavoriteItems = [],
  quickProducts = [],
  favoriteCategories = [],
  selectedFavoriteCatId = 'ALL',
  setSelectedFavoriteCatId,
  terminalCategoryMode = 'favorites',
  setTerminalCategoryMode,
  onOpenFavoritesManagement,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [internalMode, setInternalMode] = useState<'favorites' | 'products'>('favorites');

  const handleOpenFavorites = () => {
    if (onOpenFavoritesManagement) {
      onOpenFavoritesManagement();
    } else {
      try {
        window.location.href = '/favorites';
      } catch {
        // fallback
      }
    }
  };

  const activeMode = setTerminalCategoryMode ? terminalCategoryMode : internalMode;
  const setActiveMode = setTerminalCategoryMode || setInternalMode;

  const pageSize = 16;

  // Resolve items for favorites mode: prioritize real user favorites
  const activeFavorites: any[] =
    displayedFavoriteItems.length > 0
      ? displayedFavoriteItems
      : customFavorites && customFavorites.length > 0
      ? customFavorites
      : ALL_DEFAULT_FAVORITES;

  // Resolve items for products mode
  const activeRetailProducts: any[] = quickProducts;

  const currentList = activeMode === 'favorites' ? activeFavorites : activeRetailProducts;
  const totalPages = Math.max(1, Math.ceil(currentList.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = currentList.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="w-full bg-slate-50 dark:bg-[#070b14] border-t border-slate-200 dark:border-slate-800 p-2 select-none shrink-0 max-h-[195px] overflow-hidden transition-colors">
      {/* Header Bar: Modes Switcher, Categories Filter, Pagination */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        {/* Right: Title & Mode Toggle (المفضلة ★ vs التجزئة 📦) */}
        <div className="flex items-center gap-2">
          {/* Main Title Badge */}
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-300 ml-1">
            <span>الأزرار السريعة والمفضلة (FAV)</span>
            <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-400" />
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-[#0b1222] p-1 rounded-xl border border-slate-300 dark:border-slate-700/80 shadow-inner">
            {/* 1. المفضلة والعبوات */}
            <button
              type="button"
              onClick={() => {
                setActiveMode('favorites');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'favorites'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md scale-102'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="عرض الأصناف المحفوظة في المفضلة والعبوات"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  activeMode === 'favorites' ? 'fill-slate-950 text-slate-950' : 'fill-amber-400 text-amber-400'
                }`}
              />
              <span>المفضلة والعبوات</span>
              {displayedFavoriteItems.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/20 text-slate-950 font-black">
                  {displayedFavoriteItems.length}
                </span>
              )}
            </button>

            {/* 2. سلع التجزئة */}
            <button
              type="button"
              onClick={() => {
                setActiveMode('products');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'products'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md scale-102'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="عرض السلع الفردية من كتالوج التجزئة"
            >
              <Package className="w-3.5 h-3.5" />
              <span>سلع التجزئة</span>
              {quickProducts.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 text-blue-200 font-black">
                  {quickProducts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Center: Category Filter Pills if in Favorites Mode */}
        {activeMode === 'favorites' && favoriteCategories.length > 0 && setSelectedFavoriteCatId && (
          <div className="hidden md:flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-[420px] py-0.5">
            <button
              type="button"
              onClick={() => setSelectedFavoriteCatId('ALL')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
                selectedFavoriteCatId === 'ALL'
                  ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/50'
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              الكل
            </button>
            {favoriteCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedFavoriteCatId(cat.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer shrink-0 border ${
                  selectedFavoriteCatId === cat.id
                    ? 'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/50'
                    : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Left: Manage Favorites Link & Pagination */}
        <div className="flex items-center gap-2">
          {activeMode === 'favorites' && (
            <button
              type="button"
              onClick={handleOpenFavorites}
              className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              title="الانتقال إلى صفحة إدارة العبوات والمفضلة"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>إدارة المفضلة</span>
            </button>
          )}

          {/* Pagination Trigger */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#0e1424] border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 font-mono shadow-2xs">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className={`p-0.5 rounded cursor-pointer ${
                safePage === 1 ? 'opacity-30' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400'
              }`}
              title="الصفحة السابقة"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span>
              صفحة {safePage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className={`p-0.5 rounded cursor-pointer ${
                safePage >= totalPages ? 'opacity-30' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400'
              }`}
              title="الصفحة التالية"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2 x 8 Grid (16 Tiles) */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
        {paginatedItems.map((item: any, idx: number) => {
          const isCrimson = item.highlightColor === 'crimson';
          const isPackItem = activeMode === 'favorites' && (item.type === 'pack' || item.isPack || item.packQty);
          const priceVal = item.price ?? item.retailPrice ?? 0;
          const labelText =
            item.label ||
            (isPackItem
              ? `×${item.packQty || 1} ${item.packUnit || 'عبوة'}`
              : activeMode === 'products'
              ? 'تجزئة'
              : `مفضلة ${String(idx + 1).padStart(2, '0')}`);

          return (
            <button
              key={item.id || `fav-item-${idx}`}
              type="button"
              onClick={() => onSelectFavorite(item)}
              className={`h-[68px] rounded-xl p-1.5 flex flex-col justify-between items-center text-center transition-all cursor-pointer active:scale-95 border ${
                isCrimson
                  ? 'bg-gradient-to-b from-[#be123c] to-[#9f1239] hover:brightness-110 border-rose-500 text-white shadow-[0_0_10px_rgba(190,18,60,0.5)]'
                  : activeMode === 'favorites'
                  ? 'bg-gradient-to-b from-teal-50 to-teal-100/70 hover:from-teal-100 hover:to-teal-200/80 border-teal-300 text-slate-900 shadow-xs dark:bg-gradient-to-b dark:from-[#0b1a20] dark:to-[#0d222a] dark:hover:from-[#112d38] dark:hover:to-[#163847] dark:border-teal-600/50 dark:hover:border-teal-400 dark:text-slate-100'
                  : 'bg-gradient-to-b from-blue-50 to-indigo-100/70 hover:from-blue-100 hover:to-indigo-200/80 border-blue-200 text-slate-900 shadow-xs dark:bg-gradient-to-b dark:from-[#0e1628] dark:to-[#121c33] dark:hover:from-[#172342] dark:hover:to-[#1a284c] dark:border-slate-700 dark:hover:border-blue-500 dark:text-slate-100'
              }`}
              title={`إضافة ${item.name} (${priceVal} دج)`}
            >
              <div className="w-full flex items-center justify-between text-[9px] font-mono leading-tight px-0.5 shrink-0">
                <span
                  className={`font-black px-1 rounded-xs truncate max-w-[70px] ${
                    isCrimson
                      ? 'text-rose-200'
                      : isPackItem
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30'
                      : 'bg-blue-100 text-blue-900 dark:bg-blue-600/30 dark:text-blue-300'
                  }`}
                >
                  {labelText}
                </span>
                <span
                  className={`font-black font-mono ${
                    isCrimson ? 'text-white' : isPackItem ? 'text-emerald-700 dark:text-emerald-400' : 'text-cyan-700 dark:text-cyan-400'
                  }`}
                >
                  {priceVal} دج
                </span>
              </div>
              <div className="w-full flex-1 flex items-center justify-center px-0.5">
                <span className="text-[10.5px] font-bold leading-snug line-clamp-2 w-full text-center">
                  {item.name || 'منتج'}
                </span>
              </div>
            </button>
          );
        })}

        {/* Empty placeholder slots if less than 8 items on page */}
        {paginatedItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-6 text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-[#0b1222]/50 border border-slate-200 dark:border-slate-800 rounded-xl">
            <Star className="w-6 h-6 mb-1 text-amber-500 dark:text-amber-400 stroke-1" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {activeMode === 'favorites'
                ? 'لا توجد عبوات أو كراتين في المفضلة حالياً'
                : 'لا توجد منتجات تجزئة متوفرة'}
            </span>
            {activeMode === 'favorites' && (
              <button
                type="button"
                onClick={handleOpenFavorites}
                className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 px-3 py-1 rounded-lg border border-amber-300 dark:border-amber-700/60 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة وإنشاء عبوات للمفضلة</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
