import { useState, useMemo, useEffect } from 'react';
import type { Supplier } from '@/types';
import type { SupplierTab, SupplierFilterStatus, SupplierSortOption } from '../types';

export const SUPPLIERS_PER_PAGE = 12;

export function useSupplierFilters(suppliers: Supplier[]) {
  const [activeTab, setActiveTab] = useState<SupplierTab>('suppliers');
  const [filterTab, setFilterTab] = useState<SupplierFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SupplierSortOption>('debt_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  // Filter & Sort Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => {
        if (filterTab === 'debt' && s.balance <= 0) return false;
        if (filterTab === 'settled' && s.balance > 0) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          return s.name.toLowerCase().includes(q) || s.phone.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'debt_desc') return b.balance - a.balance;
        if (sortBy === 'debt_asc') return a.balance - b.balance;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [suppliers, filterTab, searchQuery, sortBy]);

  // Pagination for Suppliers
  const totalPages = Math.ceil(filteredSuppliers.length / SUPPLIERS_PER_PAGE);
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * SUPPLIERS_PER_PAGE;
    return filteredSuppliers.slice(start, start + SUPPLIERS_PER_PAGE);
  }, [filteredSuppliers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTab, sortBy, activeTab]);

  return {
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
    totalItems: filteredSuppliers.length,
  };
}
