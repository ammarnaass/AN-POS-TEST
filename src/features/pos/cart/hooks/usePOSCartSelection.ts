import { useState, useCallback, useMemo } from 'react';
import type { CartItem } from '../types';

export interface UsePOSCartSelectionOptions {
  onRemoveItem?: (productId: string) => void;
}

export function usePOSCartSelection(
  cart: CartItem[],
  options?: UsePOSCartSelectionOptions
) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const selectedItem = useMemo(() => {
    if (!selectedRowId) return undefined;
    return cart.find((item) => String(item.productId) === String(selectedRowId));
  }, [cart, selectedRowId]);

  const selectNext = useCallback(() => {
    if (cart.length === 0) return;
    if (!selectedRowId) {
      setSelectedRowId(String(cart[0].productId));
      return;
    }
    const idx = cart.findIndex((it) => String(it.productId) === String(selectedRowId));
    if (idx >= 0 && idx < cart.length - 1) {
      setSelectedRowId(String(cart[idx + 1].productId));
    }
  }, [cart, selectedRowId]);

  const selectPrevious = useCallback(() => {
    if (cart.length === 0) return;
    if (!selectedRowId) {
      setSelectedRowId(String(cart[cart.length - 1].productId));
      return;
    }
    const idx = cart.findIndex((it) => String(it.productId) === String(selectedRowId));
    if (idx > 0) {
      setSelectedRowId(String(cart[idx - 1].productId));
    }
  }, [cart, selectedRowId]);

  const removeSelected = useCallback(() => {
    if (selectedRowId && options?.onRemoveItem) {
      options.onRemoveItem(selectedRowId);
      setSelectedRowId(null);
    }
  }, [selectedRowId, options]);

  return {
    selectedRowId,
    setSelectedRowId,
    selectedItem,
    selectNext,
    selectPrevious,
    removeSelected,
  };
}
