import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import { syncProductUpdate } from '@/lib/products-sync';
import type { Supplier, SaleItem } from '@/types';
import type { SupplierPaymentVoucherData } from '../types';

interface UseSupplierMutationsOptions {
  invoicePrefix?: string;
  onPaymentSuccess?: (voucherData: SupplierPaymentVoucherData) => void;
  onDeleteSuccess?: () => void;
}

export function useSupplierMutations(options: UseSupplierMutationsOptions = {}) {
  const queryClient = useQueryClient();
  const invoicePrefix = options.invoicePrefix || 'INV';

  const addSupplierMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; balance: number }) =>
      db.suppliers.add({
        id: generateId(),
        name: data.name.trim(),
        phone: data.phone.trim(),
        balance: Number(data.balance) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: (supplier: Supplier) =>
      db.suppliers.update(supplier.id, {
        name: supplier.name.trim(),
        phone: supplier.phone.trim(),
        balance: Number(supplier.balance) || 0,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.suppliers.delete(id);
      const relatedPurchases = await db.purchases.where({ supplierId: id }).toArray();
      for (const p of relatedPurchases) {
        await db.purchase_items.where({ purchaseId: p.id }).delete();
      }
      await db.purchases.where({ supplierId: id }).delete();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseItems'] });
      options.onDeleteSuccess?.();
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({
      supplierId,
      items,
      paidAmount: paid,
      total,
    }: {
      supplierId: string;
      items: SaleItem[];
      paidAmount: number;
      total: number;
    }) => {
      const allPurchases = await db.purchases.toArray();
      const maxNum = allPurchases.reduce((max, p) => {
        const num = parseInt(p.number.slice(-6));
        return num > max ? num : max;
      }, 0);
      const invoiceNumber = `${invoicePrefix}-PSH-${String(maxNum + 1).padStart(6, '0')}`;
      const purchaseId = generateId();
      const now = new Date().toISOString();

      await db.purchases.add({
        id: purchaseId,
        number: invoiceNumber,
        date: now,
        supplierId,
        subtotal: total,
        tvaAmount: 0,
        total,
        status: 'confirmed',
        createdAt: now,
        updatedAt: now,
        paidAmount: paid,
        remainingBalance: total - paid,
      } as any);

      for (const item of items) {
        await db.purchase_items.add({
          id: generateId(),
          purchaseId,
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        });

        const product = await db.products.get(item.productId);
        if (product) {
          const changes = {
            quantity: product.quantity + item.qty,
            costPrice: item.unitPrice,
            updatedAt: now,
          };
          await db.products.update(item.productId, changes);
          // Write-Through → SQLite (for mobile sync)
          await syncProductUpdate(item.productId, changes);
        }

        await db.stock_movements.add({
          id: generateId(),
          productId: item.productId,
          type: 'purchase',
          qty: item.qty,
          createdBy: 'system',
          createdAt: now,
        });
      }

      const supplier = await db.suppliers.get(supplierId);
      if (supplier) {
        await db.suppliers.update(supplierId, {
          balance: supplier.balance + (total - paid),
          updatedAt: now,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseItems'] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({
      supplierId,
      amount,
      method,
      note,
      supplierName,
      supplierPhone,
    }: {
      supplierId: string;
      amount: number;
      method: string;
      note?: string;
      supplierName: string;
      supplierPhone?: string;
    }) => {
      const supplier = await db.suppliers.get(supplierId);
      if (!supplier) return null;
      const prevBal = supplier.balance;
      const newBal = Math.max(0, supplier.balance - amount);
      const now = new Date().toISOString();

      await db.suppliers.update(supplierId, {
        balance: newBal,
        updatedAt: now,
      });

      return {
        supplierName,
        supplierPhone,
        amount,
        date: now,
        method,
        note,
        previousBalance: prevBal,
        newBalance: newBal,
      };
    },
    onSuccess: (voucherData) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      if (voucherData) {
        options.onPaymentSuccess?.(voucherData);
      }
    },
  });

  return {
    addSupplierMutation,
    updateSupplierMutation,
    deleteSupplierMutation,
    purchaseMutation,
    paymentMutation,
  };
}
