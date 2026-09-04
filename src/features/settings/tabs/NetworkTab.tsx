// Tab Component: NetworkTab (Refactored from SettingsPage.tsx)
import React from 'react';
import { Plus, Trash2, Shield, Printer, Smartphone, RefreshCw, Zap, LogOut, Network, ScanLine, ShieldCheck, KeyRound, Activity, Plug, AlertCircle, CheckCircle2, Monitor, Wifi, Cloud, HardDrive, Usb, Bluetooth, Cable } from 'lucide-react';
import type { ConnectedDeviceEntity, ConnectedDeviceType, ConnectionType } from '@/infrastructure/database/dexie/db';
import PairingQR from '../components/PairingQR';

interface NetworkTabProps {
  [key: string]: any;
}

export default function NetworkTab({
  deleteDeviceMutation,
  devices,
  handleAddDevice,
  handleSaveSettings,
  handleTestLan,
  handleTestPrinter,
  handleTestScanner,
  hasActiveConnections,
  mobilePhones,
  netSettings,
  netSubTab,
  newDevice,
  onlineDevicesCount,
  pairingInfo,
  refetchConnected,
  saveNet,
  serverLoading,
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
  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm space-y-6">
            {/* ترويسة القسم والحالة الحية */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <Network className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold font-cairo text-on-surface">الشبكة والاتصال والأجهزة</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                      {onlineDevicesCount} جهاز متصل
                    </span>
                    {serverStatus?.running ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        خادم الشبكة: نشط ({serverStatus.port})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-container-high text-on-surface-variant">
                        الخادم المحلي: متوقف
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    إدارة طرق التشغيل، خادم الشبكة المحلية، الطابعات، قارئ الباركود، والأمان
                  </p>
                </div>
              </div>
            </div>

            {/* تنبيه عند وجود اتصالات نشطة */}
            {hasActiveConnections && (
              <div className="flex items-center gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-2xl text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  يوجد {onlineDevicesCount} اتصال نشط حالياً — تم قفل بعض إعدادات الشبكة الحساسة لمنع انقطاع الاتصال (BR-NET-005)
                </span>
              </div>
            )}

            {/* شريط التبويبات الفرعية */}
            <div className="flex gap-1.5 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/15 flex-wrap">
              {([
                { id: 'mode', label: 'وضع التشغيل', Icon: Monitor, count: null },
                { id: 'lan', label: 'الشبكة المحلية', Icon: Wifi, count: null },
                { id: 'cloud', label: 'السيرفر الخارجي', Icon: Cloud, count: null },
                { id: 'printer', label: 'الطابعة', Icon: Printer, count: null },
                { id: 'barcode', label: 'الباركود', Icon: ScanLine, count: null },
                { id: 'security', label: 'الأمان', Icon: ShieldCheck, count: null },
                { id: 'devices', label: 'الأجهزة المتصلة', Icon: Plug, count: devices.length },
              ] as const).map(({ id, label, Icon, count }) => {
                const active = netSubTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setNetSubTab(id)}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm scale-[1.01]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                    {count !== null && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
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

            {/* === تبويب 1: وضع التشغيل (Operation Mode) === */}
            {netSubTab === 'mode' && (
              <div className="space-y-4">
                <div className="pb-1">
                  <h3 className="text-sm font-bold font-cairo text-on-surface">اختر الطريقة المناسبة لنوع ونشاط منشأتك</h3>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    يمكنك تشغيل النظام كنقطة بيع مستقلة أو كخادم رئيسي يدعم عدة نقاط كاشير وهواتف
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      mode: 'single' as const,
                      title: 'جهاز واحد (Single Mode)',
                      subtitle: 'مستقل وفائق السرعة',
                      desc: 'قاعدة بيانات محلية معزولة تعمل بأقصى سرعة على هذا الجهاز مباشرة دون الحاجة لشبكة أو اتصال بالإنترنت.',
                      icon: Monitor,
                      badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                      available: true,
                    },
                    {
                      mode: 'lan' as const,
                      title: 'عدة أجهزة (شبكة محلية LAN)',
                      subtitle: 'سيرفر محلي ومزامنة Wi-Fi',
                      desc: 'يعمل هذا الجهاز كخادم رئيسي (Server) وترتبط به أجهزة الكاشير وتطبيقات الهواتف على نفس الشبكة المحلية.',
                      icon: Wifi,
                      badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                      available: true,
                    },
                    {
                      mode: 'cloud' as const,
                      title: 'عبر الإنترنت (Cloud Sync)',
                      subtitle: 'مزامنة سحابية بين الفروع',
                      desc: 'مزامنة مركزية للمبيعات والمخزون عبر السحابة لمتابعة وإدارة الفروع المتعددة في الوقت الفعلي.',
                      icon: Cloud,
                      badge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                      available: false,
                    },
                    {
                      mode: 'hybrid' as const,
                      title: 'مدمج (سيرفر محلي + Cloud)',
                      subtitle: 'أقصى موثوقية واستمرارية',
                      desc: 'استمرارية العمل محلياً بدون انقطاع عند انقطاع الإنترنت، مع رفع وتحديث البيانات سحابياً في الخلفية.',
                      icon: HardDrive,
                      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
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
                          if (opt.mode === 'lan') saveNet({ lanEnabled: true });
                          if (opt.mode === 'cloud') saveNet({ cloudEnabled: true });
                        }}
                        disabled={!opt.available || hasActiveConnections}
                        className={`p-5 rounded-3xl border-2 text-right transition-all flex flex-col justify-between gap-4 group ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-outline-variant/15 bg-surface-container hover:border-primary/40'
                        } ${!opt.available || hasActiveConnections ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner ${
                                isSelected ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-high text-primary border-outline-variant/20'
                              }`}
                            >
                              <OptIcon className="w-5 h-5" />
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${opt.badge}`}>
                              {opt.subtitle}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold font-cairo text-on-surface">{opt.title}</h4>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{opt.desc}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-outline-variant/10 flex items-center justify-between text-xs font-bold">
                          <span className={isSelected ? 'text-primary' : 'text-on-surface-variant'}>
                            {isSelected ? '✓ الوضع المعتمد حالياً' : opt.available ? 'نقر للتعيين' : 'قريباً في الإصدار السحابي'}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-md bg-primary text-on-primary text-[10px]">
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

            {/* === تبويب 2: الشبكة المحلية وخادم الهواتف (LAN) === */}
            {netSubTab === 'lan' && (
              <div className="space-y-6">
                {/* خادم التطبيق المحمول ورمز QR */}
                <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/15">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold font-cairo text-on-surface">خادم ربط تطبيقات الهواتف المحمولة</h4>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {serverStatus?.running
                            ? `الخادم نشط ويعمل على ${pairingInfo?.ip ?? '---'}:${serverStatus.port}`
                            : 'شغّل الخادم لربط هواتف الكاشير والمبيعات في نفس الشبكة'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={toggleServer}
                      disabled={serverLoading}
                      className={`relative px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                        serverStatus?.running
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-primary text-on-primary hover:bg-primary/90'
                      }`}
                    >
                      {serverLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : serverStatus?.running ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                      <span>{serverLoading ? 'جاري المعالجة...' : serverStatus?.running ? 'إيقاف الخادم' : 'تشغيل الخادم'}</span>
                    </button>
                  </div>

                  {serverStatus?.running && pairingInfo && (
                    <div className="pt-2">
                      <PairingQR data={pairingInfo} subtitle="افتح تطبيق AN POS على هاتفك وامسح هذا الرمز للاتصال الفوري" />
                      <div className="mt-3 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/15 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-on-surface-variant">
                        <span>📡 IP: <strong className="text-on-surface">{pairingInfo.ip}</strong></span>
                        <span>🔌 Port: <strong className="text-on-surface">{pairingInfo.port}</strong></span>
                        <span>🔑 Key: <strong className="text-on-surface">{pairingInfo.key}</strong></span>
                      </div>
                    </div>
                  )}
                </div>

                {/* إعدادات الاتصال المتقدمة */}
                <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">إعدادات عنوان الخادم والبروتوكول</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">عنوان IP للخادم</label>
                      <input
                        type="text"
                        value={netSettings.serverIp}
                        disabled={hasActiveConnections}
                        onChange={(e) => saveNet({ serverIp: e.target.value })}
                        placeholder="192.168.1.100"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
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
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">البروتوكول</label>
                      <div className="flex gap-2">
                        {(['http', 'https'] as const).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => !hasActiveConnections && saveNet({ protocol: p })}
                            className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all uppercase ${
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
                      <input
                        type="password"
                        value={netSettings.connectionKey ?? ''}
                        disabled={hasActiveConnections}
                        onChange={(e) => saveNet({ connectionKey: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* إعادة الاتصال التلقائي */}
                  <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">إعادة الاتصال التلقائي (BR-NET-003)</p>
                        <p className="text-[11px] text-on-surface-variant">إعادة المحاولة تلقائياً عند انقطاع الاتصال بالشبكة</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => !hasActiveConnections && saveNet({ autoReconnect: !netSettings.autoReconnect })}
                      className={`relative w-12 h-6 rounded-full transition-all ${
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

                  {/* زر اختبار الاتصال */}
                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTestLan}
                      disabled={!netSettings.serverIp || testingLan !== null}
                      className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-40"
                    >
                      {testingLan === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      <span>{testingLan === 'ok' ? 'جاري فحص الاتصال...' : 'اختبار اتصال الخادم'}</span>
                    </button>

                    {netSettings.lastConnectedAt && (
                      <span className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        آخر اتصال ناجح: {new Date(netSettings.lastConnectedAt).toLocaleString('ar-DZ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* === تبويب 3: السيرفر الخارجي والمزامنة (Cloud) === */}
            {netSubTab === 'cloud' && (
              <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
                <div className="pb-1">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">إعدادات الربط السحابي و Webhooks</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    ربط النظام بقاعدة بيانات سحابية أو بوابات الدفع والمزامنة المركزية
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-on-surface mb-1.5">عنوان API السحابي (Base URL)</label>
                    <input
                      type="text"
                      value={netSettings.apiUrl ?? ''}
                      onChange={(e) => saveNet({ apiUrl: e.target.value })}
                      placeholder="https://api.yourshop.com/v1"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">مفتاح API السري (API Key)</label>
                    <input
                      type="password"
                      value={netSettings.apiKey ?? ''}
                      onChange={(e) => saveNet({ apiKey: e.target.value })}
                      placeholder="sk_live_••••••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">رابط Webhook الإشعارات</label>
                    <input
                      type="text"
                      value={netSettings.webhookUrl ?? ''}
                      onChange={(e) => saveNet({ webhookUrl: e.target.value })}
                      placeholder="https://yourshop.com/webhook"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                {/* خيارات المزامنة */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-3">
                  <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    <span>جدولة المزامنة التلقائية</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant/15">
                      <span className="text-xs font-bold text-on-surface">المزامنة التلقائية</span>
                      <button
                        type="button"
                        onClick={() => saveNet({ syncAuto: !netSettings.syncAuto })}
                        className={`relative w-12 h-6 rounded-full transition-all ${
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
                      <label className="block text-xs font-bold text-on-surface mb-1">فترة التكرار (دقائق)</label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={netSettings.syncInterval}
                        onChange={(e) => saveNet({ syncInterval: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">نوع المزامنة</label>
                      <select
                        value={netSettings.syncType}
                        onChange={(e) => saveNet({ syncType: e.target.value as 'full' | 'incremental' })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface"
                      >
                        <option value="incremental">مزامنة تدريجية (سريعة)</option>
                        <option value="full">مزامنة كاملة (شاملة)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === تبويب 4: الطابعة (Hardware Printers) === */}
            {netSubTab === 'printer' && (
              <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
                <div className="pb-1">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">إعدادات الطابعة والاتصال المباشر</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    تحديد منفذ الاتصال، السائق الحراري، دقة الطباعة، وسرعة خروج الإيصال
                  </p>
                </div>

                {/* نوع الاتصال */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-on-surface">نوع منفذ الاتصال</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {([
                      { id: 'usb', label: 'USB مباشر', Icon: Usb },
                      { id: 'network', label: 'شبكة IP', Icon: Network },
                      { id: 'bluetooth', label: 'Bluetooth', Icon: Bluetooth },
                      { id: 'serial', label: 'Serial (COM)', Icon: Cable },
                      { id: 'parallel', label: 'Parallel (LPT)', Icon: Plug },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          saveNet({ printerConnection: opt.id as any });
                          setPrinterSavedUnlocked(false);
                        }}
                        className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border-2 text-xs font-bold transition-all ${
                          netSettings.printerConnection === opt.id
                            ? 'border-primary bg-primary/10 text-primary shadow-xs'
                            : 'border-outline-variant/15 bg-surface-container-low text-on-surface-variant hover:border-primary/30'
                        }`}
                      >
                        <opt.Icon className="w-5 h-5" />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">لغة وأوامر السائق (Driver)</label>
                    <select
                      value={netSettings.printerDriver}
                      onChange={(e) => {
                        saveNet({ printerDriver: e.target.value as any });
                        setPrinterSavedUnlocked(false);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface"
                    >
                      <option value="esc_pos">ESC/POS (طابعات الإيصالات الحرارية)</option>
                      <option value="zpl">ZPL (طابعات ملصقات Zebra)</option>
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
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface"
                    >
                      <option value={203}>203 DPI (قياسي)</option>
                      <option value={300}>300 DPI (عالي الوضوح)</option>
                      <option value={600}>600 DPI (فائق الدقة)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">عرض الورق الحراري</label>
                    <select
                      value={netSettings.printerPaperSize}
                      onChange={(e) => {
                        saveNet({ printerPaperSize: Number(e.target.value) as any });
                        setPrinterSavedUnlocked(false);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface"
                    >
                      <option value={80}>80 ملم (ورق كاشير قياسي)</option>
                      <option value={58}>58 ملم (ورق طابعة محمولة صغيرة)</option>
                      <option value={76}>76 ملم (ورق متوسط)</option>
                    </select>
                  </div>
                </div>

                {/* زر اختبار الطباعة */}
                <div className="pt-3 border-t border-outline-variant/15 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestPrinter}
                    disabled={testingPrinter !== null}
                    className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-40"
                  >
                    {testingPrinter === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                    <span>{testingPrinter === 'ok' ? 'جاري إرسال أمر الطباعة...' : 'اختبار الطابعة + طبعة تجريبية (BR-NET-006)'}</span>
                  </button>

                  {netSettings.printerTestedAt && (
                    <span className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      آخر اختبار: {new Date(netSettings.printerTestedAt).toLocaleString('ar-DZ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* === تبويب 5: الباركود والماسح (Barcode & Scanner) === */}
            {netSubTab === 'barcode' && (
              <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
                <div className="pb-1">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">صيغة الباركود وسلوك قارئ الباركود (SAFE POS)</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    تحديد ترميز الباركود المستخدم وتخصيص سرعة واستجابة الماسح الضوئي
                  </p>
                </div>

                {/* شبكة أنواع الباركود */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'code128', label: 'CODE128', desc: 'عام وشامل — فواتير ومنتجات' },
                    { id: 'ean13', label: 'EAN-13', desc: 'معياري للمواد الاستهلاكية' },
                    { id: 'code39', label: 'CODE39', desc: 'تتبع المستودعات والمخزون' },
                    { id: 'qr', label: 'QR Code', desc: 'رمز الاستجابة السريعة' },
                    { id: 'pdf417', label: 'PDF417', desc: 'كثيف للوثائق والمعاملات' },
                    { id: 'data_matrix', label: 'Data Matrix', desc: 'الأجهزة والقطع الصغيرة' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => saveNet({ barcodeType: opt.id as any })}
                      className={`p-3.5 rounded-2xl border-2 text-right transition-all ${
                        netSettings.barcodeType === opt.id
                          ? 'border-primary bg-primary/10 shadow-xs'
                          : 'border-outline-variant/15 bg-surface-container-low hover:border-primary/30'
                      }`}
                    >
                      <p className="text-xs font-bold font-mono text-on-surface">{opt.label}</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* سلوك الماسح الضوئي */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-3">
                  <h4 className="text-xs font-bold text-on-surface flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>إعدادات استجابة الماسح الضوئي</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant/15">
                      <span className="text-xs font-bold text-on-surface">صوت عند المسح</span>
                      <button
                        type="button"
                        onClick={() => saveNet({ scannerBeepEnabled: !netSettings.scannerBeepEnabled })}
                        className={`relative w-11 h-6 rounded-full transition-all ${
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
                      <label className="block text-xs font-bold text-on-surface mb-1">مفتاح نهاية المسح</label>
                      <select
                        value={netSettings.scannerTerminator}
                        onChange={(e) => saveNet({ scannerTerminator: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface"
                      >
                        <option value="Enter">Enter (افتراضي وموصى به)</option>
                        <option value="Tab">Tab</option>
                        <option value="None">بدون مفتاح إنهاء</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">أقل طول للباركود</label>
                      <input
                        type="number"
                        min={4}
                        max={40}
                        value={netSettings.scannerMinLength}
                        onChange={(e) => saveNet({ scannerMinLength: Math.max(4, Math.min(40, Number(e.target.value) || 6)) })}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-surface-container rounded-xl border border-outline-variant/15">
                      <span className="text-xs font-bold text-on-surface">إدخال يدوي</span>
                      <button
                        type="button"
                        onClick={() => saveNet({ scannerAllowManualTypes: !netSettings.scannerAllowManualTypes })}
                        className={`relative w-11 h-6 rounded-full transition-all ${
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

                {/* زر اختبار الماسح */}
                <div className="pt-2 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestScanner}
                    disabled={testingScanner !== null}
                    className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-40"
                  >
                    {testingScanner === 'ok' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                    <span>{testingScanner === 'ok' ? 'جاري فحص الماسح...' : 'اختبار الماسح الضوئي (BR-NET-007)'}</span>
                  </button>

                  {netSettings.scannerTestedAt && (
                    <span className="text-xs text-on-surface-variant flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      آخر اختبار: {new Date(netSettings.scannerTestedAt).toLocaleString('ar-DZ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* === تبويب 6: الأمان (Security) === */}
            {netSubTab === 'security' && (
              <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-5">
                <div className="pb-1">
                  <h4 className="text-sm font-bold font-cairo text-on-surface">إعدادات التشفير وحماية الاتصالات</h4>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    التحكم في بروتوكولات المصادقة، تشفير HTTPS، والحد من الطلبات الزائدة
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                    <div className="flex items-center gap-3">
                      <KeyRound className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">مصادقة OAuth 2.0</p>
                        <p className="text-[11px] text-on-surface-variant">المصادقة عبر مزود هوية خارجي</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveNet({ oauthEnabled: !netSettings.oauthEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-all ${
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

                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">مصادقة JWT Tokens</p>
                        <p className="text-[11px] text-on-surface-variant">رموز وصول مشفرة ومحددة الصلاحية</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveNet({ jwtEnabled: !netSettings.jwtEnabled })}
                      className={`relative w-12 h-6 rounded-full transition-all ${
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

                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">إجبار تشفير HTTPS (BR-NET-008)</p>
                        <p className="text-[11px] text-on-surface-variant">تشفير جميع الاتصالات الخارجية بنسبة 100%</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => saveNet({ forceHttps: !netSettings.forceHttps })}
                      className={`relative w-12 h-6 rounded-full transition-all ${
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

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      حد الطلبات (API Rate Limit req/min) — BR-NET-009
                    </label>
                    <input
                      type="number"
                      value={netSettings.apiRateLimit}
                      onChange={(e) => saveNet({ apiRateLimit: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-mono text-on-surface"
                    />
                  </div>
                </div>

                {/* قائمة IP المسموح بها */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/15 space-y-2">
                  <label className="block text-xs font-bold text-on-surface">
                    القائمة البيضاء لعناوين IP المسموح بها (IP Whitelist)
                  </label>
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
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[11px] text-on-surface-variant">اكتب كل عنوان IP في سطر منفصل. اترك الحقل فارغاً للسماح بالاتصال من أي جهاز في الشبكة.</p>
                </div>
              </div>
            )}

            {/* === تبويب 7: الأجهزة المتصلة (Connected Devices) === */}
            {netSubTab === 'devices' && (
              <div className="space-y-5">
                {/* الهواتف المحمولة المتصلة حالياً */}
                {serverStatus?.running && mobilePhones.length > 0 && (
                  <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-5 h-5 text-emerald-500" />
                      <h4 className="text-sm font-bold font-cairo text-on-surface">الهواتف الذكية المتصلة بالخادم</h4>
                    </div>

                    <div className="space-y-2">
                      {mobilePhones.map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl border border-outline-variant/15"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${d.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <div>
                              <p className="text-xs font-bold text-on-surface">{d.device_name || d.deviceName}</p>
                              <p className="text-[11px] text-on-surface-variant font-mono">
                                {d.last_seen ? new Date(d.last_seen).toLocaleString('ar-DZ') : '-'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await (window as any).electronAPI?.server?.disconnectDevice(d.id);
                                refetchConnected();
                              } catch {}
                            }}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>فصل الجهاز</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* قائمة أجهزة وملحقات نقاط البيع */}
                <div className="p-6 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold font-cairo text-on-surface">أجهزة وملحقات الكاشير المسجلة ({devices.length})</h4>
                      <p className="text-xs text-on-surface-variant">الطابعات، أدراج النقود، الماسحات، شاشات العرض، والموازين</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowDeviceForm(!showDeviceForm)}
                      className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة جهاز جديد</span>
                    </button>
                  </div>

                  {/* نموذج إضافة جهاز جديد */}
                  {showDeviceForm && (
                    <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-3">
                      <h4 className="text-xs font-bold text-on-surface">تسجيل جهاز جديد</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={newDevice.deviceName}
                          onChange={(e) => setNewDevice({ ...newDevice, deviceName: e.target.value })}
                          placeholder="اسم الجهاز (مثال: طابعة المطبخ)"
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface"
                        />
                        <select
                          value={newDevice.deviceType}
                          onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value as ConnectedDeviceType })}
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface"
                        >
                          <option value="printer">طابعة إيصالات / ملصقات</option>
                          <option value="scanner">ماسح باركود</option>
                          <option value="cash_drawer">درج نقود إلكتروني</option>
                          <option value="display">شاشة عرض للزبون (VFD)</option>
                          <option value="scale">ميزان إلكتروني</option>
                        </select>
                        <select
                          value={newDevice.connectionType}
                          onChange={(e) => setNewDevice({ ...newDevice, connectionType: e.target.value as ConnectionType })}
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-bold text-on-surface"
                        >
                          <option value="usb">USB</option>
                          <option value="network">شبكة LAN</option>
                          <option value="bluetooth">Bluetooth</option>
                          <option value="serial">Serial (COM)</option>
                        </select>
                        <input
                          type="text"
                          value={newDevice.ipAddress}
                          onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                          placeholder="عنوان IP (اختياري)"
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface"
                        />
                        <input
                          type="text"
                          value={newDevice.macAddress}
                          onChange={(e) => setNewDevice({ ...newDevice, macAddress: e.target.value })}
                          placeholder="عنوان MAC (اختياري)"
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface"
                        />
                        <input
                          type="text"
                          value={newDevice.vendor}
                          onChange={(e) => setNewDevice({ ...newDevice, vendor: e.target.value })}
                          placeholder="الشركة المصنعة (اختياري)"
                          className="px-3.5 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAddDevice}
                          className="px-5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all"
                        >
                          حفظ الجهاز
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeviceForm(false)}
                          className="px-5 py-2 bg-surface-container-high text-on-surface-variant rounded-xl text-xs font-bold hover:bg-surface-container-highest transition-all"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {/* جدول الأجهزة */}
                  {devices.length === 0 ? (
                    <div className="py-8 text-center text-on-surface-variant">
                      <Plug className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-bold">لا توجد أجهزة مسجلة حالياً</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container shadow-xs">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-surface-container-high text-on-surface font-bold border-b border-outline-variant/20">
                          <tr>
                            <th className="px-4 py-3">الجهاز</th>
                            <th className="px-4 py-3">النوع</th>
                            <th className="px-4 py-3">نوع الاتصال</th>
                            <th className="px-4 py-3">IP / MAC</th>
                            <th className="px-4 py-3">الحالة</th>
                            <th className="px-4 py-3">آخر ظهور</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/15">
                          {devices.map((d: ConnectedDeviceEntity) => (
                            <tr key={d.id} className="hover:bg-surface-container-highest/50 transition-colors">
                              <td className="px-4 py-3 text-on-surface font-bold">
                                <p>{d.deviceName}</p>
                                {d.vendor && <p className="text-[10px] text-on-surface-variant font-normal">{d.vendor}{d.model ? ` · ${d.model}` : ''}</p>}
                              </td>
                              <td className="px-4 py-3">
                                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-surface-container-high text-on-surface-variant">
                                  {({ printer: 'طابعة', scanner: 'ماسح', cash_drawer: 'درج نقود', display: 'شاشة', scale: 'ميزان' } as Record<string, string>)[d.deviceType] || d.deviceType}
                                </span>
                              </td>
                              <td className="px-4 py-3 uppercase font-mono text-on-surface-variant">{d.connectionType}</td>
                              <td className="px-4 py-3 font-mono text-on-surface-variant">
                                {d.ipAddress ?? '-'}{d.macAddress ? <><br /><span className="text-[10px] opacity-70">{d.macAddress}</span></> : ''}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    d.status === 'online'
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : d.status === 'error'
                                      ? 'bg-red-500/10 text-red-600'
                                      : 'bg-surface-container-highest text-on-surface-variant'
                                  }`}
                                >
                                  {({ online: 'متصل', offline: 'غير متصل', error: 'خطأ' } as Record<string, string>)[d.status] || d.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-on-surface-variant font-mono whitespace-nowrap">
                                {d.lastSeen ? new Date(d.lastSeen).toLocaleString('ar-DZ') : '-'}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => deleteDeviceMutation.mutate(d.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-all"
                                  title="حذف الجهاز"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
  );
}
