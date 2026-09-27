import React from 'react';
import {
  KeyRound, Radio, Server, Activity, Eye, EyeOff, ShieldCheck,
  CheckCircle2, AlertCircle, Check,
  Lock, Terminal
} from 'lucide-react';
import { LanServerDiscovery } from './LanServerDiscovery';
import type {
  ConnectionMethod,
  DiscoveredServer,
  TestConnectionResult,
  PairingStatusResult,
} from '../types';

interface NewTerminalPairingFormProps {
  connectionMethod: ConnectionMethod;
  setConnectionMethod: (method: ConnectionMethod) => void;
  isScanningServers: boolean;
  scanPerformed: boolean;
  discoveredServers: DiscoveredServer[];
  clientUrlInput: string;
  setClientUrlInput: (url: string) => void;
  clientTermCodeInput: string;
  setClientTermCodeInput: (code: string) => void;
  pairingKeyInput: string;
  setPairingKeyInput: (key: string) => void;
  showPairKeyInput: boolean;
  setShowPairKeyInput: (show: boolean | ((prev: boolean) => boolean)) => void;
  isPairingLoading: boolean;
  testClientUrlLoading: boolean;
  testClientUrlResult: TestConnectionResult | null;
  pairingStatusResult: PairingStatusResult | null;
  handleScanLanServers: () => void;
  handleTestServerConnection: (url?: string) => void;
  handlePairWithServer: () => void;
}

