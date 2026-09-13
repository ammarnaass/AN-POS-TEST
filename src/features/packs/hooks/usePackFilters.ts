import { useState, useMemo } from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { PackFilterStatus, PackTypeFilter, PackViewMode } from '../types';

export function usePackFilters(packs: PackEntity[]) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PackFilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<PackTypeFilter>('all');
  const [viewMode, setViewMode] = useState<PackViewMode>('grid');

  const filteredPacks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return packs.filter((p) => {
      // 1. تصفية البحث
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q));

      // 2. تصفية الحالة (نشطة / معطلة)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.status !== 'inactive') ||
        (statusFilter === 'inactive' && p.status === 'inactive');

      // 3. تصفية نوع الباقة (طرد جملة / باقة مجمعة / نصف جملة)
      const pType = p.packType || 'wholesale';
      const matchesType = typeFilter === 'all' || pType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [packs, searchQuery, statusFilter, typeFilter]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    viewMode,
    setViewMode,
    filteredPacks,
  };
}
