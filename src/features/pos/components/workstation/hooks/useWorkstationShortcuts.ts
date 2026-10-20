import { useEffect } from 'react';

interface UseWorkstationShortcutsParams {
  onF1Confirm: () => void;
  onF2ConfirmPrint: () => void;
  onF3HoldSale: () => void;
  onF4FreeProduct: () => void;
  onF5FocusSearch: () => void;
  onF6HeldSales: () => void;
  onF7QuickAdd: () => void;
  onF8ToggleSearchMode: () => void;
  onF9Customize?: () => void;
  onF10Packages: () => void;
  onF11Returns: () => void;
  onF12QuickPay: () => void;
  onDeleteSelected: () => void;
  onIncrementQty: () => void;
  onDecrementQty: () => void;
  onEscape: () => void;
  isAnyModalOpen?: boolean;
  onCloseAllModals?: () => void;
}

export function useWorkstationShortcuts({
  onF1Confirm,
  onF2ConfirmPrint,
  onF3HoldSale,
  onF4FreeProduct,
  onF5FocusSearch,
  onF6HeldSales,
  onF7QuickAdd,
  onF8ToggleSearchMode,
  onF9Customize,
  onF10Packages,
  onF11Returns,
  onF12QuickPay,
  onDeleteSelected,
  onIncrementQty,
  onDecrementQty,
  onEscape,
  isAnyModalOpen,
  onCloseAllModals,
}: UseWorkstationShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept F-keys when pressed with Meta/Alt except standard POS shortcuts
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement;

      // Handle Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isAnyModalOpen && onCloseAllModals) {
          onCloseAllModals();
        } else {
          onEscape();
        }
        return;
      }

      // Handle function keys F1 - F12
      if (e.key === 'F1') {
        e.preventDefault();
        onF1Confirm();
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        onF2ConfirmPrint();
        return;
      }

      if (e.key === 'F3') {
        e.preventDefault();
        onF3HoldSale();
        return;
      }

      if (e.key === 'F4') {
        e.preventDefault();
        onF4FreeProduct();
        return;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        onF5FocusSearch();
        return;
      }

      if (e.key === 'F6') {
        e.preventDefault();
        onF6HeldSales();
        return;
      }

      if (e.key === 'F7') {
        e.preventDefault();
        onF7QuickAdd();
        return;
      }

      if (e.key === 'F8') {
        e.preventDefault();
        onF8ToggleSearchMode();
        return;
      }

      if (e.key === 'F9') {
        e.preventDefault();
        onF9Customize?.();
        return;
      }

      if (e.key === 'F10') {
        e.preventDefault();
        onF10Packages();
        return;
      }

      if (e.key === 'F11') {
        e.preventDefault();
        onF11Returns();
        return;
      }

      if (e.key === 'F12') {
        e.preventDefault();
        onF12QuickPay();
        return;
      }

      // Suppr / Delete (delete selected row)
      if (e.key === 'Delete') {
        if (!isInputFocused) {
          e.preventDefault();
          onDeleteSelected();
        }
        return;
      }

      // '+' or '-' key when not editing text
      if (!isInputFocused) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          onIncrementQty();
          return;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          onDecrementQty();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onF1Confirm,
    onF2ConfirmPrint,
    onF3HoldSale,
    onF4FreeProduct,
    onF5FocusSearch,
    onF6HeldSales,
    onF7QuickAdd,
    onF8ToggleSearchMode,
    onF9Customize,
    onF10Packages,
    onF11Returns,
    onF12QuickPay,
    onDeleteSelected,
    onIncrementQty,
    onDecrementQty,
    onEscape,
    isAnyModalOpen,
    onCloseAllModals,
  ]);
}
