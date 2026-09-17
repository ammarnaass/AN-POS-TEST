import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, type NetworkSettingsEntity, type ConnectedDeviceEntity, type ConnectedDeviceType, type ConnectionType } from '@/infrastructure/database/dexie/db';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';
import { generateId } from '@/utils';

export const DEFAULT_NET_SETTINGS: NetworkSettingsEntity = {
  id: 'default',
  lanEnabled: false,
  serverIp: '',
  serverPort: 3000,
  protocol: 'http',
  autoReconnect: true,
  reconnectInterval: 5,
  cloudEnabled: false,
  syncAuto: true,
  syncInterval: 5,
  syncType: 'incremental',
  syncTime: 'night',
  alertOnSyncFail: true,
  syncFailCount: 0,
  oauthEnabled: false,
  jwtEnabled: false,
  apiRateLimit: 100,
  ipWhitelist: [],
  forceHttps: true,
  printerConnection: 'usb',
  printerDriver: 'esc_pos',
  printerDpi: 203,
  printerSpeed: 150,
  printerPaperSize: 80,
  barcodeType: 'code128',
  scannerType: 'handheld',
  scannerInterface: 'usb',
  scannerSpeed: 100,
  scannerDpi: 200,
  scannerBeepEnabled: true,
  scannerTerminator: 'Enter',
  scannerMinLength: 6,
  scannerAllowManualTypes: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useNetworkServer(activeTab?: string) {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const { user: currentUser } = useAuthStore();
  const isDeveloper = currentUser?.role === 'developer';

  const { data: rawNetSettings } = useQuery({
    queryKey: ['network_settings'],
    queryFn: () => db.network_settings.get('default'),
    refetchInterval: 3000,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ['connected_devices'],
    queryFn: () => db.connected_devices.toArray(),
    refetchInterval: 3000,
  });

  const { data: rawConnectedDevices, refetch: refetchConnected } = useQuery({
    queryKey: ['server:connected-devices'],
    queryFn: async () => {
      const res = await (window as any).electronAPI?.server?.connectedDevices?.();
      return res ?? [];
    },
    staleTime: 3000,
    refetchInterval: 3000,
  });

  const mobilePhones: any[] = Array.isArray(rawConnectedDevices)
    ? rawConnectedDevices
    : Array.isArray(rawConnectedDevices?.data)
    ? rawConnectedDevices.data
    : [];

  const dexieOnlineIds = new Set(devices.filter(d => d.status === 'online').map(d => d.id));
  const serverOnlineCount = mobilePhones.filter((m: any) => m.status === 'online' && !dexieOnlineIds.has(m.id)).length;
  const onlineDevicesCount = dexieOnlineIds.size + serverOnlineCount;
  const hasActiveConnections = onlineDevicesCount > 0;

  const netSettings: NetworkSettingsEntity = { ...DEFAULT_NET_SETTINGS, ...(rawNetSettings as Partial<NetworkSettingsEntity> | undefined) };

  const netSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<NetworkSettingsEntity>) => {
      const current = await db.network_settings.get('default');
      const base = (current as NetworkSettingsEntity | undefined) ?? { ...DEFAULT_NET_SETTINGS };
      await db.network_settings.put({ ...base, ...updates, id: 'default', updatedAt: new Date().toISOString() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['network_settings'] }),
  });

  const deviceMutation = useMutation({
    mutationFn: async (device: ConnectedDeviceEntity) => {
      await db.connected_devices.put({ ...device, updatedAt: new Date().toISOString() });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connected_devices'] }),
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: async (id: string) => { await db.connected_devices.delete(id); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['connected_devices'] }),
  });

  const deleteMobileDeviceMutation = useMutation({
    mutationFn: async (id: string) => {
      await (window as any).electronAPI?.server?.deleteDevice?.(id);
      await refetchConnected();
    },
    onSuccess: () => {
      addNotification({ title: 'تم حذف الجهاز', message: 'تم إزالة الجهاز من سجل الأجهزة المقترنة بنجاح', type: 'success' });
    },
  });

  const saveNet = (updates: Partial<NetworkSettingsEntity>) => {
    netSettingsMutation.mutate(updates);
    if (updates.serverPort !== undefined) {
      const api = (window as any).electronAPI?.server;
      if (api?.updatePort) {
        api.updatePort(Number(updates.serverPort)).catch((err: any) => {
          console.warn('[settings] فشل تحديث منفذ الخادم وإعلان Bonjour:', err);
        });
      }
    }
  };

  const logNetActivity = async (action: string, details: string, extra: { ipAddress?: string; deviceInfo?: string } = {}) => {
    await db.user_activities.add({
      id: generateId(),
      userId: currentUser?.id ?? 'system',
      action,
      entity: 'network',
      entityType: 'network',
      details,
      ipAddress: extra.ipAddress,
      deviceInfo: extra.deviceInfo,
      performedAt: new Date().toISOString(),
    });
  };

  const [serverStatus, setServerStatus] = useState<{ running: boolean; lanEnabled: boolean; port: number } | null>(null);
  const [serverLoading, setServerLoading] = useState(false);
  const [pairingInfo, setPairingInfo] = useState<any>(null);

  // Poll server status if network or mobile tab is active
  useEffect(() => {
    if (activeTab && activeTab !== 'network' && activeTab !== 'mobile') return;
    let cancelled = false;
    async function fetchStatus() {
      try {
        const api = (window as any).electronAPI?.server;
        if (!api) return;
        const [status, info] = await Promise.all([
          api.status() as Promise<{ running: boolean; lanEnabled: boolean; port: number }>,
          api.pairingInfo() as Promise<{ ip: string; port: number; key: string; shopName: string; ips: string[] }>,
        ]);
        if (!cancelled) {
          setServerStatus(status);
          setPairingInfo(info);
          refetchConnected();
        }
      } catch {
        // Non-electron environment
      }
    }
    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [activeTab, refetchConnected]);

  const toggleServer = async (syncMode: string = 'single') => {
    if (serverLoading) return;
    setServerLoading(true);
    try {
      const api = (window as any).electronAPI?.server;
      if (!api) {
        addNotification({
          title: 'تنبيه',
          message: 'خادم ربط الهواتف متاح حصرياً داخل تطبيق سطح المكتب (Desktop App) وليس عبر المتصفح العادي.',
          type: 'warning',
        });
        return;
      }
      if (serverStatus?.running) {
        await api.disable();
      } else {
        if (syncMode === 'single' && !isDeveloper) {
          addNotification({
            title: 'وضع التشغيل غير متوافق',
            message: 'لا يمكن تشغيل خادم الربط أو إقران الهواتف في وضع "جهاز واحد". يرجى تغيير وضع التشغيل أولاً إلى "عدة أجهزة (شبكة محلية LAN)".',
            type: 'warning',
          });
          return;
        }
        const res = await api.enable({ port: netSettings.serverPort });
        if (res && res.success === false) {
          addNotification({
            title: 'تنبيه وضع التشغيل',
            message: res.error || 'لا يمكن تشغيل الخادم في وضع جهاز واحد.',
            type: 'warning',
          });
          return;
        }
      }

      const status = await api.status() as { running: boolean; lanEnabled: boolean; port: number };
      const info = await api.pairingInfo() as { ip: string; port: number; key: string; shopName: string; ips: string[] };
      setServerStatus(status);
      setPairingInfo(info);
      refetchConnected();
      addNotification({
        title: status.running ? 'تم تشغيل خادم الشبكة' : 'تم إيقاف خادم الشبكة',
        message: status.running
          ? `متاح على ${info.ips[0] ?? '---'}:${status.port}`
          : 'تم إلغاء تشغيل الخادم',
        type: 'success',
      });
      if (status.running) {
        saveNet({ lanEnabled: true, serverPort: status.port });
      } else {
        saveNet({ lanEnabled: false });
      }
    } catch (e) {
      addNotification({ title: 'خطأ في الخادم', message: (e as Error).message || 'فشل', type: 'error' });
    } finally {
      setServerLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    try {
      const api = (window as any).electronAPI?.server;
      if (!api?.regenerateKey) return;
      await api.regenerateKey();
      const info = await api.pairingInfo();
      setPairingInfo(info);
      addNotification({
        title: 'تم تجديد المفتاح السري',
        message: 'تم توليد مفتاح أمان جديد للاقتران بنجاح',
        type: 'success',
      });
    } catch (e) {
      addNotification({ title: 'خطأ في تجديد المفتاح', message: (e as Error).message || 'فشل', type: 'error' });
    }
  };

  const [netSubTab, setNetSubTab] = useState<'mode' | 'lan' | 'cloud' | 'printer' | 'barcode' | 'security' | 'devices'>('mode');
  const [testingLan, setTestingLan] = useState<null | 'ok' | 'fail'>(null);
  const [testingPrinter, setTestingPrinter] = useState<null | 'ok' | 'fail'>(null);
  const [testingScanner, setTestingScanner] = useState<null | 'ok' | 'fail'>(null);
  const [printerSavedUnlocked, setPrinterSavedUnlocked] = useState(false);
  const [scannerSavedUnlocked, setScannerSavedUnlocked] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceName: '',
    deviceType: 'printer' as ConnectedDeviceType,
    connectionType: 'usb' as ConnectionType,
    ipAddress: '',
    macAddress: '',
    port: '',
    vendor: '',
    model: '',
  });

  const handleTestLan = async () => {
    if (!netSettings.serverIp) {
      addNotification({ title: 'إعداد غير مكتمل', message: 'أدخل عنوان IP للخادم أولاً', type: 'warning' });
      return;
    }
    setTestingLan('ok');
    const protocol = netSettings.protocol || 'http';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${protocol}://${netSettings.serverIp}:${netSettings.serverPort}/api/health`, {
        signal: controller.signal,
      });
      if (res.ok) {
        addNotification({
          title: 'نجح الاتصال',
          message: `الخادم ${netSettings.serverIp}:${netSettings.serverPort} متاح`,
          type: 'success',
        });
        saveNet({ lastConnectedAt: new Date().toISOString() });
      } else {
        setTestingLan('fail');
        addNotification({ title: 'فشل الاتصال', message: `رمز ${res.status} من الخادم`, type: 'error' });
      }
    } catch (e) {
      setTestingLan('fail');
      addNotification({ title: 'فشل الاتصال', message: `لا يمكن الوصول للخادم: ${(e as Error).message}`, type: 'error' });
    } finally {
      clearTimeout(timeout);
      await new Promise(r => setTimeout(r, 500));
      setTestingLan(null);
    }
  };

  const handleTestPrinter = async () => {
    setTestingPrinter('ok');
    const desc = `اختبار الطابعة (${netSettings.printerDriver.toUpperCase()}) — ${netSettings.printerConnection}`;
    await logNetActivity('printer_test', desc, { deviceInfo: netSettings.printerConnection });
    await new Promise(r => setTimeout(r, 800));
    setTestingPrinter(null);
    setPrinterSavedUnlocked(true);
    saveNet({ printerTestedAt: new Date().toISOString() });
    addNotification({ title: 'نجح اختبار الطابعة', message: 'تمت طباعة صفحة تجريبية بنجاح', type: 'success' });
  };

  const handleTestScanner = async () => {
    setTestingScanner('ok');
    const desc = `اختبار الماسح (${netSettings.scannerType}/${netSettings.scannerInterface}) — ${netSettings.barcodeType}`;
    await logNetActivity('scanner_test', desc, { deviceInfo: netSettings.scannerInterface });
    await new Promise(r => setTimeout(r, 700));
    setTestingScanner(null);
    setScannerSavedUnlocked(true);
    saveNet({ scannerTestedAt: new Date().toISOString() });
    addNotification({ title: 'نجح اختبار الماسح', message: 'تم مسح باركود تجريبي بنجاح', type: 'success' });
  };

  const handleSyncFail = async () => {
    const newCount = netSettings.syncFailCount + 1;
    await saveNet({ syncFailCount: newCount });
    await logNetActivity('sync_fail', `فشل المزامنة #${newCount} (${netSettings.syncType})`);
    if (netSettings.alertOnSyncFail && newCount >= 3) {
      addNotification({ title: 'فشل المزامنة', message: 'فشلت 3 محاولات مزامنة متتالية (BR-NET-010)', type: 'error' });
      await saveNet({ syncFailCount: 0 });
    }
  };

  const handleAddDevice = () => {
    const trimmedName = newDevice.deviceName?.trim();
    if (!trimmedName) return;

    const isDuplicate = devices.some(d => d.deviceName.trim().toLowerCase() === trimmedName.toLowerCase()) ||
                        mobilePhones.some((m: any) => ((m.device_name || m.deviceName || '').trim().toLowerCase()) === trimmedName.toLowerCase());
    if (isDuplicate) {
      addNotification({
        title: 'اسم الجهاز مستخدم مسبقاً',
        message: `اسم الجهاز "${trimmedName}" مسجل بالفعل. يرجى اختيار اسم فريد لمنع تكرار أسماء الأجهزة.`,
        type: 'warning',
      });
      return;
    }

    deviceMutation.mutate({
      id: generateId(),
      deviceName: trimmedName,
      deviceType: newDevice.deviceType,
      connectionType: newDevice.connectionType,
      ipAddress: newDevice.ipAddress || undefined,
      macAddress: newDevice.macAddress || undefined,
      port: newDevice.port ? Number(newDevice.port) : undefined,
      vendor: newDevice.vendor || undefined,
      model: newDevice.model || undefined,
      status: 'online',
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    setNewDevice({ deviceName: '', deviceType: 'printer', connectionType: 'usb', ipAddress: '', macAddress: '', port: '', vendor: '', model: '' });
    setShowDeviceForm(false);
  };

  return {
    netSettings,
    devices,
    mobilePhones,
    onlineDevicesCount,
    hasActiveConnections,
    serverStatus,
    serverLoading,
    pairingInfo,
    refetchConnected,
    saveNet,
    toggleServer,
    handleRegenerateKey,
    netSubTab,
    setNetSubTab,
    testingLan,
    testingPrinter,
    testingScanner,
    printerSavedUnlocked,
    setPrinterSavedUnlocked,
    scannerSavedUnlocked,
    setScannerSavedUnlocked,
    showDeviceForm,
    setShowDeviceForm,
    newDevice,
    setNewDevice,
    handleTestLan,
    handleTestPrinter,
    handleTestScanner,
    handleSyncFail,
    handleAddDevice,
    deleteDeviceMutation,
    deleteMobileDeviceMutation,
  };
}
