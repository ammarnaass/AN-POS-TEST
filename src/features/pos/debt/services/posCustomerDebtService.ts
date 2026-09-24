import { db } from '@/infrastructure/database/dexie/db';
import type { Customer } from '@/types';
import { generateId } from '@/utils';
import type {
  QuickCustomerInput,
  CustomerDebtSummary,
  CreditSaleValidation,
  DebtSettlementInput,
  DebtSettlementResult,
  InvoiceAllocationResult,
  SpecificInvoiceSettlementInput,
  AddCustomerDebtInput,
  AddCustomerDebtResult,
  CustomerStatementEntry,
  CustomerStatementFilter,
  CustomerStatementSummary,
} from '../types';

/**
 * Calculates a structured financial debt summary for a customer.
 */
export function getCustomerDebtSummary(customer?: Customer | null): CustomerDebtSummary {
  if (!customer) {
    return {
      customerId: '',
      customerName: 'زبون عام (افتراضي)',
      balance: 0,
      creditLimit: 0,
      hasCreditAdvance: false,
      isCreditLimitExceeded: false,
      creditExcessAmount: 0,
      remainingCredit: 0,
    };
  }

  const balance = Number(customer.balance || 0);
  const creditLimit = Number(customer.creditLimit || 0);
  const hasCreditAdvance = balance < 0;
  const isCreditLimitExceeded = creditLimit > 0 && balance > creditLimit;
  const creditExcessAmount = isCreditLimitExceeded ? balance - creditLimit : 0;
  const remainingCredit = creditLimit > 0 ? Math.max(0, creditLimit - balance) : 0;

  return {
    customerId: customer.id,
    customerName: customer.name,
    phone: customer.phone,
    balance,
    creditLimit,
    hasCreditAdvance,
    isCreditLimitExceeded,
    creditExcessAmount,
    remainingCredit,
  };
}

/**
 * Validates a credit sale against customer balance and credit limit.
 */
export function validateCreditSaleParams(params: {
  customer?: Customer | null;
  saleTotal: number;
  overrideCreditLimit: boolean;
}): CreditSaleValidation {
  const { customer, saleTotal, overrideCreditLimit } = params;

  if (!customer || !customer.id) {
    return {
      isCreditSale: true,
      matchedCustomer: undefined,
      currentBalance: 0,
      creditLimit: 0,
      projectedDebt: saleTotal,
      isCreditLimitExceeded: false,
      creditExcessAmount: 0,
      hasCreditAdvance: false,
      overrideCreditLimit,
      setOverrideCreditLimit: () => {},
      isConfirmDisabled: true,
      validationError: 'يجب اختيار زبون مسجل لإتمام البيع بالآجل (دين).',
    };
  }

  const currentBalance = Number(customer.balance || 0);
  const creditLimit = Number(customer.creditLimit || 0);
  const projectedDebt = currentBalance + saleTotal;
  const hasCreditAdvance = currentBalance < 0;
  const isCreditLimitExceeded = Boolean(customer.id) && creditLimit > 0 && projectedDebt > creditLimit;
  const creditExcessAmount = isCreditLimitExceeded ? projectedDebt - creditLimit : 0;

  const isBlocked = isCreditLimitExceeded && !overrideCreditLimit;

  let validationError: string | null = null;
  if (isBlocked) {
    validationError = `تجاوز سقف الائتمان بمقدار ${creditExcessAmount.toLocaleString()} دج. يتطلب تصريح المشرف.`;
  }

  return {
    isCreditSale: true,
    matchedCustomer: customer,
    currentBalance,
    creditLimit,
    projectedDebt,
    isCreditLimitExceeded,
    creditExcessAmount,
    hasCreditAdvance,
    overrideCreditLimit,
    setOverrideCreditLimit: () => {},
    isConfirmDisabled: isBlocked,
    validationError,
  };
}

/**
 * Registers a quick customer directly to Dexie database.
 */
