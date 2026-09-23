import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Filter,
  Search,
  Calendar,
  Download,
  Printer,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  User,
  FileText,
  Clock,
  ChevronDown,
  Eye,
  Wallet,
  Receipt,
  PlusCircle,
  X,
  Phone,
  RotateCcw,
} from 'lucide-react';
import type { Customer, Sale, Payment } from '@/types';
import { formatCustomerMoney } from '../services/customerStatus';
import { printPaymentVoucher } from '../services/customerPrintService';
import { printPOSDebtAdditionSlip } from '@/features/pos/debt';
import * as XLSX from 'xlsx';

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  type: 'sale_invoice' | 'payment_voucher' | 'debt_addition' | 'return_credit';
  title: string;
  referenceNumber: string;
  debit: number;   // دين (+ على الزبون)
  credit: number;  // سداد (- تخفيض الدين)
  status?: string;
  notes?: string;
  rawSale?: Sale;
  rawPayment?: Payment;
  runningBalanceAfter?: number;
}

export interface CustomerLedgerViewProps {
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  currencySymbol?: string;
  storeName?: string;
  onOpenPayment: (customer: Customer) => void;
  onOpenAddDebt?: (customer?: Customer) => void;
  onOpenStatement: (customer: Customer) => void;
  onPrintDebtsReport: () => void;
  onOpenInvoiceDetails?: (sale: Sale) => void;
  onPrintInvoice?: (sale: Sale) => void;
  onSettleSpecificInvoice?: (sale: Sale, remainingDebt: number) => void;
}

