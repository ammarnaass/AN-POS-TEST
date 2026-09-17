import React from 'react';
import { DollarSign, TrendingUp, Building2, Coins } from 'lucide-react';
import type { CashSessionEntity } from '@/infrastructure/database/dexie/db';
import { formatMoney as defaultFormatMoney } from '../hooks/useCashSessionManager';

interface CashSessionSummaryCardsProps {
  currentSession: CashSessionEntity | null;
  expectedAmount: number;
  currentNetSales: number;
  totalCapital: number;
  currentDepositsTotal: number;
  currencySymbol: string;
  formatMoney?: (val: number | null | undefined, decimals?: number) => string;
}

export function CashSessionSummaryCards({
  currentSession,
  expectedAmount,
  currentNetSales,
  totalCapital,
  currentDepositsTotal,
  currencySymbol,
  formatMoney = defaultFormatMoney,
}: CashSessionSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Card 1: Expected in Drawer */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-primary/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant font-cairo">الرصيد الحي بالدرج</span>
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-2xl font-black text-on-surface">
            {formatMoney(currentSession ? expectedAmount : 0)}
          </span>
          <span className="text-xs font-bold text-on-surface-variant">{currencySymbol}</span>
        </div>
        <p className="text-[11px] text-on-surface-variant/80 font-tajawal">
          {currentSession ? 'الرصيد النقدي المتوقع تواجده في الدرج حالياً' : 'افتح مناوبة لتتبع النقدية الحية'}
        </p>
      </div>

      {/* Card 2: Shift Sales */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant font-cairo">صافي مبيعات المناوبة</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-2xl font-black text-emerald-600">
            +{formatMoney(currentNetSales)}
          </span>
          <span className="text-xs font-bold text-emerald-600/80">{currencySymbol}</span>
        </div>
        <p className="text-[11px] text-on-surface-variant/80 font-tajawal">
          إجمالي المبيعات ({formatMoney(currentSession?.totalSales || 0)}) - المرتجعات ({formatMoney(currentSession?.totalReturns || 0)})
        </p>
      </div>

      {/* Card 3: Active Capital */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-cyan-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant font-cairo">رأس المال التشغيلي</span>
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-2xl font-black text-cyan-600">
            {formatMoney(totalCapital)}
          </span>
          <span className="text-xs font-bold text-cyan-600/80">{currencySymbol}</span>
        </div>
        <p className="text-[11px] text-on-surface-variant/80 font-tajawal">
          إجمالي إيداعات رأس المال مطروحاً منها السحوبات
        </p>
      </div>

      {/* Card 4: Shift In/Out Adjustments */}
      <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-amber-500/30 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-on-surface-variant font-cairo">تعديلات ومصروفات الدرج</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1 font-mono">
          <span className={`text-2xl font-black ${currentDepositsTotal >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
            {currentDepositsTotal >= 0 ? `+${formatMoney(currentDepositsTotal)}` : formatMoney(currentDepositsTotal)}
          </span>
          <span className="text-xs font-bold text-on-surface-variant">{currencySymbol}</span>
        </div>
        <p className="text-[11px] text-on-surface-variant/80 font-tajawal">
          {currentSession?.deposits?.length || 0} حركة إيداع / سحب مسجلة في المناوبة
        </p>
      </div>
    </div>
  );
}

export default CashSessionSummaryCards;

