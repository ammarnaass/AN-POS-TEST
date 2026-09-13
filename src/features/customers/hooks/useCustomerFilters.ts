import { useState, useMemo, useEffect } from 'react';
import type { Customer } from '@/types';
import type { CustomerFilterTab, CustomerSortBy } from '../types';

export function useCustomerFilters(customers: Customer[], itemsPerPage = 12) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<CustomerFilterTab>('all');
  const [sortBy, setSortBy] = useState<CustomerSortBy>('debt_desc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        // Tab Filter
        if (filterTab === 'debt' && c.balance <= 0) return false;
        if (filterTab === 'exceeded' && !(c.creditLimit > 0 && c.balance >= c.creditLimit)) return false;
        if (filterTab === 'settled' && c.balance > 0) return false;

        // Search Filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = c.name.toLowerCase().includes(q);
          const matchesPhone = (c.phone || '').includes(q);
          return matchesName || matchesPhone;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'debt_desc') return b.balance - a.balance;
        if (sortBy === 'debt_asc') return a.balance - b.balance;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
        const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
        const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
        return timeB - timeA;
      });
  }, [customers, filterTab, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(start, start + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTab, sortBy]);

  return {
    searchQuery,
    setSearchQuery,
    filterTab,
    setFilterTab,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    filteredCustomers,
    paginatedCustomers,
    totalPages,
    totalCount: filteredCustomers.length,
    totalItems: filteredCustomers.length,
  };
}
