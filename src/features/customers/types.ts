import type { Customer } from '@/types';

export type CustomerFilterTab = 'all' | 'debt' | 'exceeded' | 'settled';

export type CustomerSortBy = 'debt_desc' | 'debt_asc' | 'name_asc' | 'recent';

export interface CustomerFormData {
  name: string;
  phone: string;
  creditLimit: number;
  balance: number;
  customerType: 'retail' | 'wholesale' | 'semi_wholesale';
  rc?: string;
  nif?: string;
  nis?: string;
  address?: string;
}

export interface PaymentVoucherData {
  customerName: string;
  customerPhone?: string;
  amount: number;
  date: string;
  method: string;
  note?: string;
  previousBalance: number;
  newBalance: number;
}

export interface CustomerStatementEntry {
  date: string;
  type: 'sale' | 'payment' | 'opening_balance' | 'previous_balance';
  number: string;
  description: string;
  debit: number;
  credit: number;
  status: string;
  runningBalance: number;
}

export interface CustomerStatsData {
  totalCustomers: number;
  totalDebt: number;
  customersWithDebt: number;
  totalCollections: number;
  exceededLimitCount: number;
  totalCreditLimit: number;
  debtUtilization: number;
}
