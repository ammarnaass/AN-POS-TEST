// Tab Component: InvoicesTab (Refactored from SettingsPage.tsx)
import React from 'react';
import { FileText, Printer, Receipt, LayoutTemplate, ListChecks } from 'lucide-react';

interface InvoicesTabProps {
  [key: string]: any;
}

export default function InvoicesTab({
  handleSaveSettings,
  invoiceSubTab,
  navigate,
  setInvoiceSubTab,
  settings
}: InvoicesTabProps) {
  return (
    <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm space-y-6">
            {/* رأس القسم */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-outline-variant/15">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-cairo text-on-surface">إعدادات الفواتير والطباعة</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                      {settings.invoiceTemplate === 'detailed' ? 'قالب تفصيلي' : 'قالب أساسي'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    قوالب الفاتورة، إعدادات الطباعة، والترقيم التلقائي
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/settings/print-templates')}
                  className="px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  <span>مصمم القوالب المرئي</span>
                </button>
              </div>
            </div>

            {/* شريط التبويبات الفرعية */}
            <div className="flex gap-2 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/15">
              {[
                { id: 'template', label: 'قالب الفاتورة والترقيم', Icon: LayoutTemplate },
                { id: 'printing', label: 'إعدادات الطباعة واللغة', Icon: Printer },
                { id: 'advanced', label: 'قوالب الطباعة المتقدمة والطابعات', Icon: ListChecks },
              ].map(({ id, label, Icon }) => {
                const active = invoiceSubTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setInvoiceSubTab(id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-primary text-on-primary shadow-sm scale-[1.01]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* === تبويب 1: قالب الفاتورة والترقيم === */}
            {invoiceSubTab === 'template' && (
              <div className="space-y-6">
                {/* اختيار نوع القالب */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-on-surface font-cairo flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-primary" />
                      <span>نوع القالب الافتراضي</span>
                    </label>
                    <span className="text-xs text-on-surface-variant">انقر لتحديد القالب المعتمد</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* قالب أساسي */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSaveSettings({ invoiceTemplate: 'basic' })}
                      className={`relative p-5 rounded-3xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        settings.invoiceTemplate === 'basic'
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-2 ring-primary/20'
                          : 'border-outline-variant/20 bg-surface-container hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <Receipt className="w-6 h-6" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          settings.invoiceTemplate === 'basic' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant'
                        }`}>
                          {settings.invoiceTemplate === 'basic' && <span className="text-[10px] font-black">✓</span>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-on-surface font-cairo">قالب أساسي</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                            سريع ومدمج
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          إيصال بسيط مع المعلومات الأساسية، مناسب لطابعات الكاشير الحرارية وسرعة خدمة الزبائن.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-on-surface-variant">
                        <span>المحتوى: اسم المحل · الأصناف · الإجمالي · كود QR</span>
                      </div>
                    </div>

                    {/* قالب تفصيلي */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSaveSettings({ invoiceTemplate: 'detailed' })}
                      className={`relative p-5 rounded-3xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                        settings.invoiceTemplate === 'detailed'
                          ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 ring-2 ring-primary/20'
                          : 'border-outline-variant/20 bg-surface-container hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          settings.invoiceTemplate === 'detailed' ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant'
                        }`}>
                          {settings.invoiceTemplate === 'detailed' && <span className="text-[10px] font-black">✓</span>}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-on-surface font-cairo">قالب تفصيلي</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">
                            تجاري ومحاسبي
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          فاتورة مفصلة مع جميع البيانات القانونية (RC, NIF, AI)، بيانات العميل، الضرائب، والتوقيعات.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-on-surface-variant">
                        <span>المحتوى: الهوية الجبائية · جدول محاسبي · تفصيل TVA · أختام</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ترقيم وتسلسل الفواتير */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-bold font-cairo text-on-surface">تسلسل وترقيم الفواتير</h3>
                    </div>
                    <div className="px-3 py-1 rounded-xl bg-surface-container-highest text-xs font-mono font-bold text-primary border border-outline-variant/20">
                      معاينة الفاتورة التالية: {settings.invoicePrefix || 'INV-'}{String(settings.invoiceStartNumber || 1).padStart(6, '0')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">بادئة رقم الفاتورة (Prefix)</label>
                      <input
                        type="text"
                        value={settings.invoicePrefix}
                        onChange={(e) => handleSaveSettings({ invoicePrefix: e.target.value })}
                        placeholder="مثال: INV- أو FACT-"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono uppercase font-bold"
                      />
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[11px] text-on-surface-variant">اقتراحات سريعة:</span>
                        {['INV-', 'FACT-', 'BL-', 'TKT-'].map((pfx) => (
                          <button
                            key={pfx}
                            type="button"
                            onClick={() => handleSaveSettings({ invoicePrefix: pfx })}
                            className="px-2 py-0.5 rounded-lg bg-surface-container-highest hover:bg-primary/10 hover:text-primary text-[10px] font-mono font-bold transition-all"
                          >
                            {pfx}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">رقم البداية التسلسلي</label>
                      <input
                        type="number"
                        min="1"
                        value={settings.invoiceStartNumber}
                        onChange={(e) => handleSaveSettings({ invoiceStartNumber: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold font-mono"
                      />
                      <p className="text-[11px] text-on-surface-variant mt-2">
                        يتم زيادة الرقم تلقائياً مع كل فاتورة بيع جديدة يتم إصدارها
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === تبويب 2: إعدادات الطباعة واللغة === */}
            {invoiceSubTab === 'printing' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* مقاس الطباعة */}
                  <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-3">
                    <label className="block text-xs font-bold text-on-surface font-cairo">مقاس ورق الطباعة الافتراضي</label>
                    <select
                      value={settings.printWidthMm}
                      onChange={(e) => handleSaveSettings({ printWidthMm: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                    >
                      <option value={80}>80mm (إيصال حراري قياسي 80 ملم للسوبرماركت)</option>
                      <option value={58}>58mm (إيصال حراري صغير 58 ملم)</option>
                      <option value={0}>A4 / A5 (فواتير ووصولات تجارية رسمية)</option>
                    </select>
                    <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant space-y-1">
                      <p className="font-semibold text-on-surface">💡 توصيات الاستخدام:</p>
                      <p>• 80mm: الأفضل لنقاط البيع ونظام الكاشير المزدحم.</p>
                      <p>• A4 / A5: الأنسب للمؤسسات والشركات والمبيعات بالجملة.</p>
                    </div>
                  </div>

                  {/* لغة طباعة الفواتير */}
                  <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-3">
                    <label className="block text-xs font-bold text-on-surface font-cairo">لغة طباعة الفواتير والوصولات</label>
                    <select
                      value={(settings as any).printLanguage || 'ar'}
                      onChange={(e) => handleSaveSettings({ printLanguage: e.target.value } as any)}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold"
                    >
                      <option value="ar">🇩🇿 العربية (اتّجاه RTL كامل)</option>
                      <option value="ar-fr">🌐 ثنائية اللغة (عربي / Français)</option>
                      <option value="fr">🇫🇷 Français (فرنسية كاملة LTR)</option>
                      <option value="en">🇬🇧 English (إنجليزية LTR)</option>
                    </select>
                    <div className="p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant space-y-1">
                      <p className="font-semibold text-on-surface">🌐 دعم الاتجاهات:</p>
                      <p>• العربية: اتجاه كامل من اليمين لليسار (RTL).</p>
                      <p>• اللغات الأجنبية: يتم عكس محاذاة الأعمدة تلقائياً (LTR).</p>
                    </div>
                  </div>
                </div>

                {/* نص تذييل الفاتورة */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-on-surface">نص التذييل أسفل الفاتورة (Receipt Footer)</label>
                    <span className="text-[11px] text-on-surface-variant">يظهر في أسفل كل إيصال مطبوع</span>
                  </div>
                  <textarea
                    value={settings.receiptFooter}
                    onChange={(e) => handleSaveSettings({ receiptFooter: e.target.value })}
                    placeholder="مثال: شكراً لزيارتكم · البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary leading-relaxed"
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="text-[11px] text-on-surface-variant">نصوص جاهزة:</span>
                    {[
                      'شكراً لتسوقكم معنا ومرحباً بكم دائماً',
                      'البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة خلال 48 ساعة',
                      'Merci pour votre visite et à bientôt !',
                    ].map((txt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSaveSettings({ receiptFooter: txt })}
                        className="px-2.5 py-1 rounded-lg bg-surface-container-highest hover:bg-primary/10 hover:text-primary text-[11px] transition-all text-on-surface-variant"
                      >
                        "{txt.slice(0, 24)}..."
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* === تبويب 3: قوالب الطباعة المتقدمة والطابعات === */}
            {invoiceSubTab === 'advanced' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* مدير القوالب */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 hover:border-primary/30 transition-all">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <LayoutTemplate className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-cairo text-on-surface">مصمم ومدير القوالب</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        تخصيص قوالب الفواتير الحرارية 80mm و 58mm وفواتير A4 و A5 بدقة بصرية وتحديد الحقول الظاهرة.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/settings/print-templates')}
                    className="w-full py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <LayoutTemplate className="w-4 h-4" />
                    <span>فتح مدير القوالب</span>
                  </button>
                </div>

                {/* طابور مهام الطباعة */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 hover:border-amber-500/30 transition-all">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <ListChecks className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-cairo text-on-surface">طابور مهام الطباعة</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        متابعة أوامر الطباعة المعلقة، إعادة المحاولة التلقائية عند انقطاع الطابعة، وإدارة الأخطاء.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/settings/print-queue')}
                    className="w-full py-2.5 bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                  >
                    <ListChecks className="w-4 h-4" />
                    <span>متابعة الطابور</span>
                  </button>
                </div>

                {/* إدارة الطابعات */}
                <div className="p-5 rounded-3xl bg-surface-container border border-outline-variant/15 flex flex-col justify-between gap-4 hover:border-cyan-500/30 transition-all">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold font-cairo text-on-surface">إدارة واكتشاف الطابعات</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        إضافة طابعات (USB / Bluetooth / Network)، اختبار الاتصال المباشر، والتعيينات الافتراضية.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/settings/printers')}
                    className="w-full py-2.5 bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>فتح إدارة الطابعات</span>
                  </button>
                </div>
              </div>
            )}
          </div>
  );
}
