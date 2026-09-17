import { type CashSessionEntity } from '@/infrastructure/database/dexie/db';
import { formatMoney } from '../hooks/useCashSessionManager';
import { Receipt, X } from 'lucide-react';

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: CashSessionEntity | null;
  currencySymbol: string;
  currentDepositsTotal: number;
  expectedAmount: number;
  totalDenominationsCount: number;
  actualAmount: number;
  setActualAmount: (val: number) => void;
  difference: number;
  closingNote: string;
  setClosingNote: (val: string) => void;
  handleConfirmCloseSession: () => void;
  closeSessionPending: boolean;
}

export function CloseShiftModal({
  isOpen,
  onClose,
  currentSession,
  currencySymbol,
  currentDepositsTotal,
  expectedAmount,
  totalDenominationsCount,
  actualAmount,
  setActualAmount,
  difference,
  closingNote,
  setClosingNote,
  handleConfirmCloseSession,
  closeSessionPending,
}: CloseShiftModalProps) {
  if (!isOpen || !currentSession) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-outline-variant/20 space-y-5 animate-in fade-in-50">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cairo text-base font-bold text-on-surface">إغلاق وجرد مناوبة الصندوق #{currentSession.sessionNumber}</h3>
              <p className="text-[11px] text-on-surface-variant font-tajawal">مطابقة النقدية الفعلية مع السجلات المحاسبية للنظام</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* تفاصيل المطابقة المالية */}
        <div className="space-y-2.5 bg-surface-container-low rounded-2xl p-4 text-xs font-mono">
          <div className="flex justify-between text-on-surface-variant">
            <span className="font-cairo">الرصيد الافتتاحي</span>
            <span className="font-bold text-on-surface">{formatMoney(currentSession.openingBalance)} {currencySymbol}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span className="font-cairo">إجمالي المبيعات النقدية (+)</span>
            <span className="font-bold text-emerald-600">+{formatMoney(currentSession.totalSales)} {currencySymbol}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span className="font-cairo">المرتجعات (-)</span>
            <span className="font-bold text-rose-600">-{formatMoney(currentSession.totalReturns)} {currencySymbol}</span>
          </div>
          <div className="flex justify-between text-on-surface-variant">
            <span className="font-cairo">الإيداعات والسحوبات (±)</span>
            <span className="font-bold text-amber-600">
              {currentDepositsTotal >= 0 ? `+${formatMoney(currentDepositsTotal)}` : formatMoney(currentDepositsTotal)} {currencySymbol}
            </span>
          </div>

          <div className="border-t border-outline-variant/15 pt-2.5 flex justify-between items-baseline">
            <span className="font-bold text-on-surface font-cairo">الرصيد المتوقع بالدرج:</span>
            <span className="text-base font-black text-primary">{formatMoney(expectedAmount)} {currencySymbol}</span>
          </div>
        </div>

        {/* حقل إدخال النقدية الفعلية بالجرد */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-on-surface font-cairo block">
              المبلغ الفعلي الموجود بالدرج (الذي تم عده):
            </label>
            {totalDenominationsCount > 0 && (
              <button
                type="button"
                onClick={() => setActualAmount(totalDenominationsCount)}
                className="text-[11px] text-primary font-bold hover:underline cursor-pointer"
              >
                استخدام مجموع حاسبة الفئات ({formatMoney(totalDenominationsCount)} {currencySymbol})
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="number"
              value={actualAmount || ''}
              onChange={(e) => setActualAmount(Number(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full h-12 pr-4 pl-12 bg-surface-container border border-outline-variant/20 rounded-xl text-lg font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
              autoFocus
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant font-mono">
              {currencySymbol}
            </span>
          </div>

          {/* مؤشر الفارق المباشر */}
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
            difference === 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : difference > 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
          }`}>
            <span>{difference === 0 ? 'مطابقة تامة (لا يوجد عجز)' : difference > 0 ? 'فائض نقدي بالصندوق:' : 'عجز نقدي بالصندوق:'}</span>
            <span className="text-sm font-mono font-black">
              {difference >= 0 ? `+${formatMoney(difference)}` : formatMoney(difference)} {currencySymbol}
            </span>
          </div>
        </div>

        {/* ملاحظة الإغلاق */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-on-surface font-cairo block">ملاحظات الإغلاق والتسليم (اختياري):</label>
          <input
            type="text"
            placeholder="أي ملاحظات حول الجرد أو التسليم للكاشير التالي..."
            value={closingNote}
            onChange={(e) => setClosingNote(e.target.value)}
            className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface text-right focus:outline-none focus:ring-1 focus:ring-primary/30 font-tajawal"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirmCloseSession}
            disabled={closeSessionPending}
            className="flex-2 py-3 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
          >
            {closeSessionPending ? 'جاري الإغلاق...' : 'تأكيد الإغلاق والترحيل'}
          </button>
        </div>
      </div>
    </div>
  );
}