export const CustomerLedgerView: React.FC<CustomerLedgerViewProps> = ({
  customers,
  sales,
  payments,
  currencySymbol = 'دج',
  storeName = 'نقطة البيع',
  onOpenPayment,
  onOpenAddDebt,
  onOpenStatement,
  onPrintDebtsReport,
  onOpenInvoiceDetails,
  onPrintInvoice,
  onSettleSpecificInvoice,
}) => {
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'PAYMENTS' | 'DEBT_ADDITIONS' | 'RETURNS'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Selected customer object (if a specific customer is picked)
  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'ALL') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Build full chronological ledger entries from sales and payments
  const allLedgerEntries = useMemo(() => {
    const entries: CustomerLedgerEntry[] = [];
    const customerMap = new Map<string, Customer>();
    customers.forEach((c) => customerMap.set(c.id, c));

    // 1. Sales and Returns entries
    sales.forEach((s) => {
      if (!s.customerId) return;
      const cust = customerMap.get(s.customerId);
      const custName = cust?.name || (s as any).customerName || (s as any).cashierName || 'زبون';
      const total = Math.abs(Number(s.total || 0));
      const paid = Number(s.amountPaid ?? s.paidAmount ?? (s as any).amount_paid ?? 0);
      const note = (s as any).notes || s.note || '';
      const isReturn = s.type === 'return';

      if (isReturn) {
        const isCustomerCredit =
          (s as any).refundMethod === 'customer_credit' ||
          (s.paymentMethod === 'credit' && (s as any).refundMethod !== 'cash');

        if (isCustomerCredit) {
          // مرتجع على الحساب: دائن لصالح العميل (- تخفيض للدين أو زيادة في رصيده الدائن)
          entries.push({
            id: `sale-${s.id}`,
            date: s.date || s.createdAt || '',
            customerId: s.customerId,
            customerName: custName,
            customerPhone: cust?.phone,
            type: 'return_credit',
            title: 'إرجاع مبيعات (قيد في الحساب / خصم دين)',
            referenceNumber: s.number || s.id.slice(-6),
            debit: 0,
            credit: total,
            status: 'return',
            notes: note || (s.returnReason ? `سبب الإرجاع: ${s.returnReason}` : undefined),
            rawSale: s,
          });
        } else {
          // مرتجع نقدي من الخزينة: متوازن محاسبياً (مدين = دائن) وأثره الصافي على رصيد الدين = 0 لأن الزبون استلم المبلغ نقداً
          entries.push({
            id: `sale-${s.id}`,
            date: s.date || s.createdAt || '',
            customerId: s.customerId,
            customerName: custName,
            customerPhone: cust?.phone,
            type: 'return_credit',
            title: 'إرجاع مبيعات نقداً (مسترد من الخزينة)',
            referenceNumber: s.number || s.id.slice(-6),
            debit: total,
            credit: total,
            status: 'return',
            notes: note || (s.returnReason ? `سبب الإرجاع: ${s.returnReason}` : undefined),
            rawSale: s,
          });
        }
        return;
      }

      const isCredit = s.paymentMethod === 'credit' || s.status === 'unpaid' || s.status === 'partial' || paid < total;

      if (!isCredit) {
        // فاتورة بيع مسددة نقداً / فوري: متوازنة محاسبياً (مدين = دائن) وأثرها على الدين = 0
        entries.push({
          id: `sale-${s.id}`,
          date: s.date || s.createdAt || '',
          customerId: s.customerId,
          customerName: custName,
          customerPhone: cust?.phone,
          type: 'sale_invoice',
          title: 'فاتورة بيع مسددة نقداً',
          referenceNumber: s.number || s.id.slice(-6),
          debit: total,
          credit: total,
          status: 'paid',
          notes: note,
          rawSale: s,
        });
      } else {
        // فاتورة بيع بالآجل (دين): المدين = إجمالي الفاتورة، الدائن = 0، وأي تسديدات لاحقة تظهر كسندات قبض مستقلة لمنع الازدواجية المحاسبية
        entries.push({
          id: `sale-${s.id}`,
          date: s.date || s.createdAt || '',
          customerId: s.customerId,
          customerName: custName,
          customerPhone: cust?.phone,
          type: 'sale_invoice',
          title: 'فاتورة بيع (آجل / دين)',
          referenceNumber: s.number || s.id.slice(-6),
          debit: total,
          credit: 0,
          status: s.status || (paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid'),
          notes: note,
          rawSale: s,
        });
      }
    });

    // 2. Payments & Debt additions entries (Customer transactions only)
    const customerPayments = payments.filter(
      (p) => !p.partyType || p.partyType === 'customer' || (p as any).party_type === 'customer'
    );

    customerPayments.forEach((p) => {
      const custId = p.customerId || (p as any).partyId || (p as any).party_id;
      if (!custId) return;
      const cust = customerMap.get(custId);
      const custName = cust?.name || (p as any).customerName || 'زبون';
      const isDebitAddition = p.type === 'debit';
      const amt = Number(p.amount || 0);

      entries.push({
        id: `pay-${p.id}`,
        date: p.date || (p as any).createdAt || '',
        customerId: custId,
        customerName: custName,
        customerPhone: cust?.phone,
        type: isDebitAddition ? 'debt_addition' : 'payment_voucher',
        title: isDebitAddition ? 'سند قيد دين مباشر' : 'سند تسديد دفعة نقدية',
        referenceNumber: (p as any).voucherNumber || p.id.slice(0, 8).toUpperCase(),
        debit: isDebitAddition ? amt : 0,
        credit: isDebitAddition ? 0 : amt,
        status: isDebitAddition ? 'unpaid' : 'paid',
        notes: p.note,
        rawPayment: p,
      });
    });

    // Sort descending by date
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return entries;
  }, [customers, sales, payments]);

  // Calculate cumulative running balance per customer taking into account initial opening balance
  const customerRunningBalanceMap = useMemo(() => {
    const map = new Map<string, number>();

    // تجميع الحركات لكل زبون على حدة
    const entriesByCustomer = new Map<string, CustomerLedgerEntry[]>();
    allLedgerEntries.forEach((entry) => {
      const list = entriesByCustomer.get(entry.customerId) || [];
      list.push(entry);
      entriesByCustomer.set(entry.customerId, list);
    });

    // احتساب الرصيد الافتتاحي والتراكم المحاسبي لكل عميل
    for (const [custId, cEntries] of entriesByCustomer.entries()) {
      const cust = customers.find((c) => c.id === custId);
      const targetBalance = Number(cust?.balance || 0);

      // صافي حركات هذا العميل المسجلة
      const netTransactions = cEntries.reduce((sum, e) => sum + (e.debit - e.credit), 0);
      const rawOpening = targetBalance - netTransactions;
      const openingBalance = Math.abs(rawOpening) < 0.01 ? 0 : Math.round(rawOpening * 100) / 100;

      // فرز زمني تصاعدي للتراكم
      const chronological = [...cEntries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      let running = openingBalance;
      for (const item of chronological) {
        running += item.debit - item.credit;
        map.set(item.id, Math.round(running * 100) / 100);
      }
    }

    return map;
  }, [allLedgerEntries, customers]);

  // Filter ledger entries
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return allLedgerEntries
      .filter((entry) => {
        // 1. Customer filter
        if (selectedCustomerId !== 'ALL' && entry.customerId !== selectedCustomerId) {
          return false;
        }

        // 2. Search query (name, phone, ref)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = entry.customerName.toLowerCase().includes(q);
          const matchesPhone = entry.customerPhone ? entry.customerPhone.includes(q) : false;
          const matchesRef = entry.referenceNumber.toLowerCase().includes(q);
          if (!matchesName && !matchesPhone && !matchesRef) return false;
        }

        // 3. Time filter
        if (timeFilter !== 'ALL') {
          const entryDate = new Date(entry.date);
          if (timeFilter === 'TODAY') {
            if (!entry.date.startsWith(todayStr)) return false;
          } else if (timeFilter === 'WEEK') {
            if (entryDate < weekAgo) return false;
          } else if (timeFilter === 'MONTH') {
            if (entryDate < monthAgo) return false;
          }
        }

        // 4. Type filter
        if (typeFilter === 'UNPAID') {
          if (entry.type === 'debt_addition') return true;
          if (entry.type === 'sale_invoice' && entry.rawSale) {
            const paid = Number(entry.rawSale.amountPaid ?? entry.rawSale.paidAmount ?? (entry.rawSale as any).amount_paid ?? 0);
            return entry.debit - paid > 0.01;
          }
          return false;
        } else if (typeFilter === 'PARTIAL') {
          if (entry.type === 'sale_invoice' && entry.rawSale) {
            const paid = Number(entry.rawSale.amountPaid ?? entry.rawSale.paidAmount ?? (entry.rawSale as any).amount_paid ?? 0);
            return paid > 0.01 && paid < entry.debit;
          }
          return false;
        } else if (typeFilter === 'PAID') {
          if (entry.type === 'sale_invoice') {
            if (!entry.rawSale) return entry.status === 'paid';
            const paid = Number(entry.rawSale.amountPaid ?? entry.rawSale.paidAmount ?? (entry.rawSale as any).amount_paid ?? 0);
            return paid >= entry.debit || entry.status === 'paid';
          }
          return false;
        } else if (typeFilter === 'PAYMENTS') {
          return entry.type === 'payment_voucher';
        } else if (typeFilter === 'DEBT_ADDITIONS') {
          return entry.type === 'debt_addition';
        } else if (typeFilter === 'RETURNS') {
          return entry.type === 'return_credit';
        }

        return true;
      })
      .map((entry) => ({
        ...entry,
        runningBalanceAfter: customerRunningBalanceMap.get(entry.id),
      }));
  }, [allLedgerEntries, selectedCustomerId, searchQuery, timeFilter, typeFilter, customerRunningBalanceMap]);

  // Overall financial statistics
  const stats = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    let unpaidInvoicesCount = 0;
    let totalOutstandingDebt = 0;

    if (selectedCustomer) {
      totalOutstandingDebt = selectedCustomer.balance > 0 ? selectedCustomer.balance : 0;
    } else {
      customers.forEach((c) => {
        if (c.balance > 0) totalOutstandingDebt += c.balance;
      });
    }

    filteredEntries.forEach((entry) => {
      totalDebit += entry.debit;
      totalCredit += entry.credit;
      if (entry.type === 'sale_invoice' && entry.rawSale) {
        const paid = Number(entry.rawSale.amountPaid ?? entry.rawSale.paidAmount ?? (entry.rawSale as any).amount_paid ?? 0);
        if (entry.debit - paid > 0.01) {
          unpaidInvoicesCount += 1;
        }
      }
    });

    return {
      totalDebit,
      totalCredit,
      totalOutstandingDebt,
      unpaidInvoicesCount,
      totalEntries: filteredEntries.length,
    };
  }, [customers, selectedCustomer, filteredEntries]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(start, start + itemsPerPage);
  }, [filteredEntries, currentPage]);

  // Export ledger to Excel
  const handleExportExcel = () => {
    const data = filteredEntries.map((e, idx) => {
      const paidOnInv = e.rawSale
        ? Number(e.rawSale.amountPaid ?? e.rawSale.paidAmount ?? (e.rawSale as any).amount_paid ?? 0)
        : e.credit;
      const unpaidDebt = e.type === 'sale_invoice' ? Math.max(0, e.debit - paidOnInv) : 0;

      return {
        '#': idx + 1,
        'التاريخ': new Date(e.date).toLocaleString('ar-DZ'),
        'الزبون': e.customerName,
        'الهاتف': e.customerPhone || '',
        'نوع الحركة': e.title,
        'رقم المرجع': e.referenceNumber,
        'مدين (دين)': e.debit,
        'دائن (تسديد)': e.credit,
        'المتبقي غير المسدد': unpaidDebt,
        'الحالة':
          e.type === 'return_credit'
            ? 'مرتجع مبيعات'
            : e.type === 'debt_addition'
            ? 'قيد دين إضافي'
            : e.type === 'payment_voucher'
            ? 'سند قبض'
            : unpaidDebt <= 0.01
            ? 'مسددة بالكامل'
            : paidOnInv > 0
            ? 'مسددة جزئياً'
            : 'دين غير مسدد',
        'الرصيد بعد الحركة': e.runningBalanceAfter ?? 0,
        'ملاحظات': e.notes || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'دفتر حسابات الزبائن');
    XLSX.writeFile(wb, `دفتر_حسابات_الزبائن_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Helper to print payment slip from ledger row
  const handlePrintLedgerSlip = (entry: CustomerLedgerEntry) => {
    if (entry.type === 'debt_addition' && entry.rawPayment) {
      printPOSDebtAdditionSlip(
        {
          success: true,
          customerId: entry.customerId,
          customerName: entry.customerName,
          previousBalance: entry.runningBalanceAfter ? entry.runningBalanceAfter - entry.debit : 0,
          addedAmount: entry.debit,
          newBalance: entry.runningBalanceAfter ?? entry.debit,
          voucherNumber: entry.referenceNumber,
          reason: entry.notes || 'قيد دين إضافي',
          timestamp: entry.date,
        },
        entry.customerName,
        entry.customerPhone,
        storeName,
        currencySymbol
      );
    } else if (entry.type === 'payment_voucher' && entry.rawPayment) {
      printPaymentVoucher(
        {
          customerName: entry.customerName,
          customerPhone: entry.customerPhone,
          amount: entry.credit,
          date: entry.date,
          method: (entry.rawPayment as any).method || 'cash',
          note: entry.notes,
          previousBalance: entry.runningBalanceAfter ? entry.runningBalanceAfter + entry.credit : entry.credit,
          newBalance: entry.runningBalanceAfter ?? 0,
        },
        storeName,
        currencySymbol
      );
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* 1. Top Ledger Financial Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Outstanding Debt */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-on-surface-variant block truncate">
              إجمالي الديون القائمة
            </span>
            <div className="text-lg font-black font-mono text-red-600 truncate">
              {formatCustomerMoney(stats.totalOutstandingDebt)}{' '}
              <span className="text-xs font-cairo text-on-surface-variant font-bold">{currencySymbol}</span>
            </div>
          </div>
        </div>

        {/* Total Payments Collected */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-on-surface-variant block truncate">
              إجمالي التحصيلات المسددة
            </span>
            <div className="text-lg font-black font-mono text-emerald-600 truncate">
              {formatCustomerMoney(stats.totalCredit)}{' '}
              <span className="text-xs font-cairo text-on-surface-variant font-bold">{currencySymbol}</span>
            </div>
          </div>
        </div>

        {/* Unpaid / Partial Invoices Count */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-on-surface-variant block truncate">
              فواتير معلقة غير مسددة
            </span>
            <div className="text-lg font-black font-mono text-amber-600 truncate">
              {stats.unpaidInvoicesCount}{' '}
              <span className="text-xs font-cairo text-on-surface-variant font-bold">فاتورة</span>
            </div>
          </div>
        </div>

        {/* Total Ledger Events */}
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-on-surface-variant block truncate">
              إجمالي حركات الدفتر
            </span>
            <div className="text-lg font-black font-mono text-on-surface truncate">
              {stats.totalEntries}{' '}
              <span className="text-xs font-cairo text-on-surface-variant font-bold">حركة</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Customer Credit & Balance Banner (Shown when a specific customer is chosen) */}
      {selectedCustomer && (
        <div className="bg-surface-container-low border border-primary/25 rounded-3xl p-5 shadow-2xs space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shadow-2xs">
                {selectedCustomer.name.trim().charAt(0) || 'ز'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-on-surface">{selectedCustomer.name}</h3>
                  {selectedCustomer.customerType === 'wholesale' && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-black border border-blue-500/30">
                      تاجر جملة
                    </span>
                  )}
                  {selectedCustomer.customerType === 'semi_wholesale' && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/30">
                      نصف جملة
                    </span>
                  )}
                  {selectedCustomer.balance > 0 && selectedCustomer.creditLimit > 0 && selectedCustomer.balance > selectedCustomer.creditLimit && (
                    <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-600 text-[10px] font-black animate-pulse border border-red-500/30">
                      تجاوز سقف الدين
                    </span>
                  )}
                  {selectedCustomer.balance < 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-400 text-[10px] font-black border border-teal-500/30">
                      رصيد دائن مسبق
                    </span>
                  )}
                </div>
                {selectedCustomer.phone && (
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5" dir="ltr">
                    {selectedCustomer.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions for this Customer */}
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenAddDebt && (
                <button
                  type="button"
                  onClick={() => onOpenAddDebt(selectedCustomer)}
                  className="h-9 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="إضافة قيد دين مباشر لهذا الزبون"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>إضافة دين مباشر</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenPayment(selectedCustomer)}
                className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="تسجيل تسديد دفعة مالية لهذا الزبون"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>تسجيل تسديد دفعة</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenStatement(selectedCustomer)}
                className="h-9 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
                title="معاينة وطباعة كشف الحساب التراكمي"
              >
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>كشف الحساب</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCustomerId('ALL')}
                className="h-9 px-2.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="إلغاء التحديد وعرض كافة الزبائن"
              >
                <X className="w-3.5 h-3.5" />
                <span>عرض الكل</span>
              </button>
            </div>
          </div>

          {/* Customer Credit KPI Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Balance */}
            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
              <span className="text-[11px] font-bold text-on-surface-variant block">الرصيد القائم المستحق</span>
              <div className={`text-lg font-black font-mono mt-0.5 ${selectedCustomer.balance > 0 ? 'text-red-600' : selectedCustomer.balance < 0 ? 'text-teal-600' : 'text-emerald-600'}`}>
                {selectedCustomer.balance < 0 ? `+${formatCustomerMoney(Math.abs(selectedCustomer.balance))}` : formatCustomerMoney(selectedCustomer.balance)}{' '}
                <span className="text-xs font-cairo font-bold">{selectedCustomer.balance < 0 ? `(دائن) ${currencySymbol}` : currencySymbol}</span>
              </div>
            </div>

            {/* Credit Limit */}
            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
              <span className="text-[11px] font-bold text-on-surface-variant block">سقف الائتمان المحدد</span>
              <div className="text-lg font-black font-mono mt-0.5 text-on-surface">
                {selectedCustomer.creditLimit > 0 ? formatCustomerMoney(selectedCustomer.creditLimit) : 'غير محدد'}{' '}
                {selectedCustomer.creditLimit > 0 && <span className="text-xs font-cairo font-bold">{currencySymbol}</span>}
              </div>
            </div>

            {/* Remaining Credit */}
            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
              <span className="text-[11px] font-bold text-on-surface-variant block">الائتمان المتبقي المتاح</span>
              <div className="text-lg font-black font-mono mt-0.5 text-primary">
                {selectedCustomer.creditLimit > 0
                  ? `${formatCustomerMoney(Math.max(0, selectedCustomer.creditLimit - selectedCustomer.balance))} ${currencySymbol}`
                  : 'مفتوح (بدون سقف)'}
              </div>
            </div>

            {/* Utilization Gauge */}
            <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-on-surface-variant">استهلاك السقف</span>
                {selectedCustomer.creditLimit > 0 && (
                  <span className={`font-mono font-black ${
                    (selectedCustomer.balance / selectedCustomer.creditLimit) >= 1 ? 'text-red-600' :
                    (selectedCustomer.balance / selectedCustomer.creditLimit) >= 0.8 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {Math.round((Math.max(0, selectedCustomer.balance) / selectedCustomer.creditLimit) * 100)}%
                  </span>
                )}
              </div>
              {selectedCustomer.creditLimit > 0 ? (
                <div className="h-2 rounded-full bg-surface-container-high mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (selectedCustomer.balance / selectedCustomer.creditLimit) >= 1 ? 'bg-red-500' :
                      (selectedCustomer.balance / selectedCustomer.creditLimit) >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, (selectedCustomer.balance / selectedCustomer.creditLimit) * 100))}%` }}
                  />
                </div>
              ) : (
                <span className="text-xs text-on-surface-variant/70 mt-1 block">بدون سقف ائتماني</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Controls & Filter Bar */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="البحث بالاسم، الهاتف، أو رقم الفاتورة..."
              className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
          </div>

          {/* Customer Dropdown Filter */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 pl-8 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="ALL">جميع الزبائن ({customers.length})</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.balance > 0 ? `(دين: ${formatCustomerMoney(c.balance)})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>

          {/* Quick Direct Actions in Controls Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenAddDebt && (
              <button
                type="button"
                onClick={() => {
                  if (selectedCustomer) {
                    onOpenAddDebt(selectedCustomer);
                  } else {
                    alert('يرجى تحديد زبون من القائمة المنسدلة أولاً لتسجيل قيد دين مباشر عليه.');
                  }
                }}
                className="h-10 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
                title="إضافة دين مباشر على حساب العميل"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>إضافة دين</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (selectedCustomer) {
                  onOpenPayment(selectedCustomer);
                } else {
                  alert('يرجى تحديد زبون من القائمة المنسدلة أولاً لتسجيل تسديد دفعة نقدية له.');
                }
              }}
              disabled={customers.length === 0}
              className="h-10 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs disabled:opacity-40 active:scale-95"
              title="تسجيل تسديد دفعة نقدية تخصم من الدين"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>تسديد دفعة</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="h-10 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95"
              title="تصدير دفتر الحسابات إلى ملف Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={onPrintDebtsReport}
              className="h-10 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs active:scale-95"
              title="طباعة تقرير شامل بكافة ديون العملاء"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
          </div>
        </div>

        {/* Filter Pills (Time & Type) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/15 text-xs">
          {/* Time Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-on-surface-variant ml-1">الفترة:</span>
            {[
              { id: 'ALL', label: 'كافة الفترات' },
              { id: 'TODAY', label: 'اليوم' },
              { id: 'WEEK', label: 'آخر 7 أيام' },
              { id: 'MONTH', label: 'آخر 30 يوماً' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTimeFilter(p.id as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  timeFilter === p.id
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Type Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-on-surface-variant ml-1">نوع الحركة:</span>
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'UNPAID', label: 'ديون معلقة' },
              { id: 'PARTIAL', label: 'مسددة جزئياً' },
              { id: 'PAID', label: 'مسددة بالكامل' },
              { id: 'PAYMENTS', label: 'سندات قبض' },
              { id: 'DEBT_ADDITIONS', label: 'قيود ديون مضافة' },
              { id: 'RETURNS', label: 'مرتجعات مبيعات' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTypeFilter(p.id as any);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  typeFilter === p.id
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Main Ledger Table */}
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[130px]">التاريخ والوقت</th>
                <th className="py-3 px-4 min-w-[170px]">الزبون</th>
                <th className="py-3 px-4 min-w-[160px]">نوع الحركة</th>
                <th className="py-3 px-4 min-w-[110px] text-center">رقم المرجع</th>
                <th className="py-3 px-4 min-w-[125px] text-center text-red-600">مدين (دين +)</th>
                <th className="py-3 px-4 min-w-[125px] text-center text-emerald-600">دائن (تسديد -)</th>
                {selectedCustomerId !== 'ALL' && (
                  <th className="py-3 px-4 min-w-[130px] text-center text-primary font-black">
                    الرصيد التراكمي
                  </th>
                )}
                <th className="py-3 px-4 min-w-[140px] text-center">الحالة</th>
                <th className="py-3 px-4 min-w-[160px] text-center">إجراء سريع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 font-sans">
              {paginatedEntries.length === 0 ? (
                <tr>
                  <td colSpan={selectedCustomerId !== 'ALL' ? 10 : 9} className="py-16 text-center text-on-surface-variant">
                    <BookOpen className="w-10 h-10 opacity-25 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-bold text-on-surface">لا توجد حركات مطابقة للفلتر المحدد</p>
                    <p className="text-xs mt-1">جرّب تغيير عبارة البحث أو الفترة الزمنية</p>
                  </td>
                </tr>
              ) : (
                paginatedEntries.map((entry, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  const customerObj = customers.find((c) => c.id === entry.customerId);
                  const rawSale = entry.rawSale;
                  const paidOnInvoice = rawSale
                    ? Number(rawSale.amountPaid ?? rawSale.paidAmount ?? (rawSale as any).amount_paid ?? 0)
                    : entry.credit;
                  const remainingInvoiceDebt = entry.type === 'sale_invoice' ? Math.max(0, entry.debit - paidOnInvoice) : 0;
                  const paidPercent = entry.type === 'sale_invoice' && entry.debit > 0
                    ? Math.min(100, (paidOnInvoice / entry.debit) * 100)
                    : 0;
                  const isUnpaid = entry.type === 'sale_invoice' && remainingInvoiceDebt > 0.01;

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-surface-container/60 transition-colors ${
                        (entry.type === 'sale_invoice' || entry.type === 'return_credit') && entry.rawSale ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        if ((entry.type === 'sale_invoice' || entry.type === 'return_credit') && entry.rawSale && onOpenInvoiceDetails) {
                          onOpenInvoiceDetails(entry.rawSale);
                        }
                      }}
                    >
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-on-surface-variant">
                        {itemIndex}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 text-on-surface">
                        <div className="font-bold text-[11px]">
                          {entry.date ? new Date(entry.date).toLocaleDateString('ar-DZ') : '-'}
                        </div>
                        <div className="text-[10px] text-on-surface-variant font-mono">
                          {entry.date ? new Date(entry.date).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="font-black text-on-surface text-xs">{entry.customerName}</div>
                        {entry.customerPhone && (
                          <div className="text-[10px] text-on-surface-variant font-mono" dir="ltr">
                            {entry.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* Transaction Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {entry.type === 'sale_invoice' ? (
                            <ArrowDownRight className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          ) : entry.type === 'debt_addition' ? (
                            <PlusCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          ) : entry.type === 'return_credit' ? (
                            <RotateCcw className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span className="font-bold text-on-surface">{entry.title}</span>
                        </div>
                      </td>

                      {/* Reference # */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-on-surface-variant">
                        #{entry.referenceNumber}
                      </td>

                      {/* Debit (مدين) */}
                      <td className="py-3 px-4 text-center font-mono font-black text-red-600">
                        {entry.debit > 0 ? (
                          <>
                            {formatCustomerMoney(entry.debit)}{' '}
                            <span className="text-[10px] font-cairo font-bold">{currencySymbol}</span>
                          </>
                        ) : (
                          <span className="text-on-surface-variant/40 font-normal">-</span>
                        )}
                      </td>

                      {/* Credit (دائن) */}
                      <td className="py-3 px-4 text-center font-mono font-black text-emerald-600">
                        {entry.credit > 0 ? (
                          <>
                            {formatCustomerMoney(entry.credit)}{' '}
                            <span className="text-[10px] font-cairo font-bold">{currencySymbol}</span>
                          </>
                        ) : (
                          <span className="text-on-surface-variant/40 font-normal">-</span>
                        )}
                      </td>

                      {/* Running Balance (When single customer is selected) */}
                      {selectedCustomerId !== 'ALL' && (
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {entry.runningBalanceAfter !== undefined ? (
                            <span
                              className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                entry.runningBalanceAfter > 0
                                  ? 'text-red-600 bg-red-500/10'
                                  : entry.runningBalanceAfter < 0
                                  ? 'text-teal-600 bg-teal-500/10'
                                  : 'text-emerald-600 bg-emerald-500/10'
                              }`}
                            >
                              {entry.runningBalanceAfter < 0 ? `+${formatCustomerMoney(Math.abs(entry.runningBalanceAfter))}` : formatCustomerMoney(entry.runningBalanceAfter)}{' '}
                              <span className="text-[9px] font-cairo">{currencySymbol}</span>
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}

                      {/* Invoice Status Badge + Progress Bar */}
                      <td className="py-3 px-4 text-center">
                        {entry.type === 'sale_invoice' ? (
                          <div className="space-y-1.5">
                            {paidPercent >= 100 || remainingInvoiceDebt <= 0.01 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>مسددة بالكامل</span>
                              </span>
                            ) : paidPercent > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>جزئية (متبقي {formatCustomerMoney(remainingInvoiceDebt)})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>دين غير مسدد</span>
                              </span>
                            )}
                            {/* Payment Progress Bar */}
                            {entry.debit > 0 && (
                              <div className="w-full max-w-[120px] mx-auto">
                                <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      paidPercent >= 100 ? 'bg-emerald-500' :
                                      paidPercent >= 50  ? 'bg-amber-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${paidPercent}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-mono text-on-surface-variant mt-0.5 block">
                                  {paidPercent.toFixed(0)}% مسدد
                                </span>
                              </div>
                            )}
                          </div>
                        ) : entry.type === 'debt_addition' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            <PlusCircle className="w-2.5 h-2.5" />
                            <span>قيد مدين إضافي</span>
                          </span>
                        ) : entry.type === 'return_credit' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>مرتجع مبيعات</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                            <span>سند قبض نقدي</span>
                          </span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* معاينة تفاصيل الفاتورة أو المرتجع */}
                          {(entry.type === 'sale_invoice' || entry.type === 'return_credit') && entry.rawSale && onOpenInvoiceDetails && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenInvoiceDetails(entry.rawSale!);
                              }}
                              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                              title="معاينة تفاصيل الفاتورة وبنودها"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* طباعة الفاتورة أو المرتجع أو السند */}
                          {(entry.type === 'sale_invoice' || entry.type === 'return_credit') && entry.rawSale && onPrintInvoice ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPrintInvoice(entry.rawSale!);
                              }}
                              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[10px] font-bold border border-outline-variant/25 transition-all active:scale-95 cursor-pointer"
                              title="طباعة هذه الفاتورة"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          ) : (entry.type === 'payment_voucher' || entry.type === 'debt_addition') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintLedgerSlip(entry);
                              }}
                              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[10px] font-bold border border-outline-variant/25 transition-all active:scale-95 cursor-pointer"
                              title="طباعة سند هذا الإيصال حرارياً"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* تسديد هذه الفاتورة بعينها مع تأكيد */}
                          {isUnpaid && entry.rawSale && onSettleSpecificInvoice && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm(
                                  `تأكيد تسديد دين الفاتورة #${entry.referenceNumber} بقيمة ${formatCustomerMoney(remainingInvoiceDebt)} ${currencySymbol} نقداً؟`
                                );
                                if (confirmed) {
                                  onSettleSpecificInvoice(entry.rawSale!, remainingInvoiceDebt);
                                }
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
                              title={`تسديد دين هذه الفاتورة (${formatCustomerMoney(remainingInvoiceDebt)} ${currencySymbol})`}
                            >
                              <Wallet className="w-3 h-3" />
                              <span>تسديد</span>
                            </button>
                          )}

                          {/* كشف حساب الزبون */}
                          {customerObj && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenStatement(customerObj);
                              }}
                              className="px-2 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[10px] font-bold border border-outline-variant/25 transition-all cursor-pointer"
                              title="عرض كشف الحساب التراكمي"
                            >
                              كشف
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-outline-variant/15 flex items-center justify-between text-xs text-on-surface-variant font-bold">
            <div>
              عرض صفحة {currentPage} من أصل {totalPages} ({filteredEntries.length} حركة)
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                السابق
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl font-mono text-xs cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-primary text-on-primary font-black'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
