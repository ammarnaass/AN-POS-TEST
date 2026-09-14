import { useCallback } from 'react';
import type { CartItem } from '@/types';

export interface UseDesign6TouchNavigationProps {
  cart: CartItem[];
  selectedCartRowId: string | null;
  setSelectedCartRowId: (id: string | null) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onSettleSale: () => void;
}

export const useDesign6TouchNavigation = ({
  cart,
  selectedCartRowId,
  setSelectedCartRowId,
  onUpdateQty,
  onSettleSale,
}: UseDesign6TouchNavigationProps) => {
  const handleArrowUp = useCallback(() => {
    if (cart.length === 0) return;
    const currentIndex = cart.findIndex((item) => item.productId === selectedCartRowId);
    if (currentIndex > 0) {
      setSelectedCartRowId(cart[currentIndex - 1].productId);
    } else {
      setSelectedCartRowId(cart[cart.length - 1].productId);
    }
  }, [cart, selectedCartRowId, setSelectedCartRowId]);

  const handleArrowDown = useCallback(() => {
    if (cart.length === 0) return;
    const currentIndex = cart.findIndex((item) => item.productId === selectedCartRowId);
    if (currentIndex >= 0 && currentIndex < cart.length - 1) {
      setSelectedCartRowId(cart[currentIndex + 1].productId);
    } else {
      setSelectedCartRowId(cart[0].productId);
    }
  }, [cart, selectedCartRowId, setSelectedCartRowId]);

  const handleArrowLeft = useCallback(() => {
    // Decrease quantity
    if (!selectedCartRowId) {
      if (cart.length > 0) {
        setSelectedCartRowId(cart[0].productId);
      }
      return;
    }
    const item = cart.find((i) => i.productId === selectedCartRowId);
    if (item && item.qty > 1) {
      onUpdateQty(item.productId, item.qty - 1);
    }
  }, [cart, selectedCartRowId, setSelectedCartRowId, onUpdateQty]);

  const handleArrowRight = useCallback(() => {
    // Increase quantity
    if (!selectedCartRowId) {
      if (cart.length > 0) {
        setSelectedCartRowId(cart[0].productId);
      }
      return;
    }
    const item = cart.find((i) => i.productId === selectedCartRowId);
    if (item) {
      onUpdateQty(item.productId, item.qty + 1);
    }
  }, [cart, selectedCartRowId, setSelectedCartRowId, onUpdateQty]);

  const handleConfirm = useCallback(() => {
    if (cart.length > 0) {
      onSettleSale();
    }
  }, [cart, onSettleSale]);

  return {
    handleArrowUp,
    handleArrowDown,
    handleArrowLeft,
    handleArrowRight,
    handleConfirm,
  };
};
