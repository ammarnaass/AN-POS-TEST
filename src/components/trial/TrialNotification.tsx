import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { TRIAL_DAYS } from '@/services/trialService';

interface TrialNotificationProps {
  onClose: () => void;
}

export default function TrialNotification({ onClose }: TrialNotificationProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-1/2 translate-x-1/2 z-[60] animate-slide-down" dir="rtl">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-tertiary/20 p-4 flex items-center gap-4 max-w-md">
        <div className="w-10 h-10 rounded-xl bg-tertiary-container/30 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-tertiary" />
        </div>
        <div className="flex-1">
          <p className="font-label-lg text-on-surface">تم تفعيل التجربة المجانية!</p>
          <p className="text-body-sm text-on-surface-variant">لديك {TRIAL_DAYS} يوماً لتجربة جميع ميزات النظام</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-low transition-colors shrink-0">
          <X className="w-4 h-4 text-on-surface-variant" />
        </button>
      </div>
    </div>
  );
}
