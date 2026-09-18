import { useState, useMemo, lazy, Suspense } from 'react';
import type { Product } from '@/types';
import { generateId } from '@/utils';
import { useBarcodeScanner } from '@/features/barcode/useBarcodeScanner';
import { useInventoryData } from './hooks/useInventoryData';
import { useInventoryFilter, getStockStatus, isExpiringSoon } from './hooks/useInventoryFilter';
import { useProductFormState, emptyProduct, type FormErrors } from './hooks/useProductFormState';

// Modular Presentation Components
import { InventoryHeader } from './components/InventoryHeader';
import { InventoryStatsCards } from './components/InventoryStatsCards';
import { InventoryFilterBar } from './components/InventoryFilterBar';
import { InventoryTableView } from './components/InventoryTableView';
import { InventoryGridView } from './components/InventoryGridView';
import { InventoryPagination } from './components/InventoryPagination';
import { InventoryEmptyState } from './components/InventoryEmptyState';
import { BarcodeReportSection } from './components/BarcodeReportSection';
import { StockMovementsHistorySection } from './components/StockMovementsHistorySection';

// Modular Modals & Bars
import { QuickAdjustStockModal } from './components/modals/QuickAdjustStockModal';
import { ProductFormModal } from './components/modals/ProductFormModal';
import { BulkDeleteProductsModal } from './components/modals/BulkDeleteProductsModal';
import { InventoryBulkActionBar } from './components/InventoryBulkActionBar';
import { ProductImportModal } from './components/modals/ProductImportModal';
import ProductExportModal from './ProductExportModal';
import {
  parseProductsFromFile,
  type ProductImportSummary,
} from '@/services/products/productImportService';
import { useNotificationStore } from '@/store/notificationStore';

// Lazy-loaded heavy PDF/OCR modal to keep initial inventory bundle lightweight
const SupplierInvoicePdfModal = lazy(() => import('@/features/suppliers/SupplierInvoicePdfModal'));

export { emptyProduct, type FormErrors };