export async function createQuickCustomerRecord(input: QuickCustomerInput): Promise<Customer> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('اسم الزبون مطلوب.');
  }

  const newId = generateId();
  const now = new Date().toISOString();
  const creditLimit = input.creditLimit !== undefined ? Number(input.creditLimit) : 50000;

  const newCustomer: Customer = {
    id: newId,
    name: trimmedName,
    phone: input.phone?.trim() || '',
    creditLimit: isNaN(creditLimit) ? 50000 : creditLimit,
    balance: 0,
    customerType: input.customerType || 'retail',
    address: input.address?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.customers.add(newCustomer as any);
  return newCustomer;
}

/**
 * خوارزمية التسوية المتسلسلة للفواتير (FIFO Allocation Algorithm)
 * توزع مبلغ السداد على الفواتير غير المسددة بدءاً من الأقدم إلى الأحدث
 */
export function allocatePaymentFIFO(
  unpaidInvoices: Array<{
    id: string;
    number?: string;
    date?: string;
    total: number;
    paidAmount?: number;
    amountPaid?: number;
    status?: string;
  }>,
  incomingPaymentAmount: number
): {
  allocations: InvoiceAllocationResult[];
  unallocatedRemaining: number;
} {
  // فرز الفواتير من الأقدم إلى الأحدث تاريخياً
  const sorted = [...unpaidInvoices].sort((a, b) => {
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    return timeA - timeB;
  });

  let remainingPayment = incomingPaymentAmount;
  const allocations: InvoiceAllocationResult[] = [];

  for (const inv of sorted) {
    if (remainingPayment <= 0) break;

    const currentPaid = Number(inv.paidAmount ?? inv.amountPaid ?? 0);
    const invoiceTotal = Number(inv.total || 0);
    const unpaidPart = Math.max(0, invoiceTotal - currentPaid);

    if (unpaidPart <= 0) continue; // مسددة مسبقاً

    const allocated = Math.min(remainingPayment, unpaidPart);
    const newPaid = currentPaid + allocated;
    const remainingAfter = Math.max(0, invoiceTotal - newPaid);
    const newStatus: 'paid' | 'partial' | 'unpaid' =
      remainingAfter === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    allocations.push({
      invoiceId: inv.id,
      invoiceNumber: inv.number || '—',
      invoiceDate: inv.date || '',
      originalTotal: invoiceTotal,
      previouslyPaid: currentPaid,
      allocatedAmount: allocated,
      remainingAfter,
      newStatus,
    });

    remainingPayment -= allocated;
  }

  return {
    allocations,
    unallocatedRemaining: remainingPayment,
  };
}

/**
 * تسديد دين الزبون من نقطة البيع أو شاشة العملاء ذرياً مع تسوية الفواتير المعلقة (FIFO)
 */
