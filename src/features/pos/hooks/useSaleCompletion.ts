import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, type SaleItemEntity } from '@/infrastructure/database/dexie/db';
import { SaleRepository } from '@/infrastructure/database/repositories/SaleRepository';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { calculateSaleTotal, createSale } from '@/services';
import { printDocument } from '@/services/print/printService';
import type { CartItem, Sale, DocType } from '@/types';
import { v4 as createId } from 'uuid';
import { isTrialExpired, incrementTrialSales } from '@/services/trialService';
import { isLicensed } from '@/services/licenseService';

interface SaleSettings {
  tvaRate: number;
  invoicePrefix: string;
  baseCurrency: string;
  shopName: string;
  phone: string;
  receiptFooter: string;
  autoPrintReceipt?: boolean;
  allowNegativeStock?: boolean;
}

interface SaleCompletionParams {
  cart: CartItem[];
  discount: number;
  discountType: 'percent' | 'amount';
  selectedCustomer: string;
  paymentMethod: 'cash' | 'credit';
  amountPaid?: number;
  paidAmount?: number;
  isReturn?: boolean;
  docType?: DocType;
  priceTier?: '1' | '2' | '3' | '4';
  autoPrint?: boolean;
  note?: string;
  currentSession: { id: string; totalSales?: number; totalReturns?: number } | null;
  settings: SaleSettings;
  products: any[];
  packs: any[];
  customers: any[];
}

