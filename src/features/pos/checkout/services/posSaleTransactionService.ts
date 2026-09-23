import { db, type SaleItemEntity } from '@/infrastructure/database/dexie/db';
import { SaleRepository } from '@/infrastructure/database/repositories/SaleRepository';
import { calculateSaleTotal, createSale } from '@/services';
import type { CartItem, Sale, DocType } from '@/types';
import { v4 as createId } from 'uuid';
import { calculatePaymentBreakdown } from './posPaymentCalculationService';
import type { SaleSettings, SaleCompletionParams } from '../types';

/**
 * إثراء عناصر السلة ببيانات العبوات والطرود التلقائية لضمان حفظها وضبط التقرير
 */
export function enrichCartItems(
  cart: CartItem[],
  activeProducts: any[],
  activePacks: any[],
  isWholesaleSale: boolean
): CartItem[] {
  return cart.map((item) => {
    const prod = activeProducts.find((p: any) => p.id === item.productId);
    const pk = activePacks.find((p: any) => p.id === item.packId || item.productId === `pack-${p.id}`);
    const pkgSize = prod?.packageSize ? parseInt(prod.packageSize, 10) : 0;
    const piecesCount = Number(item.packPiecesCount || pk?.piecesCount || (pkgSize > 0 ? pkgSize : 0) || 1);
    const unitName = String(item.packUnit || pk?.unitName || prod?.unit || (piecesCount > 1 ? 'طرد' : 'قطعة'));
    const isPack = Boolean(item.isPack || pk || piecesCount > 1);

    const packQty =
      item.packQty ||
      (isWholesaleSale ? item.qty : piecesCount > 1 ? Math.max(1, Math.round(item.qty / piecesCount)) : 1);
    const packMode =
      item.packMode ||
      (isWholesaleSale ? 'wholesale_packs' : isPack ? 'retail_pieces' : undefined);

    return {
      ...item,
      isPack,
      packPiecesCount: piecesCount,
      packUnit: unitName,
      packQty,
      packMode,
      pricingType: item.pricingType || (isWholesaleSale ? 'wholesale' : 'retail'),
    };
  });
}

/**
 * حساب فروقات المخزون لكل منتج لتطبيق التحديث التفاؤلي والمعاملة الذرية
 */
export function calculateInventoryDeltas(
  enrichedCart: CartItem[],
  activeProducts: any[],
  activePacks: any[],
  isWholesaleSale: boolean,
  saleType: 'sale' | 'return'
): Map<string, number> {
  const deltas = new Map<string, number>();

  for (const item of enrichedCart) {
    if (item.isPack && item.packId) {
      const cleanPackId = item.packId.replace(/^pack-/, '');
      const pack = activePacks.find((p: any) => p.id === item.packId || p.id === cleanPackId);
      if (pack) {
        const rawItems = Array.isArray(pack.items)
          ? pack.items
          : (() => {
              try {
                return JSON.parse(pack.items as any) ?? [];
              } catch {
                return [];
              }
            })();
        if (rawItems.length > 0) {
          for (const comp of rawItems) {
            const compProductId = comp.productId ?? comp.product_id;
            const compQty = Number(comp.qty ?? comp.quantity ?? 1);
            const totalPiecesSold = item.packMode === 'retail_pieces' ? item.qty : compQty * item.qty;
            const qtyChange = saleType === 'return' ? Math.abs(totalPiecesSold) : -totalPiecesSold;
            deltas.set(compProductId, (deltas.get(compProductId) || 0) + qtyChange);
          }
          continue;
        }
      }
    }

    // منتج منفرد أو عبوة جملة لمنتج يمتلك حجم تعبئة package_size
    const effectiveProdId = item.productId.replace(/^pack-/, '');
    const product = activeProducts.find((p: any) => p.id === effectiveProdId || p.id === item.productId);
    const pieces = Number(item.packPiecesCount || (product?.packageSize ? parseInt(product.packageSize, 10) : 1) || 1);
    const isWholesalePack = item.packMode === 'wholesale_packs' || (isWholesaleSale && pieces > 1);
    const totalPiecesSold = isWholesalePack && pieces > 1 ? item.qty * pieces : item.qty;
    const qtyChange = saleType === 'return' ? Math.abs(totalPiecesSold) : -totalPiecesSold;
    const targetId = product?.id || effectiveProdId;
    deltas.set(targetId, (deltas.get(targetId) || 0) + qtyChange);
  }

  return deltas;
}

export interface PreparedSaleTransaction {
  sale: Sale;
  saleItemEntities: SaleItemEntity[];
  deltas: Map<string, number>;
  saleSummary: ReturnType<typeof calculateSaleTotal>;
  isWholesaleSale: boolean;
  saleType: 'sale' | 'return';
}

/**
 * تجهيز بيانات الفاتورة وسجلاتها الحسابية قبل الحفظ في قاعدة البيانات
 */
