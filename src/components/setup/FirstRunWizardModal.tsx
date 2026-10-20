import React, { useState } from 'react';
import {
  Store,
  Phone,
  Coins,
  Globe,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { validatePasswordStrength, PasswordStrengthBar } from '@/utils/passwordStrength';

export type FirstRunMode = 'fresh' | 'pin-only';

interface FirstRunWizardModalProps {
  isOpen: boolean;
  /** fresh = تثبيت جديد كامل · pin-only = إجبار تغيير رمز المدير الافتراضي فقط */
  mode?: FirstRunMode;
  onComplete: (data: {
    shopName: string;
    phone: string;
    baseCurrency: string;
    language: string;
    adminPin?: string;
  }) => void;
}

const CURRENCY_OPTIONS = [
  { code: 'DZD', symbol: 'دج', label: 'دينار جزائري (دج)' },
  { code: 'SAR', symbol: 'ر.س', label: 'ريال سعودي (ر.س)' },
  { code: 'USD', symbol: '$', label: 'دولار أمريكي ($)' },
  { code: 'EUR', symbol: '€', label: 'يورو (€)' },
];

const LANGUAGE_OPTIONS = [
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
];

export default function FirstRunWizardModal({ isOpen, mode = 'fresh', onComplete }: FirstRunWizardModalProps) {
  const isPinOnly = mode === 'pin-only';
  const [shopName, setShopName] = useState('متجري');
  const [phone, setPhone] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('دج');
  const [language, setLanguage] = useState('ar');
  const [adminPin, setAdminPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPinOnly && !shopName.trim()) {
      setError('يرجى كتابة اسم المتجر أو المؤسسة');
      return;
    }

    // رمز المدير إلزامي دائماً — لا اكتمال للإعداد الأول برمز افتراضي معروف
    const pin = adminPin.trim();
    if (!validatePasswordStrength(pin).valid) {
      setError('رمز المدير ضعيف: يجب أن يكون 8 خانات على الأقل ويحتوي أحرفاً وأرقاماً.');
      return;
    }
    if (pin !== confirmPin.trim()) {
      setError('الرمزان السريان غير متطابقين.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    // في وضع pin-only نرسل الحقول الفارغة فقط حتى تُحافَظ قيم المتجر الحالية كما هي
    const payload = {
      shopName: isPinOnly ? '' : shopName.trim(),
      phone: isPinOnly ? '' : phone.trim(),
      baseCurrency: isPinOnly ? '' : baseCurrency,
      language: isPinOnly ? '' : language,
      adminPin: pin,
    };

    try {
      // 1. استدعاء Electron IPC لحفظ الإعدادات في config.json و SQLite
      if (window.electronAPI?.system?.saveFirstRunSetup) {
        const res = await window.electronAPI.system.saveFirstRunSetup(payload);
        if (!res || res.success === false) {
          throw new Error(res?.error || 'تعذّر حفظ الإعدادات في النظام.');
        }
      }

      // 2. تسجيل علامة الاكتمال محلياً (بعد نجاح الحفظ فقط)
      localStorage.setItem('anpos_setup_completed', 'true');
      if (!isPinOnly) {
        localStorage.setItem('anpos_shop_name', payload.shopName);
        localStorage.setItem('anpos_base_currency', payload.baseCurrency);
      }

      setIsSuccess(true);
      setTimeout(() => {
        onComplete(payload);
      }, 1100);
    } catch (err: any) {
      console.error('[FirstRunWizard] خطأ في حفظ الإعدادات:', err);
      // لا نُعلن النجاح ولا نضع علامة الاكتمال عند الفشل — حتى لا يبقى رمز افتراضي معروف
      setError(err?.message || 'تعذّر حفظ الإعدادات. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md sm:max-w-[450px] bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/30 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden text-on-surface flex flex-col transition-all">
        {/* شريط الإشعاع العلوي الدقيق */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary-container to-cyan" />

        {isSuccess ? (
          <div className="p-8 sm:p-10 flex flex-col items-center justify-center text-center space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-center text-success animate-bounce ring-4 ring-success/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-cairo text-on-surface">
                {isPinOnly ? 'تم تحديث رمز المدير!' : 'تم تجهيز النظام بنجاح!'}
              </h3>
              <p className="text-on-surface-variant font-tajawal text-xs sm:text-sm mt-1 max-w-xs mx-auto">
                {isPinOnly
                  ? 'أصبح حساب المدير محمياً برمزك الجديد. جاري توجيهك إلى شاشة تسجيل الدخول...'
                  : 'تم حفظ بيانات متجرك وتهيئة بيئة التشغيل بالكامل. جاري توجيهك إلى شاشة تسجيل الدخول...'}
              </p>
            </div>
            <div className="pt-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* الترويسة الأنيقة المنسجمة مع هوية AN POS */}
            <div className="p-4 sm:p-5 pb-3.5 border-b border-outline-variant/20 dark:border-white/10 bg-surface-container-low/50 dark:bg-surface-container/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center font-cairo font-black text-lg shadow-md shadow-primary/25 shrink-0">
                  AN
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold font-cairo text-on-surface truncate">
                      {isPinOnly ? 'تحديث رمز المدير' : 'مرحباً بك في AN POS'}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 font-cairo shrink-0">
                      <Sparkles className="w-3 h-3" />
                      {isPinOnly ? 'خطوة أمنية إلزامية' : 'الإعداد الأولي'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-tajawal mt-0.5 truncate">
                    {isPinOnly
                      ? 'عيّن رمزاً سرياً قوياً لحماية حساب المدير'
                      : 'تخصيص بيانات المتجر والعملة لبدء العمل فوراً'}
                  </p>
                </div>
              </div>
            </div>

            {/* محتوى الحقول المتناسق */}
            <div className="p-4 sm:p-5 space-y-3.5">
              {error && (
                <div className="p-2.5 rounded-xl bg-error/10 border border-error/25 text-error text-xs flex items-center gap-2 font-tajawal animate-slide-down">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!isPinOnly && (
                <>
              {/* 1. اسم المتجر */}
              <div>
                <label className="block text-xs font-semibold font-cairo text-on-surface mb-1.5">
                  اسم المتجر / النشاط التجاري <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="مثال: سوبرماركت الأمل للمواد الغذائية"
                    className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-3.5 text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-tajawal"
                  />
                </div>
              </div>

              {/* 2. رقم الهاتف */}
              <div>
                <label className="block text-xs font-semibold font-cairo text-on-surface mb-1.5">
                  رقم الهاتف{' '}
                  <span className="text-[11px] font-normal text-on-surface-variant font-tajawal">
                    (اختياري — يظهر في الفاتورة)
                  </span>
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 0555 12 34 56"
                    className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-3.5 text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-tajawal"
                  />
                </div>
              </div>

              {/* 3. العملة الأساسية */}
              <div>
                <label className="block text-xs font-semibold font-cairo text-on-surface mb-1.5 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  العملة الأساسية للمعاملات
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CURRENCY_OPTIONS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setBaseCurrency(c.symbol)}
                      className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer border ${
                        baseCurrency === c.symbol
                          ? 'bg-primary text-on-primary border-primary shadow-sm shadow-primary/25 font-bold'
                          : 'bg-surface-container-lowest dark:bg-surface-container border-outline-variant/30 dark:border-white/10 text-on-surface-variant hover:border-outline-variant/60 hover:text-on-surface'
                      }`}
                    >
                      <span className="block font-bold font-cairo text-sm leading-tight">
                        {c.symbol}
                      </span>
                      <span className="text-[10px] font-tajawal opacity-75">{c.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. لغة النظام */}
              <div>
                <label className="block text-xs font-semibold font-cairo text-on-surface mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  لغة واجهة البرنامج
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={`py-2 px-2 rounded-xl text-xs text-center transition-all cursor-pointer font-cairo border ${
                        language === l.code
                          ? 'bg-primary text-on-primary border-primary font-bold shadow-sm shadow-primary/25'
                          : 'bg-surface-container-lowest dark:bg-surface-container border-outline-variant/30 dark:border-white/10 text-on-surface-variant hover:border-outline-variant/60 hover:text-on-surface'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
                </>
              )}

              {/* 5. تنبيه أمني (وضع التحديث الإجباري) */}
              {isPinOnly && (
                <div className="p-2.5 rounded-xl bg-warning/10 border border-warning/25 text-warning text-[11px] flex items-start gap-2 font-tajawal">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    اكتشف النظام استخدام رمز مدير افتراضي معروف. لأمان بياناتك ومبيعاتك، يجب تعيين
                    رمز جديد قبل المتابعة.
                  </span>
                </div>
              )}

              {/* 6. رمز المدير السري (إلزامي) */}
              <div>
                <label className="block text-xs font-semibold font-cairo text-on-surface mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  رمز المدير السري <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="8 خانات على الأقل — أحرف وأرقام"
                    dir="ltr"
                    autoComplete="new-password"
                    className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-10 text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-tajawal"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPin((v) => !v)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    aria-label={showPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthBar password={adminPin} showDetails />
              </div>

              {/* 7. تأكيد الرمز السري (إلزامي) */}
              <div>
                <label className="block text-xs font-semibold font-cairo text-on-surface mb-1.5">
                  تأكيد الرمز السري <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="أعد كتابة الرمز السري"
                    dir="ltr"
                    autoComplete="new-password"
                    className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-3.5 text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none font-tajawal"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70 pointer-events-none" />
                </div>
                {confirmPin.length > 0 && confirmPin.trim() !== adminPin.trim() && (
                  <p className="text-[11px] text-error font-tajawal mt-1.5">الرمزان غير متطابقين</p>
                )}
              </div>
            </div>

            {/* الأزرار والشريط السفلي Footer */}
            <div className="p-3.5 sm:p-4 border-t border-outline-variant/20 dark:border-white/10 bg-surface-container-low/50 dark:bg-surface-container/40 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-success font-tajawal order-2 sm:order-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span>بيئة التشغيل وقاعدة البيانات جاهزة</span>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-cairo font-bold text-xs sm:text-sm shadow-md shadow-primary/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 order-1 sm:order-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ الإعدادات...</span>
                  </>
                ) : (
                  <>
                    <span>حفظ ومتابعة</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
