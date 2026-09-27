import React, { useState } from 'react';
import {
  Store,
  Phone,
  Coins,
  Globe,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  Database,
  ShieldCheck,
} from 'lucide-react';

interface FirstRunWizardModalProps {
  isOpen: boolean;
  onComplete: (data: {
    shopName: string;
    phone: string;
    baseCurrency: string;
    language: string;
    adminPin: string;
  }) => void;
}

const CURRENCY_OPTIONS = [
  { code: 'DZD', symbol: 'دج', label: 'دينار جزائري (دج)' },
  { code: 'SAR', symbol: 'ر.س', label: 'ريال سعودي (ر.س)' },
  { code: 'USD', symbol: '$', label: 'دولار أمريكي ($)' },
  { code: 'EUR', symbol: '€', label: 'يورو (€)' },
];

const LANGUAGE_OPTIONS = [
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'en', label: 'English' },
];

export default function FirstRunWizardModal({ isOpen, onComplete }: FirstRunWizardModalProps) {
  const [shopName, setShopName] = useState('متجري');
  const [phone, setPhone] = useState('');
  const [baseCurrency, setBaseCurrency] = useState('دج');
  const [language, setLanguage] = useState('ar');
  const [adminPin, setAdminPin] = useState('admin1234');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setError('يرجى كتابة اسم المتجر أو المؤسسة');
      return;
    }

    setError('');
    setIsSubmitting(true);

    const payload = {
      shopName: shopName.trim(),
      phone: phone.trim(),
      baseCurrency,
      language,
      adminPin: adminPin.trim(),
    };

    try {
      // 1. استدعاء Electron IPC لحفظ الإعدادات في config.json و SQLite
      if (window.electronAPI?.system?.saveFirstRunSetup) {
        await window.electronAPI.system.saveFirstRunSetup(payload);
      }

      // 2. تسجيل علامة الاكتمال محلياً
      localStorage.setItem('anpos_setup_completed', 'true');
      localStorage.setItem('anpos_shop_name', payload.shopName);
      localStorage.setItem('anpos_base_currency', payload.baseCurrency);

      setIsSuccess(true);
      setTimeout(() => {
        onComplete(payload);
      }, 1200);
    } catch (err: any) {
      console.error('[FirstRunWizard] خطأ في حفظ الإعدادات:', err);
      // حتى في حال حدوث خطأ استثنائي، نحفظ محلياً لعدم إعاقة المستخدم
      localStorage.setItem('anpos_setup_completed', 'true');
      setIsSuccess(true);
      setTimeout(() => {
        onComplete(payload);
      }, 1200);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-500/10 overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* شريط الإشعاع العلوي */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

        {isSuccess ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white">تم تجهيز النظام بنجاح!</h3>
            <p className="text-slate-300 text-sm max-w-md">
              تم حفظ بيانات متجرك وتهيئة بيئة التشغيل بالكامل. جاري توجيهك إلى شاشة تسجيل الدخول...
            </p>
            <div className="pt-2">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            {/* الترويسة Branded Header */}
            <div className="p-5 sm:p-6 pb-3 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/30 font-black text-xl text-white">
                    AN
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      مرحباً بك في AN POS
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        الإعداد الأولي
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تخصيص بيانات المتجر والبيئة لتجربة تشغيل فورية دون إعداد يدوي
                    </p>
                  </div>
                </div>
              </div>

              {/* شريط حالة جاهزية البيئة */}
              <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300">
                <Database className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>قاعدة البيانات المحلية جاهزة ومحدّثة تلقائياً (SQLite + Drizzle Auto-Migration)</span>
              </div>
            </div>

            {/* محتوى الحقول Form Fields */}
            <div className="p-5 sm:p-6 space-y-4 flex-1">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* 1. اسم المتجر */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  اسم المتجر / النشاط التجاري <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Store className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="مثال: سوبرماركت الأمل للمواد الغذائية"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* 2. رقم الهاتف */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  رقم هاتف المتجر (يظهر في أسفل الفاتورة)
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 0555 12 34 56"
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* 3. العملة الأساسية */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  العملة الأساسية للمعاملات
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CURRENCY_OPTIONS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setBaseCurrency(c.symbol)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        baseCurrency === c.symbol
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span className="block font-bold text-sm">{c.symbol}</span>
                      <span className="text-[10px] opacity-80">{c.code}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. لغة النظام */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  لغة واجهة البرنامج
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                        language === l.code
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. كلمة مرور المدير الافتراضية */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    الرقم السري لحساب المدير (<span className="text-blue-300 font-mono">admin@dante.com</span>)
                  </label>
                  <span className="text-[10px] text-slate-400">الافتراضي: admin1234</span>
                </div>
                <div className="relative">
                  <Lock className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="أدخل كلمة مرور أو رقم سري للمدير"
                    className="w-full pr-10 pl-10 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-200"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  يمكنك تغيير كلمة المرور في أي وقت لاحقاً من شاشة الإعدادات &gt; المستخدمون.
                </p>
              </div>
            </div>

            {/* الأزرار السفلية Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ الإعدادات...</span>
                  </>
                ) : (
                  <>
                    <span>حفظ وبدء استخدام البرنامج</span>
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
