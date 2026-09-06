import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Copy, Check, Upload, LogOut, RefreshCw, Smartphone, ShieldCheck, Calendar, Clock } from 'lucide-react';
import { fetchLicenseStatus, activateLicenseWithKey, type LicenseStatus } from '@/services/licenseService';
import { clearTrial, getTrialState, formatTrialDate } from '@/services/trialService';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

interface Props {
  onActivated?: () => void;
}

export default function ActivationLockModal({ onActivated }: Props) {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [activationInput, setActivationInput] = useState('');
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [trialState] = useState(() => getTrialState());

  useEffect(() => {
    fetchLicenseStatus().then(setLicenseStatus);
  }, []);

  const handleCopyFingerprint = () => {
    if (licenseStatus?.hardwareFingerprint) {
      navigator.clipboard?.writeText(licenseStatus.hardwareFingerprint);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  const handleActivate = async (keyToUse?: string) => {
    const key = (keyToUse || activationInput).trim();
    if (!key) {
      setErrorMsg('يرجى إدخال كود التفعيل أو استيراد ملف الترخيص');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsActivating(true);
    try {
      const result = await activateLicenseWithKey(key);
      if (!result.success || !result.status) {
        setErrorMsg(result.error ?? 'كود التفعيل غير صالح أو غير مخصص لهذا الجهاز');
        return;
      }
      clearTrial();
      setLicenseStatus(result.status);
      setSuccessMsg('تم تفعيل الترخيص بنجاح! جاري تحديث النظام...');
      setTimeout(() => {
        if (onActivated) onActivated();
        else window.location.reload();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر إتمام عملية التفعيل');
    } finally {
      setIsActivating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setActivationInput(content);
        handleActivate(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-surface-container-low border border-red-500/30 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-6 text-on-surface animate-in fade-in zoom-in-95 duration-200">
        {/* Header with Icon */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-cairo text-on-surface">
              انتهت فترة التجربة المجانية (7 أيام)
            </h2>
            <p className="text-xs text-on-surface-variant font-tajawal mt-1 leading-relaxed">
              لاستمرار استخدام نقاط البيع والمخزون وإدارة المتجر، يرجى تفعيل نسختك الرسمية بإدخال كود التفعيل أو التواصل مع المطور.
            </p>
          </div>
        </div>

        {/* بطاقة تواريخ التجربة المجانية */}
        <div className="p-3.5 rounded-2xl bg-surface-container border border-red-500/20 grid grid-cols-2 gap-3 text-right">
          <div className="bg-surface-container-lowest/80 p-2.5 rounded-xl border border-outline-variant/15">
            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant font-cairo mb-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>تاريخ بدء التجربة:</span>
            </div>
            <p className="text-xs font-bold font-mono text-on-surface">
              {formatTrialDate(trialState.startedAt)}
            </p>
          </div>

          <div className="bg-surface-container-lowest/80 p-2.5 rounded-xl border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-1.5 text-[11px] text-red-500 font-cairo mb-1">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              <span>تاريخ انتهاء التجربة:</span>
            </div>
            <p className="text-xs font-bold font-mono text-red-500">
              {formatTrialDate(trialState.endsAt)}
            </p>
          </div>
        </div>

        {/* Hardware Fingerprint Card */}
        <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface font-cairo">بصمة هذا الجهاز (Hardware Fingerprint):</span>
            <button
              type="button"
              onClick={handleCopyFingerprint}
              className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              {copiedFingerprint ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFingerprint ? 'تم النسخ' : 'نسخ البصمة'}</span>
            </button>
          </div>
          <p className="text-xs font-mono bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/15 text-on-surface select-all break-all dir-ltr text-center">
            {licenseStatus?.hardwareFingerprint || 'جاري استخراج البصمة...'}
          </p>
          <p className="text-[10px] text-on-surface-variant/70 font-tajawal text-center">
            أرسل هذه البصمة للمطور للحصول على كود التفعيل المخصص لجهازك
          </p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-cairo text-center">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl text-xs font-cairo text-center">
            {successMsg}
          </div>
        )}

        {/* Key Input & Action Buttons */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5 font-cairo">كود التفعيل (License Key):</label>
            <div className="relative">
              <input
                type="text"
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                className="w-full h-11 px-4 pr-10 rounded-xl bg-surface-container border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all dir-ltr"
              />
              <KeyRound className="w-4 h-4 text-on-surface-variant absolute right-3 top-3.5 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => handleActivate()}
              disabled={isActivating}
              className="flex-1 h-11 bg-primary text-on-primary rounded-xl text-xs font-bold font-cairo hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isActivating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isActivating ? 'جاري التحقق...' : 'تفعيل الترخيص الآن'}</span>
            </button>

            <label className="h-11 px-4 border border-outline-variant/30 hover:border-primary/50 bg-surface-container hover:bg-surface-container-high rounded-xl text-xs font-bold font-cairo text-on-surface transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Upload className="w-4 h-4 text-primary" />
              <span>استيراد ملف (.lic)</span>
              <input type="file" accept=".lic,.key,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Bottom Bar: Logout Option */}
        <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors font-cairo font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج / تبديل الحساب</span>
          </button>

          <span className="text-[11px] text-on-surface-variant font-tajawal">
            AN POS V3.0 Pro
          </span>
        </div>
      </div>
    </div>
  );
}