export function useSaleCompletion(settings: SaleSettings, onSaleSuccess?: (sale: Sale) => void) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const { clear: clearCart } = useCartStore();

  const completeSaleMutation = useMutation({
    mutationFn: async (params: SaleCompletionParams) => {
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

      if (currentUser?.role !== 'developer' && !isLicensed() && isTrialExpired(currentUser?.role)) {
        throw new Error('انتهت فترة التجربة المجانية (7 أيام). يرجى تفعيل النظام للمتابعة.');
      }

      const saleSummary = calculateSaleTotal(cart, discount, discountType, settings?.tvaRate || 0);
      const isReturnSale = Boolean(isReturn || (params as any).saleType === 'return');
      const saleType = isReturnSale ? 'return' : 'sale';
      const nextNumber = await SaleRepository.getNextNumber(settings?.invoicePrefix || 'INV');

      // تحديد المبلغ المدفوع فعلياً
      const effectivePaidAmount =
        paymentMethod === 'cash'
          ? saleSummary.total
          : (params.paidAmount ?? params.amountPaid ?? 0);

      // جلب بيانات العميل المختار إن وجد
      const matchedCustomer = (selectedCustomer && Array.isArray(customers))
        ? customers.find((c) => c.id === selectedCustomer)
        : undefined;
      const customerName = matchedCustomer?.name || (params as any).customerName || '';
      // تحديد نوع الفاتورة بدقة: س3 جملة دائماً wholesale، وس1 و س2 و س4 دائماً بيع عادي facture
      const isWholesaleSale =
        priceTier === '3' ||
        (!['1', '2', '4'].includes(priceTier || '') && docType === 'wholesale');
      const resolvedDocType: DocType = isWholesaleSale ? 'wholesale' : 'facture';

      const activeProducts = (products && products.length > 0)
        ? products
        : (queryClient.getQueryData<any[]>(['products']) || []);
      const activePacks = (packs && packs.length > 0)
        ? packs
        : (queryClient.getQueryData<any[]>(['packs']) || []);

      // إثراء عناصر السلة ببيانات العبوات والتعبئة التلقائية لضمان حفظها وظهورها في كافة فواتير الجملة
      const enrichedCart = cart.map((item) => {
        const prod = activeProducts.find((p: any) => p.id === item.productId);
        const pk = activePacks.find((p: any) => p.id === item.packId || item.productId === `pack-${p.id}`);
        const pkgSize = prod?.packageSize ? parseInt(prod.packageSize, 10) : 0;
        const piecesCount = Number(item.packPiecesCount || pk?.piecesCount || (pkgSize > 0 ? pkgSize : 0) || 1);
        const unitName = String(item.packUnit || pk?.unitName || prod?.unit || (piecesCount > 1 ? 'طرد' : 'قطعة'));
        const isPack = Boolean(item.isPack || pk || piecesCount > 1);

        const packQty = item.packQty || (isWholesaleSale ? item.qty : (piecesCount > 1 ? Math.max(1, Math.round(item.qty / piecesCount)) : 1));
        const packMode = item.packMode || (isWholesaleSale ? 'wholesale_packs' : (isPack ? 'retail_pieces' : undefined));

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

      const baseSale = createSale(
        enrichedCart,
        saleSummary.subtotal,
        discount,
        discountType,
        saleSummary.tvaAmount,
        saleSummary.total,
        paymentMethod,
        selectedCustomer,
        effectivePaidAmount,
        currentUser?.name || '',
        currentSession?.id || '',
        settings as any,
        saleType,
        resolvedDocType
      );

      const sale: Sale = {
        ...baseSale,
        number: nextNumber,
        customerName,
        note: note || '',
        paidAmount: effectivePaidAmount,
        items: enrichedCart,
      };

      // تحضير سجلات عناصر البيع المنفردة لـ sale_items
      const saleItemEntities: SaleItemEntity[] = enrichedCart.map((item) => ({
        id: createId(),
        saleId: sale.id,
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      }));

      // 1. حساب فروقات المخزون لكل منتج لتطبيق التحديث التفاؤلي الفوري (0ms Latency)
      const deltas = new Map<string, number>();

      for (const item of enrichedCart) {
        if (item.isPack && item.packId) {
          const cleanPackId = item.packId.replace(/^pack-/, '');
          const pack = activePacks.find((p: any) => p.id === item.packId || p.id === cleanPackId);
          if (pack) {
            const rawItems = Array.isArray(pack.items)
              ? pack.items
              : (() => { try { return JSON.parse(pack.items as any) ?? []; } catch { return []; } })();
            if (rawItems.length > 0) {
              for (const comp of rawItems) {
                const compProductId = comp.productId ?? comp.product_id;
                const compQty = Number(comp.qty ?? comp.quantity ?? 1);
                const totalPiecesSold = item.packMode === 'retail_pieces' ? item.qty : (compQty * item.qty);
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
        const totalPiecesSold = (isWholesalePack && pieces > 1) ? (item.qty * pieces) : item.qty;
        const qtyChange = saleType === 'return' ? Math.abs(totalPiecesSold) : -totalPiecesSold;
        const targetId = product?.id || effectiveProdId;
        deltas.set(targetId, (deltas.get(targetId) || 0) + qtyChange);
      }

      // 2. تحديث تفاؤلي فوري لكاش المنتجات في React Query (0ms)
      queryClient.setQueryData<any[]>(['products'], (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((p) => {
          const delta = deltas.get(p.id);
          if (delta === undefined) return p;
          const newQuantity = settings?.allowNegativeStock
            ? p.quantity + delta
            : Math.max(0, p.quantity + delta);
          return { ...p, quantity: newQuantity };
        });
      });

      // 3. تحديث تفاؤلي فوري لرصيد العميل إذا كان بيعاً بالآجل أو مرتجعاً
      if (selectedCustomer) {
        queryClient.setQueryData<any[]>(['customers'], (old) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((c) => {
            if (c.id !== selectedCustomer) return c;
            if (saleType === 'return') {
              return { ...c, balance: (c.balance || 0) - saleSummary.total };
            } else if (paymentMethod === 'credit') {
              const unpaidPart = Math.max(0, saleSummary.total - effectivePaidAmount);
              return { ...c, balance: (c.balance || 0) + unpaidPart };
            }
            return c;
          });
        });
      }

      // تنفيذ المعاملة الذرية الحقيقية عبر IPC في بيئة Electron
      // أو التراجع الاحتياطي (Fallback) في بيئة المتصفح الخالص/الاختبار
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
          soldBy: currentUser?.name || '',
          cashSessionId: currentSession?.id || '',
          note: sale.note,
          allowNegativeStock: settings?.allowNegativeStock ?? false,
        };

        const res = await electronApi.sales.create(payload);
        if (!res || res.data === null) {
          throw new Error('فشل تسجيل الفاتورة في قاعدة البيانات المركزية');
        }

        // تحديث كاش الفاتورة والمنتجات محلياً في Dexie لضمان توافق الكاش دون وميض
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
      } else {
        // تنفيذ المعاملة الشاملة في قاعدة البيانات (Fallback)
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
            // 1. إضافة الفاتورة وعناصرها
            await db.sales.add(sale as any);
            if (saleItemEntities.length > 0) {
              await db.sale_items.bulkAdd(saleItemEntities);
            }

            // 2. تحديث المخزون وسجل الحركات
            for (const item of enrichedCart) {
              if (item.isPack && item.packId) {
                const cleanPackId = item.packId.replace(/^pack-/, '');
                const pack = activePacks.find((p: any) => p.id === item.packId || p.id === cleanPackId);
                if (pack) {
                  const rawItems = Array.isArray(pack.items)
                    ? pack.items
                    : (() => { try { return JSON.parse(pack.items as any) ?? []; } catch { return []; } })();
                  for (const comp of rawItems) {
                    const compProductId = comp.productId ?? comp.product_id;
                    const compQty = Number(comp.qty ?? comp.quantity ?? 1);
                    const product = activeProducts.find((p: any) => p.id === compProductId);
                    if (product) {
                      const totalPiecesSold = item.packMode === 'retail_pieces'
                        ? item.qty
                        : (compQty * item.qty);
                      const qtyChange =
                        saleType === 'return'
                          ? Math.abs(totalPiecesSold)
                          : -totalPiecesSold;
                      const newQuantity = settings?.allowNegativeStock
                        ? product.quantity + qtyChange
                        : Math.max(0, product.quantity + qtyChange);
                      await db.products.update(product.id, {
                        quantity: newQuantity,
                      });
                      await db.stock_movements.add({
                        id: createId(),
                        productId: product.id,
                        type: saleType === 'return' ? 'return' : 'sale',
                        qty: qtyChange,
                        date: new Date().toISOString(),
                        reference: sale.number,
                        createdBy: currentUser?.name || '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      });
                    }
                  }
                  continue;
                }
              }

              const effectiveProdId = item.productId.replace(/^pack-/, '');
              const product = activeProducts.find((p: any) => p.id === effectiveProdId || p.id === item.productId);
              if (product) {
                const pieces = Number(item.packPiecesCount || (product.packageSize ? parseInt(product.packageSize, 10) : 1) || 1);
                const isWholesalePack = item.packMode === 'wholesale_packs' || (isWholesaleSale && pieces > 1);
                const totalPiecesSold = (isWholesalePack && pieces > 1) ? (item.qty * pieces) : item.qty;
                const qtyChange = saleType === 'return' ? Math.abs(totalPiecesSold) : -totalPiecesSold;
                const newQuantity = settings?.allowNegativeStock
                  ? product.quantity + qtyChange
                  : Math.max(0, product.quantity + qtyChange);
                await db.products.update(product.id, {
                  quantity: newQuantity,
                });
                await db.stock_movements.add({
                  id: createId(),
                  productId: product.id,
                  type: saleType === 'return' ? 'return' : 'sale',
                  qty: qtyChange,
                  date: new Date().toISOString(),
                  reference: sale.number,
                  createdBy: currentUser?.name || '',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
            }

            // 3. تحديث رصيد العميل في حال الدفع بالآجل (الديون) أو الإرجاع
            if (selectedCustomer && matchedCustomer) {
              if (saleType === 'return') {
                // الإرجاع ينقص من دين العميل
                await db.customers.update(selectedCustomer, {
                  balance: (matchedCustomer.balance || 0) - saleSummary.total,
                });
              } else if (paymentMethod === 'credit') {
                // البيع بالآجل: الدين المتبقي = الإجمالي - المبلغ المدفوع حالياً
                const unpaidPart = Math.max(0, saleSummary.total - effectivePaidAmount);
                await db.customers.update(selectedCustomer, {
                  balance: (matchedCustomer.balance || 0) + unpaidPart,
                });
              }
            }

            // 4. تحديث الصندوق والجلسة النقدية المفتوحة بالمبلغ النقدي المستلم فعلياً
            let targetSessionId = currentSession?.id;
            if (!targetSessionId) {
              const openSession = await db.cash_sessions.where('status').equals('open').first();
              if (openSession) targetSessionId = openSession.id;
            }

            if (targetSessionId) {
              const freshSession = await db.cash_sessions.get(targetSessionId);
              if (freshSession) {
                if (saleType === 'return') {
                  const newReturns = (freshSession.totalReturns || 0) + saleSummary.total;
                  await db.cash_sessions.update(targetSessionId, {
                    totalReturns: newReturns,
                    updatedAt: new Date().toISOString(),
                  });
                } else {
                  const cashInflow = effectivePaidAmount;
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

      return {
        sale,
        autoPrint: params.autoPrint ?? settings.autoPrintReceipt ?? false,
      };
    },
    onSuccess: ({ sale, autoPrint }: { sale: Sale; autoPrint: boolean }) => {
      // تحديث الكاش وإعادة جلب البيانات الحديثة
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });

      // زيادة عدّاد مبيعات التجربة إذا كانت سارية
      if (currentUser?.role !== 'developer' && !isLicensed()) {
        incrementTrialSales();
      }

      // الطباعة التلقائية عبر محرك الطباعة (بدون تجميد أو نوافذ منبثقة معطلة)
      if (autoPrint && sale) {
        const isWholesale = sale.docType === 'wholesale';
        const defaultNormalDoc = (settings as any)?.invoiceTemplate === 'detailed'
          ? 'sale-invoice'
          : 'thermal-receipt';
        const printDocType = sale.type === 'return'
          ? 'return-invoice'
          : (isWholesale ? 'wholesale-invoice' : defaultNormalDoc);
        printDocument(sale.id, printDocType, {
          userId: currentUser?.id ?? '',
          userName: currentUser?.name ?? '',
          copies: 1,
        }).catch((err) => {
          console.warn('Auto-print error (silent):', err);
        });
      }

      clearCart();

      // إرسال إشعار فوري إلى نظام الإشعارات والتنبيهات
      const isReturn = sale.type === 'return';
      const formattedTotal = Number(sale.total || 0).toLocaleString('ar-DZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      addNotification({
        title: isReturn ? 'تم تسجيل المرتجع بنجاح' : 'تم إتمام عملية البيع بنجاح',
        message: isReturn
          ? `مرتجع بقيمة ${formattedTotal} ${settings?.baseCurrency || 'دج'}`
          : `فاتورة رقم ${sale.invoiceNumber || sale.id?.slice(0, 8) || ''} بقيمة ${formattedTotal} ${settings?.baseCurrency || 'دج'}`,
        type: 'success',
        category: 'sales',
      });

      if (onSaleSuccess) {
        onSaleSuccess(sale);
      }
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      addNotification({
        title: 'خطأ في إتمام البيع',
        message: error?.message || 'حدث خطأ غير متوقع أثناء حفظ العملية',
        type: 'error',
      });
    },
  });

  return {
    completeSale: completeSaleMutation.mutate,
    isPending: completeSaleMutation.isPending,
  };
}
