// ManagerPinModal.tsx — نافذة فك القفل بالرقم السري للمدير (Manager PIN Authorization)
// تسمح للكاشير في الأجهزة الفرعية بالحصول على إذن استثنائي للوصول للأقسام المحمية

import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, X, Check, Delete, KeyRound, Loader2 } from 'lucide-react';
import { verifyManagerPin } from '@/lib/clientAccessControl';

interface ManagerPinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ManagerPinModal({
  isOpen,
  title = 'مطلوب إذن المدير',
  description = 'هذا القسم محمي ويتطلب إدخال الرقم السري لمدير النظام للمتابعة على هذا الجهاز',
  onSuccess,
  onClose,
}: ManagerPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleSubmit = async (overridePin?: string) => {
    const pinToVerify = overridePin || pin;
    if (!pinToVerify || pinToVerify.length < 3) {
      setError('يرجى إدخال 4 أرقام على الأقل');
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyManagerPin(pinToVerify);
      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'الرمز غير صحيح');
        triggerShake();
      }
    } catch {
      setError('تعذر التحقق من الرمز، حاول ثانية');
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div
        className={`bg-surface-container-high border border-outline-variant/30 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl text-center space-y-5 transition-transform duration-200 ${
          shake ? 'translate-x-[-8px] animate-pulse ring-2 ring-error' : ''
        }`}
      >
        {/* Header Icon */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <div className="w-8" />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold font-cairo text-on-surface flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            {title}
          </h3>
          <p className="text-xs text-on-surface-variant font-tajawal mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        {/* PIN Dots Display */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3].map((index) => {
            const hasDigit = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  hasDigit
                    ? 'bg-primary border-primary scale-110 shadow-sm shadow-primary/30'
                    : 'border-outline-variant/40 bg-surface-container'
                }`}
              />
            );
          })}
        </div>

        {/* Hidden direct input for physical keyboard */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            setPin(val);
            setError(null);
            if (val.length === 4) {
              handleSubmit(val);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onClose();
          }}
          className="opacity-0 absolute pointer-events-none w-0 h-0"
        />

        {/* Error message */}
        {error && (
          <div className="text-xs font-semibold text-error bg-error/10 border border-error/20 py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric On-Screen Keypad */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => {
                const next = pin + digit;
                handleKeyPress(digit);
                if (next.length === 4) {
                  handleSubmit(next);
                }
              }}
              className="h-12 rounded-2xl bg-surface-container border border-outline-variant/20 hover:bg-surface-container-highest active:scale-95 text-base sm:text-lg font-bold font-cairo text-on-surface transition-all"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-surface-container border border-outline-variant/20 hover:bg-surface-container-highest active:scale-95 text-xs font-bold text-on-surface-variant transition-all"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => {
              const next = pin + '0';
              handleKeyPress('0');
              if (next.length === 4) {
                handleSubmit(next);
              }
            }}
            className="h-12 rounded-2xl bg-surface-container border border-outline-variant/20 hover:bg-surface-container-highest active:scale-95 text-base sm:text-lg font-bold font-cairo text-on-surface transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-2xl bg-surface-container border border-outline-variant/20 hover:bg-surface-container-highest active:scale-95 flex items-center justify-center text-on-surface-variant transition-all"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isLoading || pin.length < 3}
            className="flex-1 py-3 px-4 rounded-2xl bg-primary text-on-primary font-bold font-cairo text-xs sm:text-sm shadow-md hover:bg-primary-hover active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>فك القفل</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl border border-outline-variant/30 text-on-surface-variant font-bold font-cairo text-xs sm:text-sm hover:bg-surface-container-highest active:scale-95 transition-all cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
