import { useEffect } from 'react';
import type { CartItem } from '@/types';
import { getCartRowKey } from '../utils/cartRow';

interface UseDesign7ShortcutsProps {
  onSettleSale: (paidAmount?: number) => void;
  onOpenSalesHistory?: () => void;
  onSuspendSale?: () => void;
  onOpenReturns?: () => void;
  onOpenSuspended: () => void;
  onOpenDiscount: () => void;
  onSelectCustomer: () => void;
  onNewOrder?: () => void;
  onClearCart: () => void;
  onOpenCustomize: () => void;
  onToggleFullscreen?: () => void;
  onBarcodeFocus?: () => void;
  onOpenSearch?: () => void;
  onOpenFreeProduct?: () => void;
  onToggleAutoPrint?: () => void;
  onNavigateBack?: () => void;
  cart: CartItem[];
  selectedCartRowId: string | null;
  setSelectedCartRowId: (id: string | null) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
  enabled?: boolean;
  /** Global (POSPage-level) modal state — Esc closes those before navigating back */
  isAnyModalOpen?: boolean;
  onCloseModals?: () => void;
}

export function useDesign7Shortcuts({
  onSettleSale,
  onOpenSalesHistory,
  onSuspendSale,
  onOpenReturns,
  onOpenSuspended,
  onOpenDiscount,
  onSelectCustomer,
  onNewOrder,
  onClearCart,
  onOpenCustomize,
  onToggleFullscreen,
  onBarcodeFocus,
  onOpenSearch,
  onOpenFreeProduct,
  onToggleAutoPrint,
  onNavigateBack,
  cart,
  selectedCartRowId,
  setSelectedCartRowId,
  onUpdateQty,
  onRemoveFromCart,
  onSelectPriceTier,
  enabled = true,
  isAnyModalOpen = false,
  onCloseModals,
}: UseDesign7ShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // أمان تشغيلي حاسم: عند فتح أي نافذة منبثقة (مثل بحث السلع F10 أو تعديل الصنف)،
      // تتوقف كافة عمليات واختصارات الخلفية بنسبة 100% ويقتصر التفاعل على مفتاح Escape للإغلاق
      if (isAnyModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCloseModals?.();
        }
        return;
      }

      // فئات الأسعار السريعة (س1-س4 عبر Alt+1..4 أو Ctrl+1..4)
      if ((e.altKey || e.ctrlKey) && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        onSelectPriceTier?.(e.key as '1' | '2' | '3' | '4');
        return;
      }

      // Don't intercept if typing inside an input or textarea
      const target = e.target as HTMLElement;
      const isBarcodeInput =
        target.tagName === 'INPUT' &&
        (target.getAttribute('data-purpose') === 'barcode-input' || (target as HTMLInputElement).name === 'barcode');
      const isOtherInput = (target.tagName === 'INPUT' && !isBarcodeInput) || target.tagName === 'TEXTAREA';

      // داخل الحقول النصية الأخرى (مثل نوافذ الإدخال أو البحث): لا نتدخل نهائياً
      if (isOtherInput) {
        return;
      }

      // Alt + S: فتح سجل المبيعات (مطابق للاختصار العام في usePOSKeyboardShortcuts)
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onOpenSalesHistory?.();
        return;
      }

      // Function Keys (F1 - F12)
      if (e.key === 'F1') {
        e.preventDefault();
        onSettleSale();
        return;
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (onSuspendSale) onSuspendSale();
        else if (onOpenSalesHistory) onOpenSalesHistory();
        else if (onOpenReturns) onOpenReturns();
        return;
      } else if (e.key === 'F3') {
        e.preventDefault();
        onBarcodeFocus?.();
        return;
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (onNewOrder) onNewOrder();
        else onClearCart();
        return;
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (onOpenFreeProduct) onOpenFreeProduct();
        return;
      } else if (e.key === 'F6') {
        e.preventDefault();
        onOpenDiscount();
        return;
      } else if (e.key === 'F7') {
        e.preventDefault();
        onToggleAutoPrint?.();
        return;
      } else if (e.key === 'F8') {
        e.preventDefault();
        onOpenSuspended();
        return;
      } else if (e.key === 'F9') {
        e.preventDefault();
        onSelectCustomer();
        return;
      } else if (e.key === 'F10') {
        e.preventDefault();
        onOpenSearch?.();
        return;
      } else if (e.key === 'F11') {
        e.preventDefault();
        onToggleFullscreen?.();
        return;
      } else if (e.key === 'F12') {
        e.preventDefault();
        onOpenCustomize();
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onNavigateBack?.();
        return;
      }

      // معالج حذف السطر المحدد من السلة (أو آخر سطر إذا لم يُحدد سطر بعينه)
      const handleDeleteCartRow = () => {
        if (cart.length === 0) return;
        const item =
          (selectedCartRowId
            ? cart.find(
                (i, idx) =>
                  getCartRowKey(i, idx) === selectedCartRowId ||
                  (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
              )
            : null) || cart[cart.length - 1];
        if (item) {
          const prodId = item.productId || (item as any).id;
          if (prodId) onRemoveFromCart(prodId);
        }
      };

      // مفتاح Delete / Del: حذف سطر السلة عند الضغط عليه (سواء كان المؤشر خارج الحقول أو داخل حقل الباركود الفارغ)
      if (e.key === 'Delete' || e.key === 'Del') {
        if (cart.length > 0) {
          if (isBarcodeInput) {
            const val = (target as HTMLInputElement).value || '';
            if (val.trim() === '') {
              e.preventDefault();
              handleDeleteCartRow();
              return;
            }
          } else {
            e.preventDefault();
            handleDeleteCartRow();
            return;
          }
        }
      }

      // مفتاح Backspace خارج الحقول: منع التنقل غير المقصود
      if (e.key === 'Backspace' && !isBarcodeInput) {
        e.preventDefault();
        return;
      }

      // عمليات السلة التفاعلية (الأسهم، إنقاص وزيادة الكمية، وتثبيت البيع):
      // تعمل عند التواجد خارج الحقول أو داخل حقل الباركود الدائم عندما يكون فارغاً
      const canControlCart = !isBarcodeInput || ((target as HTMLInputElement).value || '').trim() === '';
      if (canControlCart) {
        if (e.key === 'Enter') {
          if (!isBarcodeInput && cart.length > 0) {
            e.preventDefault();
            onSettleSale();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (cart.length === 0) return;
          const currentIdx = cart.findIndex(
            (i, idx) =>
              getCartRowKey(i, idx) === selectedCartRowId ||
              (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
          );
          const nextIdx = currentIdx >= 0 && currentIdx < cart.length - 1 ? currentIdx + 1 : 0;
          setSelectedCartRowId(getCartRowKey(cart[nextIdx], nextIdx));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (cart.length === 0) return;
          const currentIdx = cart.findIndex(
            (i, idx) =>
              getCartRowKey(i, idx) === selectedCartRowId ||
              (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
          );
          const prevIdx = currentIdx > 0 ? currentIdx - 1 : cart.length - 1;
          setSelectedCartRowId(getCartRowKey(cart[prevIdx], prevIdx));
        } else if (e.key === 'ArrowRight' || e.key === '+') {
          if (cart.length > 0) {
            e.preventDefault();
            const item =
              (selectedCartRowId
                ? cart.find(
                    (i, idx) =>
                      getCartRowKey(i, idx) === selectedCartRowId ||
                      (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
                  )
                : null) || cart[cart.length - 1];
            if (item) {
              const currentQty = item.qty ?? (item as any).quantity ?? 1;
              const prodId = item.productId || (item as any).id;
              if (prodId) onUpdateQty(prodId, currentQty + 1);
            }
          }
        } else if (e.key === 'ArrowLeft' || e.key === '-') {
          if (cart.length > 0) {
            e.preventDefault();
            const item =
              (selectedCartRowId
                ? cart.find(
                    (i, idx) =>
                      getCartRowKey(i, idx) === selectedCartRowId ||
                      (Boolean(selectedCartRowId) && (i.productId === selectedCartRowId || (i as any).id === selectedCartRowId))
                  )
                : null) || cart[cart.length - 1];
            if (item) {
              const currentQty = item.qty ?? (item as any).quantity ?? 1;
              const prodId = item.productId || (item as any).id;
              if (prodId && currentQty > 1) {
                onUpdateQty(prodId, currentQty - 1);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onSettleSale,
    onOpenSalesHistory,
    onOpenReturns,
    onOpenSuspended,
    onOpenDiscount,
    onSelectCustomer,
    onNewOrder,
    onClearCart,
    onOpenCustomize,
    onToggleFullscreen,
    onBarcodeFocus,
    onOpenSearch,
    onOpenFreeProduct,
    onToggleAutoPrint,
    onNavigateBack,
    isAnyModalOpen,
    onCloseModals,
    cart,
    selectedCartRowId,
    setSelectedCartRowId,
    onUpdateQty,
    onRemoveFromCart,
    onSelectPriceTier,
  ]);
}
