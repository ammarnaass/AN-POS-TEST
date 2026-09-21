import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CartItem } from '@/types';
import { getCartRowKey } from '../utils/cartRow';

export interface UseDesign7CartSelectionProps {
  cart: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
}

export function useDesign7CartSelection({
  cart,
  onUpdateQty,
  onRemoveFromCart,
}: UseDesign7CartSelectionProps) {
  // Selected cart row state (tracks unique rowKey to prevent multi-selection)
  const [selectedCartRowId, setSelectedCartRowId] = useState<string | null>(() => {
    return cart.length > 0 ? getCartRowKey(cart[cart.length - 1], cart.length - 1) : null;
  });

  // Keep selection synchronized with cart changes
  useEffect(() => {
    if (cart.length === 0) {
      setSelectedCartRowId(null);
    } else {
      const isCurrentSelectedValid = cart.some(
        (i, idx) =>
          getCartRowKey(i, idx) === selectedCartRowId ||
          (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
      );
      if (!selectedCartRowId || !isCurrentSelectedValid) {
        setSelectedCartRowId(getCartRowKey(cart[cart.length - 1], cart.length - 1));
      }
    }
  }, [cart, selectedCartRowId]);

  // Active item in the scan notification strip and edit modals
  const activeItem = useMemo(() => {
    if (selectedCartRowId && cart.length > 0) {
      const foundByRowKey = cart.find((i, idx) => getCartRowKey(i, idx) === selectedCartRowId);
      if (foundByRowKey) return foundByRowKey;
      const foundById = cart.find((i) => i.productId === selectedCartRowId || (i as any).id === selectedCartRowId);
      if (foundById) return foundById;
    }
    return cart.length > 0 ? cart[cart.length - 1] : null;
  }, [cart, selectedCartRowId]);

  // Navigation handlers for keypad
  const handleArrowUp = useCallback(() => {
    if (cart.length === 0) return;
    const currentIdx = cart.findIndex(
      (i, idx) =>
        getCartRowKey(i, idx) === selectedCartRowId ||
        (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
    );
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : cart.length - 1;
    setSelectedCartRowId(getCartRowKey(cart[prevIdx], prevIdx));
  }, [cart, selectedCartRowId]);

  const handleArrowDown = useCallback(() => {
    if (cart.length === 0) return;
    const currentIdx = cart.findIndex(
      (i, idx) =>
        getCartRowKey(i, idx) === selectedCartRowId ||
        (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
    );
    const nextIdx = currentIdx >= 0 && currentIdx < cart.length - 1 ? currentIdx + 1 : 0;
    setSelectedCartRowId(getCartRowKey(cart[nextIdx], nextIdx));
  }, [cart, selectedCartRowId]);

  const handleArrowRight = useCallback(() => {
    if (!activeItem) return;
    const targetId = activeItem.productId || (activeItem as any).id;
    if (targetId) {
      const currentQty = activeItem.qty ?? (activeItem as any).quantity ?? 1;
      onUpdateQty(targetId, currentQty + 1);
    }
  }, [activeItem, onUpdateQty]);

  const handleArrowLeft = useCallback(() => {
    if (!activeItem) return;
    const targetId = activeItem.productId || (activeItem as any).id;
    if (targetId) {
      const currentQty = activeItem.qty ?? (activeItem as any).quantity ?? 1;
      if (currentQty > 1) {
        onUpdateQty(targetId, currentQty - 1);
      } else {
        onRemoveFromCart(targetId);
      }
    }
  }, [activeItem, onUpdateQty, onRemoveFromCart]);

  const handleDeleteSelectedRow = useCallback(() => {
    if (activeItem) {
      const targetId = activeItem.productId || (activeItem as any).id;
      if (targetId) {
        onRemoveFromCart(targetId);
      }
    }
  }, [activeItem, onRemoveFromCart]);

  return {
    selectedCartRowId,
    setSelectedCartRowId,
    activeItem,
    handleArrowUp,
    handleArrowDown,
    handleArrowRight,
    handleArrowLeft,
    handleDeleteSelectedRow,
  };
}
