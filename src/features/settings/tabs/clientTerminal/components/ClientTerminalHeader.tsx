import React from 'react';
import {
  Monitor, Zap, ShieldCheck, WifiOff, HardDrive,
  ArrowRightLeft, Sparkles
} from 'lucide-react';
import NetworkSetupWizard from '@/features/network/components/NetworkSetupWizard';

interface ClientTerminalHeaderProps {
  isPaired: boolean;
  showSetupWizard: boolean;
  setShowSetupWizard: (show: boolean) => void;
  onWizardCompleted: (newRole: 'server' | 'client' | 'standalone') => void;
}

export const ClientTerminalHeader: React.FC<ClientTerminalHeaderProps> = ({
  isPaired,
  showSetupWizard,
  setShowSetupWizard,
  onWizardCompleted,
}) => {
  return (
    <div className="space-y-4">
      {/* 1. الترويسة الرئيسية المحسنة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs transition-all">
        <div className="flex items-start sm:items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-all ${
              isPaired
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}
          >
            <Monitor className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black font-cairo text-on-surface tracking-tight">
                ربط نقطة البيع الفرعية (Client Terminal POS)
              </h2>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-cairo border shadow-2xs transition-all ${
                  isPaired
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPaired
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-amber-500 animate-ping'
                  }`}
                />
                <span>{isPaired ? 'مقترن ومعتمد' : 'بانتظار الاقتران'}</span>
              </span>
            </div>

            <p className="text-xs text-on-surface-variant font-tajawal max-w-2xl leading-relaxed">
              إدارة اتصال شاشة الكاشير الفرعية بالخادم المركزي وصمود العمليات في وضع أوفلاين.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSetupWizard(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-bold font-cairo bg-primary text-on-primary hover:bg-primary-hover transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs active:scale-98 self-start sm:self-auto shrink-0"
        >
          <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>معالج الإعداد التفاعلي</span>
        </button>
      </div>

      {/* 2. بطاقة صمود العمليات في وضع أوفلاين (Offline Operation Resilience) عند انتظار الاقتران */}
      {!isPaired ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-l from-amber-500/10 via-surface-container-low to-surface-container-low border border-amber-500/25 shadow-xs space-y-3.5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black font-cairo text-on-surface flex items-center gap-1.5">
                  <span>صمود العمليات في وضع أوفلاين (Offline Resilience Mode)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-200">
                    نشط وجاهز للبيع
                  </span>
                </h3>
                <p className="text-[11px] text-on-surface-variant font-tajawal">
                  تواصل هذه الشاشة البيع وطباعة الإيصالات دون توقف حتى لو كان الخادم غير متصل حالياً.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-amber-800 dark:text-amber-300 font-bold font-cairo bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 self-start sm:self-auto">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>صفر انقطاع للبيع (Zero Downtime)</span>
            </div>
          </div>

          {/* المميزات الثلاث لصمود الكاشير في الأوفلاين */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-3 rounded-2xl bg-surface/80 border border-outline-variant/15 flex items-start gap-2.5">
              <HardDrive className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold font-cairo text-on-surface block text-[11px]">
                  قاعدة بيانات محلية آمنة
                </span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  حفظ الفواتير وحركات الصندوق والباركود محلياً دون فقدان أي عملية.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface/80 border border-outline-variant/15 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold font-cairo text-on-surface block text-[11px]">
                  طباعة الإيصالات فورياً
                </span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  استجابة سريعة للطابعات الحرارية وقارئ الباركود دون تأخير الشبكة.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-surface/80 border border-outline-variant/15 flex items-start gap-2.5">
              <ArrowRightLeft className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold font-cairo text-on-surface block text-[11px]">
                  مزامنة تلقائية صامتة
                </span>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  فور العثور على الخادم والاقتران به، تُرسل البيانات وتتطابق الأرصدة تلقائياً.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="space-y-0.5">
              <span className="font-bold font-cairo block">
                المحطة مقترنة ومحمية بنظام التزامن اللحظي
              </span>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-tajawal">
                تتم مزامنة المبيعات والمنتجات لحظياً، وفي حال انقطاع الشبكة ستتحول تلقائياً لوضع الأوفلاين الآمن.
              </p>
            </div>
          </div>

          <span className="font-cairo font-bold text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 shrink-0 hidden sm:inline-block">
            جاهز ومحمي 100%
          </span>
        </div>
      )}

      {/* نافذة معالج الإعداد السريع */}
      <NetworkSetupWizard
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onCompleted={onWizardCompleted}
      />
    </div>
  );
};
