import React from 'react';
import { Printer, Database, Monitor } from 'lucide-react';

export interface Design6SystemStatusBarProps {
  printerName?: string;
  isPrinterReady?: boolean;
  isDbConnected?: boolean;
  screenModel?: string;
  appVersion?: string;
}

export const Design6SystemStatusBar: React.FC<Design6SystemStatusBarProps> = ({
  printerName = 'EPSON TM-T20III (جاهزة)',
  isPrinterReady = true,
  isDbConnected = true,
  screenModel = 'SAMSUNG S19C150',
  appVersion = 'V 4.8.2 PRO',
}) => {
  return (
    <footer className="w-full bg-[#050811] border-t border-slate-900 px-3 py-1 flex items-center justify-between text-[11px] font-medium text-slate-400 select-none shrink-0">
      {/* Right Info: Printer & DB status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPrinterReady ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
          <Printer className="w-3.5 h-3.5 text-slate-400" />
          <span>طابعة الإيصالات:</span>
          <span className="font-bold text-slate-200">{printerName}</span>
        </div>

        <div className="flex items-center gap-1.5 border-r border-slate-800 pr-4">
          <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-cyan-500 shadow-[0_0_6px_#06b6d4]' : 'bg-rose-500'}`} />
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span>قاعدة البيانات المحلية:</span>
          <span className="font-bold text-emerald-400">{isDbConnected ? 'متصلة' : 'غير متصلة'}</span>
        </div>
      </div>

      {/* Center: Screen Model */}
      <div className="flex items-center gap-1.5 font-mono text-slate-300">
        <Monitor className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-400">الشاشة:</span>
        <span className="font-bold">{screenModel}</span>
      </div>

      {/* Left: App Version */}
      <div className="flex items-center gap-1 font-mono font-bold text-amber-400">
        <span className="text-slate-500 text-[10px]">الإصدار</span>
        <span>{appVersion}</span>
      </div>
    </footer>
  );
};