export async function settleCustomerDebtRecord(input: DebtSettlementInput): Promise<DebtSettlementResult> {
  const { customerId, amount, paymentMethod, note, customerName, currentSessionId, targetSaleId } = input;
  const settleAmount = Number(amount);

  if (isNaN(settleAmount) || settleAmount <= 0) {
    throw new Error('مبلغ التسديد غير صالح.');
  }

  return await db.transaction('rw', [db.customers, db.payments, db.sales, db.cash_sessions], async () => {
    const customer = await db.customers.get(customerId);
    if (!customer) {
      throw new Error('الزبون غير موجود في قاعدة البيانات.');
    }

    const previousBalance = Number(customer.balance || 0);
    const newBalance = previousBalance - settleAmount;
    const now = new Date().toISOString();
    const paymentId = generateId();

    // 1. تسجيل سند القبض المالي
    await db.payments.add({
      id: paymentId,
      date: now,
      partyType: 'customer',
      party_type: 'customer',
      partyId: customerId,
      party_id: customerId,
      customerId,
      customer_id: customerId,
      amount: settleAmount,
      type: 'credit',
      method: paymentMethod as any,
      note: note || `تسديد دين من نقطة البيع (${paymentMethod === 'cash' ? 'نقداً' : paymentMethod})`,
      createdBy: 'الكاشير',
      created_by: 'الكاشير',
      createdAt: now,
      created_at: now,
    });

    // 2. تسوية الفواتير المعلقة (إما فاتورة محددة targetSaleId أو التوزيع التلقائي FIFO)
    let appliedAllocations: InvoiceAllocationResult[] = [];

    if (targetSaleId) {
      const targetSale = await db.sales.get(targetSaleId);
      if (targetSale) {
        const currentPaid = Number(targetSale.paidAmount ?? targetSale.amountPaid ?? 0);
        const invTotal = Number(targetSale.total || 0);
        const newPaid = currentPaid + settleAmount;
        const remainingAfter = Math.max(0, invTotal - newPaid);
        const newStatus: 'paid' | 'partial' | 'unpaid' =
          remainingAfter === 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

        await db.sales.update(targetSaleId, {
          paidAmount: newPaid,
          amountPaid: newPaid,
          status: newStatus,
          updatedAt: now,
        });

        appliedAllocations.push({
          invoiceId: targetSale.id,
          invoiceNumber: targetSale.number || '—',
          invoiceDate: targetSale.date || '',
          originalTotal: invTotal,
          previouslyPaid: currentPaid,
          allocatedAmount: settleAmount,
          remainingAfter,
          newStatus,
        });
      }
    } else {
      // جلب جميع الفواتير غير المسددة للعميل
      const pendingSales = await db.sales
        .where('customerId')
        .equals(customerId)
        .filter((s) => s.type !== 'return' && s.status !== 'paid')
        .toArray();

      const { allocations } = allocatePaymentFIFO(pendingSales, settleAmount);
      appliedAllocations = allocations;

      for (const alloc of allocations) {
        await db.sales.update(alloc.invoiceId, {
          paidAmount: alloc.previouslyPaid + alloc.allocatedAmount,
          amountPaid: alloc.previouslyPaid + alloc.allocatedAmount,
          status: alloc.newStatus,
          updatedAt: now,
        });
      }
    }

    // 3. قيد الإيداع النقدي في مناوبة الصندوق المفتوحة إذا تم السداد نقداً
    if (paymentMethod === 'cash') {
      try {
        let openSession = null;
        if (currentSessionId) {
          openSession = await db.cash_sessions.get(currentSessionId);
        }
        if (!openSession) {
          openSession = await db.cash_sessions.where('status').equals('open').first();
        }

        if (openSession) {
          const deposit = {
            amount: settleAmount,
            note: `تحصيل دين نقطة البيع: ${customerName || customer.name}`,
            createdAt: now,
          };
          await db.cash_sessions.update(openSession.id, {
            deposits: [...(openSession.deposits || []), deposit],
            updatedAt: now,
          });
        }
      } catch (sessionErr) {
        console.warn('Failed to update cash session deposit for customer debt settlement:', sessionErr);
      }
    }

    // 4. تحديث رصيد بطاقة العميل
    await db.customers.update(customerId, {
      balance: newBalance,
      updatedAt: now,
    });

    return {
      success: true,
      customerId,
      previousBalance,
      settledAmount: settleAmount,
      newBalance,
      paymentMethod,
      receiptNumber: paymentId.slice(0, 8).toUpperCase(),
      timestamp: now,
      allocations: appliedAllocations,
    };
  });
}

/**
 * تسديد فاتورة بعينها وتحديث رصيد الزبون والصندوق ذرياً
 */
