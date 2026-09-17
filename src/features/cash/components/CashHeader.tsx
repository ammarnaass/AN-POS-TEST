import React from 'react';
import { Wallet, Lock, RefreshCw } from 'lucide-react';
import type { CashSessionEntity } from '@/infrastructure/database/dexie/db';

interface CashHeaderProps {
  currentSession: CashSessionEntity | null;
  onPrepareCloseSession: () => void;
  onRefresh: () => void;
}

export function CashHeader({
  currentSession,
  onPrepareCloseSession,
  onRefresh,
}: CashHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-high p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3 sm:gap-3.5">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-cairo text-on-surface">إدارة الصندوق ورأس المال</h1>
            {currentSession ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                مناوبة #{currentSession.sessionNumber} مفتوحة ({currentSession.openedBy})
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-container-high text-on-surface-variant">
                الخزينة مغلقة حالياً
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5 font-tajawal">
            متابعة تدفقات الدرج النقدي، مطابقة الأرصدة، جرد الفئات، وحركات رأس المال التشغيلي
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {currentSession && (
          <button
            type="button"
            onClick={onPrepareCloseSession}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Lock className="w-4 h-4" />
            <span>إغلاق وجرد المناوبة</span>
          </button>
        )}

        <button
          type="button"
          onClick={onRefresh}
          className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
          title="تحديث البيانات"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

export default CashHeader;

