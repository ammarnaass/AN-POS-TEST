// Tab Component: GeneralTab (Refactored from SettingsPage.tsx)
import React from 'react';
import { X, Plus, Trash2, FileText, Store, Receipt, Tag, ImageIcon, ShieldCheck, Building2, Phone, Mail, MapPin, Copy, Check, Sparkles, ArrowLeftRight, Landmark, BadgePercent, Coins, CheckCircle } from 'lucide-react';
import type { Currency } from '@/types';

interface GeneralTabProps {
  [key: string]: any;
}

export default function GeneralTab({
  calcAmount,
  calcCurrency,
  copiedFiscalKey,
  generalPreviewMode,
  handleAddCurrency,
  handleAddExpenseCategory,
  handleCopyFiscal,
  handleRemoveExpenseCategory,
  handleSaveSettings,
  handleShopLogoUpload,
  newCurrencyCode,
  newCurrencyRate,
  newCurrencySymbol,
  newExpenseCategory,
  setCalcAmount,
  setCalcCurrency,
  setGeneralPreviewMode,
  setNewCurrencyCode,
  setNewCurrencyRate,
  setNewCurrencySymbol,
  setNewExpenseCategory,
  settings
}: GeneralTabProps) {
  return (
    <div className="space-y-8">
            {/* === 1. بطاقة الهوية التجارية ومعاينة رأس الوصل التفاعلية (Signature Hero Component) === */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-high border border-outline-variant/30 shadow-md p-6 sm:p-8">
              {/* شارة رأس الصفحة التفاعلية */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold font-cairo text-on-surface">بطاقة المؤسسة والامتثال الجبائي</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        جاهز للفواتير
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      المعاينة الحية لهوية المتجر كما تظهر لزبائنك وفي الوصولات الرسمية
                    </p>
                  </div>
                </div>

                {/* أزرار التبديل بين بطاقة الهوية ورأس الفاتورة */}
                <div className="flex items-center bg-surface-container-highest/60 p-1.5 rounded-2xl border border-outline-variant/25 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setGeneralPreviewMode('card')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      generalPreviewMode === 'card'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>بطاقة الهوية الرقمية</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGeneralPreviewMode('receipt')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      generalPreviewMode === 'receipt'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>رأس الوصل الحراري (80mm)</span>
                  </button>
                </div>
              </div>

              {/* محتوى المعاينة التفاعلية */}
              <div className="mt-6">
                {generalPreviewMode === 'card' ? (
                  /* نمط البطاقة الرقمية الفاخرة للمؤسسة */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* معلومات المتجر والشعار */}
                    <div className="lg:col-span-7 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-container-lowest border-2 border-primary/20 flex items-center justify-center overflow-hidden shadow-inner shrink-0 group">
                        {settings.shopLogo ? (
                          <img src={settings.shopLogo} alt="شعار المؤسسة" className="w-full h-full object-contain p-2" />
                        ) : (
                          <Store className="w-12 h-12 text-on-surface-variant/30" />
                        )}
                        <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-surface-container-lowest" title="نشط ومقترن" />
                      </div>

                      <div className="space-y-2 text-center sm:text-right flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <h3 className="text-xl font-bold font-cairo text-on-surface truncate">
                            {settings.shopName || 'متجر AN POS التجاري'}
                          </h3>
                          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                            {settings.baseCurrency || 'دج'}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                          {settings.shopDescription || 'نشاط تجاري عام بالتجزئة والجملة — نظام نقاط البيع المعتمد'}
                        </p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-on-surface-variant/80 pt-1">
                          {(settings.shopAddress || settings.city) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{[settings.shopAddress, settings.city].filter(Boolean).join('، ')}</span>
                            </span>
                          )}
                          {settings.phone && (
                            <span className="flex items-center gap-1 font-mono font-medium">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{settings.phone}</span>
                            </span>
                          )}
                          {settings.shopEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{settings.shopEmail}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* الختم الجبائي والبيانات القانونية */}
                    <div className="lg:col-span-5 bg-surface-container-lowest/80 backdrop-blur-xs rounded-2xl p-4 border border-outline-variant/30 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15 text-[11px] font-bold text-on-surface-variant">
                        <span className="flex items-center gap-1 text-primary">
                          <ShieldCheck className="w-4 h-4" />
                          المعرّفات الجبائية المعتمدة
                        </span>
                        <span className="text-[10px] text-emerald-600 font-mono">Algerian Fiscal IDs</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { label: 'السجل (RC)', val: settings.commercialRegister, key: 'rc' },
                          { label: 'الجبائي (NIF)', val: settings.taxNumber, key: 'nif' },
                          { label: 'المادة (AI)', val: settings.taxArticle, key: 'ai' },
                          { label: 'الإحصائي (NIS)', val: settings.taxId, key: 'nis' },
                        ].map((item) => (
                          <div
                            key={item.key}
                            onClick={() => handleCopyFiscal(item.val, item.key)}
                            className="p-2 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-outline-variant/15 flex flex-col justify-between transition-all cursor-pointer group"
                            title="انقر لنسخ الرقم"
                          >
                            <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-bold">
                              <span>{item.label}</span>
                              {copiedFiscalKey === item.key ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                              )}
                            </div>
                            <span className="font-mono font-bold text-[11px] text-on-surface mt-1 truncate">
                              {item.val || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* نمط رأس الفاتورة الحرارية 80mm */
                  <div className="flex justify-center">
                    <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/40 p-5 font-mono text-center text-on-surface space-y-2 shadow-sm text-xs">
                      {settings.shopLogo && (
                        <div className="w-12 h-12 mx-auto overflow-hidden rounded-lg">
                          <img src={settings.shopLogo} alt="شعار" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <h4 className="font-bold text-sm text-on-surface">{settings.shopName || 'متجر AN POS'}</h4>
                      {settings.shopDescription && <p className="text-[11px] text-on-surface-variant">{settings.shopDescription}</p>}
                      <div className="text-[10px] text-on-surface-variant space-y-0.5 pt-1 border-t border-dashed border-outline-variant/30">
                        {(settings.shopAddress || settings.city) && <p>{[settings.shopAddress, settings.city].filter(Boolean).join(' - ')}</p>}
                        {settings.phone && <p>الهاتف: {settings.phone}</p>}
                        {(settings.commercialRegister || settings.taxNumber) && (
                          <p>RC: {settings.commercialRegister || '—'} | NIF: {settings.taxNumber || '—'}</p>
                        )}
                        {settings.taxArticle && <p>AI: {settings.taxArticle}</p>}
                      </div>
                      <div className="pt-2 text-[10px] text-emerald-600 font-bold border-t border-dashed border-outline-variant/30 flex items-center justify-between">
                        <span>نسبة الضريبة: {settings.tvaRate}% TVA</span>
                        <span>العملة: {settings.baseCurrency || 'دج'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* === 2. هوية المؤسسة والاتصال والشعار === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/15">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-cairo text-on-surface">بيانات المتجر وهوية العلامة</h3>
                  <p className="text-xs text-on-surface-variant">الاسم التجاري، الشعار الرسمي، وأرقام الاتصال المعتمدة</p>
                </div>
              </div>

              {/* رفع وتعديل الشعار */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-surface-container rounded-2xl border border-outline-variant/15">
                <div className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden bg-surface-container-low shrink-0 shadow-inner group">
                  {settings.shopLogo ? (
                    <>
                      <img src={settings.shopLogo} alt="شعار المؤسسة" className="w-full h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/70 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleSaveSettings({ shopLogo: '' })}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold transition-all"
                        >
                          حذف الشعار
                        </button>
                      </div>
                    </>
                  ) : (
                    <Store className="w-12 h-12 text-on-surface-variant/30" />
                  )}
                </div>

                <div className="flex-1 space-y-2.5 text-center sm:text-right">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h4 className="text-sm font-bold text-on-surface">الشعار التجاري الرسمي</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-mono">PNG, JPG حتى 2MB</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    يُدرج الشعار تلقائياً في أعلى الفواتير والوصولات الورقية وبطاقات الضمان والتقارير المالية.
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs">
                    <ImageIcon className="w-4 h-4" />
                    <span>{settings.shopLogo ? 'تغيير الشعار' : 'رفع شعار المؤسسة'}</span>
                    <input type="file" accept="image/*" onChange={handleShopLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* شبكة حقول بيانات المتجر */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-primary" />
                    اسم المؤسسة / المتجر
                  </label>
                  <input
                    type="text"
                    value={settings.shopName || ''}
                    placeholder="مثال: سوبرماركت البركة"
                    onChange={(e) => handleSaveSettings({ shopName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    النشاط التجاري / الوصف
                  </label>
                  <input
                    type="text"
                    value={settings.shopDescription || ''}
                    placeholder="مثال: تجارة المواد الغذائية بالتجزئة والجملة"
                    onChange={(e) => handleSaveSettings({ shopDescription: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    المدينة / الولاية
                  </label>
                  <input
                    type="text"
                    value={settings.city || ''}
                    placeholder="مثال: الجزائر العاصمة"
                    onChange={(e) => handleSaveSettings({ city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-500" />
                    العنوان التفصيلي
                  </label>
                  <input
                    type="text"
                    value={settings.shopAddress || ''}
                    placeholder="مثال: شارع أول نوفمبر، عمارة ب، المحل رقم 04"
                    onChange={(e) => handleSaveSettings({ shopAddress: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    رقم الهاتف الرئيسي
                  </label>
                  <input
                    type="tel"
                    value={settings.phone || ''}
                    placeholder="05XX XX XX XX"
                    onChange={(e) => handleSaveSettings({ phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-600" />
                    الهاتف الثانوي / الثابت
                  </label>
                  <input
                    type="tel"
                    value={settings.shopPhone2 || ''}
                    placeholder="023 XX XX XX"
                    onChange={(e) => handleSaveSettings({ shopPhone2: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={settings.shopEmail || ''}
                    placeholder="contact@store.dz"
                    onChange={(e) => handleSaveSettings({ shopEmail: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* === 3. البيانات القانونية والجبائية الجزائرية === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-cairo text-on-surface">البيانات القانونية والجبائية (Algerian Fiscal Compliance)</h3>
                    <p className="text-xs text-on-surface-variant">الأرقام الإلزامية التي تضمن قانونية الفواتير وفق التشريع الجزائري</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600">
                  <Landmark className="w-3.5 h-3.5" />
                  النظام الجبائي الجزائري
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'السجل التجاري (RC)', key: 'commercialRegister', value: settings.commercialRegister, placeholder: '16/00-1234567B', desc: 'رقم القيد في السجل التجاري' },
                  { label: 'الرقم الجبائي (NIF)', key: 'taxNumber', value: settings.taxNumber, placeholder: '001616012345678', desc: 'رقم التعريف الإحصائي الجبائي' },
                  { label: 'رقم المادة الجبائية (AI)', key: 'taxArticle', value: settings.taxArticle, placeholder: '16012345678', desc: 'رقم مادة جدول الضرائب' },
                  { label: 'رقم التعريف الإحصائي (NIS / ART)', key: 'taxId', value: settings.taxId, placeholder: '123456789', desc: 'رقم التعريف الإحصائي للمؤسسة' },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-on-surface">{f.label}</label>
                      <span className="text-[10px] text-on-surface-variant/70">{f.desc}</span>
                    </div>
                    <input
                      type="text"
                      value={f.value || ''}
                      placeholder={f.placeholder}
                      onChange={(e) => handleSaveSettings({ [f.key]: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold tracking-wider"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* === 4. الضرائب والعملة والخيارات الإقليمية === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-outline-variant/15">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                  <BadgePercent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-cairo text-on-surface">الضرائب، العملة والتنسيق الإقليمي</h3>
                  <p className="text-xs text-on-surface-variant">النسبة الضريبية الافتراضية، العملة الأساسية، وتنسيقات الأرقام والتواريخ</p>
                </div>
              </div>

              {/* ضريبة القيمة المضافة مع خيارات سريعة */}
              <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">نسبة الضريبة الافتراضية TVA (%)</h4>
                    <p className="text-[11px] text-on-surface-variant">تُطبق تلقائياً على المبيعات والفواتير الضريبية</p>
                  </div>

                  {/* أزرار النسب الجاهزة في النظام الجزائري */}
                  <div className="flex items-center gap-2">
                    {[
                      { rate: 19, label: '19% (النسبة العادية)' },
                      { rate: 9, label: '9% (النسبة المخفضة)' },
                      { rate: 0, label: '0% (معفى)' },
                    ].map((preset) => (
                      <button
                        key={preset.rate}
                        type="button"
                        onClick={() => handleSaveSettings({ tvaRate: preset.rate })}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          settings.tvaRate === preset.rate
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-surface-container-highest/70 hover:bg-surface-container-highest text-on-surface-variant'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.tvaRate}
                    onChange={(e) => handleSaveSettings({ tvaRate: Number(e.target.value) || 0 })}
                    className="w-32 px-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/20 text-sm font-bold text-on-surface font-mono"
                  />
                  <span className="text-xs text-on-surface-variant">النسبة المطبقة حالياً في الحسابات: <strong className="text-emerald-600">{settings.tvaRate}%</strong></span>
                </div>
              </div>

              {/* التنسيقات الإقليمية واللغة */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">العملة الأساسية</label>
                  <input
                    type="text"
                    value={settings.baseCurrency || 'دج'}
                    onChange={(e) => handleSaveSettings({ baseCurrency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">لغة الواجهة</label>
                  <select
                    value={settings.language || 'ar'}
                    onChange={(e) => handleSaveSettings({ language: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                  >
                    <option value="ar">🇩🇿 العربية (الافتراضية)</option>
                    <option value="fr">🇫🇷 Français (الفرنسية)</option>
                    <option value="en">🇬🇧 English (الإنجليزية)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">تنسيق التاريخ</label>
                  <select
                    value={settings.dateFormat || 'DD/MM/YYYY'}
                    onChange={(e) => handleSaveSettings({ dateFormat: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (30/08/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-08-30)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1.5">تنسيق فواصل الأرقام</label>
                  <select
                    value={`${settings.thousandsSeparator || ' '}|${settings.decimalSeparator || '.'}`}
                    onChange={(e) => {
                      const [th, dec] = e.target.value.split('|');
                      handleSaveSettings({ thousandsSeparator: th, decimalSeparator: dec });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  >
                    <option value=" |." >1 250.00 دج (قياسي جزائري)</option>
                    <option value=",|.">1,250.00 دج (فاصلة آلاف ونقطة)</option>
                    <option value=".|,">1.250,00 دج (نظام فرنسي)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* === 5. إدارة العملات ومحول أسعار الصرف التفاعلي === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-cairo text-on-surface">إدارة العملات ومحول أسعار الصرف</h3>
                    <p className="text-xs text-on-surface-variant">التعامل بالعملات الأجنبية مع حسابات الصرف الفورية</p>
                  </div>
                </div>
              </div>

              {/* بطاقات العملات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {settings.currencies.map((currency: Currency) => (
                  <div
                    key={currency.code}
                    className="p-4 bg-surface-container rounded-2xl border border-outline-variant/15 flex items-center justify-between shadow-2xs hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 font-bold text-lg flex items-center justify-center shrink-0">
                        {currency.symbol}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-on-surface">{currency.code}</span>
                          {currency.code === settings.baseCurrency.replace(/[^A-Z]/g, '') && (
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold">الأساسية</span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          1 {currency.code} = <strong className="text-on-surface font-mono">{currency.rateToBase}</strong> {settings.baseCurrency}
                        </p>
                      </div>
                    </div>

                    {settings.currencies.length > 1 && currency.code !== settings.baseCurrency.replace(/[^A-Z]/g, '') && (
                      <button
                        type="button"
                        onClick={() => handleSaveSettings({ currencies: settings.currencies.filter((c: Currency) => c.code !== currency.code) })}
                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="حذف العملة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* محول الصرف الحي التجريبي */}
              <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/15 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-on-surface shrink-0">
                  <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                  <span>محول سريع للعملات:</span>
                </div>
                <div className="flex items-center gap-2 flex-1 w-full">
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs font-bold text-on-surface font-mono"
                  />
                  <select
                    value={calcCurrency}
                    onChange={(e) => setCalcCurrency(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs font-bold text-on-surface"
                  >
                    {settings.currencies.map((c: Currency) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-on-surface-variant">=</span>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 font-mono font-bold text-xs border border-emerald-500/20">
                    {(
                      calcAmount *
                      (settings.currencies.find((c: Currency) => c.code === calcCurrency)?.rateToBase || 1)
                    ).toLocaleString('ar-DZ', { minimumFractionDigits: 2 })} {settings.baseCurrency}
                  </div>
                </div>
              </div>

              {/* نموذج إضافة عملة جديدة */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <input
                  value={newCurrencyCode}
                  onChange={(e) => setNewCurrencyCode(e.target.value)}
                  placeholder="رمز العملة (مثال: EUR)"
                  className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface flex-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary uppercase font-mono"
                  maxLength={5}
                />
                <input
                  value={newCurrencySymbol}
                  onChange={(e) => setNewCurrencySymbol(e.target.value)}
                  placeholder="الرمز (مثال: €)"
                  className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface flex-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  maxLength={5}
                />
                <input
                  type="number"
                  value={newCurrencyRate}
                  onChange={(e) => setNewCurrencyRate(e.target.value)}
                  placeholder="سعر الصرف مقابل دج"
                  className="px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface flex-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddCurrency}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة عملة</span>
                </button>
              </div>
            </div>

            {/* === 6. فئات وتصنيفات المصاريف مع المقترحات الذكية === */}
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-cairo text-on-surface">فئات وتصنيفات المصاريف التشغيلية</h3>
                    <p className="text-xs text-on-surface-variant">تبويب المصاريف لتسهيل استخراج تقارير الأرباح والتدفق المالي</p>
                  </div>
                </div>
                <span className="text-xs text-on-surface-variant font-bold">
                  {settings.expenseCategories.length} فئات مسجلة
                </span>
              </div>

              {/* قائمة فئات المصاريف الحالية */}
              <div className="flex flex-wrap gap-2.5">
                {settings.expenseCategories.map((category: string) => (
                  <span
                    key={category}
                    className="flex items-center gap-2 px-3.5 py-2 bg-surface-container rounded-xl text-xs font-bold text-on-surface border border-outline-variant/20 shadow-2xs hover:border-primary/40 transition-all"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{category}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExpenseCategory(category)}
                      className="text-on-surface-variant hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                      title="حذف الفئة"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* المقترحات الجاهزة بضغطة زر */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-on-surface-variant">فئات مقترحة شائعة (انقر للإضافة السريعة):</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'إيجار المحل',
                    'كهرباء وغاز',
                    'ماء',
                    'رواتب وأجور الموظفين',
                    'وقود ومصاريف النقل',
                    'تسويق وإشهار',
                    'صيانة وتصليح العتاد',
                    'مواد التغليف والأكياس',
                    'ضرائب ورسوم مهنية',
                    'اشتراك الإنترنت والهاتف',
                  ]
                    .filter((cat) => !settings.expenseCategories.includes(cat))
                    .map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleSaveSettings({ expenseCategories: [...settings.expenseCategories, cat] })}
                        className="px-3 py-1 rounded-xl text-xs font-medium bg-surface-container-high/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-outline-variant/15 text-on-surface-variant transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-primary" />
                        <span>{cat}</span>
                      </button>
                    ))}
                </div>
              </div>

              {/* إضافة فئة مخصصة */}
              <div className="flex gap-2 pt-2">
                <input
                  value={newExpenseCategory}
                  onChange={(e) => setNewExpenseCategory(e.target.value)}
                  placeholder="أدخل اسم فئة مصاريف مخصصة جديدة..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpenseCategory()}
                />
                <button
                  type="button"
                  onClick={handleAddExpenseCategory}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة فئة</span>
                </button>
              </div>
            </div>
          </div>
  );
}
