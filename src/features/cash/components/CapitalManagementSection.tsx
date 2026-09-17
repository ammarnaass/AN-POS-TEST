import { formatDateTime } from '@/utils';
import { type CapitalEntryEntity } from '@/infrastructure/database/dexie/db';
import { formatMoney } from '../hooks/useCashSessionManager';
import {
  Building2,
  Plus,
  Sparkles,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

interface CapitalManagementSectionProps {
  currencySymbol: string;
  showCapitalForm: boolean;
  setShowCapitalForm: (show: boolean) => void;
  totalCapitalDeposits: number;
  totalCapitalWithdrawals: number;
  totalCapital: number;
  capitalType: 'deposit' | 'withdrawal';
  setCapitalType: (type: 'deposit' | 'withdrawal') => void;
  capitalAmount: number;
  setCapitalAmount: (amount: number) => void;
  capitalNote: string;
  setCapitalNote: (note: string) => void;
  handleCapitalEntry: () => void;
  capitalEntryPending: boolean;
  capitalFilter: 'all' | 'deposit' | 'withdrawal';
  setCapitalFilter: (filter: 'all' | 'deposit' | 'withdrawal') => void;
  filteredCapitalEntries: CapitalEntryEntity[];
}

export function CapitalManagementSection({
  currencySymbol,
  showCapitalForm,
  setShowCapitalForm,
  totalCapitalDeposits,
  totalCapitalWithdrawals,
  totalCapital,
  capitalType,
  setCapitalType,
  capitalAmount,
  setCapitalAmount,
  capitalNote,
  setCapitalNote,
  handleCapitalEntry,
  capitalEntryPending,
  capitalFilter,
  setCapitalFilter,
  filteredCapitalEntries,
}: CapitalManagementSectionProps) {
  return (
    <div className="space-y-6">
      {/* ترويسة بطاقة رأس المال مع الإحصائيات */}
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center border border-cyan-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-cairo text-on-surface">إدارة رأس المال التشغيلي والمستثمر</h3>
              <p className="text-xs text-on-surface-variant font-tajawal">
                تسجيل وضبط الأموال المستثمرة كأصول نقدية للمشروع والسحوبات التراكمية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCapitalForm(!showCapitalForm)}
            className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showCapitalForm ? 'إلغاء الإدخال' : 'إضافة حركة رأس مال'}</span>
          </button>
        </div>

        {/* بطاقات الإحصاءات الثلاثية */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1">
            <span className="text-[11px] text-emerald-600 font-bold font-cairo">إجمالي رأس المال المودع (+)</span>
            <p className="text-lg font-black font-mono text-emerald-600">+{formatMoney(totalCapitalDeposits)} {currencySymbol}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1">
            <span className="text-[11px] text-rose-600 font-bold font-cairo">إجمالي السحوبات من رأس المال (-)</span>
            <p className="text-lg font-black font-mono text-rose-600">-{formatMoney(totalCapitalWithdrawals)} {currencySymbol}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1">
            <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-bold font-cairo">صافي رأس المال الحالي</span>
            <p className="text-lg font-black font-mono text-cyan-700 dark:text-cyan-300">{formatMoney(totalCapital)} {currencySymbol}</p>
          </div>
        </div>

        {/* نموذج إضافة حركة رأس مال جديدة (عند الضغط) */}
        {showCapitalForm && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-4 animate-in fade-in-50">
            <h4 className="text-xs font-bold font-cairo text-on-surface flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>تسجيل حركة مالية جديدة في رأس المال:</span>
            </h4>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCapitalType('deposit')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  capitalType === 'deposit'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                إيداع في رأس المال (+)
              </button>
              <button
                type="button"
                onClick={() => setCapitalType('withdrawal')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  capitalType === 'withdrawal'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                سحب من رأس المال (-)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface font-cairo block">المبلغ ({currencySymbol}):</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={capitalAmount || ''}
                  onChange={(e) => setCapitalAmount(Number(e.target.value) || 0)}
                  className="w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface text-right focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-on-surface font-cairo block">الملاحظة والبيان:</label>
                <input
                  type="text"
                  placeholder="مثال: ضخ استثماري أولي، تمويل تجديدات المحل..."
                  value={capitalNote}
                  onChange={(e) => setCapitalNote(e.target.value)}
                  className="w-full h-11 px-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-xs text-on-surface text-right focus:outline-none focus:ring-1 focus:ring-primary/40 font-tajawal"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCapitalForm(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCapitalEntry}
                disabled={capitalAmount <= 0 || capitalEntryPending}
                className="px-6 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                {capitalEntryPending ? 'جاري الحفظ...' : 'حفظ الحركة المالية'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* جدول سجل حركات رأس المال */}
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <h4 className="text-xs font-bold font-cairo text-on-surface flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span>سجل حركات رأس المال والسيولة ({filteredCapitalEntries.length})</span>
          </h4>

          <div className="flex items-center gap-1.5">
            {(['all', 'deposit', 'withdrawal'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setCapitalFilter(f)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  capitalFilter === f
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {f === 'all' ? 'الكل' : f === 'deposit' ? 'إيداعات' : 'سحوبات'}
              </button>
            ))}
          </div>
        </div>

        {filteredCapitalEntries.length > 0 ? (
          <div className="divide-y divide-outline-variant/10">
            {filteredCapitalEntries.slice().reverse().map((entry) => (
              <div
                key={entry.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-surface-container/50 rounded-xl transition-colors gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    entry.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {entry.type === 'deposit' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface font-cairo">
                      {entry.type === 'deposit' ? 'إيداع رأس مال' : 'سحب من رأس المال'}
                    </p>
                    <p className="text-[11px] text-on-surface-variant font-tajawal">{entry.note || 'بدون بيان'}</p>
                    <span className="text-[10px] text-on-surface-variant font-mono">{formatDateTime(entry.date || entry.createdAt)}</span>
                  </div>
                </div>

                <span className={`text-sm font-black font-mono ${
                  entry.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {entry.type === 'deposit' ? '+' : '-'}{formatMoney(entry.amount)} {currencySymbol}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-on-surface-variant">
            <Building2 className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-xs font-bold font-cairo">لا توجد حركات رأس مال مسجلة حتى الآن</p>
            <p className="text-[11px] opacity-70 mt-0.5 font-tajawal">اضغط على زر «إضافة حركة رأس مال» بالأعلى لتوثيق أول عملية</p>
          </div>
        )}
      </div>
    </div>
  );
}
