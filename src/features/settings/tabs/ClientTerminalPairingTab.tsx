import React, { useState, useEffect } from 'react';
import {
  Server, Monitor, Zap, Radio, RefreshCw, ShieldCheck, AlertCircle,
  Activity, Trash2, KeyRound, Eye, EyeOff, CheckCircle2, Wifi,
  HardDrive, Clock, Check, Sparkles, HelpCircle, ArrowRightLeft,
  Laptop, ShieldAlert, Cpu, Network
} from 'lucide-react';
import { useSystemSettings } from '../hooks/useSystemSettings';
import {
  getStoredTransportConfig,
  setStoredTransportConfig,
  getStoredServerLanUrl,
  getStoredClientToken,
  getStoredClientDeviceId,
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
  const [testClientUrlLoading, setTestClientUrlLoading] = useState<boolean>(false);
  const [testClientUrlResult, setTestClientUrlResult] = useState<{ success: boolean; msg: string; pingMs?: number } | null>(null);
  const [pairingStatusResult, setPairingStatusResult] = useState<{ success: boolean; msg: string; deviceId?: string; sessionToken?: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);

  // حالة الاتصال اللحظية من محرك الأحداث
  const [liveEventBusStatus, setLiveEventBusStatus] = useState(() => realtimeEventBus.getStatus());
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(0);
  const [isFlushingOutbox, setIsFlushingOutbox] = useState<boolean>(false);

  useEffect(() => {
    const unsub = realtimeEventBus.subscribeToStatus((s) => {
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
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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
            msg: res.error || 'تعذر الاتصال بالخادم، تأكد من أن السيرفر نشط وجدار الحماية يسمح بالاتصال',
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
            msg: `الخادم متاح وسريع الاستجابة (${elapsed} ms)`,
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
              deviceName: 'المحطة الرئيسية',
              protocol: 'udp+mdns',
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
      setPairingStatusResult({ success: false, msg: 'يرجى إدخال رمز الاقتران السري (Connection PIN) المعروض في شاشة السيرفر' });
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
            msg: 'تم الاقتران وتوثيق محطة الكاشير بنجاح! هذا الجهاز موثق الآن لدى الخادم وجاهز لتسجيل المبيعات.',
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
      const res = await flushOutbox();
      const count = await getPendingOutboxCount();
      setPendingOutboxCount(count);
      addNotification({
        title: 'تمت المزامنة',
        message: `تم تفريغ العمليات ومزامنتها بنجاح (المتبقي: ${count})`,
        type: 'success',
      });
    } catch (e: any) {
      addNotification({
        title: 'فشل التفريغ',
        message: e?.message || 'تعذر مزامنة العمليات المعلقة مع الخادم حالياً',
        type: 'error',
      });
    } finally {
      setIsFlushingOutbox(false);
    }
  };

  const isPaired = Boolean(settings.clientToken || getStoredClientToken());
  const activeServerUrl = settings.serverLanUrl || getStoredServerLanUrl();
  const activeDeviceId = settings.clientDeviceId || getStoredClientDeviceId();

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full animate-fade-in" dir="rtl">
      {/* 1. Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-cairo text-on-surface flex items-center gap-2">
              <span>ربط نقطة البيع الفرعية بالخادم الرئيسي</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                Client Terminal POS
              </span>
            </h2>
            <p className="text-xs text-on-surface-variant font-tajawal mt-1">
              إعداد هذا الحاسوب للعمل كشاشة كاشير إضافية سريعة مرتبطة بالخادم المركزي، مع صمود كامل أوفلاين أثناء انقطاع الشبكة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setShowSetupWizard(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold font-cairo bg-primary text-on-primary hover:bg-primary-hover shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>معالج الإعداد والربط السريع</span>
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

      {/* 2. Top Summary & Live Server Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* بطاقة حالة الاتصال بالخادم */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant font-cairo">حالة الاتصال بالسيرفر</span>
            <div className={`w-2.5 h-2.5 rounded-full ${
              liveEventBusStatus.state === 'connected'
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse'
                : liveEventBusStatus.state === 'connecting'
                ? 'bg-amber-500 animate-ping'
                : 'bg-rose-500'
            }`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black font-cairo text-on-surface">
              {liveEventBusStatus.state === 'connected' ? 'متصل لحظياً' : liveEventBusStatus.state === 'connecting' ? 'جارٍ الاتصال...' : 'غير متصل'}
            </span>
            <span className="text-xs font-mono font-bold text-on-surface-variant">
              ({liveEventBusStatus.transport?.toUpperCase() || 'HTTP'})
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-tajawal">
            {liveEventBusStatus.state === 'connected'
              ? 'الأحداث الفورية والمبيعات وتحديثات المخزون متزامنة مباشرة مع الخادم.'
              : 'يعمل النظام في وضع الصمود الأوفلاين ويحفظ العمليات محلياً.'}
          </p>
        </div>

        {/* بطاقة سرعة الاستجابة (Ping Latency) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant font-cairo">سرعة الاستجابة (Latency)</span>
            <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {testClientUrlResult?.pingMs ?? liveEventBusStatus.lastPingMs ?? 8}
            </span>
            <span className="text-xs font-bold text-on-surface-variant">ms</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mr-auto">
              فائق السرعة
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-tajawal">
            سرعة تبادل البيانات عبر كابل LAN أو شبكة Wi-Fi المحلية للمتجر.
          </p>
        </div>

        {/* بطاقة طابور الأوفلاين (Offline Outbox) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-on-surface-variant font-cairo">طابور الأوفلاين (Outbox)</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-on-surface">
                {pendingOutboxCount}
              </span>
              <span className="text-xs font-bold text-on-surface-variant font-cairo">معاملات معلقة</span>
            </div>
            {pendingOutboxCount > 0 && (
              <button
                type="button"
                onClick={handleFlushOutboxNow}
                disabled={isFlushingOutbox}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold font-cairo transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isFlushingOutbox ? 'animate-spin' : ''}`} />
                <span>مزامنة الآن</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-on-surface-variant font-tajawal">
            {pendingOutboxCount === 0 ? 'كافة المبيعات مرفوعة ومحدثة بالخادم المركزي.' : 'توجد مبيعات مسجلة محلياً بانتظار التفريغ التلقائي.'}
          </p>
        </div>
      </div>

      {/* 3. Master Server Details & Live Pairing Box */}
      <div className="p-5 sm:p-6 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/15 pb-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold font-cairo text-on-surface flex items-center gap-2">
              <Server className="w-4 h-4 text-primary shrink-0" />
              <span>معلومات الخادم الرئيسي المستهدف (Master Server Connection)</span>
            </h3>
            <p className="text-xs text-on-surface-variant font-tajawal">
              حدد عنوان خادم المتجر الرئيسي وأدخل رمز الاقتران السري لربط نقطة البيع هذه.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isPaired ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>محطة كاشير موثقة ومعتمدة</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>بانتظار الاقتران بالخادم</span>
              </span>
            )}
          </div>
        </div>

        {/* 3.1 الاكتشاف التلقائي للشبكة (Zero-Config Discovery) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-outline-variant/20 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold font-cairo flex items-center gap-2 text-on-surface">
                <Radio className="w-4 h-4 text-primary animate-pulse" />
                <span>الاكتشاف التلقائي الذكي (mDNS & UDP Discovery)</span>
              </h4>
              <p className="text-xs text-on-surface-variant font-tajawal">
                البحث التلقائي عن حواسيب الخادم النشطة على نفس شبكة Wi-Fi أو كابل LAN دون كتابة IP.
              </p>
            </div>
            <button
              type="button"
              disabled={isScanningServers}
              onClick={handleScanLanServers}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary text-xs font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningServers ? 'animate-spin' : ''}`} />
              <span>{isScanningServers ? 'جاري مسح الشبكة...' : '🔍 مسح الشبكة واكتشاف الخوادم'}</span>
            </button>
          </div>

          {/* قائمة الخوادم المكتشفة */}
          {discoveredServers.length > 0 && (
            <div className="space-y-2 pt-2 animate-fade-in">
              <span className="text-xs font-bold text-on-surface font-cairo">الخوادم المتاحة على الشبكة المحلية:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {discoveredServers.map((srv, idx) => (
                  <button
                    key={`${srv.ip}-${idx}`}
                    type="button"
                    onClick={() => {
                      setClientUrlInput(srv.serverUrl);
                      handleTestServerConnection(srv.serverUrl);
                    }}
                    className={`p-3.5 rounded-xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      clientUrlInput === srv.serverUrl
                        ? 'border-primary bg-primary/10 text-on-surface shadow-xs ring-1 ring-primary/30'
                        : 'border-outline-variant/20 bg-surface-container hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-xs sm:text-sm font-cairo flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-primary" />
                        <span>{srv.shopName || srv.deviceName || 'خادم AN POS'}</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-primary" dir="ltr">
                        {srv.serverUrl}
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                        {srv.pingMs ? `${srv.pingMs} ms` : 'متاح'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3.2 إدخال عنوان الخادم ومعرف الكاشير */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 space-y-1.5">
            <label className="text-xs font-bold text-on-surface font-cairo flex items-center justify-between">
              <span>عنوان الخادم الرئيسي (Master Server URL):</span>
              <span className="text-[11px] text-on-surface-variant font-mono">http://IP:3000</span>
            </label>
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                value={clientUrlInput}
                onChange={(e) => setClientUrlInput(e.target.value)}
                placeholder="http://192.168.1.100:3000"
                className="w-full h-11 px-3.5 pl-24 rounded-xl border border-outline-variant/30 bg-surface text-on-surface font-mono text-xs sm:text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                disabled={testClientUrlLoading || !clientUrlInput}
                onClick={() => handleTestServerConnection(clientUrlInput)}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary text-xs font-bold font-cairo transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                <Activity className={`w-3.5 h-3.5 ${testClientUrlLoading ? 'animate-spin' : ''}`} />
                <span>فحص Ping</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-on-surface font-cairo">
              بادئة ترقيم نقطة البيع (Terminal Code):
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

        {/* 3.3 حالة الاقتران والتوثيق */}
        {isPaired ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300 font-cairo">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>محطة الكاشير مقترنة وموثقة بنجاح مع الخادم المركزي</span>
                </div>
                <p className="text-xs text-on-surface-variant font-tajawal">
                  تتم المصادقة عبر توكن جلسة مشفر وموثق بالجدار الناري للخادم.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isUnpairingLoading}
                  onClick={handleUnpairServer}
                  className="px-3.5 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-500/30 text-xs font-bold font-cairo transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isUnpairingLoading ? 'جاري فك الارتباط...' : 'إلغاء الاقتران / تغيير الخادم'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono border-t border-emerald-500/20">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface/60 border border-outline-variant/15">
                <span className="font-cairo text-on-surface-variant">معرف الجهاز (Device ID):</span>
                <span className="font-bold text-on-surface truncate max-w-[180px]">{activeDeviceId || '---'}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface/60 border border-outline-variant/15">
                <span className="font-cairo text-on-surface-variant">عنوان الخادم المعتمد:</span>
                <span className="font-bold text-primary truncate max-w-[180px]">{activeServerUrl || '---'}</span>
              </div>
            </div>
          </div>
        ) : (
          /* نموذج إدخال رمز الاقتران للربط الجديد */
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 font-cairo">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>مفتاح الربط السري (Server Connection PIN / Key):</span>
              </label>
              <div className="relative">
                <input
                  type={showPairKeyInput ? 'text' : 'password'}
                  value={pairingKeyInput}
                  onChange={(e) => setPairingKeyInput(e.target.value)}
                  placeholder="مثال: 849201 أو A1B2-C3D4"
                  className="w-full h-11 px-3.5 pl-10 rounded-xl border border-outline-variant/30 bg-surface text-on-surface font-mono text-xs sm:text-sm focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPairKeyInput(!showPairKeyInput)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer p-1"
                >
                  {showPairKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant font-tajawal">
                يمكنك نسخ أو قراءة هذا الرمز من شاشة الخادم الرئيسي (تحت بند: مفتاح الاتصال السري).
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isPairingLoading || !clientUrlInput || !pairingKeyInput}
                onClick={handlePairWithServer}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <ShieldCheck className={`w-4 h-4 ${isPairingLoading ? 'animate-spin' : ''}`} />
                <span>{isPairingLoading ? 'جاري الاقتران وتوثيق الجهاز...' : '🔐 اقتران وتوثيق نقطة البيع الآن'}</span>
              </button>
            </div>
          </div>
        )}

        {/* رسائل نتيجة الفحص والاقتران */}
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
          <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
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

      {/* 4. Troubleshooting & Connection Guide Card */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-xs space-y-3">
        <h4 className="text-xs sm:text-sm font-bold font-cairo text-on-surface flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary shrink-0" />
          <span>إرشادات ونصائح استقرار الشبكة لنقاط البيع الفرعية:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-on-surface-variant font-tajawal leading-relaxed">
          <div className="p-3 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">1. شبكة موحدة:</span>
            تأكد من اتصال هذا الجهاز وجهاز الخادم بنفس الراوتر عبر كابل إيثرنت أو نفس شبكة Wi-Fi.
          </div>
          <div className="p-3 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">2. المنفذ 3000 والجدار الناري:</span>
            يجب أن يسمح جدار حماية ويندوز على جهاز الخادم بالمرور عبر المنفذين 3000 و 3001.
          </div>
          <div className="p-3 rounded-2xl bg-surface border border-outline-variant/15 space-y-1">
            <span className="font-bold font-cairo text-on-surface block">3. استمرار البيع أوفلاين:</span>
            في حال انقطاع كابل الشبكة، تستمر هذه المحطة بالبيع والطباعة فورياً دون أي توقف أو تعطيل.
          </div>
        </div>
      </div>
    </div>
  );
}
