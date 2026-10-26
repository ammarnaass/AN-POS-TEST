import React from 'react';
import { Tv } from 'lucide-react';

interface WorkstationLEDRibbonProps {
  total: number;
  currency?: string;
  formatMoney: (amount?: number | null) => string;
}

export const WorkstationLEDRibbon: React.FC<WorkstationLEDRibbonProps> = ({
  total,
  currency = 'د.ج',
}) => {
  // Format total into main integer digits and decimal part
  const safeTotal = typeof total === 'number' && !isNaN(total) ? total : 0;
  const parts = safeTotal.toFixed(2).split('.');
  const integerPart = Number(parts[0]).toLocaleString('fr-DZ');
  const decimalPart = parts[1] || '00';

  return (
    <div
      className="w-full flex-shrink-0 px-3 sm:px-6 py-1.5 sm:py-2 border-b-2 border-emerald-500/40 shadow-inner flex items-center justify-between select-none overflow-hidden"
      style={{
        background: 'radial-gradient(circle, #022013 0%, #03120c 60%, #020b07 100%)',
      }}
    >
      {/* Title & icon */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shrink-0">
          <Tv className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="text-right leading-tight hidden sm:block">
          <div className="text-xs font-bold text-slate-300">شاشة العرض المالي الرقمية للكاشير</div>
          <div className="text-[10px] text-emerald-400/80 font-mono tracking-wider">
            LED ACTIVE TERMINAL DISPLAY
          </div>
        </div>
      </div>

      {/* Giant LED Display Digits - Scales dynamically across mobile, 1024x768 and 4K */}
      <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 shrink-0">
        <span className="text-[10px] sm:text-xs md:text-sm font-extrabold uppercase tracking-widest text-emerald-400 shrink-0">
          المبلغ الإجمالي المستحق :
        </span>
        <div
          dir="ltr"
          className="font-mono font-black tracking-widest flex items-baseline gap-0.5 sm:gap-1 led-glow text-2xl xs:text-3xl sm:text-4xl lg:text-5xl"
          style={{
            direction: 'ltr',
            color: '#00ff66',
            lineHeight: 1,
            textShadow: '0 0 10px rgba(0, 255, 102, 0.9), 0 0 20px rgba(0, 255, 102, 0.5)',
          }}
        >
          <span>{integerPart}</span>
          <span className="text-base sm:text-xl md:text-2xl lg:text-3xl">.{decimalPart}</span>
        </div>
        <span className="text-xs sm:text-sm md:text-base font-black font-sans pr-0.5 sm:pr-1 text-emerald-400 shrink-0">
          {currency}
        </span>
      </div>

      {/* Live Status Pill */}
      <div className="hidden lg:flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-mono text-emerald-300 shrink-0">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="font-bold">LIVE SYNC READY</span>
      </div>
    </div>
  );
};
