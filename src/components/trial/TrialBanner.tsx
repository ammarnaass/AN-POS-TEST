import { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { getTrialRemaining, getTrialState, formatTrialDate } from '@/services/trialService';
import { useAuthStore } from '@/store/authStore';

export default function TrialBanner() {
  const { user: currentUser } = useAuthStore();
  const [remaining, setRemaining] = useState(() => getTrialRemaining(currentUser?.role));
  const [trial, setTrial] = useState(() => getTrialState(currentUser?.role));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getTrialRemaining(currentUser?.role));
      setTrial(getTrialState(currentUser?.role));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentUser?.role]);

  // حساب المطور معفى تماماً - لا يظهر البانر
  if (currentUser?.role === 'developer') return null;

  const parts: string[] = [];
  if (remaining.days > 0) parts.push(`${remaining.days} ${remaining.days === 1 ? 'يوم' : 'أيام'}`);
  if (remaining.hours > 0) parts.push(`${remaining.hours} ${remaining.hours === 1 ? 'ساعة' : 'ساعات'}`);
  if (remaining.minutes > 0) parts.push(`${remaining.minutes} ${remaining.minutes === 1 ? 'دقيقة' : 'دقائق'}`);
  parts.push(`${remaining.seconds} ${remaining.seconds === 1 ? 'ثانية' : 'ثواني'}`);

  const isUrgent = remaining.days <= 1;

  return (
    <div
      className={`w-full px-3 sm:px-5 py-2 flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-bold font-cairo select-none no-print ${
        isUrgent
          ? 'bg-gradient-to-l from-red-600 to-red-500 text-white'
          : 'bg-gradient-to-l from-tertiary/90 to-tertiary text-on-tertiary'
      }`}
      dir="rtl"
    >
      {isUrgent ? (
        <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
      ) : (
        <Sparkles className="w-4 h-4 shrink-0" />
      )}

      <span className="truncate">
        {isUrgent ? 'تنبيه! وشك انتهاء التجربة — ' : 'فترة تجريبية — متبقي '}
        <strong>{parts.join(' : ')}</strong>
      </span>

      <span className="hidden sm:inline text-on-tertiary/80 text-[11px] font-tajawal mr-1">
        {trial.remainingSales !== Infinity && `(${trial.remainingSales} فاتورة متبقية)`}
      </span>

      {trial.endsAt && (
        <span className="hidden md:inline bg-black/15 px-2 py-0.5 rounded-md text-[11px] font-mono border border-white/10">
          تاريخ الانتهاء: {formatTrialDate(trial.endsAt)}
        </span>
      )}

      <span className="hidden lg:inline text-on-tertiary/60 text-[10px] font-tajawal mr-2">
        يلزم التفعيل للاستمرار — لا يمكن إزالة هذا الشريط إلا بعد تفعيل الترخيص
      </span>
    </div>
  );
}
