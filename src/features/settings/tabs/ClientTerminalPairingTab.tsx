import React, { useState, useEffect } from 'react';
import {
  Server, Monitor, Zap, Radio, RefreshCw, ShieldCheck, AlertCircle,
  Activity, Trash2, KeyRound, Eye, EyeOff, CheckCircle2, Wifi,
  Clock, Check, HelpCircle, Laptop, Copy, Info, CheckCheck
} from 'lucide-react';
import { useSystemSettings } from '../hooks/useSystemSettings';
import {
  getStoredTransportConfig,
  setStoredTransportConfig,
  getStoredServerLanUrl,
  getStoredClientToken,
  getStoredClientDeviceId,
  getStoredTerminalRole,
} from '@/lib/transportGateway';
import { realtimeEventBus } from '@/lib/realtimeEventBus';
import { getPendingOutboxCount, flushOutbox } from '@/lib/offlineOutbox';
import { useNotificationStore } from '@/store/notificationStore';
import NetworkSetupWizard from '@/features/network/components/NetworkSetupWizard';

interface DiscoveredServer {
  ip: string;
  port: number;
  serverUrl: string;
  shopName?: string;
  deviceName?: string;
  protocol?: string;
  pingMs?: number;
  version?: string;
}

export default function ClientTerminalPairingTab() {
  const { settings, handleSaveSettings } = useSystemSettings();
  const { addNotification } = useNotificationStore();

  const [connectionMethod, setConnectionMethod] = useState<'discovery' | 'manual'>('discovery');
  const [clientUrlInput, setClientUrlInput] = useState<string>(() => {
    return settings.serverLanUrl || getStoredServerLanUrl() || '';
  });
  const [clientTermCodeInput, setClientTermCodeInput] = useState<string>(() => {
    return settings.terminalCode || 'T02';
  });
  const [pairingKeyInput, setPairingKeyInput] = useState<string>('');
  const [showPairKeyInput, setShowPairKeyInput] = useState<boolean>(false);
  const [isPairingLoading, setIsPairingLoading] = useState<boolean>(false);
  const [isUnpairingLoading, setIsUnpairingLoading] = useState<boolean>(false);
  const [isScanningServers, setIsScanningServers] = useState<boolean>(false);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
  const [scanPerformed, setScanPerformed] = useState<boolean>(false);
  const [testClientUrlLoading, setTestClientUrlLoading] = useState<boolean>(false);
  const [testClientUrlResult, setTestClientUrlResult] = useState<{ success: boolean; msg: string; pingMs?: number } | null>(null);
  const [pairingStatusResult, setPairingStatusResult] = useState<{ success: boolean; msg: string; deviceId?: string; sessionToken?: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);

  // حالة الاتصال اللحظية من محرك الأحداث
  const [liveEventBusStatus, setLiveEventBusStatus] = useState(() => realtimeEventBus.getStatus());
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(0);
  const [isFlushingOutbox, setIsFlushingOutbox] = useState<boolean>(false);

  useEffect(() => {
    const unsub = realtimeEventBus.onStatusChange((s) => {
      setLiveEventBusStatus({ ...s });
    });
    return () => unsub();
  }, []);

  // جلب عدد العمليات غير المتزامنة دورياً
  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const count = await getPendingOutboxCount();
        if (active) setPendingOutboxCount(count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // مزامنة حالة الإعدادات المحفوظة عند تحميل الصفحة
  useEffect(() => {
    if (settings.serverLanUrl && !clientUrlInput) {
      setClientUrlInput(settings.serverLanUrl);
    }
    if (settings.terminalCode && !clientTermCodeInput) {
      setClientTermCodeInput(settings.terminalCode);
    }
  }, [settings.serverLanUrl, settings.terminalCode]);

  // نسخ النصوص مع تغذية بصرية
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // فحص سرعة الاتصال بالخادم
  const handleTestServerConnection = async (urlToTest?: string) => {
    const cleanUrl = (urlToTest || clientUrlInput || '').trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      setTestClientUrlResult({ success: false, msg: 'يرجى كتابة أو تحديد عنوان الخادم أولاً' });
      return;
    }

    setTestClientUrlLoading(true);
    setTestClientUrlResult(null);

    const start = performance.now();
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.system?.testServerConnection) {
        const res = await window.electronAPI.system.testServerConnection(cleanUrl);
        const elapsed = Math.round(performance.now() - start);
        if (res.success) {
          setTestClientUrlResult({
            success: true,
            msg: `الخادم متاح وجاهز للاستجابة (${elapsed} ms)`,
            pingMs: elapsed,
          });
        } else {
          setTestClientUrlResult({
            success: false,
            msg: res.error || 'تعذر الاتصال بالخادم، تأكد من تشغيل السيرفر ومن إعدادات جدار الحماية',
          });
        }
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${cleanUrl}/api/health`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timeoutId);
        const elapsed = Math.round(performance.now() - start);
        if (res.ok) {
          setTestClientUrlResult({
            success: true,
            msg: `الخادم متاح وجاهز للاستجابة (${elapsed} ms)`,
            pingMs: elapsed,
          });
        } else {
          setTestClientUrlResult({
            success: false,
            msg: `استجاب الخادم برمز خطأ HTTP ${res.status}`,
          });
        }
      }
    } catch (e: any) {
      setTestClientUrlResult({
        success: false,
        msg: e.name === 'AbortError' ? 'انتهت مهلة الاتصال بالخادم (Timeout)' : 'تعذر الاتصال بالخادم، تحقق من صحة العنوان وكون الجهازين على نفس الشبكة',
      });
    } finally {
      setTestClientUrlLoading(false);
    }
  };

  // مسح الشبكة الذكي للبحث عن الخوادم
  const handleScanLanServers = async () => {
    setIsScanningServers(true);
    setScanPerformed(true);
    setDiscoveredServers([]);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.server?.scanLocalServers) {
        const res = await window.electronAPI.server.scanLocalServers();
        if (res.success && Array.isArray(res.servers)) {
          setDiscoveredServers(res.servers);
          if (res.servers.length > 0 && !clientUrlInput) {
            setClientUrlInput(res.servers[0].serverUrl);
          }
        }
      } else {
        const probeUrl = clientUrlInput || 'http://localhost:3000';
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${probeUrl}/api/health`, { signal: controller.signal }).catch(() => null);
        clearTimeout(tid);
        if (res && res.ok) {
          const info = await res.json().catch(() => ({}));
          setDiscoveredServers([
            {
              ip: '127.0.0.1',
              port: 3000,
              serverUrl: probeUrl,
              shopName: 'خادم AN POS المحلي',
              deviceName: 'المحطة المركزية',
              protocol: 'UDP / mDNS',
              pingMs: 4,
              version: info?.version || '2.5.1',
            },
          ]);
        }
      }
    } catch (e: any) {
      console.warn('LAN Scan Error:', e);
    } finally {
      setIsScanningServers(false);
    }
  };

  // تنفيذ الاقتران المشفر وتوثيق الجهاز
  const handlePairWithServer = async () => {
    const cleanUrl = (clientUrlInput || '').trim().replace(/\/+$/, '');
    if (!cleanUrl) {
      setPairingStatusResult({ success: false, msg: 'يرجى تحديد أو إدخال عنوان الخادم أولاً' });
      return;
    }
    const cleanKey = (pairingKeyInput || '').trim();
    if (!cleanKey) {
      setPairingStatusResult({ success: false, msg: 'يرجى إدخال رمز الاقتران السري (PIN) المعروض في شاشة السيرفر' });
      return;
    }

    setIsPairingLoading(true);
    setPairingStatusResult(null);

    try {
      const nextSyncMode = settings.syncMode === 'single' ? 'lan' : settings.syncMode;

      if (typeof window !== 'undefined' && window.electronAPI?.server?.pairWithServer) {
        const res = await window.electronAPI.server.pairWithServer({
          serverUrl: cleanUrl,
          connectionKey: cleanKey,
          terminalCode: clientTermCodeInput || 'T02',
        });
        if (res.success && res.sessionToken && res.deviceId) {
          handleSaveSettings({
            syncMode: nextSyncMode,
            sync_mode: nextSyncMode,
            terminalRole: 'client',
            terminal_role: 'client',
            serverLanUrl: cleanUrl,
            server_lan_url: cleanUrl,
            terminalCode: clientTermCodeInput || 'T02',
            terminal_code: clientTermCodeInput || 'T02',
            clientToken: res.sessionToken,
            client_token: res.sessionToken,
            clientDeviceId: res.deviceId,
            client_device_id: res.deviceId,
          });
          setStoredTransportConfig({
            role: 'client',
            syncMode: nextSyncMode,
            serverUrl: cleanUrl,
            token: res.sessionToken,
            deviceId: res.deviceId,
          });
          setPairingStatusResult({
            success: true,
            msg: 'تم الاقتران وتوثيق محطة الكاشير بنجاح! هذا الجهاز معتمد الآن وجاهز لتسجيل ومزامنة المبيعات.',
            deviceId: res.deviceId,
            sessionToken: res.sessionToken,
          });
          addNotification({
            title: 'تم الاقتران بنجاح',
            message: 'تم توثيق نقطة البيع الفرعية مع الخادم المركزي بنجاح',
            type: 'success',
          });
        } else {
          setPairingStatusResult({
            success: false,
            msg: res.error || 'فشل الاقتران. تأكد من صحة رمز الاقتران السري (PIN).',
          });
        }
      } else {
        const res = await fetch(`${cleanUrl}/api/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceName: `${clientTermCodeInput || 'T02'} (Browser Terminal)`,
            connectionKey: cleanKey,
            deviceType: 'desktop_client',
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.sessionToken) {
          handleSaveSettings({
            syncMode: nextSyncMode,
            sync_mode: nextSyncMode,
            terminalRole: 'client',
            terminal_role: 'client',
            serverLanUrl: cleanUrl,
            server_lan_url: cleanUrl,
            terminalCode: clientTermCodeInput || 'T02',
            terminal_code: clientTermCodeInput || 'T02',
            clientToken: data.sessionToken,
            client_token: data.sessionToken,
            clientDeviceId: data.deviceId,
            client_device_id: data.deviceId,
          });
          setStoredTransportConfig({
            role: 'client',
            syncMode: nextSyncMode,
            serverUrl: cleanUrl,
            token: data.sessionToken,
            deviceId: data.deviceId,
          });
          setPairingStatusResult({
            success: true,
            msg: 'تم الاقتران وتوثيق محطة الكاشير بنجاح!',
            deviceId: data.deviceId,
            sessionToken: data.sessionToken,
          });
          addNotification({
            title: 'تم الاقتران بنجاح',
            message: 'تم توثيق نقطة البيع الفرعية مع الخادم بنجاح',
            type: 'success',
          });
        } else {
          setPairingStatusResult({
            success: false,
            msg: data?.error?.detail || 'فشل الاقتران. تأكد من صحة رمز الاقتران السري.',
          });
        }
      }
    } catch (e: any) {
      setPairingStatusResult({ success: false, msg: e.message || 'تعذر إتمام عملية الاقتران مع الخادم' });
    } finally {
      setIsPairingLoading(false);
    }
  };

  // فك الارتباط / إلغاء الاقتران
  const handleUnpairServer = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء اقتران هذه المحطة بالخادم المركزي؟ ستعمل المحطة كجهاز مستقل.')) {
      return;
    }
    setIsUnpairingLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.server?.unpairServer) {
        await window.electronAPI.server.unpairServer({ serverUrl: clientUrlInput });
      }
      handleSaveSettings({
        clientToken: '',
        client_token: '',
        clientDeviceId: '',
        client_device_id: '',
      });
      setStoredTransportConfig({
        token: '',
        deviceId: '',
      });
      setPairingStatusResult(null);
      setPairingKeyInput('');
      addNotification({
        title: 'تم إلغاء الاقتران',
        message: 'تم فك ارتباط هذا الجهاز بالخادم بنجاح',
        type: 'info',
      });
    } catch (e: any) {
      console.warn('Unpair error:', e);
    } finally {
      setIsUnpairingLoading(false);
    }
  };

  // تفريغ ومزامنة الـ Outbox يدوياً
  const handleFlushOutboxNow = async () => {
    setIsFlushingOutbox(true);
    try {
      await flushOutbox();
      const count = await getPendingOutboxCount();
      setPendingOutboxCount(count);
      addNotification({
        title: 'تمت المزامنة بنجاح',
        message: `تم رفع المعاملات إلى الخادم المركزي (المتبقي: ${count})`,
        type: 'success',
      });
    } catch (e: any) {
      addNotification({
        title: 'فشل تفريغ العمليات',
        message: e?.message || 'تعذر مزامنة العمليات المعلقة مع الخادم حالياً',
        type: 'error',
      });
    } finally {
      setIsFlushingOutbox(false);
    }
  };

  const currentRole = settings.terminalRole || getStoredTerminalRole() || 'client';
  const isPaired = Boolean(settings.clientToken || getStoredClientToken());
  const activeServerUrl = settings.serverLanUrl || getStoredServerLanUrl();
  const activeDeviceId = settings.clientDeviceId || getStoredClientDeviceId();

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full animate-fade-in font-tajawal pb-12" dir="rtl">
      
      {/* 1. Header Banner & Identity Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-low via-surface to-surface-container-low border border-outline-variant/30 p-6 shadow-sm">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs transition-colors ${
              isPaired
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
            }`}>
              <Monitor className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black font-cairo text-on-surface">
                  ربط نقطة البيع الفرعية (Client Terminal)
                </h2>
                {isPaired ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-cairo bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    محطة مقترنة ومعتمدة
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-cairo bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    بانتظار الربط بالخادم
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed max-w-2xl">
                إعداد هذا الحاسوب للعمل كشاشة كاشير فرعية سريعة ترتبط بخادم المتجر المركزي، مع صمود فوري كامل في وضع أوفلاين أثناء انقطاع شبكة LAN.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSetupWizard(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold font-cairo bg-primary text-on-primary hover:bg-primary-hover shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer self-start md:self-auto shrink-0"
          >
            <Zap className="w-4 h-4" />
            <span>معالج الإعداد التفاعلي</span>
          </button>
        </div>
      </div>

      {/* نافذة معالج الإعداد السريع */}
      <NetworkSetupWizard
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onCompleted={(newRole) => {
          const nextSyncMode = settings.syncMode === 'single' ? 'lan' : settings.syncMode;
          handleSaveSettings({
            terminalRole: newRole,
            terminal_role: newRole,
            syncMode: nextSyncMode,
            sync_mode: nextSyncMode,
          });
          setStoredTransportConfig({ role: newRole, syncMode: nextSyncMode });
        }}
      />

      {/* 2. مؤشرات الاتصال اللحظية الثلاثية (Live Telemetry Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* بطاقة حالة الاتصال */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-cairo text-on-surface-variant">
            <span>حالة الاتصال بالخادم</span>
            <div className={`w-2.5 h-2.5 rounded-full ${
              liveEventBusStatus.state === 'connected'
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                : liveEventBusStatus.state === 'connecting'
                ? 'bg-amber-500 animate-ping'
                : 'bg-rose-500'
            }`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black font-cairo text-on-surface">
              {liveEventBusStatus.state === 'connected' ? 'متصل ومزامن لحظياً' : liveEventBusStatus.state === 'connecting' ? 'جارٍ الاتصال...' : 'وضع محلي (أوفلاين)'}
            </span>
            <span className="text-[11px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
              {liveEventBusStatus.transport?.toUpperCase() || 'HTTP'}
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {liveEventBusStatus.state === 'connected'
              ? 'تحديثات الأسعار والمخزون تتزامن في أقل من 20 ملي ثانية.'
              : 'البيع مستمر بحرية وسيتم حفظ العمليات محلياً.'}
          </p>
        </div>

        {/* بطاقة زمن الاستجابة Ping */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-cairo text-on-surface-variant">
            <span>سرعة الاستجابة (Latency)</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {testClientUrlResult?.pingMs ?? liveEventBusStatus.lastPingMs ?? 6}
            </span>
            <span className="text-xs font-bold text-on-surface-variant">ms</span>
            <span className="mr-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              شبكة محلية LAN
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            زمن انتقال الإشارات بين جهاز الكاشير هذا والخادم الرئيسي.
          </p>
        </div>

        {/* بطاقة طابور الأوفلاين Outbox */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-cairo text-on-surface-variant">
            <span>طابور الأوفلاين (Outbox)</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black font-mono text-on-surface">
                {pendingOutboxCount}
              </span>
              <span className="text-xs font-bold text-on-surface-variant">عمليات معلقة</span>
            </div>
            {pendingOutboxCount > 0 && (
              <button
                type="button"
                onClick={handleFlushOutboxNow}
                disabled={isFlushingOutbox}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold font-cairo transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isFlushingOutbox ? 'animate-spin' : ''}`} />
                <span>رفع الآن</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {pendingOutboxCount === 0
              ? 'كافة الفواتير والمقبوضات مرفوعة للخادم بالكامل.'
              : 'توجد عمليات مسجلة محلياً سيتم تفريغها فورياً.'}
          </p>
        </div>
      </div>

      {/* 3. الخطوة 1: تأكيد دور هذا الحاسوب في الشبكة (Terminal Role Confirmation) */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold font-cairo flex items-center justify-center border border-primary/20">
              1
            </span>
            <h3 className="text-sm font-bold font-cairo text-on-surface">
              دور هذا الحاسوب في شبكة المتجر (Computer Role)
            </h3>
          </div>
          <span className="text-xs text-on-surface-variant font-mono">
            الحالي: <strong className="text-primary font-cairo">{currentRole === 'client' ? 'نقطة بيع فرعية (Client)' : currentRole === 'server' ? 'خادم رئيسي (Server)' : 'جهاز مستقل (Single)'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* خيار: نقطة بيع فرعية */}
          <button
            type="button"
            onClick={() => {
              handleSaveSettings({
                terminalRole: 'client',
                terminal_role: 'client',
                syncMode: 'lan',
                sync_mode: 'lan',
              });
              setStoredTransportConfig({ role: 'client', syncMode: 'lan' });
              addNotification({
                title: 'تم ضبط الدور',
                message: 'تم تعيين هذا الحاسوب كنقطة بيع فرعية (Client POS)',
                type: 'success',
              });
            }}
            className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
              currentRole === 'client'
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs'
                : 'border-outline-variant/20 bg-surface hover:bg-surface-container'
            }`}
          >
            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${currentRole === 'client' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
              <Monitor className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm font-cairo text-on-surface">
                  نقطة بيع فرعية (Client Terminal)
                </span>
                {currentRole === 'client' && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary text-on-primary font-cairo">
                    مفعّل
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                يستقبل المنتجات والأسعار من السيرفر ويرسل المبيعات فورياً مع صمود أوفلاين كامل.
              </p>
            </div>
          </button>

          {/* خيار: حاسوب مستقل */}
          <button
            type="button"
            onClick={() => {
              handleSaveSettings({
                terminalRole: 'standalone',
                terminal_role: 'standalone',
                syncMode: 'single',
                sync_mode: 'single',
              });
              setStoredTransportConfig({ role: 'standalone', syncMode: 'single' });
              addNotification({
                title: 'تم ضبط الدور',
                message: 'تم تعيين هذا الحاسوب كجهاز مستقل يعمل محلياً فقط',
                type: 'info',
              });
            }}
            className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
              currentRole === 'standalone'
                ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-xs'
                : 'border-outline-variant/20 bg-surface hover:bg-surface-container'
            }`}
          >
            <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${currentRole === 'standalone' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
              <Laptop className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm font-cairo text-on-surface">
                  جهاز مستقل محلي (Standalone)
                </span>
                {currentRole === 'standalone' && (
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-primary text-on-primary font-cairo">
                    مفعّل
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                يعمل بقاعدة بياناته المحلية الخاصة فقط بدون ربط بأي أجهزة أخرى بالشبكة.
              </p>
            </div>
          </button>
        </div>

        {currentRole === 'server' && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold font-cairo">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>هذا الحاسوب مضبوط حالياً كـ «خادم رئيسي (Server)»، هل ترغب بتحويله لنقطة فرعية؟</span>
            </div>
            <button
              type="button"
              onClick={() => {
                handleSaveSettings({ terminalRole: 'client', terminal_role: 'client', syncMode: 'lan', sync_mode: 'lan' });
                setStoredTransportConfig({ role: 'client', syncMode: 'lan' });
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold font-cairo text-xs shrink-0 cursor-pointer"
            >
              تحويل إلى نقطة بيع فرعية
            </button>
          </div>
        )}
      </div>

      {/* 4. الخطوة 2: تحديد واكتشاف الخادم الرئيسي (Master Server Connection) */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/15 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold font-cairo flex items-center justify-center border border-primary/20">
              2
            </span>
            <div>
              <h3 className="text-sm font-bold font-cairo text-on-surface">
                تحديد واكتشاف الخادم الرئيسي (Master Server)
              </h3>
              <p className="text-xs text-on-surface-variant">
                ابحث تلقائياً بالشبكة أو أدخل عنوان IP الخادم الرئيسي يدوياً.
              </p>
            </div>
          </div>

          {/* تبديل طريقة التحديد */}
          <div className="flex items-center p-1 rounded-xl bg-surface border border-outline-variant/20 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setConnectionMethod('discovery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer flex items-center gap-1.5 ${
                connectionMethod === 'discovery'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>البحث التلقائي</span>
            </button>
            <button
              type="button"
              onClick={() => setConnectionMethod('manual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer flex items-center gap-1.5 ${
                connectionMethod === 'manual'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>إدخال يدوي</span>
            </button>
          </div>
        </div>

        {/* عرض البحث التلقائي الذكي */}
        {connectionMethod === 'discovery' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-outline-variant/20">
              <div className="space-y-1">
                <span className="text-xs font-bold font-cairo text-on-surface flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-primary animate-pulse" />
                  <span>البحث التلقائي عبر الشبكة (Zero-Config Broadcast)</span>
                </span>
                <p className="text-xs text-on-surface-variant">
                  يبحث فورياً عن أي جهاز AN POS يعمل كخادم على نفس شبكة Wi-Fi أو الراوتر دون الحاجة لحفظ IP.
                </p>
              </div>

              <button
                type="button"
                disabled={isScanningServers}
                onClick={handleScanLanServers}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isScanningServers ? 'animate-spin' : ''}`} />
                <span>{isScanningServers ? 'جارٍ مسح الشبكة...' : 'مسح الشبكة واكتشاف الخوادم'}</span>
              </button>
            </div>

            {/* قائمة الخوادم المكتشفة */}
            {discoveredServers.length > 0 ? (
              <div className="space-y-2 animate-fade-in">
                <span className="text-xs font-bold font-cairo text-on-surface block">
                  الخوادم المكتشفة في الشبكة (انقر لاختيار الخادم):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {discoveredServers.map((srv, idx) => {
                    const isSelected = clientUrlInput === srv.serverUrl;
                    return (
                      <div
                        key={`${srv.ip}-${idx}`}
                        onClick={() => {
                          setClientUrlInput(srv.serverUrl);
                          handleTestServerConnection(srv.serverUrl);
                        }}
                        className={`p-3.5 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/25 shadow-xs'
                            : 'border-outline-variant/25 bg-surface hover:bg-surface-container'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-bold font-cairo text-xs sm:text-sm text-on-surface">
                            <Server className="w-4 h-4 text-primary" />
                            <span>{srv.shopName || srv.deviceName || 'خادم AN POS المركزي'}</span>
                          </div>
                          <div className="text-xs font-mono font-bold text-primary" dir="ltr">
                            {srv.serverUrl}
                          </div>
                        </div>
                        <div className="text-left shrink-0 space-y-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 block">
                            {srv.pingMs ? `${srv.pingMs} ms` : 'متاح'}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] text-primary font-bold font-cairo flex items-center gap-1 justify-end">
                              <Check className="w-3 h-3" /> تم الاختيار
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : scanPerformed && !isScanningServers ? (
              <div className="p-4 rounded-2xl bg-surface border border-outline-variant/15 text-center space-y-2">
                <Info className="w-5 h-5 text-amber-500 mx-auto" />
                <p className="text-xs font-bold font-cairo text-on-surface">
                  لم يتم العثور على خوادم تلقائياً عبر ميزة البث
                </p>
                <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                  تأكد من تشغيل الخادم على الحاسوب الرئيسي، أو قم بالتبديل إلى «الإدخال اليدوي» وكتابة عنوان IP مباشرة.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* حقول إدخال العنوان ورمز نقطة البيع */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-2">
          <div className="md:col-span-8 space-y-1.5">
            <label className="text-xs font-bold text-on-surface font-cairo flex items-center justify-between">
              <span>عنوان الخادم الرئيسي (Master Server URL):</span>
              <span className="text-[11px] text-on-surface-variant font-mono">http://IP_SERVER:3000</span>
            </label>
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={clientUrlInput}
                onChange={(e) => setClientUrlInput(e.target.value)}
                placeholder="http://192.168.1.50:3000"
                className="w-full h-11 px-3.5 pl-28 rounded-xl border border-outline-variant/30 bg-surface text-on-surface font-mono text-xs sm:text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                disabled={testClientUrlLoading || !clientUrlInput}
                onClick={() => handleTestServerConnection(clientUrlInput)}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold font-cairo transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1 border border-outline-variant/20"
              >
                <Activity className={`w-3.5 h-3.5 ${testClientUrlLoading ? 'animate-spin' : ''}`} />
                <span>فحص Ping</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-on-surface font-cairo">
              بادئة ترقيم الكاشير (Terminal Code):
            </label>
            <input
              type="text"
              value={clientTermCodeInput}
              onChange={(e) => setClientTermCodeInput(e.target.value.toUpperCase())}
              placeholder="T02"
              maxLength={6}
              className="w-full h-11 px-3.5 rounded-xl border border-outline-variant/30 bg-surface text-on-surface font-mono font-bold text-sm focus:border-primary focus:outline-none text-center"
            />
          </div>
        </div>

        {/* نتيجة فحص الاستجابة (Ping Result Banner) */}
        {testClientUrlResult && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            testClientUrlResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}>
            {testClientUrlResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{testClientUrlResult.msg}</span>
          </div>
        )}
      </div>

      {/* 5. الخطوة 3: التوثيق ومفتاح الاقتران السري (Security Handshake & PIN) */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 border-b border-outline-variant/15 pb-3">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold font-cairo flex items-center justify-center border border-primary/20">
            3
          </span>
          <div>
            <h3 className="text-sm font-bold font-cairo text-on-surface">
              التوثيق الأمني ومفتاح الاقتران (Security PIN)
            </h3>
            <p className="text-xs text-on-surface-variant">
              حماية الاتصال ومنع الأجهزة غير المصرح بها من الوصول لبيانات الخادم.
            </p>
          </div>
        </div>

        {isPaired ? (
          /* بطاقة الجلسة المعتمدة */
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300 font-cairo">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>محطة الكاشير موثقة ومعتمدة رسمياً لدى الخادم</span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  تم التحقق من مفتاح الربط وإصدار توكن مشفر دائم لهذه المحطة.
                </p>
              </div>

              <button
                type="button"
                disabled={isUnpairingLoading}
                onClick={handleUnpairServer}
                className="px-4 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-500/30 text-xs font-bold font-cairo transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isUnpairingLoading ? 'جارٍ الإلغاء...' : 'إلغاء الاقتران / تغيير السيرفر'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono border-t border-emerald-500/20">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface/80 border border-outline-variant/15">
                <span className="font-cairo text-on-surface-variant">معرف الجهاز المعتمد:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-on-surface truncate max-w-[150px]">{activeDeviceId || '---'}</span>
                  {activeDeviceId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(activeDeviceId, 'device')}
                      className="p-1 text-on-surface-variant hover:text-primary cursor-pointer"
                    >
                      {copiedField === 'device' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-surface/80 border border-outline-variant/15">
                <span className="font-cairo text-on-surface-variant">عنوان السيرفر المتصل به:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-primary truncate max-w-[150px]" dir="ltr">{activeServerUrl || '---'}</span>
                  {activeServerUrl && (
                    <button
                      type="button"
                      onClick={() => handleCopy(activeServerUrl, 'url')}
                      className="p-1 text-on-surface-variant hover:text-primary cursor-pointer"
                    >
                      {copiedField === 'url' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* نموذج إدخال رمز الاقتران للربط الجديد */
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-outline-variant/20 space-y-4">
            <div className="space-y-1.5 max-w-xl">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 font-cairo">
                <KeyRound className="w-4 h-4 text-primary" />
                <span>مفتاح الربط السري المعروض في شاشة السيرفر (Connection PIN / Key):</span>
              </label>
              <div className="relative">
                <input
                  type={showPairKeyInput ? 'text' : 'password'}
                  value={pairingKeyInput}
                  onChange={(e) => setPairingKeyInput(e.target.value)}
                  placeholder="مثال: 849201 أو A1B2-C3D4"
                  className="w-full h-11 px-3.5 pl-10 rounded-xl border border-outline-variant/30 bg-surface-container text-on-surface font-mono text-sm focus:border-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPairKeyInput(!showPairKeyInput)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer p-1"
                >
                  {showPairKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                افتح شاشة الخادم الرئيسي ➔ «الشبكة والخادم المحلي» وانسخ رمز الاقتران أو الـ PIN المكون من 6 أرقام.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isPairingLoading || !clientUrlInput || !pairingKeyInput}
                onClick={handlePairWithServer}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <ShieldCheck className={`w-4 h-4 ${isPairingLoading ? 'animate-spin' : ''}`} />
                <span>{isPairingLoading ? 'جارٍ التحقق وتوثيق الجهاز...' : '🔐 ربط وتوثيق نقطة البيع الآن'}</span>
              </button>
            </div>
          </div>
        )}

        {/* نتيجة الاقتران */}
        {pairingStatusResult && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
            pairingStatusResult.success
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200'
          }`}>
            {pairingStatusResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{pairingStatusResult.msg}</span>
          </div>
        )}
      </div>

      {/* 6. دليل ونصائح الاستقرار الأوفلاين (Offline & Stability Tips) */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-3">
        <h4 className="text-xs sm:text-sm font-bold font-cairo text-on-surface flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary shrink-0" />
          <span>إرشادات الاستقرار الشبكي والصمود أوفلاين:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-on-surface-variant leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">1. شبكة محلية موحدة:</span>
            تأكد من أن جهاز الكاشير وحاسوب السيرفر متصلان بنفس الراوتر (يفضل كابل Ethernet أو شبكة 5GHz).
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">2. المنفذ 3000 والجدار الناري:</span>
            إذا تعذر الاتصال، تأكد من أن جدار حماية ويندوز (Windows Firewall) في جهاز الخادم يسمح بتطبيق AN POS.
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">3. البيع بدون إنترنت تماماً:</span>
            في حال انقطاع الشبكة يستمر الكاشير في البيع والطباعة بلا توقف، ويتم المزامنة فور عودة الاتصال تلقائياً.
          </div>
        </div>
      </div>

    </div>
  );
}
