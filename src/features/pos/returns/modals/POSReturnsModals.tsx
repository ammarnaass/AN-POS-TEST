import React, { useCallback } from 'react';
import type { Sale } from '@/types';
import type { POSReturnsModalsProps } from '../types';
import { POSReturnSaleModal } from './POSReturnSaleModal';
import { POSPartialReturnModal } from './POSPartialReturnModal';
import { prepareFullReturnCartItems } from '../services/posReturnSearchService';

export const POSReturnsModals: React.FC<POSReturnsModalsProps> = ({
  showReturnSaleModal,
  showPartialReturnModal,
  selectedSaleForReturn,
  sales,
  onCloseReturnSale,
  onClosePartialReturn,
  onSelectReturnSale,
  onConfirmPartialReturn,
  onLoadReturnToCart,
}) => {
  // معالج الإرجاع الكامل المباشر من نتائج البحث
  const handleQuickFullReturn = useCallback(
    (sale: Sale) => {
      const returnItems = prepareFullReturnCartItems(sale, sales);
      if (returnItems.length === 0) return;

      onConfirmPartialReturn({
        returnItems,
        originalSale: sale,
        reason: 'طلب الزبون (تراجع عن الشراء)',
        refundMethod: sale.customerId && sale.paymentMethod === 'credit' ? 'customer_credit' : 'cash',
      });
    },
    [sales, onConfirmPartialReturn]
  );

  // معالج شحن السلة بالكامل ببنود الفاتورة للإرجاع أو التبديل
  const handleLoadSaleToCart = useCallback(
    (sale: Sale) => {
      if (!onLoadReturnToCart) return;
      const returnItems = prepareFullReturnCartItems(sale, sales);
      if (returnItems.length === 0) return;

      onLoadReturnToCart({
        returnItems,
        originalSale: sale,
        reason: 'طلب الزبون (تراجع عن الشراء)',
        refundMethod: sale.customerId && sale.paymentMethod === 'credit' ? 'customer_credit' : 'cash',
      });
    },
    [sales, onLoadReturnToCart]
  );

  return (
    <>
      <POSReturnSaleModal
        isOpen={showReturnSaleModal}
        onClose={onCloseReturnSale}
        sales={sales}
        onSelectReturnSale={onSelectReturnSale}
        onQuickFullReturn={handleQuickFullReturn}
        onLoadToCart={onLoadReturnToCart ? handleLoadSaleToCart : undefined}
      />

      {showPartialReturnModal && (
        <POSPartialReturnModal
          isOpen={showPartialReturnModal}
          onClose={onClosePartialReturn}
          sale={selectedSaleForReturn}
          onConfirmReturn={onConfirmPartialReturn}
          onLoadToCart={onLoadReturnToCart}
        />
      )}
    </>
  );
};
