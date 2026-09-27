import { useState, useEffect, useCallback } from 'react';
import { useSystemSettings } from '@/features/settings/hooks/useSystemSettings';
import {
  setStoredTransportConfig,
  getStoredServerLanUrl,
  getStoredClientToken,
  getStoredClientDeviceId,
} from '@/lib/transportGateway';
import { realtimeEventBus } from '@/lib/realtimeEventBus';
import { useNotificationStore } from '@/store/notificationStore';
import { APP_VERSION } from '@/constants/app';
import type { PairingData } from '@/features/settings/components/PairingQR';
import type {
  ActiveSection,
  ConnectionMethod,
  DiscoveredServer,
  TestConnectionResult,
  PairingStatusResult,
  ClientTerminalState,
} from './types';

export function useClientTerminalPairing(): ClientTerminalState {
  const { settings, handleSaveSettings } = useSystemSettings();
  const { addNotification } = useNotificationStore();

  // التبويب النشط بين القسمين الرئيسيين
  const [activeSection, setActiveSection] = useState<ActiveSection>('pairing');

  // خيارات قسم الاقتران
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>('discovery');
  const [clientUrlInput, setClientUrlInput] = useState<string>(() => {
    return settings.serverLanUrl || getStoredServerLanUrl() || '';
  });
  const [clientTermCodeInput, setClientTermCodeInput] = useState<string>(() => {
    return settings.terminalCode || 'T02';
  });
  const [pairingKeyInput, setPairingKeyInput] = useState<string>('');
  const [showPairKeyInput, setShowPairKeyInput] = useState<boolean>(false);
  const [showMasterServerKey, setShowMasterServerKey] = useState<boolean>(false);
  const [isPairingLoading, setIsPairingLoading] = useState<boolean>(false);
  const [isUnpairingLoading, setIsUnpairingLoading] = useState<boolean>(false);
  const [isScanningServers, setIsScanningServers] = useState<boolean>(false);
  const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
  const [scanPerformed, setScanPerformed] = useState<boolean>(false);
  const [testClientUrlLoading, setTestClientUrlLoading] = useState<boolean>(false);
  const [testClientUrlResult, setTestClientUrlResult] = useState<TestConnectionResult | null>(null);
  const [pairingStatusResult, setPairingStatusResult] = useState<PairingStatusResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);

  // بيانات الخادم لرمز الاستجابة السريعة QR والمفتاح السري
  const [serverPairingInfo, setServerPairingInfo] = useState<PairingData | null>(null);

  // حالة الاتصال اللحظية من محرك الأحداث
  const [liveEventBusStatus, setLiveEventBusStatus] = useState(() => realtimeEventBus.getStatus());

  useEffect(() => {
    const unsub = realtimeEventBus.onStatusChange((s) => {
      setLiveEventBusStatus({ ...s });
    });
    return () => unsub();
  }, []);

  // جلب معلومات الاقتران من الخادم (بما فيها المفتاح السري وبيانات QR)
  useEffect(() => {
    let active = true;
    async function fetchPairingData() {
      try {
        if (typeof window !== 'undefined' && window.electronAPI?.server?.pairingInfo) {
          const res = await window.electronAPI.server.pairingInfo();
          if (active && res) {
            setServerPairingInfo(res as PairingData);
          }
        }
      } catch (err) {
        console.warn('Could not fetch server pairing info:', err);
      }
    }
    fetchPairingData();
    return () => { active = false; };
  }, []);

  // مزامنة حالة الإعدادات المحفوظة عند تحميل الصفحة
  useEffect(() => {
    if (settings.serverLanUrl && !clientUrlInput) {
      setClientUrlInput(settings.serverLanUrl);
    }
    if (settings.terminalCode && !clientTermCodeInput) {
      setClientTermCodeInput(settings.terminalCode);
    }
  }, [settings.serverLanUrl, settings.terminalCode, clientUrlInput, clientTermCodeInput]);

  // نسخ النصوص مع تغذية بصرية
  const handleCopy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // فحص سرعة الاتصال بالخادم
  const handleTestServerConnection = useCallback(async (urlToTest?: string) => {
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
            version: APP_VERSION,
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
            version: info?.version || APP_VERSION,
          });
        } else {
          setTestClientUrlResult({
            success: false,
            msg: `استجاب الخادم برمز خطأ HTTP ${res.status}`,
          });
        }
      }
    } catch (e: unknown) {
      const err = e as { name?: string };
      setTestClientUrlResult({
        success: false,
        msg: err.name === 'AbortError' ? 'انتهت مهلة محاولة الاتصال بالخادم (Timeout)' : 'تعذر الوصول للخادم، تأكد من تشغيل الخادم وتواجد الجهازين على نفس الراوتر',
      });
    } finally {
      setTestClientUrlLoading(false);
    }
  }, [clientUrlInput, settings.serverLanUrl]);

  // مسح الشبكة الذكي للبحث عن الخوادم
  const handleScanLanServers = useCallback(async () => {
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
              version: info?.version || APP_VERSION,
            },
          ]);
        }
      }
    } catch (e: unknown) {
      console.warn('LAN Scan Error:', e);
    } finally {
      setIsScanningServers(false);
    }
  }, [clientUrlInput]);

  // تنفيذ الاقتران المشفر وتوثيق الجهاز
  const handlePairWithServer = useCallback(async () => {
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
    } catch (e: unknown) {
      const err = e as { message?: string };
      setPairingStatusResult({ success: false, msg: err.message || 'تعذر إتمام عملية الاقتران مع الخادم' });
    } finally {
      setIsPairingLoading(false);
    }
  }, [clientUrlInput, pairingKeyInput, settings.syncMode, clientTermCodeInput, handleSaveSettings, addNotification]);

  // فك الارتباط / إلغاء الاقتران
  const handleUnpairServer = useCallback(async () => {
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
    } catch (e: unknown) {
      console.warn('Unpair error:', e);
    } finally {
      setIsUnpairingLoading(false);
    }
  }, [clientUrlInput, handleSaveSettings, addNotification]);

  // تحويل هذا الحاسوب إلى خادم رئيسي
  const handleMakeServerMaster = useCallback(() => {
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
  }, [handleSaveSettings, addNotification]);

  // استكمال معالج الإعداد
  const handleWizardCompleted = useCallback((newRole: 'server' | 'client' | 'standalone') => {
    const nextSyncMode = settings.syncMode === 'single' ? 'lan' : settings.syncMode;
    handleSaveSettings({
      terminalRole: newRole,
      terminal_role: newRole,
      syncMode: nextSyncMode,
      sync_mode: nextSyncMode,
    });
    setStoredTransportConfig({ role: newRole, syncMode: nextSyncMode });
  }, [settings.syncMode, handleSaveSettings]);

  const isPaired = Boolean(settings.clientToken || getStoredClientToken());
  const activeServerUrl = settings.serverLanUrl || getStoredServerLanUrl();
  const activeDeviceId = settings.clientDeviceId || getStoredClientDeviceId();
  const isConnected = liveEventBusStatus.state === 'connected';

  // المفتاح السري للخادم: إما من السيرفر المحلي أو المفتاح المدخل
  const effectiveServerKey = serverPairingInfo?.key || settings.connectionKey || settings.connection_key || pairingKeyInput || '849201';

  // إعداد بيانات الـ QR Code للعرض في قسم معلومات الخادم
  const effectivePairingData: PairingData = {
    ip: serverPairingInfo?.ip || activeServerUrl?.replace(/^https?:\/\//, '').split(':')[0] || '127.0.0.1',
    port: serverPairingInfo?.port || (activeServerUrl ? parseInt(activeServerUrl.split(':')[2] || '3000', 10) : 3000),
    key: effectiveServerKey,
    shopName: serverPairingInfo?.shopName || settings.shopName || settings.shop_name || 'AN POS',
    ips: serverPairingInfo?.ips || [serverPairingInfo?.ip || '127.0.0.1'],
  };

  return {
    activeSection,
    setActiveSection,
    connectionMethod,
    setConnectionMethod,
    clientUrlInput,
    setClientUrlInput,
    clientTermCodeInput,
    setClientTermCodeInput,
    pairingKeyInput,
    setPairingKeyInput,
    showPairKeyInput,
    setShowPairKeyInput,
    showMasterServerKey,
    setShowMasterServerKey,
    isPairingLoading,
    isUnpairingLoading,
    isScanningServers,
    discoveredServers,
    scanPerformed,
    testClientUrlLoading,
    testClientUrlResult,
    pairingStatusResult,
    copiedField,
    showSetupWizard,
    setShowSetupWizard,
    serverPairingInfo,
    liveEventBusStatus,
    isPaired,
    activeServerUrl,
    activeDeviceId,
    isConnected,
    effectiveServerKey,
    effectivePairingData,
    handleCopy,
    handleTestServerConnection,
    handleScanLanServers,
    handlePairWithServer,
    handleUnpairServer,
    handleMakeServerMaster,
    handleWizardCompleted,
  };
}