export default function InventoryPage() {
  // Data queries and mutations hook
  const {
    products,
    suppliers,
    categories,
    isFetching,
    refetch,
    addMutation,
    updateMutation,
    deleteMutation,
    bulkDeleteMutation,
    importMutation,
    adjustStockMutation,
    queryClient,
  } = useInventoryData();

  // Search, filter, sorting, and pagination hook
  const {
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterStockStatus,
    setFilterStockStatus,
    sortBy,
    setSortBy,
    viewMode,
    setViewMode,
    itemsPerPage,
    setItemsPerPage,
    currentPage,
    setCurrentPage,
    stats,
    filteredProducts,
    paginatedProducts,
    totalPages,
    resetFilters,
  } = useInventoryFilter(products);

  // Add/edit product form state management hook
  const formState = useProductFormState({
    products,
    categories,
    queryClient,
    onAdd: addMutation.mutate,
    onUpdate: updateMutation.mutate,
  });

  // حساب عدد المنتجات النشطة وغير النشطة عبر useMemo يعتمد حصراً على products
  const { activeProductsCount, inactiveProductsCount } = useMemo(() => ({
    activeProductsCount: products.filter((p) => p.status === 'active').length,
    inactiveProductsCount: products.filter((p) => p.status === 'inactive').length,
  }), [products]);

  // Local UI modals state
  const [inventoryTab, setInventoryTab] = useState<'products' | 'barcode-report' | 'movements'>('products');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPdfInvoiceModal, setShowPdfInvoiceModal] = useState(false);
  const [quickAdjustProduct, setQuickAdjustProduct] = useState<Product | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [importSummary, setImportSummary] = useState<ProductImportSummary | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Multi-selection state for products
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllPageSelected = useMemo(() => {
    if (paginatedProducts.length === 0) return false;
    return paginatedProducts.every((p) => selectedProductIds.has(p.id));
  }, [paginatedProducts, selectedProductIds]);

  const isPageIndeterminate = useMemo(() => {
    const countOnPage = paginatedProducts.filter((p) => selectedProductIds.has(p.id)).length;
    return countOnPage > 0 && countOnPage < paginatedProducts.length;
  }, [paginatedProducts, selectedProductIds]);

  const toggleSelectAllOnPage = () => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        paginatedProducts.forEach((p) => next.delete(p.id));
      } else {
        paginatedProducts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedProductIds(new Set(filteredProducts.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
  };

  const isAllFilteredSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedProductIds.has(p.id));
  }, [filteredProducts, selectedProductIds]);

  const selectedProductsList = useMemo(() => {
    return products.filter((p) => selectedProductIds.has(p.id));
  }, [products, selectedProductIds]);

  const handleConfirmBulkDelete = () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) return;
    bulkDeleteMutation.mutate(ids, {
      onSuccess: () => {
        clearSelection();
        setShowBulkDeleteModal(false);
      },
    });
  };

  // Barcode scanner integration
  useBarcodeScanner({
    onScan: (code) => {
      if (formState.showForm) {
        formState.setFormData((prev) => ({ ...prev, barcode: code }));
      } else {
        setSearchQuery(code);
      }
    },
    enabled: true,
    respectInputFocus: true,
    beepOnSuccess: true,
    beepOnFailure: false,
  });

  // Stock operations
  const handleToggleStatus = (product: Product) => {
    updateMutation.mutate({
      id: product.id,
      data: { status: product.status === 'active' ? 'inactive' : 'active' },
    });
  };

  const handleQuickAdjust = (product: Product, delta: number) => {
    const newQty = Math.max(0, (product.quantity || 0) + delta);
    adjustStockMutation.mutate({ product, newQuantity: newQty, delta });
  };

  const handleSaveCustomAdjust = (product: Product, newQuantity: number) => {
    adjustStockMutation.mutate({ product, newQuantity });
    setQuickAdjustProduct(null);
  };

  const handleDelete = (product: Product) => {
    if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
      deleteMutation.mutate(product.id);
    }
  };

  // Excel file import via smart parser and preview modal
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const summary = await parseProductsFromFile(file, products, categories);
      if (summary.validProducts.length === 0) {
        useNotificationStore.getState().addNotification({
          title: 'لا توجد بيانات صالحة',
          message: 'لم يتم العثور على أي منتجات صالحة للاستيراد في هذا الملف.',
          type: 'warning',
          category: 'inventory',
        });
        return;
      }
      setImportSummary(summary);
      setShowImportModal(true);
    } catch (err: any) {
      useNotificationStore.getState().addNotification({
        title: 'فشل قراءة الملف',
        message: err?.message || 'تعذر قراءة ملف Excel، يرجى التأكد من سلامة صيغة الملف.',
        type: 'error',
        category: 'inventory',
      });
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmImport = async (mode: 'upsert' | 'skip_duplicates') => {
    if (!importSummary) return;
    try {
      await importMutation.mutateAsync({
        products: importSummary.validProducts,
        mode,
      });
      setShowImportModal(false);
      setImportSummary(null);
    } catch (err) {
      console.error('Failed to import products:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Top Header with Tabs & Global Actions */}
      <InventoryHeader
        inventoryTab={inventoryTab}
        setInventoryTab={setInventoryTab}
        productsCount={products.length}
        isFetching={isFetching}
        onRefetch={() => refetch()}
        onImport={handleImport}
        onExport={() => setShowExportModal(true)}
        onOpenPdfInvoice={() => setShowPdfInvoiceModal(true)}
        onOpenCreateProduct={formState.openCreateForm}
      />

      {/* Barcode Audit Report Tab */}
      {inventoryTab === 'barcode-report' && <BarcodeReportSection />}

      {/* Stock Movements History Tab */}
      {inventoryTab === 'movements' && <StockMovementsHistorySection />}

      {/* Main Inventory Products Management Tab */}
      {inventoryTab === 'products' && (
        <div className="space-y-6">
          {/* Interactive Statistics Cards */}
          <InventoryStatsCards
            stats={stats}
            activeProductsCount={activeProductsCount}
            inactiveProductsCount={inactiveProductsCount}
            filterStockStatus={filterStockStatus}
            filterCategory={filterCategory}
            onSelectStockStatus={setFilterStockStatus}
            onClearCategory={() => setFilterCategory('')}
          />

          {/* Filtering, Search & View Controls Bar */}
          <InventoryFilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
            filterStockStatus={filterStockStatus}
            setFilterStockStatus={setFilterStockStatus}
            filterCategory={filterCategory}
            setFilterCategory={setFilterCategory}
            categories={categories}
            products={products}
            stats={stats}
            getStockStatus={getStockStatus}
          />

          {/* Table View */}
          {viewMode === 'table' && paginatedProducts.length > 0 && (
            <InventoryTableView
              products={paginatedProducts}
              onQuickAdjust={handleQuickAdjust}
              onOpenCustomAdjust={(product) => setQuickAdjustProduct(product)}
              onEdit={formState.openEditForm}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              getStockStatus={getStockStatus}
              isExpiringSoon={isExpiringSoon}
              selectedProductIds={selectedProductIds}
              onToggleSelectProduct={toggleSelectProduct}
              onToggleSelectAll={toggleSelectAllOnPage}
              isAllSelected={isAllPageSelected}
              isIndeterminate={isPageIndeterminate}
            />
          )}

          {/* Grid View */}
          {viewMode === 'grid' && paginatedProducts.length > 0 && (
            <InventoryGridView
              products={paginatedProducts}
              onQuickAdjust={handleQuickAdjust}
              onEdit={formState.openEditForm}
              onDelete={handleDelete}
              getStockStatus={getStockStatus}
              isExpiringSoon={isExpiringSoon}
              selectedProductIds={selectedProductIds}
              onToggleSelectProduct={toggleSelectProduct}
            />
          )}

          {/* Empty State */}
          {filteredProducts.length === 0 && (
            <InventoryEmptyState
              onResetFilters={resetFilters}
              onOpenCreateProduct={formState.openCreateForm}
            />
          )}

          {/* Pagination Footer */}
          <InventoryPagination
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            paginatedCount={paginatedProducts.length}
            totalFilteredCount={filteredProducts.length}
          />
        </div>
      )}

      {/* Quick Adjust Modal */}
      <QuickAdjustStockModal
        product={quickAdjustProduct}
        onClose={() => setQuickAdjustProduct(null)}
        onSave={handleSaveCustomAdjust}
      />

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        formState={formState}
        categories={categories}
        isPending={addMutation.isPending || updateMutation.isPending}
      />

      {/* Bulk Delete Confirmation Modal */}
      <BulkDeleteProductsModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDelete}
        selectedProducts={selectedProductsList}
        isPending={bulkDeleteMutation.isPending}
      />

      {/* Floating Bulk Action Bar */}
      {inventoryTab === 'products' && (
        <InventoryBulkActionBar
          selectedCount={selectedProductIds.size}
          totalFilteredCount={filteredProducts.length}
          isAllFilteredSelected={isAllFilteredSelected}
          onSelectAllFiltered={selectAllFiltered}
          onClearSelection={clearSelection}
          onOpenDeleteModal={() => setShowBulkDeleteModal(true)}
        />
      )}

      {/* Export Products Modal (Excel / CSV) */}
      {showExportModal && (
        <ProductExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          allProducts={products}
          filteredProducts={filteredProducts}
          categories={categories}
        />
      )}

      {/* Import Products Modal (Excel / CSV) */}
      {showImportModal && importSummary && (
        <ProductImportModal
          open={showImportModal}
          onClose={() => {
            setShowImportModal(false);
            setImportSummary(null);
          }}
          summary={importSummary}
          onConfirm={handleConfirmImport}
          isImporting={importMutation.isPending}
        />
      )}

      {/* Supplier Invoice PDF Import Modal */}
      {showPdfInvoiceModal && (
        <Suspense fallback={null}>
          <SupplierInvoicePdfModal
            open={showPdfInvoiceModal}
            onClose={() => setShowPdfInvoiceModal(false)}
            products={products as any}
            suppliers={suppliers}
            categories={categories as any}
          />
        </Suspense>
      )}
    </div>
  );
}
