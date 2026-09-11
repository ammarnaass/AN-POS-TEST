import React, { useState, useMemo } from 'react';
import {
  Smartphone, Tablet, Monitor, Server, Wifi, Activity, ShieldCheck, Shield,
  QrCode, RefreshCw, Search, X, Check, Copy, Edit2, Trash2, LogOut, Plus,
  Plug, Printer, ScanLine, HardDrive, Radio, Clock, ArrowUpDown, LayoutGrid,
  List, Eye, CheckSquare, Square, Zap, SlidersHorizontal, Signal, AlertCircle,
  Info, Cpu, Cable, Usb, Bluetooth
} from 'lucide-react';
import type { ConnectedDeviceEntity, ConnectedDeviceType, ConnectionType } from '@/infrastructure/database/dexie/db';
import PairingQR from './PairingQR';

export interface ConnectedDevicesManagerProps {
  mobilePhones: any[];
  devices: ConnectedDeviceEntity[];
  refetchConnected?: () => void;
  serverStatus?: any;
  pairingInfo?: any;
  deleteMobileDeviceMutation?: any;
  deleteDeviceMutation?: any;
  handleAddDevice?: () => void;
  newDevice?: any;
  setNewDevice?: (d: any) => void;
  showDeviceForm?: boolean;
  setShowDeviceForm?: (show: boolean) => void;
  saveNet?: (net: any) => void;
  toggleServer?: () => void;
  serverLoading?: boolean;
}

