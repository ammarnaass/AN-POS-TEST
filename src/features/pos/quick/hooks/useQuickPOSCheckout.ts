import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CartItem, Product, Customer, Sale } from '@/types';
import type { QuickPOSSettings } from '../types';
import { useSaleCompletion } from '@/features/pos/hooks/useSaleCompletion';
import { printDocument } from '@/services/print/printService';
import { formatMoney } from '../../utils/format';

interface UseQuickPOSCheckoutParams {
  cart: CartItem[];
  clearCart: () => void;
  discount: number;
  setDiscount: (d: number) => void;
  discountType: 'percent' | 'fixed';
  selectedCustomer: string;
  setSelectedCustomer: (c: string) => void;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  autoPrintReceipt: boolean;
  settingsOrDefault: QuickPOSSettings;
  currentSession: any;
  isSessionOpen: boolean;
  products: Product[];
  packs: any[];
  customers: Customer[];
  currentUser: any;
  setCashTendered: (val: number) => void;
  onOpenSessionWarning: () => void;
  addNotification: (notification: any) => void;
}

export function useQuickPOSCheckout({
  cart,
  clearCart,
  discount,
  setDiscount,
  discountType,
  selectedCustomer,
  setSelectedCustomer,
  paymentMethod,
  autoPrintReceipt,
  settingsOrDefault,
  currentSession,
  isSessionOpen,
  products,
  packs,
  customers,
  currentUser,
  setCashTendered,
  onOpenSessionWarning,
  addNotification,
}: UseQuickPOSCheckoutParams) {
  const queryClient = useQueryClient();
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Hook إتمام البيع الذري (ACID)
  const { completeSale, isPending: isSalePending } = useSaleCompletion(
    settingsOrDefault,
    (sale) => {
      setCompletedSale(sale);
      setShowSuccessModal(true);
      clearCart();
      setDiscount(0);
      setCashTendered(0);
      setSelectedCustomer('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });

      // طباعة الإيصال الحراري التلقائي
      if (autoPrintReceipt) {
        printDocument(sale.id, 'thermal-receipt', {
          userId: currentUser?.id || '',
          userName: currentUser?.name || '',
          copies: 1,
        });
      }

      // ملاحظة: الإشعار يُرسل مركزياً من useSaleCompletion — لا حاجة لإعادة إرساله هنا
    }
  );

  // تشغيل الدفع الفوري (F1)
  const handleQuickPay = useCallback(() => {
    if (cart.length === 0 || isSalePending) return;

    if (!isSessionOpen) {
      onOpenSessionWarning();
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomer) {
      addNotification({
        title: 'تنبيه العميل',
        message: 'يجب اختيار زبون مسجل لعملية البيع بالآجل (الديون).',
        type: 'warning',
      });
      return;
    }

    completeSale({
      cart,
      discount,
      discountType,
      selectedCustomer,
      paymentMethod: paymentMethod === 'credit' ? 'credit' : 'cash',
      isReturn: false,
      currentSession,
      settings: settingsOrDefault,
      products: products as any[],
      packs: packs as any[],
      customers: customers as any[],
    });
  }, [
    cart,
    isSalePending,
    isSessionOpen,
    paymentMethod,
    selectedCustomer,
    completeSale,
    discount,
    discountType,
    currentSession,
    settingsOrDefault,
    products,
    packs,
    customers,
    onOpenSessionWarning,
    addNotification,
  ]);

  return {
    handleQuickPay,
    isSalePending,
    completedSale,
    showSuccessModal,
    setShowSuccessModal,
  };
}
