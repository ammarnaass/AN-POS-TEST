import { formatDateTime } from '@/utils';
import { type CashSessionEntity } from '@/infrastructure/database/dexie/db';
import { formatMoney, DZD_DENOMINATIONS } from '../hooks/useCashSessionManager';
import {
  Wallet,
  Unlock,
  Coins,
  Layers,
  Calculator,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Lock,
} from 'lucide-react';

interface CurrentShiftSectionProps {
  currentSession: CashSessionEntity | null;
  currencySymbol: string;
  // Opening shift
  openingBalance: number;
  setOpeningBalance: (val: number) => void;
  handleOpenSession: () => void;
  openSessionPending: boolean;
  // Denominations
  showDenomCalculator: boolean;
  setShowDenomCalculator: (show: boolean) => void;
  denominations: Record<number, number>;
  setDenominations: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  totalDenominationsCount: number;
  handleApplyDenominationsToActual: () => void;
  // Balance calculations
  currentDepositsTotal: number;
  expectedAmount: number;
  // Quick deposit & withdrawal
  depositAmount: number;
  setDepositAmount: (val: number) => void;
  depositNote: string;
  setDepositNote: (val: string) => void;
  handleDeposit: () => void;
  depositPending: boolean;
  withdrawalAmount: number;
  setWithdrawalAmount: (val: number) => void;
  withdrawalNote: string;
  setWithdrawalNote: (val: string) => void;
  handleWithdrawal: () => void;
  withdrawalPending: boolean;
  // Shift close trigger
  handlePrepareCloseSession: () => void;
}

