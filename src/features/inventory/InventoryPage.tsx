import { useState } from 'react';
import type { Product } from '@/types';
import { generateId } from '@/utils';
import * as XLSX from 'xlsx';
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

// Modular Modals
import { QuickAdjustStockModal } from './components/modals/QuickAdjustStockModal';
import { ProductFormModal } from './components/modals/ProductFormModal';
import ProductExportModal from './ProductExportModal';
import SupplierInvoicePdfModal from '@/features/suppliers/SupplierInvoicePdfModal';

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
    importMutation,
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

  // Local UI modals state
  const [inventoryTab, setInventoryTab] = useState<'products' | 'barcode-report'>('products');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPdfInvoiceModal, setShowPdfInvoiceModal] = useState(false);
  const [quickAdjustProduct, setQuickAdjustProduct] = useState<Product | null>(null);

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
    updateMutation.mutate({ id: product.id, data: { quantity: newQty } });
  };

  const handleSaveCustomAdjust = (product: Product, newQuantity: number) => {
    updateMutation.mutate({ id: product.id, data: { quantity: newQuantity } });
    setQuickAdjustProduct(null);
  };

  const handleDelete = (product: Product) => {
    if (confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
      deleteMutation.mutate(product.id);
    }
  };

  // Excel file import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const wb = XLSX.read(event.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
      const imported: Product[] = data.map((row) => ({
        id: generateId(),
        name: row['الاسم'] || row['name'] || '',
        barcode: String(row['الباركود'] || row['barcode'] || ''),
        category: row['الفئة'] || row['category'] || '',
        unit: row['الوحدة'] || row['unit'] || 'قطعة',
        costPrice: Number(row['سعر التكلفة'] || row['costPrice'] || 0),
        wholesalePrice: Number(row['سعر الجملة'] || row['wholesalePrice'] || 0),
        retailPrice: Number(row['سعر التجزئة'] || row['retailPrice'] || 0),
        wholesaleMinQty: Number(row['الحد الأدنى للجملة'] || row['wholesaleMinQty'] || 0),
        quantity: Number(row['الكمية'] || row['quantity'] || 0),
        lowStockThreshold: Number(row['حد التنبيه'] || row['lowStockThreshold'] || 0),
        variant: row['المقاس'] || row['variant'] || '',
        expiryDate: row['تاريخ الصلاحية'] || row['expiryDate'] || '',
        batchNumber: row['رقم الدفعة'] || row['batchNumber'] || '',
        highlighted: false,
        status: 'active' as const,
      }));
      importMutation.mutate(imported);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
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

      {/* Main Inventory Products Management Tab */}
      {inventoryTab === 'products' && (
        <div className="space-y-6">
          {/* Interactive Statistics Cards */}
          <InventoryStatsCards
            stats={stats}
            activeProductsCount={products.filter((p) => p.status === 'active').length}
            inactiveProductsCount={products.filter((p) => p.status === 'inactive').length}
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

      {/* Supplier Invoice PDF Import Modal */}
      {showPdfInvoiceModal && (
        <SupplierInvoicePdfModal
          open={showPdfInvoiceModal}
          onClose={() => setShowPdfInvoiceModal(false)}
          products={products as any}
          suppliers={suppliers}
          categories={categories as any}
        />
      )}
    </div>
  );
}