export async function prepareSaleTransaction(
  params: SaleCompletionParams,
  settings: SaleSettings,
  currentUserName: string
): Promise<PreparedSaleTransaction> {
  const {
    cart,
    discount,
    discountType,
    selectedCustomer,
    paymentMethod,
    isReturn = false,
    docType = 'facture',
    priceTier,
    currentSession,
    products,
    packs,
    customers,
    note,
  } = params;

  const saleSummary = calculateSaleTotal(cart, discount, discountType, settings?.tvaRate || 0);
  const isReturnSale = Boolean(isReturn || params.saleType === 'return');
  const saleType: 'sale' | 'return' = isReturnSale ? 'return' : 'sale';
  const nextNumber = await SaleRepository.getNextNumber(settings?.invoicePrefix || 'INV');

  // حساب المبالغ الصافية وحالة الدفع عبر خدمة الحسابات
  const rawPaid = params.paidAmount ?? params.amountPaid;
  const breakdown = calculatePaymentBreakdown(paymentMethod, rawPaid, saleSummary.total);

  // جلب بيانات العميل المختار إن وجد
  const matchedCustomer =
    selectedCustomer && Array.isArray(customers)
      ? customers.find((c: any) => c.id === selectedCustomer)
      : undefined;
  const customerName = matchedCustomer?.name || params.customerName || '';

  // تحديد نوع الفاتورة بدقة: س3 جملة دائماً wholesale، وس1 و س2 و س4 دائماً بيع عادي facture
  const isWholesaleSale =
    priceTier === '3' || (!['1', '2', '4'].includes(priceTier || '') && docType === 'wholesale');
  const resolvedDocType: DocType = isWholesaleSale ? 'wholesale' : 'facture';

  const activeProducts = Array.isArray(products) ? products : [];
  const activePacks = Array.isArray(packs) ? packs : [];

  const enrichedCart = enrichCartItems(cart, activeProducts, activePacks, isWholesaleSale);

  const baseSale = createSale(
    enrichedCart,
    saleSummary.subtotal,
    discount,
    discountType,
    saleSummary.tvaAmount,
    saleSummary.total,
    paymentMethod,
    selectedCustomer,
    breakdown.effectivePaidAmount,
    currentUserName,
    currentSession?.id || '',
    settings as any,
    saleType,
    resolvedDocType
  );

  const defaultReturnNote =
    isReturnSale && (params.originalSaleNumber || params.originalSaleId)
      ? `مرتجع للفاتورة #${params.originalSaleNumber || params.originalSaleId}${params.returnReason ? ` - سبب: ${params.returnReason}` : ''}`
      : '';
  const finalNote = note
    ? (defaultReturnNote ? `${defaultReturnNote} | ${note}` : note)
    : defaultReturnNote;

  const sale: Sale = {
    ...baseSale,
    number: nextNumber,
    customerName,
    note: finalNote,
    paymentMethod,
    status: breakdown.paymentStatus,
    paidAmount: breakdown.effectivePaidAmount,
    items: enrichedCart,
    originalSaleId: params.originalSaleId,
    originalSaleNumber: params.originalSaleNumber,
    returnReason: params.returnReason,
    refundMethod: params.refundMethod,
  };

  const saleItemEntities: SaleItemEntity[] = enrichedCart.map((item) => ({
    id: createId(),
    saleId: sale.id,
    productId: item.productId,
    name: item.name,
    qty: item.qty,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  }));

  const deltas = calculateInventoryDeltas(enrichedCart, activeProducts, activePacks, isWholesaleSale, saleType);

  return {
    sale,
    saleItemEntities,
    deltas,
    saleSummary,
    isWholesaleSale,
    saleType,
  };
}

/**
 * تنفيذ المعاملة الذرية (ACID Atomic Sale Execution)
 * يدعم بيئة Electron IPC مع تراجع سلس ومحكم إلى قاعدة بيانات المتصفح Dexie
 */
