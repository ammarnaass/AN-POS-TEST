import React, { useState, useCallback } from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { useFavoritesStore } from './store/useFavoritesStore';
import { usePOSSessionStore } from '@/features/pos/store/usePOSSessionStore';
import { useFavoritesData } from './hooks/useFavoritesData';
import { useFavoritesCategoryFilter } from './hooks/useFavoritesCategoryFilter';
import { useCategoryFormModal } from './hooks/useCategoryFormModal';
import { useFavoritePackFormModal } from './hooks/useFavoritePackFormModal';

import { FavoritesHeader } from './components/FavoritesHeader';
import { FavoritesStatsBar } from './components/FavoritesStatsBar';
import { FavoriteCategoriesSidebar } from './components/FavoriteCategoriesSidebar';
import { FavoritePacksGrid } from './components/FavoritePacksGrid';

import { CategoryFormModal } from './modals/CategoryFormModal';
import { AddFavoriteItemsModal } from './modals/AddFavoriteItemsModal';
import { FavoritePackFormModal } from './modals/FavoritePackFormModal';

export const FavoritesPage: React.FC = () => {
  const { categories, items, addItemToCategory, removeItemFromCategory } =
    useFavoritesStore();

  const { terminalCategoryMode, setTerminalCategoryMode } = usePOSSessionStore();

  const { packs, products } = useFavoritesData();

  const {
    selectedCatId,
    setSelectedCatId,
    searchQuery,
    setSearchQuery,
    displayedItems,
    activeCategory,
  } = useFavoritesCategoryFilter(categories, items);

  const categoryModal = useCategoryFormModal();
  const packFormModal = useFavoritePackFormModal({ products, packs, categories });

  const [showAddModal, setShowAddModal] = useState(false);

  // Toggle terminal display mode between 'favorites' and 'products'
  const handleToggleTerminalMode = useCallback(() => {
    setTerminalCategoryMode((prev) => (prev === 'favorites' ? 'products' : 'favorites'));
  }, [setTerminalCategoryMode]);

  // Add Pack directly to active category
  const handleAddPackToCategory = useCallback(
    (pack: PackEntity) => {
      const targetCatId = selectedCatId === 'ALL' ? categories[0]?.id : selectedCatId;
      if (!targetCatId) {
        alert('يرجى إنشاء تصنيف مفضلة أولاً لاحتواء العبوات');
        return;
      }

      const pieces = Number(
        pack.piecesCount || (Array.isArray(pack.items) && pack.items[0]?.qty) || 1
      );

      addItemToCategory({
        categoryId: targetCatId,
        type: 'pack',
        itemId: pack.id,
        name: pack.name,
        barcode: pack.barcode,
        price: pack.packPrice,
        packQty: pieces,
        packUnit: pack.unitName || 'طرد',
        parentProductId:
          Array.isArray(pack.items) && pack.items.length > 0
            ? pack.items[0]?.productId
            : undefined,
      });
    },
    [selectedCatId, categories, addItemToCategory]
  );

  const isPackAdded = useCallback(
    (packId: string) => {
      if (selectedCatId === 'ALL') {
        return items.some((it) => it.type === 'pack' && (it.itemId === packId || it.id === packId));
      }
      return items.some(
        (it) =>
          it.categoryId === selectedCatId &&
          it.type === 'pack' &&
          (it.itemId === packId || it.id === packId)
      );
    },
    [selectedCatId, items]
  );

  const handleConvertProductToPack = useCallback(
    (product: Product) => {
      setShowAddModal(false);
      packFormModal.openCreateModal(
        product,
        selectedCatId === 'ALL' ? undefined : selectedCatId
      );
    },
    [packFormModal, selectedCatId]
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto select-none" dir="rtl">
      {/* 1. Header Banner & Terminal Controls */}
      <FavoritesHeader
        terminalCategoryMode={terminalCategoryMode}
        onToggleTerminalMode={handleToggleTerminalMode}
        onOpenQuickPack={() =>
          packFormModal.openCreateModal(
            undefined,
            selectedCatId === 'ALL' ? undefined : selectedCatId
          )
        }
        onOpenNewCategory={categoryModal.handleOpenNewCategory}
      />

      {/* 2. Stats Bar */}
      <FavoritesStatsBar
        categoriesCount={categories.length}
        favoritePacksCount={items.filter((it) => it.type === 'pack').length}
        productsCount={products.length}
        allPacksCount={packs.length}
      />

      {/* 3. Main Split View: Categories Sidebar + Packs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <FavoriteCategoriesSidebar
          categories={categories}
          items={items}
          selectedCatId={selectedCatId}
          onSelectCategory={setSelectedCatId}
          onOpenNewCategory={categoryModal.handleOpenNewCategory}
          onOpenEditCategory={categoryModal.handleOpenEditCategory}
          onDeleteCategory={(catId, e) =>
            categoryModal.handleDeleteCategory(catId, e, (deletedId) => {
              if (selectedCatId === deletedId) setSelectedCatId('ALL');
            })
          }
        />

        <FavoritePacksGrid
          selectedCatId={selectedCatId}
          activeCategory={activeCategory}
          categoriesCount={categories.length}
          displayedItems={displayedItems}
          categories={categories}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenQuickPack={() =>
            packFormModal.openCreateModal(
              undefined,
              selectedCatId === 'ALL' ? undefined : selectedCatId
            )
          }
          onOpenAddItems={() => setShowAddModal(true)}
          onOpenEditPack={packFormModal.openEditModal}
          onRemoveItem={removeItemFromCategory}
        />
      </div>

      {/* Modal 1: Category Form (Create / Edit) */}
      <CategoryFormModal
        isOpen={categoryModal.showCategoryModal}
        editingCategory={categoryModal.editingCategory}
        name={categoryModal.catNameInput}
        setName={categoryModal.setCatNameInput}
        icon={categoryModal.catIconInput}
        setIcon={categoryModal.setCatIconInput}
        color={categoryModal.catColorInput}
        setColor={categoryModal.setCatColorInput}
        onClose={() => categoryModal.setShowCategoryModal(false)}
        onSubmit={(e: React.FormEvent) =>
          categoryModal.handleSaveCategory(e, (newId) => {
            setSelectedCatId(newId);
          })
        }
      />

      {/* Modal 2: Add Existing Packs / Select Product */}
      <AddFavoriteItemsModal
        isOpen={showAddModal}
        activeCategory={activeCategory}
        packs={packs}
        products={products}
        onClose={() => setShowAddModal(false)}
        onAddPack={handleAddPackToCategory}
        isPackAdded={isPackAdded}
        onSelectProductForQuickPack={handleConvertProductToPack}
      />

      {/* Modal 3: Unified Favorite Pack Form (Create & Edit with 100% Field Parity) */}
      <FavoritePackFormModal
        isOpen={packFormModal.isOpen}
        mode={packFormModal.mode}
        editingItem={packFormModal.editingItem}
        categories={categories}
        products={products}
        selectedProduct={packFormModal.selectedProduct}
        setSelectedProduct={packFormModal.setSelectedProduct}
        piecesCount={packFormModal.piecesCount}
        onChangePiecesCount={packFormModal.changePiecesCount}
        unitName={packFormModal.unitName}
        onChangeUnitName={packFormModal.changeUnitName}
        packName={packFormModal.packName}
        setPackName={packFormModal.setPackName}
        packPrice={packFormModal.packPrice}
        setPackPrice={packFormModal.setPackPrice}
        setIsCustomPrice={packFormModal.setIsCustomPrice}
        barcode={packFormModal.barcode}
        setBarcode={packFormModal.setBarcode}
        targetCatId={packFormModal.targetCatId}
        setTargetCatId={packFormModal.setTargetCatId}
        packType={packFormModal.packType}
        setPackType={packFormModal.setPackType}
        minWholesaleQty={packFormModal.minWholesaleQty}
        setMinWholesaleQty={packFormModal.setMinWholesaleQty}
        searchQuery={packFormModal.searchQuery}
        setSearchQuery={packFormModal.setSearchQuery}
        isSaving={packFormModal.isSaving}
        error={packFormModal.error}
        filteredProducts={packFormModal.filteredProducts}
        onSelectBaseProduct={packFormModal.selectBaseProduct}
        onAutoGenerateName={packFormModal.autoGeneratePackName}
        onAutoCalculatePrice={packFormModal.autoCalculatePackPrice}
        onClose={packFormModal.closeModal}
        onSubmit={(e) =>
          packFormModal.handleSubmit(e, (newCatId) => {
            setSelectedCatId(newCatId);
          })
        }
      />
    </div>
  );
};

export default FavoritesPage;
