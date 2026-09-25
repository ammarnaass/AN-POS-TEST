import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Wifi,
  WifiOff,
  Server,
  RefreshCw,
  Activity,
  ChevronDown,
  X,
  Clock,
  Globe,
  Cloud,
  CloudCheck,
  CheckCircle2,
  HardDrive,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { useRealtimeStatus } from '@/lib/realtimeEventBus';
import { useOutboxStatus } from '@/lib/offlineOutbox';
import { useCloudSyncStatus } from '@/lib/cloudSyncEngine';

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
  const { pendingCount, isSyncing, flushNow } = useOutboxStatus();
  const { status: cloudStatus, isSyncing: isCloudSyncing, syncNow: syncCloudNow } = useCloudSyncStatus();

  const [showDetails, setShowDetails] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({
    top: 64,
    left: 12,
    width: 360,
    maxHeight: 520,
  });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = Math.min(360, window.innerWidth - 24);

    // في واجهة RTL (من اليمين لليسار):
    // زر الشارة يقع غالباً في الجهة اليسرى لشريط العنوان (Topbar)
    // نحاول أولاً محاذاة الطرف الأيمن للقائمة مع الطرف الأيمن للزر
    let left = rect.right - dropdownWidth;

    // إذا خرجت القائمة من الحافة اليسرى للشاشة (لأن الزر قرب الحافة اليسرى < dropdownWidth):
    // نحاذي الطرف الأيسر للقائمة مع الطرف الأيسر للزر لتتوسع نحو الداخل (اليمين)
    if (left < 12) {
      left = rect.left;
    }

    // إذا تجاوزت الحافة اليمنى للشاشة
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = window.innerWidth - dropdownWidth - 12;
    }

    // أمان الحافة اليسرى المطلقة
    if (left < 12) {
      left = 12;
    }

    // حساب الموضع الرأسي والارتفاع الأقصى المتاح
    let top = rect.bottom + 8;
    let maxHeight = window.innerHeight - top - 16;

    // إذا كانت المساحة أسفل الزر ضيقة جداً (< 260px) والمساحة بالأعلى أكبر:
    if (maxHeight < 260 && rect.top > window.innerHeight - rect.bottom) {
      maxHeight = Math.max(200, rect.top - 16);
      top = Math.max(12, rect.top - maxHeight - 8);
    } else {
      maxHeight = Math.max(200, maxHeight);
    }

    setPosition({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(dropdownWidth),
      maxHeight: Math.round(maxHeight),
    });
  }, []);

  // استخدام useLayoutEffect لضمان ضبط الإحداثيات قبل رسم الواجهة
  useLayoutEffect(() => {
    if (showDetails) {
      updatePosition();
      const handleResize = () => updatePosition();
      window.addEventListener('resize', handleResize, { passive: true });
      window.addEventListener('scroll', handleResize, { passive: true, capture: true });
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
    }
  }, [showDetails, updatePosition]);

  // إغلاق القائمة عبر مفتاح Escape
  useEffect(() => {
    if (!showDetails) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDetails(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetails]);

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
      case 'standalone':
        return {
          bg: 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
          dot: 'bg-slate-400',
          pulse: false,
          label: 'جهاز مستقل',
          icon: <HardDrive className="w-3.5 h-3.5" />,
          tooltip: 'وضع نقطة البيع المستقلة (محلي فقط دون شبكة)',
        };
      default:
        return {
          bg: 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
          pulse: false,
          label: 'محلي',
          icon: <Activity className="w-3.5 h-3.5" />,
          tooltip: 'وضع الجهاز المستقل',
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
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!showDetails) {
            updatePosition();
          }
          setShowDetails((prev) => !prev)}
        }
        title={config.tooltip}
        aria-expanded={showDetails}
        aria-haspopup="dialog"
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

        {/* زمن الاستجابة في حال الاتصال كعميل */}
        {!compact && isConnected && status.lastPingMs !== null && status.lastPingMs > 0 && (
          <span className="hidden lg:inline text-[9px] font-mono px-1 py-0.2 rounded bg-black/5 dark:bg-white/10 opacity-80">
            {status.lastPingMs}ms
          </span>
        )}

        {/* عدد المعاملات المعلقة دون اتصال إن وُجدت */}
        {pendingCount > 0 && (
          <span
            title={`${pendingCount} عمليات أوفلاين معلقة تنتظر المزامنة`}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-black shadow-xs animate-pulse"
          >
            <Clock className="w-2.5 h-2.5" />
            <span>{pendingCount}</span>
          </span>
        )}

        <ChevronDown
          className={`w-3 h-3 opacity-60 group-hover:opacity-100 transition-transform duration-200 hidden sm:inline ${
            showDetails ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* نافذة التفاصيل المنبثقة عبر Portal لمنع الاقتصاص وضمان ظهورها كاملة داخل الشاشة */}
      {showDetails && typeof document !== 'undefined' && createPortal(
        <>
          {/* طبقة التعتيم الخلفية الخفيفة للإغلاق عند النقر في الخارج */}
          <div
            className="fixed inset-0 z-[9998] bg-black/25 backdrop-blur-2xs transition-opacity"
            onClick={() => setShowDetails(false)}
            aria-hidden="true"
          />

          <div
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label="تفاصيل حالة الخادم والشبكة"
            style={{
              position: 'fixed',
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxHeight: `${position.maxHeight}px`,
            }}
            className="z-[9999] rounded-2xl bg-surface-container-high/95 dark:bg-slate-900/95 backdrop-blur-xl border border-outline-variant/30 dark:border-slate-800 shadow-2xl p-4 text-right animate-in fade-in zoom-in-95 duration-150 overflow-y-auto flex flex-col"
          >
            {/* رأس النافذة المنبثقة */}
            <div className="shrink-0 flex items-center justify-between pb-3 border-b border-outline-variant/20 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${config.bg}`}>
                  {config.icon}
                </span>
                <div>
                  <h4 className="text-xs font-black text-on-surface font-cairo">
                    حالة نقطة البيع والشبكة
                  </h4>
                  <p className="text-[10px] text-on-surface-variant/70 font-mono">
                    {status.state === 'standalone'
                      ? 'Standalone POS Terminal (Local Only)'
                      : status.role === 'server'
                      ? 'Server Master PC (Local & Cloud)'
                      : 'Client Terminal (LAN Node)'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* تفاصيل الحالة والبيانات التقنية */}
            <div className="shrink-0 py-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant font-cairo">دور الجهاز:</span>
                <span className="font-bold font-cairo text-on-surface px-2 py-0.5 rounded bg-surface border border-outline-variant/20">
                  {status.state === 'standalone'
                    ? '💻 جهاز نقطة بيع مستقل (Single PC)'
                    : status.role === 'server'
                    ? '🖥️ حاسوب الخادم الرئيسي (Master)'
                    : '💻 محطة كاشير فرعية (Client)'}
                </span>
              </div>

              {status.state === 'standalone' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-cairo">نمط العمل:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-surface border border-outline-variant/20">
                      محلي فقط (دون اتصال بالشبكة)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-cairo">خادم الشبكة المحلية:</span>
                    <span className="font-mono text-[11px] text-on-surface-variant px-2 py-0.5 rounded bg-surface/50 border border-outline-variant/15">
                      غير مفعّل (وضع الجهاز الواحد)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface border border-outline-variant/20 text-on-surface-variant text-[11px] leading-relaxed">
                    يعمل هذا الجهاز حالياً بشكل مستقل ومكتفٍ ذاتياً. لربطه مع أجهزة كاشير إضافية أو شاشات، يمكنك تفعيل وضع الشبكة المحلية في أي وقت.
                  </div>
                </>
              ) : status.role === 'server' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-cairo">خادم الشبكة المحلية:</span>
                    <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Fastify Port 3000 (نشط)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-cairo">بث الأحداث المباشر:</span>
                    <span className="font-mono text-[11px] font-bold text-on-surface px-2 py-0.5 rounded bg-surface border border-outline-variant/20">
                      WebSockets + Local Bus
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-cairo">المزامنة السحابية:</span>
                    <span
                      className={`font-cairo text-[11px] font-bold px-2 py-0.5 rounded border ${
                        cloudStatus.cloudEnabled
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'bg-surface border-outline-variant/20 text-on-surface-variant'
                      }`}
                    >
                      {cloudStatus.cloudEnabled ? 'Master Node CDC (مفعّلة)' : 'محلي فقط (غير مفعّلة)'}
                    </span>
                  </div>

                  {cloudStatus.cloudEnabled && cloudStatus.lastSyncAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant font-cairo">آخر مزامنة سحابية:</span>
                      <span className="font-mono text-[11px] text-on-surface">
                        {new Date(cloudStatus.lastSyncAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
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

                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-cairo">عنوان الخادم:</span>
                    <span className="font-mono text-[11px] font-bold text-primary truncate max-w-[160px]" dir="ltr">
                      {status.serverUrl || 'غير محدد'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant font-cairo">طابور الأوفلاين (Outbox):</span>
                    <span
                      className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${
                        pendingCount > 0
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-surface border-outline-variant/20 text-on-surface'
                      }`}
                    >
                      {pendingCount > 0 ? `${pendingCount} معلقة` : 'فارغ (مكتمل)'}
                    </span>
                  </div>

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
                </>
              )}
            </div>

            {/* بطاقة العمليات المعلقة وزر المزامنة الفورية للعميل إن وُجدت */}
            {pendingCount > 0 && status.role === 'client' && (
              <div className="shrink-0 mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold flex items-center gap-1.5 font-cairo text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    معاملات أوفلاين معلقة
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 font-bold font-mono text-xs">
                    {pendingCount}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed font-cairo mb-2.5">
                  تم حفظ العمليات محلياً وستُرفع تلقائياً فور الاتصال بالخادم.
                </p>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await flushNow();
                  }}
                  disabled={isSyncing}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'جارٍ تفريغ العمليات...' : 'مزامنة العمليات المعلقة الآن'}</span>
                </button>
              </div>
            )}

            {/* بطاقة المزامنة السحابية الفورية للخادم الرئيسي إن كانت مفعلة */}
            {status.role === 'server' && cloudStatus.cloudEnabled && (
              <div className="shrink-0 mb-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold flex items-center gap-1.5 font-cairo text-xs">
                    <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    المزامنة السحابية المركزية
                  </span>
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                    {cloudStatus.pushedCount} سجلات مُرسلة
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await syncCloudNow();
                  }}
                  disabled={isCloudSyncing}
                  className="w-full py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCloudSyncing ? 'جارٍ المزامنة السحابية...' : 'مزامنة سحابية فورية الآن'}</span>
                </button>
              </div>
            )}

            {/* أزرار الإجراءات والانتقال */}
            <div className="shrink-0 pt-3 border-t border-outline-variant/20 dark:border-slate-800 flex items-center gap-2">
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
                  navigate('/settings', { state: { tab: 'network' } });
                }}
                className={`py-1.5 px-3 rounded-xl bg-surface hover:bg-surface-container-highest border border-outline-variant/25 text-on-surface text-xs font-bold font-cairo flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  status.role === 'server' || status.state === 'standalone' ? 'w-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : ''
                }`}
                title="إعدادات الشبكة والخادم"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {status.state === 'standalone'
                    ? 'تفعيل وضع الشبكة وربط الأجهزة'
                    : 'إعدادات الشبكة والأجهزة'}
                </span>
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

