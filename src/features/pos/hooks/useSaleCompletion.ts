import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { SaleRepository } from '@/infrastructure/database/repositories/SaleRepository';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { calculateSaleTotal, createSale, generateReceiptHTML } from '@/services';
import { printDocument } from '@/services/print/printService';
import type { CartItem, Sale } from '@/types';
import { v4 as createId } from 'uuid';

interface SaleSettings {
  tvaRate: number;
  invoicePrefix: string;
  baseCurrency: string;
  shopName: string;
  phone: string;
  receiptFooter: string;
}

interface SaleCompletionParams {
  cart: CartItem[];
  discount: number;
  discountType: 'percent' | 'amount';
  selectedCustomer: string;
  paymentMethod: 'cash' | 'credit';
  isReturn?: boolean;
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
        cart, discount, discountType, selectedCustomer, paymentMethod,
        isReturn = false, currentSession, products, packs, customers,
      } = params;

      const saleSummary = calculateSaleTotal(cart, discount, discountType, settings.tvaRate);
      const saleType = isReturn ? 'return' : 'sale';
      const nextNumber = await SaleRepository.getNextNumber(settings.invoicePrefix);

      const sale = {
        ...createSale(
          cart, saleSummary.subtotal, discount, discountType,
          saleSummary.tvaAmount, saleSummary.total,
          paymentMethod, selectedCustomer,
          paymentMethod === 'cash' ? saleSummary.total : 0,
          currentUser?.name || '', currentSession?.id || '',
          settings, saleType, 'facture'
        ),
        number: nextNumber,
      };

      await db.transaction('rw', [db.sales, db.products, db.customers, db.cash_sessions, db.stock_movements], async () => {
        await db.sales.add(sale);

        for (const item of cart) {
          if (item.isPack && item.packId) {
            const pack = packs.find((p) => p.id === item.packId);
            if (pack) {
              for (const comp of pack.items) {
                const product = products.find((p) => p.id === comp.productId);
                if (product) {
                  const qtyChange = saleType === 'return'
                    ? Math.abs(comp.qty * item.qty)
                    : -(comp.qty * item.qty);
                  await db.products.update(product.id, { quantity: Math.max(0, product.quantity + qtyChange) });
                  await db.stock_movements.add({
                    id: createId(), productId: product.id,
                    type: saleType === 'return' ? 'return' : 'sale',
                    qty: qtyChange, date: new Date().toISOString(), reference: sale.number,
                    createdBy: currentUser?.name || '',
                    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                  });
                }
              }
            }
          } else {
            const product = products.find((p) => p.id === item.productId);
            if (product && !item.isCustom) {
              const qtyChange = saleType === 'return' ? Math.abs(item.qty) : -item.qty;
              await db.products.update(product.id, { quantity: Math.max(0, product.quantity + qtyChange) });
              await db.stock_movements.add({
                id: createId(), productId: product.id,
                type: saleType === 'return' ? 'return' : 'sale',
                qty: qtyChange, date: new Date().toISOString(), reference: sale.number,
                createdBy: currentUser?.name || '',
                createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
              });
            }
          }
        }

        if (selectedCustomer && paymentMethod === 'credit') {
          const customer = customers.find((c) => c.id === selectedCustomer);
          if (customer) {
            const balanceChange = isReturn ? -saleSummary.total : saleSummary.total;
            await db.customers.update(selectedCustomer, { balance: customer.balance + balanceChange });
          }
        }

        if (currentSession) {
          const updateData = isReturn
            ? { totalReturns: (currentSession.totalReturns || 0) + saleSummary.total }
            : { totalSales: (currentSession.totalSales || 0) + saleSummary.total };
          await db.cash_sessions.update(currentSession.id, updateData);
        }
      });

      return sale as Sale;
    },
    onSuccess: (sale: Sale) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });

      if (sale) {
        const printDocType = sale.type === 'return' ? 'return-invoice' : 'thermal-receipt';
        printDocument(sale.id, printDocType, {
          userId: currentUser?.id ?? '',
          userName: currentUser?.name ?? '',
          copies: 1,
        }).then((res) => {
          if (!res.success) {
            const html = generateReceiptHTML(sale, settings);
            const printWindow = window.open('', '_blank');
            if (printWindow) {
              printWindow.document.write(`<html><head><title>إيصال - ${sale.number}</title><style>@media print { body { margin: 0; } }</style></head><body>${html}</body></html>`);
              printWindow.document.close();
              printWindow.print();
            }
          }
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
        message: error?.message || 'حدث خطأ غير متوقع',
        type: 'error',
      });
    },
  });

  return {
    completeSale: completeSaleMutation.mutate,
    isPending: completeSaleMutation.isPending,
  };
}
