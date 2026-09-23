import { db } from '@/infrastructure/database/dexie/db';
import type { Sale } from '@/types';
import { generateId } from '@/utils';
import type {
  InvoiceStatusToggleParams,
  InvoiceStatusToggleResult,
  CustomerInvoicesMetrics,
} from '../types';

/**
 * تنفيذ التبديل الذري لحالة الفاتورة بين "مدفوع" و "لم يسدد" مع تحديث رصيد الزبون والصندوق
 */
export async function toggleInvoicePaymentStatus(
  params: InvoiceStatusToggleParams
): Promise<InvoiceStatusToggleResult> {
  const { saleId, targetStatus, paymentMethod = 'cash', currentSessionId, currentUserName = 'الكاشير', note } = params;

  const sale = await db.sales.get(saleId);
  if (!sale) {
    throw new Error(`الفاتورة رقم #${saleId} غير موجودة في قاعدة البيانات.`);
  }

  const previousStatus = sale.status || 'paid';
  const now = new Date().toISOString();
  let amountChanged = 0;
  let previousCustomerBalance = 0;
  let newCustomerBalance = 0;

  // جلب بيانات العميل إذا كانت الفاتورة مرتبطة بعميل
  const customer = sale.customerId ? await db.customers.get(sale.customerId) : null;
  if (customer) {
    previousCustomerBalance = Number(customer.balance || 0);
  }

  if (targetStatus === 'paid') {
    // 1. التبديل إلى "مدفوع" (تسديد الفاتورة)
    const unpaidRemainder = Math.max(0, (sale.total || 0) - (sale.paidAmount || 0));
    amountChanged = unpaidRemainder > 0 ? unpaidRemainder : (sale.total || 0);

    const resolvedMethod = paymentMethod === 'credit' ? 'cash' : paymentMethod;

    await db.transaction('rw', [db.sales, db.customers, db.payments, db.cash_sessions], async () => {
      // أ) تحديث الفاتورة
      await db.sales.update(saleId, {
        status: 'paid',
        paidAmount: sale.total,
        paymentMethod: resolvedMethod,
        updatedAt: now,
      });

      // ب) تخفيض دين العميل
      if (sale.customerId && customer) {
        newCustomerBalance = previousCustomerBalance - amountChanged;
        await db.customers.update(sale.customerId, {
          balance: newCustomerBalance,
          updatedAt: now,
        });

        // ج) تسجيل سند قبض في سجل المدفوعات
        const paymentId = generateId();
        await db.payments.add({
          id: paymentId,
          date: now,
          partyType: 'customer',
          party_type: 'customer',
          partyId: sale.customerId,
          party_id: sale.customerId,
          customerId: sale.customerId,
          customer_id: sale.customerId,
          amount: amountChanged,
          type: 'credit',
          method: resolvedMethod as any,
          note: note || `تسديد الفاتورة #${sale.number} من شاشة نقطة البيع`,
          createdBy: currentUserName,
          created_by: currentUserName,
          createdAt: now,
          created_at: now,
        });
      }

      // د) إذا تم السداد نقداً، تسجيل الإيداع في مناوبة الصندوق المفتوحة
      if (resolvedMethod === 'cash') {
        let openSession = null;
        if (currentSessionId) {
          openSession = await db.cash_sessions.get(currentSessionId);
        }
        if (!openSession) {
          openSession = await db.cash_sessions.where('status').equals('open').first();
        }

        if (openSession) {
          const deposit = {
            amount: amountChanged,
            note: `تحصيل فاتورة #${sale.number}${customer ? ` - ${customer.name}` : ''}`,
            createdAt: now,
          };
          await db.cash_sessions.update(openSession.id, {
            deposits: [...(openSession.deposits || []), deposit],
            updatedAt: now,
          });
        }
      }
    });
  } else {
    // 2. التبديل إلى "لم يسدد" (تحويل الفاتورة إلى دين على الزبون)
    if (!sale.customerId) {
      throw new Error('لا يمكن تحويل الفاتورة إلى دين بدون تحديد زبون مسجل.');
    }

    const previousPaid = Number(sale.paidAmount || sale.total || 0);
    amountChanged = previousPaid;
    newCustomerBalance = previousCustomerBalance + amountChanged;

    await db.transaction('rw', [db.sales, db.customers, db.cash_sessions], async () => {
      // أ) تحديث الفاتورة
      await db.sales.update(saleId, {
        status: 'unpaid',
        paidAmount: 0,
        paymentMethod: 'credit',
        updatedAt: now,
      });

      // ب) زيادة دين العميل
      await db.customers.update(sale.customerId!, {
        balance: newCustomerBalance,
        updatedAt: now,
      });

      // ج) إذا كانت مسددة نقداً في نفس المناوبة المفتوحة، تسجيل سحب/تعديل
      if (sale.paymentMethod === 'cash') {
        let openSession = null;
        if (currentSessionId) {
          openSession = await db.cash_sessions.get(currentSessionId);
        }
        if (!openSession) {
          openSession = await db.cash_sessions.where('status').equals('open').first();
        }

        if (openSession) {
          const withdrawal = {
            amount: amountChanged,
            reason: `إلغاء قبض فاتورة #${sale.number} وتحويلها لدين`,
            createdAt: now,
          };
          await db.cash_sessions.update(openSession.id, {
            withdrawals: [...(openSession.withdrawals || []), withdrawal],
            updatedAt: now,
          });
        }
      }
    });
  }

  // مزامنة Electron API IPC إن وجدت
  const electronApi = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
  if (electronApi?.sales?.update) {
    electronApi.sales.update(saleId, {
      status: targetStatus,
      paidAmount: targetStatus === 'paid' ? sale.total : 0,
      paymentMethod: targetStatus === 'paid' ? (paymentMethod || 'cash') : 'credit',
    }).catch(() => {});
  }
  if (customer && electronApi?.customers?.update) {
    electronApi.customers.update(customer.id, {
      balance: newCustomerBalance,
    }).catch(() => {});
  }

  return {
    success: true,
    saleId,
    saleNumber: sale.number,
    previousStatus,
    newStatus: targetStatus,
    customerId: sale.customerId,
    previousCustomerBalance,
    newCustomerBalance,
    amountChanged,
    timestamp: now,
  };
}

