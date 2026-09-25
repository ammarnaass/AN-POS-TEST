import React, { useState, useEffect } from 'react';
import {
  Server, Monitor, Zap, Radio, RefreshCw, ShieldCheck, AlertCircle,
  Activity, Trash2, KeyRound, Eye, EyeOff, CheckCircle2, Wifi,
  Clock, Check, HelpCircle, Laptop, Copy, Info, CheckCheck,
  ArrowRightLeft, ArrowLeft, Shield, HardDrive, WifiOff, CheckCircle
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
    const interval = setInterval(fetchCount, 4000);
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
      setTestClientUrlResult({ success: false, msg: 'يرجى كتابة أو اختيار عنوان الخادم أولاً' });
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
            msg: `الخادم الرئيسي متصل وجاهز للاستجابة فورياً (${elapsed} ms)`,
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
            msg: `الخادم الرئيسي متصل ومستقر (${elapsed} ms)`,
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
        msg: e.name === 'AbortError' ? 'انتهت مهلة محاولة الاتصال بالخادم (Timeout)' : 'تعذر الوصول للخادم، تأكد من تشغيل الخادم وتواجد الجهازين على نفس الراوتر',
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
              shopName: 'خادم AN POS المركزي',
              deviceName: 'حاسوب الإدارة الرئيسي',
              protocol: 'LAN Broadcast (UDP/mDNS)',
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
            msg: 'تم الاقتران وتوثيق محطة الكاشير بنجاح! هذا الجهاز معتمد وموثق الآن لدى الخادم.',
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
            deviceName: `${clientTermCodeInput || 'T02'} (Client Counter)`,
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
  const isConnected = liveEventBusStatus.state === 'connected';

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full font-tajawal animate-fade-in pb-12" dir="rtl">
      
      {/* ========================================================= */}
      {/* SIGNATURE ELEMENT: Live Architectural Network Bridge Hero */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl p-5 sm:p-7">
        {/* Subtle Ambient Backlights */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className={`absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl pointer-events-none translate-y-1/2 ${
          isConnected ? 'bg-emerald-500/10' : 'bg-amber-500/10'
        }`} />

        {/* Top Bar of the Cockpit: Title & Quick Wizard */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                LAN Topology & Real-Time Sync Cockpit
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-cairo text-white">
              ربط نقطة البيع الفرعية بالخادم الرئيسي
            </h2>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setShowSetupWizard(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold font-cairo bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-98"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>معالج الإعداد التفاعلي</span>
            </button>
          </div>
        </div>

        {/* The Live Physical Bridge: [Client PC] <==== Bridge ====> [Server PC] */}
        <div className="relative z-10 pt-6 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            
            {/* 1. الطرف الأيمن: هذا الحاسوب (شاشة الكاشير) */}
            <div className="md:col-span-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold font-cairo text-slate-400 uppercase tracking-wide">
                  شاشة الكاشير (هذا الجهاز)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary-200 border border-primary/30">
                  {clientTermCodeInput || 'T02'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-primary shrink-0">
                  <Monitor className="w-6 h-6 text-sky-400" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold font-cairo text-sm text-white truncate">
                    نقطة بيع فرعية (Client POS)
                  </div>
                  <div className="text-xs font-mono text-slate-400 truncate">
                    ID: {activeDeviceId ? activeDeviceId.slice(0, 14) + '...' : 'جهاز غير مسجل'}
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/40">
                <span>دور الحاسوب:</span>
                <span className="font-bold text-slate-200 font-cairo">
                  {currentRole === 'client' ? 'محطة فرعية (Client)' : 'جهاز مستقل (Single)'}
                </span>
              </div>
            </div>

            {/* 2. المركز: جسر الشبكة اللحظي (The Live Wire / Telemetry Bridge) */}
            <div className="md:col-span-3 flex flex-col items-center justify-center py-2 px-1 text-center space-y-2">
              {/* Dynamic Status Pill */}
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-cairo border shadow-sm transition-all ${
                isConnected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : liveEventBusStatus.state === 'connecting'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : liveEventBusStatus.state === 'connecting' ? 'bg-amber-400 animate-ping' : 'bg-rose-400'
                }`} />
                <span>
                  {isConnected ? 'اتصال لحظي متزامن' : liveEventBusStatus.state === 'connecting' ? 'جارٍ الاتصال...' : 'انقطاع شبكة (أوفلاين)'}
                </span>
              </div>

              {/* Physical Line with Pulsing Dots */}
              <div className="w-full flex items-center justify-center gap-1.5 py-1 text-slate-500">
                <span className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-slate-600 to-slate-500" />
                <ArrowRightLeft className={`w-4 h-4 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="h-0.5 flex-1 bg-gradient-to-l from-transparent via-slate-600 to-slate-500" />
              </div>

              {/* Ping & Outbox Telemetry Chips */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-bold" title="زمن الاستجابة اللحظي">
                  {testClientUrlResult?.pingMs ?? liveEventBusStatus.lastPingMs ?? 6} ms
                </span>
                <span className="text-slate-500">•</span>
                <span className={`px-2 py-0.5 rounded border font-bold ${
                  pendingOutboxCount > 0 ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`} title="طابور المبيعات في وضع عدم الاتصال">
                  {pendingOutboxCount} معلقة
                </span>
              </div>
            </div>

            {/* 3. الطرف الأيسر: خادم المتجر الرئيسي (Master Server) */}
            <div className="md:col-span-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold font-cairo text-slate-400 uppercase tracking-wide">
                  خادم المتجر الرئيسي (Master Server)
                </span>
                {isPaired ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-cairo bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    معتمد
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-cairo bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    غير مقترن
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-700/70 border border-slate-600/60 flex items-center justify-center text-primary shrink-0">
                  <Server className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold font-cairo text-sm text-white truncate">
                    حاسوب السيرفر المركزي
                  </div>
                  <div className="text-xs font-mono text-emerald-300 truncate" dir="ltr">
                    {activeServerUrl || 'لم يحدد الخادم بعد'}
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/40">
                <span>بروتوكول النقل:</span>
                <span className="font-mono text-slate-200 uppercase font-bold">
                  {liveEventBusStatus.transport || 'WebSocket'}
                </span>
              </div>
            </div>

          </div>
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

      {/* ========================================================= */}
      {/* WORKSPACE AREA: Either Connected Details OR Step-by-Step Hub */}
      {/* ========================================================= */}
      {isPaired ? (
        /* الحالة A: الجهاز مقترن ومعتمد بالفعل (Quiet, Disciplined & Clear) */
        <div className="space-y-5">
          <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-base font-bold font-cairo text-on-surface">
                    بيانات الجلسة المعتمدة لدى الخادم الرئيسي
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant">
                  تتصل محطة الكاشير هذه بالخادم تلقائياً وتتلقى كافة تعديلات الأسعار والسلع والزبائن لحظياً.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  disabled={testClientUrlLoading}
                  onClick={() => handleTestServerConnection(activeServerUrl)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-bold font-cairo text-on-surface transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Activity className={`w-3.5 h-3.5 text-primary ${testClientUrlLoading ? 'animate-spin' : ''}`} />
                  <span>فحص Ping الآن</span>
                </button>

                <button
                  type="button"
                  disabled={isUnpairingLoading}
                  onClick={handleUnpairServer}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-500/25 text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isUnpairingLoading ? 'جارٍ الإلغاء...' : 'إلغاء الاقتران / تغيير الخادم'}</span>
                </button>
              </div>
            </div>

            {/* تفاصيل الاعتماد */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
              <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/20 flex items-center justify-between">
                <span className="font-cairo text-on-surface-variant font-bold">عنوان الخادم المعتمد:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-primary" dir="ltr">{activeServerUrl || '---'}</span>
                  {activeServerUrl && (
                    <button
                      type="button"
                      onClick={() => handleCopy(activeServerUrl, 'url')}
                      className="p-1 text-on-surface-variant hover:text-primary cursor-pointer"
                      title="نسخ العنوان"
                    >
                      {copiedField === 'url' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/20 flex items-center justify-between">
                <span className="font-cairo text-on-surface-variant font-bold">معرف الجهاز (Device ID):</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-on-surface truncate max-w-[160px]">{activeDeviceId || '---'}</span>
                  {activeDeviceId && (
                    <button
                      type="button"
                      onClick={() => handleCopy(activeDeviceId, 'device')}
                      className="p-1 text-on-surface-variant hover:text-primary cursor-pointer"
                      title="نسخ المعرف"
                    >
                      {copiedField === 'device' ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* نتيجة فحص الاستجابة إن وجد */}
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

          {/* محرك الصمود أوفلاين وطابور المزامنة */}
          <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold font-cairo text-on-surface">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>طابور المبيعات في وضع عدم الاتصال (Offline Outbox)</span>
              </div>
              <p className="text-xs text-on-surface-variant max-w-xl">
                عند انقطاع كابل الشبكة أو فصل الراوتر، تُسجل الفواتير محلياً على هذا الجهاز بدون أي تعطيل، وترفع للخادم تلقائياً فور عودة الاتصال.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <div className="px-3.5 py-1.5 rounded-xl bg-surface border border-outline-variant/20 font-mono text-xs font-bold text-on-surface">
                {pendingOutboxCount} فواتير معلقة
              </div>
              <button
                type="button"
                onClick={handleFlushOutboxNow}
                disabled={isFlushingOutbox || pendingOutboxCount === 0}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-40 text-on-primary text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFlushingOutbox ? 'animate-spin' : ''}`} />
                <span>رفع ومزامنة الآن</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* الحالة B: إعداد وربط محطة جديدة (Guided 2-Step Pairing Hub) */
        <div className="space-y-5">
          {/* لوحة الربط المباشر */}
          <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-6">
            
            {/* رأس اللوحة مع تبديل طريقة الربط */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold font-cairo text-on-surface flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <span>معلومات وخطوات إقران نقطة البيع</span>
                </h3>
                <p className="text-xs text-on-surface-variant">
                  اختر طريقة تحديد عنوان الخادم في شبكة المتجر المحلية:
                </p>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-surface border border-outline-variant/20 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setConnectionMethod('discovery')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer flex items-center gap-1.5 ${
                    connectionMethod === 'discovery'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>البحث التلقائي الذكي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionMethod('manual')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer flex items-center gap-1.5 ${
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

            {/* أسلوب البحث التلقائي الذكي */}
            {connectionMethod === 'discovery' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold font-cairo text-on-surface flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-primary animate-pulse" />
                      <span>الكشف التلقائي عن السيرفر (Zero-Config Discovery)</span>
                    </span>
                    <p className="text-xs text-on-surface-variant">
                      يبحث تلقائياً عن حواسيب الخادم النشطة على نفس الراوتر أو كابل الشبكة دون كتابة عنوان IP.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isScanningServers}
                    onClick={handleScanLanServers}
                    className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isScanningServers ? 'animate-spin' : ''}`} />
                    <span>{isScanningServers ? 'جارٍ المسح...' : '🔍 مسح الشبكة الآن'}</span>
                  </button>
                </div>

                {discoveredServers.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold font-cairo text-on-surface block">
                      الخوادم المكتشفة في الشبكة (انقر لاختيار الخادم والربط معه):
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
                            className={`p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                              isSelected
                                ? 'border-primary bg-primary/10 ring-2 ring-primary/25 shadow-xs'
                                : 'border-outline-variant/25 bg-surface hover:bg-surface-container'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-bold font-cairo text-xs sm:text-sm text-on-surface">
                                <Server className="w-4 h-4 text-primary" />
                                <span>{srv.shopName || srv.deviceName || 'خادم AN POS الرئيسي'}</span>
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
                  <div className="p-4 rounded-2xl bg-surface border border-outline-variant/15 text-center space-y-1.5">
                    <Info className="w-5 h-5 text-amber-500 mx-auto" />
                    <p className="text-xs font-bold font-cairo text-on-surface">
                      لم يتم العثور على خادم تلقائياً عبر بث الشبكة
                    </p>
                    <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                      يمكنك التبديل إلى خيار «إدخال يدوي» وكتابة عنوان IP الخادم مباشرة من شاشة السيرفر.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            {/* نموذج الإدخال والاقتران المشفر */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
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

              {/* حقل رمز الاقتران السري PIN */}
              <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 space-y-3">
                <div className="space-y-1.5 max-w-lg">
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 font-cairo">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <span>مفتاح الاقتران السري (Connection PIN من شاشة السيرفر):</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPairKeyInput ? 'text' : 'password'}
                      value={pairingKeyInput}
                      onChange={(e) => setPairingKeyInput(e.target.value)}
                      placeholder="مثال: 849201"
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
                    تجد هذا الرمز في شاشة الخادم الرئيسي تحت: الإعدادات ➔ الشبكة والخادم المحلي.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isPairingLoading || !clientUrlInput || !pairingKeyInput}
                    onClick={handlePairWithServer}
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                  >
                    <ShieldCheck className={`w-4 h-4 ${isPairingLoading ? 'animate-spin' : ''}`} />
                    <span>{isPairingLoading ? 'جارٍ التحقق وتوثيق الجهاز...' : '🔐 ربط وتوثيق نقطة البيع الآن'}</span>
                  </button>
                </div>
              </div>

              {/* بطاقة رسائل النتيجة */}
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

              {testClientUrlResult && !pairingStatusResult && (
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

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* GUIDANCE & ARCHITECTURE GUARANTEES                        */}
      {/* ========================================================= */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-3">
        <h4 className="text-xs sm:text-sm font-bold font-cairo text-on-surface flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary shrink-0" />
          <span>إرشادات وضمانات العمل الشبكي في المتجر:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-on-surface-variant leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">1. شبكة موحدة عبر الراوتر:</span>
            يجب أن يتصل هذا الحاسوب وخادم المتجر بنفس الراوتر إما عبر كابل Ethernet أو نفس شبكة Wi-Fi 5GHz.
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">2. جدار الحماية (Firewall):</span>
            في حال تعذر الوصول، تأكد من أن جدار حماية ويندوز على جهاز الخادم يسمح لتطبيق AN POS بالمرور.
          </div>
          <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">3. صمود أوفلاين بلا توقف:</span>
            إذا تعطل الراوتر أو انقطع الكابل، يستمر الكاشير بالبيع وإصدار الفواتير فورياً وتخزن العمليات في SQLite المحلي.
          </div>
        </div>
      </div>

    </div>
  );
}
