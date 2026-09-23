import React from 'react';
import type { Customer, Sale } from '@/types';
import type { InvoiceStatusToggleParams, AddCustomerDebtResult } from '../types';
import { POSCustomerSelectModal } from './POSCustomerSelectModal';
import { POSQuickCustomerModal } from './POSQuickCustomerModal';
import { POSDebtSettlementModal } from './POSDebtSettlementModal';
import { POSCustomerInvoicesModal } from './POSCustomerInvoicesModal';
import { POSAddCustomerDebtModal } from './POSAddCustomerDebtModal';

export interface POSCustomerDebtModalsProps {
  // Selection Modal
  showSelectModal: boolean;
  onCloseSelectModal: () => void;
  // Quick Add Modal
  showQuickAddModal: boolean;
  onCloseQuickAddModal: () => void;
  onOpenQuickAddModal: () => void;
  // Debt Settlement Modal
  showSettlementModal?: boolean;
  onCloseSettlementModal?: () => void;
  onOpenSettlementModal?: (customer: Customer) => void;
  // Direct Debt Addition Modal
  showAddDebtModal?: boolean;
  onCloseAddDebtModal?: () => void;
  onOpenAddDebtModal?: (customer: Customer) => void;
  onDebtAdded?: (result: AddCustomerDebtResult) => void;
  // Customer Invoices & Ledger Modal
  showInvoicesModal?: boolean;
  onCloseInvoicesModal?: () => void;
  onOpenInvoicesModal?: (customer?: Customer) => void;
  onRecallToCart?: (sale: Sale) => void;
  onFullReturn?: (sale: Sale) => void;
  onTogglePaymentStatus?: (params: InvoiceStatusToggleParams) => Promise<any>;
  // Shared Data & Callbacks
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  currentSessionId?: string | null;
  formatMoney?: (amount?: number | null) => string;
  currencySymbol?: string;
  shopName?: string;
}

export const POSCustomerDebtModals: React.FC<POSCustomerDebtModalsProps> = ({
  showSelectModal,
  onCloseSelectModal,
  showQuickAddModal,
  onCloseQuickAddModal,
  onOpenQuickAddModal,
  showSettlementModal = false,
  onCloseSettlementModal,
  onOpenSettlementModal,
  showAddDebtModal = false,
  onCloseAddDebtModal,
  onOpenAddDebtModal,
  onDebtAdded,
  showInvoicesModal = false,
  onCloseInvoicesModal,
  onOpenInvoicesModal,
  onRecallToCart,
  onFullReturn,
  onTogglePaymentStatus,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  currentSessionId,
  formatMoney,
  currencySymbol = 'دج',
  shopName = 'نقطة البيع',
}) => {
  const selectedCustomerObj = customers.find((c) => c.id === selectedCustomerId) || null;

  return (
    <>
      {/* 1. Customer Selection Modal */}
      <POSCustomerSelectModal
        isOpen={showSelectModal}
        onClose={onCloseSelectModal}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={onSelectCustomer}
        onOpenAddCustomer={onOpenQuickAddModal}
        onOpenCustomerInvoices={(cust) => {
          if (cust) onSelectCustomer(cust.id);
          onOpenInvoicesModal?.(cust);
        }}
        onOpenSettlementModal={(cust) => {
          onSelectCustomer(cust.id);
          onOpenSettlementModal?.(cust);
        }}
        onOpenAddDebtModal={(cust) => {
          onSelectCustomer(cust.id);
          onOpenAddDebtModal?.(cust);
        }}
        formatMoney={formatMoney}
        currencySymbol={currencySymbol}
      />

      {/* 2. Quick Customer Registration Modal */}
      <POSQuickCustomerModal
        isOpen={showQuickAddModal}
        onClose={onCloseQuickAddModal}
        onSelectCustomer={onSelectCustomer}
      />

      {/* 3. POS Debt Settlement Modal */}
      {showSettlementModal && onCloseSettlementModal && (
        <POSDebtSettlementModal
          isOpen={showSettlementModal}
          onClose={onCloseSettlementModal}
          customer={selectedCustomerObj}
          currentSessionId={currentSessionId}
          currencySymbol={currencySymbol}
          shopName={shopName}
        />
      )}

      {/* 4. Direct Customer Debt Addition Modal */}
      {showAddDebtModal && onCloseAddDebtModal && (
        <POSAddCustomerDebtModal
          isOpen={showAddDebtModal}
          onClose={onCloseAddDebtModal}
          customer={selectedCustomerObj}
          currentSessionId={currentSessionId}
          onDebtAdded={onDebtAdded}
          currencySymbol={currencySymbol}
          shopName={shopName}
        />
      )}

      {/* 5. Customer Invoices, Debts & Statement Modal */}
      {showInvoicesModal && onCloseInvoicesModal && (
        <POSCustomerInvoicesModal
          isOpen={showInvoicesModal}
          onClose={onCloseInvoicesModal}
          customer={selectedCustomerObj}
          customers={customers}
          onSelectCustomer={(c) => onSelectCustomer(c.id)}
          onRecallToCart={onRecallToCart}
          onFullReturn={onFullReturn}
          onTogglePaymentStatus={onTogglePaymentStatus}
          onOpenSettlementModal={onOpenSettlementModal}
          onOpenAddDebtModal={onOpenAddDebtModal}
          currencySymbol={currencySymbol}
        />
      )}
    </>
  );
};
