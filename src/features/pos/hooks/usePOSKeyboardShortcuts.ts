import { useEffect } from 'react';
import type { CartItem } from '@/types';

export interface UsePOSKeyboardShortcutsProps {
  cart: CartItem[];
  selectedItemId?: string | null;
  isSessionOpen: boolean;
  total: number;
  // Modals open states
  isAnyModalOpen?: boolean;
  isPaymentModalOpen?: boolean;
  isSuccessModalOpen?: boolean;
  // Action callbacks
  onCloseAllModals: () => void;
  onExecutePayment?: () => void;
  onCloseSuccessModal?: () => void;
  onOpenPayment: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  onClearCart: () => void;
  onToggleAutoPrint?: () => void;
  onOpenAddCustomer: () => void;
  onFocusSearch?: () => void;
  onOpenFreeProduct: () => void;
  onOpenReturns: () => void;
  onOpenOpenSession: () => void;
  onToggleFullscreen?: () => void;
  onOpenShortcuts: () => void;
  onUpdateQty: (item: CartItem, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onOpenSessionWarning?: () => void;
  onOpenAddProduct?: () => void;
  onOpenCustomize?: () => void;
  onOpenDiscount?: () => void;
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
  onToggleAutoPrint,
  onOpenAddCustomer,
  onFocusSearch,
  onOpenFreeProduct,
  onOpenAddProduct,
  onOpenReturns,
  onOpenOpenSession,
  onOpenSessionWarning,
  onOpenCustomize,
  onOpenDiscount,
  onToggleFullscreen,
  onOpenShortcuts,
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

      // Check if focus is inside an input or textarea
      const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

      // Handle Enter inside active payment/success modals or on main page
      if (e.key === 'Enter') {
        if (isPaymentModalOpen && onExecutePayment) {
          e.preventDefault();
          onExecutePayment();
          return;
        }
        if (isSuccessModalOpen && onCloseSuccessModal) {
          e.preventDefault();
          onCloseSuccessModal();
          return;
        }
        if (!isAnyModalOpen && !isInput && cart.length > 0 && onOpenPayment) {
          e.preventDefault();
          onOpenPayment();
          return;
        }
      }

      // Ctrl + D: حذف الصنف المحدد من السلة
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (!isInput && cart.length > 0) {
          e.preventDefault();
          const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
          if (targetId) {
            onRemoveItem(targetId);
            addNotification({
              title: 'حذف السلعة (Ctrl+D)',
              message: 'تم حذف السلعة من السلة',
              type: 'info',
            });
          }
        }
        return;
      }

      // If typing in input and not pressing F-keys, let normal typing proceed
      if (isInput && !e.key.startsWith('F') && e.key !== 'Escape') {
        return;
      }

      switch (e.key) {
        // F1: تسوية الفاتورة والدفع
        case 'F1':
          e.preventDefault();
          if (cart.length > 0) {
            if (!isSessionOpen && onOpenSessionWarning) {
              onOpenSessionWarning();
              return;
            }
            onOpenPayment();
          } else {
            addNotification({
              title: 'السلة فارغة',
              message: 'أضف منتجات للسلة لتسوية الفاتورة (F1)',
              type: 'info',
            });
          }
          break;

        // F2: تعليق البيع / حفظ كمسودة
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

        // F4: إلغاء الوصل وإفراغ السلة بالكامل
        case 'F4':
          e.preventDefault();
          if (cart.length > 0) {
            onClearCart();
            addNotification({
              title: 'إلغاء السلة (F4)',
              message: 'تم تفريغ سلة المشتريات بالكامل',
              type: 'info',
            });
          }
          break;

        // F5: تبديل وضع الطباعة التلقائية
        case 'F5':
          e.preventDefault();
          if (onToggleAutoPrint) {
            onToggleAutoPrint();
          }
          break;

        // F6: تحديد أو إضافة زبون
        case 'F6':
          e.preventDefault();
          onOpenAddCustomer();
          break;

        // F7: التركيز على شريط البحث والباركود
        case 'F7':
          e.preventDefault();
          if (onFocusSearch) {
            onFocusSearch();
          }
          break;

        // F8: إضافة منتج حر (صنف غير مدرج)
        case 'F8':
          e.preventDefault();
          onOpenFreeProduct();
          break;

        // F9: سجل الفواتير للإرجاع
        case 'F9':
          e.preventDefault();
          onOpenReturns();
          break;

        // F10: فتح مناوبة وإدارة الصندوق
        case 'F10':
          e.preventDefault();
          onOpenOpenSession();
          break;

        // F11: ملء الشاشة (Fullscreen)
        case 'F11':
          e.preventDefault();
          if (onToggleFullscreen) {
            onToggleFullscreen();
          } else {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }
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
              addNotification({
                title: 'حذف السلعة (Delete)',
                message: 'تم حذف السلعة من السلة',
                type: 'info',
              });
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
        case '_':
          if (!isInput && cart.length > 0) {
            e.preventDefault();
            const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
            if (targetId) {
              const it = cart.find((c) => c.productId === targetId);
              if (it) {
                if (it.qty > 1) {
                  onUpdateQty(it, it.qty - 1);
                } else {
                  onRemoveItem(targetId);
                }
              }
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
    onToggleAutoPrint,
    onOpenAddCustomer,
    onFocusSearch,
    onOpenFreeProduct,
    onOpenAddProduct,
    onOpenReturns,
    onOpenOpenSession,
    onOpenSessionWarning,
    onOpenCustomize,
    onOpenDiscount,
    onToggleFullscreen,
    onOpenShortcuts,
    onUpdateQty,
    onRemoveItem,
    addNotification,
  ]);
}
export default usePOSKeyboardShortcuts;
