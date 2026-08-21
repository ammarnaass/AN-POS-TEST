import { v4 as uuidv4 } from 'uuid';
import { SaleRepository } from '@/infrastructure/database/repositories/SaleRepository';
import { db } from '@/infrastructure/database/dexie/db';
import { calculateSaleTotal } from '@/domain/services/SaleCalculator';
import { movementRepo } from '@/features/inventory/infrastructure/repositories/movementRepo';

interface CreateSaleInput {
  cart: { productId: string; name: string; qty: number; unitPrice: number; lineTotal: number; isPack?: boolean; packId?: string; batchNumber?: string }[];
  customerId?: string;
  discount: number;
  discountType: 'percent' | 'amount';
  paymentMethod: 'cash' | 'credit';
  paidAmount: number;
  soldBy: string;
  sessionId?: string;
  settings: { tvaRate: number; invoicePrefix: string };
  type?: 'sale' | 'return';
  docType?: 'proforma' | 'devis' | 'bl' | 'facture';
}

export async function CreateSale(input: CreateSaleInput) {
  const { subtotal, discountAmount, tvaAmount, total } = calculateSaleTotal(
    input.cart, input.discount, input.discountType, input.settings.tvaRate
  );

  const number = await SaleRepository.getNextNumber(input.settings.invoicePrefix);
  const now = new Date().toISOString();
  const saleId = uuidv4();

  const sale = {
    id: saleId, number, date: now, customerId: input.customerId,
    subtotal, discount: input.discount, discountType: input.discountType,
    tvaAmount, total, paymentMethod: input.paymentMethod,
    paidAmount: input.paidAmount,
    status: total <= input.paidAmount ? 'paid' as const : input.paidAmount > 0 ? 'partial' as const : 'unpaid' as const,
    docType: input.docType ?? 'facture' as const,
    type: input.type ?? 'sale' as const,
    soldBy: input.soldBy, sessionId: input.sessionId,
    createdAt: now, updatedAt: now,
  };

  const items = input.cart.map(item => ({
    id: uuidv4(), saleId, productId: item.productId,
    name: item.name, qty: item.qty, unitPrice: item.unitPrice,
    lineTotal: item.lineTotal, batchNumber: item.batchNumber,
  }));

  await SaleRepository.create(sale, items);

  for (const item of input.cart) {
    if (item.isPack && item.packId) {
      const pack = await db.packs.get(item.packId);
      if (pack) {
        for (const comp of pack.items) {
          const product = await db.products.get(comp.productId);
          if (product) {
            const sign = input.type === 'return' ? 1 : -1;
            const newQty = product.quantity + sign * (comp.qty * item.qty);
            await db.products.update(product.id, { quantity: newQty, updatedAt: now });
            await db.stock_movements.add({
              id: uuidv4(), productId: product.id,
              type: input.type === 'return' ? 'return' : 'pack',
              qty: newQty, reference: number, createdBy: input.soldBy, createdAt: now,
            });
            // سجل حركة في نظام المخزون الجديد
            try {
              await movementRepo.create({
                date: now.slice(0, 10),
                type: input.type === 'return' ? 'return' : 'pack',
                warehouseId: product.warehouseId || 'default',
                lines: [{ itemId: product.id, quantity: comp.qty * item.qty, unitPrice: product.costPrice }],
                reference: number,
                description: `${input.type === 'return' ? 'مرتجع' : 'بيع'} باقة - ${item.name}`,
                createdBy: input.soldBy,
              });
            } catch { /* لا نريد أن يفشل البيع */ }
          }
        }
      }
    } else {
      const product = await db.products.get(item.productId);
      if (product && !item.productId.startsWith('custom-')) {
        const sign = input.type === 'return' ? 1 : -1;
        const newQty = product.quantity + sign * item.qty;
        await db.products.update(product.id, { quantity: Math.max(0, newQty), updatedAt: now });
        await db.stock_movements.add({
          id: uuidv4(), productId: product.id,
          type: input.type === 'return' ? 'return' : 'sale',
          qty: newQty, reference: number, createdBy: input.soldBy, createdAt: now,
        });
        // سجل حركة في نظام المخزون الجديد
        try {
          await movementRepo.create({
            date: now.slice(0, 10),
            type: input.type === 'return' ? 'return' : 'sale',
            warehouseId: product.warehouseId || 'default',
            lines: [{ itemId: product.id, quantity: item.qty, unitPrice: product.costPrice }],
            reference: number,
            description: `${input.type === 'return' ? 'مرتجع' : 'بيع'} - ${item.name}`,
            createdBy: input.soldBy,
          });
        } catch { /* لا نريد أن يفشل البيع */ }
      }
    }
  }

  return sale;
}
