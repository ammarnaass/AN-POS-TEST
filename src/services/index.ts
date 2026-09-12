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
  const wsPrice = Number(product.wholesalePrice || (product as any).wholesale_price || (product as any).salePrice3 || 0);
  const rtPrice = Number(product.retailPrice || (product as any).retail_price || (product as any).salePrice1 || (product as any).price || 0);
  if (product.wholesaleMinQty > 0 && qty >= product.wholesaleMinQty && wsPrice > 0) {
    return wsPrice;
  }
  return rtPrice > 0 ? rtPrice : Number(product.retailPrice || 0);
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

export const getProductTierPrice = (
  prod: Product | any,
  tier: '1' | '2' | '3' | '4' = '1'
): number => {
  if (!prod) return 0;

  // Price 1: تجزئة (Retail)
  const p1 = Number(
    prod.salePrice1 ||
    prod.sale_price1 ||
    prod.retailPrice ||
    prod.retail_price ||
    prod.salePrice ||
    prod.sale_price ||
    prod.unitPrice ||
    prod.unit_price ||
    prod.price ||
    0
  );

  // Price 2: نصف جملة (Semi-wholesale)
  const rawP2 = Number(prod.salePrice2 || prod.sale_price2 || 0);
  const p2 = rawP2 > 0 ? rawP2 : p1;

  // Price 3: جملة (Wholesale)
  const rawP3 = Number(
    prod.salePrice3 ||
    prod.sale_price3 ||
    prod.wholesalePrice ||
    prod.wholesale_price ||
    prod.wholesale ||
    0
  );
  const p3 = rawP3 > 0 ? rawP3 : p1;

  // Price 4: خاص / بالفاتورة (Special / Invoice)
  const rawP4 = Number(prod.invoicePrice || prod.invoice_price || prod.salePrice4 || prod.sale_price4 || 0);
  const p4 = rawP4 > 0 ? rawP4 : (rawP3 > 0 ? rawP3 : p1);

  switch (tier) {
    case '1': return p1;
    case '2': return p2;
    case '3': return p3;
    case '4': return p4;
    default: return p1;
  }
};

export const resolveUnitPrice = (
  product: Product,
  qty: number,
  promotions: Parameters<typeof applyPromotionPrice>[1],
  forceWholesale: boolean = false,
  priceTier?: '1' | '2' | '3' | '4'
): number => {
  if (priceTier && priceTier !== '1') {
    return getProductTierPrice(product, priceTier);
  }
  if (forceWholesale) {
    const ws = Number(product.salePrice3 || (product as any).sale_price3 || product.wholesalePrice || (product as any).wholesale_price || 0);
    if (ws > 0) return ws;
  }
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

