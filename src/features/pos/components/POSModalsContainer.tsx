import React from 'react';
import type { POSModalsState } from '../hooks/usePOSModalsState';
import type { CartItem, Product, Customer, Supplier, Sale, CashSession, SuspendedOrder, Settings, User } from '@/types';
import type { POSSettings } from '../hooks/usePOSData';
import type { POSLayout, ScreenResolution, ResolutionScaleMode } from '../store/usePOSSessionStore';
import { v4 as createId } from 'uuid';
import { db } from '@/infrastructure/database/dexie/db';
import { useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/store/cartStore';
import { useNotificationStore } from '@/store/notificationStore';
import {
  PaymentModal,
  SuccessModal,
  ShortcutsGuideModal,
  FreeProductModal,
  QuickCustomerModal,
  CustomerSelectModal,
  SuspendedOrdersModal,
  ReturnSaleModal,
  SessionWarningModal,
  OpenSessionModal,
  DiscountModal,
  AdvancedFiltersModal,
  CustomizeLayoutModal,
  SaveAsProformaModal,
  SaveAsOrderModal,
  QuickProductModal,
  TouchKeypadModal,
} from '../modals';

export interface POSModalsContainerProps {
  modals: POSModalsState;
  cart: CartItem[];
  saleSummary: {
    subtotal: number;
    discountAmount: number;
    tvaAmount: number;
    total: number;
  };
  paymentMethod: any;
  setPaymentMethod: (m: any) => void;
  paidAmount: number;
  setPaidAmount: (a: number) => void;
  selectedCustomer: string;
  setSelectedCustomer: (id: string) => void;
  customers: Customer[];
  products: Product[];
  suppliers: Supplier[];
  availableCategories: { id: string; name: string }[];
  suspendedOrders: SuspendedOrder[];
  sales: Sale[];
  allSessions: CashSession[];
  discount: number;
  setDiscount: (d: number) => void;
  discountType: 'percent' | 'amount';
  setDiscountType: (t: 'percent' | 'amount') => void;
  posLayout: POSLayout;
  setPosLayout: (l: POSLayout) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (m: 'grid' | 'list') => void;
  showProductImages: boolean;
  setShowProductImages: (v: boolean) => void;
  uiZoom: number;
  setUiZoom: (z: number) => void;
  screenResolution: ScreenResolution;
  setScreenResolution: (r: ScreenResolution) => void;
  customResolution: { width: number; height: number };
  setCustomResolution: (c: { width: number; height: number }) => void;
  resolutionScaleMode: ResolutionScaleMode;
  setResolutionScaleMode: (m: ResolutionScaleMode) => void;
  posSettings: POSSettings;
  settings?: Settings;
  currentUser?: User | null;
  filterCategory: string;
  setFilterCategory: (c: string) => void;
  filterSupplier: string;
  setFilterSupplier: (s: string) => void;
  filterStockStatus: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock';
  setFilterStockStatus: (st: 'all' | 'in_stock' | 'out_of_stock' | 'low_stock') => void;
  isFeaturedOnly: boolean;
  setIsFeaturedOnly: (f: boolean) => void;
  onClearAllFilters: () => void;
  onConfirmPayment: (paid: number, custId: string, method: string) => Promise<void>;
  isSalePending: boolean;
  onAddProduct: (product: Product) => void;
  onResumeOrder: (order: SuspendedOrder) => void;
  onDeleteSuspendedOrder: (id: string) => void;
  onSelectReturnSale: (sale: Sale) => void;
  onKeypadPress: (key: string) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  onUpdateQty: (productId: string, qty: number) => void;
  formatMoney: (val: number | null | undefined) => string;
}

export const POSModalsContainer: React.FC<POSModalsContainerProps> = ({
  modals,
  cart,
  saleSummary,
  paymentMethod,
  setPaymentMethod,
  paidAmount,
  setPaidAmount,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  products,
  suppliers,
  availableCategories,
  suspendedOrders,
  sales,
  allSessions,
  discount,
  setDiscount,
  discountType,
  setDiscountType,
  posLayout,
  setPosLayout,
  viewMode,
  setViewMode,
  showProductImages,
  setShowProductImages,
  uiZoom,
  setUiZoom,
  screenResolution,
  setScreenResolution,
  customResolution,
  setCustomResolution,
  resolutionScaleMode,
  setResolutionScaleMode,
  posSettings,
  settings,
  currentUser,
  filterCategory,
  setFilterCategory,
  filterSupplier,
  setFilterSupplier,
  filterStockStatus,
  setFilterStockStatus,
  isFeaturedOnly,
  setIsFeaturedOnly,
  onClearAllFilters,
  onConfirmPayment,
  isSalePending,
  onAddProduct,
  onResumeOrder,
  onDeleteSuspendedOrder,
  onSelectReturnSale,
  onKeypadPress,
  selectedItemId,
  setSelectedItemId,
  onUpdateQty,
  formatMoney,
}) => {
  const queryClient = useQueryClient();
  const clearCart = useCartStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const tvaRate = Number(settings?.tvaRate ?? (settings as any)?.tva_rate ?? 0);

  return (
    <>
      {/* 1. Complete Payment Modal */}
      <PaymentModal
        isOpen={modals.showPaymentModal}
        onClose={() => modals.setShowPaymentModal(false)}
        total={saleSummary.total}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        selectedCustomer={selectedCustomer}
        setSelectedCustomer={setSelectedCustomer}
        customers={customers}
        onOpenAddCustomer={() => modals.setShowAddCustomer(true)}
        onConfirmPayment={onConfirmPayment}
        isPending={isSalePending}
        allowCardPayment={posSettings.allowCardPayment}
        allowTransferPayment={posSettings.allowTransferPayment}
      />

      {/* 2. Payment Success Modal */}
      <SuccessModal
        isOpen={modals.showSuccessModal}
        onClose={() => modals.setShowSuccessModal(false)}
        completedSale={modals.completedSale}
      />

      {/* 3. Keyboard Shortcuts Guide Modal */}
      <ShortcutsGuideModal
        isOpen={modals.showShortcutsModal}
        onClose={() => modals.setShowShortcutsModal(false)}
      />

      {/* 4. Free Product Modal (F8) */}
      <FreeProductModal
        isOpen={modals.showFreeProductModal}
        onClose={() => modals.setShowFreeProductModal(false)}
        onAddCustomItem={(item) => {
          addItem(item);
          addNotification({
            title: 'تمت إضافة منتج حر',
            message: `${item.name} بمبلغ ${formatMoney(item.unitPrice)} دج`,
            type: 'success',
          });
        }}
      />

      {/* 5. Quick Add Customer Modal */}
      <QuickCustomerModal
        isOpen={modals.showAddCustomer}
        onClose={() => modals.setShowAddCustomer(false)}
        onSelectCustomer={(id) => setSelectedCustomer(id)}
      />

      {/* 5b. Customer Selection Modal */}
      <CustomerSelectModal
        isOpen={modals.showCustomerSelect}
        onClose={() => modals.setShowCustomerSelect(false)}
        customers={customers}
        selectedCustomerId={selectedCustomer}
        onSelectCustomer={(id) => setSelectedCustomer(id)}
        onOpenAddCustomer={() => modals.setShowAddCustomer(true)}
        formatMoney={formatMoney}
      />

      {/* 6. Suspended Orders Modal */}
      <SuspendedOrdersModal
        isOpen={modals.showSuspended}
        onClose={() => modals.setShowSuspended(false)}
        orders={suspendedOrders}
        onResumeOrder={onResumeOrder}
        onDeleteOrder={onDeleteSuspendedOrder}
      />

      {/* 7. Return Sale Selection Modal */}
      <ReturnSaleModal
        isOpen={modals.showReturnSaleModal}
        onClose={() => modals.setShowReturnSaleModal(false)}
        sales={sales}
        onSelectReturnSale={onSelectReturnSale}
      />

      {/* 8. Session Warning Modal */}
      <SessionWarningModal
        isOpen={modals.showSessionWarning}
        onClose={() => modals.setShowSessionWarning(false)}
        onOpenSessionRequested={() => modals.setShowOpenSession(true)}
      />

      {/* 9. Open Session Modal */}
      <OpenSessionModal
        isOpen={modals.showOpenSession}
        onClose={() => modals.setShowOpenSession(false)}
        existingSessionsCount={allSessions.length}
      />

      {/* 10. Discount & Adjustment Modal */}
      <DiscountModal
        isOpen={modals.showDiscountModal}
        onClose={() => modals.setShowDiscountModal(false)}
        discount={discount}
        setDiscount={setDiscount}
        discountType={discountType}
        setDiscountType={setDiscountType}
      />

      {/* 11. Advanced Filters Modal */}
      <AdvancedFiltersModal
        isOpen={modals.showFiltersModal}
        onClose={() => modals.setShowFiltersModal(false)}
        productsCount={products.length}
        availableCategories={availableCategories}
        suppliers={suppliers}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterSupplier={filterSupplier}
        setFilterSupplier={setFilterSupplier}
        filterStockStatus={filterStockStatus}
        setFilterStockStatus={setFilterStockStatus}
        isFeaturedOnly={isFeaturedOnly}
        setIsFeaturedOnly={setIsFeaturedOnly}
        onClearAll={onClearAllFilters}
      />

      {/* 12. Customize Layout Modal */}
      <CustomizeLayoutModal
        isOpen={modals.showCustomizeModal}
        onClose={() => modals.setShowCustomizeModal(false)}
        posLayout={posLayout}
        setPosLayout={setPosLayout}
        viewMode={viewMode}
        setViewMode={setViewMode}
        showProductImages={showProductImages}
        setShowProductImages={setShowProductImages}
        uiZoom={uiZoom}
        setUiZoom={setUiZoom}
        screenResolution={screenResolution}
        setScreenResolution={setScreenResolution}
        customResolution={customResolution}
        setCustomResolution={setCustomResolution}
        resolutionScaleMode={resolutionScaleMode}
        setResolutionScaleMode={setResolutionScaleMode}
      />

      {/* 13. Save as Proforma / Quotation Modal */}
      <SaveAsProformaModal
        isOpen={modals.showSaveAsProformaModal}
        onClose={() => modals.setShowSaveAsProformaModal(false)}
        onConfirm={async () => {
          const saleId = createId();
          const proformaSale: Sale = {
            id: saleId,
            number: `PRF-${Date.now().toString().slice(-6)}`,
            type: 'facture',
            status: 'draft',
            items: cart.map((i) => ({
              productId: i.productId,
              name: i.name,
              qty: i.qty,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal,
            })),
            customerId: selectedCustomer || undefined,
            subtotal: saleSummary.subtotal,
            discount: saleSummary.discountAmount,
            discountType,
            tva: saleSummary.tvaAmount,
            tvaRate,
            total: saleSummary.total,
            paidAmount: 0,
            changeDue: 0,
            paymentMethod: 'cash',
            cashierId: currentUser?.id || 'cashier',
            cashierName: currentUser?.name || 'الكاشير',
            notes: 'فاتورة مبدئية / عرض أسعار',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await db.sales.add(proformaSale);
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          clearCart();
          addNotification({ title: 'تم الحفظ', message: 'تم حفظ الفاتورة المبدئية بنجاح', type: 'success' });
        }}
      />

      {/* 14. Save as Order Modal */}
      <SaveAsOrderModal
        isOpen={modals.showSaveAsOrderModal}
        onClose={() => modals.setShowSaveAsOrderModal(false)}
        onConfirm={async () => {
          const saleId = createId();
          const orderSale: Sale = {
            id: saleId,
            number: `ORD-${Date.now().toString().slice(-6)}`,
            type: 'bon',
            status: 'draft',
            items: cart.map((i) => ({
              productId: i.productId,
              name: i.name,
              qty: i.qty,
              unitPrice: i.unitPrice,
              lineTotal: i.lineTotal,
            })),
            customerId: selectedCustomer || undefined,
            subtotal: saleSummary.subtotal,
            discount: saleSummary.discountAmount,
            discountType,
            tva: saleSummary.tvaAmount,
            tvaRate,
            total: saleSummary.total,
            paidAmount: 0,
            changeDue: 0,
            paymentMethod: 'cash',
            cashierId: currentUser?.id || 'cashier',
            cashierName: currentUser?.name || 'الكاشير',
            notes: 'طلبية زبون معلقة للتجهيز',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await db.sales.add(orderSale);
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          clearCart();
          addNotification({ title: 'تم الحفظ', message: 'تم تسجيل طلبيّة الزبون بنجاح', type: 'success' });
        }}
      />

      {/* 15. Quick Add Product Modal */}
      <QuickProductModal
        isOpen={modals.showAddProduct}
        onClose={() => modals.setShowAddProduct(false)}
        onProductCreatedAndAdded={(product) => {
          onAddProduct(product);
        }}
      />

      {/* 16. Touch Virtual Numpad / Keypad Modal */}
      <TouchKeypadModal
        isOpen={modals.showKeypad}
        onClose={() => modals.setShowKeypad(false)}
        inputVal={modals.keypadInput}
        target={modals.keypadTarget}
        onTargetChange={(t) => {
          modals.setKeypadTarget(t);
          if (t === 'paid') modals.setKeypadInput(String(paidAmount || saleSummary.total || ''));
          else if (t === 'discount') modals.setKeypadInput(String(discount || ''));
          else if (t === 'qty') {
            const it = cart.find((c) => c.productId === selectedItemId) || cart[cart.length - 1];
            modals.setKeypadInput(String(it?.qty || '1'));
          }
        }}
        onKeyPress={onKeypadPress}
        targetItemName={
          modals.keypadTarget === 'qty'
            ? (cart.find((c) => c.productId === selectedItemId) || cart[cart.length - 1])?.name
            : undefined
        }
        totalAmount={saleSummary.total}
        onApplyExactTotal={() => {
          setPaidAmount(saleSummary.total);
          modals.setKeypadInput(String(saleSummary.total));
        }}
        onQuickIncrement={(inc) => {
          const current = Number(modals.keypadInput) || 0;
          const next = current + inc;
          modals.setKeypadInput(String(next));
          if (modals.keypadTarget === 'qty') {
            const targetId = selectedItemId ?? cart[cart.length - 1]?.productId;
            if (targetId) {
              const it = cart.find((c) => c.productId === targetId);
              if (it && next > 0) onUpdateQty(it.productId, next);
            }
          } else if (modals.keypadTarget === 'paid') {
            setPaidAmount(next);
          }
        }}
      />
    </>
  );
};
