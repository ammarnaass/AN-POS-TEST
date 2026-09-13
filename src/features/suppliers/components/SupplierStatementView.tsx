import React from 'react';
import { Truck, Printer, FileText } from 'lucide-react';
import type { Supplier } from '@/types';
import type { SupplierStatementEntry } from '../types';
import { formatSupplierMoney } from '../services/supplierStatus';

interface SupplierStatementViewProps {
  suppliers: Supplier[];
  selectedSupplierId: string | null;
  onSelectSupplier: (id: string | null) => void;
  statementEntries: SupplierStatementEntry[];
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  onPrintStatement: () => void;
  currencySymbol?: string;
}

export const SupplierStatementView: React.FC<SupplierStatementViewProps> = ({
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
  statementEntries,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onPrintStatement,
  currencySymbol = 'دج',
}) => {
  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || null;

  return (
    <div className="space-y-4">
      {/* Supplier Selector */}
      <div className="bg-surface-container-low/95 p-5 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:max-w-md">
          <label className="block text-xs font-bold text-on-surface mb-1.5">اختر المورد لعرض كشف الحساب:</label>
          <select
            value={selectedSupplierId || ''}
            onChange={(e) => onSelectSupplier(e.target.value || null)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
          >
            <option value="">— اختر مورداً من القائمة —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.balance > 0 ? `(مستحقات: ${formatSupplierMoney(s.balance)} ${currencySymbol})` : '(خالص)'}
              </option>
            ))}
          </select>
        </div>

        {selectedSupplier && (
          <div className="flex items-center gap-2">
            <button
              onClick={onPrintStatement}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب (A4)</span>
            </button>
          </div>
        )}
      </div>

      {selectedSupplier ? (
        <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 shadow-2xs p-5 space-y-5">
          {/* Supplier Header Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm shadow-2xs">
                {selectedSupplier.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-black text-on-surface font-cairo">{selectedSupplier.name}</h3>
                <p className="text-xs text-on-surface-variant font-mono" dir="ltr">
                  {selectedSupplier.phone || 'بدون هاتف'}
                </p>
              </div>
            </div>

            <div className="text-left">
              <span className="text-xs font-bold text-on-surface-variant">الرصيد المستحق الحالي للمورد:</span>
              <p
                className={`text-2xl font-black font-mono mt-0.5 ${
                  selectedSupplier.balance > 0 ? 'text-amber-700' : 'text-emerald-600'
                }`}
              >
                {formatSupplierMoney(selectedSupplier.balance)} <span className="text-xs font-cairo">{currencySymbol}</span>
              </p>
            </div>
          </div>

          {/* Date Filters inside Statement */}
          <div className="bg-surface-container p-3 rounded-2xl border border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-on-surface-variant">من:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant/25 font-mono"
              />
              <span className="font-bold text-on-surface-variant">إلى:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant/25 font-mono"
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

            <div className="text-on-surface-variant font-bold">
              عدد الحركات: <strong className="font-mono text-on-surface">{statementEntries.length}</strong>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto custom-scrollbar border border-outline-variant/20 rounded-2xl">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">رقم المعاملة</th>
                  <th className="py-3 px-4">البيان والتفاصيل</th>
                  <th className="py-3 px-4 text-center">قيمة البضاعة (+)</th>
                  <th className="py-3 px-4 text-center">المدفوع له (-)</th>
                  <th className="py-3 px-4 text-center">الرصيد التراكمي المستحق</th>
                  <th className="py-3 px-4 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {statementEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                      <FileText className="w-8 h-8 opacity-25 mx-auto mb-2 text-primary" />
                      <p className="font-bold">لا توجد حركات مسجلة لهذا المورد</p>
                    </td>
                  </tr>
                ) : (
                  statementEntries.map((e, idx) => (
                    <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-on-surface-variant">
                        {new Date(e.date).toLocaleDateString('ar-DZ')}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-primary">{e.number}</td>
                      <td className="py-2.5 px-4 font-bold text-on-surface">{e.description}</td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-700">
                        {formatSupplierMoney(e.debit)} {currencySymbol}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-600">
                        {formatSupplierMoney(e.credit)} {currencySymbol}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-black text-sm text-on-surface">
                        {formatSupplierMoney(e.runningBalance)} {currencySymbol}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            e.status === 'paid' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/15 text-amber-800'
                          }`}
                        >
                          {e.status === 'paid' ? 'مدفوع' : 'معلق'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 p-12 text-center text-on-surface-variant">
          <Truck className="w-12 h-12 opacity-25 mx-auto mb-3 text-primary" />
          <h4 className="text-base font-bold text-on-surface">يرجى اختيار مورد</h4>
          <p className="text-xs mt-1">اختر مورداً من القائمة المنسدلة أعلاه لاستعراض كشف حسابه المحاسبي بالكامل</p>
        </div>
      )}
    </div>
  );
};
