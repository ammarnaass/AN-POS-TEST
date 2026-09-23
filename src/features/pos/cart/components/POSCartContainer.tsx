import React, { useMemo } from 'react';
import type { POSCartContainerProps } from '../types';
import { POSCartHeader } from './POSCartHeader';
import { POSCartEmptyState } from './POSCartEmptyState';
import { POSCartItemRow } from './POSCartItemRow';
import { POSCartTable } from './POSCartTable';
import { POSReturnButton } from '@/features/pos/returns';

export const POSCartContainer: React.FC<POSCartContainerProps> = ({
  cart,
  allProducts,
  products = [],
  onUpdateQty,
  onRemoveFromCart,
  onEditPrice,
  onSelectCustomer,
  selectedCustomerName,
  formatMoney,
  currency = 'دج',
  onOpenKeypadForQty,
  variant = 'sidebar',
  className = '',
}) => {
  const totalUnitsCount = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
    [cart]
  );

  if (variant === 'table') {
    return (
      <section
        className={`flex flex-col bg-surface rounded-2xl shadow-sm border border-outline-variant/20 overflow-hidden shrink-0 ${className}`}
        data-purpose="cart-section"
      >
        <POSCartHeader
          itemsCount={cart.length}
          unitsCount={totalUnitsCount}
          selectedCustomerName={selectedCustomerName}
          onSelectCustomer={onSelectCustomer}
        />
        <POSReturnButton variant="banner" />
        <POSCartTable
          cart={cart}
          selectedCartRowId={null}
          onSelectCartRow={() => {}}
          onUpdateQty={onUpdateQty}
          onRemoveFromCart={onRemoveFromCart}
          onOpenKeypadForQty={onOpenKeypadForQty}
          formatMoney={(v) => formatMoney(v)}
          currency={currency}
        />
      </section>
    );
  }

  return (
    <section
      className={`flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden shrink-0 ${className}`}
      data-purpose="cart-section"
    >
      {/* هيدر السلة الصغير وتبديل العميل */}
      <POSCartHeader
        itemsCount={cart.length}
        unitsCount={totalUnitsCount}
        selectedCustomerName={selectedCustomerName}
        onSelectCustomer={onSelectCustomer}
      />
      <POSReturnButton variant="banner" />

      {/* قائمة بنود السلة */}
      <div
        className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 px-3 py-2 space-y-1 custom-scrollbar"
        data-purpose="cart-items-list"
      >
        {cart.length === 0 ? (
          <POSCartEmptyState />
        ) : (
          cart.map((item, index) => (
            <POSCartItemRow
              key={`${item.productId}-${index}`}
              item={item}
              index={index}
              onUpdateQty={onUpdateQty}
              onRemoveFromCart={onRemoveFromCart}
              onEditPrice={onEditPrice}
              formatMoney={formatMoney}
              currency={currency}
              onOpenKeypadForQty={onOpenKeypadForQty}
              allProducts={allProducts}
              products={products}
            />
          ))
        )}
      </div>
    </section>
  );
};

export default POSCartContainer;
