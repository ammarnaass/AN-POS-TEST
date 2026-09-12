import { useState } from 'react';
import type { Sale } from '@/types';

export function usePOSModalsState() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadInput, setKeypadInput] = useState('');
  const [keypadTarget, setKeypadTarget] = useState<'qty' | 'price' | 'paid' | 'discount'>('paid');
  const [showReturnSaleModal, setShowReturnSaleModal] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showSaveAsProformaModal, setShowSaveAsProformaModal] = useState(false);
  const [showSaveAsOrderModal, setShowSaveAsOrderModal] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showFreeProductModal, setShowFreeProductModal] = useState(false);
  const [showSuspended, setShowSuspended] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  return {
    showPaymentModal,
    setShowPaymentModal,
    showSuccessModal,
    setShowSuccessModal,
    completedSale,
    setCompletedSale,
    showShortcutsModal,
    setShowShortcutsModal,
    showFiltersModal,
    setShowFiltersModal,
    showKeypad,
    setShowKeypad,
    keypadInput,
    setKeypadInput,
    keypadTarget,
    setKeypadTarget,
    showReturnSaleModal,
    setShowReturnSaleModal,
    showSessionWarning,
    setShowSessionWarning,
    showOpenSession,
    setShowOpenSession,
    showCustomizeModal,
    setShowCustomizeModal,
    showSaveAsProformaModal,
    setShowSaveAsProformaModal,
    showSaveAsOrderModal,
    setShowSaveAsOrderModal,
    showAddProduct,
    setShowAddProduct,
    showCustomerSelect,
    setShowCustomerSelect,
    showAddCustomer,
    setShowAddCustomer,
    showFreeProductModal,
    setShowFreeProductModal,
    showSuspended,
    setShowSuspended,
    showDiscountModal,
    setShowDiscountModal,
  };
}

export type POSModalsState = ReturnType<typeof usePOSModalsState>;
