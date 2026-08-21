// ============================================================
// منطق الأعمال المشترك بين سطح المكتب والهاتف
// Pure functions — no DB dependency, reusable in both contexts
// ============================================================

import type {
  Sale,
  SaleItem,
  Product,
  Customer,
  Settings,
  CashSession,
  CartItem,
  Promotion,
} from '../types';
import { generateId, calculateTVA, calculateDiscount, getNextInvoiceNumber } from '../utils';

// Re-export print template services
export { paperSpec, PAPER_SPECS } from './paperSizes';
export type { PaperSpec } from './paperSizes';
export { renderSection, renderDocumentHTML } from './renderTemplate';
export { ALL_DEFAULT_TEMPLATES as defaultTemplates } from './defaultTemplates';

export const calculateSaleTotal = (
  items: CartItem[],
  discount: number,
  discountType: 'percent' | 'amount',
  tvaRate: number
): { subtotal: number; discountAmount: number; tvaAmount: number; total: number } => {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = calculateDiscount(subtotal, discount, discountType);
  const afterDiscount = subtotal - discountAmount;
  const tvaAmount = calculateTVA(afterDiscount, tvaRate);
  const total = afterDiscount + tvaAmount;
  return { subtotal, discountAmount, tvaAmount, total };
};

export const applyWholesalePrice = (product: Product, qty: number): number => {
  if (product.wholesaleMinQty > 0 && qty >= product.wholesaleMinQty) {
    return product.wholesalePrice;
  }
  return product.retailPrice;
};

export const applyPromotionPrice = (
  product: Product,
  promotions: Promotion[],
  date: string = new Date().toISOString()
): number | null => {
  const now = new Date(date);
  const matchingPromos = promotions.filter((p) => {
    const isActive = p.active === true || p.status === 'active';
    if (!isActive) return false;
    const matches = p.productId === product.id || (Array.isArray(p.productIds) && p.productIds.includes(product.id));
    if (!matches) return false;
    if (new Date(p.startDate) > now) return false;
    if (new Date(p.endDate) < now) return false;
    return true;
  });
  if (matchingPromos.length === 0) return null;

  const compute = (p: Promotion): number => {
    const isPercent = p.discountType === 'percent' || p.type === 'percentage';
    const val = p.discountValue ?? p.value ?? 0;
    return isPercent ? product.retailPrice * (1 - val / 100) : Math.max(0, product.retailPrice - val);
  };

  const activePromo = matchingPromos.reduce((best, p) => {
    if (!best) return p;
    return compute(p) < compute(best) ? p : best;
  }, null as Promotion | null);
  if (!activePromo) return null;
  return compute(activePromo);
};

export const resolveUnitPrice = (
  product: Product,
  qty: number,
  promotions: Promotion[]
): number => {
  const promoPrice = applyPromotionPrice(product, promotions);
  if (promoPrice !== null) return promoPrice;
  return applyWholesalePrice(product, qty);
};

export const createSale = (
  items: CartItem[],
  subtotal: number,
  discount: number,
  discountType: 'percent' | 'amount',
  tvaAmount: number,
  total: number,
  paymentMethod: 'cash' | 'credit',
  customerId: string,
  amountPaid: number,
  soldBy: string,
  cashSessionId: string,
  settings: Settings,
  saleType: 'sale' | 'return' = 'sale',
  docType: 'proforma' | 'devis' | 'bl' | 'facture' = 'facture'
): Sale => {
  const saleItems: SaleItem[] = items.map((item) => ({
    productId: item.productId,
    name: item.name,
    qty: item.qty,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    ...(item.batchNumber ? { batchNumber: item.batchNumber } : {}),
  }));

  let status: 'paid' | 'partial' | 'unpaid' = 'paid';
  if (paymentMethod === 'credit') {
    if (amountPaid <= 0) status = 'unpaid';
    else if (amountPaid < total) status = 'partial';
  }

  return {
    id: generateId(),
    number: getNextInvoiceNumber(settings.invoicePrefix, 0),
    date: new Date().toISOString(),
    docType,
    type: saleType,
    items: saleItems,
    subtotal,
    discount,
    discountType,
    tvaAmount,
    total,
    paymentMethod,
    customerId,
    amountPaid,
    status,
    soldBy,
    cashSessionId,
  };
};

export const updateProductQuantities = (
  products: Product[],
  items: CartItem[],
  saleType: 'sale' | 'return'
): Product[] => {
  return products.map((product) => {
    const item = items.find((i) => i.productId === product.id);
    if (!item) return product;
    const qtyChange = saleType === 'sale' ? -item.qty : item.qty;
    return { ...product, quantity: Math.max(0, product.quantity + qtyChange) };
  });
};

export const updateCustomerBalance = (
  customers: Customer[],
  customerId: string,
  amount: number,
  isCredit: boolean
): Customer[] => {
  if (!customerId) return customers;
  return customers.map((c) => {
    if (c.id !== customerId) return c;
    return { ...c, balance: isCredit ? c.balance + amount : c.balance - amount };
  });
};

export const getSaleStatus = (
  total: number,
  amountPaid: number
): 'paid' | 'partial' | 'unpaid' => {
  if (amountPaid >= total) return 'paid';
  if (amountPaid > 0) return 'partial';
  return 'unpaid';
};

export const generateReceiptHTML = (sale: Sale, settings: Settings): string => {
  const items = sale.items
    .map(
      (item) => `
    <div style="display:flex;justify-content:space-between;">
      <span>${item.name} x${item.qty}</span>
      <span>${item.lineTotal.toFixed(2)}</span>
    </div>`
    )
    .join('');

  return `
    <div class="receipt-80mm" style="direction:rtl;text-align:center;padding:5px;">
      <h2 style="font-size:16px;margin:0;">${settings.shopName}</h2>
      <p style="margin:2px 0;">${settings.phone}</p>
      <hr style="border:1px dashed #000;margin:5px 0;" />
      <div style="text-align:right;font-size:11px;">
        <div>رقم الفاتورة: ${sale.number}</div>
        <div>التاريخ: ${new Date(sale.date).toLocaleDateString('ar-DZ')}</div>
        <div>البائع: ${sale.soldBy}</div>
      </div>
      <hr style="border:1px dashed #000;margin:5px 0;" />
      ${items}
      <hr style="border:1px dashed #000;margin:5px 0;" />
      <div style="text-align:right;font-size:11px;">
        <div>المجموع الفرعي: ${sale.subtotal.toFixed(2)}</div>
        ${sale.discount > 0 ? `<div>الخصم: ${sale.discount.toFixed(2)}</div>` : ''}
        <div>TVA (${settings.tvaRate}%): ${sale.tvaAmount.toFixed(2)}</div>
        <div style="font-size:14px;font-weight:bold;margin-top:5px;">
          الإجمالي: ${sale.total.toFixed(2)} ${settings.baseCurrency}
        </div>
      </div>
      <hr style="border:1px dashed #000;margin:5px 0;" />
      <p style="font-size:10px;margin:5px 0;">${settings.receiptFooter}</p>
    </div>
  `;
};
