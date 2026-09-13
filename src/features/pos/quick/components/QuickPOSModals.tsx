import React from 'react';
import type { Sale, CartItem } from '@/types';
import {
  SuccessModal,
  SuspendedOrdersModal,
  QuickCustomerModal,
  OpenSessionModal,
  FreeProductModal,
  ShortcutsGuideModal,
} from '@/features/pos/modals';

export interface QuickPOSModalsProps {
  // Success Modal
  showSuccessModal: boolean;
  onCloseSuccessModal: () => void;
  completedSale: Sale | null;

  // Suspended Orders Modal
  showHeldSalesModal: boolean;
  onCloseHeldSalesModal: () => void;
  suspendedOrders: any[];
  onResumeOrder: (orderId: string) => void;
  onDeleteOrder: (orderId: string) => void;

  // Customer Modal
  showAddCustomerModal: boolean;
  onCloseAddCustomerModal: () => void;
  onSelectCustomer: (id: string) => void;

  // Open Session Modal
  showOpenSessionModal: boolean;
  onCloseOpenSessionModal: () => void;
  allSessionsCount: number;

  // Free Product Modal
  showFreeProductModal: boolean;
  onCloseFreeProductModal: () => void;
  onAddCustomItem: (item: CartItem) => void;

  // Shortcuts Guide Modal
  showShortcutsModal: boolean;
  onCloseShortcutsModal: () => void;
}

export const QuickPOSModals: React.FC<QuickPOSModalsProps> = ({
  showSuccessModal,
  onCloseSuccessModal,
  completedSale,
  showHeldSalesModal,
  onCloseHeldSalesModal,
  suspendedOrders,
  onResumeOrder,
  onDeleteOrder,
  showAddCustomerModal,
  onCloseAddCustomerModal,
  onSelectCustomer,
  showOpenSessionModal,
  onCloseOpenSessionModal,
  allSessionsCount,
  showFreeProductModal,
  onCloseFreeProductModal,
  onAddCustomItem,
  showShortcutsModal,
  onCloseShortcutsModal,
}) => {
  return (
    <>
      {/* 1. نافذة نجاح البيع */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={onCloseSuccessModal}
        completedSale={completedSale}
      />

      {/* 2. نافذة الفواتير المعلقة */}
      <SuspendedOrdersModal
        isOpen={showHeldSalesModal}
        onClose={onCloseHeldSalesModal}
        orders={suspendedOrders}
        onResumeOrder={onResumeOrder}
        onDeleteOrder={onDeleteOrder}
      />

      {/* 3. نافذة إضافة عميل سريع */}
      <QuickCustomerModal
        isOpen={showAddCustomerModal}
        onClose={onCloseAddCustomerModal}
        onSelectCustomer={onSelectCustomer}
      />

      {/* 4. نافذة فتح جلسة الصندوق */}
      <OpenSessionModal
        isOpen={showOpenSessionModal}
        onClose={onCloseOpenSessionModal}
        existingSessionsCount={allSessionsCount}
      />

      {/* 5. نافذة المنتج الحر المخصص */}
      <FreeProductModal
        isOpen={showFreeProductModal}
        onClose={onCloseFreeProductModal}
        onAddCustomItem={onAddCustomItem}
      />

      {/* 6. دليل اختصارات لوحة المفاتيح F1-F12 */}
      <ShortcutsGuideModal
        isOpen={showShortcutsModal}
        onClose={onCloseShortcutsModal}
      />
    </>
  );
};
