/**
 * Sale & POS Service
 * Centralized business logic for POS checkout, stock movements, and barcode lookups.
 */
import { db, ensureInit } from './db';
import { generateId } from '@shared/utils';
import type { CartItem, Customer, Product, Pack, User } from '@shared/types';
import type { PrintInvoiceData } from './print';
import { getOpenSession, addToSessionSales } from './cashSessionService';
import { validateSale } from '@shared/validators/saleValidator';
import { syncEngine } from './syncEngine';

export interface CheckoutParams {
  cart: CartItem[];
  subtotal: number;
  discount: number;
  discountType: 'amount' | 'percent';
  tax: number;
  total: number;
  finalMethod: 'cash' | 'credit' | 'card' | 'transfer';
  effectivePaid: number;
  effectiveStatus: 'paid' | 'partial' | 'pending';
  changeDue: number;
  selectedCustomer: Customer | null;
  user: User | null;
  packs: Pack[];
  checkoutNote: string;
  hasOpenSession: boolean;
}

export interface CheckoutResult {
  success: boolean;
  saleId: string;
  invoiceNumber: string;
  invoiceData: PrintInvoiceData;
  changeDue: number;
}

/**
 * Searches a product by primary barcode, secondary barcode (from product_barcodes table), or SKU/Name.
 */
export async function findProductByBarcodeOrQuery(code: string): Promise<Product | null> {
  if (!code || !code.trim()) return null;
  await ensureInit();

  const query = code.trim();

  // 1. Fast direct indexed match on primary barcode
  try {
    const directBarcode = await db.products.where('barcode').equals(query).first();
    if (directBarcode) return directBarcode;
  } catch {}

  // 2. Fast search in product_barcodes table (secondary barcodes)
  try {
    const matchSecondary = await db.productBarcodes.where('barcode').equals(query).first();
    if (matchSecondary) {
      const prodId = matchSecondary.productId || matchSecondary.product_id;
      if (prodId) {
        const found = await db.products.get(prodId);
        if (found) return found;
      }
    }
  } catch {}

  // 3. Fast search in custom prices
  try {
    const allProds = await db.products.toArray();
    for (const p of allProds) {
      const rawCP = (p as any).custom_prices ?? (p as any).customPrices;
      if (rawCP) {
        try {
          const cPrices = typeof rawCP === 'string' ? JSON.parse(rawCP) : (Array.isArray(rawCP) ? rawCP : []);
          const matchCP = cPrices.find((cp: any) => cp.barcode && String(cp.barcode).trim().toLowerCase() === query.toLowerCase());
          if (matchCP) return p;
        } catch {}
      }
    }
  } catch {}

  // 4. Fast match on SKU
  try {
    const directSku = await db.products.where('sku').equals(query).first();
    if (directSku) return directSku;
  } catch {}

  // 5. Fallback name/barcode partial search (limit to 1 item)
  try {
    const searchRes = await db.products.where('name').equals(query).first();
    if (searchRes) return searchRes;
  } catch {}

  return null;
}

/**
 * Executes a full checkout transaction:
 * 1. Inserts into sales table
 * 2. Inserts into sale_items table
 * 3. Deducts stock & creates stock_movements (v1 & v2)
 * 4. Updates customer balance & records payment
 * 5. Updates cash session
 */