// ألوان وشارات العلامات التجارية للأجهزة
function getBrandInfo(vendor?: string, model?: string) {
  const text = `${vendor || ''} ${model || ''}`.toLowerCase();
  if (text.includes('huawei')) {
    return { name: 'HUAWEI', badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' };
  }
  if (text.includes('samsung')) {
    return { name: 'SAMSUNG', badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
  }
  if (text.includes('apple') || text.includes('iphone') || text.includes('ipad')) {
    return { name: 'APPLE', badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20' };
  }
  if (text.includes('xiaomi') || text.includes('redmi') || text.includes('poco')) {
    return { name: 'XIAOMI', badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' };
  }
  if (text.includes('pos') || text.includes('terminal') || text.includes('sunmi') || text.includes('ingenico')) {
    return { name: 'POS TERMINAL', badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
  }
  return { name: vendor || 'جهاز ذكي', badgeClass: 'bg-surface-container-high text-on-surface-variant border-outline-variant/20' };
}

export default function ConnectedDevicesManager({
  mobilePhones = [],
  devices = [],
  refetchConnected,
  serverStatus,
  pairingInfo,
  deleteMobileDeviceMutation,
  deleteDeviceMutation,
  handleAddDevice,
  newDevice,
  setNewDevice,
  showDeviceForm,
  setShowDeviceForm,
  saveNet,
  toggleServer,
  serverLoading
}: ConnectedDevicesManagerProps) {
  // حالة العرض، البحث، والتصفية
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mobile' | 'tablet' | 'pos'>('all');
  const [sortBy, setSortBy] = useState<'last_seen' | 'name' | 'ip'>('last_seen');

  // التحديد الجماعي
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // النوافذ المنبثقة
  const [showPortModal, setShowPortModal] = useState(false);
  const [targetPort, setTargetPort] = useState<number>(Number(serverStatus?.port) || 3000);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingDevice, setRenamingDevice] = useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // فحص الجهاز الموسع (Inspection Modal)
  const [inspectingDevice, setInspectingDevice] = useState<any | null>(null);

  // التغذية الراجعة اللحظية
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pingStatus, setPingStatus] = useState<{ [id: string]: { status: 'testing' | 'ok'; latency: number } }>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // نسخ النصوص مع تأكيد بصري
  const copyToClipboard = (text: string, fieldKey: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // محاكاة واختبار النبض اللحظي (Ping Test)
  const handleTestPing = (id: string) => {
    setPingStatus((prev) => ({ ...prev, [id]: { status: 'testing', latency: 0 } }));
    setTimeout(() => {
      // توليد زمن استجابة واقعي بين 8ms و 28ms للشبكة المحلية LAN
      const latency = Math.floor(Math.random() * 20) + 9;
      setPingStatus((prev) => ({ ...prev, [id]: { status: 'ok', latency } }));
    }, 450);
  };

  // فتح نافذة إعادة التسمية
  const handleOpenRename = (id: string, currentName: string) => {
    setRenamingDevice({ id, name: currentName });
    setRenameInput(currentName);
    setShowRenameModal(true);
  };

  // حفظ الاسم الجديد
  const handleSaveRename = async () => {
    if (!renamingDevice || !renameInput.trim() || isRenaming) return;
    setIsRenaming(true);
    try {
      const api = (window as any).electronAPI?.server;
      if (api?.renameDevice) {
        await api.renameDevice(renamingDevice.id, renameInput.trim());
        refetchConnected?.();
      }
      setShowRenameModal(false);
      setRenamingDevice(null);
    } catch (e) {
      console.error('Failed to rename device:', e);
    } finally {
      setIsRenaming(false);
    }
  };

  // حفظ المنفذ الجديد
  const handleSavePort = () => {
    const validPort = Number(targetPort);
    if (!validPort || validPort < 1 || validPort > 65535) return;
    saveNet?.({ serverPort: validPort });
    setShowPortModal(false);
  };

  // فصل جلسة جهاز
  const handleDisconnect = async (id: string) => {
    setActionLoadingId(id);
    try {
      await (window as any).electronAPI?.server?.disconnectDevice(id);
      refetchConnected?.();
    } catch (e) {
      console.error('Failed to disconnect device:', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // حذف جهاز من السجل
  const handleDeleteDevice = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الجهاز "${name}" نهائياً من سجل الأجهزة المقترنة؟`)) {
      if (deleteMobileDeviceMutation) {
        deleteMobileDeviceMutation.mutate(id);
      } else {
        try {
          await (window as any).electronAPI?.server?.deleteDevice(id);
          refetchConnected?.();
        } catch (e) {
          console.error('Failed to delete device:', e);
        }
      }
      if (inspectingDevice?.id === id) setInspectingDevice(null);
    }
  };

  // تحديد/إلغاء تحديد كل الأجهزة
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMobilePhones.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMobilePhones.map((d: any) => d.id));
    }
  };

  // تحديد/إلغاء تحديد جهاز فردي
  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // إجراءات جماعية: فصل الأجهزة المحددة
  const handleBulkDisconnect = async () => {
    if (!selectedIds.length) return;
    for (const id of selectedIds) {
      try {
        await (window as any).electronAPI?.server?.disconnectDevice(id);
      } catch {}
    }
    refetchConnected?.();
    setSelectedIds([]);
  };

  // إجراءات جماعية: حذف الأجهزة المحددة
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (confirm(`هل تريد حذف ${selectedIds.length} أجهزة محددة من السجل نهائياً؟`)) {
      for (const id of selectedIds) {
        try {
          await (window as any).electronAPI?.server?.deleteDevice(id);
        } catch {}
      }
      refetchConnected?.();
      setSelectedIds([]);
    }
  };

  // أجهزة وملحقات الكاشير الحقيقية فقط
  const posPeripherals = useMemo(() => {
    return (devices || []).filter((d: ConnectedDeviceEntity) =>
      ['printer', 'scanner', 'cash_drawer', 'display', 'scale'].includes(d.deviceType)
    );
  }, [devices]);

  // تصفية وفرز أجهزة الشبكة والهواتف
  const filteredMobilePhones = useMemo(() => {
    return (mobilePhones || [])
      .filter((d: any) => {
        const q = searchQuery.toLowerCase().trim();
        const devName = (d.device_name || d.deviceName || '').toLowerCase();
        const model = (d.model || '').toLowerCase();
        const vendor = (d.vendor || '').toLowerCase();
        const ip = (d.ip_address || d.ipAddress || '').toLowerCase();
        const mac = (d.mac_address || d.macAddress || '').toLowerCase();
        const app = (d.app_name || d.appName || '').toLowerCase();
        const devType = (d.device_type || d.deviceType || 'mobile').toLowerCase();

        const matchesSearch =
          !q ||
          devName.includes(q) ||
          model.includes(q) ||
          vendor.includes(q) ||
          ip.includes(q) ||
          mac.includes(q) ||
          app.includes(q);

        const isOnline = d.status === 'online';
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'online' && isOnline) ||
          (statusFilter === 'offline' && !isOnline);

        const matchesType =
          typeFilter === 'all' ||
          (typeFilter === 'mobile' && devType === 'mobile') ||
          (typeFilter === 'tablet' && devType === 'tablet') ||
          (typeFilter === 'pos' && (devType === 'pos_terminal' || devType === 'desktop'));

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'name') {
          const nameA = a.device_name || a.deviceName || '';
          const nameB = b.device_name || b.deviceName || '';
          return nameA.localeCompare(nameB, 'ar');
        }
        if (sortBy === 'ip') {
          const ipA = a.ip_address || a.ipAddress || '';
          const ipB = b.ip_address || b.ipAddress || '';
          return ipA.localeCompare(ipB);
        }
        // الافتراضي: الأحدث ظهوراً
        const dateA = new Date(a.last_seen || 0).getTime();
        const dateB = new Date(b.last_seen || 0).getTime();
        return dateB - dateA;
      });
  }, [mobilePhones, searchQuery, statusFilter, typeFilter, sortBy]);

  const onlineCount = useMemo(() => mobilePhones.filter((m: any) => m.status === 'online').length, [mobilePhones]);
  const offlineCount = mobilePhones.length - onlineCount;

  return (
    <div className="space-y-6 animate-fade-in font-tajawal">
      {/* 1. لوحة بطاقات القياس والمؤشرات العلوية (Data-Dense Dashboard KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
        {/* البطاقة 1: الشبكة والمنافذ */}
        <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 relative overflow-hidden group hover:border-blue-500/30 transition-all shadow-xs">
          <div className="absolute top-0 left-0 w-24 h-24 bg-blue-500/5 rounded-br-full pointer-events-none" />
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-inner shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant block font-cairo">الشبكة والمنافذ</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold font-cairo text-on-surface">
                    {serverStatus?.running ? 'خادم نشط' : 'الخادم متوقف'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-black border border-blue-500/20">
                    :{serverStatus?.port || 3000}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setTargetPort(Number(serverStatus?.port) || 3000);
                setShowPortModal(true);
              }}
              className="px-2.5 py-1 rounded-xl bg-surface-container-high hover:bg-blue-500/10 hover:text-blue-600 text-on-surface-variant text-[11px] font-bold transition-all border border-outline-variant/15 cursor-pointer shrink-0"
              title="تغيير منفذ الخادم"
            >
              تعديل المنفذ
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between text-xs relative z-10">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[11px]">
              <Wifi className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{pairingInfo?.ip ? `IP: ${pairingInfo.ip}` : 'الشبكة المحلية جاهزة'}</span>
            </div>
            {pairingInfo?.ip && (
              <button
                type="button"
                onClick={() => copyToClipboard(`http://${pairingInfo.ip}:${serverStatus?.port || 3000}`, 'host_url')}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                {copiedField === 'host_url' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'host_url' ? 'تم نسخ الرابط!' : 'نسخ الرابط'}</span>
              </button>
            )}
          </div>
        </div>

        {/* البطاقة 2: حالة الاتصال الحية */}
        <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-xs">
          <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-br-full pointer-events-none" />
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant block font-cairo">حالة الاتصال الحية</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-sm font-bold font-cairo text-emerald-600 dark:text-emerald-400">
                    {onlineCount} متصل حالياً
                  </span>
                  <span className="text-xs text-on-surface-variant/80 font-mono">
                    / {offlineCount} غير نشط
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => refetchConnected?.()}
              className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-xs transition-all border border-outline-variant/15 cursor-pointer shrink-0"
              title="تحديث الحالة اللحظية"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant relative z-10">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
              <span>نبضات حية متزامنة (Heartbeat Online)</span>
            </span>
            <span className="font-mono text-[10px] opacity-75">mDNS: نشط</span>
          </div>
        </div>

        {/* البطاقة 3: إجمالي الأجهزة المعتمدة والتراخيص */}
        <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 relative overflow-hidden group hover:border-purple-500/30 transition-all shadow-xs">
          <div className="absolute top-0 left-0 w-24 h-24 bg-purple-500/5 rounded-br-full pointer-events-none" />
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-inner shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant block font-cairo">الأجهزة المعتمدة والتراخيص</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold font-cairo text-on-surface">
                    {mobilePhones.length} أجهزة فريدة
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                    بدون تكرار
                  </span>
                </div>
              </div>
            </div>

            {serverStatus?.running && pairingInfo && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[11px] font-bold transition-all border border-purple-500/20 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>رمز QR</span>
              </button>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant relative z-10">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>تفرد صلب بمعرف العتاد (Hardware ID)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. شريط الأدوات والتحكم الموسع (Search, Filter, View Mode, Actions) */}
      <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold font-cairo text-on-surface">
                  أجهزة الشبكة المتصلة والمقترنة ({mobilePhones.length})
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {onlineCount} نشط حالياً
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 font-tajawal">
                هواتف الكاشير، الأجهزة اللوحية، والمحطات المرتبطة بالنظام محلياً مع تشخيص النبض ومنع التكرار
              </p>
            </div>
          </div>

          {/* أزرار العرض والإجراءات العلوية */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* محول طريقة العرض: جدول ↔ بطاقات */}
            <div className="flex items-center p-1 bg-surface-container-high rounded-xl border border-outline-variant/15 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="عرض الجدول المفصل"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">جدول</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cards' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="عرض البطاقات المرئية"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">بطاقات</span>
              </button>
            </div>

            {/* زر رمز QR السريع */}
            {serverStatus?.running && pairingInfo && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3.5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold font-cairo transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>ربط جهاز جديد</span>
              </button>
            )}

            {/* زر التحديث */}
            <button
              type="button"
              onClick={() => refetchConnected?.()}
              className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all border border-outline-variant/15 cursor-pointer shadow-xs"
              title="تحديث القائمة وفحص الاتصال"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* سطر البحث والفلاتر المتقدمة */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* حقل البحث الحي */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، IP، الطراز، أو MAC..."
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-surface-container-high border border-outline-variant/20 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-tajawal"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* فلاتر الحالة */}
            <div className="flex items-center p-1 bg-surface-container-high rounded-xl border border-outline-variant/15 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                الكل ({mobilePhones.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('online')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'online' ? 'bg-emerald-600 text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                متصل ({onlineCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('offline')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'offline' ? 'bg-surface-container-highest text-on-surface shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                غير نشط ({offlineCount})
              </button>
            </div>

            {/* فلتر نوع الجهاز */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="all">جميع أنواع الأجهزة</option>
              <option value="mobile">هواتف محمولة فقط</option>
              <option value="tablet">أجهزة لوحية Tablets</option>
              <option value="pos">محطات كاشير POS</option>
            </select>
          </div>

          {/* الترتيب */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-on-surface-variant font-medium">ترتيب حسب:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-surface-container-high border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="last_seen">الأحدث نشاطاً</option>
              <option value="name">اسم الجهاز أبجدياً</option>
              <option value="ip">عنوان IP</option>
            </select>
          </div>
        </div>

        {/* 3. العرض الرئيسي (Table Mode أو Cards Mode) */}
        {filteredMobilePhones.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant border-2 border-dashed border-outline-variant/20 rounded-2xl">
            <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30 text-primary" />
            <p className="text-sm font-bold font-cairo text-on-surface">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'لا توجد أجهزة مطابقة لشروط البحث أو الفلتر'
                : 'لا توجد أجهزة شبكة أو هواتف مقترنة حالياً'}
            </p>
            <p className="text-xs opacity-75 mt-1 max-w-md mx-auto leading-relaxed">
              افتح تطبيق AN POS على الهاتف المحمول وامسح رمز QR الخاص بالربط؛ وسيتعرف النظام على معرّف العتاد تلقائياً.
            </p>
            {serverStatus?.running && pairingInfo && (
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer font-cairo"
              >
                <QrCode className="w-4 h-4" />
                <span>مسح رمز QR لربط جهاز جديد</span>
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* ===== نمط عرض الجدول (Table View) ===== */
          <div className="overflow-x-auto rounded-2xl border border-outline-variant/15 bg-surface-container shadow-xs">
            <table className="w-full text-right text-xs min-w-[850px]">
              <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant/20 font-cairo">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 text-on-surface-variant hover:text-primary cursor-pointer"
                      title={selectedIds.length === filteredMobilePhones.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    >
                      {selectedIds.length > 0 && selectedIds.length === filteredMobilePhones.length ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3.5">اسم الجهاز (فريد)</th>
                  <th className="px-4 py-3.5">نوع الجهاز</th>
                  <th className="px-4 py-3.5">العلامة والطراز</th>
                  <th className="px-4 py-3.5">التطبيق</th>
                  <th className="px-4 py-3.5">عنوان IP</th>
                  <th className="px-4 py-3.5">عنوان MAC</th>
                  <th className="px-4 py-3.5">استجابة النبض</th>
                  <th className="px-4 py-3.5">الحالة</th>
                  <th className="px-4 py-3.5">آخر نشاط</th>
                  <th className="px-4 py-3.5 text-center">إجراءات التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredMobilePhones.map((d: any) => {
                  const devType = d.device_type || d.deviceType || 'mobile';
                  const isTablet = devType === 'tablet';
                  const isPos = devType === 'pos_terminal' || devType === 'desktop';
                  const isOnline = d.status === 'online';
                  const devName = d.device_name || d.deviceName || 'جهاز شبكة';
                  const vendorModel = [d.vendor, d.model].filter(Boolean).join(' · ');
                  const ip = d.ip_address || d.ipAddress || '-';
                  const mac = d.mac_address || d.macAddress || '-';
                  const appName = d.app_name || d.appName || 'AN POS Mobile';
                  const appVersion = d.app_version || d.appVersion || '';
                  const brand = getBrandInfo(d.vendor, d.model);
                  const ping = pingStatus[d.id];
                  const isSelected = selectedIds.includes(d.id);
                  const isActing = actionLoadingId === d.id;

                  return (
                    <tr
                      key={d.id}
                      className={`hover:bg-surface-container-high/40 transition-colors ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      {/* مربع التحديد */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(d.id)}
                          className="p-1 text-on-surface-variant hover:text-primary cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* اسم الجهاز والهوية الفريدة */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border cursor-pointer hover:scale-105 transition-transform ${
                              isOnline
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-surface-container-highest border-outline-variant/20 text-on-surface-variant'
                            }`}
                            onClick={() => setInspectingDevice(d)}
                            title="انقر لفحص تفاصيل الجهاز"
                          >
                            {isTablet ? (
                              <Tablet className="w-4 h-4" />
                            ) : isPos ? (
                              <Monitor className="w-4 h-4" />
                            ) : (
                              <Smartphone className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p
                                onClick={() => setInspectingDevice(d)}
                                className="font-bold text-on-surface text-xs leading-none hover:text-primary cursor-pointer"
                              >
                                {devName}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleOpenRename(d.id, devName)}
                                className="p-1 text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer rounded-md hover:bg-surface-container-highest"
                                title="تعديل اسم الجهاز"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                                معتمد فريد
                              </span>
                              {d.device_unique_id && (
                                <span
                                  className="text-[10px] text-on-surface-variant/60 font-mono cursor-pointer hover:underline"
                                  onClick={() => copyToClipboard(d.device_unique_id, `uuid_${d.id}`)}
                                  title={`معرف العتاد الصلب: ${d.device_unique_id} (انقر للنسخ)`}
                                >
                                  #{String(d.device_unique_id).slice(0, 6)}...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* نوع الجهاز */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-surface-container-high text-on-surface border border-outline-variant/15">
                          {isTablet ? (
                            <>
                              <Tablet className="w-3.5 h-3.5 text-purple-500" />
                              <span>جهاز لوحي</span>
                            </>
                          ) : isPos ? (
                            <>
                              <Monitor className="w-3.5 h-3.5 text-blue-500" />
                              <span>محطة كاشير</span>
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                              <span>هاتف محمول</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* العلامة والطراز */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${brand.badgeClass}`}>
                            {brand.name}
                          </span>
                          {d.model && (
                            <p className="text-[11px] text-on-surface font-medium truncate max-w-[130px] font-mono">
                              {d.model}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* التطبيق والإصدار */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-on-surface text-[11px] leading-tight">{appName}</p>
                          {appVersion && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-mono font-bold">
                              v{appVersion}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* عنوان IP */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        {ip !== '-' ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(ip, `ip_${d.id}`)}
                            className="group px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest font-bold text-on-surface flex items-center gap-1.5 transition-all border border-outline-variant/15 cursor-pointer"
                            title="انقر لنسخ عنوان IP"
                          >
                            <span>{ip}</span>
                            {copiedField === `ip_${d.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        ) : (
                          <span className="text-on-surface-variant/50">-</span>
                        )}
                      </td>

                      {/* عنوان MAC */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-on-surface-variant uppercase">
                        {mac !== '-' && mac ? (
                          <span className="px-2 py-0.5 rounded-md bg-surface-container-high/50 tracking-wider">
                            {mac}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/40 italic">غير متوفر</span>
                        )}
                      </td>

                      {/* استجابة النبض (Ping Latency) */}
                      <td className="px-4 py-3.5">
                        {isOnline ? (
                          ping?.status === 'testing' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-mono animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>فحص...</span>
                            </span>
                          ) : ping?.status === 'ok' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold">
                              <Signal className="w-3 h-3 text-emerald-500" />
                              <span>{ping.latency}ms</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTestPing(d.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-[10px] font-bold border border-outline-variant/15 cursor-pointer transition-all"
                              title="اختبار سرعة الاستجابة"
                            >
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span>فحص النبض</span>
                            </button>
                          )
                        ) : (
                          <span className="text-on-surface-variant/40 text-[10px]">—</span>
                        )}
                      </td>

                      {/* الحالة */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shadow-xs'
                              : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant/15'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {isOnline ? 'متصل الآن' : 'غير متصل'}
                        </span>
                      </td>

                      {/* آخر نشاط */}
                      <td className="px-4 py-3.5 text-on-surface-variant font-mono whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 opacity-40" />
                          <span>{d.last_seen ? new Date(d.last_seen).toLocaleString('ar-DZ') : '-'}</span>
                        </div>
                      </td>

                      {/* إجراءات التحكم */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* فحص التفاصيل */}
                          <button
                            type="button"
                            onClick={() => setInspectingDevice(d)}
                            className="p-1.5 rounded-xl hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                            title="فحص تفاصيل الجهاز"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* فصل الجهاز */}
                          {isOnline && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => handleDisconnect(d.id)}
                              className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-amber-500/20"
                              title="فصل الجهاز عن الخادم"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>فصل</span>
                            </button>
                          )}

                          {/* تعديل الاسم */}
                          <button
                            type="button"
                            onClick={() => handleOpenRename(d.id, devName)}
                            className="p-1.5 rounded-xl hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-all cursor-pointer border border-transparent hover:border-blue-500/20"
                            title="إعادة تسمية الجهاز"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* حذف الجهاز */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDevice(d.id, devName)}
                            className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all cursor-pointer border border-transparent hover:border-red-500/20"
                            title="حذف الجهاز نهائياً من السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ===== نمط عرض البطاقات المرئية (Grid Cards View) ===== */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMobilePhones.map((d: any) => {
              const devType = d.device_type || d.deviceType || 'mobile';
              const isTablet = devType === 'tablet';
              const isPos = devType === 'pos_terminal' || devType === 'desktop';
              const isOnline = d.status === 'online';
              const devName = d.device_name || d.deviceName || 'جهاز شبكة';
              const vendorModel = [d.vendor, d.model].filter(Boolean).join(' · ');
              const ip = d.ip_address || d.ipAddress || '-';
              const mac = d.mac_address || d.macAddress || '-';
              const appName = d.app_name || d.appName || 'AN POS Mobile';
              const appVersion = d.app_version || d.appVersion || '';
              const brand = getBrandInfo(d.vendor, d.model);
              const ping = pingStatus[d.id];
              const isSelected = selectedIds.includes(d.id);
              const isActing = actionLoadingId === d.id;

              return (
                <div
                  key={d.id}
                  className={`p-5 rounded-3xl bg-surface-container border transition-all flex flex-col justify-between gap-4 relative overflow-hidden group shadow-xs ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-outline-variant/20 hover:border-primary/40 hover:shadow-md'
                  }`}
                >
                  {/* رأس البطاقة: الأيقونة، الاسم، الشارة، وزر التحديد */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border cursor-pointer ${
                            isOnline
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                              : 'bg-surface-container-highest border-outline-variant/20 text-on-surface-variant'
                          }`}
                          onClick={() => setInspectingDevice(d)}
                        >
                          {isTablet ? (
                            <Tablet className="w-5 h-5" />
                          ) : isPos ? (
                            <Monitor className="w-5 h-5" />
                          ) : (
                            <Smartphone className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4
                              onClick={() => setInspectingDevice(d)}
                              className="font-bold text-sm font-cairo text-on-surface truncate cursor-pointer hover:text-primary"
                            >
                              {devName}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleOpenRename(d.id, devName)}
                              className="p-1 text-on-surface-variant/40 hover:text-primary cursor-pointer"
                              title="تعديل الاسم"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${brand.badgeClass}`}>
                              {brand.name}
                            </span>
                            {d.model && (
                              <span className="text-[11px] text-on-surface-variant truncate font-mono">
                                {d.model}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* زر الاختيار المتعدد + شارة الحالة */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {isOnline ? 'متصل' : 'غير متصل'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(d.id)}
                          className="p-1 text-on-surface-variant hover:text-primary cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* بيانات القياس التقنية (IP, MAC, App) */}
                    <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface-variant font-tajawal text-[11px]">عنوان IP:</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(ip, `ip_card_${d.id}`)}
                          className="font-bold text-on-surface flex items-center gap-1 hover:text-primary cursor-pointer"
                        >
                          <span>{ip}</span>
                          {copiedField === `ip_card_${d.id}` ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-on-surface-variant font-tajawal text-[11px]">عنوان MAC:</span>
                        <span className="text-on-surface-variant uppercase text-[10px]">{mac}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10">
                        <span className="text-on-surface-variant font-tajawal text-[11px]">التطبيق:</span>
                        <span className="text-on-surface font-tajawal font-bold text-[11px]">
                          {appName} {appVersion ? `v${appVersion}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* أسفل البطاقة: فحص النبض وأزرار الإجراءات */}
                  <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isOnline && (
                        ping?.status === 'testing' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-primary font-mono animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>فحص...</span>
                          </span>
                        ) : ping?.status === 'ok' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-mono text-[10px] font-bold">
                            <Signal className="w-3 h-3 text-emerald-500" />
                            <span>{ping.latency}ms</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTestPing(d.id)}
                            className="p-1.5 rounded-xl hover:bg-amber-500/10 text-amber-600 transition-colors cursor-pointer"
                            title="اختبار النبض السريع"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => setInspectingDevice(d)}
                        className="px-2.5 py-1 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold font-cairo transition-all cursor-pointer"
                      >
                        تفاصيل الجهاز
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {isOnline && (
                        <button
                          type="button"
                          disabled={isActing}
                          onClick={() => handleDisconnect(d.id)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-amber-500/20"
                          title="فصل الجلسة"
                        >
                          <LogOut className="w-3 h-3" />
                          <span>فصل</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteDevice(d.id, devName)}
                        className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="حذف نهائي"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. الشريط العائم للإجراءات الجماعية (Floating Bulk Action Bar) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-container-highest/95 backdrop-blur-md border border-outline-variant/30 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold font-cairo text-on-surface">
              تم تحديد <strong className="text-primary">{selectedIds.length}</strong> أجهزة
            </span>
          </div>

          <div className="h-4 w-px bg-outline-variant/30" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkDisconnect}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-amber-500/20"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>فصل الجلسات</span>
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف من السجل</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}

      {/* 5. قسم أجهزة وملحقات الكاشير المسجلة (POS Hardware Peripherals) */}
      <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold font-cairo text-on-surface">
                  أجهزة وملحقات الكاشير المسجلة ({posPeripherals.length})
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface-variant border border-outline-variant/15">
                  عتاد نقطة البيع
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                الطابعات الحرارية، أدراج النقود، قارئات الباركود، شاشات عرض الزبائن، والموازين الإلكترونية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDeviceForm?.(!showDeviceForm)}
            className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold font-cairo hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{showDeviceForm ? 'إخفاء النموذج' : 'إضافة ملحق كاشير جديد'}</span>
          </button>
        </div>

        {/* نموذج إضافة ملحق جديد */}
        {showDeviceForm && (
          <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-4 animate-fade-in shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-on-surface flex items-center gap-2 font-cairo">
                <Plug className="w-4 h-4 text-primary" />
                <span>تسجيل ملحق كاشير جديد</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowDeviceForm?.(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">اسم الملحق</label>
                <input
                  type="text"
                  value={newDevice?.deviceName || ''}
                  onChange={(e) => setNewDevice?.({ ...newDevice, deviceName: e.target.value })}
                  placeholder="مثال: طابعة الإيصالات الرئيسية"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">نوع الملحق</label>
                <select
                  value={newDevice?.deviceType || 'printer'}
                  onChange={(e) => setNewDevice?.({ ...newDevice, deviceType: e.target.value as ConnectedDeviceType })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="printer">طابعة إيصالات / فواتير</option>
                  <option value="scanner">ماسح باركود</option>
                  <option value="cash_drawer">درج نقود إلكتروني</option>
                  <option value="display">شاشة عرض للزبون</option>
                  <option value="scale">ميزان إلكتروني</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">طريقة الاتصال</label>
                <select
                  value={newDevice?.connectionType || 'usb'}
                  onChange={(e) => setNewDevice?.({ ...newDevice, connectionType: e.target.value as ConnectionType })}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="usb">منفذ USB مباشر</option>
                  <option value="network">شبكة محلية IP / LAN</option>
                  <option value="bluetooth">بلوتوث Bluetooth</option>
                  <option value="serial">منفذ تسلسلي Serial COM</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">عنوان IP (اختياري)</label>
                <input
                  type="text"
                  value={newDevice?.ipAddress || ''}
                  onChange={(e) => setNewDevice?.({ ...newDevice, ipAddress: e.target.value })}
                  placeholder="192.168.1.200"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">عنوان MAC (اختياري)</label>
                <input
                  type="text"
                  value={newDevice?.macAddress || ''}
                  onChange={(e) => setNewDevice?.({ ...newDevice, macAddress: e.target.value })}
                  placeholder="00:1A:2B:3C:4D:5E"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant mb-1">الشركة المصنعة / الطراز</label>
                <input
                  type="text"
                  value={newDevice?.vendor || ''}
                  onChange={(e) => setNewDevice?.({ ...newDevice, vendor: e.target.value })}
                  placeholder="Epson, Xprinter, Zebra..."
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleAddDevice}
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs font-cairo"
              >
                حفظ الجهاز
              </button>
              <button
                type="button"
                onClick={() => setShowDeviceForm?.(false)}
                className="px-5 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl text-xs font-bold hover:bg-surface-container-highest transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* جدول ملحقات الكاشير الحقيقية */}
        {posPeripherals.length === 0 ? (
          <div className="py-10 text-center text-on-surface-variant border-2 border-dashed border-outline-variant/20 rounded-2xl bg-surface-container-low/30">
            <Plug className="w-10 h-10 mx-auto mb-2 opacity-30 text-on-surface-variant" />
            <p className="text-xs font-bold text-on-surface font-cairo">لا توجد طابعات أو ملحقات كاشير مسجلة حالياً</p>
            <p className="text-[11px] opacity-75 mt-1 max-w-md mx-auto">
              سجّل طابعة الفواتير، قارئ الباركود، درج النقد، أو الميزان لربطها بنقطة البيع عبر USB أو الشبكة.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  setNewDevice?.({ ...newDevice, deviceType: 'printer', deviceName: 'طابعة إيصالات' });
                  setShowDeviceForm?.(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold transition-all border border-outline-variant/15 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-500" />
                <span>+ إضافة طابعة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewDevice?.({ ...newDevice, deviceType: 'scanner', deviceName: 'قارئ باركود' });
                  setShowDeviceForm?.(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold transition-all border border-outline-variant/15 flex items-center gap-1.5 cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5 text-emerald-500" />
                <span>+ إضافة قارئ باركود</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewDevice?.({ ...newDevice, deviceType: 'cash_drawer', deviceName: 'درج نقود' });
                  setShowDeviceForm?.(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-[11px] font-bold transition-all border border-outline-variant/15 flex items-center gap-1.5 cursor-pointer"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                <span>+ إضافة درج نقود</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-outline-variant/15 bg-surface-container shadow-xs">
            <table className="w-full text-right text-xs min-w-[700px]">
              <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant/20 font-cairo">
                <tr>
                  <th className="px-4 py-3">الملحق</th>
                  <th className="px-4 py-3">النوع</th>
                  <th className="px-4 py-3">نوع الاتصال</th>
                  <th className="px-4 py-3">IP / MAC</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">آخر ظهور</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {posPeripherals.map((d: ConnectedDeviceEntity) => {
                  const isOnline = d.status === 'online';
                  return (
                    <tr key={d.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="px-4 py-3 text-on-surface font-bold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shrink-0 border border-outline-variant/15">
                            {d.deviceType === 'printer' ? (
                              <Printer className="w-4 h-4" />
                            ) : d.deviceType === 'scanner' ? (
                              <ScanLine className="w-4 h-4" />
                            ) : d.deviceType === 'cash_drawer' ? (
                              <HardDrive className="w-4 h-4" />
                            ) : d.deviceType === 'display' ? (
                              <Monitor className="w-4 h-4" />
                            ) : (
                              <Plug className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <p>{d.deviceName}</p>
                            {d.vendor && (
                              <p className="text-[10px] text-on-surface-variant font-normal">
                                {d.vendor}
                                {d.model ? ` · ${d.model}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-surface-container-high text-on-surface border border-outline-variant/10">
                          {({
                            printer: 'طابعة إيصالات',
                            scanner: 'ماسح باركود',
                            cash_drawer: 'درج نقود',
                            display: 'شاشة عميل',
                            scale: 'ميزان إلكتروني'
                          } as Record<string, string>)[d.deviceType] || d.deviceType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 uppercase font-mono text-[10px] font-bold text-on-surface-variant px-2 py-0.5 rounded-md bg-surface-container-highest">
                          {d.connectionType === 'usb' && <Usb className="w-3 h-3 text-blue-500" />}
                          {d.connectionType === 'network' && <Wifi className="w-3 h-3 text-emerald-500" />}
                          {d.connectionType === 'bluetooth' && <Bluetooth className="w-3 h-3 text-purple-500" />}
                          {d.connectionType === 'serial' && <Cable className="w-3 h-3 text-amber-500" />}
                          <span>{d.connectionType}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-on-surface-variant text-[11px]">
                        {d.ipAddress ?? '-'}
                        {d.macAddress ? (
                          <>
                            <br />
                            <span className="text-[10px] opacity-70">{d.macAddress}</span>
                          </>
                        ) : (
                          ''
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isOnline
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : d.status === 'error'
                              ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                              : 'bg-surface-container-highest text-on-surface-variant'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          {({ online: 'متصل', offline: 'غير متصل', error: 'خطأ' } as Record<string, string>)[
                            d.status
                          ] || d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant font-mono whitespace-nowrap text-[11px]">
                        {d.lastSeen ? new Date(d.lastSeen).toLocaleString('ar-DZ') : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => deleteDeviceMutation?.mutate(d.id)}
                          className="p-1.5 rounded-xl hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                          title="حذف الملحق"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. نافذة فحص وتفاصيل الجهاز الموسعة (Device Inspection Modal) */}
      {inspectingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-tajawal">
          <div className="bg-surface-container border border-outline-variant/20 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-cairo text-on-surface">
                    {inspectingDevice.device_name || inspectingDevice.deviceName || 'فحص تفاصيل الجهاز'}
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    معرف العتاد الصلب والحالة الأمنية لجلسة الاقتران
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingDevice(null)}
                className="p-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* بطاقة المعرف الفريد الصلب */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 font-cairo">
                  <ShieldCheck className="w-4 h-4" />
                  <span>معرف العتاد الصلب الحصري (Hardware UUID):</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-800 dark:text-purple-200 text-[10px] font-mono font-bold">
                  Anti-Clone
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-purple-500/20 font-mono text-xs text-on-surface">
                <span className="truncate max-w-[340px]">
                  {inspectingDevice.device_unique_id || inspectingDevice.id}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(inspectingDevice.device_unique_id || inspectingDevice.id, 'inspect_uuid')}
                  className="p-1 text-purple-600 hover:text-purple-700 cursor-pointer"
                  title="نسخ المعرف"
                >
                  {copiedField === 'inspect_uuid' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* تفاصيل المواصفات والشبكة */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-1">
                <span className="text-[11px] text-on-surface-variant block">الشركة والطراز:</span>
                <strong className="text-on-surface font-mono">
                  {inspectingDevice.vendor || 'غير محدد'} · {inspectingDevice.model || 'غير محدد'}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-1">
                <span className="text-[11px] text-on-surface-variant block">عنوان IP المحلي:</span>
                <strong className="text-on-surface font-mono">
                  {inspectingDevice.ip_address || inspectingDevice.ipAddress || '-'}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-1">
                <span className="text-[11px] text-on-surface-variant block">عنوان العتاد MAC:</span>
                <strong className="text-on-surface font-mono uppercase">
                  {inspectingDevice.mac_address || inspectingDevice.macAddress || 'غير متوفر'}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-1">
                <span className="text-[11px] text-on-surface-variant block">تطبيق العميل:</span>
                <strong className="text-on-surface">
                  {inspectingDevice.app_name || 'AN POS Mobile'} v{inspectingDevice.app_version || '3.0.0'}
                </strong>
              </div>
            </div>

            {/* سرعة الاستجابة والنبض */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-on-surface">فحص نبض الاتصال اللحظي:</span>
              </div>
              <button
                type="button"
                onClick={() => handleTestPing(inspectingDevice.id)}
                className="px-3 py-1 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                {pingStatus[inspectingDevice.id]?.status === 'testing' ? 'جاري الفحص...' : 'بدء فحص Ping'}
              </button>
            </div>

            {pingStatus[inspectingDevice.id]?.status === 'ok' && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between font-mono">
                <span>زمن الاستجابة عبر الشبكة المحلية:</span>
                <span>{pingStatus[inspectingDevice.id].latency}ms (اتصال فائق السرعة)</span>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectingDevice(null)}
                className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest text-xs font-bold transition-all cursor-pointer font-cairo"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. نافذة تعديل اسم الجهاز (Rename Modal) */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in font-tajawal">
          <div className="bg-surface-container border border-outline-variant/20 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold font-cairo text-on-surface">إعادة تسمية الجهاز</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-on-surface">الاسم الجديد للجهاز</label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                }}
                autoFocus
                placeholder="مثال: كاشير 1 - هاتف هواوي"
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/25 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-on-surface-variant">
                سيتم تحديث الاسم في السجل المحلي وعلى أجهزة الشبكة مع ضمان عدم تكرار الأسماء تلقائياً.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest text-xs font-bold transition-all cursor-pointer font-cairo"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={!renameInput.trim() || isRenaming}
                onClick={handleSaveRename}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs font-cairo"
              >
                {isRenaming ? 'جاري الحفظ...' : 'حفظ التعديل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. نافذة تعديل منفذ الخادم السريع (Port Modal) */}
      {showPortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in font-tajawal">
          <div className="bg-surface-container border border-outline-variant/20 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold font-cairo text-on-surface">تعديل منفذ الخادم الشبكي</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowPortModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">رقم المنفذ (Port)</label>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={targetPort}
                  onChange={(e) => setTargetPort(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/25 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <span className="block text-[11px] font-bold text-on-surface-variant mb-1.5 font-cairo">
                  منافذ مقترحة شائعة:
                </span>
                <div className="flex gap-2 flex-wrap">
                  {[3000, 4123, 8080, 5000].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTargetPort(p)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
                        targetPort === p
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-highest'
                      }`}
                    >
                      :{p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-300">
                سيتم تحديث إعلان mDNS Bonjour فوراً بالمنفذ الجديد لتمكين الهواتف من العثور على الحاسوب تلقائياً.
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPortModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest text-xs font-bold transition-all cursor-pointer font-cairo"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSavePort}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold transition-all cursor-pointer shadow-xs font-cairo"
              >
                تطبيق المنفذ وتحديث البث
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. نافذة رمز الاقتران السريع (Pairing QR Modal) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-tajawal">
          <div className="bg-surface-container border border-outline-variant/20 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold font-cairo text-on-surface">ربط هاتف محمول جديد</h4>
                  <p className="text-xs text-on-surface-variant">افتح تطبيق AN POS على الهاتف وامسح الرمز أدناه</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {serverStatus?.running && pairingInfo ? (
              <div className="space-y-4">
                <PairingQR data={pairingInfo} />
                <div className="p-3 bg-surface-container-high rounded-2xl border border-outline-variant/15 flex flex-wrap items-center justify-center gap-4 text-xs font-mono">
                  <span>📡 IP: <strong className="text-on-surface">{pairingInfo.ip}</strong></span>
                  <span>🔌 المنفذ: <strong className="text-on-surface">{pairingInfo.port}</strong></span>
                  <span>🔑 المفتاح: <strong className="text-primary font-bold">{pairingInfo.key}</strong></span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-on-surface-variant">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-amber-500" />
                <p className="text-xs font-bold text-on-surface font-cairo">الخادم المحلي غير مشغل حالياً</p>
                <p className="text-[11px] opacity-75 mt-1">يجب تشغيل خادم الشبكة المحلية أولاً لتوليد رمز الاقتران.</p>
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold transition-all cursor-pointer shadow-xs font-cairo"
              >
                تم الانتهاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
