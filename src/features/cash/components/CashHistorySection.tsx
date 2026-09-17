import { formatDateTime } from '@/utils';
import { type CashSessionEntity } from '@/infrastructure/database/dexie/db';
import { formatMoney } from '../hooks/useCashSessionManager';
import { History, Search, FileText } from 'lucide-react';

interface CashHistorySectionProps {
  filteredSessions: CashSessionEntity[];
  historySearch: string;
  setHistorySearch: (search: string) => void;
  historyStatusFilter: 'all' | 'open' | 'closed';
  setHistoryStatusFilter: (filter: 'all' | 'open' | 'closed') => void;
  currencySymbol: string;
  setSelectedHistorySession: (session: CashSessionEntity | null) => void;
}

export function CashHistorySection({
  filteredSessions,
  historySearch,
  setHistorySearch,
  historyStatusFilter,
  setHistoryStatusFilter,
  currencySymbol,
  setSelectedHistorySession,
}: CashHistorySectionProps) {
  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-cairo text-on-surface">سجل كافة مناوبات الصندوق وتقارير الإغلاق</h3>
            <p className="text-[11px] text-on-surface-variant">الاطلاع على تفاصيل الجلسات السابقة، مطابقة الفروقات، وطباعة تقارير Z</p>
          </div>
        </div>

        {/* أدوات البحث والفلترة */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            <input
              type="text"
              placeholder="بحث باسم الكاشير أو الرقم..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="h-8 pr-8 pl-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/40 font-tajawal w-44 sm:w-56"
            />
          </div>

          <div className="flex items-center gap-1 bg-surface-container p-0.5 rounded-xl border border-outline-variant/15">
            {(['all', 'open', 'closed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setHistoryStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  historyStatusFilter === st
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {st === 'all' ? 'الكل' : st === 'open' ? 'نشطة' : 'مغلقة'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* جدول الجلسات */}
      {filteredSessions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-outline-variant/15 text-on-surface-variant font-cairo">
                <th className="pb-3 pr-3 font-bold">رقم الجلسة</th>
                <th className="pb-3 font-bold">المسؤول (الكاشير)</th>
                <th className="pb-3 font-bold">تاريخ الفتح</th>
                <th className="pb-3 font-bold">تاريخ الإغلاق</th>
                <th className="pb-3 text-center font-bold font-mono">الافتتاحي</th>
                <th className="pb-3 text-center font-bold font-mono">المبيعات</th>
                <th className="pb-3 text-center font-bold font-mono">الرصيد الفعلي</th>
                <th className="pb-3 text-center font-bold">الفارق</th>
                <th className="pb-3 text-center font-bold">الحالة</th>
                <th className="pb-3 text-left pl-3 font-bold">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredSessions.slice().reverse().map((session) => {
                const diff = session.difference ?? 0;
                return (
                  <tr key={session.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="py-3.5 pr-3 font-bold text-on-surface font-mono">#{session.sessionNumber}</td>
                    <td className="py-3.5 font-bold text-on-surface">{session.openedBy}</td>
                    <td className="py-3.5 text-on-surface-variant font-mono text-[11px]">{formatDateTime(session.openedAt)}</td>
                    <td className="py-3.5 text-on-surface-variant font-mono text-[11px]">
                      {session.closedAt ? formatDateTime(session.closedAt) : '—'}
                    </td>
                    <td className="py-3.5 text-center font-mono font-bold text-on-surface">{formatMoney(session.openingBalance)} {currencySymbol}</td>
                    <td className="py-3.5 text-center font-mono font-bold text-emerald-600">+{formatMoney(session.totalSales)} {currencySymbol}</td>
                    <td className="py-3.5 text-center font-mono font-bold text-on-surface">
                      {session.actualBalance !== undefined ? `${formatMoney(session.actualBalance)} ${currencySymbol}` : '—'}
                    </td>
                    <td className="py-3.5 text-center font-mono font-bold">
                      {session.status === 'closed' ? (
                        diff === 0 ? (
                          <span className="text-emerald-600">مطابق (0.00)</span>
                        ) : diff > 0 ? (
                          <span className="text-emerald-600">+{formatMoney(diff)} (فائض)</span>
                        ) : (
                          <span className="text-rose-600">{formatMoney(diff)} (عجز)</span>
                        )
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="py-3.5 text-center">
                      {session.status === 'open' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          مفتوحة
                        </span>
                      ) : (
                        <span className="bg-surface-container-high text-on-surface-variant px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          مغلقة
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-left pl-3">
                      <button
                        type="button"
                        onClick={() => setSelectedHistorySession(session)}
                        className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/15 text-primary text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>تقرير Z</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-on-surface-variant">
          <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-xs font-bold font-cairo">لا توجد مناوبات سابقة مسجلة</p>
        </div>
      )}
    </div>
  );
}
