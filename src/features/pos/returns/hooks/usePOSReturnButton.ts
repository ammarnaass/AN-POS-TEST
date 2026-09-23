import { useCallback, useMemo } from 'react';
import { usePOSSessionStore } from '../../store/usePOSSessionStore';

export interface UsePOSReturnButtonProps {
  onOpenReturnsModal?: () => void;
  onClearCartOnExit?: boolean;
}

export function usePOSReturnButton({
  onOpenReturnsModal,
  onClearCartOnExit = true,
}: UsePOSReturnButtonProps = {}) {
  const returnMode = usePOSSessionStore((s) => s.returnMode);
  const setReturnMode = usePOSSessionStore((s) => s.setReturnMode);
  const returnContext = usePOSSessionStore((s) => s.returnContext);
  const setReturnContext = usePOSSessionStore((s) => s.setReturnContext);
  const clearCart = usePOSSessionStore((s) => s.clearCart);
  const cart = usePOSSessionStore((s) => s.cart);

  const isReturnActive = Boolean(returnMode);

  // إجمالي كميات الأصناف المرجعة داخل السلة حالياً
  const returnItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }, [cart]);

  const returnLinesCount = cart.length;

  const originalInvoiceNumber =
    returnContext?.originalSaleNumber || (returnContext as any)?.originalInvoiceNumber;
  const linkedSaleId = returnContext?.originalSaleId;
  const returnReason = returnContext?.reason;
  const refundMethod = returnContext?.refundMethod;

  // فتح نافذة استعراض واختيار فواتير الإرجاع
  const handleOpenReturnsModal = useCallback(() => {
    onOpenReturnsModal?.();
  }, [onOpenReturnsModal]);

  // الخروج الآمن والمنظف من وضع الإرجاع والعودة إلى البيع الطبيعي
  const handleExitReturnMode = useCallback(
    (clearItems = onClearCartOnExit) => {
      setReturnMode(false);
      setReturnContext(null);
      if (clearItems) {
        clearCart();
      }
    },
    [setReturnMode, setReturnContext, clearCart, onClearCartOnExit]
  );

  // التبديل المباشر لوضع الإرجاع بالسلة (مفيد للمسح المباشر بالباركود بدون فاتورة)
  const handleToggleManualReturn = useCallback(() => {
    if (returnMode) {
      handleExitReturnMode();
    } else {
      setReturnMode(true);
      setReturnContext(null);
    }
  }, [returnMode, handleExitReturnMode, setReturnMode, setReturnContext]);

  // الإجراء الرئيسي عند النقر على زر الإرجاع
  const handlePrimaryClick = useCallback(() => {
    if (!returnMode) {
      if (onOpenReturnsModal) {
        onOpenReturnsModal();
      } else {
        setReturnMode(true);
      }
    } else {
      // عند كونه مفعلاً مسبقاً، النقر ينهي وضع الإرجاع بأمان
      handleExitReturnMode();
    }
  }, [returnMode, onOpenReturnsModal, setReturnMode, handleExitReturnMode]);

  return {
    isReturnActive,
    returnMode,
    returnContext,
    originalInvoiceNumber,
    linkedSaleId,
    returnReason,
    refundMethod,
    returnItemsCount,
    returnLinesCount,
    hasCartItems: cart.length > 0,
    handlePrimaryClick,
    handleOpenReturnsModal,
    handleExitReturnMode,
    handleToggleManualReturn,
  };
}
