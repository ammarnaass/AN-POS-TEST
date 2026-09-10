import React from 'react';
import { Wifi, Smartphone, Tablet, Monitor, Trash2, Key, RefreshCw, Zap, ListChecks, LogOut, Copy, Check, ShoppingCart, ScanLine, Users, ShieldCheck, AlertCircle } from 'lucide-react';
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

export default function MobileDevicesTab({
  copiedField,
  deleteMobileDeviceMutation,
  handleCopyText,
  handleRegenerateKey,
  mobilePhones,
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
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold font-cairo text-on-surface">
                      الهواتف والأجهزة المتصلة حالياً ({mobilePhones.length})
                    </h3>
                    <p className="text-[11px] text-on-surface-variant font-tajawal">
                      متابعة الأجهزة المقترنة والتحكم في جلسات الاتصال النشطة
                    </p>
                  </div>
                </div>

                {mobilePhones.length > 0 && (
                  <button
                    type="button"
                    onClick={refetchConnected}
                    className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant transition-all cursor-pointer"
                    title="تحديث قائمة الأجهزة"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {mobilePhones.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mobilePhones.map((d: any) => {
                    const devType = d.device_type || d.deviceType || 'mobile';
                    const isTablet = devType === 'tablet';
                    const isPos = devType === 'pos_terminal' || devType === 'desktop';
                    const isOnline = d.status === 'online';
                    const devName = d.device_name || d.deviceName || 'هاتف محمول';
                    const vendorModel = [d.vendor, d.model].filter(Boolean).join(' · ');
                    const ip = d.ip_address || d.ipAddress;
                    const mac = d.mac_address || d.macAddress;

                    return (
                      <div
                        key={d.id}
                        className="p-4 rounded-3xl bg-surface-container border border-outline-variant/20 flex flex-col justify-between gap-3.5 shadow-xs hover:border-primary/30 transition-all"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner shrink-0 ${
                                isOnline ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-surface-container-high text-on-surface-variant border-outline-variant/20'
                              }`}>
                                {isTablet ? <Tablet className="w-5 h-5 text-purple-500" /> : isPos ? <Monitor className="w-5 h-5 text-blue-500" /> : <Smartphone className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-on-surface truncate">{devName}</p>
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-primary/10 text-primary shrink-0">فريد</span>
                                </div>
                                <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                                  {vendorModel || (isTablet ? 'جهاز لوحي' : 'هاتف ذكي')}
                                </p>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 inline-flex items-center gap-1 ${
                              isOnline ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-surface-container-highest text-on-surface-variant'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                              {isOnline ? 'متصل' : 'غير متصل'}
                            </span>
                          </div>

                          {/* تفاصيل المعطيات التقنية (IP & MAC) */}
                          <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15 space-y-1 text-[11px] font-mono">
                            <div className="flex items-center justify-between text-on-surface-variant">
                              <span className="font-tajawal text-[10px] opacity-75">عنوان IP:</span>
                              <span className="font-bold text-on-surface">{ip || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between text-on-surface-variant">
                              <span className="font-tajawal text-[10px] opacity-75">عنوان MAC:</span>
                              <span className="text-[10px] uppercase">{mac || 'غير متوفر'}</span>
                            </div>
                            <div className="flex items-center justify-between text-on-surface-variant pt-1 border-t border-outline-variant/10">
                              <span className="font-tajawal text-[10px] opacity-75">آخر نشاط:</span>
                              <span className="text-[10px]">{d.last_seen ? new Date(d.last_seen).toLocaleTimeString('ar-DZ') : 'الآن'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15">
                          {isOnline ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await (window as any).electronAPI?.server?.disconnectDevice(d.id);
                                  refetchConnected();
                                } catch {}
                              }}
                              className="px-3 py-1.5 rounded-xl text-amber-600 hover:bg-amber-500/10 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="فصل الجهاز"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>فصل الجلسة</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-on-surface-variant font-medium">جلسة غير نشطة</span>
                          )}

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
                <div className="py-6 sm:py-8 text-center text-on-surface-variant">
                  <Smartphone className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-2 opacity-25" />
                  <p className="text-xs font-bold font-cairo">لا توجد هواتف متصلة بالخادم حالياً</p>
                  <p className="text-[11px] opacity-70 mt-0.5 font-tajawal">
                    امسح رمز الـ QR أعلاه من تطبيق الهاتف ليظهر الجهاز في هذه القائمة تلقائياً
                  </p>
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
          </div>
  );
}
