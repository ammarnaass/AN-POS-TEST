import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/infrastructure/database/dexie/db';
import type { Sale, CartItem } from '@/types';
import type { ReturnItemSelection, ReturnFinancialSummary } from '../types';
import {
  computeReturnableItems,
  clampReturnQty,
  calculateReturnSummary,
  prepareCartItemsFromReturn,
} from '../services/posReturnCalculationService';

export interface UseReturnItemSelectionProps {
  sale: Sale | null;
  isOpen: boolean;
  alreadyReturnedMap: Map<string, number>;
}

export function useReturnItemSelection({
  sale,
  isOpen,
  alreadyReturnedMap,
}: UseReturnItemSelectionProps) {
  const [items, setItems] = useState<ReturnItemSelection[]>([]);

  // تهيئة الأصناف عند فتح النافذة أو تغير الفاتورة مع ضمان جلب البنود كاملة بأعدادها الأصلية
  useEffect(() => {
    if (!isOpen || !sale) {
      setItems((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    let isCancelled = false;

    const initializeItems = async () => {
      let activeSale = sale;

      // احتياط: إذا كانت مصفوفة البنود غير محملة في كائن الفاتورة، نجلبها مباشرة من جدول sale_items
      if (!Array.isArray(sale.items) || sale.items.length === 0) {
        try {
          const dbItems = await db.sale_items.where('saleId').equals(sale.id).toArray();
          if (dbItems && dbItems.length > 0) {
            activeSale = { ...sale, items: dbItems as any };
          }
        } catch {
          // استمرار بالبيانات المتاحة
        }
      }

      if (!isCancelled) {
        // افتراضياً: يتم تعيين الكمية لكامل العدد الحقيقي المتبقي القابل للإرجاع
        const initial = computeReturnableItems(activeSale, alreadyReturnedMap, true);
        setItems(initial);
      }
    };

    initializeItems();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, sale?.id, alreadyReturnedMap]);

  const toggleSelectAll = useCallback(() => {
    setItems((prev) => {
      const returnable = prev.filter((i) => i.maxReturnableQty > 0);
      const allSelected = returnable.length > 0 && returnable.every((i) => i.isSelected);
      return prev.map((i) =>
        i.maxReturnableQty > 0
          ? {
              ...i,
              isSelected: !allSelected,
              // عند التحديد، ضمان تعيين الكمية لكامل العدد الحقيقي المتبقي
              selectedQty: !allSelected ? (i.selectedQty > 0 ? i.selectedQty : i.maxReturnableQty) : 0,
            }
          : i
      );
    });
  }, []);

  const toggleItem = useCallback((productId: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId || i.maxReturnableQty <= 0) return i;
        const nextSelected = !i.isSelected;
        return {
          ...i,
          isSelected: nextSelected,
          selectedQty: nextSelected ? (i.selectedQty > 0 ? i.selectedQty : i.maxReturnableQty) : 0,
        };
      })
    );
  }, []);

  const updateQty = useCallback((productId: string, newQty: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const clamped = clampReturnQty(newQty, i.maxReturnableQty);
        return { ...i, selectedQty: clamped, isSelected: clamped > 0 };
      })
    );
  }, []);

  // زر مساعد: تعيين كافة الأصناف المتاحة للعدد الحقيقي الكامل المباع
  const setAllToFullQty = useCallback(() => {
    setItems((prev) =>
      prev.map((i) =>
        i.maxReturnableQty > 0
          ? { ...i, selectedQty: i.maxReturnableQty, isSelected: true }
          : i
      )
    );
  }, []);

  // زر مساعد: تعيين كافة الأصناف لقطعة واحدة (للإرجاع الجزئي السريع)
  const setAllToOneQty = useCallback(() => {
    setItems((prev) =>
      prev.map((i) =>
        i.maxReturnableQty > 0
          ? { ...i, selectedQty: 1, isSelected: true }
          : i
      )
    );
  }, []);

  const selectedItems = useMemo(
    () => items.filter((i) => i.isSelected && i.selectedQty > 0),
    [items]
  );

  const summary: ReturnFinancialSummary = useMemo(
    () => calculateReturnSummary(items),
    [items]
  );

  const prepareCartItems = useCallback((): CartItem[] => {
    return prepareCartItemsFromReturn(selectedItems);
  }, [selectedItems]);

  return {
    items,
    setItems,
    selectedItems,
    summary,
    toggleSelectAll,
    toggleItem,
    updateQty,
    setAllToFullQty,
    setAllToOneQty,
    prepareCartItems,
  };
}
