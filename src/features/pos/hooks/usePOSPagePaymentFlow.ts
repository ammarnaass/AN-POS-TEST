import { useCallback } from 'react';
import type { CartItem, Product, Customer, Sale, DocType, CashSession } from '@/types';
import { useSaleCompletion } from './useSaleCompletion';
import { v4 as createId } from 'uuid';
import { db } from '@/infrastructure/database/dexie/db';

export interface UsePOSPagePaymentFlowProps {
  cart: CartItem[];
  discount: number;
  setDiscount: (val: number) => void;
  discountType: 'percent' | 'amount';
  setDiscountType?: (val: 'percent' | 'amount') => void;
  selectedCustomer: string;
  setSelectedCustomer: (val: string) => void;
  paymentMethod: string;
  setPaymentMethod?: (val: any) => void;
  paidAmount: number;
  setPaidAmount: (val: number) => void;
  returnMode: boolean;
  setReturnMode: (val: boolean) => void;
  selectedItemId: string | null;
  priceTier: '1' | '2' | '3' | '4';
  isWholesaleActive: boolean;
  currentSession: CashSession | null;
  isSessionOpen: boolean;
  settingsOrDefault: any;
  products: Product[];
  packs: any[];
  customers: Customer[];
  currentUser?: { name?: string } | null;
  suspendedOrders: any[];
  refetchSuspended?: () => void;
  clearCart: () => void;
  addItem: (item: CartItem) => void;
  handleUpdateQty: (item: CartItem, qty: number) => void;
  modals: any;
  addNotification: (n: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }) => void;
}

