import { useState, useMemo } from 'react';
import type { FavoriteCategory, FavoriteItem } from '../types';

export function useFavoritesCategoryFilter(
  categories: FavoriteCategory[],
  items: FavoriteItem[]
) {
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered favorite items to display (strictly packs/cartons only)
  const displayedItems = useMemo(() => {
    let result = items.filter((it) => it.type === 'pack');
    if (selectedCatId !== 'ALL') {
      result = result.filter((it) => it.categoryId === selectedCatId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          (it.barcode && it.barcode.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, selectedCatId, searchQuery]);

  // Current active category object
  const activeCategory = useMemo(() => {
    return categories.find((c) => c.id === selectedCatId);
  }, [categories, selectedCatId]);

  return {
    selectedCatId,
    setSelectedCatId,
    searchQuery,
    setSearchQuery,
    displayedItems,
    activeCategory,
  };
}
