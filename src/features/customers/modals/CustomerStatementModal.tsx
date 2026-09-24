import React, { useMemo } from 'react';
import { DollarSign, FileText, Printer, X, Clock, AlertTriangle, MessageSquare } from 'lucide-react';
import type { Customer, Sale } from '@/types';
import type { CustomerStatementEntry } from '../types';
import { formatCustomerMoney, getWhatsAppUrl } from '../services/customerStatus';
import { calculateCustomerDebtAging } from '../services/customerStatementService';

interface CustomerStatementModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onPrint: () => void;
  onOpenPayment: (customer: Customer) => void;
  entries: CustomerStatementEntry[];
  customerSales?: Sale[];
  filterType: 'all' | 'sales' | 'payments';
  setFilterType: (type: 'all' | 'sales' | 'payments') => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  currencySymbol?: string;
  storeName?: string;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  customer,
  onClose,
  onPrint,
  onOpenPayment,
  entries,
  customerSales,
  filterType,
  setFilterType,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  currencySymbol = 'دج',
  storeName = 'متجرنا',
}) => {
  const agingSummary = useMemo(() => {
    if (!customerSales || customerSales.length === 0) return null;
    return calculateCustomerDebtAging(customerSales);
  }, [customerSales]);

  if (!isOpen || !customer) return null;

  const openingEntry = entries.find((e) => e.type === 'opening_balance' || e.type === 'previous_balance');
  const openingBalanceVal = openingEntry ? openingEntry.runningBalance : 0;
  const hasOpening = Math.abs(openingBalanceVal) >= 0.01;

  const totalPurchases = entries.filter((e) => e.type === 'sale').reduce((sum, e) => sum + e.debit, 0);
  const totalPayments = entries.filter((e) => e.type === 'payment').reduce((sum, e) => sum + e.credit, 0);
  const waUrl = getWhatsAppUrl(customer, storeName, currencySymbol);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm shadow-2xs">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">
                كشف حساب مفصل - {customer.name}
              </h3>
              <p className="text-xs text-on-surface-variant font-mono" dir="ltr">
                {customer.phone || 'بدون رقم هاتف'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs hover:shadow-md cursor-pointer"
                title="إرسال إشعار تذكير بالدين عبر واتساب"
              >
                <MessageSquare className="w-4 h-4" />
                <span>إشعار واتساب</span>
              </a>
            )}

            <button
              onClick={onPrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all shadow-2xs hover:shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Summary Cards for Customer */}
        <div className={`grid ${hasOpening ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'} gap-3 my-4 shrink-0`}>
          {hasOpening && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {openingEntry?.type === 'previous_balance' ? 'الرصيد المنقول لما قبل الفترة:' : 'الرصيد الافتتاحي السابق:'}
              </span>
              <p className="text-lg font-black font-mono text-amber-700 dark:text-amber-300 mt-0.5">
                {formatCustomerMoney(openingBalanceVal)} <span className="text-xs font-cairo">{currencySymbol}</span>
              </p>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 text-center">
            <span className="text-xs font-bold text-on-surface-variant">إجمالي المشتريات:</span>
            <p className="text-lg font-black font-mono text-primary mt-0.5">
              {formatCustomerMoney(totalPurchases)} <span className="text-xs font-cairo">{currencySymbol}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 text-center">
            <span className="text-xs font-bold text-on-surface-variant">إجمالي الدفعات المسددة:</span>
            <p className="text-lg font-black font-mono text-emerald-600 mt-0.5">
              {formatCustomerMoney(totalPayments)} <span className="text-xs font-cairo">{currencySymbol}</span>
            </p>
          </div>

          <div
            className={`p-3.5 rounded-2xl border text-center ${
              customer.balance > 0
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            <span className="text-xs font-bold text-on-surface-variant">الرصيد المتبقي المستحق:</span>
            <p
              className={`text-lg font-black font-mono mt-0.5 ${
                customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'
              }`}
            >
              {formatCustomerMoney(customer.balance)} <span className="text-xs font-cairo">{currencySymbol}</span>
            </p>
          </div>
        </div>

        {/* Debt Aging Analysis Strip */}
        {agingSummary && agingSummary.totalOverdue > 0 && (
          <div className="mb-3 p-3 rounded-2xl bg-surface-container/70 border border-outline-variant/20 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-on-surface flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                تحليل تعمير الديون (حسب أعمار الفواتير المستحقة):
              </span>
              <span className="text-[11px] font-bold text-on-surface-variant font-mono">
                {agingSummary.unpaidInvoicesCount} فواتير معلقة • أقدم فاتورة منذ {agingSummary.oldestInvoiceDays} يوم
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {agingSummary.buckets.map((bucket, idx) => {
                const colorClasses =
                  bucket.severity === 'normal'
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                    : bucket.severity === 'due'
                    ? 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400'
                    : bucket.severity === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                    : 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400';

                return (
                  <div key={idx} className={`p-2 rounded-xl border ${colorClasses} text-center`}>
                    <div className="text-[10px] font-bold">{bucket.label}</div>
                    <div className="text-sm font-black font-mono mt-0.5">
                      {formatCustomerMoney(bucket.amount)} <span className="text-[10px] font-cairo">{currencySymbol}</span>
                    </div>
                    <div className="text-[10px] opacity-75 font-mono">
                      {bucket.invoicesCount} فاتورة
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter controls inside statement */}
        <div className="bg-surface-container p-3 rounded-2xl border border-outline-variant/20 mb-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-on-surface-variant">نوع الحركات:</span>
            <div className="flex items-center bg-surface-container-high rounded-xl p-0.5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'all' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setFilterType('sales')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'sales' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface'
                }`}
              >
                مبيعات فقط
              </button>
              <button
                onClick={() => setFilterType('payments')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterType === 'payments' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface'
                }`}
              >
                دفعات فقط
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-on-surface-variant">من:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 rounded-lg bg-surface border border-outline-variant/25 text-xs font-mono"
            />
            <span className="font-bold text-on-surface-variant">إلى:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 rounded-lg bg-surface border border-outline-variant/25 text-xs font-mono"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-red-500 font-bold hover:underline cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>
        </div>

        {/* Transactions Ledger Table */}
        <div className="overflow-y-auto flex-1 custom-scrollbar border border-outline-variant/20 rounded-2xl">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-surface-container sticky top-0 z-10 border-b border-outline-variant/25 text-on-surface-variant font-bold">
              <tr>
                <th className="py-2.5 px-3">التاريخ</th>
                <th className="py-2.5 px-3">النوع</th>
                <th className="py-2.5 px-3">البيان</th>
                <th className="py-2.5 px-3 text-center">المدين (+)</th>
                <th className="py-2.5 px-3 text-center">الدائن (-)</th>
                <th className="py-2.5 px-3 text-center">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                    <FileText className="w-8 h-8 opacity-25 mx-auto mb-2 text-primary" />
                    <p className="font-bold">لا توجد حركات مسجلة لهذا الزبون في هذا النطاق</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                    <td className="py-2 px-3 font-mono text-on-surface-variant">
                      {new Date(entry.date).toLocaleDateString('ar-DZ')}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          entry.type === 'sale'
                            ? 'bg-blue-500/10 text-blue-600'
                            : entry.type === 'payment'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {entry.type === 'sale'
                          ? 'فاتورة بيع'
                          : entry.type === 'payment'
                          ? 'دفعة تسديد'
                          : entry.type === 'opening_balance'
                          ? 'دين افتتاحي'
                          : 'رصيد منقول'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-on-surface">{entry.description}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-red-600">
                      {entry.debit > 0 ? formatCustomerMoney(entry.debit) : '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600">
                      {entry.credit > 0 ? formatCustomerMoney(entry.credit) : '—'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-black text-on-surface">
                      {formatCustomerMoney(entry.runningBalance)} {currencySymbol}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
          >
            إغلاق
          </button>

          {customer.balance > 0 && (
            <button
              onClick={() => onOpenPayment(customer)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4" />
              <span>تسجيل دفعة لهذا الزبون</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
