import { useState, useCallback } from 'react';
import type { CartItem, Product, Customer, Sale, DocType, CashSession } from '@/types';
import type { PaymentMethod, SaleSettings } from '../types';
import { useSaleCompletion } from './useSaleCompletion';

export interface UsePOSCheckoutFlowProps {
  cart: CartItem[];
  total: number;
  discount: number;
  discountType: 'percent' | 'amount';
  selectedCustomer: string;
  setSelectedCustomer: (val: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (val: PaymentMethod) => void;
  paidAmount: number;
  setPaidAmount: (val: number) => void;
  setDiscount: (val: number) => void;
  returnMode: boolean;
  setReturnMode: (val: boolean) => void;
  priceTier: '1' | '2' | '3' | '4';
  isWholesaleActive: boolean;
  currentSession: CashSession | null;
  isSessionOpen: boolean;
  settings: SaleSettings;
  products: Product[];
  packs: any[];
  customers: Customer[];
  onOpenSessionWarning: () => void;
}

export function usePOSCheckoutFlow({
  cart,
  total,
  discount,
  discountType,
  selectedCustomer,
  setSelectedCustomer,
  paymentMethod,
  setPaymentMethod,
  paidAmount,
  setPaidAmount,
  setDiscount,
  returnMode,
  setReturnMode,
  priceTier,
  isWholesaleActive,
  currentSession,
  isSessionOpen,
  settings,
  products,
  packs,
  customers,
  onOpenSessionWarning,
}: UsePOSCheckoutFlowProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const { completeSale, isPending: isSalePending } = useSaleCompletion(
    settings,
    (sale: Sale) => {
      setCompletedSale(sale);
      setShowPaymentModal(false);
      setShowSuccessModal(true);
      setReturnMode(false);
      setSelectedCustomer('');
      setDiscount(0);
      setPaidAmount(0);
    }
  );

  const handleOpenPayment = useCallback(
    (customPaid?: number) => {
      if (cart.length === 0) return;
      if (!isSessionOpen) {
        onOpenSessionWarning();
        return;
      }
      const finalPaid =
        typeof customPaid === 'number' && customPaid > 0 ? customPaid : total;
      setPaidAmount(finalPaid);
      setShowPaymentModal(true);
    },
    [cart.length, isSessionOpen, onOpenSessionWarning, total, setPaidAmount]
  );

  const handleClosePayment = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

  const handleCloseSuccess = useCallback(() => {
    setShowSuccessModal(false);
  }, []);

  const handleExecutePayment = useCallback(
    async (overrides?: {
      paidAmount?: number;
      selectedCustomer?: string;
      paymentMethod?: PaymentMethod | string;
    }) => {
      if (cart.length === 0) return;
      if (!isSessionOpen) {
        onOpenSessionWarning();
        return;
      }

      const activeMethod = (overrides?.paymentMethod ?? paymentMethod) as PaymentMethod;
      const activeCustomer = overrides?.selectedCustomer ?? selectedCustomer;
      const isCredit = activeMethod === 'credit';
      const dbPaymentMethod = isCredit ? 'credit' : 'cash';

      const activePaid =
        overrides?.paidAmount !== undefined
          ? overrides.paidAmount
          : isCredit
          ? 0
          : paidAmount;

      const isWholesaleTier =
        priceTier === '3' || (!['1', '2', '4'].includes(priceTier) && isWholesaleActive);
      const saleDocType: DocType = isWholesaleTier ? 'wholesale' : 'facture';

      completeSale({
        cart,
        discount,
        discountType,
        selectedCustomer: activeCustomer,
        paymentMethod: dbPaymentMethod,
        paidAmount: activePaid,
        isReturn: returnMode,
        currentSession,
        settings,
        products: products as any[],
        packs: packs as any[],
        customers: customers as any[],
        docType: saleDocType,
        priceTier,
      });
    },
    [
      cart,
      isSessionOpen,
      onOpenSessionWarning,
      paymentMethod,
      selectedCustomer,
      paidAmount,
      priceTier,
      isWholesaleActive,
      completeSale,
      discount,
      discountType,
      returnMode,
      currentSession,
      settings,
      products,
      packs,
      customers,
    ]
  );

  return {
    showPaymentModal,
    setShowPaymentModal,
    showSuccessModal,
    setShowSuccessModal,
    completedSale,
    setCompletedSale,
    isSalePending,
    handleOpenPayment,
    handleClosePayment,
    handleCloseSuccess,
    handleExecutePayment,
  };
}
