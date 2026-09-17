// src/features/categories/CategoriesPage.tsx
// CategoriesPage — المنسق العام لإدارة عائلات وفئات المنتجات (AN POS)

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useCategoriesManager } from './hooks/useCategoriesManager';
import { CategoriesHeader } from './components/CategoriesHeader';
import { CategoriesStatsCards } from './components/CategoriesStatsCards';
import { CategoriesFilterBar } from './components/CategoriesFilterBar';
import { CategoriesEmptyState } from './components/CategoriesEmptyState';
import { CategoriesGrid } from './components/CategoriesGrid';
import { CategoriesTable } from './components/CategoriesTable';
import { CategoryFormModal } from './modals/CategoryFormModal';
import { CategoryDeleteDialog } from './modals/CategoryDeleteDialog';

export default function CategoriesPage() {
  const {
    categories,
    isLoading,
    error,
    stats,
    categoryMap,
    filteredCategories,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    viewMode,
    setViewMode,
    showForm,
    setShowForm,
    editing,
    form,
    setForm,
    formError,
    deleteConfirmCat,
    setDeleteConfirmCat,
    openNew,
    openEdit,
    handleSubmit,
    handleConfirmDelete,
    isSubmitting,
    isDeleting,
  } = useCategoriesManager();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full" dir="rtl">
      {/* ── الرأس الرئيسي والعنوان ────────────────────────────────────── */}
      <CategoriesHeader totalCount={stats.total} onOpenNew={() => openNew()} />

      {/* ── بطاقات الإحصاءات السريعة (KPIs) ─────────────────────────── */}
      <CategoriesStatsCards stats={stats} />

      {/* ── شريط الفلاتر والبحث والتحكم ───────────────────────────────── */}
      <CategoriesFilterBar
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={categories.length}
        withProductsCount={stats.withProducts}
        emptyCount={stats.emptyCount}
      />

      {/* ── رسائل الخطأ إن وجدت ────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-3 text-error">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">
            فشل في تحميل الفئات: {(error as Error).message}
          </span>
        </div>
      )}

      {/* ── المحتوى الرئيسي: البطاقات أو الجدول ───────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-40 bg-surface-container-low rounded-2xl animate-pulse border border-outline-variant/10"
            />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <CategoriesEmptyState search={search} onOpenNew={() => openNew()} />
      ) : viewMode === 'grid' ? (
        <CategoriesGrid
          categories={filteredCategories}
          categoryMap={categoryMap}
          onEdit={openEdit}
          onDelete={setDeleteConfirmCat}
          onAddSub={(parentId) => openNew(parentId)}
        />
      ) : (
        <CategoriesTable
          categories={filteredCategories}
          categoryMap={categoryMap}
          onEdit={openEdit}
          onDelete={setDeleteConfirmCat}
        />
      )}

      {/* ── نافذة إضافة / تعديل عائلة (Modal Form) ───────────────────── */}
      <CategoryFormModal
        isOpen={showForm}
        editing={editing}
        form={form}
        categories={categories}
        formError={formError}
        isSubmitting={isSubmitting}
        onFormChange={setForm}
        onSubmit={handleSubmit}
        onClose={() => setShowForm(false)}
      />

      {/* ── نافذة تأكيد الحذف (Delete Confirmation Dialog) ─────────── */}
      <CategoryDeleteDialog
        category={deleteConfirmCat}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmCat(null)}
      />
    </div>
  );
}
