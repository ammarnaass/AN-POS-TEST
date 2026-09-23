import React, { useState, useMemo } from 'react';
import type { Customer, Sale } from '@/types';
import type { CustomerFormData, PaymentVoucherData } from './types';
import { calculateCustomerStatement, calculateCustomerDebtAging } from './services/customerStatementService';

// Custom Hooks
import { useCustomerQueries } from './hooks/useCustomerQueries';
import { useCustomerMutations } from './hooks/useCustomerMutations';
import { useCustomerStats } from './hooks/useCustomerStats';
import { useCustomerFilters } from './hooks/useCustomerFilters';

// Services
import {
  printPaymentVoucher,
  printCustomerStatement,
  printDebtsReport,
} from './services/customerPrintService';
import {
  exportCustomersToExcel,
  parseCustomersFromExcel,
} from './services/customerExcelService';

import { Users, BookOpen } from 'lucide-react';

// POS Debt imports for invoice details, settlement, debt addition, and printing
import {
  POSInvoiceDetailsModal,
  POSAddCustomerDebtModal,
  settleSpecificInvoiceDebtRecord,
  printPOSDebtAdditionSlip,
} from '@/features/pos/debt';
import type { AddCustomerDebtResult } from '@/features/pos/debt/types';
import { useInvoiceStatusToggle } from '@/features/pos/debt/hooks/useInvoiceStatusToggle';
import { printDocument } from '@/services/print/printService';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';

// Components
import { CustomerHeader } from './components/CustomerHeader';
import { CustomerStatsCards } from './components/CustomerStatsCards';
import { CustomerFilterBar } from './components/CustomerFilterBar';
import { CustomerTable } from './components/CustomerTable';
import { CustomerPagination } from './components/CustomerPagination';
import { DebtAlertsCard } from './components/DebtAlertsCard';
import { CustomerLedgerView } from './components/CustomerLedgerView';

// Modals
import { CustomerFormModal } from './modals/CustomerFormModal';
import { CustomerPaymentModal } from './modals/CustomerPaymentModal';
import { CustomerStatementModal } from './modals/CustomerStatementModal';
import { CustomerDeleteModal } from './modals/CustomerDeleteModal';

const initialFormData: CustomerFormData = {
  name: '',
  phone: '',
  creditLimit: 0,
  balance: 0,
  customerType: 'retail',
  rc: '',
  nif: '',
  nis: '',
  address: '',
};

