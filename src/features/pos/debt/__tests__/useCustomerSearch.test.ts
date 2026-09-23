import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCustomerSearch } from '../hooks/useCustomerSearch';
import type { Customer } from '@/types';

describe('useCustomerSearch', () => {
  const sampleCustomers: Customer[] = [
    {
      id: 'c1',
      name: 'أحمد بن علي',
      phone: '0555112233',
      creditLimit: 50000,
      balance: 15000, // Debtor
    },
    {
      id: 'c2',
      name: 'كريم بلحاج',
      phone: '0666445566',
      creditLimit: 30000,
      balance: 0, // Clear
    },
    {
      id: 'c3',
      name: 'سفيان عمراني',
      phone: '0777889900',
      creditLimit: 40000,
      balance: -5000, // Advance credit
    },
  ];

  it('filters customers by name and phone', () => {
    const { result } = renderHook(() => useCustomerSearch(sampleCustomers));

    expect(result.current.filteredCustomers.length).toBe(3);

    act(() => {
      result.current.setSearch('بلحاج');
    });
    expect(result.current.filteredCustomers.length).toBe(1);
    expect(result.current.filteredCustomers[0].name).toBe('كريم بلحاج');

    act(() => {
      result.current.setSearch('0555');
    });
    expect(result.current.filteredCustomers.length).toBe(1);
    expect(result.current.filteredCustomers[0].name).toBe('أحمد بن علي');
  });

  it('filters by category: with_debt and advance', () => {
    const { result } = renderHook(() => useCustomerSearch(sampleCustomers));

    expect(result.current.debtorCount).toBe(1);
    expect(result.current.advanceCount).toBe(1);

    act(() => {
      result.current.setFilterCategory('with_debt');
    });
    expect(result.current.filteredCustomers.length).toBe(1);
    expect(result.current.filteredCustomers[0].id).toBe('c1');

    act(() => {
      result.current.setFilterCategory('advance');
    });
    expect(result.current.filteredCustomers.length).toBe(1);
    expect(result.current.filteredCustomers[0].id).toBe('c3');
  });
});
