import React from 'react';
import { FileText, ArrowUpRight, ArrowDownLeft, RotateCcw, AlertCircle, Bookmark } from 'lucide-react';
import type { CustomerStatementEntry } from '../types';
import { formatMoney } from '@/features/pos/utils/format';

export interface CustomerStatementTableProps {
  entries: CustomerStatementEntry[];
  isLoading?: boolean;
  currencySymbol?: string;
}

export const CustomerStatementTable: React.FC<CustomerStatementTableProps> = ({
  entries,
  isLoading = false,
  currencySymbol = 'دج',
}) => {
  if (isLoading) {
    return (
      <div className="py-16 text-center text-xs text-on-surface-variant animate-pulse">
        جارٍ تحميل كشف الحساب وسجلات الديون...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-surface-container-high mx-auto flex items-center justify-center text-on-surface-variant/40">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-on-surface">لا توجد حركات مسجلة لهذا الزبون</p>
        <p className="text-[11px] text-on-surface-variant">لم يتم العثور على أي فواتير أو سدادات أو قيود دين في الفترة المحددة.</p>
      </div>
    );
  }

  const getTypeBadge = (type: CustomerStatementEntry['type']) => {
    switch (type) {
      case 'sale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-bold">
            <FileText className="w-3 h-3" />
            <span>فاتورة مشتريات</span>
          </span>
        );
      case 'payment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
            <ArrowDownLeft className="w-3 h-3" />
            <span>تسديد دفعة</span>
          </span>
        );
      case 'debt_addition':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 text-[10px] font-bold">
            <AlertCircle className="w-3 h-3" />
            <span>قيد دين إضافي</span>
          </span>
        );
      case 'return':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 text-[10px] font-bold">
            <RotateCcw className="w-3 h-3" />
            <span>إرجاع بضاعة</span>
          </span>
        );
      case 'opening_balance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold">
            <Bookmark className="w-3 h-3" />
            <span>رصيد افتتاحي</span>
          </span>
        );
      case 'previous_balance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-bold">
            <Bookmark className="w-3 h-3" />
            <span>رصيد منقول</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container-low shadow-2xs">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-right text-xs border-collapse">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant/15 text-on-surface-variant font-bold text-[11px]">
              <th className="py-2.5 px-3 whitespace-nowrap">التاريخ</th>
              <th className="py-2.5 px-3 whitespace-nowrap">نوع الحركة</th>
              <th className="py-2.5 px-3 whitespace-nowrap">المرجع</th>
              <th className="py-2.5 px-3">البيان والملاحظات</th>
              <th className="py-2.5 px-3 text-left whitespace-nowrap text-rose-600">مدين (+ دين)</th>
              <th className="py-2.5 px-3 text-left whitespace-nowrap text-emerald-600">دائن (- مسدد)</th>
              <th className="py-2.5 px-3 text-left whitespace-nowrap">الرصيد بعد الحركة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {entries.map((entry, idx) => {
              const isDebitPositive = entry.debit > 0;
              const isCreditPositive = entry.credit > 0;
              const isBalancePositive = entry.runningBalance > 0;
              const isBalanceNegative = entry.runningBalance < 0;

              return (
                <tr
                  key={entry.id || idx}
                  className="hover:bg-surface-container/40 transition-colors"
                >
                  {/* Date */}
                  <td className="py-2.5 px-3 text-[11px] font-mono text-on-surface-variant whitespace-nowrap">
                    {entry.date ? new Date(entry.date).toLocaleDateString('ar-DZ') : '—'}
                    {entry.date && (
                      <span className="text-[10px] text-on-surface-variant/70 block">
                        {new Date(entry.date).toLocaleTimeString('ar-DZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </td>

                  {/* Type */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getTypeBadge(entry.type)}
                  </td>

                  {/* Reference # */}
                  <td className="py-2.5 px-3 text-[11px] font-mono font-bold text-on-surface whitespace-nowrap">
                    {entry.number}
                  </td>

                  {/* Description */}
                  <td className="py-2.5 px-3 text-on-surface font-medium text-[11px] max-w-[220px] truncate">
                    {entry.description}
                  </td>

                  {/* Debit */}
                  <td className="py-2.5 px-3 text-left font-mono font-bold whitespace-nowrap">
                    {isDebitPositive ? (
                      <span className="text-rose-600">
                        +{formatMoney(entry.debit)} {currencySymbol}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">—</span>
                    )}
                  </td>

                  {/* Credit */}
                  <td className="py-2.5 px-3 text-left font-mono font-bold whitespace-nowrap">
                    {isCreditPositive ? (
                      <span className="text-emerald-600">
                        -{formatMoney(entry.credit)} {currencySymbol}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">—</span>
                    )}
                  </td>

                  {/* Running Balance */}
                  <td className="py-2.5 px-3 text-left font-mono font-black text-xs whitespace-nowrap">
                    <span
                      className={
                        isBalancePositive
                          ? 'text-rose-600'
                          : isBalanceNegative
                          ? 'text-emerald-600'
                          : 'text-on-surface-variant'
                      }
                    >
                      {formatMoney(Math.abs(entry.runningBalance))} {currencySymbol}
                      {isBalanceNegative && ' (دائن)'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
