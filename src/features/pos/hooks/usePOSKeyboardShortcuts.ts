import { useEffect } from 'react';
import type { CartItem } from '@/types';

export interface UsePOSKeyboardShortcutsProps {
  cart: CartItem[];
  selectedItemId: string | null;
  isSessionOpen: boolean;
  total: number;
  // Modals open states
  isAnyModalOpen: boolean;
  isPaymentModalOpen: boolean;
  isSuccessModalOpen: boolean;
  // Action callbacks
  onCloseAllModals: () => void;
  onExecutePayment: () => void;
  onCloseSuccessModal: () => void;
  onOpenPayment: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  onClearCart: () => void;
  onOpenReturns: () => void;
  onOpenShortcuts: () => void;
  onOpenFreeProduct: () => void;
  onOpenAddProduct: () => void;
  onOpenAddCustomer: () => void;
  onOpenOpenSession: () => void;
  onOpenSessionWarning: () => void;
  onOpenCustomize: () => void;
  onOpenDiscount: () => void;
  onUpdateQty: (item: CartItem, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  addNotification: (notif: { title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }) => void;
}

export function usePOSKeyboardShortcuts({
  cart,
  selectedItemId,
  isSessionOpen,
  total,
  isAnyModalOpen,
  isPaymentModalOpen,
  isSuccessModalOpen,
  onCloseAllModals,
  onExecutePayment,
  onCloseSuccessModal,
  onOpenPayment,
  onSuspendSale,
  onOpenSuspended,
  onClearCart,
  onOpenReturns,
  onOpenShortcuts,
  onOpenFreeProduct,
  onOpenAddProduct,
  onOpenAddCustomer,
  onOpenOpenSession,
  onOpenSessionWarning,
  onOpenCustomize,
  onOpenDiscount,
  onUpdateQty,
  onRemoveItem,
  addNotification,
}: UsePOSKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Always handle Escape to close any open modal
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseAllModals();
        return;
      }

      // If user is typing in an input/textarea (and not pressing F-keys), let default text entry work
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (isInput) {
        if (e.key === 'Enter') {
          if (isPaymentModalOpen) {
            e.preventDefault();
            onExecutePayment();
            return;
          }
          if (isSuccessModalOpen) {
            e.preventDefault();
            onCloseSuccessModal();
            return;
          }
        }
        if (!e.key.startsWith('F') && e.key !== 'Escape') {
          return;
        }
      }

      switch (e.key) {
        // F1: تسوية الفاتورة والدفع
        case 'F1':
          e.preventDefault();
          if (cart.length > 0) {
            if (e.shiftKey) {
              onClearCart();
              addNotification({
                title: 'إفراغ السلة (F1)',
                message: 'تم تفريغ سلة المشتريات بالكامل',
                type: 'info',
              });
            } else {
              if (!isSessionOpen) {
                onOpenSessionWarning();
                return;
              }
              onOpenPayment();
            }
          } else {
            addNotification({
              title: 'السلة فارغة',
              message: 'أضف منتجات للسلة لتسوية الفاتورة (F1)',
              type: 'info',
            });
          }
          break;

        // F2: تعليق الطلب (مسودة)
        case 'F2':
          e.preventDefault();
          if (cart.length > 0) {
            onSuspendSale();
          } else {
            addNotification({
              title: 'السلة فارغة',
              message: 'أضف منتجات للسلة لتعليق الطلب كمسودة (F2)',
              type: 'warning',
            });
          }
          break;

        // F3: المسودات والطلبات المعلقة
        case 'F3':
          e.preventDefault();
          onOpenSuspended();
          break;

        // F4: إلغاء السلة أو استرجاع
        case 'F4':
          e.preventDefault();
          if (e.shiftKey || cart.length === 0) {
            onOpenReturns();
          } else {
            onClearCart();
            addNotification({
              title: 'إلغاء السلة (F4)',
              message: 'تم تفريغ سلة المشتريات بالكامل',
              type: 'info',
            });
          }
          break;

        // F6: إضافة زبون جديد
        case 'F6':
          e.preventDefault();
          onOpenAddCustomer();
          break;

        // F7: إضافة صنف غير مدرج (منتج حر)
        case 'F7':
          e.preventDefault();
          onOpenFreeProduct();
          break;

        // F8: إضافة منتج سريع للمخزون
        case 'F8':
          e.preventDefault();
          onOpenAddProduct();
          break;

        // F9: سجل الفواتير للإرجاع
        case 'F9':
          e.preventDefault();
          onOpenReturns();
          break;

        // F10: فتح مناوبة الصندوق
        case 'F10':
          e.preventDefault();
          onOpenOpenSession();
          break;

        // F11: تخصيص العرض والواجهة
        case 'F11':
          e.preventDefault();
          onOpenCustomize();
          break;

        // F12: دليل اختصارات لوحة المفاتيح
        case 'F12':
          e.preventDefault();
          onOpenShortcuts();
          break;

        // Delete: حذف الصنف المحدد من السلة
        case 'Delete':
          if (!isInput && cart.length > 0) {
            e.preventDefault();
            const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
            if (targetId) {
              onRemoveItem(targetId);
            }
          }
          break;

        // +: زيادة كمية الصنف المحدد
        case '+':
        case '=':
          if (!isInput && cart.length > 0) {
            e.preventDefault();
            const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
            if (targetId) {
              const it = cart.find((c) => c.productId === targetId);
              if (it) onUpdateQty(it, it.qty + 1);
            }
          }
          break;

        // -: إنقاص كمية الصنف المحدد
        case '-':
          if (!isInput && cart.length > 0) {
            e.preventDefault();
            const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
            if (targetId) {
              const it = cart.find((c) => c.productId === targetId);
              if (it) onUpdateQty(it, it.qty - 1);
            }
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart,
    selectedItemId,
    isSessionOpen,
    total,
    isAnyModalOpen,
    isPaymentModalOpen,
    isSuccessModalOpen,
    onCloseAllModals,
    onExecutePayment,
    onCloseSuccessModal,
    onOpenPayment,
    onSuspendSale,
    onOpenSuspended,
    onClearCart,
    onOpenReturns,
    onOpenShortcuts,
    onOpenFreeProduct,
    onOpenAddProduct,
    onOpenAddCustomer,
    onOpenOpenSession,
    onOpenSessionWarning,
    onOpenCustomize,
    onOpenDiscount,
    onUpdateQty,
    onRemoveItem,
    addNotification,
  ]);
}
export default usePOSKeyboardShortcuts;
