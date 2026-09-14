import { useEffect } from 'react';

export interface UseDesign6ShortcutsProps {
  onNewOrder?: () => void;
  onOpenReturns?: () => void;
  onFocusQuantity?: () => void;
  onFocusPrice?: () => void;
  onSettleSale?: () => void;
  onQuickSettle?: () => void;
  onSuspendSale?: () => void;
  onClearCart?: () => void;
  onOpenDiscount?: () => void;
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
}

export const useDesign6Shortcuts = ({
  onNewOrder,
  onOpenReturns,
  onFocusQuantity,
  onFocusPrice,
  onSettleSale,
  onQuickSettle,
  onSuspendSale,
  onClearCart,
  onOpenDiscount,
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
}: UseDesign6ShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept function keys if a modal or input is active unless specific
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          onSettleSale?.();
          break;
        case 'F2':
          e.preventDefault();
          onOpenReturns?.();
          break;
        case 'F3':
          e.preventDefault();
          onFocusQuantity?.();
          break;
        case 'F4':
          e.preventDefault();
          onFocusPrice?.();
          break;
        case 'F5':
          e.preventDefault();
          onSettleSale?.();
          break;
        case 'F6':
          e.preventDefault();
          onOpenDiscount?.();
          break;
        case 'F7':
          e.preventDefault();
          onQuickSettle?.();
          break;
        case 'F8':
          e.preventDefault();
          onClearCart?.();
          break;
        case 'F9':
          e.preventDefault();
          onNewOrder?.();
          break;
        case 'F10':
          e.preventDefault();
          onOpenProductCatalog?.();
          break;
        case 'F11':
          e.preventDefault();
          onToggleFullscreen?.();
          break;
        case 'F12':
          e.preventDefault();
          onSuspendSale?.();
          break;
        case 'Delete':
          if (!isInput) {
            e.preventDefault();
            onDeleteSelectedRow?.();
          }
          break;
        case 'Escape':
          if (!isInput) {
            e.preventDefault();
            onNavigateBack?.();
          }
          break;
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
    onClearCart,
    onOpenDiscount,
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
  ]);
};
