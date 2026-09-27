import React from 'react';
import {
  Server, Activity, Copy, CheckCheck, CheckCircle2, AlertCircle,
  Key, Eye, EyeOff, QrCode, HelpCircle, CheckCircle
} from 'lucide-react';
import { BarcodeSvg } from '@/features/barcode/components/BarcodeSvg';
import PairingQR, { type PairingData } from '@/features/settings/components/PairingQR';
import type { TestConnectionResult } from '../types';

interface MasterServerInfoSectionProps {
  activeServerUrl?: string;
  clientUrlInput: string;
  copiedField: string | null;
  testClientUrlLoading: boolean;
  testClientUrlResult: TestConnectionResult | null;
  liveEventBusStatus: {
    state: string;
    transport?: string;
    lastPingMs?: number;
    [key: string]: unknown;
  };
  showMasterServerKey: boolean;
  setShowMasterServerKey: (show: boolean | ((prev: boolean) => boolean)) => void;
  effectiveServerKey: string;
  effectivePairingData: PairingData;
  handleCopy: (text: string, key: string) => void;
  handleTestServerConnection: (url?: string) => void;
  handleMakeServerMaster: () => void;
}

export const MasterServerInfoSection: React.FC<MasterServerInfoSectionProps> = ({
  activeServerUrl,
  clientUrlInput,
  copiedField,
  testClientUrlLoading,
  testClientUrlResult,
  liveEventBusStatus,
  showMasterServerKey,
  setShowMasterServerKey,
  effectiveServerKey,
  effectivePairingData,
  handleCopy,
  handleTestServerConnection,
  handleMakeServerMaster,
}) => {
  return (
    <div className="space-y-5 animate-fade-in">
      {/* بطاقة معلومات وهوية الخادم الرئيسي الحية */}
      <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold font-cairo text-on-surface">
                معلومات وهوية الخادم الرئيسي (Master Server Details)
              </h3>
            </div>
            <p className="text-xs text-on-surface-variant">
              بيانات الخادم المركزي والرمز السري والباركود للربط الفوري مع شاشات الكاشير وهواتف الجرد.
            </p>
          </div>

          <button
            type="button"
            disabled={testClientUrlLoading}
            onClick={() => handleTestServerConnection(activeServerUrl || clientUrlInput)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
          >
            <Activity className={`w-3.5 h-3.5 ${testClientUrlLoading ? 'animate-spin' : ''}`} />
            <span>فحص استجابة الخادم (Ping)</span>
          </button>
        </div>

        {/* شبكة بيانات الخادم التفصيلية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* عنوان السيرفر */}
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 space-y-1">
            <span className="text-[11px] font-bold font-cairo text-on-surface-variant block">عنوان URL والـ IP:</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-primary truncate" dir="ltr">
                {activeServerUrl || clientUrlInput || 'لم يُحدد'}
              </span>
              {(activeServerUrl || clientUrlInput) && (
                <button
                  type="button"
                  onClick={() => handleCopy(activeServerUrl || clientUrlInput, 'srv_url')}
                  className="p-1 rounded text-on-surface-variant hover:text-primary cursor-pointer"
                  title="نسخ"
                >
                  {copiedField === 'srv_url' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* منافذ الاتصال النشطة */}
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 space-y-1">
            <span className="text-[11px] font-bold font-cairo text-on-surface-variant block">منافذ الخدمة النشطة:</span>
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-on-surface">
              <span className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/15 text-primary">
                HTTP: 3000
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/15 text-emerald-600 dark:text-emerald-400">
                WS: 3001
              </span>
            </div>
          </div>

          {/* سرعة الاستجابة الحية */}
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 space-y-1">
            <span className="text-[11px] font-bold font-cairo text-on-surface-variant block">سرعة الاستجابة (Ping):</span>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                {testClientUrlResult?.pingMs ?? liveEventBusStatus.lastPingMs ?? 5}
              </span>
              <span className="text-[11px] font-bold text-on-surface-variant">ms</span>
              <span className="mr-auto text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                استجابة فورية
              </span>
            </div>
          </div>

          {/* بروتوكول النقل الحي */}
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 space-y-1">
            <span className="text-[11px] font-bold font-cairo text-on-surface-variant block">بروتوكول البث اللحظي:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono font-bold text-xs text-on-surface uppercase">
                {liveEventBusStatus.transport || 'WebSocket (ws://)'}
              </span>
            </div>
          </div>
        </div>

        {/* نتيجة فحص الاستجابة المباشر */}
        {testClientUrlResult && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in ${
              testClientUrlResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {testClientUrlResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testClientUrlResult.msg}</span>
            </div>
            {testClientUrlResult.version && (
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface text-on-surface border border-outline-variant/20">
                الإصدار: v{testClientUrlResult.version}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* بطاقة الرمز السري للخادم ورمز الباركود / QR كود المباشر     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* بطاقة الرمز السري للخادم (PIN / Connection Key) */}
        <div className="md:col-span-6 p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              <h4 className="text-sm font-bold font-cairo text-on-surface">
                رمز الاقتران السري للخادم (Connection Key / PIN)
              </h4>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              يُستخدم هذا الرمز السري لتوثيق محطات الكاشير الفرعية وهواتف تطبيق AN POS ومنع الأجهزة الغريبة من اختراق بيانات المتجر.
            </p>
          </div>

          {/* صندوق عرض المفتاح السري بأرقام عريضة */}
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant font-cairo">الرمز السري النشط:</span>
              <button
                type="button"
                onClick={() => setShowMasterServerKey((prev) => !prev)}
                className="text-xs text-primary hover:text-primary-hover font-bold font-cairo flex items-center gap-1 cursor-pointer"
              >
                {showMasterServerKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showMasterServerKey ? 'إخفاء الرمز' : 'إظهار الرمز'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="font-mono font-black text-lg sm:text-xl tracking-widest text-on-surface" dir="ltr">
                {showMasterServerKey ? effectiveServerKey : '••••••••••••'}
              </span>

              <button
                type="button"
                onClick={() => handleCopy(effectiveServerKey, 'master_key')}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                {copiedField === 'master_key' ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'master_key' ? 'تم النسخ!' : 'نسخ الرمز'}</span>
              </button>
            </div>

            {/* باركود 1D خطي للرمز السري لمسحه بقارئ الباركود اليدوي */}
            <div className="p-3 bg-white rounded-xl border border-outline-variant/20 flex flex-col items-center justify-center space-y-1">
              <BarcodeSvg
                value={effectiveServerKey}
                format="code128"
                height={38}
                width={1.6}
                className="py-0.5"
              />
              <span className="text-[10px] font-mono text-slate-700 font-bold" dir="ltr">
                *{effectiveServerKey}*
              </span>
            </div>

            <p className="text-[11px] text-on-surface-variant/80 text-center">
              امسح الباركود الخطي أعلاه مباشرة باستخدام قارئ الباركود اليدوي (Barcode Gun) أو أدخل الرمز في شاشة نقطة البيع الفرعية.
            </p>
          </div>
        </div>

        {/* بطاقة الباركود ورمز الاستجابة السريعة (QR Code) */}
        <div className="md:col-span-6 p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-bold font-cairo text-on-surface">
                باركود ورمز الاستجابة السريعة (Pairing QR & Barcode)
              </h4>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              امسح الرمز بكاميرا تطبيق الهاتف أو قارئ الباركود للاقتران الفوري دون كتابة عناوين IP.
            </p>
          </div>

          {/* مكوّن عرض رمز الـ QR */}
          <div className="p-3 rounded-2xl bg-surface border border-outline-variant/20 flex flex-col items-center justify-center">
            <PairingQR
              data={effectivePairingData}
              title="رمز اقتران الخادم الرئيسي"
              subtitle="امسح الرمز عبر تطبيق AN POS للربط اللحظي"
            />
          </div>
        </div>
      </div>

      {/* إرشادات تشخيص وضبط خادم المتجر */}
      <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-4">
        <h4 className="text-sm font-bold font-cairo text-on-surface flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary shrink-0" />
          <span>دليل وتوصيات ضبط الخادم الرئيسي في المتجر:</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs text-on-surface-variant leading-relaxed">
          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/15 space-y-1.5">
            <span className="font-bold font-cairo text-on-surface flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>1. تثبيت عنوان IP ثابت للخادم:</span>
            </span>
            <p>
              يُنصح بتثبيت عنوان IP حاسوب الخادم (Static IP) داخل إعدادات الراوتر (DHCP Reservation) حتى لا يتغير عنوانه عند انقطاع الكهرباء.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/15 space-y-1.5">
            <span className="font-bold font-cairo text-on-surface flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>2. جدار حماية ويندوز (Firewall):</span>
            </span>
            <p>
              يجب السماح لتطبيق AN POS في جدار الحماية (Windows Defender Firewall) بالسماح للشبكات الخاصة (Private Networks) للمنفذ 3000.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-outline-variant/15 space-y-1.5">
            <span className="font-bold font-cairo text-on-surface flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>3. كابلات LAN عالية السرعة:</span>
            </span>
            <p>
              يفضل ربط حاسوب السيرفر بموزع الشبكة (Switch) أو الراوتر عبر كابل شبكة Ethernet Cat6 لأقصى استقرار وأقل زمن كمون.
            </p>
          </div>
        </div>
      </div>

      {/* خيار تحويل هذا الحاسوب إلى خادم رئيسي */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold font-cairo text-on-surface block">
            هل ترغب في جعل هذا الحاسوب هو «الخادم الرئيسي (Server Master)» للمتجر؟
          </span>
          <p className="text-xs text-on-surface-variant max-w-xl">
            عند تحويل هذا الحاسوب لخادم، سيعمل كموزع مركزي للبيانات ويمكن لكافة شاشات الكاشير الأخرى وهواتف الجرد الارتباط به مباشرة.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMakeServerMaster}
          className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant/25 text-primary text-xs font-bold font-cairo transition-all cursor-pointer shrink-0"
        >
          تحويل هذا الحاسوب إلى خادم رئيسي
        </button>
      </div>
    </div>
  );
};
