import type { Supplier, SupplierEntry, SaleItem, Purchase } from '@/types';

export type SupplierTab = 'suppliers' | 'invoices' | 'statement';

export type SupplierFilterStatus = 'all' | 'debt' | 'settled';

export type SupplierSortOption = 'debt_desc' | 'debt_asc' | 'name_asc' | 'recent';

export interface SupplierFormData {
  name: string;
  phone: string;
  balance: number;
}

export interface SupplierStats {
  totalSuppliers: number;
  totalDebt: number;
  suppliersWithDebt: number;
  totalPurchasesAmount: number;
  totalPaidPurchases: number;
  todayPurchasesCount: number;
  todayTotal: number;
}

export interface SupplierStatementEntry {
  id: string;
  date: string;
  type: 'purchase';
  number: string;
  description: string;
  debit: number;
  credit: number;
  status: 'paid' | 'partial' | 'unpaid';
  runningBalance: number;
}

export interface SupplierPaymentVoucherData {
  supplierName: string;
  supplierPhone?: string;
  amount: number;
  date: string;
  method: string;
  note?: string;
  previousBalance: number;
  newBalance: number;
}

export interface PurchaseInvoiceItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface EnrichedPurchase extends Purchase {
  supplierName: string;
  itemsCount: number;
}
