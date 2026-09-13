import React from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import { usePackQueries } from './hooks/usePackQueries';
import { usePackFilters } from './hooks/usePackFilters';
import { usePackForm } from './hooks/usePackForm';
import { usePackMutations } from './hooks/usePackMutations';
import { PacksHeader } from './components/PacksHeader';
import { PacksStatsCards } from './components/PacksStatsCards';
import { PacksFilterBar } from './components/PacksFilterBar';
import { PacksGrid } from './components/PacksGrid';
import { PackFormModal } from './modals/PackFormModal';

export default function PacksPage() {
  // 1. Data Queries
  const {
    packs,
    products,
    currencySymbol,
    stats,
    isLoadingPacks,
    refetchPacks,
  } = usePackQueries();

  // 2. Search & Status Filtering
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    viewMode,
    setViewMode,
    filteredPacks,
  } = usePackFilters(packs);

  // 3. Form State & Live Financials
  const {
    showModal,
    editingPack,
    packName,
    setPackName,
    packBarcode,
    setPackBarcode,
    packPrice,
    setPackPrice,
    packType,
    setPackType,
    unitName,
    setUnitName,
    minWholesaleQty,
    setMinWholesaleQty,
    selectedItems,
    modalError,
    setModalError,
    packCalculations,
    handleOpenCreate,
    handleOpenEdit,
    handleCloseModal,
    handleAddProductToPack,
    handleUpdateItemQty,
    handleRemoveItem,
    handleGenerateBarcode,
  } = usePackForm(products);

  // 4. Persistence Mutations (Save & Delete)
  const { saveMutation, deleteMutation } = usePackMutations({
    onSaveSuccess: handleCloseModal,
  });

  const handleSave = () => {
    setModalError('');
    saveMutation.mutate(
      {
        editingPack,
        packName,
        packBarcode,
        packPrice,
        packType,
        unitName,
        minWholesaleQty,
        selectedItems,
      },
      {
        onError: (err) => {
          setModalError(err.message || 'فشل حفظ العبوة');
        },
      }
    );
  };

  const handleDelete = (packId: string, packName: string) => {
    if (confirm(`هل أنت متأكد من حذف العبوة "${packName}"؟`)) {
      deleteMutation.mutate(packId);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-200" dir="rtl">
      {/* 1. Page Header with Counts and Global Actions */}
      <PacksHeader
        packsCount={packs.length}
        isLoading={isLoadingPacks}
        onRefresh={refetchPacks}
        onOpenCreate={handleOpenCreate}
      />

      {/* 2. Top Metric Statistics Cards */}
      <PacksStatsCards stats={stats} />

      {/* 3. Search & Status Filtering Bar */}
      <PacksFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        viewMode={viewMode}
        setViewMode={setViewMode}
        totalCount={filteredPacks.length}
      />

      {/* 4. Responsive Packs Grid View & Empty State */}
      <PacksGrid
        packs={filteredPacks}
        products={products}
        currencySymbol={currencySymbol}
        isLoading={isLoadingPacks}
        hasSearchQuery={Boolean(searchQuery.trim())}
        viewMode={viewMode}
        onOpenCreate={handleOpenCreate}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* 5. Create / Edit Pack Modal */}
      <PackFormModal
        isOpen={showModal}
        editingPack={editingPack}
        packName={packName}
        setPackName={setPackName}
        packBarcode={packBarcode}
        setPackBarcode={setPackBarcode}
        packPrice={packPrice}
        setPackPrice={setPackPrice}
        packType={packType}
        setPackType={setPackType}
        unitName={unitName}
        setUnitName={setUnitName}
        minWholesaleQty={minWholesaleQty}
        setMinWholesaleQty={setMinWholesaleQty}
        selectedItems={selectedItems}
        modalError={modalError}
        packCalculations={packCalculations}
        products={products}
        currencySymbol={currencySymbol}
        isSaving={saveMutation.isPending}
        onClose={handleCloseModal}
        onSave={handleSave}
        onGenerateBarcode={handleGenerateBarcode}
        onAddProduct={handleAddProductToPack}
        onUpdateQty={handleUpdateItemQty}
        onRemoveItem={handleRemoveItem}
      />
    </div>
  );
}