export async function executeCheckout(params: CheckoutParams): Promise<CheckoutResult> {
  await ensureInit();

  const {
    cart,
    subtotal,
    discount,
    discountType,
    tax,
    total,
    finalMethod,
    effectivePaid,
    effectiveStatus,
    changeDue,
    selectedCustomer,
    user,
    packs,
    checkoutNote,
    hasOpenSession,
  } = params;

  // Validate before executing
  const validation = validateSale({
    cart,
    subtotal,
    discount,
    total,
    paymentMethod: finalMethod,
    amountPaid: effectivePaid,
    selectedCustomer,
  });

  if (!validation.isValid) {
    throw new Error(validation.errors.join('\n'));
  }

  const nowIso = new Date().toISOString();
  const saleId = generateId();
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

  // 1. Insert into sales table
  const mappedItems = cart.map((c) => ({
    productId: c.productId,
    name: c.name,
    qty: c.qty,
    unitPrice: c.unitPrice,
    lineTotal: c.lineTotal,
    promoName: c.promoName,
    isPack: c.isPack,
    packId: c.packId,
    isCustom: c.isCustom,
  }));

  const saleRecord = {
    id: saleId,
    number: invoiceNumber,
    date: nowIso,
    doc_type: 'facture',
    type: 'sale',
    items: JSON.stringify(mappedItems),
    subtotal,
    discount,
    discountType,
    discount_type: discountType,
    tvaAmount: tax,
    tva_amount: tax,
    total,
    paymentMethod: finalMethod,
    payment_method: finalMethod,
    customerId: selectedCustomer?.id || '',
    customer_id: selectedCustomer?.id || '',
    customerName: selectedCustomer?.name || 'زبون عام',
    customer_name: selectedCustomer?.name || 'زبون عام',
    amountPaid: effectivePaid,
    amount_paid: effectivePaid,
    status: effectiveStatus,
    soldBy: user?.name || user?.username || 'الكاشير',
    sold_by: user?.name || user?.username || 'الكاشير',
    cash_session_id: (await getOpenSession())?.id || '',
    note: checkoutNote.trim(),
    created_at: nowIso,
    updated_at: nowIso,
  };

  await db.sales.add(saleRecord);
  await syncEngine.enqueue('create', 'sales', saleId, saleRecord);

  // 2. Insert individual sale_items & handle stock deduction
  for (const item of cart) {
    const saleItemId = generateId();
    const saleItemRecord = {
      id: saleItemId,
      sale_id: saleId,
      product_id: item.productId,
      name: item.name,
      qty: item.qty,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      created_at: nowIso,
    };

    try {
      await db.saleItems.add(saleItemRecord);
      // البنود تُرسل مدمجة داخل payload الفاتورة الأم في syncEngine لمنع الازدواجية وخصم المخزون المزدوج
    } catch (e) {
      console.warn('[SaleService] Failed to insert sale_item:', e);
    }

    // Stock deduction
    if (item.isPack && item.packId) {
      const packData = packs.find((pk) => pk.id === item.packId);
      if (packData && packData.items) {
        const rawSubItems: any[] =
          typeof packData.items === 'string' ? JSON.parse(packData.items) : packData.items;
        for (const sub of rawSubItems) {
          const subProdId = sub.productId || sub.product_id;
          const subTotalQty = (Number(sub.qty || 1)) * item.qty;
          try {
            const p = await db.products.get(subProdId);
            if (p) {
              const currentQty = Number(p.quantity || (p as any).qty || 0);
              await db.products.update(subProdId, {
                quantity: Math.max(0, currentQty - subTotalQty),
                updated_at: nowIso,
              });
              await db.stockMovements.add({
                id: generateId(),
                date: nowIso,
                type: 'out',
                product_id: subProdId,
                qty: subTotalQty,
                reason: `مبيعات باقة (${packData.name}) - فاتورة ${invoiceNumber}`,
                reference: invoiceNumber,
                reference_id: saleId,
                created_by: user?.name || user?.username || '',
                created_at: nowIso,
              }).catch(() => {});
            }
          } catch (err) {
            console.warn('[SaleService] Failed pack stock deduction:', err);
          }
        }
      }
    } else if (!item.isCustom) {
      try {
        const prod = await db.products.get(item.productId);
        if (prod) {
          const currentQty = Number(prod.quantity || (prod as any).qty || 0);
          const newQty = Math.max(0, currentQty - item.qty);
          await db.products.update(item.productId, {
            quantity: newQty,
            updated_at: nowIso,
          });

          await db.stockMovements.add({
            id: generateId(),
            date: nowIso,
            type: 'out',
            product_id: item.productId,
            qty: item.qty,
            reason: `مبيعات فاتورة ${invoiceNumber}`,
            reference: invoiceNumber,
            reference_id: saleId,
            created_by: user?.name || user?.username || '',
            created_at: nowIso,
          }).catch(() => {});

          // Stock movement v2 for desktop sync parity
          const movV2Id = generateId();
          const movV2Record = {
            id: movV2Id,
            movement_number: `MOV-${Date.now().toString().slice(-6)}`,
            date: nowIso,
            type: 'sale',
            warehouse_id: (prod as any).warehouseId || (prod as any).warehouse_id || 'main',
            item_id: item.productId,
            quantity: -item.qty,
            unit_price: item.unitPrice,
            total_amount: item.lineTotal,
            reference: invoiceNumber,
            is_reviewed: 1,
            reviewed_by: user?.name || user?.username || '',
            created_at: nowIso,
            updated_at: nowIso,
          };
          await db.stockMovementsV2.add(movV2Record).catch(() => {});
          await syncEngine.enqueue('create', 'stock_movements_v2', movV2Id, movV2Record);
        }
      } catch (e) {
        console.warn('[SaleService] Failed product stock update:', e);
      }
    }
  }

  // 3. Customer debt & payment update
  if (selectedCustomer?.id) {
    try {
      const cust = await db.customers.get(selectedCustomer.id);
      if (cust) {
        const debtToAdd = Math.max(0, total - effectivePaid);
        if (debtToAdd > 0) {
          const currentBal = Number(cust.balance || 0);
          await db.customers.update(selectedCustomer.id, {
            balance: currentBal + debtToAdd,
            updated_at: nowIso,
          });
        }

        if (effectivePaid > 0) {
          const paymentId = generateId();
          const paymentRecord = {
            id: paymentId,
            date: nowIso,
            party_type: 'customer',
            party_id: selectedCustomer.id,
            customer_id: selectedCustomer.id,
            amount: effectivePaid,
            type: 'credit',
            method: finalMethod,
            note: `سداد فوري لفاتورة ${invoiceNumber}`,
            created_by: user?.name || user?.username || '',
            created_at: nowIso,
          };
          await db.payments.add(paymentRecord);
          await syncEngine.enqueue('create', 'payments', paymentId, paymentRecord);
        }
      }
    } catch (e) {
      console.warn('[SaleService] Failed customer debt update:', e);
    }
  }

  // 4. Update cash session
  if (finalMethod === 'cash' && effectivePaid > 0 && hasOpenSession) {
    try {
      const s = await getOpenSession();
      if (s) await addToSessionSales(s.id, effectivePaid);
    } catch {}
  }

  // 5. Build invoice data object
  const invoiceData: PrintInvoiceData = {
    id: saleId,
    number: invoiceNumber,
    date: nowIso,
    items: cart.map((c) => ({
      name: c.name,
      qty: c.qty,
      unitPrice: c.unitPrice,
      lineTotal: c.lineTotal,
    })),
    subtotal,
    discount,
    tvaAmount: tax,
    total,
    paymentMethod: finalMethod === 'credit' ? 'آجل (كريدي)' : 'نقداً',
    customerName: selectedCustomer?.name || 'زبون عام',
    soldBy: user?.name || user?.username || 'الكاشير',
    docType: 'sale-invoice',
  };

  return {
    success: true,
    saleId,
    invoiceNumber,
    invoiceData,
    changeDue,
  };
}
