import React, { useState } from 'react';
import {
  X,
  Search,
  FileText,
  Wallet,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  PlusCircle,
  Calendar,
  Printer,
  BookOpen,
  ListFilter,
} from 'lucide-react';
import type { Customer, Sale } from '@/types';
import type { POSCustomerInvoicesModalProps } from '../types';
import { formatMoney } from '@/features/pos/utils/format';
import { useCustomerInvoices } from '../hooks/useCustomerInvoices';
import { useCustomerStatement } from '../hooks/useCustomerStatement';
import { useInvoiceStatusToggle } from '../hooks/useInvoiceStatusToggle';
import { CustomerInvoicesTable } from '../components/CustomerInvoicesTable';
import { CustomerStatementTable } from '../components/CustomerStatementTable';
import { POSInvoiceDetailsModal } from './POSInvoiceDetailsModal';
import { printPOSCustomerStatementSlip } from '../services/posDebtReceiptService';

export const POSCustomerInvoicesModal: React.FC<POSCustomerInvoicesModalProps> = ({
  isOpen,
  onClose,
  customer,
  customers,
  onSelectCustomer,
  sales: initialSales,
  onSelectInvoice: externalSelectInvoice,
  onRecallToCart,
  onFullReturn,
  onTogglePaymentStatus: externalTogglePaymentStatus,
  onOpenSettlementModal,
  onOpenAddDebtModal,
  onSettleInvoiceDebt: externalSettleInvoiceDebt,
  currencySymbol = 'دج',
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'statement'>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);

  // الزبون النشط الحالي (يدعم الزبون الممرر أو اختياره من القائمة)
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(customer || null);

  React.useEffect(() => {
    setCurrentCustomer(customer || null);
  }, [customer]);

  // استعلام وتصفية فواتير ومشتريات الزبون
  const {
    invoices,
    metrics,
    isLoading: isInvoicesLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
  } = useCustomerInvoices({
    customerId: currentCustomer?.id,
    isOpen,
    initialSales,
  });

  // استعلام كشف الحساب المحاسبي للزبون
  const {
    statement,
    entries: statementEntries,
    isLoading: isStatementLoading,
    filterType: statementFilterType,
    setFilterType: setStatementFilterType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = useCustomerStatement({
    customerId: currentCustomer?.id,
    isOpen: isOpen && activeTab === 'statement',
  });

  // خطاف تبديل حالة الفاتورة
  const { togglePaymentStatus, isToggling } = useInvoiceStatusToggle();

  if (!isOpen) return null;

  const handleSelectInvoice = (sale: Sale) => {
    if (externalSelectInvoice) {
      externalSelectInvoice(sale);
    }
    setSelectedInvoice(sale);
  };

  const handleToggle = async (params: any) => {
    if (externalTogglePaymentStatus) {
      return externalTogglePaymentStatus(params);
    }
    const res = await togglePaymentStatus(params);
    if (selectedInvoice && selectedInvoice.id === params.saleId) {
      setSelectedInvoice((prev) => (prev ? { ...prev, status: params.targetStatus } : null));
    }
    return res;
  };

  const handleSettleInvoice = (sale: Sale, remainingDebt: number) => {
    if (externalSettleInvoiceDebt) {
      externalSettleInvoiceDebt(sale, remainingDebt);
    } else if (currentCustomer && onOpenSettlementModal) {
      onClose();
      onOpenSettlementModal(currentCustomer);
    }
  };

  const handlePrintStatement = () => {
    if (!currentCustomer) return;
    printPOSCustomerStatementSlip(
      statement,
      currentCustomer.name,
      currentCustomer.phone,
      'نقطة البيع',
      currencySymbol
    );
  };

  const balance = Number(currentCustomer?.balance || 0);
  const creditLimit = Number(currentCustomer?.creditLimit || 0);
  const hasDebt = balance > 0;
  const hasAdvance = balance < 0;
  const isLimitExceeded = creditLimit > 0 && balance > creditLimit;
  const remainingAllowance = creditLimit > 0 ? Math.max(0, creditLimit - balance) : null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
                {activeTab === 'invoices' ? <FileText className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-on-surface">
                    {currentCustomer ? `دفتر حسابات وفواتير: ${currentCustomer.name}` : 'سجل الفواتير والديون في نقطة البيع'}
                  </h3>
                  {currentCustomer?.phone && (
                    <span className="text-xs text-on-surface-variant font-mono">({currentCustomer.phone})</span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  متابعة المشتريات، كشوف الحساب المحاسبية، وسداد وإضافة الديون
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Customer Switcher Selector */}
              {customers && customers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-on-surface-variant font-bold hidden sm:inline">الزبون:</span>
                  <select
                    value={currentCustomer?.id || ''}
                    onChange={(e) => {
                      const found = customers.find((c) => c.id === e.target.value) || null;
                      setCurrentCustomer(found);
                      if (found && onSelectCustomer) onSelectCustomer(found);
                    }}
                    className="bg-surface border border-outline-variant/30 text-on-surface text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-hidden focus:border-primary/50 cursor-pointer shadow-xs max-w-[160px] sm:max-w-[200px]"
                  >
                    <option value="">-- كافة المبيعات --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.balance ? `(دين: ${formatMoney(c.balance)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Customer Debt Banner & Quick Actions */}
          {currentCustomer && (
            <div className="px-6 py-3 bg-surface-container-high/40 border-b border-outline-variant/15 flex items-center justify-between flex-wrap gap-2 shrink-0">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-on-surface-variant">الرصيد الحالي:</span>
                  <span
                    className={`font-mono text-sm font-black ${
                      hasDebt ? 'text-rose-600' : hasAdvance ? 'text-teal-600' : 'text-emerald-600'
                    }`}
                  >
                    {hasDebt
                      ? `دين: ${formatMoney(balance)} ${currencySymbol}`
                      : hasAdvance
                      ? `دائن: +${formatMoney(Math.abs(balance))} ${currencySymbol}`
                      : `متوازن (0 ${currencySymbol})`}
                  </span>
                </div>

                {creditLimit > 0 && (
                  <div className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                    <span>• سقف الائتمان:</span>
                    <span className={`font-bold ${isLimitExceeded ? 'text-red-600 font-black' : 'text-on-surface'}`}>
                      {formatMoney(creditLimit)} {currencySymbol}
                    </span>
                    {remainingAllowance !== null && !isLimitExceeded && (
                      <span className="text-emerald-600 font-medium">
                        (متبقي: {formatMoney(remainingAllowance)} {currencySymbol})
                      </span>
                    )}
                    {isLimitExceeded && (
                      <span className="text-red-600 font-black">
                        (تجاوز السقف بمبلغ {formatMoney(balance - creditLimit)} {currencySymbol}!)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2">
                {onOpenAddDebtModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddDebtModal(currentCustomer);
                    }}
                    className="py-1 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ إضافة دين</span>
                  </button>
                )}

                {hasDebt && onOpenSettlementModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettlementModal(currentCustomer);
                    }}
                    className="py-1 px-3 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>تسديد دين الزبون</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Navigation Tabs: Invoices vs Statement */}
          <div className="px-6 pt-3 pb-0 bg-surface-container border-b border-outline-variant/15 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`pb-2.5 px-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'invoices'
                  ? 'border-primary text-primary font-black'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>فواتير المشتريات والديون ({metrics.totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('statement')}
              className={`pb-2.5 px-2 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'statement'
                  ? 'border-primary text-primary font-black'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>كشف الحساب المحاسبي (دفتر الأستاذ)</span>
            </button>
          </div>

          {/* Tab 1: Invoices View Filters */}
          {activeTab === 'invoices' && (
            <div className="p-4 border-b border-outline-variant/15 bg-surface-container space-y-3 shrink-0">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث برقم الفاتورة، اسم الصنف، التاريخ، أو البائع..."
                  className="w-full h-10 pr-9 pl-3 rounded-xl bg-surface-container-low border border-outline-variant/20 focus:border-primary/50 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden transition-all shadow-inner"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60 pointer-events-none" />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant border border-outline-variant/20'
                  }`}
                >
                  الكل ({metrics.totalCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('unpaid')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === 'unpaid'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-rose-600 border border-rose-500/20'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>غير مسددة / ديون ({metrics.unpaidCount})</span>
                  {metrics.totalUnpaidDebt > 0 && (
                    <span className="opacity-90 font-mono">({formatMoney(metrics.totalUnpaidDebt)} {currencySymbol})</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-emerald-600 border border-emerald-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>مدفوعة ({metrics.paidCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('return')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    statusFilter === 'return'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-surface-container-low hover:bg-surface-container text-purple-600 border border-purple-500/20'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>مرتجعات ({metrics.returnsCount})</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Statement View Filters */}
          {activeTab === 'statement' && (
            <div className="p-4 border-b border-outline-variant/15 bg-surface-container space-y-3 shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                {/* Type Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setStatementFilterType('all')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      statementFilterType === 'all'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-low border border-outline-variant/20 text-on-surface-variant'
                    }`}
                  >
                    كافة الحركات
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementFilterType('sales')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      statementFilterType === 'sales'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-surface-container-low border border-outline-variant/20 text-on-surface-variant'
                    }`}
                  >
                    فواتير المشتريات
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementFilterType('payments')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      statementFilterType === 'payments'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-surface-container-low border border-outline-variant/20 text-on-surface-variant'
                    }`}
                  >
                    سندات التسديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementFilterType('debts')}
                    className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                      statementFilterType === 'debts'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-surface-container-low border border-outline-variant/20 text-on-surface-variant'
                    }`}
                  >
                    الديون المقيدة فقط
                  </button>
                </div>

                {/* Print Statement Button */}
                <button
                  type="button"
                  onClick={handlePrintStatement}
                  className="py-1.5 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/25 text-on-surface font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-primary" />
                  <span>طباعة كشف الحساب حراري</span>
                </button>
              </div>

              {/* Date Filters & Running Balance Summary */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-outline-variant/10 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/20">
                    <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                    <span className="text-[11px] text-on-surface-variant">من:</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-transparent border-none text-[11px] text-on-surface focus:outline-hidden font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/20">
                    <Calendar className="w-3.5 h-3.5 text-on-surface-variant" />
                    <span className="text-[11px] text-on-surface-variant">إلى:</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-transparent border-none text-[11px] text-on-surface focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                {/* Statement Totals Badge */}
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-on-surface-variant text-[11px]">
                    مدين: <strong className="text-rose-600">+{formatMoney(statement.totalDebit)}</strong>
                  </span>
                  <span className="text-on-surface-variant text-[11px]">
                    مسدد: <strong className="text-emerald-600">-{formatMoney(statement.totalCredit)}</strong>
                  </span>
                  <span className="text-on-surface font-bold text-[11px]">
                    الرصيد: <strong className={statement.finalBalance > 0 ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}>
                      {formatMoney(statement.finalBalance)} {currencySymbol}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Invoices or Statement Body */}
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'invoices' ? (
              isInvoicesLoading ? (
                <div className="py-12 text-center text-xs text-on-surface-variant">
                  جارٍ تحميل فواتير الزبون...
                </div>
              ) : (
                <CustomerInvoicesTable
                  invoices={invoices}
                  onSelectInvoice={handleSelectInvoice}
                  onRecallToCart={onRecallToCart}
                  onFullReturn={onFullReturn}
                  onTogglePaymentStatus={handleToggle}
                  isToggling={isToggling}
                  currencySymbol={currencySymbol}
                />
              )
            ) : (
              <CustomerStatementTable
                entries={statementEntries}
                isLoading={isStatementLoading}
                currencySymbol={currencySymbol}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-surface-container border-t border-outline-variant/15 flex items-center justify-between text-xs text-on-surface-variant shrink-0">
            <span>
              {activeTab === 'invoices'
                ? `عرض ${invoices.length} من أصل ${metrics.totalCount} فاتورة`
                : `إجمالي الحركات المسجلة في الكشف: ${statementEntries.length} حركة`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-4 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface hover:bg-surface-container-high transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <POSInvoiceDetailsModal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          sale={selectedInvoice}
          customer={customer}
          onTogglePaymentStatus={handleToggle}
          onRecallToCart={onRecallToCart}
          onFullReturn={onFullReturn}
          onSettleInvoiceDebt={handleSettleInvoice}
          currencySymbol={currencySymbol}
        />
      )}
    </>
  );
};