export function usePOSPagePaymentFlow({
  cart,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  selectedCustomer,
  setSelectedCustomer,
  paymentMethod,
  setPaidAmount,
  returnMode,
  setReturnMode,
  selectedItemId,
  priceTier,
  isWholesaleActive,
  currentSession,
  isSessionOpen,
  settingsOrDefault,
  products,
  packs,
  customers,
  currentUser,
  suspendedOrders,
  refetchSuspended,
  clearCart,
  addItem,
  handleUpdateQty,
  modals,
  addNotification,
}: UsePOSPagePaymentFlowProps) {
  // Sale Completion Hook
  const { completeSale, isPending: isSalePending } = useSaleCompletion(
    settingsOrDefault,
    (sale: Sale) => {
      modals.setCompletedSale(sale);
      modals.setShowPaymentModal(false);
      modals.setShowSuccessModal(true);
      setReturnMode(false);
      setSelectedCustomer('');
      setDiscount(0);
      setPaidAmount(0);
    }
  );

  const handleExecutePayment = useCallback(async () => {
    if (cart.length === 0) return;
    if (!isSessionOpen) {
      modals.setShowSessionWarning(true);
      return;
    }

    const dbPaymentMethod = paymentMethod === 'credit' ? 'credit' : 'cash';
    const isWholesaleTier = priceTier === '3' || (!['1', '2', '4'].includes(priceTier) && isWholesaleActive);
    const saleDocType: DocType = isWholesaleTier ? 'wholesale' : 'facture';

    await completeSale({
      cart,
      discount,
      discountType,
      selectedCustomer,
      paymentMethod: dbPaymentMethod,
      isReturn: returnMode,
      currentSession,
      settings: settingsOrDefault,
      products: products as any[],
      packs: packs as any[],
      customers: customers as any[],
      docType: saleDocType,
      priceTier,
    });
  }, [
    cart,
    isSessionOpen,
    paymentMethod,
    priceTier,
    isWholesaleActive,
    completeSale,
    discount,
    discountType,
    selectedCustomer,
    returnMode,
    currentSession,
    settingsOrDefault,
    products,
    packs,
    customers,
    modals,
  ]);

  const handleKeypadPress = useCallback((val: string) => {
    if (val === 'clear') {
      modals.setKeypadInput('');
      if (modals.keypadTarget === 'paid') setPaidAmount(0);
      return;
    }
    if (val === 'backspace') {
      const next = modals.keypadInput.slice(0, -1);
      modals.setKeypadInput(next);
      if (modals.keypadTarget === 'paid') setPaidAmount(Number(next) || 0);
      return;
    }
    const next = modals.keypadInput + val;
    modals.setKeypadInput(next);
    const num = Number(next);
    if (modals.keypadTarget === 'paid') {
      setPaidAmount(num || 0);
    } else if (modals.keypadTarget === 'qty') {
      const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
      if (targetId) {
        const it = cart.find((c) => c.productId === targetId);
        if (it && num > 0) handleUpdateQty(it, num);
      }
    } else if (modals.keypadTarget === 'discount') {
      setDiscount(num || 0);
    }
  }, [modals, setPaidAmount, selectedItemId, cart, handleUpdateQty, setDiscount]);

  const handleSuspend = useCallback(() => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((acc, it) => acc + (it.lineTotal || it.unitPrice * it.qty || 0), 0);
    const discountAmount = discountType === 'percent' ? (subtotal * (discount || 0)) / 100 : discount || 0;
    const total = Math.max(0, subtotal - discountAmount);
    const custObj = customers.find((c) => c.id === selectedCustomer);

    const newOrder = {
      id: createId(),
      items: cart.map((it) => ({
        productId: it.productId,
        name: it.name,
        qty: Number(it.qty || 1),
        unitPrice: Number(it.unitPrice || 0),
        lineTotal: Number(it.lineTotal || Number(it.qty || 1) * Number(it.unitPrice || 0)),
        barcode: it.barcode || '',
        unit: it.unit,
        isCustom: it.isCustom,
        isPack: it.isPack,
        packId: it.packId,
        batchNumber: it.batchNumber,
      })),
      total,
      subtotal,
      customerId: selectedCustomer || '',
      customerName: custObj?.name || '',
      discount: discount || 0,
      discountType: discountType || 'percent',
      createdAt: new Date().toISOString(),
      note: '',
      createdBy: currentUser?.name || '',
    };

    db.suspended_orders.add(newOrder).then(() => {
      refetchSuspended?.();
      setSelectedCustomer('');
      setDiscount(0);
      clearCart();
      addNotification({
        title: 'تم تعليق الفاتورة',
        message: `تم حفظ ${cart.length} أصناف بقيمة ${total.toLocaleString('ar-DZ')} د.ج في الفواتير المعلقة`,
        type: 'info',
      });
    });
  }, [
    cart,
    discountType,
    discount,
    customers,
    selectedCustomer,
    currentUser?.name,
    refetchSuspended,
    setSelectedCustomer,
    setDiscount,
    clearCart,
    addNotification,
  ]);

  const handleResumeOrder = useCallback((orderOrId: any) => {
    const order = typeof orderOrId === 'string'
      ? suspendedOrders.find((o: any) => o.id === orderOrId)
      : orderOrId;

    if (!order) {
      console.warn('[usePOSPagePaymentFlow] Order not found for resume:', orderOrId);
      return;
    }

    clearCart();
    const rawItems = order.items;
    const items = Array.isArray(rawItems)
      ? rawItems
      : typeof rawItems === 'string'
      ? (() => {
          try {
            return JSON.parse(rawItems);
          } catch {
            return [];
          }
        })()
      : [];

    for (const item of items) {
      addItem({
        productId: item.productId,
        name: item.name,
        qty: Number(item.qty || 1),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.lineTotal || Number(item.qty || 1) * Number(item.unitPrice || 0)),
        barcode: item.barcode || '',
        unit: item.unit,
        isCustom: item.isCustom,
        isPack: item.isPack,
        packId: item.packId,
        batchNumber: item.batchNumber,
      });
    }
    setSelectedCustomer(order.customerId || '');
    setDiscount(order.discount || 0);
    if (setDiscountType) {
      setDiscountType(order.discountType || 'percent');
    }
    const targetId = order.id || (typeof orderOrId === 'string' ? orderOrId : undefined);
    if (targetId) {
      db.suspended_orders.delete(targetId).then(() => {
        refetchSuspended?.();
      });
    }
    modals.setShowSuspended(false);
    addNotification({ title: 'تم استرجاع الفاتورة', message: 'تم تحميل الأصناف للسلة بنجاح', type: 'success' });
  }, [
    suspendedOrders,
    clearCart,
    addItem,
    setSelectedCustomer,
    setDiscount,
    setDiscountType,
    refetchSuspended,
    modals,
    addNotification,
  ]);

  const handleDeleteSuspendedOrder = useCallback((orderOrId: any) => {
    const targetId = typeof orderOrId === 'object' && orderOrId !== null
      ? (orderOrId.id as string)
      : String(orderOrId);
    if (!targetId || targetId === 'undefined' || targetId === 'null') return;
    db.suspended_orders.delete(targetId).then(() => {
      refetchSuspended?.();
      addNotification({ title: 'تم الحذف', message: 'تم حذف الفاتورة المعلقة بنجاح', type: 'info' });
    });
  }, [refetchSuspended, addNotification]);

  return {
    completeSale,
    isSalePending,
    handleExecutePayment,
    handleKeypadPress,
    handleSuspend,
    handleResumeOrder,
    handleDeleteSuspendedOrder,
  };
}
