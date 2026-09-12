import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Product, Pack, Category, Purchase, PurchaseItem } from '@/types';

export const PRODUCTS_PER_PAGE = 12;

export interface UsePOSCatalogFilterProps {
  products: Product[];
  packs: Pack[];
  dbCategories: (Category | { id: string; name: string } | string)[];
  purchases: Purchase[];
  purchaseItems: PurchaseItem[];
  onNotify?: (notification: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }) => void;
}

export function usePOSCatalogFilter({
  products,
  packs,
  dbCategories,
  purchases,
  purchaseItems,
  onNotify,
}: UsePOSCatalogFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all');
  const [isFeaturedOnly, setIsFeaturedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Available categories resolved from DB and product list
  const availableCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    if (Array.isArray(dbCategories)) {
      dbCategories.forEach((c: any) => {
        if (!c) return;
        const name = (typeof c === 'object' ? c.name : String(c))?.trim();
        const id = c.id || name;
        if (name) map.set(name, { id, name });
      });
    }

    if (Array.isArray(products)) {
      products.forEach((p: any) => {
        if (!p) return;
        const name = (typeof p.category === 'object' && p.category !== null ? p.category.name : p.category)?.trim();
        const id = p.categoryId || p.category_id || (name && map.get(name)?.id) || name;
        if (name && !map.has(name)) {
          map.set(name, { id: id || name, name });
        }
      });
    }

    return Array.from(map.values());
  }, [dbCategories, products]);

  // Track product IDs linked to the selected supplier via purchase invoices
  const supplierProductIds = useMemo(() => {
    if (!filterSupplier) return null;
    const supplierPurchases = (purchases as any[])
      .filter((p) => p.supplierId === filterSupplier)
      .map((p) => p.id);
    const purchaseSet = new Set(supplierPurchases);
    const productIds = new Set<string>();
    (purchaseItems as any[]).forEach((pi) => {
      if (purchaseSet.has(pi.purchaseId) && pi.productId) {
        productIds.add(pi.productId);
      }
    });
    return productIds;
  }, [filterSupplier, purchases, purchaseItems]);

  const activeFiltersCount = useMemo(() => {
    return (
      (filterCategory ? 1 : 0) +
      (filterSupplier ? 1 : 0) +
      (filterStockStatus !== 'all' ? 1 : 0) +
      (isFeaturedOnly ? 1 : 0)
    );
  }, [filterCategory, filterSupplier, filterStockStatus, isFeaturedOnly]);

  const handleClearAllFilters = useCallback(() => {
    setFilterCategory('');
    setFilterSupplier('');
    setFilterStockStatus('all');
    setIsFeaturedOnly(false);
    setSearchQuery('');
    if (onNotify) {
      onNotify({
        title: 'مسح الفلاتر',
        message: 'تمت استعادة عرض جميع المنتجات بدون أي تصفية',
        type: 'info',
      });
    }
  }, [onNotify]);

  const filteredProducts = useMemo(() => {
    const activePacks = packs.filter((p) => p.status === 'active');
    let baseProducts = products;

    // 1. Filter by Category / Family
    if (filterCategory && filterCategory !== 'ALL') {
      baseProducts = baseProducts.filter((p) => {
        const catName =
          typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
        return (
          catName === filterCategory ||
          p.category === filterCategory ||
          (p as any).categoryId === filterCategory ||
          (p as any).category_id === filterCategory
        );
      });
    }

    // 2. Filter by Supplier
    if (filterSupplier) {
      baseProducts = baseProducts.filter((p) => {
        if ((p as any).supplierId === filterSupplier || (p as any).supplier === filterSupplier) return true;
        if (supplierProductIds && supplierProductIds.has(p.id)) return true;
        return false;
      });
    }

    // 3. Filter by Stock Status
    if (filterStockStatus === 'in_stock') {
      baseProducts = baseProducts.filter((p) => Number(p.quantity ?? (p as any).stock ?? 0) > 0);
    } else if (filterStockStatus === 'out_of_stock') {
      baseProducts = baseProducts.filter((p) => Number(p.quantity ?? (p as any).stock ?? 0) <= 0);
    } else if (filterStockStatus === 'low_stock') {
      baseProducts = baseProducts.filter((p) => {
        const qty = Number(p.quantity ?? (p as any).stock ?? 0);
        const threshold = Number(p.lowStockThreshold || 5);
        return qty > 0 && qty <= threshold;
      });
    }

    // 4. Filter by Featured
    if (isFeaturedOnly) {
      baseProducts = baseProducts.filter((p) =>
        Boolean(p.highlighted || (p as any).isFeatured || (p as any).featured)
      );
    }

    const resolvePackDetails = (pack: any) => {
      const items = Array.isArray(pack.items)
        ? pack.items
        : (() => {
            try {
              return JSON.parse(pack.items) ?? [];
            } catch {
              return [];
            }
          })();
      const firstId = items[0]?.productId;
      const parentProd = firstId ? products.find((pr) => pr.id === firstId) : undefined;
      const packPieces = Number(pack.piecesCount || items[0]?.qty || items[0]?.quantity || 1);
      const parentStock = parentProd ? Number(parentProd.quantity ?? 0) : 0;
      const availablePacks = packPieces > 0 ? Math.max(0, Math.floor(parentStock / packPieces)) : 0;
      const image = pack.image || parentProd?.image || '';
      const category =
        (parentProd &&
          (typeof parentProd.category === 'object' && parentProd.category !== null
            ? (parentProd.category as any)?.name
            : parentProd.category)) ||
        'عبوات جملة';

      return {
        availablePacks,
        packPieces,
        parentStock,
        parentProd,
        image,
        category,
      };
    };

    const buildPackProduct = (p: any) => {
      const { availablePacks, packPieces, parentStock, parentProd, image, category } = resolvePackDetails(p);
      return {
        ...p,
        id: `pack-${p.id}`,
        retailPrice: p.packPrice,
        quantity: availablePacks,
        packPiecesCount: packPieces,
        parentStock,
        parentName: parentProd?.name || '',
        category,
        image,
        isPack: true,
      };
    };

    let filteredPacks = activePacks.map(buildPackProduct);

    if (filterSupplier) {
      filteredPacks = filteredPacks.filter((p) => {
        const items = Array.isArray(p.items)
          ? p.items
          : (() => {
              try {
                return JSON.parse(p.items) ?? [];
              } catch {
                return [];
              }
            })();
        const prod = products.find((pr) => pr.id === items[0]?.productId);
        return (prod as any)?.supplierId === filterSupplier || (prod as any)?.supplier === filterSupplier;
      });
    }

    if (filterStockStatus === 'in_stock') {
      filteredPacks = filteredPacks.filter((p) => p.quantity > 0);
    } else if (filterStockStatus === 'out_of_stock') {
      filteredPacks = filteredPacks.filter((p) => p.quantity <= 0);
    } else if (filterStockStatus === 'low_stock') {
      filteredPacks = filteredPacks.filter((p) => p.quantity > 0 && p.quantity <= 3);
    }

    if (filterCategory && filterCategory !== 'ALL') {
      filteredPacks = filteredPacks.filter((p) => {
        const cat = typeof p.category === 'object' && p.category !== null ? p.category.name : p.category;
        return cat === filterCategory;
      });
    }

    if (isFeaturedOnly) {
      filteredPacks = filteredPacks.filter((p) => Boolean(p.highlighted || (p as any).isFeatured));
    }

    // 5. Search Query
    if (!searchQuery) {
      const stockProducts = baseProducts.filter((p) => p.status === 'active' && !('items' in p));
      return [...stockProducts, ...filteredPacks];
    }
    const q = searchQuery.toLowerCase().trim();
    const matchedProducts = baseProducts.filter(
      (p) =>
        p.status === 'active' &&
        (p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (typeof p.category === 'string' && p.category.toLowerCase().includes(q)) ||
          (typeof p.category === 'object' && p.category?.name && p.category.name.toLowerCase().includes(q)))
    );
    const matchedPacks = filteredPacks.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.parentName && p.parentName.toLowerCase().includes(q))
    );
    return [...matchedProducts, ...matchedPacks];
  }, [products, packs, searchQuery, filterCategory, filterSupplier, filterStockStatus, isFeaturedOnly, supplierProductIds]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterSupplier, filterStockStatus, isFeaturedOnly]);

  return {
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterSupplier,
    setFilterSupplier,
    filterStockStatus,
    setFilterStockStatus,
    isFeaturedOnly,
    setIsFeaturedOnly,
    currentPage,
    setCurrentPage,
    totalPages,
    availableCategories,
    activeFiltersCount,
    filteredProducts,
    paginatedProducts,
    handleClearAllFilters,
  };
}
