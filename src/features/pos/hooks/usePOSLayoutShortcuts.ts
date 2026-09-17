import { useEffect, type RefObject } from 'react';

export interface UsePOSLayoutShortcutsOptions {
  barcodeInputRef: RefObject<HTMLInputElement | null>;
  cartLength: number;
  onSettleSale: () => void;
  onSuspendSale: () => void;
  onOpenSuspended: () => void;
  onClearCart: () => void;
  onToggleAutoPrint: () => void;
  onOpenFreeProduct: () => void;
  onOpenReturns: () => void;
  onSelectPriceTier?: (tier: '1' | '2' | '3' | '4') => void;
}

export function usePOSLayoutShortcuts({
  barcodeInputRef,
  cartLength,
  onSettleSale,
  onSuspendSale,
  onOpenSuspended,
  onClearCart,
  onToggleAutoPrint,
  onOpenFreeProduct,
  onOpenReturns,
  onSelectPriceTier,
}: UsePOSLayoutShortcutsOptions) {
  // Keep barcode input focused on cart changes
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, [cartLength, barcodeInputRef]);

  // Global Keyboard shortcuts (F1 - F9, Alt+1 - Alt+4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        onSettleSale();
      } else if (e.key === 'F2') {
        e.preventDefault();
        onSuspendSale();
      } else if (e.key === 'F3') {
        e.preventDefault();
        onOpenSuspended();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cartLength > 0) onClearCart();
      } else if (e.key === 'F5') {
        e.preventDefault();
        onToggleAutoPrint();
      } else if (e.key === 'F7') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        onOpenFreeProduct();
      } else if (e.key === 'F9') {
        e.preventDefault();
        onOpenReturns();
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        onSelectPriceTier?.('1');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        onSelectPriceTier?.('2');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        onSelectPriceTier?.('3');
      } else if (e.altKey && e.key === '4') {
        e.preventDefault();
        onSelectPriceTier?.('4');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onSettleSale,
    onSuspendSale,
    onOpenSuspended,
    onClearCart,
    onToggleAutoPrint,
    onOpenFreeProduct,
    onOpenReturns,
    onSelectPriceTier,
    cartLength,
    barcodeInputRef,
  ]);
}
