import React from 'react';
import { Printer, Database, Monitor, Bell } from 'lucide-react';
import { APP_DISPLAY_VERSION } from '@/constants/app';
import { useNotificationStore } from '@/store/notificationStore';

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
  appVersion = `${APP_DISPLAY_VERSION} PRO`,
}) => {
  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.read).length);

  return (
    <footer className="w-full bg-slate-200/90 dark:bg-[#050811] border-t border-slate-300 dark:border-slate-900 px-3 py-1 flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 select-none shrink-0 transition-colors">
      {/* Right Info: Printer & DB status & Notifications */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isPrinterReady ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
          <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>طابعة الإيصالات:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{printerName}</span>
        </div>

        <div className="flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-800 pr-4">
          <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-cyan-500 shadow-[0_0_6px_#06b6d4]' : 'bg-rose-500'}`} />
          <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>قاعدة البيانات المحلية:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{isDbConnected ? 'متصلة' : 'غير متصلة'}</span>
        </div>

        <div className="flex items-center gap-1.5 border-r border-slate-300 dark:border-slate-800 pr-4">
          <span className={`w-2 h-2 rounded-full ${unreadCount > 0 ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b] animate-pulse' : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'}`} />
          <Bell className="w-3.5 h-3.5 text-amber-500" />
          <span>الإشعارات:</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {unreadCount > 0 ? `${unreadCount} جديدة` : 'محدثة'}
          </span>
        </div>
      </div>

      {/* Center: Screen Model */}
      <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
        <Monitor className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span className="text-slate-500 dark:text-slate-400">الشاشة:</span>
        <span className="font-bold">{screenModel}</span>
      </div>

      {/* Left: App Version */}
      <div className="flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400">
        <span className="text-slate-500 text-[10px]">الإصدار</span>
        <span>{appVersion}</span>
      </div>
    </footer>
  );
};
