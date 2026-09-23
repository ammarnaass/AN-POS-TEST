import { useState, useCallback } from 'react';
import type { Sale } from '@/types';

export function usePOSReturnModals() {
  const [showReturnSaleModal, setShowReturnSaleModal] = useState(false);
  const [showPartialReturnModal, setShowPartialReturnModal] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);

  const openReturnFlow = useCallback(() => {
    setShowReturnSaleModal(true);
  }, []);

  const closeAllReturnModals = useCallback(() => {
    setShowReturnSaleModal(false);
    setShowPartialReturnModal(false);
    setSelectedSaleForReturn(null);
  }, []);

  return {
    showReturnSaleModal,
    setShowReturnSaleModal,
    showPartialReturnModal,
    setShowPartialReturnModal,
    selectedSaleForReturn,
    setSelectedSaleForReturn,
    openReturnFlow,
    closeAllReturnModals,
  };
}
