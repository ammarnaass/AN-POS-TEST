import { useState, useMemo } from 'react';
import type { Customer } from '@/types';

export type CustomerFilterCategory = 'all' | 'with_debt' | 'advance';

export function useCustomerSearch(customers: Customer[]) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<CustomerFilterCategory>('all');

  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (filterCategory === 'with_debt') {
      result = result.filter((c) => Number(c.balance || 0) > 0);
    } else if (filterCategory === 'advance') {
      result = result.filter((c) => Number(c.balance || 0) < 0);
    }

    if (!search.trim()) {
      return result;
    }

    const q = search.toLowerCase().trim();
    return result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, search, filterCategory]);

  const debtorCount = useMemo(() => {
    return customers.filter((c) => Number(c.balance || 0) > 0).length;
  }, [customers]);

  const advanceCount = useMemo(() => {
    return customers.filter((c) => Number(c.balance || 0) < 0).length;
  }, [customers]);

  return {
    search,
    setSearch,
    filterCategory,
    setFilterCategory,
    filteredCustomers,
    debtorCount,
    advanceCount,
    totalCount: customers.length,
  };
}
