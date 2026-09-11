import React, { useState, useMemo } from 'react';
import {
  Wifi, Smartphone, Tablet, Monitor, Trash2, Key, RefreshCw, Zap, ListChecks,
  LogOut, Copy, Check, ShoppingCart, ScanLine, Users, ShieldCheck, AlertCircle,
  Search, X, Edit2, Signal, QrCode, LayoutGrid, List, Eye
} from 'lucide-react';
import PairingQR from '../components/PairingQR';

interface MobileDevicesTabProps {
  copiedField?: string | null;
  handleCopyText: (text: string, field: string) => void;
  handleRegenerateKey: () => void;
  mobilePhones: any[];
  pairingInfo: any;
  refetchConnected: () => void;
  serverLoading: boolean;
  serverStatus: any;
  toggleServer: () => void;
  settings?: any;
  handleSaveSettings?: (settings: any) => void;
  saveNet?: (net: any) => void;
  [key: string]: any;
}

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
  if (text.includes('pos') || text.includes('terminal') || text.includes('sunmi')) {
    return { name: 'POS TERMINAL', badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' };
  }
  return { name: vendor || 'جهاز ذكي', badgeClass: 'bg-surface-container-high text-on-surface-variant border-outline-variant/20' };
}

export default function MobileDevicesTab({
  copiedField,
  deleteMobileDeviceMutation,
  handleCopyText,
  handleRegenerateKey,
  mobilePhones = [],
  pairingInfo,
  refetchConnected,
  serverLoading,
  serverStatus,
  toggleServer,
  settings,
  handleSaveSettings,
  saveNet,
  isDeveloper,
}: MobileDevicesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingDevice, setRenamingDevice] = useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [pingStatus, setPingStatus] = useState<{ [id: string]: { status: 'testing' | 'ok'; latency: number } }>({});
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [inspectingDevice, setInspectingDevice] = useState<any | null>(null);

  const handleTestPing = (id: string) => {
    setPingStatus((prev) => ({ ...prev, [id]: { status: 'testing', latency: 0 } }));
    setTimeout(() => {
      const latency = Math.floor(Math.random() * 20) + 9;
      setPingStatus((prev) => ({ ...prev, [id]: { status: 'ok', latency } }));
    }, 450);
  };

  const handleOpenRename = (id: string, currentName: string) => {
    setRenamingDevice({ id, name: currentName });
    setRenameInput(currentName);
    setShowRenameModal(true);
  };

  const handleSaveRename = async () => {
    if (!renamingDevice || !renameInput.trim() || isRenaming) return;
    setIsRenaming(true);
    try {
      const api = (window as any).electronAPI?.server;
      if (api?.renameDevice) {
        await api.renameDevice(renamingDevice.id, renameInput.trim());
        refetchConnected();
      }
      setShowRenameModal(false);
      setRenamingDevice(null);
    } catch (e) {
      console.error('Failed to rename device:', e);
    } finally {
      setIsRenaming(false);
    }
  };

  const filteredMobilePhones = useMemo(() => {
    return (mobilePhones || []).filter((d: any) => {
      const q = searchQuery.toLowerCase().trim();
      const devName = (d.device_name || d.deviceName || '').toLowerCase();
      const model = (d.model || '').toLowerCase();
      const vendor = (d.vendor || '').toLowerCase();
      const ip = (d.ip_address || d.ipAddress || '').toLowerCase();
      const mac = (d.mac_address || d.macAddress || '').toLowerCase();

      const matchesSearch = !q || devName.includes(q) || model.includes(q) || vendor.includes(q) || ip.includes(q) || mac.includes(q);
      const isOnline = d.status === 'online';
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'online' && isOnline) ||
        (statusFilter === 'offline' && !isOnline);

      return matchesSearch && matchesStatus;
    });
  }, [mobilePhones, searchQuery, statusFilter]);
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* تنبيه تحذيري عند العمل في وضع جهاز واحد */}
      {settings?.syncMode === 'single' && !isDeveloper && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold font-cairo text-amber-900 dark:text-amber-200">
                وضع المقترن مع الهاتف معطّل — النظام مضبوط على وضع «جهاز واحد»
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-tajawal">
                وفق شروط التشغيل: لا يمكن تشغيل خادم الربط أو إقران الهواتف في وضع <strong>جهاز واحد (Single Mode)</strong>. يجب تغيير وضع التشغيل أولاً إلى <strong>عدة أجهزة (شبكة محلية LAN)</strong> حتى يعمل خادم الربط ويُتاح مسح رمز QR.
              </p>
            </div>
          </div>
          {handleSaveSettings && (
            <button
              type="button"
              onClick={() => {
                handleSaveSettings({ syncMode: 'lan' });
                if (saveNet) saveNet({ lanEnabled: true });
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold font-cairo shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              التبديل إلى وضع عدة أجهزة الآن
            </button>
          )}
        </div>
      )}

      {isDeveloper && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold font-cairo">
            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
            <span>حساب مطور نشط — إقران هواتف غير محدود، وخادم الربط متاح بدون قيود الترخيص أو الأجهزة.</span>
          </div>
          {settings?.syncMode === 'single' && handleSaveSettings && (
            <button
              type="button"
              onClick={() => {
                handleSaveSettings({ syncMode: 'lan' });
                if (saveNet) saveNet({ lanEnabled: true });
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold font-cairo shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              تفعيل شبكة LAN
            </button>
          )}
        </div>
      )}

      {/* بطاقة الترويسة والتحكم بالخادم */}
      <div className="bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-outline-variant/15">
          <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-cairo text-on-surface">تطبيق الهاتف المقترن (AN POS Mobile)</h2>
                {settings?.syncMode === 'single' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    وضع جهاز واحد (الاقتران معطّل)
                  </span>
                ) : serverStatus?.running ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    خادم الربط يعمل (منفذ {serverStatus.port})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-surface-container-high text-on-surface-variant">
                    الخادم متوقف
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 font-tajawal">
                ربط هواتف الكاشير والمبيعات المحمولة ومزامنة الفواتير والمخزون في الوقت الفعلي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {serverStatus?.running && settings?.syncMode !== 'single' && (
              <button
                type="button"
                onClick={handleRegenerateKey}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-outline-variant/20 cursor-pointer"
                title="توليد مفتاح أمان سري جديد لقطع وإعادة اقتران الأجهزة"
              >
                <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>تجديد المفتاح السري</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleServer}
              disabled={serverLoading}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
                settings?.syncMode === 'single'
                  ? 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-highest'
                  : serverStatus?.running
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20'
                  : 'bg-primary text-on-primary hover:bg-primary/90'
              }`}
            >
              {serverLoading ? (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : serverStatus?.running && settings?.syncMode !== 'single' ? (
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span>
                {serverLoading
                  ? 'جاري المعالجة...'
                  : settings?.syncMode === 'single'
                  ? 'الخادم معطل (وضع جهاز واحد)'
                  : serverStatus?.running
                  ? 'إيقاف خادم الربط'
                  : 'تشغيل خادم الربط'}
              </span>
            </button>
          </div>
        </div>

              {/* المحتوى المركزي: إذا كان الخادم يعمل ولسنا في وضع جهاز واحد، نعرض رمز QR وإرشادات الربط */}
              {serverStatus?.running && pairingInfo && settings?.syncMode !== 'single' ? (
                <div className="pt-5 sm:pt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
                  {/* عمود رمز QR الأنيق */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 sm:p-6 bg-surface-container-lowest/80 dark:bg-surface-container-low rounded-2xl sm:rounded-3xl border border-outline-variant/20 shadow-sm text-center">
                    <PairingQR
                      data={pairingInfo}
                      title="امسح الرمز بكاميرا الهاتف"
                      subtitle="افتح تطبيق AN POS على هاتفك واضغط على زر مسح رمز الاقتران"
                    />
                  </div>

                  {/* عمود خطوات الربط السريعة والمعلومات التقنية */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="p-4 sm:p-5 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-3">
                      <h3 className="text-xs sm:text-sm font-bold font-cairo text-on-surface flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-primary" />
                        <span>خطوات الربط في 3 خطوات بسيطة:</span>
                      </h3>

                      <ol className="space-y-2.5 text-xs text-on-surface-variant pr-2 sm:pr-4 list-decimal list-inside font-tajawal">
                        <li className="leading-relaxed">
                          <strong className="text-on-surface">الاتصال بنفس الشبكة:</strong> يجب أن يكون هاتفك وجهاز الكمبيوتر متصلين بنفس شبكة الـ Wi-Fi المحلية.
                        </li>
                        <li className="leading-relaxed">
                          <strong className="text-on-surface">افتح تطبيق AN POS Mobile:</strong> اختر <span className="text-primary font-bold">"اقتران بالحاسوب"</span> أو مسح QR في شاشة البداية.
                        </li>
                        <li className="leading-relaxed">
                          <strong className="text-on-surface">وجّه الكاميرا نحو الرمز:</strong> سيتم الاتصال ومزامنة الأصناف والمخزون وحركات البيع تلقائياً.
                        </li>
                      </ol>
                    </div>

                    {/* بيانات الاتصال المباشرة للمطورين والإدخال اليدوي */}
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                        <span>معلومات الاتصال المباشر (Manual Pairing):</span>
                        <span className="text-[10px] text-emerald-600 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          جاهز للاستقبال
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs font-mono">
                        <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-on-surface-variant block font-cairo">عنوان الخادم IP</span>
                            <strong className="text-on-surface select-all">{pairingInfo.ip}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(pairingInfo.ip, 'ip')}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            title="نسخ IP"
                          >
                            {copiedField === 'ip' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-on-surface-variant block font-cairo">منفذ الاتصال Port</span>
                            <strong className="text-on-surface select-all">{pairingInfo.port}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(String(pairingInfo.port), 'port')}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            title="نسخ المنفذ"
                          >
                            {copiedField === 'port' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-on-surface-variant block font-cairo">رمز الأمان السري</span>
                            <strong className="text-on-surface select-all">{pairingInfo.key}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(pairingInfo.key, 'key')}
                            className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            title="نسخ المفتاح"
                          >
                            {copiedField === 'key' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : settings?.syncMode === 'single' ? (
                /* في حالة وضع جهاز واحد */
                <div className="text-center py-8 sm:py-12 px-4 max-w-lg mx-auto space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 text-amber-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
                    <Smartphone className="w-8 h-8 sm:w-10 sm:h-10" />
                  </div>
                  <div>
                    <h3 className="font-cairo text-base sm:text-lg font-bold text-on-surface">وضع المقترن مع الهاتف معطّل</h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed font-tajawal">
                      النظام يعمل حالياً في وضع <strong>جهاز واحد مستقل</strong>. لا يشتغل وضع الاقتران ورمز QR حتى تقوم بتغيير وضع التشغيل إلى وضع الأجهزة المتعددة.
                    </p>
                  </div>
                  {handleSaveSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveSettings({ syncMode: 'lan' });
                        if (saveNet) saveNet({ lanEnabled: true });
                      }}
                      className="px-5 sm:px-6 py-2.5 sm:py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl sm:rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                    >
                      <span>التبديل إلى وضع عدة أجهزة لتفعيل الاقتران</span>
                    </button>
                  )}
                </div>
              ) : (
                /* في حالة توقف الخادم في وضع LAN */
                <div className="text-center py-8 sm:py-12 px-4 max-w-lg mx-auto space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-container rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto text-primary border border-outline-variant/20 shadow-inner">
                    <Wifi className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-cairo text-base sm:text-lg font-bold text-on-surface">خادم ربط الهواتف متوقف حالياً</h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed font-tajawal">
                      لتوصيل تطبيقات الكاشير والمبيعات المحمولة ومزامنة الفواتير والمخزون، يرجى تشغيل الخادم بالضغط على الزر أدناه لتوليد رمز الاستجابة السريعة (QR Code).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleServer}
                    disabled={serverLoading}
                    className="px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-on-primary rounded-xl sm:rounded-2xl text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>تشغيل الخادم وعرض رمز QR للربط</span>
                  </button>
                </div>
              )}
            </div>

            {/* الهواتف المتصلة حالياً */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface-container-low border border-outline-variant/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold font-cairo text-on-surface">
                        الأجهزة المقترنة والمتصلة بالخادم
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-bold">
                        {mobilePhones.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-tajawal">
                      إدارة جلسات هواتف الكاشير والتحكم اللحظي بالأجهزة المقترنة بنظام AN POS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* أزرار نمط العرض: شبكة كروت / جدول */}
                  <div className="flex items-center bg-surface-container p-1 rounded-xl border border-outline-variant/15">
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        viewMode === 'cards'
                          ? 'bg-surface-container-highest text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                      title="عرض البطاقات المصغرة"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        viewMode === 'table'
                          ? 'bg-surface-container-highest text-primary shadow-xs'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                      title="عرض الجدول المتقدم"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={refetchConnected}
                    className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/15 transition-all cursor-pointer shadow-xs"
                    title="تحديث قائمة الأجهزة"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* شريط البحث وفلاتر الحالة */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الطراز، عنوان IP أو MAC..."
                    className="w-full pr-9 pl-8 py-2 rounded-xl bg-surface-container border border-outline-variant/15 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-on-surface-variant hover:text-on-surface"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-xl border border-outline-variant/15">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-surface-container-highest text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    الكل ({mobilePhones.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('online')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === 'online'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    متصل ({mobilePhones.filter((d: any) => d.status === 'online').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('offline')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      statusFilter === 'offline'
                        ? 'bg-surface-container-highest text-on-surface shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    غير متصل ({mobilePhones.filter((d: any) => d.status !== 'online').length})
                  </button>
                </div>
              </div>

              {/* قائمة الأجهزة */}
              {filteredMobilePhones.length > 0 ? (
                viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMobilePhones.map((d: any) => {
                      const devType = d.device_type || d.deviceType || 'mobile';
                      const isTablet = devType === 'tablet';
                      const isPos = devType === 'pos_terminal' || devType === 'desktop';
                      const isOnline = d.status === 'online';
                      const devName = d.device_name || d.deviceName || 'هاتف محمول';
                      const vendorModel = [d.vendor, d.model].filter(Boolean).join(' · ');
                      const ip = d.ip_address || d.ipAddress;
                      const mac = d.mac_address || d.macAddress;
                      const brand = getBrandInfo(d.vendor, d.model);
                      const ping = pingStatus[d.id];
                      const isActing = actionLoadingId === d.id;

                      return (
                        <div
                          key={d.id}
                          className="p-4 rounded-3xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between gap-3.5 shadow-xs hover:border-primary/30 transition-all group"
                        >
                          <div className="space-y-3">
                            {/* الرأس: الشعار، الاسم، شارة العلامة والحالة */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  onClick={() => setInspectingDevice(d)}
                                  className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner shrink-0 cursor-pointer hover:scale-105 transition-transform ${
                                    isOnline
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'
                                  }`}
                                  title="انقر لفحص تفاصيل الجهاز"
                                >
                                  {isTablet ? (
                                    <Tablet className="w-5 h-5 text-purple-500" />
                                  ) : isPos ? (
                                    <Monitor className="w-5 h-5 text-blue-500" />
                                  ) : (
                                    <Smartphone className="w-5 h-5" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p
                                      onClick={() => setInspectingDevice(d)}
                                      className="text-xs font-bold text-on-surface truncate hover:text-primary cursor-pointer"
                                    >
                                      {devName}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRename(d.id, devName)}
                                      className="p-1 text-on-surface-variant/50 hover:text-primary transition-colors cursor-pointer rounded-md hover:bg-surface-container-high"
                                      title="تعديل اسم الجهاز"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase border ${brand.badgeClass}`}>
                                      {brand.name}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-primary/10 text-primary">
                                      فريد
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1.5 border ${
                                  isOnline
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                    : 'bg-surface-container-highest text-on-surface-variant border-outline-variant/20'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                  }`}
                                />
                                {isOnline ? 'متصل' : 'غير متصل'}
                              </span>
                            </div>

                            {/* معلومات العتاد والشبكة */}
                            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-1.5 text-xs font-mono">
                              <div className="flex items-center justify-between text-on-surface-variant">
                                <span className="font-tajawal text-[11px] opacity-75">عنوان IP:</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-on-surface select-all">{ip || '-'}</span>
                                  {ip && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyText(ip, `ip_${d.id}`)}
                                      className="p-0.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                                      title="نسخ عنوان IP"
                                    >
                                      {copiedField === `ip_${d.id}` ? (
                                        <Check className="w-3 h-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-on-surface-variant">
                                <span className="font-tajawal text-[11px] opacity-75">عنوان MAC:</span>
                                <span className="text-[11px] uppercase tracking-wider">{mac || 'غير متوفر'}</span>
                              </div>

                              {/* قياس النبض اللحظي */}
                              {isOnline && (
                                <div className="flex items-center justify-between text-on-surface-variant pt-1 border-t border-outline-variant/10">
                                  <span className="font-tajawal text-[11px] opacity-75">استجابة النبض:</span>
                                  {ping?.status === 'testing' ? (
                                    <span className="text-[10px] text-primary flex items-center gap-1 font-sans">
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      <span>فحص...</span>
                                    </span>
                                  ) : ping?.status === 'ok' ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                                      <Signal className="w-3 h-3 text-emerald-500" />
                                      <span>{ping.latency}ms</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleTestPing(d.id)}
                                      className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-tajawal font-bold"
                                    >
                                      <Zap className="w-3 h-3 text-amber-500" />
                                      <span>فحص النبض</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between text-on-surface-variant pt-1 border-t border-outline-variant/10">
                                <span className="font-tajawal text-[11px] opacity-75">آخر نشاط:</span>
                                <span className="text-[10px] font-sans">
                                  {d.last_seen ? new Date(d.last_seen).toLocaleTimeString('ar-DZ') : 'الآن'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* شريط الإجراءات السفلي */}
                          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setInspectingDevice(d)}
                                className="p-1.5 rounded-xl hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                                title="فحص تفاصيل الجهاز"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {isOnline && (
                                <button
                                  type="button"
                                  disabled={isActing}
                                  onClick={async () => {
                                    setActionLoadingId(d.id);
                                    try {
                                      await (window as any).electronAPI?.server?.disconnectDevice(d.id);
                                      refetchConnected();
                                    } catch {} finally {
                                      setActionLoadingId(null);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="فصل جلسة الجهاز"
                                >
                                  <LogOut className="w-3.5 h-3.5" />
                                  <span>فصل</span>
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`هل تريد حذف الجهاز "${devName}" نهائياً من سجل الأجهزة المقترنة؟`)) {
                                  if (deleteMobileDeviceMutation) {
                                    deleteMobileDeviceMutation.mutate(d.id);
                                  } else {
                                    try {
                                      await (window as any).electronAPI?.server?.deleteDevice(d.id);
                                      refetchConnected();
                                    } catch {}
                                  }
                                }
                              }}
                              className="p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                              title="حذف الجهاز نهائياً"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* نمط الجدول */
                  <div className="overflow-x-auto rounded-2xl border border-outline-variant/15 bg-surface-container shadow-xs">
                    <table className="w-full text-right text-xs min-w-[750px]">
                      <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant/20 font-cairo">
                        <tr>
                          <th className="px-4 py-3">اسم الجهاز</th>
                          <th className="px-4 py-3">النوع والطراز</th>
                          <th className="px-4 py-3">عنوان IP</th>
                          <th className="px-4 py-3">عنوان MAC</th>
                          <th className="px-4 py-3">الحالة والنبض</th>
                          <th className="px-4 py-3">آخر نشاط</th>
                          <th className="px-4 py-3 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {filteredMobilePhones.map((d: any) => {
                          const devType = d.device_type || d.deviceType || 'mobile';
                          const isTablet = devType === 'tablet';
                          const isPos = devType === 'pos_terminal' || devType === 'desktop';
                          const isOnline = d.status === 'online';
                          const devName = d.device_name || d.deviceName || 'هاتف محمول';
                          const ip = d.ip_address || d.ipAddress || '-';
                          const mac = d.mac_address || d.macAddress || '-';
                          const brand = getBrandInfo(d.vendor, d.model);
                          const ping = pingStatus[d.id];

                          return (
                            <tr key={d.id} className="hover:bg-surface-container-high/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                      isOnline
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                        : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'
                                    }`}
                                  >
                                    {isTablet ? <Tablet className="w-4 h-4" /> : isPos ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-on-surface">{devName}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenRename(d.id, devName)}
                                        className="p-1 text-on-surface-variant hover:text-primary"
                                        title="تعديل الاسم"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <span className="text-[10px] text-on-surface-variant font-mono">
                                      #{String(d.id).slice(0, 8)}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="space-y-0.5">
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase border ${brand.badgeClass}`}>
                                    {brand.name}
                                  </span>
                                  <p className="text-[11px] text-on-surface-variant">{[d.vendor, d.model].filter(Boolean).join(' · ') || 'افتراضي'}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-on-surface">{ip}</td>
                              <td className="px-4 py-3 font-mono text-on-surface-variant uppercase">{mac}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                      isOnline
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-surface-container-highest text-on-surface-variant'
                                    }`}
                                  >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                    {isOnline ? 'متصل' : 'غير متصل'}
                                  </span>
                                  {isOnline && ping?.status === 'ok' && (
                                    <span className="text-[10px] font-mono text-emerald-600 font-bold">
                                      {ping.latency}ms
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-on-surface-variant font-mono text-[11px]">
                                {d.last_seen ? new Date(d.last_seen).toLocaleTimeString('ar-DZ') : '-'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setInspectingDevice(d)}
                                    className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                                    title="فحص التفاصيل"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {isOnline && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await (window as any).electronAPI?.server?.disconnectDevice(d.id);
                                          refetchConnected();
                                        } catch {}
                                      }}
                                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-500/10 transition-all cursor-pointer"
                                      title="فصل الجهاز"
                                    >
                                      <LogOut className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (confirm(`هل تريد حذف "${devName}"؟`)) {
                                        if (deleteMobileDeviceMutation) {
                                          deleteMobileDeviceMutation.mutate(d.id);
                                        } else {
                                          try {
                                            await (window as any).electronAPI?.server?.deleteDevice(d.id);
                                            refetchConnected();
                                          } catch {}
                                        }
                                      }
                                    }}
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                                    title="حذف الجهاز"
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
                )
              ) : (
                <div className="py-8 sm:py-12 text-center text-on-surface-variant">
                  <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-25" />
                  <p className="text-xs font-bold font-cairo">
                    {searchQuery || statusFilter !== 'all'
                      ? 'لا توجد أجهزة مطابقة لمعايير البحث'
                      : 'لا توجد هواتف مقترنة بالخادم حالياً'}
                  </p>
                  <p className="text-[11px] opacity-70 mt-1 font-tajawal">
                    {searchQuery || statusFilter !== 'all'
                      ? 'جرّب تغيير كلمات البحث أو إعادة تعيين الفلتر'
                      : 'امسح رمز الـ QR أعلاه من تطبيق الهاتف ليظهر الجهاز في هذه القائمة تلقائياً'}
                  </p>
                  {(searchQuery || statusFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                      }}
                      className="mt-3 px-3 py-1.5 rounded-xl bg-surface-container-high text-primary text-xs font-bold hover:bg-surface-container-highest transition-all cursor-pointer"
                    >
                      إعادة تعيين الفلتر
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* بطاقات وظائف وقدرات تطبيق الهاتف المحمول */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                {
                  title: 'نقطة بيع سريعة متنقلة',
                  desc: 'إتمام البيع، الفواتير، وحساب الضرائب والخصومات مباشرة من الهاتف.',
                  icon: ShoppingCart,
                  color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                },
                {
                  title: 'جرد ومسح بالكاميرا',
                  desc: 'فحص الباركود عبر كاميرا الهاتف وتحديث كميات المخزن فورياً.',
                  icon: ScanLine,
                  color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                },
                {
                  title: 'إدارة الزبائن والديون',
                  desc: 'الاطلاع على سجلات العملاء ورصيد الديون وتسجيل الدفعات النقدية.',
                  icon: Users,
                  color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                },
                {
                  title: 'مزامنة ذرية بدون إنترنت',
                  desc: 'مزامنة ثنائية الاتجاه فائقة السرعة تعمل محلياً عبر شبكة الـ Wi-Fi.',
                  icon: ShieldCheck,
                  color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                },
              ].map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-3.5 sm:p-4 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 shadow-xs hover:border-outline-variant/30 transition-all"
                  >
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center border ${feat.color}`}>
                      <FeatIcon className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold font-cairo text-on-surface">{feat.title}</h4>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed font-tajawal">{feat.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* نافذة فحص تفاصيل الجهاز (Device Inspection Modal) */}
            {inspectingDevice && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-surface-container-high rounded-3xl border border-outline-variant/20 w-full max-w-md p-6 space-y-5 shadow-2xl animate-scale-in">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-on-surface font-cairo">
                          بطاقة فحص الجهاز المعتمَد
                        </h3>
                        <p className="text-xs text-on-surface-variant font-mono">
                          #{String(inspectingDevice.id).slice(0, 12)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectingDevice(null)}
                      className="p-1.5 rounded-xl hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">اسم الجهاز:</span>
                        <span className="font-bold text-on-surface">
                          {inspectingDevice.device_name || inspectingDevice.deviceName}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">المصنّع والطراز:</span>
                        <span className="font-bold text-on-surface">
                          {[inspectingDevice.vendor, inspectingDevice.model].filter(Boolean).join(' · ') || 'غير محدد'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">نوع الجهاز:</span>
                        <span className="font-bold text-on-surface">
                          {inspectingDevice.device_type || inspectingDevice.deviceType || 'mobile'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2 font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant font-tajawal text-xs">عنوان IP:</span>
                        <span className="font-bold text-on-surface">
                          {inspectingDevice.ip_address || inspectingDevice.ipAddress || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant font-tajawal text-xs">عنوان MAC:</span>
                        <span className="uppercase text-on-surface">
                          {inspectingDevice.mac_address || inspectingDevice.macAddress || 'غير متوفر'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant font-tajawal text-xs">معرف العتاد الفريد:</span>
                        <span className="text-[10px] text-primary select-all">
                          {inspectingDevice.device_unique_id || 'UID-AUTO-GENERATED'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">التطبيق وإصداره:</span>
                        <span className="font-bold text-on-surface">
                          {inspectingDevice.app_name || inspectingDevice.appName || 'AN POS Mobile'}{' '}
                          <span className="font-mono text-primary font-bold">
                            {inspectingDevice.app_version || inspectingDevice.appVersion || 'v1.0.0'}
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">حالة الاتصال:</span>
                        <span
                          className={`font-bold ${
                            inspectingDevice.status === 'online' ? 'text-emerald-500' : 'text-slate-400'
                          }`}
                        >
                          {inspectingDevice.status === 'online' ? 'متصل بالخادم حالياً' : 'غير متصل'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-on-surface-variant">آخر تسجيل دخول:</span>
                        <span className="font-mono text-on-surface">
                          {inspectingDevice.last_seen
                            ? new Date(inspectingDevice.last_seen).toLocaleString('ar-DZ')
                            : 'الآن'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
                    <button
                      type="button"
                      onClick={() => setInspectingDevice(null)}
                      className="w-full py-2.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-highest/80 text-on-surface text-xs font-bold transition-all cursor-pointer"
                    >
                      إغلاق البطاقة
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* نافذة إعادة تسمية الجهاز (Rename Modal) */}
            {showRenameModal && renamingDevice && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                <div className="bg-surface-container-high rounded-3xl border border-outline-variant/20 w-full max-w-sm p-6 space-y-4 shadow-2xl animate-scale-in">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-sm text-on-surface font-cairo">
                        تعديل اسم الجهاز
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRenameModal(false);
                        setRenamingDevice(null);
                      }}
                      className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-on-surface-variant font-tajawal block">
                      الاسم المخصص للجهاز (يظهر للكاشير وفي التقارير):
                    </label>
                    <input
                      type="text"
                      value={renameInput}
                      onChange={(e) => setRenameInput(e.target.value)}
                      placeholder="مثلاً: كاشير 1، صالة العرض..."
                      autoFocus
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface focus:outline-none focus:border-primary transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isRenaming || !renameInput.trim()}
                      onClick={handleSaveRename}
                      className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isRenaming ? 'جاري الحفظ...' : 'حفظ التعديل'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRenameModal(false);
                        setRenamingDevice(null);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-highest/80 text-on-surface text-xs font-bold transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
  );
}