export async function settleSpecificInvoiceDebtRecord(
  input: SpecificInvoiceSettlementInput
): Promise<DebtSettlementResult> {
  const {
    saleId,
    customerId,
    amount,
    paymentMethod,
    note,
    currentSessionId,
    currentUserName = 'الكاشير',
  } = input;
  const settleAmount = Number(amount);

  if (isNaN(settleAmount) || settleAmount <= 0) {
    throw new Error('مبلغ التسديد غير صالح.');
  }

  return await db.transaction('rw', [db.customers, db.payments, db.sales, db.cash_sessions], async () => {
    const sale = await db.sales.get(saleId);
    if (!sale) throw new Error(`الفاتورة رقم #${saleId} غير موجودة.`);
    const customer = await db.customers.get(customerId);
    if (!customer) throw new Error('الزبون غير موجود.');

    const previousCustomerBalance = Number(customer.balance || 0);
    const invoiceTotal = Number(sale.total || 0);
    const previousInvoicePaid = Number(sale.paidAmount ?? sale.amountPaid ?? 0);
    const newInvoicePaid = previousInvoicePaid + settleAmount;
    const remainingAfter = Math.max(0, invoiceTotal - newInvoicePaid);
    const newStatus: 'paid' | 'partial' | 'unpaid' =
      remainingAfter === 0 ? 'paid' : newInvoicePaid > 0 ? 'partial' : 'unpaid';

    const now = new Date().toISOString();
    const paymentId = generateId();

    // 1. تحديث الفاتورة
    await db.sales.update(saleId, {
      paidAmount: newInvoicePaid,
      amountPaid: newInvoicePaid,
      status: newStatus,
      updatedAt: now,
    });

    // 2. تسجيل سند القبض المالي
    await db.payments.add({
      id: paymentId,
      date: now,
      partyType: 'customer',
      party_type: 'customer',
      partyId: customerId,
      party_id: customerId,
      customerId,
      customer_id: customerId,
      amount: settleAmount,
      type: 'credit',
      method: (paymentMethod === 'credit' ? 'cash' : paymentMethod) as any,
      note: note || `تسديد فاتورة #${sale.number}`,
      createdBy: currentUserName,
      created_by: currentUserName,
      createdAt: now,
      created_at: now,
    });

    // 3. تخفيض رصيد الزبون
    const newBalance = previousCustomerBalance - settleAmount;
    await db.customers.update(customerId, {
      balance: newBalance,
      updatedAt: now,
    });

    // 4. قيد الصندوق إذا كان الدفع نقداً
    if (paymentMethod === 'cash') {
      let openSession = null;
      if (currentSessionId) openSession = await db.cash_sessions.get(currentSessionId);
      if (!openSession) openSession = await db.cash_sessions.where('status').equals('open').first();
      if (openSession) {
        const deposit = {
          amount: settleAmount,
          note: `تحصيل فاتورة #${sale.number} - ${customer.name}`,
          createdAt: now,
        };
        await db.cash_sessions.update(openSession.id, {
          deposits: [...(openSession.deposits || []), deposit],
          updatedAt: now,
        });
      }
    }

    return {
      success: true,
      customerId,
      previousBalance: previousCustomerBalance,
      settledAmount: settleAmount,
      newBalance,
      paymentMethod,
      receiptNumber: paymentId.slice(0, 8).toUpperCase(),
      timestamp: now,
      allocations: [
        {
          invoiceId: sale.id,
          invoiceNumber: sale.number || '—',
          invoiceDate: sale.date || '',
          originalTotal: invoiceTotal,
          previouslyPaid: previousInvoicePaid,
          allocatedAmount: settleAmount,
          remainingAfter,
          newStatus,
        },
      ],
    };
  });
}

/**
 * Records a direct debt addition on a customer's account in Dexie DB.
 */
