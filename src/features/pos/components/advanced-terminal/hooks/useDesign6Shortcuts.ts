import { useEffect } from 'react';

export interface UseDesign6ShortcutsProps {
  onNewOrder?: () => void;
  onOpenReturns?: () => void;
  onFocusQuantity?: () => void;
  onFocusPrice?: () => void;
  onSettleSale?: () => void;
  onQuickSettle?: () => void;
  onSuspendSale?: () => void;
  onOpenSuspended?: () => void;
  suspendedCount?: number;
  onClearCart?: () => void;
  onOpenDiscount?: () => void;
  onOpenMiscProduct?: () => void;
  onOpenProductCatalog?: () => void;
  onLockTerminal?: () => void;
  onToggleFullscreen?: () => void;
  onNavigateBack?: () => void;
  onDeleteSelectedRow?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onConfirm?: () => void;
  isAnyModalOpen?: boolean;
  onCloseModals?: () => void;
}

export const useDesign6Shortcuts = ({
  onNewOrder,
  onOpenReturns,
  onFocusQuantity,
  onFocusPrice,
  onSettleSale,
  onQuickSettle,
  onSuspendSale,
  onOpenSuspended,
  suspendedCount = 0,
  onClearCart,
  onOpenDiscount,
  onOpenMiscProduct,
  onOpenProductCatalog,
  onLockTerminal,
  onToggleFullscreen,
  onNavigateBack,
  onDeleteSelectedRow,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onConfirm,
  isAnyModalOpen = false,
  onCloseModals,
}: UseDesign6ShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // 1. Always prioritize Escape to close active modal or cancel editing
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isAnyModalOpen) {
          onCloseModals?.();
        } else if (!isInput) {
          onNavigateBack?.();
        }
        return;
      }

      // If typing inside an input and NOT an F-key or navigation key, let standard typing proceed
      if (isInput && !e.key.startsWith('F')) {
        return;
      }

      switch (e.key) {
        // F1: تأكيد ودفع
        case 'F1':
          e.preventDefault();
          onSettleSale?.();
          break;

        // F2: سجل المبيعات / مرتجع
        case 'F2':
          e.preventDefault();
          onOpenReturns?.();
          break;

        // F3: حقل الكمية
        case 'F3':
          e.preventDefault();
          onFocusQuantity?.();
          break;

        // F4: تعديل السعر المباشر
        case 'F4':
          e.preventDefault();
          onFocusPrice?.();
          break;

        // F5: صنف حر / خدمة يدوية
        case 'F5':
          e.preventDefault();
          onOpenMiscProduct?.();
          break;

        // F6: خصم الفاتورة
        case 'F6':
          e.preventDefault();
          onOpenDiscount?.();
          break;

        // F7: دفع سريع نقداً
        case 'F7':
          e.preventDefault();
          onQuickSettle?.();
          break;

        // F8: إلغاء وتفريغ الوصل
        case 'F8':
          e.preventDefault();
          onClearCart?.();
          break;

        // F9: وصل بيع جديد
        case 'F9':
          e.preventDefault();
          onNewOrder?.();
          break;

        // F10: بحث واستعراض السلع والمواد
        case 'F10':
          e.preventDefault();
          onOpenProductCatalog?.();
          break;

        // F11: تكبير الواجهة وملء الشاشة
        case 'F11':
          e.preventDefault();
          onToggleFullscreen?.();
          break;

        // F12: الفواتير المعلقة (استئناف إذا وجدت، أو تعليق البيع)
        case 'F12':
          e.preventDefault();
          if (suspendedCount > 0 && onOpenSuspended) {
            onOpenSuspended();
          } else {
            onSuspendSale?.();
          }
          break;

        // Delete / Backspace: حذف السطر المحدد من السلة
        case 'Delete':
        case 'Backspace':
          if (!isInput) {
            e.preventDefault();
            onDeleteSelectedRow?.();
          }
          break;

        // Enter: تأكيد / دفع
        case 'Enter':
          if (!isInput) {
            e.preventDefault();
            onConfirm?.();
          }
          break;

        // Navigation Arrows (عند عدم التواجد في حقل كتابة)
        case 'ArrowUp':
          if (!isInput) {
            e.preventDefault();
            onArrowUp?.();
          }
          break;

        case 'ArrowDown':
          if (!isInput) {
            e.preventDefault();
            onArrowDown?.();
          }
          break;

        case 'ArrowLeft':
          if (!isInput) {
            e.preventDefault();
            onArrowLeft?.();
          }
          break;

        case 'ArrowRight':
          if (!isInput) {
            e.preventDefault();
            onArrowRight?.();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onNewOrder,
    onOpenReturns,
    onFocusQuantity,
    onFocusPrice,
    onSettleSale,
    onQuickSettle,
    onSuspendSale,
    onOpenSuspended,
    suspendedCount,
    onClearCart,
    onOpenDiscount,
    onOpenMiscProduct,
    onOpenProductCatalog,
    onLockTerminal,
    onToggleFullscreen,
    onNavigateBack,
    onDeleteSelectedRow,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onConfirm,
    isAnyModalOpen,
    onCloseModals,
  ]);
};
