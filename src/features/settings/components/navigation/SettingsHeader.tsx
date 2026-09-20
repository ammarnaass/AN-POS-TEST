import React from 'react';
import { Settings, ShieldCheck, Tag } from 'lucide-react';
import { APP_DISPLAY_VERSION } from '@/constants/app';

interface SettingsHeaderProps {
  serverStatus: { running: boolean; port: number } | null;
  isDeveloper: boolean;
  isLicenseActive: boolean;
  trial: { isActive: boolean; remainingDays: number };
}

export default function SettingsHeader({
  serverStatus,
  isDeveloper,
  isLicenseActive,
  trial,
}: SettingsHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-high p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-3.5">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-cairo text-on-surface">لوحة الإعدادات والتحكم</h1>
          <p className="text-xs text-on-surface-variant font-tajawal">إدارة وتخصيص كافة وظائف النظام، المبيعات، الصلاحيات، والشبكة</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="px-3 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex items-center gap-1.5 text-xs font-semibold text-on-surface font-mono">
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span>{APP_DISPLAY_VERSION}</span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex items-center gap-2 text-xs font-semibold text-on-surface">
          <div className={`w-2.5 h-2.5 rounded-full ${serverStatus?.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span>خادم الشبكة: {serverStatus?.running ? `يعمل (منفذ ${serverStatus.port})` : 'متوقف'}</span>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-surface-container-highest border border-outline-variant/20 flex items-center gap-2 text-xs font-semibold text-on-surface">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>{isDeveloper ? 'وضع المطور (غير محدود)' : isLicenseActive ? 'النسخة الكاملة' : trial.isActive ? `تجريبي (${trial.remainingDays} يوم)` : 'غير مفعل'}</span>
        </div>
      </div>
    </header>
  );
}
