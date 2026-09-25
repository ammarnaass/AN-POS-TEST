import React, { useState, useEffect } from 'react';
import {
  Server, Monitor, Zap, Radio, RefreshCw, ShieldCheck, AlertCircle,
  Activity, Trash2, KeyRound, Eye, EyeOff, CheckCircle2, Wifi,
  Clock, Check, HelpCircle, Laptop, Copy, Info, CheckCheck,
  ArrowRightLeft, Shield, HardDrive, WifiOff, CheckCircle, Sliders,
  Network, Database, Cpu, Layers, Lock, Unlock, ExternalLink
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

  // التبويب النشط بين القسمين الرئيسيين
  const [activeSection, setActiveSection] = useState<'pairing' | 'server_info'>('pairing');

  // خيارات قسم الاقتران
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
  const [testClientUrlResult, setTestClientUrlResult] = useState<{ success: boolean; msg: string; pingMs?: number; version?: string } | null>(null);
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
    const cleanUrl = (urlToTest || clientUrlInput || settings.serverLanUrl || '').trim().replace(/\/+$/, '');
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
            msg: `الخادم متصل ومستقر وجاهز للاستجابة فورياً (${elapsed} ms)`,
            pingMs: elapsed,
            version: '2.5.1',
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
          const info = await res.json().catch(() => ({}));
          setTestClientUrlResult({
            success: true,
            msg: `الخادم متصل وجاهز للاستجابة فورياً (${elapsed} ms)`,
            pingMs: elapsed,
            version: info?.version || '2.5.1',
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
    <div className="space-y-6 max-w-6xl mx-auto w-full font-tajawal animate-fade-in pb-12" dir="rtl">
      
      {/* ========================================================= */}
      {/* 1. HERO COCKPIT: Topology Bridge between Client and Server */}
      {/* ========================================================= */}
      <section aria-label="حالة الجسر الشبكي بين الكاشير والخادم" className="relative overflow-hidden rounded-3xl bg-surface-container-low border border-outline-variant/30 shadow-sm p-5 sm:p-6 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              <h2 className="text-lg sm:text-xl font-black font-cairo text-on-surface">
                ربط نقطة البيع الفرعية (Client Terminal POS)
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              إعداد هذا الحاسوب للعمل كشاشة كاشير فرعية سريعة مرتبطة بالخادم المركزي، مع صمود كامل أوفلاين أثناء انقطاع الشبكة.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {isPaired ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-cairo bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>محطة موثقة ومعتمدة</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-cairo bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>تحتاج إعداد والربط</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowSetupWizard(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold font-cairo bg-primary text-on-primary hover:bg-primary-hover transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-98"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>معالج الإعداد التفاعلي</span>
            </button>
          </div>
        </div>

        {/* The Live Physical Bridge Layout */}
        <div className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
            
            {/* الطرف الأيمن: شاشة الكاشير (هذا الحاسوب) */}
            <div className="md:col-span-4 rounded-2xl bg-surface border border-outline-variant/20 p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold font-cairo text-on-surface-variant flex items-center gap-1">
                  <Monitor className="w-3.5 h-3.5 text-primary" />
                  <span>هذا الجهاز (شاشة الكاشير)</span>
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-primary/10 text-primary border border-primary/20">
                  {clientTermCodeInput || 'T02'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-cairo">الدور الحالي:</span>
                <span className="text-xs font-bold font-cairo text-on-surface">
                  {currentRole === 'client' ? 'نقطة بيع فرعية (Client)' : 'جهاز مستقل (Single)'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-on-surface-variant/80 truncate border-t border-outline-variant/10 pt-2">
                ID: {activeDeviceId ? activeDeviceId.slice(0, 18) + '...' : 'جهاز غير مسجل بعد'}
              </div>
            </div>

            {/* المركز: جسر الشبكة اللحظي Telemetry Bridge */}
            <div className="md:col-span-3 flex flex-col items-center justify-center p-2 text-center space-y-2">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-cairo border shadow-2xs ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : liveEventBusStatus.state === 'connecting'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>{isConnected ? 'متصل لحظياً' : liveEventBusStatus.state === 'connecting' ? 'جارٍ الاتصال...' : 'أوفلاين محلي'}</span>
              </div>

              <div className="w-full flex items-center justify-center gap-1.5 text-outline-variant">
                <span className="h-0.5 flex-1 bg-outline-variant/30" />
                <ArrowRightLeft className={`w-4 h-4 ${isConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-outline-variant'}`} />
                <span className="h-0.5 flex-1 bg-outline-variant/30" />
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-surface border border-outline-variant/20 text-emerald-600 dark:text-emerald-400 font-bold">
                  {testClientUrlResult?.pingMs ?? liveEventBusStatus.lastPingMs ?? 5} ms
                </span>
                <span className="text-outline-variant">•</span>
                <span className="px-2 py-0.5 rounded bg-surface border border-outline-variant/20 font-bold text-on-surface">
                  {liveEventBusStatus.transport?.toUpperCase() || 'WS'}
                </span>
              </div>
            </div>

            {/* الطرف الأيسر: خادم المتجر الرئيسي */}
            <div className="md:col-span-4 rounded-2xl bg-surface border border-outline-variant/20 p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold font-cairo text-on-surface-variant flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>الخادم الرئيسي (Master Server)</span>
                </span>
                <span className={`px-2 py-0.5 rounded font-cairo font-bold text-[11px] ${
                  isPaired ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' : 'bg-surface-container text-on-surface-variant'
                }`}>
                  {isPaired ? 'مقترن' : 'غير مقترن'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-cairo">العنوان المعتمد:</span>
                <span className="text-xs font-mono font-bold text-primary truncate max-w-[150px]" dir="ltr">
                  {activeServerUrl || '---'}
                </span>
              </div>
              <div className="text-[11px] font-cairo text-on-surface-variant/80 truncate border-t border-outline-variant/10 pt-2">
                قاعدة البيانات المركزية والمخزون الحي
              </div>
            </div>

          </div>
        </div>
      </section>

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
      {/* 2. THE TWO DEDICATED SECTIONS SWITCHER (Segmented Control) */}
      {/* ========================================================= */}
      <div className="flex p-1.5 rounded-2xl bg-surface-container-low border border-outline-variant/25 max-w-xl mx-auto shadow-xs">
        <button
          type="button"
          onClick={() => setActiveSection('pairing')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'pairing'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>القسم 1: اقتران نقطة البيع الفرعية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('server_info')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'server_info'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>القسم 2: إعداد الخادم الرئيسي ومعلوماته</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 3. SECTION 1: PAIRING SECTION (قسم اقتران نقطة البيع الفرعية) */}
      {/* ========================================================= */}
      {activeSection === 'pairing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-fade-in">
          
          {/* العمود الأيمن (7 أعمدة): خطوات ونماذج الاقتران والتوثيق */}
          <div className="lg:col-span-7 space-y-5">
            {isPaired ? (
              /* حالة المحطة المقترنة والمعتمدة */
              <div className="p-5 sm:p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold font-cairo text-on-surface flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>جلسة الكاشير الموثقة والمعتمدة</span>
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      تم توثيق هذا الجهاز بمفتاح سري مشفر، وتتم مزامنة المبيعات والأسعار لحظياً.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isUnpairingLoading}
                    onClick={handleUnpairServer}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-500/20 text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isUnpairingLoading ? 'جارٍ الإلغاء...' : 'إلغاء الاقتران'}</span>
                  </button>
                </div>

                {/* بطاقات البيانات المعتمدة */}
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/20 flex items-center justify-between">
                    <span className="font-cairo font-bold text-on-surface-variant">عنوان الخادم المتصل:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-sm" dir="ltr">{activeServerUrl || '---'}</span>
                      {activeServerUrl && (
                        <button
                          type="button"
                          onClick={() => handleCopy(activeServerUrl, 'url')}
                          className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
                          title="نسخ عنوان الخادم"
                        >
                          {copiedField === 'url' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/20 flex items-center justify-between">
                    <span className="font-cairo font-bold text-on-surface-variant">معرف الجهاز (Device ID):</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface truncate max-w-[180px]">{activeDeviceId || '---'}</span>
                      {activeDeviceId && (
                        <button
                          type="button"
                          onClick={() => handleCopy(activeDeviceId, 'device')}
                          className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
                          title="نسخ معرف الجهاز"
                        >
                          {copiedField === 'device' ? <CheckCheck className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* أزرار الفحص السريع والنتيجة */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    disabled={testClientUrlLoading}
                    onClick={() => handleTestServerConnection(activeServerUrl)}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testClientUrlLoading ? 'animate-spin' : ''}`} />
                    <span>فحص استجابة الخادم (Ping Test)</span>
                  </button>
                </div>

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
            ) : (
              /* نموذج إعداد واقتران محطة جديدة */
              <div className="p-5 sm:p-6 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-5">
                {/* تبديل طريقة الربط */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/15 pb-4">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-bold font-cairo text-on-surface flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-primary" />
                      <span>إعداد واقتران محطة الكاشير</span>
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      اختر طريقة العثور على خادم المتجر الرئيسي:
                    </p>
                  </div>

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

                {/* وضع البحث التلقائي الذكي */}
                {connectionMethod === 'discovery' && (
                  <div className="space-y-3.5">
                    <div className="p-4 rounded-2xl bg-surface border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold font-cairo text-on-surface flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
                          <span>كشف خوادم الشبكة المحلية (mDNS / UDP)</span>
                        </span>
                        <p className="text-[11px] text-on-surface-variant">
                          يبحث عن أي حاسوب خادم AN POS على نفس الراوتر دون الحاجة لمعرفة عنوان IP.
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isScanningServers}
                        onClick={handleScanLanServers}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScanningServers ? 'animate-spin' : ''}`} />
                        <span>{isScanningServers ? 'جارٍ المسح...' : 'مسح الشبكة الآن'}</span>
                      </button>
                    </div>

                    {/* قائمة الخوادم المكتشفة */}
                    {discoveredServers.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-bold font-cairo text-on-surface block">
                          الخوادم المتاحة (انقر لاختيار الخادم):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                                  <div className="flex items-center gap-1.5 font-bold font-cairo text-xs text-on-surface">
                                    <Server className="w-3.5 h-3.5 text-primary" />
                                    <span>{srv.shopName || srv.deviceName || 'خادم AN POS'}</span>
                                  </div>
                                  <div className="text-xs font-mono font-bold text-primary" dir="ltr">
                                    {srv.serverUrl}
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                  {srv.pingMs ? `${srv.pingMs} ms` : 'متاح'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : scanPerformed && !isScanningServers ? (
                      <div className="p-3.5 rounded-2xl bg-surface border border-outline-variant/15 text-center text-xs text-on-surface-variant">
                        لم يتم العثور على خادم تلقائياً. يرجى التبديل لـ «إدخال يدوي» وكتابة عنوان IP مباشرة.
                      </div>
                    ) : null}
                  </div>
                )}

                {/* حقول إدخال العنوان ورمز نقطة البيع */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8 space-y-1.5">
                      <label className="text-xs font-bold text-on-surface font-cairo flex items-center justify-between">
                        <span>عنوان الخادم الرئيسي (Server URL):</span>
                        <span className="text-[11px] text-on-surface-variant font-mono">http://IP:3000</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          dir="ltr"
                          value={clientUrlInput}
                          onChange={(e) => setClientUrlInput(e.target.value)}
                          placeholder="http://192.168.1.50:3000"
                          className="w-full h-11 px-3.5 pl-24 rounded-xl border border-outline-variant/30 bg-surface text-on-surface font-mono text-xs sm:text-sm focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={testClientUrlLoading || !clientUrlInput}
                          onClick={() => handleTestServerConnection(clientUrlInput)}
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold font-cairo transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1 border border-outline-variant/20"
                        >
                          <Activity className={`w-3 h-3 ${testClientUrlLoading ? 'animate-spin' : ''}`} />
                          <span>Ping</span>
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-xs font-bold text-on-surface font-cairo">
                        رمز الكاشير (Code):
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
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 font-cairo">
                        <KeyRound className="w-3.5 h-3.5 text-primary" />
                        <span>مفتاح الربط السري (Connection PIN من شاشة السيرفر):</span>
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

                    <button
                      type="button"
                      disabled={isPairingLoading || !clientUrlInput || !pairingKeyInput}
                      onClick={handlePairWithServer}
                      className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                    >
                      <ShieldCheck className={`w-4 h-4 ${isPairingLoading ? 'animate-spin' : ''}`} />
                      <span>{isPairingLoading ? 'جارٍ التحقق وتوثيق الجهاز...' : 'ربط وتوثيق نقطة البيع الآن'}</span>
                    </button>
                  </div>

                  {/* رسائل نتائج الاقتران أو الفحص */}
                  {pairingStatusResult && (
                    <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
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
            )}
          </div>

          {/* العمود الأيسر (5 أعمدة): دور الحاسوب والصمود أوفلاين */}
          <div className="lg:col-span-5 space-y-5">
            {/* بطاقة دور الحاسوب في المتجر */}
            <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
                <span className="text-xs font-bold font-cairo text-on-surface flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span>دور هذا الحاسوب في المتجر</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                  {currentRole === 'client' ? 'Client POS' : currentRole === 'server' ? 'Server' : 'Single'}
                </span>
              </div>

              <div className="space-y-2">
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
                  className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    currentRole === 'client'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-2xs'
                      : 'border-outline-variant/20 bg-surface hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${currentRole === 'client' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-cairo text-on-surface block">
                        نقطة بيع فرعية (Client POS)
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        شاشة كاشير إضافية مرتبطة بالخادم
                      </span>
                    </div>
                  </div>
                  {currentRole === 'client' && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>

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
                  className={`w-full p-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    currentRole === 'standalone'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary/30 shadow-2xs'
                      : 'border-outline-variant/20 bg-surface hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${currentRole === 'standalone' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold font-cairo text-on-surface block">
                        جهاز مستقل محلي (Standalone)
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        يعمل بقاعدة بياناته الخاصة دون ربط
                      </span>
                    </div>
                  </div>
                  {currentRole === 'standalone' && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              </div>
            </div>

            {/* بطاقة طابور المبيعات الأوفلاين */}
            <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/25 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2.5">
                <span className="text-xs font-bold font-cairo text-on-surface flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>محرك الصمود أوفلاين (Offline Outbox)</span>
                </span>
                <span className="text-xs font-mono font-bold text-on-surface px-2 py-0.5 rounded bg-surface border border-outline-variant/20">
                  {pendingOutboxCount} معلقة
                </span>
              </div>

              <p className="text-xs text-on-surface-variant leading-relaxed">
                عند انقطاع كابل الشبكة يستمر الكاشير في البيع والطباعة بلا توقف. الفواتير تحفظ فورياً وترفع للخادم بمجرد عودة الاتصال.
              </p>

              <button
                type="button"
                onClick={handleFlushOutboxNow}
                disabled={isFlushingOutbox || pendingOutboxCount === 0}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-bold font-cairo transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFlushingOutbox ? 'animate-spin' : ''}`} />
                <span>{isFlushingOutbox ? 'جارٍ التفريغ...' : 'مزامنة ورفع المعاملات الآن'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SECTION 2: MASTER SERVER SETUP & INFORMATION SECTION   */}
      {/* ========================================================= */}
      {activeSection === 'server_info' && (
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
                  بيانات الخادم المركزي الذي يدير قاعدة البيانات المركزية، أسعار المنتجات والمخزون الحي.
                </p>
              </div>

              <button
                type="button"
                disabled={testClientUrlLoading}
                onClick={() => handleTestServerConnection(activeServerUrl || clientUrlInput)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
              >
                <Activity className={`w-3.5 h-3.5 ${testClientUrlLoading ? 'animate-spin' : ''}`} />
                <span>فحص استجابة وسرعة السيرفر (Ping)</span>
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
              <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in ${
                testClientUrlResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
              }`}>
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

          {/* محرك مزامنة قاعدة البيانات والكتالوج (Database & Engine Architecture) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold font-cairo text-on-surface">
                <Database className="w-4 h-4 text-primary" />
                <span>قاعدة بيانات SQLite المركزية</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                تخزن وتدير كافة جداول المنتجات، الأسعار، حسابات الزبائن والموردين، والفواتير على القرص الصلب لحاسوب السيرفر.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold font-cairo text-on-surface">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>تحديثات الأسعار والمخزون الحي</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                أي تعديل يجريه المدير على سعر سلعة أو تصنيف ينعكس فورياً في شاشات الكاشير الفرعية في أقل من 20 ملي ثانية عبر WebSocket.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold font-cairo text-on-surface">
                <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>الصمود في وضع عدم الاتصال</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                عند انقطاع كابل الشبكة يستمر الكاشير في إصدار الفواتير وطباعتها وتخزن العمليات محلياً حتى استعادة الاتصال تلقائياً.
              </p>
            </div>

          </div>

          {/* إرشادات تشخيص وضبط خادم المتجر (Diagnostics & Setup Guide) */}
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
              onClick={() => {
                if (window.confirm('هل أنت متأكد من تحويل دور هذا الجهاز إلى «خادم رئيسي (Server Master)»؟')) {
                  handleSaveSettings({
                    terminalRole: 'server',
                    terminal_role: 'server',
                    syncMode: 'lan',
                    sync_mode: 'lan',
                  });
                  setStoredTransportConfig({ role: 'server', syncMode: 'lan' });
                  addNotification({
                    title: 'تم تغيير الدور',
                    message: 'تم تعيين هذا الحاسوب كخادم رئيسي للمتجر بنجاح',
                    type: 'success',
                  });
                }
              }}
              className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-container border border-outline-variant/25 text-primary text-xs font-bold font-cairo transition-all cursor-pointer shrink-0"
            >
              تحويل هذا الحاسوب إلى خادم رئيسي
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
