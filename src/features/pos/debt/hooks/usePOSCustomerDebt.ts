import { useState, useMemo, useCallback } from 'react';
import type { Customer } from '@/types';
import { getCustomerDebtSummary } from '../services/posCustomerDebtService';
import { useCreditSaleValidation } from './useCreditSaleValidation';

export interface UsePOSCustomerDebtProps {
  customers: Customer[];
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  saleTotal?: number;
  paymentMethod?: string;
}

export function usePOSCustomerDebt({
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  saleTotal = 0,
  paymentMethod = 'cash',
}: UsePOSCustomerDebtProps) {
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false);
  const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
  const [showDebtSettlementModal, setShowDebtSettlementModal] = useState(false);
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);

  const selectedCustomerObj = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const debtSummary = useMemo(() => {
    return getCustomerDebtSummary(selectedCustomerObj);
  }, [selectedCustomerObj]);

  const isCreditSale = paymentMethod === 'credit';

  const creditValidation = useCreditSaleValidation({
    customer: selectedCustomerObj,
    saleTotal,
    isCreditSale,
    isOpen: true,
  });

  const selectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setShowCustomerSelectModal(false);
  }, [setSelectedCustomerId]);

  const clearCustomer = useCallback(() => {
    setSelectedCustomerId('');
  }, [setSelectedCustomerId]);

  const openCustomerSelect = useCallback(() => {
    setShowCustomerSelectModal(true);
  }, []);

  const closeCustomerSelect = useCallback(() => {
    setShowCustomerSelectModal(false);
  }, []);

  const openQuickCustomer = useCallback(() => {
    setShowQuickCustomerModal(true);
  }, []);

  const closeQuickCustomer = useCallback(() => {
    setShowQuickCustomerModal(false);
  }, []);

  const openDebtSettlement = useCallback(() => {
    if (selectedCustomerObj) {
      setShowDebtSettlementModal(true);
    }
  }, [selectedCustomerObj]);

  const closeDebtSettlement = useCallback(() => {
    setShowDebtSettlementModal(false);
  }, []);

  const openAddDebt = useCallback(() => {
    if (selectedCustomerObj) {
      setShowAddDebtModal(true);
    }
  }, [selectedCustomerObj]);

  const closeAddDebt = useCallback(() => {
    setShowAddDebtModal(false);
  }, []);

  return {
    selectedCustomerId,
    selectedCustomerObj,
    debtSummary,
    creditValidation,
    isCreditSale,
    // Modals
    showCustomerSelectModal,
    setShowCustomerSelectModal,
    showQuickCustomerModal,
    setShowQuickCustomerModal,
    showDebtSettlementModal,
    setShowDebtSettlementModal,
    showAddDebtModal,
    setShowAddDebtModal,
    // Actions
    selectCustomer,
    clearCustomer,
    openCustomerSelect,
    closeCustomerSelect,
    openQuickCustomer,
    closeQuickCustomer,
    openDebtSettlement,
    closeDebtSettlement,
    openAddDebt,
    closeAddDebt,
  };
}
