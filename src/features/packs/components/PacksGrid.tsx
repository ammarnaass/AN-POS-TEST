import React from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { PackCard } from './PackCard';
import { PacksTableView } from './PacksTableView';
import { PacksEmptyState } from './PacksEmptyState';
import type { PackViewMode } from '../types';

interface PacksGridProps {
  packs: PackEntity[];
  products: Product[];
  currencySymbol: string;
  isLoading: boolean;
  hasSearchQuery: boolean;
  viewMode: PackViewMode;
  onOpenCreate: () => void;
  onEdit: (pack: PackEntity) => void;
  onDelete: (packId: string, packName: string) => void;
}

export const PacksGrid: React.FC<PacksGridProps> = ({
  packs,
  products,
  currencySymbol,
  isLoading,
  hasSearchQuery,
  viewMode,
  onOpenCreate,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (packs.length === 0) {
    return (
      <PacksEmptyState
        hasSearchQuery={hasSearchQuery}
        onOpenCreate={onOpenCreate}
      />
    );
  }

  if (viewMode === 'table') {
    return (
      <PacksTableView
        packs={packs}
        products={products}
        currencySymbol={currencySymbol}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {packs.map((pack) => (
        <PackCard
          key={pack.id}
          pack={pack}
          products={products}
          currencySymbol={currencySymbol}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
