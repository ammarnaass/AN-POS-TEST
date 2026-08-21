import { v4 as uuidv4 } from 'uuid';

export const generateId = (): string => uuidv4();

export const formatDate = (date?: string | number | Date | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatDateTime = (date?: string | number | Date | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('ar-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (amount: number, symbol = 'د.ج'): string => {
  return `${amount.toFixed(2)} ${symbol}`;
};

export const getTodayRange = (): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return { start: start.toISOString(), end: end.toISOString() };
};

export const getDateRange = (days: number): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: now.toISOString() };
};

export const isDateInRange = (dateStr: string, start: string, end: string): boolean => {
  const date = new Date(dateStr);
  return date >= new Date(start) && date <= new Date(end);
};

export const calculateTVA = (subtotal: number, tvaRate: number): number => {
  return subtotal * (tvaRate / 100);
};

export const calculateDiscount = (subtotal: number, discount: number, discountType: 'percent' | 'amount'): number => {
  if (discountType === 'percent') {
    return subtotal * (discount / 100);
  }
  return discount;
};

export const normalizeInvoicePrefix = (prefix: string): string => {
  const normalized = prefix.trim().replace(/[-\s]+$/g, '');
  return normalized || 'INV';
};

export const normalizeInvoiceNumber = (number: string): string => {
  return number.trim().replace(/-{2,}/g, '-');
};

export const getNextInvoiceNumber = (prefix: string, lastNumber: number): string => {
  return `${normalizeInvoicePrefix(prefix)}-${String(lastNumber + 1).padStart(6, '0')}`;
};

export const getDaysUntilExpiry = (expiryDate: string): number => {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};
