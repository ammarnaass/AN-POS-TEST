import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';
import { barcodePrintsApi } from '@/services/api/barcodePrintsApi';

export function useBarcodeLabelsData() {
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const { data: barcodes = [] } = useQuery({
    queryKey: ['product_barcodes'],
    queryFn: () => ProductBarcodeRepository.listAll(),
  });

  const { data: printHistory = [] } = useQuery({
    queryKey: ['barcode-prints'],
    queryFn: () => barcodePrintsApi.list({ limit: 30 }),
  });

  // Primary barcode map per product
  const productBars = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p.barcode) map.set(p.id, p.barcode);
    }
    for (const b of barcodes) {
      if (b.type === 'primary' && !map.has(b.productId)) {
        map.set(b.productId, b.barcode);
      }
    }
    return map;
  }, [products, barcodes]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const c =
        typeof p.category === 'object' && p.category !== null
          ? (p.category as any).name
          : p.category;
      if (c && typeof c === 'string' && c.trim()) {
        set.add(c.trim());
      }
    }
    return Array.from(set);
  }, [products]);

  const baseCurrency = settings?.baseCurrency ?? 'دج';
  const shopName = settings?.shopName || 'متجر AN POS';

  return {
    products,
    settings,
    barcodes,
    printHistory,
    productBars,
    categories,
    baseCurrency,
    shopName,
    isLoadingProducts,
  };
}
