import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ProductEntity } from '@/infrastructure/database/dexie/db';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';
import { generateBarcodeValue } from '../services/barcodeLabelGenerator';
import type { BarcodeFormat } from '../types';

interface UseBarcodeLabelFiltersParams {
  products: ProductEntity[];
  productBars: Map<string, string>;
  barcodeFormat: BarcodeFormat;
}

export function useBarcodeLabelFilters({
  products,
  productBars,
  barcodeFormat,
}: UseBarcodeLabelFiltersParams) {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectProductId = searchParams.get('productId');

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Preselect from query params
  useEffect(() => {
    if (preselectProductId) {
      setSelectedIds(new Set([preselectProductId]));
    }
  }, [preselectProductId]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => {
        const c =
          typeof p.category === 'object' && p.category !== null
            ? (p.category as any).name
            : p.category;
        return c === selectedCategory;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          (typeof p.category === 'string' && p.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, search, selectedCategory]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
  }, [filteredProducts]);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const generateForAll = useCallback(async () => {
    const ids = [...selectedIds].filter((id) => !productBars.get(id));
    if (ids.length === 0) {
      alert('جميع المنتجات المحددة تمتلك باركود بالفعل.');
      return;
    }
    let success = 0;
    for (const id of ids) {
      try {
        const code = generateBarcodeValue(barcodeFormat);
        await ProductBarcodeRepository.add({
          productId: id,
          barcode: code,
          type: 'primary',
        });
        success++;
      } catch {
        /* ignore */
      }
    }
    queryClient.invalidateQueries({ queryKey: ['product_barcodes'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    alert(`تم توليد وحفظ ${success} باركود بنجاح.`);
  }, [selectedIds, productBars, barcodeFormat, queryClient]);

  return {
    search,
    setSearch,
    selectedCategory,
    setSelectedCategory,
    selectedIds,
    setSelectedIds,
    filteredProducts,
    toggleSelect,
    selectAll,
    clearAll,
    generateForAll,
  };
}
