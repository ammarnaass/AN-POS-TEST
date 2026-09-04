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
        currentSession,
        products,
        packs,
        customers,
        note,
      } = params;

      const saleSummary = calculateSaleTotal(cart, discount, discountType, settings.tvaRate);
      const saleType = isReturn ? 'return' : 'sale';
      const nextNumber = await SaleRepository.getNextNumber(settings.invoicePrefix);

      // تحديد المبلغ المدفوع فعلياً
      const effectivePaidAmount =
        paymentMethod === 'cash'
          ? saleSummary.total
          : (params.paidAmount ?? params.amountPaid ?? 0);

      // جلب بيانات العميل المختار إن وجد
      const matchedCustomer = selectedCustomer
        ? customers.find((c) => c.id === selectedCustomer)
        : undefined;
      const customerName = matchedCustomer?.name || matchedCustomer?.fullname || '';

      const baseSale = createSale(
        cart,
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
        docType
      );

      const sale: Sale = {
        ...baseSale,
        number: nextNumber,
        customerName,
        note: note || '',
        paidAmount: effectivePaidAmount,
      };

      // تحضير سجلات عناصر البيع المنفردة لـ sale_items
      const saleItemEntities: SaleItemEntity[] = cart.map((item) => ({
        id: createId(),
        saleId: sale.id,
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      }));

      // تنفيذ المعاملة الذرية الحقيقية عبر IPC في بيئة Electron
      // أو التراجع الاحتياطي (Fallback) في بيئة المتصفح الخالص/الاختبار
      const electronApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
      if (electronApi?.sales?.create) {
        const payload = {
          id: sale.id,
          number: sale.number,
          date: sale.date,
          docType: sale.docType,
          type: sale.type,
          items: cart,
          subtotal: sale.subtotal,
          discount: sale.discount,
          discountType: sale.discountType,
          tvaAmount: sale.tvaAmount,
          total: sale.total,
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
            for (const item of cart) {
              if (item.isPack && item.packId) {
                const pack = packs.find((p) => p.id === item.packId);
                if (pack) {
                  for (const comp of pack.items) {
                    const product = products.find((p) => p.id === comp.productId);
                    if (product) {
                      const qtyChange =
                        saleType === 'return'
                          ? Math.abs(comp.qty * item.qty)
                          : -(comp.qty * item.qty);
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
                }
              } else {
                const product = products.find((p) => p.id === item.productId);
                if (product && !item.isCustom) {
                  const qtyChange = saleType === 'return' ? Math.abs(item.qty) : -item.qty;
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

      // الطباعة التلقائية عبر محرك الطباعة (بدون تجميد أو نوافذ منبثقة معطلة)
      if (autoPrint && sale) {
        const printDocType = sale.type === 'return' ? 'return-invoice' : 'thermal-receipt';
        printDocument(sale.id, printDocType, {
          userId: currentUser?.id ?? '',
          userName: currentUser?.name ?? '',
          copies: 1,
        }).catch((err) => {
          console.warn('Auto-print error (silent):', err);
        });
      }

      clearCart();
      if (onSaleSuccess) {
        onSaleSuccess(sale);
      }
    },
    onError: (error: any) => {
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
