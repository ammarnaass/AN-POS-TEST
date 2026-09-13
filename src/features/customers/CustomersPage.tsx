import React, { useState, useMemo } from 'react';
import type { Customer } from '@/types';
import type { CustomerFormData, PaymentVoucherData } from './types';
import { calculateCustomerStatement } from './services/customerStatementService';

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

// Components
import { CustomerHeader } from './components/CustomerHeader';
import { CustomerStatsCards } from './components/CustomerStatsCards';
import { CustomerFilterBar } from './components/CustomerFilterBar';
import { CustomerTable } from './components/CustomerTable';
import { CustomerPagination } from './components/CustomerPagination';

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

  // 2. Modals & Local UI State
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

  // Statement Modal State
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementFilterType, setStatementFilterType] = useState<'all' | 'sales' | 'payments'>('all');
  const [statementDateFrom, setStatementDateFrom] = useState('');
  const [statementDateTo, setStatementDateTo] = useState('');

  // Delete Confirmation State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCustomer) {
      updateCustomerMutation.mutate({
        ...editingCustomer,
        ...formData,
      });
    } else {
      addCustomerMutation.mutate(formData);
    }

    setFormData(initialFormData);
    setEditingCustomer(null);
    setShowForm(false);
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
      />

      <CustomerStatementModal
        isOpen={!!statementCustomer}
        customer={statementCustomer}
        onClose={() => setStatementCustomer(null)}
        onPrint={() => {
          if (statementCustomer) {
            printCustomerStatement(
              statementCustomer,
              statementEntries,
              settings?.shopName,
              settings?.phone,
              currencySymbol
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
    </div>
  );
}
