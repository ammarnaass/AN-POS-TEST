import type { Product, Customer, Sale, CartItem } from '@/types';

export type QuickPOSMobileTab = 'catalog' | 'cart';

export type QuickPOSPaymentMethod = 'cash' | 'card' | 'transfer' | 'credit';

export interface QuickPOSSaleSummary {
  subtotal: number;
  discountAmount: number;
  tvaAmount: number;
  total: number;
}

export interface QuickPOSHeldOrder {
  id: string;
  items: any[];
  total: number;
  subtotal: number;
  customerId: string;
  customerName: string;
  discount: number;
  discountType: 'percent' | 'fixed';
  createdAt: string;
  note: string;
  createdBy: string;
}

export interface QuickPOSSettings {
  tvaRate: number;
  invoicePrefix: string;
  baseCurrency: string;
  shopName: string;
  phone: string;
  receiptFooter: string;
  allowNegativeStock: boolean;
  allowCardPayment: boolean;
  allowTransferPayment: boolean;
}
