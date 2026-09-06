import React from 'react';
import { Upload, Smartphone, RefreshCw, Zap, ShieldCheck, KeyRound, AlertCircle, CheckCircle2, Copy, Check } from 'lucide-react';
import { formatTrialDate } from '@/services/trialService';

interface ActivationTabProps {
  [key: string]: any;
}

export default function ActivationTab({
  activationInput,
  addNotification,
  copiedFingerprint,
  handleActivate,
  handleCopyFingerprint,
  handleDeactivate,
  handleFileUpload,
  isActivating,
  licenseStatus,
  setActivationInput,
  trial
}: ActivationTabProps) {
  return (
    <div className="space-y-6">
            {/* بطاقة حالة الترخيص */}
            <div className={`glass-card rounded-2xl border p-6 transition-all shadow-sm ${
              licenseStatus?.status === 'active'
                ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-surface to-emerald-500/10'
                : licenseStatus?.status === 'expired'
                ? 'border-rose-500/30 bg-gradient-to-br from-rose-500/5 via-surface to-rose-500/10'
                : licenseStatus?.status === 'tampered'
                ? 'border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-surface to-amber-500/10'
                : 'border-primary/20 bg-gradient-to-br from-primary/5 via-surface to-primary/10'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${
                    licenseStatus?.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : licenseStatus?.status === 'expired' || licenseStatus?.status === 'tampered'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                      : 'bg-primary/20 text-primary'
                  }`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-headline-md text-on-surface font-black">حالة ترخيص النظام</h2>
                      {licenseStatus?.status === 'active' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مفعّل ورسمي (Ed25519)
                        </span>
                      ) : licenseStatus?.status === 'expired' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          انتهت الصلاحية
                        </span>
                      ) : licenseStatus?.status === 'tampered' ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          المفتاح مربوط بجهاز آخر
                        </span>
                      ) : trial.isActive ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" />
                          فترة تجريبية (متبقي {trial.remainingDays} يوم)
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant/30">
                          غير مفعّل
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      نظام التراخيص في AN POS يعمل بشكل كامل دون الحاجة للإنترنت (Offline-First).
                    </p>
                  </div>
                </div>

                {licenseStatus?.status === 'active' && (
                  <button
                    onClick={handleDeactivate}
                    className="px-4 py-2 border border-rose-500/30 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-label-sm font-bold transition-all"
                  >
                    إلغاء تفعيل هذا الجهاز
                  </button>
                )}
              </div>

              {/* تفاصيل الترخيص */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container/60 border border-outline-variant/10 rounded-xl p-4">
                  <p className="text-label-sm text-on-surface-variant mb-1">معرّف المتجر</p>
                  <p className="font-mono text-title-md font-bold text-on-surface">
                    {licenseStatus?.storeId || '—'}
                  </p>
                </div>

                <div className="bg-surface-container/60 border border-outline-variant/10 rounded-xl p-4">
                  <p className="text-label-sm text-on-surface-variant mb-1">نوع الاشتراك والصلاحية</p>
                  <p className="font-bold text-title-md text-on-surface">
                    {licenseStatus?.expiresAt === 0
                      ? 'مدى الحياة (Lifetime)'
                      : licenseStatus?.expiresAt
                      ? new Date(licenseStatus.expiresAt * 1000).toLocaleDateString('ar-EG')
                      : 'فترة تجريبية (7 أيام)'}
                  </p>
                  {licenseStatus?.daysRemaining !== null && licenseStatus?.daysRemaining !== undefined ? (
                    <span className="text-[11px] text-amber-600 font-bold">
                      متبقي {licenseStatus.daysRemaining} يوم
                    </span>
                  ) : trial?.isActive ? (
                    <span className="text-[11px] text-amber-600 font-bold">
                      متبقي {trial.remainingDays} يوم ({trial.remainingSales} فاتورة)
                    </span>
                  ) : null}
                </div>

                <div className="bg-surface-container/60 border border-outline-variant/10 rounded-xl p-4">
                  <p className="text-label-sm text-on-surface-variant mb-1">أجهزة الهاتف المصرح بربطها</p>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <p className="font-bold text-title-md text-on-surface">
                      {licenseStatus?.maxMobileDevices ?? 5} أجهزة
                    </p>
                  </div>
                </div>

                <div className="bg-surface-container/60 border border-outline-variant/10 rounded-xl p-4">
                  <p className="text-label-sm text-on-surface-variant mb-1">بصمة عتاد الجهاز (Hardware ID)</p>
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-mono text-xs font-bold text-on-surface truncate" title={licenseStatus?.hardwareFingerprint}>
                      {licenseStatus?.hardwareFingerprint || '—'}
                    </p>
                    <button
                      onClick={handleCopyFingerprint}
                      className="p-1.5 hover:bg-surface-container-high rounded-lg text-primary transition-all shrink-0"
                      title="نسخ بصمة الجهاز"
                    >
                      {copiedFingerprint ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {trial?.isActive && (
                <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-on-surface font-cairo">
                        الفترة التجريبية المجانية محددة بـ 7 أيام
                      </p>
                      <p className="text-[11px] text-on-surface-variant font-tajawal mt-0.5">
                        تاريخ البدء: <span className="font-bold font-mono text-on-surface">{formatTrialDate(trial.startedAt)}</span> — تاريخ الانتهاء الصارم: <span className="font-bold font-mono text-rose-500">{formatTrialDate(trial.endsAt)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant/20">
                    متبقي: {trial.remainingDays} يوم و {trial.remainingHours} ساعة
                  </div>
                </div>
              )}
            </div>

            {/* بطاقة إدخال المفتاح أو استيراد ملف الترخيص */}
            <div className="glass-card rounded-2xl border border-outline-variant/20 p-6">
              <div className="flex items-center gap-3 mb-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {licenseStatus?.status === 'active' ? 'تحديث أو استبدال مفتاح الترخيص' : 'إدخال مفتاح التفعيل'}
                </h3>
              </div>
              <p className="text-body-md text-on-surface-variant mb-6">
                ألصق كود التفعيل المستلم بصيغة <span className="font-mono text-primary font-bold">ANPS-XXXXX-XXXXX...</span> أو قم باستيراد ملف الترخيص (<span className="font-mono font-bold">.lic</span>).
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-label-md text-on-surface mb-2 font-bold">كود التفعيل الرقمي (Digital License Key)</label>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={activationInput}
                      onChange={(e) => setActivationInput(e.target.value)}
                      placeholder="ANPS-XXXXX-XXXXX-XXXXX-XXXXX-..."
                      className="w-full px-4 py-3 border border-outline-variant/20 rounded-xl text-left font-mono text-sm bg-surface-container focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all uppercase"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleActivate}
                    disabled={isActivating || !activationInput.trim()}
                    className="px-8 py-3 bg-primary text-on-primary rounded-xl text-label-md font-bold hover:bg-primary-container transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isActivating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        جاري التحقق والتفعيل...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        تفعيل المفتاح الآن
                      </>
                    )}
                  </button>

                  <label className="px-5 py-3 border border-outline-variant/30 hover:bg-surface-container rounded-xl text-label-md font-bold text-on-surface cursor-pointer transition-all flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <span>استيراد ملف ترخيص (.lic)</span>
                    <input
                      type="file"
                      accept=".lic,.json,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setActivationInput(text);
                      } catch { /* ignore */ }
                    }}
                    className="px-4 py-3 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-xl text-label-sm font-medium transition-all"
                  >
                    لصق من الحافظة
                  </button>
                </div>
              </div>
            </div>

            {/* رسالة توجيهية وطلب الترخيص */}
            <div className="bg-gradient-to-br from-primary/10 via-surface to-primary/5 rounded-2xl border border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <h4 className="font-cairo text-headline-sm font-bold text-on-surface">هل تحتاج لمفتاح ترخيص أو ترقية عدد الأجهزة؟</h4>
                <p className="text-body-sm text-on-surface-variant max-w-xl">
                  تواصل مع المطور أو الموزع المعتمد للحصول على مفتاح ترخيص موقّع خاص بمتجرك. لا يتطلب التفعيل أي اتصال بالإنترنت ويعمل مدى الحياة.
                </p>
              </div>
              <button
                onClick={() => addNotification({
                  title: 'معلومات الدعم الفني',
                  message: `بصمة جهازك: ${licenseStatus?.hardwareFingerprint || '—'}. يرجى إرسالها لمزود الخدمة.`,
                  type: 'info'
                })}
                className="px-6 py-3 bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface rounded-xl text-label-md font-bold transition-all shrink-0 border border-outline-variant/20 shadow-sm"
              >
                طلب ترخيص جديد
              </button>
            </div>
          </div>
  );
}
