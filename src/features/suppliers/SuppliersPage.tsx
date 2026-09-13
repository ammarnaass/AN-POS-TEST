import React, { useState, useMemo } from 'react';
import type { Supplier, SaleItem, Purchase } from '@/types';
import type { SupplierFormData, SupplierPaymentVoucherData, SupplierStatementEntry, EnrichedPurchase } from './types';

// Custom Hooks
import { useSupplierQueries } from './hooks/useSupplierQueries';
import { useSupplierMutations } from './hooks/useSupplierMutations';
import { useSupplierStats } from './hooks/useSupplierStats';
import { useSupplierFilters, SUPPLIERS_PER_PAGE } from './hooks/useSupplierFilters';

// Services
import {
  printPaymentVoucher,
  printSupplierStatement,
  printPayablesReport,
} from './services/supplierPrintService';
import { exportSuppliersToExcel } from './services/supplierExcelService';

// Components
import { SupplierHeader } from './components/SupplierHeader';
import { SupplierStatsCards } from './components/SupplierStatsCards';
import { SupplierTabs } from './components/SupplierTabs';
import { SupplierFilterBar } from './components/SupplierFilterBar';
import { SupplierTable } from './components/SupplierTable';
import { SupplierPagination } from './components/SupplierPagination';
import { SupplierInvoicesTable } from './components/SupplierInvoicesTable';
import { SupplierStatementView } from './components/SupplierStatementView';

// Modals
import { SupplierFormModal } from './modals/SupplierFormModal';
import { SupplierPaymentModal } from './modals/SupplierPaymentModal';
import { SupplierInvoiceModal } from './modals/SupplierInvoiceModal';
import { SupplierInvoiceViewModal } from './modals/SupplierInvoiceViewModal';
import { SupplierDeleteModal } from './modals/SupplierDeleteModal';
import SupplierInvoicePdfModal from './SupplierInvoicePdfModal';

