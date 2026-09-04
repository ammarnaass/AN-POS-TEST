// فحص وتدقيق قوة كلمة المرور ومؤشر واجهة المستخدم
import React from 'react';
import { Check, X, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

export interface PasswordValidationResult {
  score: number; // 0 إلى 4
  valid: boolean; // تلبي الحد الأدنى للأمان
  strength: 'weak' | 'fair' | 'strong';
  label: string;
  errors: string[];
  criteria: {
    minLength: boolean;
    hasLetters: boolean;
    hasDigits: boolean;
    hasSpecial: boolean;
  };
}

/**
 * فحص قوة كلمة المرور والتحقق من المعايير الأمنية
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const pwd = password || '';
  const errors: string[] = [];

  const minLength = pwd.length >= 8;
  const hasLetters = /[a-zA-Z\u0600-\u06FF]/.test(pwd);
  const hasDigits = /[0-9]/.test(pwd);
  const hasSpecial = /[^a-zA-Z0-9\u0600-\u06FF\s]/.test(pwd);

  if (!minLength) {
    errors.push('كلمة المرور يجب أن تكون 8 أحرف أو أرقام على الأقل');
  }
  if (!hasLetters) {
    errors.push('يجب أن تحتوي كلمة المرور على أحرف (عربية أو لاتينية)');
  }
  if (!hasDigits) {
    errors.push('يجب أن تحتوي كلمة المرور على رقم واحد على الأقل');
  }

  // حساب درجة القوة من 0 إلى 4
  let score = 0;
  if (minLength) score++;
  if (hasLetters) score++;
  if (hasDigits) score++;
  if (hasSpecial || pwd.length >= 12) score++;

  let strength: 'weak' | 'fair' | 'strong' = 'weak';
  let label = 'ضعيفة';

  if (score >= 4 && minLength && hasLetters && hasDigits) {
    strength = 'strong';
    label = 'قوية';
  } else if (score >= 2 && minLength) {
    strength = 'fair';
    label = 'متوسطة';
  } else {
    strength = 'weak';
    label = 'ضعيفة';
  }

  const valid = minLength && hasLetters && hasDigits;

  return {
    score,
    valid,
    strength,
    label,
    errors,
    criteria: {
      minLength,
      hasLetters,
      hasDigits,
      hasSpecial,
    },
  };
}

interface PasswordStrengthBarProps {
  password: string;
  showDetails?: boolean;
}

/**
 * شريط بياني متطور لعرض قوة كلمة المرور مع إشارات بصرية ملهمة
 */
export function PasswordStrengthBar({ password, showDetails = false }: PasswordStrengthBarProps) {
  if (!password) return null;

  const { score, strength, label, criteria } = validatePasswordStrength(password);

  const getColorClasses = () => {
    switch (strength) {
      case 'strong':
        return {
          bar: 'bg-emerald-500',
          text: 'text-emerald-500 dark:text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          Icon: ShieldCheck,
        };
      case 'fair':
        return {
          bar: 'bg-amber-500',
          text: 'text-amber-500 dark:text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          Icon: Shield,
        };
      default:
        return {
          bar: 'bg-rose-500',
          text: 'text-rose-500 dark:text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/20',
          Icon: ShieldAlert,
        };
    }
  };

  const style = getColorClasses();
  const IconComponent = style.Icon;

  return (
    <div className="space-y-2 mt-1.5 animate-fadeIn">
      {/* 4-Segment Progress Bar */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((step) => {
          const isFilled = score >= step;
          return (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                isFilled ? style.bar : 'bg-outline-variant/20 dark:bg-white/10'
              }`}
            />
          );
        })}
      </div>

      {/* Strength Label and Icon */}
      <div className="flex items-center justify-between text-[11px] font-cairo">
        <span className="text-on-surface-variant/80">قوة كلمة المرور:</span>
        <div className={`flex items-center gap-1 font-bold ${style.text}`}>
          <IconComponent className="w-3.5 h-3.5" />
          <span>{label}</span>
        </div>
      </div>

      {/* Details checklist if requested */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-tajawal">
          <div className={`flex items-center gap-1 ${criteria.minLength ? 'text-emerald-500' : 'text-on-surface-variant/70'}`}>
            {criteria.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>8 أحرف على الأقل</span>
          </div>
          <div className={`flex items-center gap-1 ${criteria.hasLetters ? 'text-emerald-500' : 'text-on-surface-variant/70'}`}>
            {criteria.hasLetters ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>تحتوي أحرف</span>
          </div>
          <div className={`flex items-center gap-1 ${criteria.hasDigits ? 'text-emerald-500' : 'text-on-surface-variant/70'}`}>
            {criteria.hasDigits ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>تحتوي أرقام</span>
          </div>
          <div className={`flex items-center gap-1 ${criteria.hasSpecial ? 'text-emerald-500' : 'text-on-surface-variant/70'}`}>
            {criteria.hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            <span>رموز خاصة (مستحسن)</span>
          </div>
        </div>
      )}
    </div>
  );
}
