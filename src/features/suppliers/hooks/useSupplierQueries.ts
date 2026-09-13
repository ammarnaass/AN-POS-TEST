import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { SupplierEntry } from '@/types';
import type { EnrichedPurchase } from '../types';

export function useSupplierQueries() {
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.toArray(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });

  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => db.purchases.toArray(),
  });

  const { data: purchaseItems = [] } = useQuery({
    queryKey: ['purchaseItems'],
    queryFn: () => db.purchase_items.toArray(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => db.categories.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  // Build supplier entries
  const supplierEntries: SupplierEntry[] = useMemo(() => {
    return purchases.map((p) => ({
      id: p.id,
      supplierId: p.supplierId,
      date: p.date,
      type: 'purchase' as const,
      amount: p.total,
      items: purchaseItems
        .filter((pi) => pi.purchaseId === p.id)
        .map((pi) => ({
          productId: pi.productId,
          name: pi.name,
          qty: pi.qty,
          unitPrice: pi.unitPrice,
          lineTotal: pi.lineTotal,
        })),
      invoiceNumber: p.number,
      paidAmount: (p as any).paidAmount ?? 0,
      remainingBalance: (p as any).remainingBalance ?? p.total,
    }));
  }, [purchases, purchaseItems]);

  // Enriched purchases list for invoices tab
  const enrichedPurchases: EnrichedPurchase[] = useMemo(() => {
    return purchases.map((p) => {
      const s = suppliers.find((sup) => sup.id === p.supplierId);
      const items = purchaseItems.filter((pi) => pi.purchaseId === p.id);
      return {
        ...p,
        supplierName: s?.name || 'مورد غير معروف',
        itemsCount: items.length,
      };
    });
  }, [purchases, suppliers, purchaseItems]);

  return {
    suppliers,
    products,
    purchases,
    purchaseItems,
    categories,
    settings,
    supplierEntries,
    enrichedPurchases,
    isLoading: isLoadingSuppliers || isLoadingPurchases,
    isLoadingSuppliers,
    isLoadingPurchases,
  };
}
