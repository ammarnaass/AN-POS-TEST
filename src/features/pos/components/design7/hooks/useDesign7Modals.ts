import { useState, useCallback } from 'react';
import type { ItemEditMode, ItemEditState } from '../types';

export interface UseDesign7ModalsProps {
  isAnyGlobalModalOpen?: boolean;
  onCloseAllModals?: () => void;
  barcodeInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function useDesign7Modals({
  isAnyGlobalModalOpen = false,
  onCloseAllModals,
  barcodeInputRef,
}: UseDesign7ModalsProps = {}) {
  // Modal states for Product Search and Item Editing (Touch Numpad / Calculator)
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [itemEditState, setItemEditState] = useState<ItemEditState>({
    isOpen: false,
    mode: 'qty',
  });
  const [isVirtualKeyboardOpen, setIsVirtualKeyboardOpen] = useState(false);

  const refocusBarcode = useCallback((delay = 40) => {
    setTimeout(() => {
      barcodeInputRef?.current?.focus();
    }, delay);
  }, [barcodeInputRef]);

  // Combined modal state (local design7 modals + global POSPage modals) for Esc handling
  const isAnyModalOpen =
    isProductSearchOpen || itemEditState.isOpen || isVirtualKeyboardOpen || isAnyGlobalModalOpen;

  const handleCloseModals = useCallback(() => {
    setIsProductSearchOpen(false);
    setItemEditState((prev) => ({ ...prev, isOpen: false }));
    setIsVirtualKeyboardOpen(false);
    onCloseAllModals?.();
    refocusBarcode(40);
  }, [onCloseAllModals, refocusBarcode]);

  const openProductSearch = useCallback(() => {
    setIsProductSearchOpen(true);
  }, []);

  const closeProductSearch = useCallback(() => {
    setIsProductSearchOpen(false);
    refocusBarcode(40);
  }, [refocusBarcode]);

  const openItemEdit = useCallback((mode: ItemEditMode = 'qty') => {
    setItemEditState({ isOpen: true, mode });
  }, []);

  const closeItemEdit = useCallback(() => {
    setItemEditState((prev) => ({ ...prev, isOpen: false }));
    refocusBarcode(40);
  }, [refocusBarcode]);

  const openVirtualKeyboard = useCallback(() => {
    setIsVirtualKeyboardOpen(true);
  }, []);

  const closeVirtualKeyboard = useCallback(() => {
    setIsVirtualKeyboardOpen(false);
    refocusBarcode(40);
  }, [refocusBarcode]);

  return {
    isProductSearchOpen,
    setIsProductSearchOpen,
    openProductSearch,
    closeProductSearch,
    itemEditState,
    setItemEditState,
    openItemEdit,
    closeItemEdit,
    isVirtualKeyboardOpen,
    setIsVirtualKeyboardOpen,
    openVirtualKeyboard,
    closeVirtualKeyboard,
    isAnyModalOpen,
    handleCloseModals,
    refocusBarcode,
  };
}
