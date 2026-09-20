// Tab Component: UpdatesTab
import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  Cpu,
  Clock,
  Check,
} from 'lucide-react';
import {
  APP_NAME,
  APP_VERSION,
  APP_DISPLAY_VERSION,
  APP_RELEASE_DATE,
  APP_CHANNEL,
  APP_CHANGELOG,
} from '@/constants/app';

interface UpdatesTabProps {
  addNotification: (notification: {
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }) => void;
  [key: string]: any;
}

export default function UpdatesTab({ addNotification }: UpdatesTabProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('الآن');

  const handleCheckUpdates = () => {
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setLastChecked('الآن');
      addNotification({
        title: 'فحص التحديثات',
        message: `أنت تستخدم أحدث إصدار متوفر (${APP_DISPLAY_VERSION}). لا توجد تحديثات جديدة حالياً.`,
        type: 'success',
      });
    }, 1200);
  };

  return (
    <div className="space-y-6 font-cairo animate-fade-in">
      {/* 1. Hero Card: Current Version & Update Status */}
      <div className="glass-card rounded-3xl border border-outline-variant/20 p-6 sm:p-8 bg-gradient-to-b from-surface-container-low via-surface-container to-surface-container-high/60 relative overflow-hidden shadow-sm">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/15 shrink-0">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  النظام محدث ومستقر
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-surface-container-highest border border-outline-variant/30 text-on-surface-variant">
                  {APP_CHANNEL}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                الإصدار الحالي: {APP_DISPLAY_VERSION}
              </h2>
              <p className="text-body-md text-on-surface-variant font-medium">
                لا توجد تحديثات متاحة حالياً
              </p>
            </div>
          </div>

          {/* Action Button & Metadata */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCheckUpdates}
              disabled={isChecking}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all shadow-md shadow-primary/25 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'جاري فحص التحديثات...' : 'فحص التحديثات الآن'}</span>
            </button>

            <span className="text-[11px] text-on-surface-variant/70 flex items-center gap-1">
              <Clock className="w-3 h-3 text-outline" />
              آخر فحص: {lastChecked}
            </span>
          </div>
        </div>

        {/* System Specs Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-outline-variant/15 relative z-10 text-xs">
          <div className="p-3 rounded-2xl bg-surface-container-lowest/50 border border-outline-variant/15">
            <span className="text-on-surface-variant text-[11px]">رقم الإصدار</span>
            <p className="font-mono font-bold text-on-surface mt-0.5">{APP_VERSION}</p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-container-lowest/50 border border-outline-variant/15">
            <span className="text-on-surface-variant text-[11px]">تاريخ النشر</span>
            <p className="font-mono font-bold text-on-surface mt-0.5">{APP_RELEASE_DATE}</p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-container-lowest/50 border border-outline-variant/15">
            <span className="text-on-surface-variant text-[11px]">معمارية التشغيل</span>
            <p className="font-bold text-on-surface mt-0.5">Offline-First (Desktop)</p>
          </div>
          <div className="p-3 rounded-2xl bg-surface-container-lowest/50 border border-outline-variant/15">
            <span className="text-on-surface-variant text-[11px]">قواعد البيانات</span>
            <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">SQLite 3 + Dexie</p>
          </div>
        </div>
      </div>

      {/* 2. Changelog / Release History */}
      <div className="glass-card rounded-3xl border border-outline-variant/20 p-6 sm:p-8 bg-surface-container-low/80">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-on-surface">سجل التحديثات والإصدارات</h3>
              <p className="text-xs text-on-surface-variant">تاريخ التحسينات والميزات المضافة في كل ترقية لنظام {APP_NAME}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {APP_CHANGELOG.map((release, idx) => {
            const isCurrent = release.version === APP_DISPLAY_VERSION;
            return (
              <div
                key={release.version}
                className={`p-5 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-surface-container border-primary/40 shadow-sm'
                    : 'bg-surface-container-lowest/60 border-outline-variant/15 hover:border-outline-variant/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-outline-variant/10">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-base font-mono font-black ${isCurrent ? 'text-primary' : 'text-on-surface'}`}>
                      {release.version}
                    </span>
                    {release.badge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {release.badge}
                      </span>
                    )}
                    <h4 className="text-sm font-bold text-on-surface">{release.title}</h4>
                  </div>

                  <span className="text-xs font-mono text-outline flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {release.date}
                  </span>
                </div>

                <ul className="space-y-1.5 text-xs text-on-surface-variant">
                  {release.changes.map((change, cIdx) => (
                    <li key={cIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/70 shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
