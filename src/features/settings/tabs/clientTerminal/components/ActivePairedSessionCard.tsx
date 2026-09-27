import React from 'react';
import {
  ShieldCheck, Trash2, Copy, CheckCheck, Activity,
  CheckCircle2, AlertCircle, Wifi, HardDrive
} from 'lucide-react';
import type { TestConnectionResult } from '../types';

interface ActivePairedSessionCardProps {
  isUnpairingLoading: boolean;
  activeServerUrl?: string;
  activeDeviceId?: string;
  copiedField: string | null;
  testClientUrlLoading: boolean;
  testClientUrlResult: TestConnectionResult | null;
  handleUnpairServer: () => void;
  handleCopy: (text: string, key: string) => void;
  handleTestServerConnection: (url?: string) => void;
}

export const ActivePairedSessionCard: React.FC<ActivePairedSessionCardProps> = ({
  isUnpairingLoading,
  activeServerUrl,
  activeDeviceId,
  copiedField,
  testClientUrlLoading,
  testClientUrlResult,
  handleUnpairServer,
  handleCopy,
  handleTestServerConnection,
}) => {
  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-6">
      
      {/* 1. ترويسة الجلسة المعتمدة وزر فك الارتباط */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-cairo text-on-surface">
                جلسة الكاشير الموثقة والمعتمدة
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                متصل ومحمي
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-tajawal">
              تم توثيق هذا الجهاز بمفتاح سري مشفر، وتتم مزامنة المبيعات والأسعار لحظياً.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isUnpairingLoading}
          onClick={handleUnpairServer}
          className="px-3.5 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-500/20 text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-98 shrink-0 self-start sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isUnpairingLoading ? 'جارٍ الإلغاء...' : 'إلغاء الاقتران'}</span>
        </button>
      </div>

      {/* 2. بطاقات بيانات الجلسة النشطة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
        {/* بطاقة عنوان الخادم */}
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-on-surface-variant font-cairo text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-primary" />
              <span>عنوان الخادم المتصل:</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">LAN Master</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="font-bold text-primary text-sm truncate" dir="ltr">
              {activeServerUrl || '---'}
            </span>
            {activeServerUrl && (
              <button
                type="button"
                onClick={() => handleCopy(activeServerUrl, 'url')}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary cursor-pointer transition-colors shrink-0"
                title="نسخ عنوان الخادم"
              >
                {copiedField === 'url' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* بطاقة معرف الجهاز */}
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-on-surface-variant font-cairo text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              <span>معرف الجهاز (Device ID):</span>
            </span>
            <span className="text-[10px] font-mono text-primary">Terminal Token</span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="font-bold text-on-surface text-sm truncate max-w-[200px]" dir="ltr">
              {activeDeviceId || '---'}
            </span>
            {activeDeviceId && (
              <button
                type="button"
                onClick={() => handleCopy(activeDeviceId, 'device')}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary cursor-pointer transition-colors shrink-0"
                title="نسخ معرف الجهاز"
              >
                {copiedField === 'device' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. ضمان الصمود في وضع أوفلاين */}
      <div className="p-4 rounded-2xl bg-surface/70 border border-outline-variant/15 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-on-surface-variant font-tajawal">
            وضعية المزامنة الهجينة (Hybrid LAN/Offline) نشطة: في حال انقطاع الشبكة فجأة، تستمر عمليات البيع والطباعة دون أي تعطيل للكاشير.
          </span>
        </div>

        <button
          type="button"
          disabled={testClientUrlLoading}
          onClick={() => handleTestServerConnection(activeServerUrl)}
          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 active:scale-98"
        >
          <Activity className={`w-3.5 h-3.5 ${testClientUrlLoading ? 'animate-spin' : ''}`} />
          <span>فحص استجابة الخادم (Ping Test)</span>
        </button>
      </div>

      {/* 4. نتيجة فحص الاستجابة */}
      {testClientUrlResult && (
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
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface text-on-surface border border-outline-variant/20">
              {testClientUrlResult.pingMs} ms
            </span>
          )}
        </div>
      )}
    </div>
  );
};
