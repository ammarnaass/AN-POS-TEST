import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  WifiOff,
  Server,
  RefreshCw,
  Activity,
  Layers,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { useRealtimeStatus } from '@/lib/realtimeEventBus';

interface RealtimeSyncBadgeProps {
  compact?: boolean;
  className?: string;
}

export const RealtimeSyncBadge: React.FC<RealtimeSyncBadgeProps> = ({
  compact = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const { status, isConnected, reconnect } = useRealtimeStatus();
  const [showDetails, setShowDetails] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);

  const handleManualReconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManualReconnecting(true);
    reconnect();
    setTimeout(() => {
      setIsManualReconnecting(false);
    }, 1200);
  };

  // إعداد النمط والألوان حسب الحالة
  const getBadgeConfig = () => {
    switch (status.state) {
      case 'server_master':
        return {
          bg: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
          dot: 'bg-blue-500',
          pulse: false,
          label: 'الخادم الرئيسي',
          icon: <Server className="w-3.5 h-3.5" />,
          tooltip: 'هذا الجهاز هو الخادم المركزي لشبكة AN-POS LAN',
        };
      case 'connected':
        return {
          bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          pulse: true,
          label: status.transport === 'sse' ? 'تزامن مباشر (SSE)' : 'تزامن مباشر',
          icon: <Wifi className="w-3.5 h-3.5" />,
          tooltip: `متصل لحظياً بالخادم (${status.transport.toUpperCase()})`,
        };
      case 'connecting':
      case 'reconnecting':
        return {
          bg: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          pulse: true,
          label: 'جارٍ الاتصال...',
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
          tooltip: `محاولة الاتصال بالخادم (${status.reconnectAttempts})`,
        };
      case 'disconnected':
        return {
          bg: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
          pulse: false,
          label: 'انقطع الاتصال',
          icon: <WifiOff className="w-3.5 h-3.5" />,
          tooltip: 'غير متصل بالخادم المحلي — انقر للمحاولة مجدداً',
        };
      default:
        return {
          bg: 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
          pulse: false,
          label: 'محلي',
          icon: <Activity className="w-3.5 h-3.5" />,
          tooltip: 'وضع الجهاز الواحد المستقل',
        };
    }
  };

  const config = getBadgeConfig();

  // لا نعرض شيئاً في وضع Standalone إذا كان compact لتوفير المساحة
  if (status.state === 'standalone' && compact) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {/* زر الشارة الرئيسية */}
      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        title={config.tooltip}
        className={`group flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs select-none active:scale-95 ${config.bg}`}
      >
        {/* نقطة الحالة النابضة */}
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
        </span>

        {/* الأيقونة */}
        <span className="shrink-0">{config.icon}</span>

        {/* النص (إذا لم يكن مضغوطاً تماماً) */}
        {!compact && (
          <span className="truncate hidden sm:inline font-cairo text-[11px] sm:text-xs font-bold">
            {config.label}
          </span>
        )}

        {/* زمن الاستجابة في حال الاتصال */}
        {!compact && isConnected && status.lastPingMs !== null && status.lastPingMs > 0 && (
          <span className="hidden lg:inline text-[9px] font-mono px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 opacity-80">
            {status.lastPingMs}ms
          </span>
        )}

        <ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity hidden sm:inline" />
      </button>

      {/* نافذة التفاصيل المنبثقة (Pop-up Diagnostics) */}
      {showDetails && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-2xs"
            onClick={() => setShowDetails(false)}
          />

          <div
            dir="rtl"
            className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-surface-container-high/95 dark:bg-slate-900/95 backdrop-blur-xl border border-outline-variant/30 dark:border-slate-800 shadow-2xl p-4 z-50 text-right animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${config.bg}`}>
                  {config.icon}
                </span>
                <div>
                  <h4 className="text-xs font-black text-on-surface font-cairo">
                    حالة ناقل الأحداث المباشر
                  </h4>
                  <p className="text-[10px] text-on-surface-variant/70 font-mono">
                    Live Event Bus (Phase 3)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Info */}
            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-cairo">دور الجهاز:</span>
                <span className="font-bold font-cairo text-on-surface px-2 py-0.5 rounded bg-surface border border-outline-variant/20">
                  {status.role === 'server' ? 'حاسوب الخادم (Master)' : 'محطة طرفية (Client)'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-cairo">قناة التوصيل:</span>
                <span className="font-mono text-[11px] font-bold text-on-surface px-2 py-0.5 rounded bg-surface border border-outline-variant/20">
                  {status.transport === 'websocket'
                    ? 'WebSocket (RFC 6455)'
                    : status.transport === 'sse'
                    ? 'Server-Sent Events (SSE)'
                    : status.transport === 'ipc'
                    ? 'Local IPC Bus'
                    : 'غير متصل'}
                </span>
              </div>

              {status.role === 'client' && (
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant font-cairo">عنوان الخادم:</span>
                  <span className="font-mono text-[11px] font-bold text-primary truncate max-w-[150px]" dir="ltr">
                    {status.serverUrl || 'غير محدد'}
                  </span>
                </div>
              )}

              {status.lastPingMs !== null && status.lastPingMs > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant font-cairo">زمن الاستجابة (Latency):</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {status.lastPingMs} ms
                  </span>
                </div>
              )}

              {status.reconnectAttempts > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant font-cairo">محاولات الإعادة:</span>
                  <span className="font-mono font-bold text-amber-500">
                    {status.reconnectAttempts}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-outline-variant/20 dark:border-slate-800 flex items-center gap-2">
              {status.role === 'client' && (
                <button
                  type="button"
                  onClick={handleManualReconnect}
                  disabled={isManualReconnecting}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManualReconnecting ? 'animate-spin' : ''}`} />
                  <span>إعادة المحاولة الآن</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowDetails(false);
                  navigate('/settings');
                }}
                className="py-1.5 px-3 rounded-xl bg-surface hover:bg-surface-container-highest border border-outline-variant/25 text-on-surface text-xs font-bold font-cairo flex items-center justify-center gap-1 transition-all cursor-pointer"
                title="إعدادات الشبكة"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>الإعدادات</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
