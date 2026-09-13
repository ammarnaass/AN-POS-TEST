import { useState, useMemo, useEffect } from 'react';
import type { Product } from '@/types';

export type SortOption = 'newest' | 'price_desc' | 'price_asc' | 'qty_asc' | 'qty_desc' | 'name_asc';
export type ViewMode = 'table' | 'grid';
export type StockFilterStatus = 'all' | 'in_stock' | 'out_of_stock' | 'low_stock' | 'expiring';

export const getStockStatus = (product: Product) => {
  if (product.quantity <= 0) return 'out_of_stock';
  if (product.lowStockThreshold > 0 && product.quantity <= product.lowStockThreshold) return 'low_stock';
  return 'in_stock';
};

export const isExpiringSoon = (product: Product) => {
  if (!product.expiryDate) return false;
  const expiry = new Date(product.expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days <= 30 && days >= 0;
};

export function useInventoryFilter(products: Product[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<StockFilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(
      (p) => p.lowStockThreshold > 0 && p.quantity <= p.lowStockThreshold && p.quantity > 0
    ).length;
    const outOfStock = products.filter((p) => p.quantity <= 0).length;
    const expiringSoonCount = products.filter((p) => isExpiringSoon(p)).length;
    const stockValue = products.reduce(
      (sum, p) => sum + (Number(p.costPrice) || 0) * (Number(p.quantity) || 0),
      0
    );
    const retailValue = products.reduce(
      (sum, p) => sum + (Number(p.retailPrice) || 0) * (Number(p.quantity) || 0),
      0
    );
    const avgMargin = stockValue > 0 ? ((retailValue - stockValue) / stockValue) * 100 : 0;

    return { totalProducts, lowStock, outOfStock, expiringSoonCount, stockValue, retailValue, avgMargin };
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    if (filterCategory) {
      filtered = filtered.filter((p) => {
        const catName = typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
        return catName === filterCategory || p.categoryId === filterCategory;
      });
    }

    if (filterStockStatus === 'in_stock') filtered = filtered.filter((p) => getStockStatus(p) === 'in_stock');
    if (filterStockStatus === 'low_stock') filtered = filtered.filter((p) => getStockStatus(p) === 'low_stock');
    if (filterStockStatus === 'out_of_stock') filtered = filtered.filter((p) => getStockStatus(p) === 'out_of_stock');
    if (filterStockStatus === 'expiring') filtered = filtered.filter((p) => isExpiringSoon(p));

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt || '').localeCompare(a.createdAt || '');
      if (sortBy === 'price_desc') return (b.retailPrice || 0) - (a.retailPrice || 0);
      if (sortBy === 'price_asc') return (a.retailPrice || 0) - (b.retailPrice || 0);
      if (sortBy === 'qty_asc') return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === 'qty_desc') return (b.quantity || 0) - (a.quantity || 0);
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
      return 0;
    });

    return filtered;
  }, [products, searchQuery, filterCategory, filterStockStatus, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterStockStatus, sortBy, itemsPerPage]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterStockStatus('all');
  };

  return {
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterStockStatus,
    setFilterStockStatus,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    stats,
    filteredProducts,
    paginatedProducts,
    totalPages,
    resetFilters,
  };
}
