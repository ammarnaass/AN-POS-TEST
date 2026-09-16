// InteractivePreviewModal — POS-PRINT-001
import {
  Printer,
  X,
  Minimize2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  FileCheck,
  Check,
  ExternalLink,
  Edit2,
} from 'lucide-react';
import {
  PAPER_LABELS_AR,
  DOC_TYPE_LABELS_AR,
  ALL_DOC_TYPES,
  type PrintTemplate,
  type DocTypeKey,
  type PrintLanguage,
} from '@/types/invoicePrint';

export interface InteractivePreviewModalProps {
  template: PrintTemplate | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (templateId: string) => void;
  previewDocType: DocTypeKey;
  setPreviewDocType: (dt: DocTypeKey) => void;
  previewLang: PrintLanguage;
  setPreviewLang: (lang: PrintLanguage) => void;
  previewZoom: number;
  setPreviewZoom: React.Dispatch<React.SetStateAction<number>>;
  previewFitMode: 'fit-page' | 'fit-width' | 'custom';
  setPreviewFitMode: (m: 'fit-page' | 'fit-width' | 'custom') => void;
  previewFullscreen: boolean;
  setPreviewFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  effectiveZoom: number;
  sheetDimensions: { w: number; h: number };
  isLandscape?: boolean;
  previewHtml: string;
  onPrint: () => void;
  onOpenStandalone: () => void;
}