export default function CustomersPage() {
  // 1. Data Queries
  const { customers, sales, payments, settings, isLoading } = useCustomerQueries();
  const currencySymbol: string = (typeof settings?.currency === 'string' ? settings.currency : '') || 'دج';
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // 2. Modals & Local UI State
  const [activePageTab, setActivePageTab] = useState<'directory' | 'ledger'>('directory');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  // Payment Modal State
  const [showPaymentId, setShowPaymentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNote, setPaymentNote] = useState('');
  const [printReceiptOnPayment, setPrintReceiptOnPayment] = useState(true);

  // Add Direct Debt Modal State
  const [showAddDebtCustomer, setShowAddDebtCustomer] = useState<Customer | null>(null);

  // Statement Modal State
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementFilterType, setStatementFilterType] = useState<'all' | 'sales' | 'payments'>('all');
  const [statementDateFrom, setStatementDateFrom] = useState('');
  const [statementDateTo, setStatementDateTo] = useState('');

  // Delete Confirmation State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Invoice Details Modal State (from Ledger)
  const [ledgerInvoiceDetails, setLedgerInvoiceDetails] = useState<Sale | null>(null);
  const ledgerInvoiceCustomer = ledgerInvoiceDetails?.customerId
    ? customers.find((c) => c.id === ledgerInvoiceDetails.customerId) || null
    : null;

  // Invoice Status Toggle Hook
  const { togglePaymentStatus } = useInvoiceStatusToggle();

  // 3. Mutations
  const {
    addCustomerMutation,
    updateCustomerMutation,
    deleteCustomerMutation,
    addPaymentMutation,
    importCustomersMutation,
  } = useCustomerMutations({
    onAddPaymentSuccess: (voucherData: PaymentVoucherData) => {
      try {
        if (printReceiptOnPayment && voucherData) {
          printPaymentVoucher(voucherData, settings?.shopName, currencySymbol);
        }
      } catch (err) {
        console.warn('Error while printing payment voucher:', err);
      }
      setShowPaymentId(null);
      setPaymentAmount(0);
      setPaymentNote('');
      setStatementCustomer((prev) => (prev && voucherData ? { ...prev, balance: voucherData.newBalance } : prev));
    },
    onDeleteSuccess: () => {
      setCustomerToDelete(null);
    },
  });

  // 4. Statistics & Filters
  const stats = useCustomerStats(customers, payments);
  const {
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    filteredCustomers,
    paginatedCustomers,
    totalPages,
    totalItems,
  } = useCustomerFilters(customers);

  // Helper: customer sales & payments
  const getCustomerSales = (customerId: string) =>
    sales.filter((s) => s.customerId === customerId && s.type === 'sale');

  const getCustomerPayments = (customerId: string) =>
    payments.filter((p) => (p as any).customerId === customerId || (p as any).partyId === customerId || (p as any).party_id === customerId);

  // Customer for active payment
  const activePaymentCustomer = customers.find((c) => c.id === showPaymentId) || null;

  // 5. Statement Entries Computation via Accounting Service
  const statementCalculation = useMemo(() => {
    if (!statementCustomer) return null;
    const custSales = sales.filter((s) => s.customerId === statementCustomer.id);
    const custPayments = getCustomerPayments(statementCustomer.id);
    return calculateCustomerStatement(
      statementCustomer,
      custSales,
      custPayments,
      statementFilterType,
      statementDateFrom,
      statementDateTo
    );
  }, [statementCustomer, sales, payments, statementFilterType, statementDateFrom, statementDateTo]);

  const statementEntries = statementCalculation?.entries || [];

  // 6. Action Handlers
  const handleOpenAddForm = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setShowForm(true);
  };

  const handleOpenEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      creditLimit: customer.creditLimit || 0,
      balance: customer.balance || 0,
      customerType: customer.customerType || 'retail',
      rc: customer.rc || '',
      nif: customer.nif || '',
      nis: customer.nis || '',
      address: customer.address || '',
    });
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingCustomer) {
        await updateCustomerMutation.mutateAsync({
          ...editingCustomer,
          ...formData,
        });
      } else {
        await addCustomerMutation.mutateAsync(formData);
      }

      setFormData(initialFormData);
      setEditingCustomer(null);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to save customer:', err);
    }
  };

  const handleOpenPayment = (customer: Customer) => {
    setShowPaymentId(customer.id);
    setPaymentAmount(customer.balance > 0 ? customer.balance : 0);
    setPaymentNote('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
  };

  const handlePaymentSubmit = () => {
    if (!activePaymentCustomer || paymentAmount <= 0) return;

    addPaymentMutation.mutate({
      customerId: activePaymentCustomer.id,
      amount: paymentAmount,
      currentBalance: activePaymentCustomer.balance,
      method: paymentMethod,
      date: paymentDate,
      note: paymentNote.trim(),
      customerName: activePaymentCustomer.name,
      customerPhone: activePaymentCustomer.phone,
    });
  };

  const handleOpenAddDebt = (customer?: Customer) => {
    if (customer) {
      setShowAddDebtCustomer(customer);
    } else if (customers.length > 0) {
      setShowAddDebtCustomer(customers[0]);
    } else {
      addNotification({
        title: 'تنبيه',
        message: 'يجب تسجيل زبون أولاً لإضافة دين عليه.',
        type: 'warning',
      });
    }
  };

  const handleDebtAdded = (result: AddCustomerDebtResult) => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['payments'] });

    try {
      printPOSDebtAdditionSlip(
        result,
        result.customerName,
        showAddDebtCustomer?.phone,
        settings?.shopName,
        currencySymbol
      );
    } catch (err) {
      console.warn('Error while printing debt addition slip:', err);
    }

    setShowAddDebtCustomer(null);

    addNotification({
      title: 'تم قيد الدين بنجاح',
      message: `تمت إضافة دين بقيمة ${result.addedAmount.toLocaleString()} ${currencySymbol} على حساب الزبون "${result.customerName}". الرصيد الجديد: ${result.newBalance.toLocaleString()} ${currencySymbol}`,
      type: 'success',
    });
  };

  const handleExportExcel = () => {
    exportCustomersToExcel(filteredCustomers, getCustomerSales);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseCustomersFromExcel(file);
      if (imported.length > 0) {
        importCustomersMutation.mutate(imported);
      }
    } catch (err) {
      console.error('Error importing customers:', err);
    }
  };

  const handlePrintDebts = () => {
    printDebtsReport(customers, stats.totalDebt, settings?.shopName, currencySymbol);
  };

  // Handle opening invoice details from ledger
  const handleOpenInvoiceDetails = (sale: Sale) => {
    setLedgerInvoiceDetails(sale);
  };

  // Handle printing a single invoice from ledger
  const handlePrintSingleInvoice = async (sale: Sale) => {
    try {
      const docType = sale.docType || 'receipt';
      await printDocument(sale.id, docType);
    } catch (err) {
      console.warn('Error printing invoice from ledger:', err);
    }
  };

  // Handle settling a specific invoice debt from ledger
  const handleSettleSpecificInvoice = async (sale: Sale, remainingDebt: number) => {
    if (!sale.customerId) {
      addNotification({
        title: 'تنبيه',
        message: 'لا يمكن تسديد فاتورة غير مرتبطة بزبون مسجل.',
        type: 'warning',
      });
      return;
    }
    try {
      const customer = customers.find((c) => c.id === sale.customerId);
      const result = await settleSpecificInvoiceDebtRecord({
        saleId: sale.id,
        customerId: sale.customerId,
        customerName: customer?.name || sale.customerName || 'زبون',
        amount: remainingDebt,
        paymentMethod: 'cash',
        note: `تسديد فاتورة #${sale.number} من دفتر حسابات العملاء`,
      });

      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['cash_sessions'] });

      addNotification({
        title: 'تم تسديد الفاتورة بنجاح',
        message: `تم سداد ${remainingDebt.toLocaleString()} ${currencySymbol} من الفاتورة #${sale.number}. الرصيد المتبقي: ${result.newBalance.toLocaleString()} ${currencySymbol}`,
        type: 'success',
      });
    } catch (err: any) {
      addNotification({
        title: 'خطأ في تسديد الفاتورة',
        message: err?.message || 'تعذر تسديد هذه الفاتورة.',
        type: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-12">
      {/* 1. Header with Global Actions */}
      <CustomerHeader
        onOpenAddModal={handleOpenAddForm}
        onExportExcel={handleExportExcel}
        onImportExcel={handleImportExcel}
        onPrintDebtsReport={handlePrintDebts}
      />

      {/* View Switcher Tabs: Customer Directory vs Debt & Movement Ledger */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-container-low border border-outline-variant/30 rounded-2xl w-fit">
        <button
          onClick={() => setActivePageTab('directory')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePageTab === 'directory'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>دليل العملاء والأرصدة</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activePageTab === 'directory'
                ? 'bg-white/20 text-on-primary'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {customers.length}
          </span>
        </button>

        <button
          onClick={() => setActivePageTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePageTab === 'ledger'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>دفتر حسابات الديون والحركات المالية</span>
          {stats.customersWithDebt > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activePageTab === 'ledger'
                  ? 'bg-red-500 text-white'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {stats.customersWithDebt} عليهم ديون
            </span>
          )}
        </button>
      </div>

      {activePageTab === 'directory' ? (
        <>
          {/* 2. Top Metric & Health Cards */}
          <CustomerStatsCards stats={stats} currencySymbol={currencySymbol} />

          {/* 3. Main Data Card: Filters & Customer Table */}
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-5 shadow-2xs space-y-4">
            <CustomerFilterBar
              filterTab={filterTab}
              setFilterTab={setFilterTab}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              totalCustomers={customers.length}
              debtCount={stats.customersWithDebt}
              exceededCount={stats.exceededLimitCount}
              settledCount={customers.length - stats.customersWithDebt}
            />

            <CustomerTable
              customers={paginatedCustomers}
              currencySymbol={currencySymbol}
              storeName={settings?.shopName}
              getCustomerSales={getCustomerSales}
              onOpenPayment={handleOpenPayment}
              onOpenAddDebt={handleOpenAddDebt}
              onOpenStatement={(customer) => setStatementCustomer(customer)}
              onEditCustomer={handleOpenEditForm}
              onDeleteCustomer={(customer) => setCustomerToDelete(customer)}
              isLoading={isLoading}
              currentPage={currentPage}
            />

            <CustomerPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </>
      ) : (
        <>
          <DebtAlertsCard
            customers={customers}
            sales={sales}
            currencySymbol={currencySymbol}
          />
          <CustomerLedgerView
            customers={customers}
            sales={sales}
            payments={payments}
            currencySymbol={currencySymbol}
            storeName={settings?.shopName}
            onOpenPayment={handleOpenPayment}
            onOpenAddDebt={handleOpenAddDebt}
            onOpenStatement={(customer) => setStatementCustomer(customer)}
            onPrintDebtsReport={handlePrintDebts}
            onOpenInvoiceDetails={handleOpenInvoiceDetails}
            onPrintInvoice={handlePrintSingleInvoice}
            onSettleSpecificInvoice={handleSettleSpecificInvoice}
          />
        </>
      )}

      {/* 4. Modals */}
      <CustomerFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingCustomer(null);
        }}
        onSubmit={handleFormSubmit}
        editingCustomer={editingCustomer}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={addCustomerMutation.isPending || updateCustomerMutation.isPending}
      />

      <CustomerPaymentModal
        isOpen={!!showPaymentId}
        customer={activePaymentCustomer}
        onClose={() => setShowPaymentId(null)}
        onSubmit={handlePaymentSubmit}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentDate={paymentDate}
        setPaymentDate={setPaymentDate}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        printReceiptOnPayment={printReceiptOnPayment}
        setPrintReceiptOnPayment={setPrintReceiptOnPayment}
        currencySymbol={currencySymbol}
        isPending={addPaymentMutation.isPending}
        customerSales={activePaymentCustomer ? sales.filter((s) => s.customerId === activePaymentCustomer.id) : []}
      />

      <CustomerStatementModal
        isOpen={!!statementCustomer}
        customer={statementCustomer}
        onClose={() => setStatementCustomer(null)}
        customerSales={statementCustomer ? sales.filter((s) => s.customerId === statementCustomer.id) : []}
        storeName={settings?.shopName}
        onPrint={() => {
          if (statementCustomer) {
            const custSales = sales.filter((s) => s.customerId === statementCustomer.id);
            const aging = calculateCustomerDebtAging(custSales);
            printCustomerStatement(
              statementCustomer,
              statementEntries,
              settings?.shopName,
              settings?.phone,
              currencySymbol,
              aging
            );
          }
        }}
        onOpenPayment={(cust) => {
          setStatementCustomer(null);
          handleOpenPayment(cust);
        }}
        entries={statementEntries}
        filterType={statementFilterType}
        setFilterType={setStatementFilterType}
        dateFrom={statementDateFrom}
        setDateFrom={setStatementDateFrom}
        dateTo={statementDateTo}
        setDateTo={setStatementDateTo}
        currencySymbol={currencySymbol}
      />

      <CustomerDeleteModal
        isOpen={!!customerToDelete}
        customer={customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={() => {
          if (customerToDelete) {
            deleteCustomerMutation.mutate(customerToDelete.id);
          }
        }}
        isPending={deleteCustomerMutation.isPending}
        currencySymbol={currencySymbol}
      />

      {/* Add Direct Debt Modal */}
      {showAddDebtCustomer && (
        <POSAddCustomerDebtModal
          isOpen={!!showAddDebtCustomer}
          onClose={() => setShowAddDebtCustomer(null)}
          customer={showAddDebtCustomer}
          onDebtAdded={handleDebtAdded}
          currencySymbol={currencySymbol}
          shopName={settings?.shopName}
        />
      )}

      {/* Invoice Details Modal (from Ledger) */}
      {ledgerInvoiceDetails && (
        <POSInvoiceDetailsModal
          isOpen={!!ledgerInvoiceDetails}
          onClose={() => setLedgerInvoiceDetails(null)}
          sale={ledgerInvoiceDetails}
          customer={ledgerInvoiceCustomer}
          onTogglePaymentStatus={async (params) => {
            const result = await togglePaymentStatus(params);
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            setLedgerInvoiceDetails(null);
            return result;
          }}
          onPrintReceipt={handlePrintSingleInvoice}
          onSettleInvoiceDebt={(sale, remainingDebt) => {
            setLedgerInvoiceDetails(null);
            handleSettleSpecificInvoice(sale, remainingDebt);
          }}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}
