import type { Customer, Sale, Payment } from '@/types';
import type { CustomerStatementEntry } from '../types';

export interface StatementCalculationResult {
  entries: CustomerStatementEntry[];
  openingBalance: number;
  periodSalesTotal: number;
  periodPaymentsTotal: number;
  finalBalance: number;
  balanceBroughtForward: number;
}

/**
 * دالة مساعدة لتحويل نص التاريخ YYYY-MM-DD إلى توقيت محلي دقيق
 */
export function parseLocalDayBoundary(dateStr?: string, isEnd = false): number | null {
  if (!dateStr || !dateStr.trim()) return null;
  const parts = dateStr.trim().split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;
  const [year, month, day] = parts;
  return isEnd
    ? new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
    : new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

/**
 * دالة استخراج وتنسيق كشف الحساب المحاسبي للزبون
 * تضمن:
 * 1. احتساب الرصيد الافتتاحي السابق (Opening Balance) بدقة تامة.
 * 2. احتساب الرصيد المنقول لما قبل الفترة عند تصفية التواريخ.
 * 3. منع أخطاء NaN الناتجة عن عدم تطابق amountPaid / paidAmount.
 * 4. الترتيب الزمني المحاسبي السليم (الفواتير أولاً ثم الدفعات لنفس التاريخ).
 */
export function calculateCustomerStatement(
  customer: Customer,
  customerSales: Sale[],
  customerPayments: Payment[],
  filterType: 'all' | 'sales' | 'payments' = 'all',
  dateFrom = '',
  dateTo = ''
): StatementCalculationResult {
  // 1. استخراج حركات المبيعات وتأمين حقول debit و credit
  const allSales = customerSales.map((s: any) => {
    const total = Number(s.total || 0);
    // دعم amountPaid أو paidAmount مع fallback إلى 0
    const paid = Number(s.amountPaid ?? s.paidAmount ?? 0);
    return {
      id: s.id,
      date: s.date || s.createdAt || new Date().toISOString(),
      type: 'sale' as const,
      number: s.number || '—',
      description: `فاتورة مبيعات #${s.number || '—'}`,
      debit: total,
      credit: Math.min(total, paid),
      status: s.status || 'paid',
    };
  });

  // 2. استخراج حركات التسديد النقدية/البنكية
  const allPayments = customerPayments.map((p: any) => {
    const methodNames: Record<string, string> = {
      cash: 'نقداً',
      baridimob: 'بريدي موب / CCP',
      check: 'شيك بنكي',
      transfer: 'تحويل بنكي',
    };
    const methodLabel = methodNames[p.method] || p.method || 'نقداً';
    return {
      id: p.id,
      date: p.date || p.createdAt || new Date().toISOString(),
      type: 'payment' as const,
      number: '—',
      description: `تسديد دفعة (${methodLabel})${p.note ? ' - ' + p.note : ''}`,
      debit: 0,
      credit: Number(p.amount || 0),
      status: 'paid' as const,
    };
  });

  // 3. احتساب الرصيد الافتتاحي السابق المسجل عند فتح حساب العميل
  const totalAllSalesDebits = allSales.reduce((sum, s) => sum + s.debit, 0);
  const totalAllSalesCredits = allSales.reduce((sum, s) => sum + s.credit, 0);
  const totalAllPayments = allPayments.reduce((sum, p) => sum + p.credit, 0);

  const netTransactionsEver = totalAllSalesDebits - (totalAllSalesCredits + totalAllPayments);
  const currentCustomerBalance = Number(customer.balance || 0);
  // الرصيد الافتتاحي هو الفارق بين رصيد العميل الحالي وصافي كل الحركات المسجلة
  const rawOpeningBalance = currentCustomerBalance - netTransactionsEver;
  const initialOpeningBalance = Math.abs(rawOpeningBalance) < 0.01 ? 0 : Math.round(rawOpeningBalance * 100) / 100;

  // 4. حدود التواريخ بالتوقيت المحلي
  const fromTime = parseLocalDayBoundary(dateFrom, false);
  const toTime = parseLocalDayBoundary(dateTo, true);

  // 5. حساب الرصيد المنقول لما قبل الفترة في حال وجود فلترة
  let balanceBroughtForward = initialOpeningBalance;
  if (fromTime !== null) {
    const priorSales = allSales.filter((s) => new Date(s.date).getTime() < fromTime);
    const priorPayments = allPayments.filter((p) => new Date(p.date).getTime() < fromTime);

    const priorDebits = priorSales.reduce((sum, s) => sum + s.debit, 0);
    const priorCredits = priorSales.reduce((sum, s) => sum + s.credit, 0) + priorPayments.reduce((sum, p) => sum + p.credit, 0);
    balanceBroughtForward = Math.round((initialOpeningBalance + priorDebits - priorCredits) * 100) / 100;
  }

  // 6. تصفية حركات الفترة الحالية
  let currentSales = allSales;
  let currentPayments = allPayments;

  if (fromTime !== null) {
    currentSales = currentSales.filter((s) => new Date(s.date).getTime() >= fromTime);
    currentPayments = currentPayments.filter((p) => new Date(p.date).getTime() >= fromTime);
  }
  if (toTime !== null) {
    currentSales = currentSales.filter((s) => new Date(s.date).getTime() <= toTime);
    currentPayments = currentPayments.filter((p) => new Date(p.date).getTime() <= toTime);
  }

  const periodSalesTotal = currentSales.reduce((sum, s) => sum + s.debit, 0);
  const periodPaymentsTotal = currentPayments.reduce((sum, p) => sum + p.credit, 0);

  let periodEntries: Array<Omit<CustomerStatementEntry, 'runningBalance'>> = [];
  if (filterType === 'all') {
    periodEntries = [...currentSales, ...currentPayments];
  } else if (filterType === 'sales') {
    periodEntries = [...currentSales];
  } else if (filterType === 'payments') {
    periodEntries = [...currentPayments];
  }

  // فرز الحركات: زمنياً، ثم الفواتير قبل الدفعات لنفس التاريخ
  periodEntries.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;
    if (a.type === 'sale' && b.type === 'payment') return -1;
    if (a.type === 'payment' && b.type === 'sale') return 1;
    return 0;
  });

  // 7. بناء سجلات دفتر الأستاذ مع الرصيد التراكمي
  const entries: CustomerStatementEntry[] = [];
  let running = fromTime !== null ? balanceBroughtForward : (initialOpeningBalance > 0 ? initialOpeningBalance : 0);

  if (fromTime !== null) {
    // إدراج بند الرصيد المنقول لما قبل الفترة
    entries.push({
      date: dateFrom,
      type: 'previous_balance',
      number: '—',
      description: `رصيد سابق منقول (ما قبل ${new Date(fromTime).toLocaleDateString('ar-DZ')})`,
      debit: balanceBroughtForward > 0 ? balanceBroughtForward : 0,
      credit: balanceBroughtForward < 0 ? Math.abs(balanceBroughtForward) : 0,
      status: 'unpaid',
      runningBalance: balanceBroughtForward,
    });
  } else if (initialOpeningBalance > 0 && filterType !== 'payments') {
    // إدراج بند الرصيد الافتتاحي السابق عند فتح الحساب
    entries.push({
      date: customer.createdAt || new Date(0).toISOString(),
      type: 'opening_balance',
      number: '—',
      description: 'رصيد سابق / دين افتتاحي مسجل عند فتح الحساب',
      debit: initialOpeningBalance,
      credit: 0,
      status: 'unpaid',
      runningBalance: initialOpeningBalance,
    });
  }

  for (const item of periodEntries) {
    running += item.debit - item.credit;
    entries.push({
      ...item,
      runningBalance: Math.round(running * 100) / 100,
    });
  }

  return {
    entries,
    openingBalance: initialOpeningBalance,
    initialOpeningBalance,
    periodSalesTotal,
    totalSales: periodSalesTotal,
    periodPaymentsTotal,
    totalPayments: periodPaymentsTotal,
    finalBalance: Math.round(running * 100) / 100,
    currentBalance: Math.round(running * 100) / 100,
    balanceBroughtForward,
  };
}