export function InteractivePreviewModal({
  template,
  canEdit,
  onClose,
  onEdit,
  previewDocType,
  setPreviewDocType,
  previewLang,
  setPreviewLang,
  setPreviewZoom,
  previewFitMode,
  setPreviewFitMode,
  previewFullscreen,
  setPreviewFullscreen,
  previewContainerRef,
  effectiveZoom,
  sheetDimensions,
  isLandscape = false,
  previewHtml,
  onPrint,
  onOpenStandalone,
}: InteractivePreviewModalProps) {
  if (!template) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center ${
        previewFullscreen ? 'p-0' : 'p-0 sm:p-2 md:p-4 lg:p-6'
      }`}
    >
      <div
        className={`bg-surface-container-lowest w-full ${
          previewFullscreen
            ? 'h-full rounded-none border-0'
            : 'h-full sm:h-[96vh] sm:max-w-xl md:max-w-4xl lg:max-w-6xl sm:rounded-3xl border-0 sm:border border-outline-variant/25'
        } shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. شريط رأس المعاينة الرئيسي المتجاوب */}
        <div className="p-2.5 sm:p-3.5 md:p-4 bg-surface-container-low border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          {/* اسم القالب والمعلومات الرئيسية */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs sm:text-sm md:text-base text-on-surface font-cairo truncate">
                    معاينة: {template.name}
                  </h3>
                  {template.isDefault && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] shrink-0">
                      افتراضي
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant mt-0.5">
                  <span className="font-mono text-primary font-bold">{PAPER_LABELS_AR[template.paperSize]}</span>
                  <span>•</span>
                  <span className="hidden sm:inline font-medium">
                    {isLandscape ? 'أفقي' : 'عمودي'}
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    {DOC_TYPE_LABELS_AR[previewDocType] || previewDocType}
                  </span>
                </div>
              </div>
            </div>

            {/* أزرار ملء الشاشة والإغلاق السريع لشاشات الهواتف */}
            <div className="flex items-center gap-1 sm:hidden">
              <button
                type="button"
                onClick={() => setPreviewFullscreen((f) => !f)}
                className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant"
                title={previewFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
              >
                {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-rose-600"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* أدوات التحكم باللغة والملاءمة والتكبير */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5">
            {/* محدد لغة المعاينة */}
            <div className="flex items-center gap-0.5 bg-surface-container-high rounded-xl p-0.5 border border-outline-variant/20">
              {[
                { key: 'ar', label: 'العربية' },
                { key: 'ar-fr', label: 'ع/ف' },
                { key: 'fr', label: 'FR' },
                { key: 'en', label: 'EN' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPreviewLang(item.key as PrintLanguage)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    previewLang === item.key
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* خيارات الملاءمة والتكبير */}
            <div className="flex items-center gap-0.5 bg-surface-container-high rounded-xl p-0.5 border border-outline-variant/20">
              <button
                type="button"
                onClick={() => setPreviewFitMode('fit-page')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  previewFitMode === 'fit-page'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="ملاءمة كامل الصفحة في الشاشة بدون تمرير (0)"
              >
                الورقة
              </button>

              <button
                type="button"
                onClick={() => setPreviewFitMode('fit-width')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  previewFitMode === 'fit-width'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title="ملاءمة عرض الورقة للقراءة السريعة"
              >
                العرض
              </button>

              <div className="h-3.5 w-px bg-outline-variant/30 mx-0.5" />

              <button
                type="button"
                onClick={() => {
                  setPreviewFitMode('custom');
                  setPreviewZoom((z) => Math.max(25, z - 10));
                }}
                className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant"
                title="تصغير (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-0.5 font-bold text-on-surface min-w-[34px] text-center">
                {effectiveZoom}%
              </span>
              <button
                type="button"
                onClick={() => {
                  setPreviewFitMode('custom');
                  setPreviewZoom((z) => Math.min(160, z + 10));
                }}
                className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant"
                title="تكبير (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* زر ملء الشاشة على الشاشات الكبيرة */}
            <button
              type="button"
              onClick={() => setPreviewFullscreen((f) => !f)}
              className="hidden sm:flex p-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all border border-outline-variant/20"
              title={previewFullscreen ? 'إنهاء ملء الشاشة (F)' : 'ملء الشاشة (F)'}
            >
              {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* زر الإغلاق على الشاشات الكبيرة */}
            <button
              onClick={onClose}
              className="hidden sm:flex p-1.5 rounded-xl bg-surface-container-high hover:bg-rose-500/10 hover:text-rose-600 text-on-surface-variant transition-all border border-outline-variant/20"
              title="إغلاق المعاينة (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. شريط اختيار أنواع الوثائق المدعومة المتجاوب */}
        <div className="px-3 md:px-4 py-2 bg-surface-container-highest/60 border-b border-outline-variant/15 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-on-surface-variant font-cairo shrink-0 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">الوثيقة:</span>
            </span>

            {/* أزرار الوثائق المدعومة الأساسية للقالب */}
            {template.supportedDocuments.map((docKey) => {
              const isSelected = previewDocType === docKey;
              return (
                <button
                  key={docKey}
                  type="button"
                  onClick={() => setPreviewDocType(docKey)}
                  className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-xs ring-2 ring-primary/20'
                      : 'bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/20'
                  }`}
                >
                  <FileCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-on-primary' : 'text-primary'}`} />
                  <span>{DOC_TYPE_LABELS_AR[docKey] || docKey}</span>
                </button>
              );
            })}

            {/* قائمة لاختبار أي وثيقة أخرى في النظام */}
            {ALL_DOC_TYPES.filter((dt) => !template.supportedDocuments.includes(dt)).length > 0 && (
              <div className="relative shrink-0">
                <select
                  value={template.supportedDocuments.includes(previewDocType) ? '' : previewDocType}
                  onChange={(e) => {
                    if (e.target.value) {
                      setPreviewDocType(e.target.value as DocTypeKey);
                    }
                  }}
                  className={`text-xs font-bold rounded-xl px-2.5 py-1 transition-all border cursor-pointer outline-hidden ${
                    !template.supportedDocuments.includes(previewDocType)
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:text-on-surface'
                  }`}
                >
                  <option value="" disabled>
                    وثائق أخرى (+)...
                  </option>
                  {ALL_DOC_TYPES.filter((dt) => !template.supportedDocuments.includes(dt)).map((dt) => (
                    <option key={dt} value={dt}>
                      {DOC_TYPE_LABELS_AR[dt] || dt} (تجريبي)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* شارة إيضاح حالة البيانات (تظهر على الشاشات الواسعة) */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg shrink-0">
            <Check className="w-3.5 h-3.5" />
            <span>بيانات كاملة واقعية (Colisage + الرصيد + التوقيعات)</span>
          </div>
        </div>

        {/* 3. حاوية محاكاة الورق الواقعية (Paper Canvas) المتجاوبة */}
        <div
          ref={previewContainerRef}
          className="flex-1 overflow-auto bg-slate-900/90 dark:bg-slate-950 p-2 sm:p-4 md:p-6 flex items-start justify-center relative select-none"
        >
          <div
            style={{
              width: `${sheetDimensions.w * (effectiveZoom / 100)}px`,
              height: `${sheetDimensions.h * (effectiveZoom / 100)}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'width 0.15s ease-out, height 0.15s ease-out',
            }}
            className="shrink-0 my-auto"
          >
            <div
              style={{
                transform: `scale(${effectiveZoom / 100})`,
                transformOrigin: 'top center',
                width: `${sheetDimensions.w}px`,
                height: `${sheetDimensions.h}px`,
              }}
              className="shadow-2xl rounded-2xl bg-white overflow-hidden ring-1 ring-white/10"
            >
              <iframe
                id="template-preview-iframe"
                title="Template Preview"
                srcDoc={previewHtml}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        </div>

        {/* 4. شريط الإجراءات السفلي المتجاوب */}
        <div className="p-2.5 sm:p-3.5 bg-surface-container-low border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-on-surface-variant font-cairo">
            <Printer className="w-4 h-4 text-primary" />
            <span>
              معاينة لـ{' '}
              <strong className="text-on-surface font-bold">
                {DOC_TYPE_LABELS_AR[previewDocType] || previewDocType}
              </strong>{' '}
              • ورقة <strong className="text-primary font-bold">{PAPER_LABELS_AR[template.paperSize]}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onPrint}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span>طباعة تجريبية</span>
            </button>

            <button
              type="button"
              onClick={onOpenStandalone}
              className="px-3 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
              title="فتح في نافذة مستقلة للطباعة الفورية"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden md:inline">نافذة مستقلة</span>
            </button>

            {canEdit && (
              <button
                onClick={() => {
                  const id = template.id;
                  onClose();
                  onEdit(id);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>تعديل</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