/**
 * حساب مؤشرات وإحصائيات فواتير العميل المالية بدقة نقية
 */
export function calculateCustomerInvoicesMetrics(sales: Sale[] = []): CustomerInvoicesMetrics {
  if (!Array.isArray(sales)) {
    return {
      totalSalesAmount: 0,
      totalPaidAmount: 0,
      totalUnpaidDebt: 0,
      unpaidCount: 0,
      paidCount: 0,
      returnsCount: 0,
      totalCount: 0,
    };
  }

  let totalSalesAmount = 0;
  let totalPaidAmount = 0;
  let totalUnpaidDebt = 0;
  let unpaidCount = 0;
  let paidCount = 0;
  let returnsCount = 0;

  for (const sale of sales) {
    if (sale.type === 'return') {
      returnsCount++;
      continue;
    }

    const saleTotal = Number(sale.total) || 0;
    const paid = Number(sale.paidAmount) || 0;
    const unpaid = Math.max(0, saleTotal - paid);

    totalSalesAmount += saleTotal;
    totalPaidAmount += paid;

    if (sale.status === 'paid' || unpaid === 0) {
      paidCount++;
    } else {
      unpaidCount++;
      totalUnpaidDebt += unpaid;
    }
  }

  return {
    totalSalesAmount,
    totalPaidAmount,
    totalUnpaidDebt,
    unpaidCount,
    paidCount,
    returnsCount,
    totalCount: sales.length,
  };
}
