import React from 'react';
import { CheckCircle2, Cpu, Package, Printer } from 'lucide-react';

export const SupportDiagnosticsBar: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-on-surface-variant font-medium truncate">قاعدة البيانات المحلية</div>
          <div className="text-sm font-bold text-on-surface font-cairo truncate">SQLite + Dexie (نشطة)</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
        <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 shrink-0">
          <Cpu className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-on-surface-variant font-medium truncate">الخادم الداخلي (Fastify)</div>
          <div className="text-sm font-bold text-cyan-700 dark:text-cyan-400 font-mono truncate">المنفذ :3000 متصل</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
          <Package className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-on-surface-variant font-medium truncate">محطة الكاشير (تصميم 5)</div>
          <div className="text-sm font-bold text-amber-700 dark:text-amber-400 font-cairo truncate">مفضلة العبوات المخصصة</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/15 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
          <Printer className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-on-surface-variant font-medium truncate">منظومة الطباعة والتسعير</div>
          <div className="text-sm font-bold text-blue-700 dark:text-blue-400 font-cairo truncate">فواتير عادية + جملة (س3)</div>
        </div>
      </div>
    </div>
  );
};
