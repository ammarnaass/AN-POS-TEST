import { formatDateTime } from '@/utils';
import { type CashSessionEntity } from '@/infrastructure/database/dexie/db';
import { calculateDepositsTotal } from '../sessionBalance';
import { formatMoney } from '../hooks/useCashSessionManager';
import { Receipt, X, Printer } from 'lucide-react';

interface SessionZReportModalProps {
  session: CashSessionEntity | null;
  onClose: () => void;
  currencySymbol: string;
  shopName?: string;
  onPrint: (session: CashSessionEntity) => void;
}

export function SessionZReportModal({
  session,
  onClose,
  currencySymbol,
  shopName,
  onPrint,
}: SessionZReportModalProps) {
  if (!session) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-outline-variant/20 space-y-5 animate-in fade-in-50">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-cairo text-base font-bold text-on-surface">تقرير جلسة الصندوق Z-Report #{session.sessionNumber}</h3>
              <p className="text-[11px] text-on-surface-variant font-tajawal">تفاصيل المناوبة وإحصائيات المبيعات والجرد</p>
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

        {/* بطاقة التقرير القابل للطباعة */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-3 text-xs font-mono">
          <div className="text-center pb-2 border-b border-dashed border-outline-variant/30 space-y-0.5">
            <h4 className="font-cairo font-bold text-sm text-on-surface">{shopName || 'AN POS'}</h4>
            <p className="text-[10px] text-on-surface-variant font-tajawal">تقرير إغلاق الصندوق اليومي (Z-Report)</p>
            <p className="text-[10px] text-on-surface-variant">المسؤول: {session.openedBy}</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="font-cairo text-on-surface-variant">وقت الفتح:</span>
              <span>{formatDateTime(session.openedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-cairo text-on-surface-variant">وقت الإغلاق:</span>
              <span>{session.closedAt ? formatDateTime(session.closedAt) : 'مستمرة'}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-outline-variant/30 pt-2 space-y-1.5">
            <div className="flex justify-between">
              <span className="font-cairo text-on-surface-variant">الرصيد الافتتاحي:</span>
              <span className="font-bold">{formatMoney(session.openingBalance)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-emerald-600">
              <span className="font-cairo">إجمالي المبيعات (+):</span>
              <span className="font-bold">+{formatMoney(session.totalSales)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-rose-600">
              <span className="font-cairo">إجمالي المرتجعات (-):</span>
              <span className="font-bold">-{formatMoney(session.totalReturns)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span className="font-cairo">صافي الإيداعات والسحوبات:</span>
              <span className="font-bold">
                {calculateDepositsTotal(session.deposits) >= 0 ? '+' : ''}
                {formatMoney(calculateDepositsTotal(session.deposits))} {currencySymbol}
              </span>
            </div>
          </div>

          <div className="border-t-2 border-outline-variant/30 pt-2 space-y-1.5 font-bold">
            <div className="flex justify-between text-on-surface">
              <span className="font-cairo">الرصيد المحسوب (المتوقع):</span>
              <span>{formatMoney(session.expectedBalance ?? 0)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span className="font-cairo">الرصيد الفعلي بعد الجرد:</span>
              <span>{formatMoney(session.actualBalance ?? session.closingBalance ?? 0)} {currencySymbol}</span>
            </div>
            <div className="flex justify-between text-on-surface">
              <span className="font-cairo">الفارق النهائي:</span>
              <span className={((session.difference ?? 0) >= 0) ? 'text-emerald-600' : 'text-rose-600'}>
                {(session.difference ?? 0) >= 0 ? '+' : ''}
                {formatMoney(session.difference ?? 0)} {currencySymbol}
              </span>
            </div>
          </div>

          {session.note && (
            <div className="border-t border-dashed border-outline-variant/30 pt-2 text-[11px] text-on-surface-variant font-tajawal">
              <strong>ملاحظة الإغلاق:</strong> {session.note}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onPrint(session)}
            className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>
    </div>
  );
}
