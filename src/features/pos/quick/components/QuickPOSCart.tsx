import React from 'react';
import type { CartItem, Customer } from '@/types';
import type { QuickPOSMobileTab, QuickPOSPaymentMethod, QuickPOSSaleSummary } from '../types';
import { QuickPOSCartHeader } from './cart/QuickPOSCartHeader';
import { QuickPOSCartItemList } from './cart/QuickPOSCartItemList';
import { QuickPOSCartPaymentSection } from './cart/QuickPOSCartPaymentSection';
import { QuickPOSMobileCartBar } from './cart/QuickPOSMobileCartBar';

export interface QuickPOSCartProps {
  cart: CartItem[];
  onUpdateQty: (productId: string, qty: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onHoldSale: () => void;
  customers: Customer[];
  selectedCustomer: string;
  onSelectCustomer: (id: string) => void;
  onOpenAddCustomerModal: () => void;
  paymentMethod: QuickPOSPaymentMethod;
  onSelectPaymentMethod: (m: QuickPOSPaymentMethod) => void;
  allowCardPayment: boolean;
  allowTransferPayment: boolean;
  cashTendered: number;
  onChangeCashTendered: (val: number) => void;
  saleSummary: QuickPOSSaleSummary;
  onQuickPay: () => void;
  isSalePending: boolean;
  mobileTab: QuickPOSMobileTab;
  onSwitchMobileTab: (tab: QuickPOSMobileTab) => void;
  baseCurrency?: string;
}

export const QuickPOSCart: React.FC<QuickPOSCartProps> = React.memo(({
  cart,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onHoldSale,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onOpenAddCustomerModal,
  paymentMethod,
  onSelectPaymentMethod,
  allowCardPayment,
  allowTransferPayment,
  cashTendered,
  onChangeCashTendered,
  saleSummary,
  onQuickPay,
  isSalePending,
  mobileTab,
  onSwitchMobileTab,
  baseCurrency = 'دج',
}) => {
  return (
    <>
      <section
        className={`w-full lg:w-[420px] xl:w-[460px] flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-shrink-0 transition-all ${
          mobileTab === 'cart' ? 'flex' : 'hidden md:flex'
        }`}
        data-purpose="cashier-cart"
      >
        {/* 1. ترويسة السلة واختيار العميل والديون */}
        <QuickPOSCartHeader
          cartCount={cart.length}
          onHoldSale={onHoldSale}
          onClearCart={onClearCart}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={onSelectCustomer}
          onOpenAddCustomerModal={onOpenAddCustomerModal}
          onSwitchMobileTab={onSwitchMobileTab}
        />

        {/* 2. قائمة أصناف السلة مع أزرار الزيادة والحذف */}
        <QuickPOSCartItemList
          cart={cart}
          onUpdateQty={onUpdateQty}
          onRemoveItem={onRemoveItem}
        />

        {/* 3. طرق الدفع وحاسبة الفئات وزر F1 العملاق */}
        <QuickPOSCartPaymentSection
          paymentMethod={paymentMethod}
          onSelectPaymentMethod={onSelectPaymentMethod}
          allowCardPayment={allowCardPayment}
          allowTransferPayment={allowTransferPayment}
          cashTendered={cashTendered}
          onChangeCashTendered={onChangeCashTendered}
          saleSummary={saleSummary}
          onQuickPay={onQuickPay}
          isSalePending={isSalePending}
          cartLength={cart.length}
          baseCurrency={baseCurrency}
        />
      </section>

      {/* 4. شريط السلة العائم المخصص للأجهزة المحمولة */}
      {mobileTab === 'catalog' && (
        <QuickPOSMobileCartBar
          cartCount={cart.length}
          saleSummary={saleSummary}
          onSwitchMobileTab={onSwitchMobileTab}
          baseCurrency={baseCurrency}
        />
      )}
    </>
  );
});

export default QuickPOSCart;