export async function executeAtomicSaleTransaction({
  prepared,
  settings,
  currentUserName,
  currentSessionId,
  params,
}: {
  prepared: PreparedSaleTransaction;
  settings: SaleSettings;
  currentUserName: string;
  currentSessionId?: string;
  params: SaleCompletionParams;
}): Promise<void> {
  const { sale, saleItemEntities, deltas, saleSummary, saleType } = prepared;
  const electronApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;

  if (electronApi?.sales?.create) {
    const payload = {
      ...sale,
      items: sale.items,
      discountType: sale.discountType,
      docType: sale.docType,
      paymentMethod: sale.paymentMethod,
      customerId: sale.customerId,
      customerName: sale.customerName,
      amountPaid: sale.paidAmount,
      status: sale.status,
      soldBy: currentUserName,
      cashSessionId: currentSessionId || '',
      note: sale.note,
      refundMethod: params.refundMethod,
      originalSaleId: params.originalSaleId,
      originalSaleNumber: params.originalSaleNumber,
      returnReason: params.returnReason,
      allowNegativeStock: settings?.allowNegativeStock ?? false,
    };

    const res = await electronApi.sales.create(payload);
    if (!res || res.data === null) {
      throw new Error('فشل تسجيل الفاتورة في قاعدة البيانات المركزية');
    }

    // تحديث كاش الفاتورة والمنتجات محلياً في Dexie لضمان عدم حدوث أي وميض (Flicker-Free)
    await db.sales.put(sale as any).catch(() => {});
    for (const [prodId, delta] of deltas.entries()) {
      const currentProd = await db.products.get(prodId).catch(() => null);
      if (currentProd) {
        const newQty = settings?.allowNegativeStock
          ? (currentProd.quantity || 0) + delta
          : Math.max(0, (currentProd.quantity || 0) + delta);
        await db.products.update(prodId, { quantity: newQty }).catch(() => {});
      }
    }

    // تحديث الصندوق محلياً عند الاسترداد النقدي في بيئة Electron لضمان الانعكاس الفوري 0ms
    if (saleType === 'return') {
      const isCashRefund =
        params.refundMethod === 'cash' ||
        (!params.refundMethod && sale.paymentMethod === 'cash');
      if (isCashRefund && currentSessionId) {
        const freshSession = await db.cash_sessions.get(currentSessionId).catch(() => null);
        if (freshSession) {
          await db.cash_sessions
            .update(currentSessionId, {
              totalReturns: (freshSession.totalReturns || 0) + saleSummary.total,
              actualBalance: (freshSession.actualBalance || 0) - saleSummary.total,
              updatedAt: new Date().toISOString(),
            })
            .catch(() => {});
        }
      }
    }
  } else {
    // بيئة المتصفح / الاختبار: تنفيذ المعاملة الذرية عبر Dexie Transaction
    await db.transaction(
      'rw',
      [
        db.sales,
        db.sale_items,
        db.products,
        db.customers,
        db.cash_sessions,
        db.stock_movements,
      ],
      async () => {
        // 1. حفظ الفاتورة وعناصرها
        await db.sales.add(sale as any);
        if (saleItemEntities.length > 0) {
          await db.sale_items.bulkAdd(saleItemEntities);
        }

        // 2. تحديث المخزون وحركات المخزن لكل منتج
        for (const [prodId, delta] of deltas.entries()) {
          const product = await db.products.get(prodId);
          if (product) {
            const newQuantity = settings?.allowNegativeStock
              ? product.quantity + delta
              : Math.max(0, product.quantity + delta);
            await db.products.update(prodId, { quantity: newQuantity });
            await db.stock_movements.add({
              id: createId(),
              productId: prodId,
              type: saleType === 'return' ? 'return' : 'sale',
              qty: delta,
              date: new Date().toISOString(),
              reference: sale.number,
              createdBy: currentUserName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 3. تحديث رصيد العميل في حال البيع بالدين أو الإرجاع
        if (sale.customerId) {
          const freshCustomer = await db.customers.get(sale.customerId);
          const currentBalance = Number(freshCustomer?.balance || 0);

          if (saleType === 'return') {
            const isCustomerCreditRefund =
              params.refundMethod === 'customer_credit' ||
              (sale.paymentMethod === 'credit' && params.refundMethod !== 'cash');
            if (isCustomerCreditRefund) {
              await db.customers.update(sale.customerId, {
                balance: currentBalance - saleSummary.total,
                updatedAt: new Date().toISOString(),
              });
            }
          } else if (sale.paymentMethod === 'credit') {
            const unpaidPart = Math.max(0, saleSummary.total - (sale.paidAmount || 0));
            await db.customers.update(sale.customerId, {
              balance: currentBalance + unpaidPart,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // 4. تحديث الصندوق والجلسة النقدية المفتوحة بالمبلغ النقدي المستلم فعلياً
        let targetSessionId = currentSessionId;
        if (!targetSessionId) {
          const openSession = await db.cash_sessions.where('status').equals('open').first();
          if (openSession) targetSessionId = openSession.id;
        }

        if (targetSessionId) {
          const freshSession = await db.cash_sessions.get(targetSessionId);
          if (freshSession) {
            if (saleType === 'return') {
              const isCashRefund =
                params.refundMethod === 'cash' ||
                (!params.refundMethod && sale.paymentMethod === 'cash');
              if (isCashRefund) {
                const newReturns = (freshSession.totalReturns || 0) + saleSummary.total;
                await db.cash_sessions.update(targetSessionId, {
                  totalReturns: newReturns,
                  updatedAt: new Date().toISOString(),
                });
              }
            } else {
              const cashInflow = sale.paidAmount || 0;
              const newSales = (freshSession.totalSales || 0) + cashInflow;
              await db.cash_sessions.update(targetSessionId, {
                totalSales: newSales,
                updatedAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    );
  }
}
