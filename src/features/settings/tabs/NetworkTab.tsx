import React, { useState, useMemo, useRef } from 'react';
import {
  Shield, Printer, Smartphone, RefreshCw, Zap,
  Network, ScanLine, ShieldCheck, KeyRound, Activity, Plug,
  AlertCircle, CheckCircle2, Monitor, Wifi, Cloud, HardDrive, Usb,
  Bluetooth, Cable, Copy, Check, Server,
  Lock, Eye, EyeOff, Sparkles, CornerDownLeft, FileText, Radio,
  Plus, Trash2, X
} from 'lucide-react';
import PairingQR from '../components/PairingQR';
import ConnectedDevicesManager from '../components/ConnectedDevicesManager';

interface NetworkTabProps {
  [key: string]: any;
}

export default function NetworkTab({
  deleteDeviceMutation,
  deleteMobileDeviceMutation,
  devices = [],
  handleAddDevice,
  handleSaveSettings,
  handleTestLan,
  handleTestPrinter,
  handleTestScanner,
  hasActiveConnections = false,
  mobilePhones = [],
  netSettings,
  netSubTab,
  newDevice,
  onlineDevicesCount = 0,
  pairingInfo,
  refetchConnected,
  saveNet,
  serverLoading = false,
  serverStatus,
  setNetSubTab,
  setNewDevice,
  setPrinterSavedUnlocked,
  setShowDeviceForm,
  settings,
  showDeviceForm,
  testingLan,
  testingPrinter,
  testingScanner,
  toggleServer
}: NetworkTabProps) {
  // تتبع حالة النسخ للحقول السريعة
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showConnectionKey, setShowConnectionKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // حالة منصة اختبار قارئ الباركود الحي (Live Scanner Test Bench)
  const [scannerTestInput, setScannerTestInput] = useState('');
  const [scannerLastScanned, setScannerLastScanned] = useState<{
    code: string;
    durationMs: number;
    terminator: string;
    timestamp: Date;
    isHardware: boolean;
  } | null>(null);
  const [scannerScanHistory, setScannerScanHistory] = useState<Array<{
    code: string;
    durationMs: number;
    terminator: string;
    timestamp: Date;
    isHardware: boolean;
  }>>([]);
  const scannerStartTimeRef = useRef<number | null>(null);
  const scannerTestInputRef = useRef<HTMLInputElement | null>(null);

  // إدارة القائمة البيضاء لعناوين IP (Chips vs Text)
  const [newIpInput, setNewIpInput] = useState('');
  const [whitelistMode, setWhitelistMode] = useState<'chips' | 'raw'>('chips');

  // نسخ النص مع تغذية بصرية راجعة
  const handleCopy = (text: string, keyName: string) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // تشغيل نغمة صوتية تجريبية للماسح عند نجاح القراءة (Web Audio API)
  const playScannerBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // تجاهل إذا كان الصوت محظوراً بالمتصفح
    }
  };

  // معالجة مدخلات حقل اختبار الماسح الحي
  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!scannerStartTimeRef.current) {
      scannerStartTimeRef.current = performance.now();
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const endTime = performance.now();
      const durationMs = Math.round(endTime - (scannerStartTimeRef.current || endTime));
      const code = scannerTestInput.trim();

      if (code) {
        const isHardware = durationMs < 120 && code.length >= 3;
        const scanResult = {
          code,
          durationMs,
          terminator: e.key,
          timestamp: new Date(),
          isHardware
        };
        setScannerLastScanned(scanResult);
        setScannerScanHistory(prev => [scanResult, ...prev.slice(0, 7)]);
        if (netSettings.scannerBeepEnabled) {
          playScannerBeep();
        }
      }

      setScannerTestInput('');
      scannerStartTimeRef.current = null;
    }
  };

  // قائمة عناوين IP المسموح بها كمصفوفة
  const whitelistList = useMemo(() => {
    if (Array.isArray(netSettings.ipWhitelist)) return netSettings.ipWhitelist;
    if (typeof netSettings.ipWhitelist === 'string') {
      return netSettings.ipWhitelist.split('\n').map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  }, [netSettings.ipWhitelist]);

  const addIpToWhitelist = (ip: string) => {
    const trimmed = ip.trim();
    if (!trimmed || whitelistList.includes(trimmed)) return;
    const updated = [...whitelistList, trimmed];
    saveNet({ ipWhitelist: updated });
    setNewIpInput('');
  };

  const removeIpFromWhitelist = (ipToRemove: string) => {
    const updated = whitelistList.filter((ip: string) => ip !== ipToRemove);
    saveNet({ ipWhitelist: updated });
  };

  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-4 sm:p-6 lg:p-7 shadow-xs space-y-5 sm:space-y-6 transition-all min-w-0">
      {/* =========================================================================
          الترويسة: مركز العمليات والاتصال الحي المتوافق مع مختلف دقات العرض
          ========================================================================= */}
      <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-surface-container border border-outline-variant/15 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5 relative overflow-hidden">
        {/* خلفية جمالية خافتة */}
        <div className="absolute top-0 left-0 w-80 h-full bg-linear-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 relative z-1 min-w-0">
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
            <Network className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black font-cairo text-on-surface tracking-tight">
                الشبكة والاتصال والأجهزة
              </h2>

              {/* شارة عدد الأجهزة المتصلة */}
              <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-black border flex items-center gap-1.5 sm:gap-2 transition-all ${
                onlineDevicesCount > 0
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'
              }`}>
                <span className={`w-2 h-2 rounded-full ${onlineDevicesCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{onlineDevicesCount} نشط</span>
                <span className="opacity-65 font-normal">({mobilePhones.length} مسجل)</span>
              </span>

              {/* شارة حالة الخادم أو وضع التشغيل */}
              {settings.syncMode === 'single' ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  وضع جهاز واحد (الاقتران معطّل)
                </span>
              ) : serverStatus?.running ? (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  خادم الشبكة: نشط (منفذ {serverStatus.port})
                </span>
              ) : (
                <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-medium bg-surface-container-high text-on-surface-variant border border-outline-variant/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  الخادم المحلي: متوقف
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              إدارة بنية التشغيل (مستقل / شبكة LAN)، خادم ربط الهواتف، منافذ الطابعات، قارئ الباركود، ومعايير الأمان
            </p>
          </div>
        </div>

        {/* أدوات سريعة في الترويسة متكيفة تماماً مع العرض */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full xl:w-auto relative z-1">
          {settings.syncMode !== 'single' && (
            <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-2 bg-surface-container-low px-3.5 py-2 rounded-xl border border-outline-variant/20 text-xs font-mono">
              <div className="flex items-center gap-1.5 truncate">
                <Radio className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-on-surface font-bold truncate">
                  {pairingInfo?.ip || netSettings.serverIp || '127.0.0.1'}:{serverStatus?.port || netSettings.serverPort || 3000}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(`${pairingInfo?.ip || netSettings.serverIp || '127.0.0.1'}:${serverStatus?.port || netSettings.serverPort || 3000}`, 'header_addr')}
                title="نسخ عنوان الخادم"
                className="p-1 hover:bg-surface-container-high rounded-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer shrink-0"
              >
                {copiedKey === 'header_addr' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={toggleServer}
            disabled={serverLoading || settings.syncMode === 'single'}
            className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer ${
              settings.syncMode === 'single'
                ? 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30 opacity-60 cursor-not-allowed'
                : serverStatus?.running
                ? 'bg-rose-600 hover:bg-rose-700 text-white active:scale-98'
                : 'bg-primary hover:bg-primary/90 text-on-primary active:scale-98'
            }`}
          >
            {serverLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : serverStatus?.running && settings.syncMode !== 'single' ? (
              <Zap className="w-4 h-4" />
            ) : (
              <Server className="w-4 h-4" />
            )}
            <span>
              {serverLoading
                ? 'جاري المعالجة...'
                : settings.syncMode === 'single'
                ? 'الخادم غير متاح'
                : serverStatus?.running
                ? 'إيقاف الخادم'
                : 'تشغيل الخادم'}
            </span>
          </button>
        </div>
      </div>

      {/* تنبيه قفل الإعدادات الحساسة عند وجود اتصالات نشطة */}
      {hasActiveConnections && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 rounded-2xl text-xs sm:text-sm font-medium animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5 min-w-0">
            <p className="font-bold">حماية الاتصال النشط (قاعدة BR-NET-005):</p>
            <p className="text-xs opacity-90 leading-relaxed">
              يوجد {onlineDevicesCount} جهاز كاشير/هاتف متصل حالياً — تم تأمين إعدادات IP والمنافذ لمنع انقطاع جلسات البيع المباشرة.
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          شريط التبويبات الفرعية المتكيف شبكياً مع كافة دقات العرض (Adaptive Sub-Navigation)
          يتكيف بذكاء: 2 أعمدة للموبايل، 4 أعمدة للتابلت ودقات 1024×768 و 1366×768، و 7 أعمدة لـ 1080p
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-surface-container rounded-2xl border border-outline-variant/20">
        {([
          { id: 'mode', label: 'وضع التشغيل', Icon: Monitor, count: null },
          { id: 'lan', label: 'الشبكة المحلية', Icon: Wifi, count: null },
          { id: 'cloud', label: 'السيرفر الخارجي', Icon: Cloud, count: null },
          { id: 'printer', label: 'الطابعة والملصقات', Icon: Printer, count: null },
          { id: 'barcode', label: 'الباركود والماسح', Icon: ScanLine, count: null },
          { id: 'security', label: 'الأمان والتشفير', Icon: ShieldCheck, count: null },
          {
            id: 'devices',
            label: 'الأجهزة المتصلة',
            Icon: Plug,
            count: mobilePhones.length > 0 ? mobilePhones.length : (devices.length > 0 ? devices.length : null)
          },
        ] as const).map(({ id, label, Icon, count }) => {
          const active = netSubTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setNetSubTab(id)}
              className={`min-h-[44px] flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all select-none cursor-pointer ${
                active
                  ? 'bg-primary text-on-primary shadow-sm scale-[1.01]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              {count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
                    active ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          تبويب 1: وضع التشغيل (Operation Mode)
          ========================================================================= */}
      {netSubTab === 'mode' && (
        <div className="space-y-4 sm:space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
            <div>
              <h3 className="text-sm sm:text-base font-bold font-cairo text-on-surface">اختر بنية التشغيل المناسبة لمنشأتك</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                تحديد ما إذا كان هذا الجهاز يعمل كنقطة بيع مستقلة أو كخادم رئيسي يدعم عدة نقاط كاشير وهواتف
              </p>
            </div>
            <span className="text-xs text-primary font-bold bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 w-fit shrink-0">
              الوضع المعتمد: {settings.syncMode === 'single' ? 'جهاز واحد مستقل' : settings.syncMode === 'lan' ? 'شبكة محلية LAN' : settings.syncMode}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {[
              {
                mode: 'single' as const,
                title: 'جهاز واحد (Single Mode)',
                subtitle: 'مستقل وفائق السرعة',
                badgeText: 'أقصى سرعة',
                desc: 'قاعدة بيانات محلية معزولة تعمل بأقصى سرعة على هذا الجهاز مباشرة دون الحاجة لأي راوتر أو شبكة أو اتصال بالإنترنت.',
                features: [
                  'لا يتطلب وجود راوتر أو شبكة Wi-Fi',
                  'استجابة فورية بدون أي تأخير بالمللي ثانية',
                  'مثالي للمحلات الفردية والشاحنات المتنقلة',
                ],
                icon: Monitor,
                badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                available: true,
              },
              {
                mode: 'lan' as const,
                title: 'عدة أجهزة (شبكة محلية LAN)',
                subtitle: 'سيرفر محلي ومزامنة Wi-Fi',
                badgeText: 'موصى به',
                desc: 'يعمل هذا الجهاز كخادم رئيسي (Server) وترتبط به أجهزة الكاشير وتطبيقات الهواتف المحمولة على نفس الشبكة المحلية.',
                features: [
                  'ربط شاشات كاشير إضافية وهواتف بائعي الصالة',
                  'قاعدة بيانات مركزية واحدة ومحدثة لحظياً',
                  'يعمل محلياً بدون الحاجة لإنترنت خارجي',
                ],
                icon: Wifi,
                badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                available: true,
              },
              {
                mode: 'cloud' as const,
                title: 'عبر الإنترنت (Cloud Sync)',
                subtitle: 'مزامنة سحابية بين الفروع',
                badgeText: 'قريباً',
                desc: 'مزامنة مركزية للمبيعات والمخزون عبر السحابة لمتابعة وإدارة الفروع المتعددة في الوقت الفعلي من أي مكان.',
                features: [
                  'ربط الفروع والمستودعات في شاشة واحدة',
                  'تقارير مبيعات لحظية لمالك المنشأة عن بعد',
                  'نسخ احتياطي سحابي تلقائي مشفر',
                ],
                icon: Cloud,
                badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                available: false,
              },
              {
                mode: 'hybrid' as const,
                title: 'مدمج (سيرفر محلي + Cloud)',
                subtitle: 'أقصى موثوقية واستمرارية',
                badgeText: 'قريباً',
                desc: 'استمرارية العمل محلياً بدون انقطاع عند انقطاع الإنترنت، مع رفع وتحديث البيانات سحابياً في الخلفية فور عودة الاتصال.',
                features: [
                  'لا يتوقف الكاشير إطلاقاً عند انقطاع الإنترنت',
                  'مزامنة ذكية في الخلفية دون تعطيل البيع',
                  'الحل الأنسب للسوبرماركت وسلاسل التجزئة',
                ],
                icon: HardDrive,
                badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                available: false,
              },
            ].map((opt) => {
              const isSelected = settings.syncMode === opt.mode;
              const OptIcon = opt.icon;

              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => {
                    if (!opt.available || hasActiveConnections) return;
                    handleSaveSettings({ syncMode: opt.mode });
                    if (opt.mode === 'single') {
                      saveNet({ lanEnabled: false });
                    }
                    if (opt.mode === 'lan') saveNet({ lanEnabled: true });
                    if (opt.mode === 'cloud') saveNet({ cloudEnabled: true });
                  }}
                  disabled={!opt.available || hasActiveConnections}
                  className={`p-4 sm:p-5 rounded-3xl border-2 text-right transition-all flex flex-col justify-between gap-4 group relative ${
                    isSelected
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm ring-1 ring-primary/30'
                      : 'border-outline-variant/15 bg-surface-container hover:border-primary/40 hover:bg-surface-container-high'
                  } ${!opt.available || hasActiveConnections ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-colors ${
                          isSelected
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container-high text-primary border-outline-variant/20 group-hover:bg-primary/10'
                        }`}
                      >
                        <OptIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold border ${opt.badge}`}>
                          {opt.badgeText}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm sm:text-base font-bold font-cairo text-on-surface">{opt.title}</h4>
                      <p className="text-xs text-primary font-semibold mt-0.5">{opt.subtitle}</p>
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{opt.desc}</p>
                    </div>

                    {/* قائمة المزايا السريعة */}
                    <div className="pt-2 space-y-1.5 border-t border-outline-variant/10">
                      {opt.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between text-xs font-bold">
                    <span className={isSelected ? 'text-primary font-black' : 'text-on-surface-variant'}>
                      {isSelected ? '✓ الوضع النشط حالياً' : opt.available ? 'نقر للتعيين' : 'قريباً في التحديث القادم'}
                    </span>
                    {isSelected && (
                      <span className="px-2.5 py-0.5 rounded-md bg-primary text-on-primary text-[10px] font-black">
                        نشط
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          تبويب 2: الشبكة المحلية وخادم الهواتف (LAN)
          ========================================================================= */}
      {netSubTab === 'lan' && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
          {/* تنبيه تحذيري عند العمل في وضع جهاز واحد */}
          {settings.syncMode === 'single' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in shadow-xs">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold font-cairo text-amber-900 dark:text-amber-200">
                    وضع خادم الهواتف معطّل — النظام مضبوط حالياً على «جهاز واحد»
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-tajawal">
                    وفق قواعد التشغيل: لا يمكن تشغيل خادم الربط أو إقران هواتف الكاشير في وضع <strong>جهاز واحد (Single Mode)</strong>.
                    قم بالتبديل إلى وضع <strong>عدة أجهزة (شبكة محلية LAN)</strong> لتشغيل الخادم وتفعيل رمز QR.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  handleSaveSettings({ syncMode: 'lan' });
                  saveNet({ lanEnabled: true });
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold font-cairo shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                التبديل إلى وضع عدة أجهزة الآن
              </button>
            </div>
          )}

          {/* بطاقة خادم الربط السريع ومسح QR */}
          <div className="p-4 sm:p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/15">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
                  <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-bold font-cairo text-on-surface">خادم ربط الهواتف ونقاط الكاشير المحمولة</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                    {settings.syncMode === 'single'
                      ? 'الخادم معطل بحكم وضع التشغيل المستقل (جهاز واحد)'
                      : serverStatus?.running
                      ? `الخادم نشط وجاهز للاقتران على ${pairingInfo?.ip ?? netSettings.serverIp ?? '---'}:${serverStatus.port}`
                      : 'شغّل الخادم لمسح رمز QR ومزامنة هواتف الكاشير في نفس شبكة Wi-Fi'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleServer}
                disabled={serverLoading || settings.syncMode === 'single'}
                className={`w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0 ${
                  settings.syncMode === 'single'
                    ? 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30 opacity-60 cursor-not-allowed'
                    : serverStatus?.running
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-primary hover:bg-primary/90 text-on-primary'
                }`}
              >
                {serverLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : serverStatus?.running && settings.syncMode !== 'single' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>
                  {serverLoading
                    ? 'جاري المعالجة...'
                    : settings.syncMode === 'single'
                    ? 'الخادم معطل'
                    : serverStatus?.running
                    ? 'إيقاف الخادم'
                    : 'تشغيل الخادم'}
                </span>
              </button>
            </div>

            {settings.syncMode !== 'single' && serverStatus?.running && pairingInfo ? (
              <div className="space-y-4 pt-1">
                <div className="bg-surface-container-low p-4 sm:p-5 rounded-2xl border border-outline-variant/15 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-5 sm:gap-6">
                  {/* رمز QR مع عنوان واضح */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <PairingQR data={pairingInfo} subtitle="امسح الرمز بكاميرا تطبيق AN POS للربط اللحظي" />
                  </div>

                  {/* بطاقات البيانات السريعة مع زر النسخ المباشر */}
                  <div className="flex-1 w-full min-w-0 space-y-3">
                    <h5 className="text-xs font-bold text-on-surface flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary shrink-0" />
                      <span>بيانات الاتصال اليدوي (إذا تعذر مسح الرمز)</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                      {/* IP */}
                      <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between gap-1">
                        <span className="text-[11px] text-on-surface-variant font-medium">عنوان IP الخادم</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-on-surface truncate">{pairingInfo.ip}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(pairingInfo.ip, 'pair_ip')}
                            className="p-1 text-on-surface-variant hover:text-primary rounded-md transition-colors cursor-pointer shrink-0"
                            title="نسخ IP"
                          >
                            {copiedKey === 'pair_ip' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Port */}
                      <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between gap-1">
                        <span className="text-[11px] text-on-surface-variant font-medium">منفذ الاتصال (Port)</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-on-surface">{pairingInfo.port}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(String(pairingInfo.port), 'pair_port')}
                            className="p-1 text-on-surface-variant hover:text-primary rounded-md transition-colors cursor-pointer shrink-0"
                            title="نسخ المنفذ"
                          >
                            {copiedKey === 'pair_port' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Key */}
                      <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between gap-1 sm:col-span-2 xl:col-span-1">
                        <span className="text-[11px] text-on-surface-variant font-medium">مفتاح الربط (Key)</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-on-surface truncate">
                            {showConnectionKey ? pairingInfo.key : '••••••••'}
                          </span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowConnectionKey(!showConnectionKey)}
                              className="p-1 text-on-surface-variant hover:text-primary rounded-md transition-colors cursor-pointer"
                              title={showConnectionKey ? 'إخفاء' : 'إظهار'}
                            >
                              {showConnectionKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(pairingInfo.key, 'pair_key')}
                              className="p-1 text-on-surface-variant hover:text-primary rounded-md transition-colors cursor-pointer"
                              title="نسخ المفتاح"
                            >
                              {copiedKey === 'pair_key' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* خطوات إرشادية سريعة */}
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-on-surface-variant space-y-1">
                      <p className="font-bold text-primary">خطوات الربط السريع:</p>
                      <p>1. تأكد من اتصال الهاتف بنفس شبكة Wi-Fi المتصل بها هذا الجهاز.</p>
                      <p>2. افتح تطبيق AN POS على الهاتف واختر «مسح رمز الاستجابة السريعة» أو أدخل البيانات أعلاه يدوياً.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : settings.syncMode === 'single' ? (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 text-center text-xs text-on-surface-variant space-y-1">
                <p className="font-bold text-amber-700 dark:text-amber-400">🔒 رمز الاقتران (QR) ومعلومات الاتصال غير متاحة في وضع «جهاز واحد».</p>
                <p>قم بالتبديل إلى وضع «عدة أجهزة (شبكة محلية LAN)» لتوليد رمز الاقتران وبدء المزامنة مع الهواتف.</p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/15 text-center text-xs sm:text-sm text-on-surface-variant space-y-2">
                <Server className="w-8 h-8 text-on-surface-variant/40 mx-auto" />
                <p className="font-bold text-on-surface">الخادم متوقف حالياً</p>
                <p className="text-xs max-w-md mx-auto">
                  اضغط على زر <strong>«تشغيل الخادم»</strong> في الأعلى لبدء استقبال اتصالات الهواتف وتوليد رمز QR الخاص بجلسة العمل.
                </p>
              </div>
            )}
          </div>

          {/* إعدادات الشبكة المتقدمة والمنافذ */}
          <div className="p-4 sm:p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4 sm:space-y-5">
            <div>
              <h4 className="text-xs sm:text-sm font-bold font-cairo text-on-surface">إعدادات عنوان الخادم والبروتوكول المحلي</h4>
              <p className="text-xs text-on-surface-variant mt-0.5">
                تخصيص عنوان IP، المنفذ الافتراضي، البروتوكول الأمني، وسياسة استعادة الاتصال
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">عنوان IP للخادم المحلي</label>
                <input
                  type="text"
                  value={netSettings.serverIp}
                  disabled={hasActiveConnections}
                  onChange={(e) => saveNet({ serverIp: e.target.value })}
                  placeholder="192.168.1.100"
                  className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">منفذ الاتصال (Port)</label>
                <input
                  type="number"
                  value={netSettings.serverPort}
                  disabled={hasActiveConnections}
                  onChange={(e) => saveNet({ serverPort: Number(e.target.value) })}
                  placeholder="3000"
                  className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50 text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">بروتوكول الاتصال المحلي</label>
                <div className="flex gap-2">
                  {(['http', 'https'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => !hasActiveConnections && saveNet({ protocol: p })}
                      disabled={hasActiveConnections}
                      className={`flex-1 min-h-[44px] py-2.5 rounded-xl border text-xs font-bold transition-all uppercase cursor-pointer ${
                        netSettings.protocol === p
                          ? 'border-primary bg-primary text-on-primary shadow-xs'
                          : 'border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:border-primary/30'
                      } ${hasActiveConnections ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">مفتاح الاتصال السري (Connection Key)</label>
                <div className="relative">
                  <input
                    type={showConnectionKey ? 'text' : 'password'}
                    value={netSettings.connectionKey ?? ''}
                    disabled={hasActiveConnections}
                    onChange={(e) => saveNet({ connectionKey: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 sm:px-4 py-2.5 pl-10 text-right rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConnectionKey(!showConnectionKey)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                  >
                    {showConnectionKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* إعادة الاتصال التلقائي (BR-NET-003) */}
            <div className="p-3.5 sm:p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-on-surface">إعادة الاتصال التلقائي (قاعدة BR-NET-003)</p>
                  <p className="text-[11px] sm:text-xs text-on-surface-variant leading-relaxed">
                    إعادة المحاولة التلقائية كل 5 ثوانٍ عند حدوث أي انقطاع مؤقت في شبكة الـ Wi-Fi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !hasActiveConnections && saveNet({ autoReconnect: !netSettings.autoReconnect })}
                disabled={hasActiveConnections}
                className={`relative w-12 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                  netSettings.autoReconnect ? 'bg-primary' : 'bg-surface-container-highest'
                } ${hasActiveConnections ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    netSettings.autoReconnect ? 'left-0.5' : 'right-0.5'
                  }`}
                />
              </button>
            </div>

            {/* زر فحص اتصال الخادم التشخيصي */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={handleTestLan}
                disabled={!netSettings.serverIp || testingLan !== null}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 cursor-pointer"
              >
                {testingLan === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                <span>{testingLan === 'ok' ? 'جاري فحص الاتصال واستجابة الخادم...' : 'اختبار استجابة الخادم (Ping Test)'}</span>
              </button>

              {netSettings.lastConnectedAt && (
                <span className="text-xs text-on-surface-variant flex items-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>آخر اتصال ناجح: {new Date(netSettings.lastConnectedAt).toLocaleString('ar-DZ')}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          تبويب 3: السيرفر الخارجي والمزامنة (Cloud)
          ========================================================================= */}
      {netSubTab === 'cloud' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5 sm:space-y-6 animate-fade-in">
          <div className="pb-1">
            <h4 className="text-sm sm:text-base font-bold font-cairo text-on-surface">إعدادات الربط السحابي ومزامنة الفروع</h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              ربط نقطة البيع بقاعدة بيانات سحابية مركزية وبوابات Webhooks لمتابعة المبيعات في الوقت الفعلي
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-on-surface mb-1.5">عنوان API السحابي (Base API URL)</label>
              <input
                type="text"
                value={netSettings.apiUrl ?? ''}
                onChange={(e) => saveNet({ apiUrl: e.target.value })}
                placeholder="https://api.yourshop.com/v1"
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">مفتاح API السري (API Key)</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={netSettings.apiKey ?? ''}
                  onChange={(e) => saveNet({ apiKey: e.target.value })}
                  placeholder="sk_live_••••••••"
                  className="w-full px-3.5 sm:px-4 py-2.5 pl-10 text-right rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">رابط Webhook الإشعارات اللحظية</label>
              <input
                type="text"
                value={netSettings.webhookUrl ?? ''}
                onChange={(e) => saveNet({ webhookUrl: e.target.value })}
                placeholder="https://yourshop.com/api/webhook"
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-right"
              />
            </div>
          </div>

          {/* جدولة المزامنة التلقائية */}
          <div className="p-4 sm:p-5 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-4">
            <h5 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary shrink-0" />
              <span>جدولة المزامنة التلقائية وسياسة الرفع السحابي</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
              <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-outline-variant/15">
                <div>
                  <span className="text-xs font-bold text-on-surface block">المزامنة التلقائية</span>
                  <span className="text-[10px] text-on-surface-variant">رفع دوري في الخلفية</span>
                </div>
                <button
                  type="button"
                  onClick={() => saveNet({ syncAuto: !netSettings.syncAuto })}
                  className={`relative w-12 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                    netSettings.syncAuto ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      netSettings.syncAuto ? 'left-0.5' : 'right-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">فترة التكرار (بالدقائق)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={netSettings.syncInterval}
                    onChange={(e) => saveNet({ syncInterval: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono font-bold text-on-surface"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[5, 15, 30].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => saveNet({ syncInterval: val })}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                          netSettings.syncInterval === val
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                        }`}
                      >
                        {val}د
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2 xl:col-span-1">
                <label className="block text-xs font-bold text-on-surface mb-1">نوع المزامنة السحابية</label>
                <select
                  value={netSettings.syncType}
                  onChange={(e) => saveNet({ syncType: e.target.value as 'full' | 'incremental' })}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface cursor-pointer"
                >
                  <option value="incremental">مزامنة تدريجية (سريعة واقتصادية)</option>
                  <option value="full">مزامنة كاملة (شاملة لجميع السجلات)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          تبويب 4: الطابعة والملصقات (Hardware Printers)
          ========================================================================= */}
      {netSubTab === 'printer' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5 sm:space-y-6 animate-fade-in">
          <div className="pb-1">
            <h4 className="text-sm sm:text-base font-bold font-cairo text-on-surface">إعدادات الطابعات الحرارية والملصقات</h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              تحديد واجهة الاتصال (USB, Network, Bluetooth, COM), السائق المعتمد, دقة الطباعة, ومحاكاة الإيصال
            </p>
          </div>

          {/* نوع واجهة الاتصال الفيزيائية - متكيفة بذكاء عبر مختلف الدقات */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-on-surface">منفذ توصيل الطابعة المعتمد</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
              {([
                { id: 'usb', label: 'USB مباشر', sub: 'طابعة الكاشير السلكية', Icon: Usb },
                { id: 'network', label: 'شبكة IP (LAN)', sub: 'طابعة المطبخ والشبكة', Icon: Network },
                { id: 'bluetooth', label: 'Bluetooth', sub: 'طابعة الفواتير المحمولة', Icon: Bluetooth },
                { id: 'serial', label: 'Serial (COM)', sub: 'منافذ تسلسلية كلاسيكية', Icon: Cable },
                { id: 'parallel', label: 'Parallel (LPT)', sub: 'منافذ متوازية تقليدية', Icon: Plug },
              ] as const).map((opt) => {
                const isSelected = netSettings.printerConnection === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      saveNet({ printerConnection: opt.id as any });
                      setPrinterSavedUnlocked(false);
                    }}
                    className={`flex flex-col items-center justify-between p-3 sm:p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                        : 'border-outline-variant/15 bg-surface-container-low text-on-surface-variant hover:border-primary/40 hover:bg-surface-container-high'
                    }`}
                  >
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center mb-1.5 ${
                      isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                    }`}>
                      <opt.Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-xs font-bold text-on-surface leading-tight">{opt.label}</span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5 leading-tight">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* إعدادات السائق، الدقة، وحجم الورق */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">لغة وأوامر السائق (Printer Driver)</label>
              <select
                value={netSettings.printerDriver}
                onChange={(e) => {
                  saveNet({ printerDriver: e.target.value as any });
                  setPrinterSavedUnlocked(false);
                }}
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-bold text-on-surface cursor-pointer"
              >
                <option value="esc_pos">ESC/POS (طابعات الإيصالات الحرارية القياسية)</option>
                <option value="zpl">ZPL (طابعات ملصقات الباركود Zebra)</option>
                <option value="cpcl">CPCL (طابعات البلوتوث المحمولة)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1.5">دقة الطباعة (DPI)</label>
              <select
                value={netSettings.printerDpi}
                onChange={(e) => {
                  saveNet({ printerDpi: Number(e.target.value) as any });
                  setPrinterSavedUnlocked(false);
                }}
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-bold text-on-surface cursor-pointer"
              >
                <option value={203}>203 DPI (الوضوح القياسي الموصى به)</option>
                <option value={300}>300 DPI (عالي الوضوح للشعارات الدقيقة)</option>
                <option value={600}>600 DPI (فائق الدقة للوثائق الصغيرة)</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-on-surface mb-1.5">عرض الورق الحراري</label>
              <select
                value={netSettings.printerPaperSize}
                onChange={(e) => {
                  saveNet({ printerPaperSize: Number(e.target.value) as any });
                  setPrinterSavedUnlocked(false);
                }}
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs sm:text-sm font-bold text-on-surface cursor-pointer"
              >
                <option value={80}>80 ملم (ورق كاشير قياسي - فواتير تفصيلية)</option>
                <option value={58}>58 ملم (ورق طابعة محمولة صغيرة)</option>
                <option value={76}>76 ملم (ورق طابعات مصفوفية / مطاعم)</option>
              </select>
            </div>
          </div>

          {/* محاكاة إيصال الاختبار وأمر الطباعة الفوري */}
          <div className="p-4 sm:p-5 bg-surface-container-low rounded-2xl border border-outline-variant/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1 text-right min-w-0">
              <h5 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span>فحص كفاءة الرأس الحراري والقطع الآلي</span>
              </h5>
              <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                إرسال إيصال فحص تجريبي يتضمن ترويسة المتجر، جدول أصناف وهمي، باركود الفاتورة، وأمر قاطع الورق التلقائي (Paper Cut).
              </p>
            </div>

            <div className="w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleTestPrinter}
                disabled={testingPrinter !== null}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 cursor-pointer"
              >
                {testingPrinter === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                <span>{testingPrinter === 'ok' ? 'جاري إرسال أمر الطباعة...' : 'طباعة إيصال تجريبي (BR-NET-006)'}</span>
              </button>
            </div>
          </div>

          {netSettings.printerTestedAt && (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>آخر طباعة تجريبية ناجحة: {new Date(netSettings.printerTestedAt).toLocaleString('ar-DZ')}</span>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          تبويب 5: الباركود والماسح (Barcode & Scanner)
          ========================================================================= */}
      {netSubTab === 'barcode' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5 sm:space-y-6 animate-fade-in">
          <div className="pb-1">
            <h4 className="text-sm sm:text-base font-bold font-cairo text-on-surface">صيغة الباركود وسلوك قارئ الباركود (SAFE POS)</h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              تحديد ترميز الباركود المستخدم وتخصيص سرعة واستجابة الماسح الضوئي، مع حقل اختبار حي لقياس الاستجابة
            </p>
          </div>

          {/* شبكة أنواع الباركود مع مؤشرات بصرية */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-on-surface">ترميز الباركود الافتراضي للنظام</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {[
                { id: 'code128', label: 'CODE128', desc: 'عام وشامل — فواتير ومنتجات', format: '||| | | || ||' },
                { id: 'ean13', label: 'EAN-13', desc: 'معياري للمواد الاستهلاكية (13 رقم)', format: '6131234567890' },
                { id: 'code39', label: 'CODE39', desc: 'تتبع المستودعات والأصول', format: '*AN-POS-01*' },
                { id: 'qr', label: 'QR Code', desc: 'رمز الاستجابة السريعة ثنائي الأبعاد', format: 'QR Matrix' },
                { id: 'pdf417', label: 'PDF417', desc: 'كثيف للوثائق والمعاملات الرسمية', format: '2D Stacking' },
                { id: 'data_matrix', label: 'Data Matrix', desc: 'للأجهزة والقطع الإلكترونية الصغيرة', format: 'Compact 2D' },
              ].map((opt) => {
                const isSelected = netSettings.barcodeType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => saveNet({ barcodeType: opt.id as any })}
                    className={`p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                        : 'border-outline-variant/15 bg-surface-container-low hover:border-primary/40 hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold font-mono text-on-surface">{opt.label}</p>
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {opt.format}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant leading-relaxed">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* سلوك الماسح الضوئي وإعدادات الاستجابة */}
          <div className="p-4 sm:p-5 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-4">
            <h5 className="text-xs sm:text-sm font-bold text-on-surface flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary shrink-0" />
              <span>إعدادات استجابة الماسح الضوئي والحماية</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-outline-variant/15">
                <div>
                  <span className="text-xs font-bold text-on-surface block">صوت عند المسح</span>
                  <span className="text-[10px] text-on-surface-variant">تأكيد صوتي للعملية</span>
                </div>
                <button
                  type="button"
                  onClick={() => saveNet({ scannerBeepEnabled: !netSettings.scannerBeepEnabled })}
                  className={`relative w-11 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                    netSettings.scannerBeepEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      netSettings.scannerBeepEnabled ? 'left-0.5' : 'right-0.5'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">مفتاح نهاية المسح (Terminator)</label>
                <select
                  value={netSettings.scannerTerminator}
                  onChange={(e) => saveNet({ scannerTerminator: e.target.value as any })}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface cursor-pointer"
                >
                  <option value="Enter">Enter ↵ (افتراضي وموصى به)</option>
                  <option value="Tab">Tab ⇥ (لقفز الحقول)</option>
                  <option value="None">بدون مفتاح إنهاء</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">أقل طول للباركود المسموح</label>
                <input
                  type="number"
                  min={4}
                  max={40}
                  value={netSettings.scannerMinLength}
                  onChange={(e) => saveNet({ scannerMinLength: Math.max(4, Math.min(40, Number(e.target.value) || 6)) })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono font-bold text-on-surface"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-outline-variant/15">
                <div>
                  <span className="text-xs font-bold text-on-surface block">إدخال يدوي</span>
                  <span className="text-[10px] text-on-surface-variant">السماح بلوحة المفاتيح</span>
                </div>
                <button
                  type="button"
                  onClick={() => saveNet({ scannerAllowManualTypes: !netSettings.scannerAllowManualTypes })}
                  className={`relative w-11 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                    netSettings.scannerAllowManualTypes ? 'bg-primary' : 'bg-surface-container-highest'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      netSettings.scannerAllowManualTypes ? 'left-0.5' : 'right-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              حقل اختبار الماسح الحي التفاعلي (Interactive Live Scanner Test Bench)
              ========================================================================= */}
          <div className="p-4 sm:p-5 bg-surface-container-low rounded-2xl border-2 border-primary/20 space-y-4 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <ScanLine className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs sm:text-sm font-bold font-cairo text-on-surface">منصة اختبار استجابة الماسح الضوئي (Live Test Bench)</h5>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    وجّه قارئ الباركود نحو هذا الحقل واضغط الزناد لفحص سرعة القراءة ومفتاح النهاية وتجربة الصوت
                  </p>
                </div>
              </div>

              {scannerScanHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setScannerScanHistory([]);
                    setScannerLastScanned(null);
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer w-fit shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح السجل</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  ref={scannerTestInputRef}
                  type="text"
                  value={scannerTestInput}
                  onChange={(e) => setScannerTestInput(e.target.value)}
                  onKeyDown={handleScannerKeyDown}
                  placeholder="انقر هنا ثم امسح أي باركود بالماسح أو اكتب واضغط Enter..."
                  className="w-full px-4 py-3 pl-12 rounded-xl bg-surface-container border-2 border-dashed border-primary/40 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-right"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-on-surface-variant pointer-events-none">
                  <CornerDownLeft className="w-4 h-4 text-primary animate-pulse" />
                </div>
              </div>

              {/* بطاقة نتيجة آخر مسح ضوئي */}
              {scannerLastScanned && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        تمت قراءة الباركود بنجاح!
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                        scannerLastScanned.isHardware
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {scannerLastScanned.isHardware ? '⚡ قارئ ليزري سريع' : '⌨️ إدخال يدوي'}
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-mono font-black text-on-surface tracking-wider truncate">
                      {scannerLastScanned.code}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-mono text-on-surface-variant shrink-0">
                    <span>⏱️ السرعة: <strong>{scannerLastScanned.durationMs}ms</strong></span>
                    <span>↵ المفتاح: <strong>{scannerLastScanned.terminator}</strong></span>
                    <span>الطول: <strong>{scannerLastScanned.code.length} أحرف</strong></span>
                  </div>
                </div>
              )}

              {/* سجل المسحات السابقة */}
              {scannerScanHistory.length > 1 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-on-surface-variant block mb-1.5">المسحات الأخيرة في هذه الجلسة:</span>
                  <div className="flex flex-wrap gap-2">
                    {scannerScanHistory.slice(1).map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant/20 text-[11px] font-mono flex items-center gap-2"
                      >
                        <span className="font-bold text-on-surface">{item.code}</span>
                        <span className="text-[10px] text-on-surface-variant">({item.durationMs}ms)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* زر فحص جهاز الماسح الخارجي */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-outline-variant/15">
            <button
              type="button"
              onClick={handleTestScanner}
              disabled={testingScanner !== null}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs sm:text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-40 cursor-pointer"
            >
              {testingScanner === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
              <span>{testingScanner === 'ok' ? 'جاري فحص حالة تعريف الماسح...' : 'اختبار الماسح الضوئي (BR-NET-007)'}</span>
            </button>

            {netSettings.scannerTestedAt && (
              <span className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>آخر اختبار ناجح: {new Date(netSettings.scannerTestedAt).toLocaleString('ar-DZ')}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          تبويب 6: الأمان والتشفير (Security)
          ========================================================================= */}
      {netSubTab === 'security' && (
        <div className="p-4 sm:p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5 sm:space-y-6 animate-fade-in">
          <div className="pb-1">
            <h4 className="text-sm sm:text-base font-bold font-cairo text-on-surface">إعدادات التشفير وحماية شبكة المتجر</h4>
            <p className="text-xs text-on-surface-variant mt-0.5">
              تأمين الاتصالات بروتوكولياً، منع الوصول غير المصرح به، وتحديد العناوين الموثوقة (IP Whitelist)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
            {/* OAuth 2.0 */}
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-on-surface">مصادقة OAuth 2.0</p>
                  <p className="text-[11px] text-on-surface-variant leading-tight">التحقق عبر مزود هوية مركزي أو خدمات السحابة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveNet({ oauthEnabled: !netSettings.oauthEnabled })}
                className={`relative w-12 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                  netSettings.oauthEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    netSettings.oauthEnabled ? 'left-0.5' : 'right-0.5'
                  }`}
                />
              </button>
            </div>

            {/* JWT Tokens */}
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-on-surface">رموز مصادقة JWT المشفرة</p>
                  <p className="text-[11px] text-on-surface-variant leading-tight">توليد رموز وصول مؤقتة لكل جلسة كاشير نشطة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveNet({ jwtEnabled: !netSettings.jwtEnabled })}
                className={`relative w-12 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                  netSettings.jwtEnabled ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    netSettings.jwtEnabled ? 'left-0.5' : 'right-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Force HTTPS */}
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-on-surface">إجبار تشفير HTTPS (BR-NET-008)</p>
                  <p className="text-[11px] text-on-surface-variant leading-tight">حظر أي اتصالات غير مشفرة بين الخادم والهواتف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => saveNet({ forceHttps: !netSettings.forceHttps })}
                className={`relative w-12 h-6 rounded-full transition-all cursor-pointer shrink-0 ${
                  netSettings.forceHttps ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                    netSettings.forceHttps ? 'left-0.5' : 'right-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Rate Limiting */}
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 flex flex-col justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-0.5">
                  حد معدل الطلبات (Rate Limit req/min) — BR-NET-009
                </label>
                <p className="text-[11px] text-on-surface-variant mb-2">أقصى عدد طلبات مسموح بها بالدقيقة الواحدة لكل هاتف</p>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  type="number"
                  value={netSettings.apiRateLimit}
                  onChange={(e) => saveNet({ apiRateLimit: Number(e.target.value) })}
                  className="w-full sm:flex-1 px-3.5 sm:px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs sm:text-sm font-mono font-bold text-on-surface"
                />
                <div className="flex gap-1 shrink-0">
                  {[60, 120, 300].map(limit => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => saveNet({ apiRateLimit: limit })}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                        netSettings.apiRateLimit === limit
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:bg-surface-container-high'
                      }`}
                    >
                      {limit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              مدير القائمة البيضاء لعناوين IP (IP Whitelist Chips Manager)
              ========================================================================= */}
          <div className="p-4 sm:p-5 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-xs sm:text-sm font-bold font-cairo text-on-surface flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary shrink-0" />
                  <span>القائمة البيضاء لعناوين IP المسموح بها (IP Whitelist)</span>
                </h5>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  حصر الاتصال بخادم POS على هواتف وأجهزة محددة فقط. اترك القائمة فارغة للسماح بأي جهاز في نفس الشبكة.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-xl border border-outline-variant/15 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setWhitelistMode('chips')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    whitelistMode === 'chips' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  عرض البطاقات
                </button>
                <button
                  type="button"
                  onClick={() => setWhitelistMode('raw')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    whitelistMode === 'raw' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant'
                  }`}
                >
                  تحرير نصي
                </button>
              </div>
            </div>

            {whitelistMode === 'chips' ? (
              <div className="space-y-3">
                {/* حقل إضافة عنوان جديد */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newIpInput}
                    onChange={(e) => setNewIpInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addIpToWhitelist(newIpInput);
                      }
                    }}
                    placeholder="أدخل عنوان IP مثل: 192.168.1.50 واضغط إضافة..."
                    className="flex-1 px-3.5 sm:px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs sm:text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-right"
                  />
                  <button
                    type="button"
                    onClick={() => addIpToWhitelist(newIpInput)}
                    disabled={!newIpInput.trim()}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة</span>
                  </button>
                </div>

                {/* قائمة البطاقات الحالية */}
                {whitelistList.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {whitelistList.map((ip: string) => (
                      <div
                        key={ip}
                        className="px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center gap-2 text-xs font-mono"
                      >
                        <span className="font-bold text-on-surface">{ip}</span>
                        <button
                          type="button"
                          onClick={() => removeIpFromWhitelist(ip)}
                          className="text-on-surface-variant hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                          title="حذف العنوان"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-surface-container/60 border border-dashed border-outline-variant/20 text-center text-xs text-on-surface-variant">
                    لا توجد قيود على عناوين IP حالياً — يُسمح لأي هاتف على الشبكة بالاقتران بعد التحقق من المفتاح السري.
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={
                  Array.isArray(netSettings.ipWhitelist)
                    ? netSettings.ipWhitelist.join('\n')
                    : typeof netSettings.ipWhitelist === 'string'
                    ? netSettings.ipWhitelist
                    : ''
                }
                onChange={(e) =>
                  saveNet({
                    ipWhitelist: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="192.168.1.50&#10;192.168.1.51"
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-right"
              />
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          تبويب 7: الأجهزة المتصلة والمنافذ (Connected Devices & Ports)
          ========================================================================= */}
      {netSubTab === 'devices' && (
        <div className="animate-fade-in min-w-0">
          <ConnectedDevicesManager
            mobilePhones={mobilePhones}
            devices={devices}
            refetchConnected={refetchConnected}
            serverStatus={serverStatus}
            pairingInfo={pairingInfo}
            deleteMobileDeviceMutation={deleteMobileDeviceMutation}
            deleteDeviceMutation={deleteDeviceMutation}
            handleAddDevice={handleAddDevice}
            newDevice={newDevice}
            setNewDevice={setNewDevice}
            showDeviceForm={showDeviceForm}
            setShowDeviceForm={setShowDeviceForm}
            saveNet={saveNet}
            toggleServer={toggleServer}
            serverLoading={serverLoading}
          />
        </div>
      )}
    </div>
  );
}