export const NewTerminalPairingForm: React.FC<NewTerminalPairingFormProps> = ({
  connectionMethod,
  setConnectionMethod,
  isScanningServers,
  scanPerformed,
  discoveredServers,
  clientUrlInput,
  setClientUrlInput,
  clientTermCodeInput,
  setClientTermCodeInput,
  pairingKeyInput,
  setPairingKeyInput,
  showPairKeyInput,
  setShowPairKeyInput,
  isPairingLoading,
  testClientUrlLoading,
  testClientUrlResult,
  pairingStatusResult,
  handleScanLanServers,
  handleTestServerConnection,
  handlePairWithServer,
}) => {
  // حساب التقدم الإرشادي للخطوات
  const isStep1Done = Boolean(clientUrlInput && clientUrlInput.trim().length > 7);
  const isStep2Done = Boolean(testClientUrlResult?.success);
  const isStep3Done = Boolean(pairingKeyInput && pairingKeyInput.trim().length >= 4);

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-6">
      
      {/* 1. الترويسة ومبدل طريقة البحث */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold font-cairo text-on-surface">
              إعداد واقتران محطة الكاشير
            </h3>
          </div>
          <p className="text-xs text-on-surface-variant font-tajawal">
            اختر طريقة العثور على خادم المتجر الرئيسي:
          </p>
        </div>

        <div className="flex items-center p-1 rounded-2xl bg-surface border border-outline-variant/20 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setConnectionMethod('discovery')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-cairo transition-all cursor-pointer flex items-center gap-1.5 ${
              connectionMethod === 'discovery'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>البحث التلقائي</span>
          </button>
          <button
            type="button"
            onClick={() => setConnectionMethod('manual')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-cairo transition-all cursor-pointer flex items-center gap-1.5 ${
              connectionMethod === 'manual'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>إدخال يدوي</span>
          </button>
        </div>
      </div>

      {/* 2. شريط الخطوات الإرشادي التفاعلي (3-Step Progress Track) */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-surface/70 border border-outline-variant/15 text-xs">
        <div className={`p-2 rounded-xl flex items-center gap-2 transition-all ${
          isStep1Done ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant'
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
            isStep1Done ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {isStep1Done ? <Check className="w-3 h-3" /> : '1'}
          </div>
          <span className="truncate text-[11px] font-cairo">1. تحديد السيرفر</span>
        </div>

        <div className={`p-2 rounded-xl flex items-center gap-2 transition-all ${
          isStep2Done ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold' : 'text-on-surface-variant'
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
            isStep2Done ? 'bg-emerald-600 text-white' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {isStep2Done ? <Check className="w-3 h-3" /> : '2'}
          </div>
          <span className="truncate text-[11px] font-cairo">2. فحص الاستجابة</span>
        </div>

        <div className={`p-2 rounded-xl flex items-center gap-2 transition-all ${
          isStep3Done ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200 font-bold' : 'text-on-surface-variant'
        }`}>
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
            isStep3Done ? 'bg-amber-600 text-white' : 'bg-surface-container text-on-surface-variant'
          }`}>
            {isStep3Done ? <Check className="w-3 h-3" /> : '3'}
          </div>
          <span className="truncate text-[11px] font-cairo">3. رمز PIN والاقتران</span>
        </div>
      </div>

      {/* 3. وضع البحث التلقائي الذكي */}
      {connectionMethod === 'discovery' && (
        <LanServerDiscovery
          isScanningServers={isScanningServers}
          scanPerformed={scanPerformed}
          discoveredServers={discoveredServers}
          clientUrlInput={clientUrlInput}
          onSelectServer={(url) => {
            setClientUrlInput(url);
            handleTestServerConnection(url);
          }}
          onScan={handleScanLanServers}
        />
      )}

      {/* 4. حقول إدخال العنوان ورمز نقطة البيع */}
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
          
          {/* حقل عنوان السيرفر */}
          <div className="sm:col-span-8 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface font-cairo flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-primary" />
                <span>عنوان الخادم الرئيسي (Server URL):</span>
              </label>
              <span className="text-[11px] text-on-surface-variant font-mono">http://IP:3000</span>
            </div>

            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={clientUrlInput}
                onChange={(e) => setClientUrlInput(e.target.value)}
                placeholder="http://192.168.1.50:3000"
                className="w-full h-11 px-3.5 pl-24 rounded-xl border border-outline-variant/30 bg-surface text-on-surface font-mono text-xs sm:text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all shadow-2xs"
              />
              <button
                type="button"
                disabled={testClientUrlLoading || !clientUrlInput}
                onClick={() => handleTestServerConnection(clientUrlInput)}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary hover:text-primary-hover text-xs font-bold font-cairo transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 border border-outline-variant/25 active:scale-95"
              >
                <Activity className={`w-3.5 h-3.5 ${testClientUrlLoading ? 'animate-spin' : ''}`} />
                <span>Ping</span>
              </button>
            </div>

            {/* اختصارات سريعة لعنوان السيرفر */}
            {!clientUrlInput && (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="text-[10px] text-on-surface-variant font-cairo">اقتراحات سريعة:</span>
                <button
                  type="button"
                  onClick={() => {
                    setClientUrlInput('http://localhost:3000');
                    handleTestServerConnection('http://localhost:3000');
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container hover:bg-primary/10 text-primary border border-outline-variant/15 cursor-pointer transition-colors"
                >
                  localhost:3000
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setClientUrlInput('http://192.168.1.50:3000');
                    handleTestServerConnection('http://192.168.1.50:3000');
                  }}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-container hover:bg-primary/10 text-primary border border-outline-variant/15 cursor-pointer transition-colors"
                >
                  192.168.1.50:3000
                </button>
              </div>
            )}
          </div>

          {/* حقل رمز الكاشير */}
          <div className="sm:col-span-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface font-cairo flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span>رمز الكاشير (Code):</span>
              </label>
              <span className="text-[10px] text-on-surface-variant font-cairo">المحطة الحالية</span>
            </div>

            <input
              type="text"
              value={clientTermCodeInput}
              onChange={(e) => setClientTermCodeInput(e.target.value.toUpperCase())}
              placeholder="T02"
              maxLength={6}
              className="w-full h-11 px-3.5 rounded-xl border border-outline-variant/30 bg-surface text-on-surface font-mono font-black text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none text-center tracking-wider transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* 5. بطاقة مفتاح الربط السري PIN */}
        <div className="p-5 rounded-2xl bg-surface border border-outline-variant/20 space-y-4 shadow-2xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 font-cairo">
                <Lock className="w-3.5 h-3.5 text-primary" />
                <span>مفتاح الربط السري (Connection PIN من شاشة السيرفر):</span>
              </label>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                مشفر ومحمي
              </span>
            </div>

            <div className="relative">
              <input
                type={showPairKeyInput ? 'text' : 'password'}
                value={pairingKeyInput}
                onChange={(e) => setPairingKeyInput(e.target.value)}
                placeholder="مثال: 849201 أو A1B2-C3D4"
                className="w-full h-12 px-4 pl-12 rounded-xl border border-outline-variant/30 bg-surface-container text-on-surface font-mono text-base tracking-widest focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPairKeyInput((prev) => !prev)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer p-1.5 rounded-lg hover:bg-surface transition-colors"
                title={showPairKeyInput ? 'إخفاء الرمز' : 'إظهار الرمز'}
              >
                {showPairKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <p className="text-[11px] text-on-surface-variant font-tajawal">
              تجد هذا الرمز في شاشة الخادم الرئيسي تحت: الإعدادات ➔ الشبكة والخادم المحلي، أو في تبويب «إعداد الخادم ومعلوماته».
            </p>
          </div>

          {/* زر الاقتران الكبير مع التغذية الراجعة */}
          <button
            type="button"
            disabled={isPairingLoading || !clientUrlInput || !pairingKeyInput}
            onClick={handlePairWithServer}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:brightness-105 disabled:opacity-50 text-on-primary text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-sm cursor-pointer active:scale-98"
          >
            <ShieldCheck className={`w-4 h-4 ${isPairingLoading ? 'animate-spin' : ''}`} />
            <span>{isPairingLoading ? 'جارٍ التحقق وتوثيق الجهاز...' : 'ربط وتوثيق نقطة البيع الآن'}</span>
          </button>
        </div>

        {/* 6. رسائل نتائج الاقتران أو الفحص */}
        {pairingStatusResult && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 animate-fade-in shadow-2xs ${
              pairingStatusResult.success
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200'
            }`}
          >
            {pairingStatusResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-tajawal leading-relaxed">{pairingStatusResult.msg}</span>
          </div>
        )}

        {testClientUrlResult && !pairingStatusResult && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in shadow-2xs ${
              testClientUrlResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {testClientUrlResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="font-tajawal">{testClientUrlResult.msg}</span>
            </div>

            {testClientUrlResult.pingMs !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface border border-outline-variant/20">
                {testClientUrlResult.pingMs} ms
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
