// PresetTemplatesTab — POS-PRINT-001
import { Sparkles, Check, Eye, Plus } from 'lucide-react';
import { PaperMiniature } from './PaperMiniature';
import {
  TEMPLATE_PRESETS,
  type PresetDef,
} from '@/services/print/templateService';
import {
  PAPER_LABELS_AR,
  DOC_TYPE_LABELS_AR,
  type PrintTemplate,
} from '@/types/invoicePrint';

export interface PresetTemplatesTabProps {
  presetCategoryFilter: 'all' | 'receipt' | 'invoice' | 'document';
  setPresetCategoryFilter: (cat: 'all' | 'receipt' | 'invoice' | 'document') => void;
  templates: PrintTemplate[];
  canEdit: boolean;
  isCreating: boolean;
  onCreateFromPreset: (presetId: string) => void;
  onPreview: (tpl: PrintTemplate) => void;
}

export function PresetTemplatesTab({
  presetCategoryFilter,
  setPresetCategoryFilter,
  templates,
  canEdit,
  isCreating,
  onCreateFromPreset,
  onPreview,
}: PresetTemplatesTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* بانر النماذج الجاهزة وفلاتر التصنيف */}
      <div className="bg-gradient-to-l from-primary/10 via-surface-container to-surface-container-low p-6 rounded-3xl border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-cairo text-on-surface flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>نماذج معتمدة ومجهزة مسبقاً وفق المعايير التجارية الجزائرية</span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            قوالب متكاملة للإيصالات الحرارية 80mm/58mm، الفواتير A4/A5، سندات التسليم BL، عروض الأسعار Devis، وطلبيات الشراء.
          </p>
        </div>

        {/* أزرار الفئات */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'جميع النماذج' },
            { id: 'receipt', label: 'إيصالات نقاط البيع (80/58mm)' },
            { id: 'invoice', label: 'فواتير المبيعات (A4/A5)' },
            { id: 'document', label: 'سندات وعروض أسعار' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setPresetCategoryFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                presetCategoryFilter === cat.id
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-highest/80 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* شبكة النماذج الجاهزة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEMPLATE_PRESETS.filter(
          (p) => presetCategoryFilter === 'all' || p.category === presetCategoryFilter,
        ).map((preset) => {
          const buildData = preset.build();
          const isAlreadyImported = templates.some(
            (t) => t.id === preset.id || t.name === (preset.nameAr || preset.name),
          );

          return (
            <div
              key={preset.id}
              className="bg-surface-container-low hover:bg-surface-container rounded-2xl border border-outline-variant/20 hover:border-primary/40 p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md group relative"
            >
              <div>
                {/* رأس بطاقة النموذج */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
                      {PAPER_LABELS_AR[preset.paperSize] || preset.paperSize}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-surface-container-highest text-on-surface-variant">
                      {preset.category === 'receipt'
                        ? 'إيصال حراري'
                        : preset.category === 'invoice'
                        ? 'فاتورة رسمية'
                        : 'سند تجاري'}
                    </span>
                    {isAlreadyImported && (
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>مضاف</span>
                      </span>
                    )}
                  </div>

                  {/* ألوان الثيم للنموذج */}
                  <div className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-xs"
                      style={{ backgroundColor: buildData.styles?.primaryColor || '#0891b2' }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-xs"
                      style={{ backgroundColor: buildData.styles?.headerColor || '#0e7490' }}
                    />
                  </div>
                </div>

                {/* المحتوى الرئيسي مع المجسم المصغر للورقة */}
                <div className="flex items-start gap-3.5 mb-3">
                  <div className="shrink-0 p-1.5 rounded-2xl bg-surface-container/60 border border-outline-variant/15 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                    <PaperMiniature
                      paperSize={preset.paperSize}
                      primaryColor={buildData.styles?.primaryColor}
                      headerColor={buildData.styles?.headerColor}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold font-cairo text-on-surface mb-1 group-hover:text-primary transition-colors">
                      {preset.nameAr || preset.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-3 leading-relaxed">
                      {preset.description}
                    </p>

                    {/* المستندات المدعومة */}
                    <div>
                      <div className="text-[11px] font-bold text-on-surface-variant mb-1">الوثائق المدعومة:</div>
                      <div className="flex flex-wrap gap-1">
                        {buildData.supportedDocuments?.map((dt) => (
                          <span
                            key={dt}
                            className="px-2 py-0.5 rounded-md bg-surface-container-high text-[10px] font-semibold text-on-surface border border-outline-variant/10"
                          >
                            {DOC_TYPE_LABELS_AR[dt] || dt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* إجراءات النموذج */}
              <div className="pt-3.5 border-t border-outline-variant/15 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const mockTpl: PrintTemplate = {
                      ...buildData,
                      id: preset.id,
                      name: preset.nameAr || preset.name,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    onPreview(mockTpl);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>معاينة</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onCreateFromPreset(preset.id)}
                    disabled={isCreating}
                    className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إنشاء من هذا النموذج</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