export async function addCustomerDebtRecord(input: AddCustomerDebtInput): Promise<AddCustomerDebtResult> {
  const { customerId, amount, reason, note, date, overrideCreditLimit, customerName } = input;
  const debtAmount = Number(amount);

  if (isNaN(debtAmount) || debtAmount <= 0) {
    throw new Error('مبلغ الدين غير صالح. يجب أن يكون أكبر من الصفر.');
  }

  const customer = await db.customers.get(customerId);
  if (!customer) {
    throw new Error('الزبون غير موجود في قاعدة البيانات.');
  }

  const previousBalance = Number(customer.balance || 0);
  const creditLimit = Number(customer.creditLimit || 0);
  const projectedBalance = previousBalance + debtAmount;

  // فحص سقف الائتمان
  if (creditLimit > 0 && projectedBalance > creditLimit && !overrideCreditLimit) {
    const excess = projectedBalance - creditLimit;
    throw new Error(`تجاوز سقف الائتمان بمقدار ${excess.toLocaleString('fr-DZ')} دج. يتطلب تصريح المشرف.`);
  }

  const now = new Date().toISOString();
  const paymentDate = date ? new Date(date).toISOString() : now;
  const voucherId = generateId();
  const description = reason ? `قيد دين: ${reason}` : (note ? `قيد دين: ${note}` : 'قيد دين إضافي من نقطة البيع');

  // 1. تسجيل قيد مدين في db.payments
  await db.payments.add({
    id: voucherId,
    date: paymentDate,
    partyType: 'customer',
    party_type: 'customer',
    partyId: customerId,
    party_id: customerId,
    customerId,
    customer_id: customerId,
    amount: debtAmount,
    type: 'debit',
    method: 'credit' as any,
    note: description,
    createdBy: 'الكاشير',
    created_by: 'الكاشير',
    createdAt: now,
    created_at: now,
  });

  // 2. تحديث رصيد الزبون
  const newBalance = previousBalance + debtAmount;
  await db.customers.update(customerId, {
    balance: newBalance,
    updatedAt: now,
  });

  return {
    success: true,
    customerId,
    customerName: customerName || customer.name,
    previousBalance,
    addedAmount: debtAmount,
    newBalance,
    voucherNumber: voucherId.slice(0, 8).toUpperCase(),
    reason: description,
    timestamp: paymentDate,
  };
}

/**
 * Fetches and compiles a full chronological statement of account for a customer.
 */
