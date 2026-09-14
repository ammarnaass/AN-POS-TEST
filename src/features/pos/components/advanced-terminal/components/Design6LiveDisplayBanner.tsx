import React, { useState, useEffect } from 'react';
import { User, RefreshCw } from 'lucide-react';

export interface Design6LiveDisplayBannerProps {
  totalAmount: number;
  formatMoney: (amount?: number) => string;
  currency?: string;
  invoiceNumber?: string | number;
  customerName?: string;
  onSelectCustomer: () => void;
}

export const Design6LiveDisplayBanner: React.FC<Design6LiveDisplayBannerProps> = ({
  totalAmount,
  formatMoney,
  currency = 'دج',
  invoiceNumber = 1,
  customerName = 'زبون عام (نقداً)',
  onSelectCustomer,
}) => {
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const d = String(now.getDate()).padStart(2, '0');
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const y = now.getFullYear();
      setCurrentDate(`${d}/${m}/${y}`);

      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hh}:${mm}:${ss}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format invoice number to 7 digits like 0000001
  const formattedInvoiceNo = String(invoiceNumber || '1').padStart(7, '0');

  return (
    <div className="w-full bg-[#050811] px-4 py-2 flex items-center justify-between gap-4 border-b border-slate-800/80">
      {/* Left: Active Receipt & Date/Clock */}
      <div className="flex items-center gap-6 min-w-[220px]">
        <div>
          <div className="text-[12px] font-bold text-slate-400">{currentDate}</div>
          <div className="text-[16px] font-black font-mono text-white tracking-widest leading-none mt-0.5">
            {currentTime}
          </div>
        </div>

        <div className="border-r border-slate-800 pr-4">
          <div className="text-[10px] font-medium text-slate-400">الوصل النشط</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-slate-300">رقم</span>
            <span className="text-base font-black font-mono text-[#f59e0b] tracking-wider">
              {formattedInvoiceNo}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Giant Luminous Neon Emerald LED Total Screen */}
      <div className="flex-1 max-w-[620px] bg-[#071311] border-2 border-emerald-900/60 rounded-2xl py-2 px-6 shadow-[inset_0_2px_12px_rgba(0,0,0,0.9)] flex items-center justify-center">
        <div className="flex items-baseline gap-2 font-mono select-none">
          <span className="text-[42px] sm:text-[50px] font-black tracking-tight text-[#10b981] drop-shadow-[0_0_25px_rgba(16,185,129,0.45)]">
            {formatMoney(totalAmount)}
          </span>
          <span className="text-2xl font-black text-[#34d399] opacity-90 mr-1 font-sans">
            {currency}
          </span>
        </div>
      </div>

      {/* Right: Customer Card with Change Trigger */}
      <div className="flex items-center gap-3 min-w-[220px] justify-end">
        <div className="text-left">
          <div className="flex items-center gap-1.5 text-[11px] justify-end">
            <button
              type="button"
              onClick={onSelectCustomer}
              className="h-6 px-2 bg-slate-800/90 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded font-bold flex items-center gap-1 cursor-pointer transition-colors border border-slate-700/60"
              title="تحديد أو تغيير الزبون (F2)"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>تغيير</span>
            </button>
            <span className="text-slate-400">الزبون:</span>
          </div>
          <div className="text-sm font-black text-white mt-0.5 text-right">
            {customerName}
          </div>
        </div>

        <button
          type="button"
          onClick={onSelectCustomer}
          className="w-10 h-10 rounded-full bg-[#1e293b] hover:bg-[#334155] border border-slate-700 flex items-center justify-center text-cyan-400 shadow-inner shrink-0 cursor-pointer transition-colors"
          title="اختيار الزبون"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
