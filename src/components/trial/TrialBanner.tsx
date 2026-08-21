import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { getTrialRemaining } from '@/services/trialService';

interface TrialBannerProps {
  onDismiss: () => void;
}

export default function TrialBanner({ onDismiss }: TrialBannerProps) {
  const [remaining, setRemaining] = useState(getTrialRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getTrialRemaining());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const parts: string[] = [];
  if (remaining.days > 0) parts.push(`${remaining.days} ${remaining.days === 1 ? 'يوم' : 'أيام'}`);
  if (remaining.hours > 0) parts.push(`${remaining.hours} ${remaining.hours === 1 ? 'ساعة' : 'ساعات'}`);
  if (remaining.minutes > 0) parts.push(`${remaining.minutes} ${remaining.minutes === 1 ? 'دقيقة' : 'دقائق'}`);
  parts.push(`${remaining.seconds} ${remaining.seconds === 1 ? 'ثانية' : 'ثواني'}`);

  return (
    <div className="bg-gradient-to-l from-tertiary/90 to-tertiary text-on-tertiary px-5 py-2.5 flex items-center justify-between" dir="rtl">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span className="font-label-md text-sm">
          تجربة مجانية — متبقي <strong className="font-bold">{parts.join(' : ')}</strong>
        </span>
        <span className="text-on-tertiary/70 text-body-xs hidden sm:inline mr-2">
          قم بإنشاء حساب للاستمرار بعد انتهاء التجربة
        </span>
      </div>
      <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-on-tertiary/10 transition-colors" aria-label="إخفاء">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