export async function fetchCustomerStatement(
  customerId: string,
  filter?: CustomerStatementFilter
): Promise<CustomerStatementSummary> {
  const customer = await db.customers.get(customerId);
  if (!customer) {
    return {
      entries: [],
      openingBalance: 0,
      totalDebit: 0,
      totalCredit: 0,
      netChange: 0,
      finalBalance: 0,
    };
  }

  // Fetch all sales for this customer
  const rawSales = await db.sales.where('customerId').equals(customerId).toArray();
  // Fetch all payments/transactions for this customer
  const rawPayments = await db.payments
    .filter((p: any) => p.customerId === customerId || p.partyId === customerId)
    .toArray();

  const entries: Array<Omit<CustomerStatementEntry, 'runningBalance'>> = [];

  // Map sales
  for (const s of rawSales) {
    const total = Number(s.total || 0);
    const paid = Number(s.paidAmount ?? s.amountPaid ?? 0);
    const isReturn = s.type === 'return';

    if (isReturn) {
      entries.push({
        id: s.id,
        date: s.date || s.createdAt || new Date().toISOString(),
        type: 'return',
        number: s.number ? `#${s.number}` : '—',
        description: `إرجاع مبيعات (فاتورة #${s.number || '—'})`,
        debit: 0,
        credit: total,
        status: s.status || 'return',
      });
    } else {
      entries.push({
        id: s.id,
        date: s.date || s.createdAt || new Date().toISOString(),
        type: 'sale',
        number: s.number ? `#${s.number}` : '—',
        description: `فاتورة مشتريات #${s.number || '—'}${paid > 0 && paid < total ? ` (مسدد: ${paid})` : ''}`,
        debit: total,
        credit: Math.min(total, paid),
        status: s.status || (paid >= total ? 'paid' : 'unpaid'),
      });
    }
  }

  // Map payments
  for (const p of rawPayments) {
    const amt = Number(p.amount || 0);
    const isDebit = p.type === 'debit';
    const methodNames: Record<string, string> = {
      cash: 'نقداً',
      card: 'بطاقة بنكية',
      baridimob: 'بريدي موب',
      transfer: 'تحويل بنكي',
      credit: 'قيد آجل',
    };
    const methodLabel = methodNames[p.method] || p.method || 'نقداً';

    if (isDebit) {
      entries.push({
        id: p.id,
        date: p.date || p.createdAt || new Date().toISOString(),
        type: 'debt_addition',
        number: p.id ? `#${p.id.slice(0, 8).toUpperCase()}` : '—',
        description: p.note || 'قيد دين إضافي',
        debit: amt,
        credit: 0,
        status: 'unpaid',
      });
    } else {
      entries.push({
        id: p.id,
        date: p.date || p.createdAt || new Date().toISOString(),
        type: 'payment',
        number: p.id ? `#${p.id.slice(0, 8).toUpperCase()}` : '—',
        description: `سند تسديد (${methodLabel})${p.note ? ` - ${p.note}` : ''}`,
        debit: 0,
        credit: amt,
        status: 'paid',
      });
    }
  }

  // Calculate opening balance
  const totalAllDebits = entries.reduce((acc, e) => acc + e.debit, 0);
  const totalAllCredits = entries.reduce((acc, e) => acc + e.credit, 0);
  const netEver = totalAllDebits - totalAllCredits;
  const currentBalance = Number(customer.balance || 0);
  const rawOpening = currentBalance - netEver;
  const openingBalance = Math.abs(rawOpening) < 0.01 ? 0 : Math.round(rawOpening * 100) / 100;

  // Filter by dates if specified
  const fromTime = filter?.dateFrom ? new Date(`${filter.dateFrom}T00:00:00`).getTime() : null;
  const toTime = filter?.dateTo ? new Date(`${filter.dateTo}T23:59:59.999`).getTime() : null;

  let balanceBroughtForward = openingBalance;
  let filtered = entries;

  if (fromTime !== null) {
    const priorEntries = entries.filter((e) => new Date(e.date).getTime() < fromTime);
    const priorDebits = priorEntries.reduce((s, e) => s + e.debit, 0);
    const priorCredits = priorEntries.reduce((s, e) => s + e.credit, 0);
    balanceBroughtForward = Math.round((openingBalance + priorDebits - priorCredits) * 100) / 100;
    filtered = filtered.filter((e) => new Date(e.date).getTime() >= fromTime);
  }

  if (toTime !== null) {
    filtered = filtered.filter((e) => new Date(e.date).getTime() <= toTime);
  }

  if (filter?.type && filter.type !== 'all') {
    if (filter.type === 'sales') {
      filtered = filtered.filter((e) => e.type === 'sale' || e.type === 'return');
    } else if (filter.type === 'payments') {
      filtered = filtered.filter((e) => e.type === 'payment');
    } else if (filter.type === 'debts') {
      filtered = filtered.filter((e) => e.type === 'debt_addition' || (e.type === 'sale' && e.debit > e.credit));
    }
  }

  // Sort chronologically
  filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  const resultEntries: CustomerStatementEntry[] = [];
  let running = fromTime !== null ? balanceBroughtForward : openingBalance;

  if (fromTime !== null) {
    resultEntries.push({
      id: 'brought-forward',
      date: filter?.dateFrom || '',
      type: 'previous_balance',
      number: '—',
      description: 'رصيد منقول لما قبل الفترة',
      debit: balanceBroughtForward > 0 ? balanceBroughtForward : 0,
      credit: balanceBroughtForward < 0 ? Math.abs(balanceBroughtForward) : 0,
      status: 'unpaid',
      runningBalance: balanceBroughtForward,
    });
  } else if (openingBalance !== 0) {
    resultEntries.push({
      id: 'opening-balance',
      date: customer.createdAt || new Date(0).toISOString(),
      type: 'opening_balance',
      number: '—',
      description: 'رصيد افتتاحي سابق',
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
      status: 'unpaid',
      runningBalance: openingBalance,
    });
  }

  for (const item of filtered) {
    running = Math.round((running + item.debit - item.credit) * 100) / 100;
    resultEntries.push({
      ...item,
      runningBalance: running,
    });
  }

  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);

  return {
    entries: resultEntries,
    openingBalance: fromTime !== null ? balanceBroughtForward : openingBalance,
    totalDebit,
    totalCredit,
    netChange: totalDebit - totalCredit,
    finalBalance: running,
    periodFrom: filter?.dateFrom,
    periodTo: filter?.dateTo,
  };
}
