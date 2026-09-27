import React from 'react';
import { Radio, RefreshCw, Server, Check, Wifi, Sparkles, Activity } from 'lucide-react';
import type { DiscoveredServer } from '../types';

interface LanServerDiscoveryProps {
  isScanningServers: boolean;
  scanPerformed: boolean;
  discoveredServers: DiscoveredServer[];
  clientUrlInput: string;
  onSelectServer: (url: string) => void;
  onScan: () => void;
}

export const LanServerDiscovery: React.FC<LanServerDiscoveryProps> = ({
  isScanningServers,
  scanPerformed,
  discoveredServers,
  clientUrlInput,
  onSelectServer,
  onScan,
}) => {
  return (
    <div className="space-y-4">
      {/* بطاقة تشغيل المسح التلقائي */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-primary/30 transition-all">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Radio className={`w-4 h-4 ${isScanningServers ? 'animate-ping text-primary' : 'text-primary'}`} />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs sm:text-sm font-bold font-cairo text-on-surface flex items-center gap-2">
              <span>كشف خوادم الشبكة المحلية (mDNS / UDP)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                تلقائي ذكي
              </span>
            </span>
            <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
              يبحث عن أي حاسوب خادم AN POS على نفس الراوتر دون الحاجة لمعرفة عنوان IP.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isScanningServers}
          onClick={onScan}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs active:scale-98 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanningServers ? 'animate-spin' : ''}`} />
          <span>{isScanningServers ? 'جارٍ مسح الشبكة...' : 'مسح الشبكة الآن'}</span>
        </button>
      </div>

      {/* مؤشر حالة المسح النشط */}
      {isScanningServers && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center gap-3 animate-fade-in">
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </div>
          <span className="text-xs font-bold font-cairo text-primary">
            جارٍ إرسال حزم الاستكشاف عبر موجات البث المحلي UDP وفحص المنفذ 3000...
          </span>
        </div>
      )}

      {/* قائمة الخوادم المكتشفة */}
      {discoveredServers.length > 0 ? (
        <div className="space-y-2.5 pt-1 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-cairo text-on-surface flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>الخوادم المتاحة (انقر لاختيار الخادم):</span>
            </span>
            <span className="text-[11px] font-mono text-on-surface-variant">
              تم العثور على {discoveredServers.length} خادم
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {discoveredServers.map((srv, idx) => {
              const isSelected = clientUrlInput === srv.serverUrl;
              return (
                <div
                  key={`${srv.ip}-${idx}`}
                  onClick={() => onSelectServer(srv.serverUrl)}
                  className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/25 shadow-xs scale-[1.01]'
                      : 'border-outline-variant/25 bg-surface hover:bg-surface-container hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 font-bold font-cairo text-xs text-on-surface">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-primary group-hover:bg-primary/20'
                      }`}>
                        <Server className="w-3.5 h-3.5" />
                      </div>
                      <span className="truncate">{srv.shopName || srv.deviceName || 'خادم AN POS'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary truncate" dir="ltr">
                        {srv.serverUrl}
                      </span>
                      {srv.version && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container border border-outline-variant/15 text-on-surface-variant">
                          v{srv.version}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                      srv.pingMs && srv.pingMs < 10
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                        : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      <Activity className="w-2.5 h-2.5" />
                      <span>{srv.pingMs ? `${srv.pingMs} ms` : 'متاح'}</span>
                    </span>

                    {isSelected && (
                      <span className="text-[10px] font-bold font-cairo text-primary flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        <span>محدد</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : scanPerformed && !isScanningServers ? (
        <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 text-center space-y-2 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto">
            <Wifi className="w-4 h-4 opacity-60" />
          </div>
          <p className="text-xs text-on-surface-variant font-tajawal">
            لم يتم العثور على خادم تلقائياً. يرجى التبديل لـ «إدخال يدوي» وكتابة عنوان IP مباشرة.
          </p>
        </div>
      ) : null}
    </div>
  );
};
