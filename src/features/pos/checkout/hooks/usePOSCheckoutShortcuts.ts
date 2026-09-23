import { useEffect } from 'react';
import type { PaymentMethod } from '../types';
import type { Sale } from '@/types';
import { printSaleReceipt } from '../services/posSalePrintingService';

export interface UsePaymentModalShortcutsParams {
  isOpen: boolean;
  total: number;
  paymentMethod: PaymentMethod;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onSetPaidAmount: (amount: number) => void;
  onConfirm: () => void;
  onClose: () => void;
  allowCardPayment?: boolean;
  allowTransferPayment?: boolean;
}

/**
 * خطاف اختصارات لوحة المفاتيح لنافذة إتمام الدفع (PaymentModal)
 */
export function usePaymentModalShortcuts({
  isOpen,
  total,
  paymentMethod,
  onSelectPaymentMethod,
  onSetPaidAmount,
  onConfirm,
  onClose,
  allowCardPayment = false,
  allowTransferPayment = false,
}: UsePaymentModalShortcutsParams) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Confirm payment on Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onConfirm();
        return;
      }

      // 2. Cancel and close on Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 3. Payment methods shortcuts: F1..F4 or Alt+1..Alt+4
      if (e.key === 'F1' || (e.altKey && e.key === '1')) {
        e.preventDefault();
        e.stopPropagation();
        onSelectPaymentMethod('cash');
        return;
      }
      if ((e.key === 'F2' || (e.altKey && e.key === '2')) && allowCardPayment) {
        e.preventDefault();
        e.stopPropagation();
        onSelectPaymentMethod('card');
        return;
      }
      if ((e.key === 'F3' || (e.altKey && e.key === '3')) && allowTransferPayment) {
        e.preventDefault();
        e.stopPropagation();
        onSelectPaymentMethod('transfer');
        return;
      }
      if (e.key === 'F4' || (e.altKey && e.key === '4')) {
        e.preventDefault();
        e.stopPropagation();
        onSelectPaymentMethod('credit');
        return;
      }

      // 4. Quick cash presets shortcuts: F5..F8 (or Alt+E for exact)
      if (paymentMethod === 'cash') {
        if (e.key === 'F5' || (e.altKey && (e.key === 'e' || e.key === 'E'))) {
          e.preventDefault();
          e.stopPropagation();
          onSetPaidAmount(total);
          return;
        }
        if (e.key === 'F6') {
          e.preventDefault();
          e.stopPropagation();
          onSetPaidAmount(total + 500);
          return;
        }
        if (e.key === 'F7') {
          e.preventDefault();
          e.stopPropagation();
          onSetPaidAmount(total + 1000);
          return;
        }
        if (e.key === 'F8') {
          e.preventDefault();
          e.stopPropagation();
          onSetPaidAmount(total + 2000);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    isOpen,
    total,
    paymentMethod,
    onSelectPaymentMethod,
    onSetPaidAmount,
    onConfirm,
    onClose,
    allowCardPayment,
    allowTransferPayment,
  ]);
}

export interface UseSuccessModalShortcutsParams {
  isOpen: boolean;
  completedSale: Sale | null;
  onClose: () => void;
  currentUser?: { id?: string; name?: string } | null;
}

/**
 * خطاف اختصارات لوحة المفاتيح لنافذة نجاح البيع والطباعة (SuccessModal)
 */
export function useSuccessModalShortcuts({
  isOpen,
  completedSale,
  onClose,
  currentUser,
}: UseSuccessModalShortcutsParams) {
  useEffect(() => {
    if (!isOpen || !completedSale) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Enter or Escape: Close modal and start new sale
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // 2. 'P' or 'p' or F1: Primary print (wholesale-invoice for wholesale, thermal-receipt otherwise)
      if (e.key === 'p' || e.key === 'P' || e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        const primaryDoc =
          completedSale.docType === 'wholesale' ? 'wholesale-invoice' : 'thermal-receipt';
        printSaleReceipt(completedSale.id, primaryDoc, currentUser);
        return;
      }

      // 3. F2: Secondary print (thermal-receipt for wholesale, sale-invoice otherwise)
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        const secondaryDoc =
          completedSale.docType === 'wholesale' ? 'thermal-receipt' : 'sale-invoice';
        printSaleReceipt(completedSale.id, secondaryDoc, currentUser);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, completedSale, onClose, currentUser]);
}