export function CurrentShiftSection({
  currentSession,
  currencySymbol,
  openingBalance,
  setOpeningBalance,
  handleOpenSession,
  openSessionPending,
  showDenomCalculator,
  setShowDenomCalculator,
  denominations,
  setDenominations,
  totalDenominationsCount,
  handleApplyDenominationsToActual,
  currentDepositsTotal,
  expectedAmount,
  depositAmount,
  setDepositAmount,
  depositNote,
  setDepositNote,
  handleDeposit,
  depositPending,
  withdrawalAmount,
  setWithdrawalAmount,
  withdrawalNote,
  setWithdrawalNote,
  handleWithdrawal,
  withdrawalPending,
  handlePrepareCloseSession,
}: CurrentShiftSectionProps) {
  if (!currentSession) {
    return (
      /* في حالة عدم وجود مناوبة مفتوحة */
      <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-10 shadow-sm text-center max-w-xl mx-auto space-y-5">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto border border-primary/20 shadow-inner">
          <Wallet className="w-10 h-10" />
        </div>

        <div>
          <h3 className="font-cairo text-xl font-bold text-on-surface">فتح مناوبة صندوق جديدة</h3>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed font-tajawal">
            لبدء تسجيل المبيعات النقدية، حركات الدرج، وحساب النقدية بدقة، يرجى إدخال الرصيد الافتتاحي وتأكيد فتح المناوبة.
          </p>
        </div>

        {/* حقل الرصيد الافتتاحي مع أزرار سريعة */}
        <div className="space-y-3 pt-2 text-right">
          <label className="block text-xs font-bold text-on-surface font-cairo">الرصيد الافتتاحي بالصندوق (الفكة الأولية):</label>
          <div className="relative">
            <input
              type="number"
              value={openingBalance || ''}
              onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full h-12 pr-11 pl-12 bg-surface-container border border-outline-variant/20 rounded-xl text-lg font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
              autoFocus
            />
            <Coins className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/60" />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant font-mono">
              {currencySymbol}
            </span>
          </div>

          {/* أزرار مبالغ افتراضية سريعة */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { label: 'بدون رصيد (0)', val: 0 },
              { label: '2,000 دج', val: 2000 },
              { label: '5,000 دج', val: 5000 },
              { label: '10,000 دج', val: 10000 },
              { label: '20,000 دج', val: 20000 },
              { label: '50,000 دج', val: 50000 },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => setOpeningBalance(btn.val)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  openingBalance === btn.val
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/20 text-on-surface-variant'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenSession}
          disabled={openSessionPending}
          className="w-full py-3.5 bg-primary text-on-primary rounded-xl text-sm font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Unlock className="w-4 h-4" />
          <span>{openSessionPending ? 'جاري الفتح...' : 'تأكيد فتح مناوبة الصندوق'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
      {/* العمود الأيمن: معادلة التدفق النقدي والإحصائيات */}
      <div className="lg:col-span-7 space-y-5">
        {/* بطاقة تفكيك السيولة النقدية */}
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-cairo text-on-surface">
                  تفاصيل التدفق النقدي للمناوبة #{currentSession.sessionNumber}
                </h3>
                <p className="text-[11px] text-on-surface-variant">
                  بدأت بواسطة <strong>{currentSession.openedBy}</strong> في {formatDateTime(currentSession.openedAt)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDenomCalculator(!showDenomCalculator)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                showDenomCalculator
                  ? 'bg-primary text-on-primary border-primary shadow-xs'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/20'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{showDenomCalculator ? 'إخفاء حاسبة الفئات' : 'حاسبة فئات النقود'}</span>
            </button>
          </div>

          {/* الشبكة التفاعلية للمعادلة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-1">
              <span className="text-[10px] text-on-surface-variant block font-cairo">الرصيد الافتتاحي</span>
              <strong className="text-sm text-on-surface block font-mono">
                {formatMoney(currentSession.openingBalance)} {currencySymbol}
              </strong>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-1">
              <span className="text-[10px] text-emerald-600 block font-cairo">مبيعات نقدية (+)</span>
              <strong className="text-sm text-emerald-600 block font-mono">
                +{formatMoney(currentSession.totalSales)} {currencySymbol}
              </strong>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/15 space-y-1">
              <span className="text-[10px] text-rose-600 block font-cairo">مرتجعات (-)</span>
              <strong className="text-sm text-rose-600 block font-mono">
                -{formatMoney(currentSession.totalReturns)} {currencySymbol}
              </strong>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-1">
              <span className="text-[10px] text-amber-600 block font-cairo">تعديلات/إيداع (±)</span>
              <strong className="text-sm text-amber-600 block font-mono">
                {currentDepositsTotal >= 0 ? `+${formatMoney(currentDepositsTotal)}` : formatMoney(currentDepositsTotal)} {currencySymbol}
              </strong>
            </div>
          </div>

          {/* بطاقة المبلغ المتوقع بالصندوق (Hero Result) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-emerald-500/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
            <div>
              <span className="text-xs font-bold text-on-surface font-cairo block">الرصيد النقدي المتوقع بالدرج:</span>
              <span className="text-[11px] text-on-surface-variant font-tajawal">
                المعادلة: الافتتاحي + المبيعات - المرتجعات + الإيداعات - السحوبات
              </span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl sm:text-3xl font-black text-primary">
                {formatMoney(expectedAmount)}
              </span>
              <span className="text-xs font-bold text-primary">{currencySymbol}</span>
            </div>
          </div>
        </div>

        {/* حاسبة عد النقود وفئات الدينار الجزائري (Denominations Counter) */}
        {showDenomCalculator && (
          <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <div>
                  <h4 className="text-xs font-bold font-cairo text-on-surface">حاسبة عد فئات الدينار الجزائري (DZD Cash Counter)</h4>
                  <p className="text-[10px] text-on-surface-variant">أدخل عدد القطع أو الأوراق لكل فئة ليتم حساب المجموع آلياً</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDenominations({ 2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 })}
                  className="px-2.5 py-1 text-[11px] text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer"
                >
                  تصفير الفئات
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DZD_DENOMINATIONS.map((d) => {
                const count = denominations[d.val] || 0;
                const subtotal = d.val * count;
                return (
                  <div key={d.val} className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/15 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <strong className="text-on-surface font-mono">{d.label}</strong>
                      <span className="text-[9px] text-on-surface-variant">{d.type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        value={count || ''}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setDenominations(prev => ({ ...prev, [d.val]: val }));
                        }}
                        placeholder="0"
                        className="w-full h-8 px-2 bg-surface-container-high border border-outline-variant/20 rounded-lg text-xs font-mono font-bold text-center focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                    <span className="text-[10px] text-on-surface-variant font-mono text-left block">
                      = {formatMoney(subtotal)} {currencySymbol}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface font-cairo block">إجمالي المبلغ المحسوب بالعد:</span>
                <span className="text-[10px] text-on-surface-variant">
                  مطابقة مع المتوقع: {formatMoney(totalDenominationsCount - expectedAmount)} {currencySymbol}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-black font-mono text-amber-600">
                  {formatMoney(totalDenominationsCount)} {currencySymbol}
                </span>
                <button
                  type="button"
                  onClick={handleApplyDenominationsToActual}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-all cursor-pointer"
                >
                  تطبيق للجرد
                </button>
              </div>
            </div>
          </div>
        )}

        {/* سجل حركات المناوبة الحالية */}
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
            <h4 className="text-xs font-bold font-cairo text-on-surface flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>سجل الإيداعات والسحوبات أثناء هذه المناوبة ({currentSession.deposits?.length || 0})</span>
            </h4>
          </div>

          {currentSession.deposits && currentSession.deposits.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {currentSession.deposits.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    {item.amount >= 0 ? (
                      <ArrowDownCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <ArrowUpCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-on-surface">{item.note || (item.amount >= 0 ? 'إيداع نقدي' : 'سحب نقدي')}</p>
                      <span className="text-[10px] text-on-surface-variant font-mono">{formatDateTime(item.createdAt)}</span>
                    </div>
                  </div>
                  <span className={`font-mono font-bold ${item.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {item.amount >= 0 ? `+${formatMoney(item.amount)}` : formatMoney(item.amount)} {currencySymbol}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-xs text-on-surface-variant font-tajawal">
              لم يتم تسجيل أي سحوبات أو إيداعات يدوية أثناء هذه المناوبة حتى الآن.
            </p>
          )}
        </div>
      </div>

      {/* العمود الأيسر: إجراءات الصندوق السريعة */}
      <div className="lg:col-span-5 space-y-5">
        {/* بطاقة الإيداع النقدي السريع */}
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-on-surface font-cairo">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ArrowDownCircle className="w-4 h-4" />
            </div>
            <span>إيداع نقدي بالدرج (Cash In)</span>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              placeholder="المبلغ (دج)"
              value={depositAmount || ''}
              onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-right"
            />
            <input
              type="text"
              placeholder="ملاحظة أو سبب الإيداع (مثلاً: تغذية صندوق)"
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-right font-tajawal"
            />
            <button
              type="button"
              onClick={handleDeposit}
              disabled={depositAmount <= 0 || depositPending}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تأكيد الإيداع في الصندوق</span>
            </button>
          </div>
        </div>

        {/* بطاقة السحب النقدي / المصروفات */}
        <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-on-surface font-cairo">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <span>سحب نقدي / مصروفات من الدرج (Cash Out)</span>
          </div>

          <div className="space-y-2">
            <input
              type="number"
              placeholder="المبلغ (دج)"
              value={withdrawalAmount || ''}
              onChange={(e) => setWithdrawalAmount(Number(e.target.value) || 0)}
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-right"
            />
            <input
              type="text"
              placeholder="ملاحظة أو سبب السحب (مثلاً: شراء لوازم، توريد للمورد)"
              value={withdrawalNote}
              onChange={(e) => setWithdrawalNote(e.target.value)}
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-right font-tajawal"
            />
            <button
              type="button"
              onClick={handleWithdrawal}
              disabled={withdrawalAmount <= 0 || withdrawalPending}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>تأكيد سحب المبلغ من الصندوق</span>
            </button>
          </div>
        </div>

        {/* بطاقة زر إغلاق الجلسة السريع */}
        <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-on-surface font-cairo">
            <Lock className="w-4 h-4 text-primary" />
            <span>إنهاء المناوبة وإجراء الجرد اليومي</span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-tajawal leading-relaxed">
            عند انتهاء فترة العمل، اضغط على الزر أدناه لمقارنة النقدية الفعلية مع المحسوبة وطباعة تقرير الإغلاق (Z-Report).
          </p>
          <button
            type="button"
            onClick={handlePrepareCloseSession}
            className="w-full py-3 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>بدء جرد وإغلاق المناوبة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