export default function SuppliersPage() {
  // 1. Data Queries
  const {
    suppliers,
    products,
    purchases,
    purchaseItems,
    categories,
    settings,
    supplierEntries,
    enrichedPurchases,
    isLoading,
  } = useSupplierQueries();

  const currencySymbol = settings?.baseCurrency || 'دج';
  const shopName = settings?.shopName || 'المتجر';
  const invoicePrefix = settings?.invoicePrefix || 'INV';

  // 2. Modals & Local UI State
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({ name: '', phone: '', balance: 0 });

  // Purchase Invoice Creator Modal
  const [showPurchaseInvoice, setShowPurchaseInvoice] = useState<string | null>(null);
  const [showPdfInvoiceModal, setShowPdfInvoiceModal] = useState(false);
  const [selectedSupplierForPdf, setSelectedSupplierForPdf] = useState<string | undefined>(undefined);
  const [invoiceItems, setInvoiceItems] = useState<SaleItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // View Invoice Details Modal
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  // Statement State
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<string | null>(null);
  const [statementDateFrom, setStatementDateFrom] = useState('');
  const [statementDateTo, setStatementDateTo] = useState('');

  // Supplier Payment Modal
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'transfer' | 'baridimob'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [printReceiptOnPayment, setPrintReceiptOnPayment] = useState(true);

  // 3. Mutations
  const {
    addSupplierMutation,
    updateSupplierMutation,
    deleteSupplierMutation,
    purchaseMutation,
    paymentMutation,
  } = useSupplierMutations({
    invoicePrefix,
    onPaymentSuccess: (voucherData: SupplierPaymentVoucherData) => {
      if (printReceiptOnPayment && voucherData) {
        printPaymentVoucher(voucherData, shopName, currencySymbol);
      }
      setShowPayment(null);
      setPaymentAmount(0);
      setPaymentNote('');
    },
    onDeleteSuccess: () => {
      setSupplierToDelete(null);
    },
  });

  // 4. Statistics & Filters
  const stats = useSupplierStats(suppliers, purchases);
  const {
    activeTab,
    setActiveTab,
    filterTab,
    setFilterTab,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    invoiceSearchQuery,
    setInvoiceSearchQuery,
    filteredSuppliers,
    paginatedSuppliers,
    totalPages,
    totalItems,
  } = useSupplierFilters(suppliers);

  // Active supplier for payment
  const activePaymentSupplier = suppliers.find((s) => s.id === showPayment) || null;

  // Selected supplier for purchase invoice
  const selectedPurchaseSupplier = suppliers.find((s) => s.id === showPurchaseInvoice) || null;

  // Statement calculations
  const statementEntries: SupplierStatementEntry[] = useMemo(() => {
    if (!selectedSupplierForStatement) return [];

    let entries = supplierEntries
      .filter((e) => e.supplierId === selectedSupplierForStatement)
      .map((e) => ({
        id: e.id,
        date: e.date,
        type: 'purchase' as const,
        number: e.invoiceNumber,
        description: `فاتورة شراء #${e.invoiceNumber}`,
        debit: e.amount,
        credit: e.paidAmount,
        status: (e.remainingBalance === 0 ? 'paid' : e.paidAmount > 0 ? 'partial' : 'unpaid') as 'paid' | 'partial' | 'unpaid',
      }));

    if (statementDateFrom) {
      entries = entries.filter((e) => new Date(e.date) >= new Date(statementDateFrom));
    }
    if (statementDateTo) {
      entries = entries.filter((e) => new Date(e.date) <= new Date(statementDateTo + 'T23:59:59'));
    }

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return entries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, runningBalance };
    });
  }, [supplierEntries, selectedSupplierForStatement, statementDateFrom, statementDateTo]);

  const statementSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierForStatement) || null,
    [suppliers, selectedSupplierForStatement]
  );

  // 5. Handlers
  const handleOpenAddForm = () => {
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', balance: 0 });
    setShowSupplierForm(true);
  };

  const handleOpenEditForm = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      balance: supplier.balance || 0,
    });
    setShowSupplierForm(true);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingSupplier) {
      updateSupplierMutation.mutate({
        ...editingSupplier,
        name: formData.name,
        phone: formData.phone,
        balance: formData.balance,
      });
    } else {
      addSupplierMutation.mutate(formData);
    }

    setFormData({ name: '', phone: '', balance: 0 });
    setEditingSupplier(null);
    setShowSupplierForm(false);
  };

  const handleOpenPayment = (supplier: Supplier) => {
    setShowPayment(supplier.id);
    setPaymentAmount(supplier.balance > 0 ? supplier.balance : 0);
    setPaymentNote('');
  };

  const handlePaymentSubmit = () => {
    if (!activePaymentSupplier || paymentAmount <= 0) return;

    paymentMutation.mutate({
      supplierId: activePaymentSupplier.id,
      amount: paymentAmount,
      method: paymentMethod,
      note: paymentNote.trim(),
      supplierName: activePaymentSupplier.name,
      supplierPhone: activePaymentSupplier.phone,
    });
  };

  const handleConfirmPurchaseInvoice = () => {
    if (!showPurchaseInvoice || invoiceItems.length === 0) return;
    const total = invoiceItems.reduce((sum, item) => sum + (Number(item?.lineTotal) || 0), 0);

    purchaseMutation.mutate({
      supplierId: showPurchaseInvoice,
      items: invoiceItems,
      paidAmount,
      total,
    });

    setInvoiceItems([]);
    setPaidAmount(0);
    setProductSearchQuery('');
    setShowPurchaseInvoice(null);
  };

  const handlePrintStatement = () => {
    if (statementSupplier) {
      printSupplierStatement(
        statementSupplier,
        statementEntries,
        shopName,
        settings?.phone,
        currencySymbol
      );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* 1. Header with Global Actions */}
      <SupplierHeader
        onPrintPayablesReport={() => printPayablesReport(suppliers, stats.totalDebt, shopName, currencySymbol)}
        onExportExcel={() => exportSuppliersToExcel(filteredSuppliers, supplierEntries)}
        onImportPdfInvoice={() => {
          setSelectedSupplierForPdf(undefined);
          setShowPdfInvoiceModal(true);
        }}
        onAddSupplier={handleOpenAddForm}
      />

      {/* 2. Top Metric Cards */}
      <SupplierStatsCards
        stats={stats}
        currencySymbol={currencySymbol}
        totalPurchasesCount={purchases.length}
        onSelectDebtFilter={() => {
          setActiveTab('suppliers');
          setFilterTab('debt');
        }}
      />

      {/* 3. Navigation Tabs */}
      <SupplierTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        suppliersCount={suppliers.length}
        invoicesCount={purchases.length}
      />

      {/* 4. Tab 1: Suppliers Directory & Payables */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <SupplierFilterBar
            filterTab={filterTab}
            setFilterTab={setFilterTab}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            totalSuppliers={suppliers.length}
            debtSuppliersCount={stats.suppliersWithDebt}
            settledSuppliersCount={suppliers.length - stats.suppliersWithDebt}
          />

          <SupplierTable
            suppliers={paginatedSuppliers}
            supplierEntries={supplierEntries}
            isLoading={isLoading}
            currentPage={currentPage}
            itemsPerPage={SUPPLIERS_PER_PAGE}
            currencySymbol={currencySymbol}
            shopName={shopName}
            onOpenPurchase={(supplierId) => {
              setShowPurchaseInvoice(supplierId);
              setInvoiceItems([]);
              setPaidAmount(0);
            }}
            onOpenPayment={handleOpenPayment}
            onOpenStatement={(supplierId) => {
              setSelectedSupplierForStatement(supplierId);
              setActiveTab('statement');
            }}
            onEditSupplier={handleOpenEditForm}
            onDeleteSupplier={(supplier) => setSupplierToDelete(supplier)}
          />

          <SupplierPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={SUPPLIERS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* 5. Tab 2: Purchase Invoices */}
      {activeTab === 'invoices' && (
        <SupplierInvoicesTable
          purchases={enrichedPurchases}
          isLoading={isLoading}
          searchQuery={invoiceSearchQuery}
          setSearchQuery={setInvoiceSearchQuery}
          currencySymbol={currencySymbol}
          onViewInvoice={(invoice) => {
            const items = purchaseItems.filter((pi) => pi.purchaseId === invoice.id);
            setViewingInvoice({ ...invoice, items });
          }}
        />
      )}

      {/* 6. Tab 3: Account Statement */}
      {activeTab === 'statement' && (
        <SupplierStatementView
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierForStatement}
          onSelectSupplier={setSelectedSupplierForStatement}
          statementEntries={statementEntries}
          dateFrom={statementDateFrom}
          setDateFrom={setStatementDateFrom}
          dateTo={statementDateTo}
          setDateTo={setStatementDateTo}
          onPrintStatement={handlePrintStatement}
          currencySymbol={currencySymbol}
        />
      )}

      {/* 7. Modals */}
      <SupplierFormModal
        isOpen={showSupplierForm}
        onClose={() => {
          setShowSupplierForm(false);
          setEditingSupplier(null);
        }}
        onSubmit={handleSupplierSubmit}
        editingSupplier={editingSupplier}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={addSupplierMutation.isPending || updateSupplierMutation.isPending}
      />

      <SupplierInvoiceModal
        isOpen={!!showPurchaseInvoice}
        supplier={selectedPurchaseSupplier}
        onClose={() => {
          setShowPurchaseInvoice(null);
          setInvoiceItems([]);
          setPaidAmount(0);
        }}
        products={products}
        invoiceItems={invoiceItems}
        setInvoiceItems={setInvoiceItems}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        productSearchQuery={productSearchQuery}
        setProductSearchQuery={setProductSearchQuery}
        onConfirm={handleConfirmPurchaseInvoice}
        isPending={purchaseMutation.isPending}
        currencySymbol={currencySymbol}
      />

      <SupplierPaymentModal
        isOpen={!!showPayment}
        supplier={activePaymentSupplier}
        onClose={() => setShowPayment(null)}
        onSubmit={handlePaymentSubmit}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentNote={paymentNote}
        setPaymentNote={setPaymentNote}
        printReceiptOnPayment={printReceiptOnPayment}
        setPrintReceiptOnPayment={setPrintReceiptOnPayment}
        currencySymbol={currencySymbol}
        isPending={paymentMutation.isPending}
      />

      <SupplierInvoiceViewModal
        isOpen={!!viewingInvoice}
        invoice={viewingInvoice}
        onClose={() => setViewingInvoice(null)}
        currencySymbol={currencySymbol}
      />

      <SupplierDeleteModal
        isOpen={!!supplierToDelete}
        supplier={supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={() => {
          if (supplierToDelete) {
            deleteSupplierMutation.mutate(supplierToDelete.id);
          }
        }}
        isPending={deleteSupplierMutation.isPending}
        currencySymbol={currencySymbol}
      />

      {showPdfInvoiceModal && (
        <SupplierInvoicePdfModal
          open={showPdfInvoiceModal}
          onClose={() => {
            setShowPdfInvoiceModal(false);
            setSelectedSupplierForPdf(undefined);
          }}
          products={products as any}
          suppliers={suppliers}
          categories={categories as any}
          preselectedSupplierId={selectedSupplierForPdf}
        />
      )}
    </div>
  );
}
