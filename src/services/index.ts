import type { Sale, SaleItem, Product, Customer, Settings, CashSession, CartItem } from '@/types';
import type { PrintLanguage } from '@/types/invoicePrint';
import { generateId, calculateTVA, calculateDiscount, getNextInvoiceNumber } from '@/utils';
import { t, generateQrSvg, formatFullNumber } from './print/renderTemplate';

export const calculateSaleTotal = (
  items: CartItem[],
  discount: number,
  discountType: 'percent' | 'amount',
  tvaRate: number
): { subtotal: number; discountAmount: number; tvaAmount: number; total: number } => {
  const safeItems: CartItem[] = Array.isArray(items)
    ? items
    : (typeof items === 'string' ? (() => { try { const p = JSON.parse(items); return Array.isArray(p) ? p : []; } catch { return []; } })() : []);
  const subtotal = safeItems.reduce((sum, item) => sum + (Number(item?.lineTotal) || (Number(item?.qty || 0) * Number(item?.unitPrice || 0)) || 0), 0);
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
  promotions: { productId?: string; productIds?: string[]; discountType?: 'percent' | 'amount'; type?: 'percentage' | 'fixed'; discountValue?: number; value?: number; startDate: string; endDate: string; active?: boolean; status?: string; maxQuantity?: number }[],
  date: string = new Date().toISOString()
): number | null => {
  const now = new Date(date);
  const matchingPromos = promotions.filter((p) => {
    const isActive = (p.active === true) || (p.status === 'active');
    if (!isActive) return false;
    const matches = p.productId === product.id || (Array.isArray(p.productIds) && p.productIds.includes(product.id));
    if (!matches) return false;
    if (new Date(p.startDate) > now) return false;
    if (new Date(p.endDate) < now) return false;
    return true;
  });
  if (matchingPromos.length === 0) return null;

  const compute = (p: typeof matchingPromos[number]): number => {
    const isPercent = (p.discountType === 'percent') || (p.type === 'percentage');
    const val = p.discountValue ?? p.value ?? 0;
    return isPercent ? product.retailPrice * (1 - val / 100) : Math.max(0, product.retailPrice - val);
  };

  const activePromo = matchingPromos.reduce((best, p) => {
    if (!best) return p;
    return compute(p) < compute(best) ? p : best;
  }, null as typeof matchingPromos[number] | null);
  if (!activePromo) return null;
  return compute(activePromo);
};

export const resolveUnitPrice = (
  product: Product,
  qty: number,
  promotions: Parameters<typeof applyPromotionPrice>[1]
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
  const lang: PrintLanguage = (settings as any)?.printLanguage || (settings as any)?.language || 'ar';
  const isRtl = lang === 'ar' || lang === 'ar-fr';
  const direction = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';
  const alignOpposite = isRtl ? 'left' : 'right';

  const items = sale.items
    .map(
      (item) => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;border-bottom:1px dashed #e2e8f0;">
      <span style="font-weight:600;">${item.name} <span style="color:#64748b;font-size:11px;">x${item.qty}</span></span>
      <span style="font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;">${formatFullNumber(item.lineTotal, 2, 2)}</span>
    </div>`
    )
    .join('');

  const qrValue = `${sale.number}|${sale.date}|${sale.total}`;
  const qrSvg = generateQrSvg(qrValue, 100);

  return `
    <div class="receipt-80mm" style="direction:${direction};text-align:${textAlign};padding:8px;font-family:'Cairo','Tajawal',-apple-system,BlinkMacSystemFont,sans-serif;color:#0f172a;max-width:80mm;margin:0 auto;box-sizing:border-box;">
      <div style="text-align:center;">
        <h2 style="font-size:16px;font-weight:800;margin:0 0 4px 0;">${settings.shopName || 'AN POS'}</h2>
        ${settings.phone ? `<p style="margin:2px 0;font-size:11px;color:#475569;">${t('phone', lang)}: ${settings.phone}</p>` : ''}
      </div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0;" />
      <div style="font-size:11px;line-height:1.6;">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;">${t('invoiceNumber', lang)}:</span>
          <span style="font-weight:bold;">${sale.number}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;">${t('date', lang)}:</span>
          <span>${new Date(sale.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'ar-DZ')}</span>
        </div>
        ${sale.soldBy ? `
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;">${t('cashier', lang)}:</span>
          <span>${sale.soldBy}</span>
        </div>` : ''}
        ${sale.customerName ? `
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748b;">${t('customer', lang)}:</span>
          <span style="font-weight:bold;">${sale.customerName}</span>
        </div>` : ''}
      </div>
      <hr style="border:none;border-top:1px solid #cbd5e1;margin:8px 0;" />
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:bold;color:#475569;margin-bottom:4px;">
        <span>${t('item', lang)}</span>
        <span>${t('total', lang)}</span>
      </div>
      ${items}
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0;" />
      <div style="font-size:12px;line-height:1.6;">
        <div style="display:flex;justify-content:space-between;">
          <span>${t('subtotal', lang)}:</span>
          <span style="font-weight:600;font-variant-numeric:tabular-nums;">${formatFullNumber(sale.subtotal, 2, 2)}</span>
        </div>
        ${sale.discount > 0 ? `
        <div style="display:flex;justify-content:space-between;color:#dc2626;">
          <span>${t('discount', lang)}:</span>
          <span style="font-weight:600;font-variant-numeric:tabular-nums;">-${formatFullNumber(sale.discount, 2, 2)}</span>
        </div>` : ''}
        ${settings.tvaRate > 0 ? `
        <div style="display:flex;justify-content:space-between;">
          <span>${t('tva', lang)} (${settings.tvaRate}%):</span>
          <span style="font-weight:600;font-variant-numeric:tabular-nums;">${formatFullNumber(sale.tvaAmount, 2, 2)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:900;margin-top:6px;padding-top:4px;border-top:1px solid #0f172a;">
          <span>${t('total', lang)}:</span>
          <span style="font-variant-numeric:tabular-nums;">${formatFullNumber(sale.total, 2, 2)} ${t('currency', lang)}</span>
        </div>
      </div>
      <hr style="border:none;border-top:1px dashed #cbd5e1;margin:8px 0;" />
      <div style="text-align:center;margin:6px 0;">
        ${qrSvg}
      </div>
      <p style="font-size:10px;color:#64748b;text-align:center;margin:6px 0 0 0;">${settings.receiptFooter || t('thankYou', lang)}</p>
    </div>
  `;
};

