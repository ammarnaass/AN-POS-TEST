import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Product, Category } from '@/types';
import type { FavoritePackItem } from '../types';
import { useFavoritesStore } from '@/features/favorites/store/useFavoritesStore';

export interface UseDesign7FavoritesProps {
  customFavoriteCategories?: Array<{ id: string; name: string; icon?: string; color?: string }>;
  customFavoritePacks?: any[];
  categories?: (Category | { id: string; name: string } | string)[];
  products?: Product[];
  allProducts?: Product[];
  priceTier?: '1' | '2' | '3' | '4';
  onAddToCart: (product: any, customPrice?: number) => void;
}

export function useDesign7Favorites({
  customFavoriteCategories,
  customFavoritePacks,
  categories = [],
  products = [],
  allProducts = [],
  priceTier = '1',
  onAddToCart,
}: UseDesign7FavoritesProps) {
  // Favorites Store & Categories for Favorite Packs (عبوات وتصنيفات المفضلة)
  const {
    categories: storeFavoriteCategories,
    items: storeFavoriteItems,
    purgeProductItems,
  } = useFavoritesStore();

  useEffect(() => {
    purgeProductItems();
  }, [purgeProductItems]);

  const [selectedFavoriteCatId, setSelectedFavoriteCatId] = useState<string>('ALL');

  // Categories dedicated exclusively to favorite packages
  const activeFavoriteCategories = useMemo(() => {
    if (customFavoriteCategories && customFavoriteCategories.length > 0) {
      return customFavoriteCategories;
    }
    if (storeFavoriteCategories && storeFavoriteCategories.length > 0) {
      return storeFavoriteCategories;
    }
    // الربط التلقائي بأقسام وعائلات المتجر الفعلية
    return (categories || []).map((c: any) => ({
      id: typeof c === 'string' ? c : c.id || c.name,
      name: typeof c === 'string' ? c : c.name,
      color: typeof c === 'string' ? '#2563eb' : c.color || '#2563eb',
      icon: typeof c === 'string' ? 'FolderTree' : c.icon || 'FolderTree',
    }));
  }, [customFavoriteCategories, storeFavoriteCategories, categories]);

  // Packs only from favorites store
  const packOnlyFavorites = useMemo(() => {
    return (storeFavoriteItems || []).filter((it) => it.type === 'pack');
  }, [storeFavoriteItems]);

  // System packs from catalog (isPack: true or bundle items)
  const systemPacks = useMemo(() => {
    const list = (allProducts && allProducts.length > 0 ? allProducts : products) || [];
    return list.filter((p: any) => Boolean(p.isPack) || 'items' in p);
  }, [allProducts, products]);

  // Fallback favorite packs when store items haven't been created yet
  const fallbackFavoriteItems = useMemo(() => {
    if (systemPacks.length > 0) {
      return systemPacks.map((p: any, idx: number) => ({
        id: `sys-pack-${p.id}`,
        categoryId: p.categoryId || (idx % 3 === 0 ? 'fav-cat-wholesale' : idx % 3 === 1 ? 'fav-cat-drinks' : 'fav-cat-quick'),
        type: 'pack' as const,
        itemId: String(p.id).replace('pack-', ''),
        name: p.name,
        barcode: p.barcode,
        price: Number(p.retailPrice ?? p.price ?? p.packPrice ?? 0),
        packQty: Number(p.packPiecesCount ?? p.piecesCount ?? 1),
        packUnit: p.unitName || p.unit || 'عبوة',
        order: idx,
        isPack: true,
      }));
    }

    // Smart fallback: map available products into favorite packs and link directly to real departments
    const available = (allProducts && allProducts.length > 0 ? allProducts : products) || [];
    return available.map((p: any, idx: number) => {
      let prodCatId = p.categoryId || (p as any).category_id;
      const byId = activeFavoriteCategories.find((c) => c.id === prodCatId);
      if (!byId && p.category) {
        const byName = activeFavoriteCategories.find(
          (c) => c.name.trim().toLowerCase() === p.category.trim().toLowerCase()
        );
        if (byName) prodCatId = byName.id;
      }
      if (!prodCatId || (!byId && !activeFavoriteCategories.some((c) => c.id === prodCatId))) {
        if (activeFavoriteCategories.length > 0) {
          prodCatId = activeFavoriteCategories[idx % activeFavoriteCategories.length].id;
        } else {
          prodCatId = idx % 3 === 0 ? 'fav-cat-drinks' : idx % 3 === 1 ? 'fav-cat-wholesale' : 'fav-cat-quick';
        }
      }

      return {
        id: `fav-pack-${p.id || idx}`,
        categoryId: prodCatId,
        category: p.category,
        type: 'pack' as const,
        itemId: String(p.id),
        name: p.name || (p as any).productName || 'سلعة',
        barcode: p.barcode,
        price: Number(p.retailPrice ?? p.price ?? 0),
        packQty: (p as any).packPiecesCount || (p as any).piecesCount || 1,
        packUnit: (p as any).unit || (p as any).unitName || 'عبوة',
        order: idx,
        isPack: true,
      };
    });
  }, [systemPacks, allProducts, products, activeFavoriteCategories]);

  // Active full list of favorite packs
  const activeFavoritesList = useMemo(() => {
    if (customFavoritePacks && customFavoritePacks.length > 0) {
      return customFavoritePacks;
    }
    return packOnlyFavorites.length > 0 ? packOnlyFavorites : fallbackFavoriteItems;
  }, [customFavoritePacks, packOnlyFavorites, fallbackFavoriteItems]);

  // Filtered favorite packs based on selected favorite category
  const displayedFavoriteItems = useMemo(() => {
    if (selectedFavoriteCatId === 'ALL') {
      return activeFavoritesList;
    }
    const catObj = activeFavoriteCategories.find((c) => c.id === selectedFavoriteCatId);
    const catName = catObj ? catObj.name.trim().toLowerCase() : '';
    return activeFavoritesList.filter((it: any) => {
      if (it.categoryId === selectedFavoriteCatId) return true;
      if (catName && (it.category?.trim().toLowerCase() === catName || it.name?.trim().toLowerCase().includes(catName))) {
        return true;
      }
      return false;
    });
  }, [activeFavoritesList, activeFavoriteCategories, selectedFavoriteCatId]);

  // Handle selecting / adding a favorite pack to the basket
  const handleSelectFavoritePack = useCallback(
    (pack: FavoritePackItem | any) => {
      const isPackItem = pack.isPack !== false;
      if (isPackItem) {
        onAddToCart(
          {
            id: `pack-${pack.itemId || pack.id}`,
            name: pack.name,
            barcode: pack.barcode,
            retailPrice: pack.price,
            price: pack.price,
            isPack: true,
            packId: pack.itemId || pack.id,
            packPiecesCount: pack.packQty || 1,
            packUnit: pack.packUnit || 'عبوة',
            packMode: priceTier === '3' ? 'wholesale_packs' : 'retail_pieces',
          } as any,
          pack.price
        );
      } else {
        const pool = (allProducts && allProducts.length > 0 ? allProducts : products) || [];
        const originalProduct = pool.find((p) => String(p.id) === String(pack.itemId || pack.id));
        if (originalProduct) {
          // للمنتج الفردي: نعتمد على فئة السعر النشطة priceTier في السلة بدلاً من فرض سعر المفضلة الثابت
          onAddToCart(originalProduct);
        } else {
          onAddToCart(
            {
              id: pack.itemId || pack.id,
              name: pack.name,
              barcode: pack.barcode,
              retailPrice: pack.price,
              price: pack.price,
              isPack: false,
            } as any,
            pack.price
          );
        }
      }
    },
    [onAddToCart, allProducts, products, priceTier]
  );

  return {
    selectedFavoriteCatId,
    setSelectedFavoriteCatId,
    activeFavoriteCategories,
    activeFavoritesList,
    displayedFavoriteItems,
    handleSelectFavoritePack,
  };
}
