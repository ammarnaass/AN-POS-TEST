import React, { useMemo } from 'react';
import { Star, Package, Plus } from 'lucide-react';
import type { Product, Category } from '@/types';
import { getProductTierPrice } from '@/services';

import type { FavoritePackItem } from '../types';
export type { FavoritePackItem };

export interface Design7BottomFavoritesPadProps {
  favoriteCategories?: Array<{ id: string; name: string; icon?: string; color?: string }>;
  selectedFavoriteCatId?: string;
  onSelectFavoriteCategory?: (catId: string) => void;
  favoritePacks?: FavoritePackItem[];
  totalPacksCount?: number;
  onSelectFavoritePack?: (pack: any) => void;
  onAddToCart: (product: any, price?: number) => void;
  formatMoney: (amount?: number | null) => string;
  onOpenFavoritesManagement?: () => void;
  // Fallbacks for compatibility
  categories?: (Category | { id: string; name: string } | string)[];
  selectedCategory?: string;
  onSelectCategory?: (catId: string) => void;
  products?: Product[];
  priceTier?: '1' | '2' | '3' | '4';
}

export const Design7BottomFavoritesPad: React.FC<Design7BottomFavoritesPadProps> = ({
  favoriteCategories = [],
  selectedFavoriteCatId = 'ALL',
  onSelectFavoriteCategory,
  favoritePacks = [],
  totalPacksCount,
  onSelectFavoritePack,
  onAddToCart,
  formatMoney,
  onOpenFavoritesManagement,
  // Fallbacks
  categories = [],
  selectedCategory,
  onSelectCategory,
  products = [],
  priceTier = '1',
}) => {
  // Check if we have dedicated favorite categories
  const hasFavoriteCategories = favoriteCategories.length > 0;

  // Build the list of active category tabs for Favorite Packs
  const categoriesList = useMemo(() => {
    if (hasFavoriteCategories) {
      return [
        { id: 'ALL', name: 'جميع العبوات', color: '#d97706', count: totalPacksCount ?? favoritePacks.length },
        ...favoriteCategories.map((fc) => ({
          id: fc.id,
          name: fc.name,
          color: fc.color || '#2563eb',
        })),
      ];
    }

    // Fallback if legacy categories passed
    const normalized = categories.map((cat, idx) => {
      if (typeof cat === 'string') {
        return { id: cat, name: cat };
      }
      return { id: cat.id || String(idx), name: cat.name || `فئة ${idx + 1}` };
    });

    return [
      { id: 'ALL', name: 'جميع العبوات' },
      ...normalized,
    ];
  }, [hasFavoriteCategories, favoriteCategories, categories, totalPacksCount, favoritePacks.length]);

  // Primary categories (first 8 tabs)
  const primaryTabs = useMemo(() => {
    const tabs: Array<{ id: string; name: string; color?: string; isPlaceholder: boolean }> = [];
    for (let i = 0; i < 8; i++) {
      if (i < categoriesList.length) {
        tabs.push({
          id: categoriesList[i].id,
          name: categoriesList[i].name,
          color: (categoriesList[i] as any).color,
          isPlaceholder: false,
        });
      } else {
        tabs.push({
          id: `fav-${i + 1}`,
          name: `فئة ${i + 1}`,
          isPlaceholder: true,
        });
      }
    }
    return tabs;
  }, [categoriesList]);

  // Secondary categories (from index 8 onwards)
  const secondaryTabs = useMemo(() => {
    const tabs: Array<{ id: string; name: string; color?: string; isPlaceholder: boolean }> = [];
    for (let i = 8; i < 16; i++) {
      if (i < categoriesList.length) {
        tabs.push({
          id: categoriesList[i].id,
          name: categoriesList[i].name,
          color: (categoriesList[i] as any).color,
          isPlaceholder: false,
        });
      } else {
        tabs.push({
          id: `fav-${i + 1}`,
          name: `فئة ${i + 1}`,
          isPlaceholder: true,
        });
      }
    }
    return tabs;
  }, [categoriesList]);

  // Active Category Selection Handler
  const currentActiveCatId = hasFavoriteCategories
    ? selectedFavoriteCatId
    : (selectedCategory || 'ALL');

  const handleCategoryClick = (catId: string) => {
    if (onSelectFavoriteCategory) {
      onSelectFavoriteCategory(catId);
    }
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  // Resolve packs or products to display (up to 16 slots)
  const activePacksList = useMemo(() => {
    const activeFilter = (selectedFavoriteCatId && selectedFavoriteCatId !== 'ALL' && selectedFavoriteCatId !== 'all')
      ? selectedFavoriteCatId
      : (selectedCategory && selectedCategory !== 'ALL' && selectedCategory !== 'all')
      ? selectedCategory
      : null;

    // 1. If favorite packs are directly passed as an array
    if (Array.isArray(favoritePacks)) {
      // If filtering by a specific category, strictly return the favoritePacks list for that category (even if empty)
      if (activeFilter) {
        return favoritePacks.slice(0, 16);
      }
      // If viewing all, return favoritePacks if not empty
      if (favoritePacks.length > 0) {
        return favoritePacks.slice(0, 16);
      }
    }

    // 2. Fallback to products only when favorite packs are absent
    const productSource = products && products.length > 0 ? products : [];
    if (productSource.length > 0) {
      let filtered: any[] = productSource;

      if (activeFilter) {
        filtered = productSource.filter(
          (p) =>
            p.categoryId === activeFilter ||
            p.category === activeFilter ||
            (p as any).category_id === activeFilter
        );
      }

      return filtered.slice(0, 16).map((p) => ({
        id: p.id,
        itemId: p.id,
        name: p.name,
        price: Number(p.retailPrice ?? (p as any).price ?? 0),
        packQty: (p as any).packPiecesCount || (p as any).piecesCount || 1,
        packUnit: (p as any).unit || (p as any).unitName || ((p as any).isPack ? 'عبوة' : 'قطعة'),
        barcode: p.barcode,
        isPack: Boolean((p as any).isPack),
      }));
    }

    return [];
  }, [favoritePacks, products, selectedFavoriteCatId, selectedCategory]);

  const handleOpenManagement = () => {
    if (onOpenFavoritesManagement) {
      onOpenFavoritesManagement();
    } else {
      try {
        if (typeof window !== 'undefined' && window.location) {
          if (window.location.hash || window.location.protocol === 'file:') {
            window.location.hash = '#/favorites';
          } else {
            window.location.href = '/favorites';
          }
        }
      } catch {
        // Fallback
      }
    }
  };

  return (
    <footer
      className="h-42 sm:h-48 md:h-52 bg-[#e5ebf2] border-t-2 border-[#a9b9c9] p-1 sm:p-1.5 flex gap-1.5 sm:gap-2 overflow-hidden shrink-0 select-none"
      data-purpose="favorites-keypad"
    >
      {/* Category Tabs Stack (Right in RTL): تصنيفات العبوات والمفضلة - عرض موسع بنسبة 15%+ */}
      <div className="w-44 sm:w-48 md:w-54 flex flex-col gap-1 shrink-0" data-purpose="category-tabs">
        {/* Header Ribbon for Categories */}
        <div className="flex items-center justify-between px-1 text-[11px] font-black text-amber-900 pb-0.5 border-b border-amber-300/50 shrink-0">
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>تصنيفات العبوات</span>
          </span>
          <span className="font-mono bg-amber-200/90 text-amber-900 px-1.5 rounded text-[10px] font-bold border border-amber-300/60">
            {categoriesList.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 flex-1 overflow-hidden">
          {primaryTabs.map((tab) => {
            if (tab.isPlaceholder) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="bg-white rounded border border-dashed border-slate-300 cursor-default pointer-events-none opacity-50"
                  tabIndex={-1}
                />
              );
            }

            const isActive = currentActiveCatId === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryClick(tab.id)}
                className={`font-black rounded flex items-center justify-center text-[10.5px] sm:text-xs shadow-xs cursor-pointer p-1 text-center transition-all leading-tight ${
                  isActive
                    ? 'bg-amber-100 text-black border border-amber-400 ring-2 ring-amber-400 font-black'
                    : 'bg-white text-black border border-[#9ba8b7] hover:border-amber-500 hover:bg-amber-50 font-black'
                }`}
                title={tab.name}
              >
                <span className="line-clamp-2 break-words">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center Product Grid: عبوات المفضلة فقط - عرض أوسع وأبعاد مريحة لإظهار الاسم والسعر بوضوح */}
      <div
        className="flex-1 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2 overflow-hidden"
        data-purpose="product-speed-dial"
      >
        {activePacksList.length === 0 ? (
          <div className="col-span-3 md:col-span-4 row-span-4 flex flex-col items-center justify-center p-2 text-center text-slate-600 bg-white/40 rounded border border-dashed border-slate-300">
            <Package className="w-6 h-6 text-amber-600 mb-1 opacity-80" />
            <span className="text-xs font-bold text-slate-800">لا توجد عبوات في هذا التصنيف المفضل</span>
            <button
              type="button"
              onClick={handleOpenManagement}
              className="mt-1 text-[10px] font-bold text-sky-800 hover:text-sky-950 bg-sky-100 hover:bg-sky-200 px-2.5 py-1 rounded border border-sky-300 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>إدارة وإنشاء عبوات للمفضلة</span>
            </button>
          </div>
        ) : (
          Array.from({ length: 16 }).map((_, slotIdx) => {
            const pack = activePacksList[slotIdx];

            if (pack) {
              const displayPrice = (() => {
                if (pack.isPack === false) {
                  const prod = products.find((p) => String(p.id) === String(pack.itemId || pack.id));
                  if (prod) {
                    const tp = getProductTierPrice(prod, priceTier);
                    if (tp > 0) return tp;
                  }
                }
                return pack.price;
              })();

              return (
                <button
                  key={pack.id || slotIdx}
                  type="button"
                  onClick={() => {
                    if (onSelectFavoritePack) {
                      onSelectFavoritePack(pack);
                    } else {
                      onAddToCart(pack as any, pack.isPack === false ? undefined : pack.price);
                    }
                  }}
                  title={`${pack.name} - ${formatMoney(displayPrice)} (${pack.isPack === false ? 'سلعة' : 'عبوة'})`}
                  className="bg-white border border-[#9ba8b7] rounded p-1.5 sm:p-2 flex flex-col justify-between items-center text-center cursor-pointer overflow-hidden group active:scale-95 transition-all shadow-sm hover:shadow-md hover:border-amber-500 hover:bg-amber-50 min-h-[44px]"
                >
                  {/* Pack Name: 2 lines with clear bold black typography on light card background */}
                  <div className="w-full flex-1 flex items-center justify-center overflow-hidden">
                    <span className="font-black text-black text-xs sm:text-[13px] md:text-[14px] tracking-normal line-clamp-2 group-hover:text-amber-900 leading-tight break-words drop-shadow-xs">
                      {pack.name}
                    </span>
                  </div>

                  {/* Pack Price & Unit Row: Dedicated row ensuring both are 100% visible with generous width */}
                  <div className="w-full flex items-center justify-between gap-1.5 mt-1 pt-1 border-t border-slate-300 shrink-0">
                    {pack.packQty && pack.packQty > 1 ? (
                      <span className="text-[10px] sm:text-[10.5px] font-black px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 border border-amber-300 font-mono truncate max-w-[80px] shadow-2xs">
                        ×{pack.packQty} {pack.packUnit || 'عبوة'}
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-[10.5px] font-bold text-slate-600 font-mono">
                        {pack.packUnit || 'عبوة'}
                      </span>
                    )}
                    <span className="text-[11px] sm:text-xs md:text-[12.5px] font-black text-black font-mono bg-amber-300 px-2 py-0.5 rounded border border-amber-400 shadow-2xs shrink-0">
                      {formatMoney(displayPrice)}
                    </span>
                  </div>
                </button>
              );
            }

            // Empty glossy placeholder button
            return (
              <button
                key={`empty-${slotIdx}`}
                type="button"
                className="bg-white rounded border border-dashed border-slate-300 cursor-default pointer-events-none opacity-40"
                tabIndex={-1}
              />
            );
          })
        )}
      </div>

      {/* Secondary Category Tabs / Management Shortcut (Left in RTL) */}
      <div
        className={`flex flex-col gap-1 shrink-0 ${
          categoriesList.length > 8 ? 'w-28 sm:w-32 md:w-36' : 'w-20 sm:w-24 md:w-28'
        }`}
        data-purpose="secondary-favs"
      >
        {/* Management Action Button */}
        <button
          type="button"
          onClick={handleOpenManagement}
          className="d7-glossy-top-btn py-1 px-1.5 rounded flex items-center justify-center gap-1 text-[10px] font-bold text-amber-900 border border-amber-300 shadow-2xs hover:bg-amber-100 cursor-pointer transition-all shrink-0"
          title="الانتقال إلى إدارة تصنيفات وعبوات المفضلة"
        >
          <Plus className="w-3 h-3 text-amber-600" />
          <span className="truncate">إدارة العبوات</span>
        </button>

        {/* Secondary Category Slots */}
        <div className="grid grid-cols-2 gap-1 flex-1 overflow-hidden">
          {secondaryTabs.map((tab) => {
            if (tab.isPlaceholder) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  className="bg-white rounded border border-dashed border-slate-300 cursor-default pointer-events-none opacity-50"
                  tabIndex={-1}
                />
              );
            }

            const isActive = currentActiveCatId === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleCategoryClick(tab.id)}
                className={`font-black rounded flex items-center justify-center text-[10.5px] sm:text-xs shadow-xs cursor-pointer p-1 text-center transition-all leading-tight ${
                  isActive
                    ? 'bg-amber-100 text-black border border-amber-400 ring-2 ring-amber-400 font-black'
                    : 'bg-white text-black border border-[#9ba8b7] hover:border-amber-500 hover:bg-amber-50 font-black'
                }`}
                title={tab.name}
              >
                <span className="line-clamp-2 break-words">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </footer>
  );
};
