import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import type { CartItem, Customer } from '@/types';

interface UseQuickPOSSuspendedOrdersParams {
  cart: CartItem[];
  clearCart: () => void;
  addItem: (item: any) => void;
  setSelectedCustomer: (id: string) => void;
  setDiscount: (discount: number) => void;
  setDiscountType: (type: 'percent' | 'fixed') => void;
  addNotification: (notification: any) => void;
}

export function useQuickPOSSuspendedOrders({
  cart,
  clearCart,
  addItem,
  setSelectedCustomer,
  setDiscount,
  setDiscountType,
  addNotification,
}: UseQuickPOSSuspendedOrdersParams) {
  const queryClient = useQueryClient();

  // 1. تعليق السلة الحالية
  const handleHoldSale = useCallback(
    (
      selectedCustomer: string,
      discount: number,
      discountType: 'percent' | 'fixed',
      customers: Customer[],
      currentUserName?: string
    ) => {
      if (cart.length === 0) return;

      const subtotal = cart.reduce(
        (acc, it) => acc + (it.lineTotal || it.unitPrice * it.qty || 0),
        0
      );
      const discountAmount =
        discountType === 'percent'
          ? (subtotal * (discount || 0)) / 100
          : discount || 0;
      const total = Math.max(0, subtotal - discountAmount);
      const custObj = customers.find((c: any) => c.id === selectedCustomer);

      const newOrder = {
        id: generateId(),
        items: cart.map((it) => ({
          productId: it.productId,
          name: it.name,
          qty: Number(it.qty || 1),
          unitPrice: Number(it.unitPrice || 0),
          lineTotal: Number(
            it.lineTotal || Number(it.qty || 1) * Number(it.unitPrice || 0)
          ),
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
        createdBy: currentUserName || '',
      };

      db.suspended_orders.add(newOrder).then(() => {
        queryClient.invalidateQueries({ queryKey: ['suspendedOrders'] });
        clearCart();
        setSelectedCustomer('');
        setDiscount(0);
        addNotification({
          title: 'تم تعليق البيع',
          message: `تم حفظ ${cart.length} أصناف بقيمة ${total.toLocaleString('ar-DZ')} د.ج في الفواتير المعلقة`,
          type: 'info',
        });
      });
    },
    [cart, clearCart, setSelectedCustomer, setDiscount, queryClient, addNotification]
  );

  // 2. استرجاع الفاتورة المعلقة إلى السلة
  const handleRestoreHeldSale = useCallback(
    (order: any, onAfterRestore?: () => void) => {
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
          lineTotal: Number(
            item.lineTotal || Number(item.qty || 1) * Number(item.unitPrice || 0)
          ),
          isCustom: item.isCustom,
          isPack: item.isPack,
          packId: item.packId,
          batchNumber: item.batchNumber,
        });
      }

      setSelectedCustomer(order.customerId || '');
      setDiscount(order.discount || 0);
      setDiscountType(order.discountType || 'percent');

      db.suspended_orders.delete(order.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['suspendedOrders'] });
      });

      if (onAfterRestore) onAfterRestore();

      addNotification({
        title: 'تم استرجاع الفاتورة',
        message: 'تم تحميل الأصناف للسلة بنجاح',
        type: 'success',
      });
    },
    [clearCart, addItem, setSelectedCustomer, setDiscount, setDiscountType, queryClient, addNotification]
  );

  // 3. حذف فاتورة معلقة
  const handleDeleteHeldSale = useCallback(
    (orderId: string) => {
      db.suspended_orders.delete(orderId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['suspendedOrders'] });
        addNotification({
          title: 'تم الحذف',
          message: 'تم حذف الفاتورة المعلقة بنجاح',
          type: 'info',
        });
      });
    },
    [queryClient, addNotification]
  );

  return {
    handleHoldSale,
    handleRestoreHeldSale,
    handleDeleteHeldSale,
  };
}
