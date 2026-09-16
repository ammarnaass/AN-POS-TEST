// TemplateCard — POS-PRINT-001
import { Star, Eye, Edit2, Copy, Trash2 } from 'lucide-react';
import { PaperMiniature } from './PaperMiniature';
import {
  PAPER_LABELS_AR,
  DOC_TYPE_LABELS_AR,
  type PrintTemplate,
} from '@/types/invoicePrint';

export interface TemplateCardProps {
  template: PrintTemplate;
  canEdit: boolean;
  canDelete: boolean;
  canSetDefault: boolean;
  onPreview: (tpl: PrintTemplate) => void;
  onEdit: (tplId: string) => void;
  onSetDefault: (tplId: string) => void;
  onDuplicate: (tpl: { id: string; name: string }) => void;
  onDelete: (tpl: PrintTemplate) => void;
}

export function TemplateCard({
  template: tpl,
  canEdit,
  canDelete,
  canSetDefault,
  onPreview,
  onEdit,
  onSetDefault,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  return (
    <div
      className="bg-surface-container-low hover:bg-surface-container rounded-2xl border border-outline-variant/20 hover:border-primary/30 p-5 flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md group relative"
    >
      <div>
        {/* رأس البطاقة والشارات */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
              {PAPER_LABELS_AR[tpl.paperSize]}
            </span>
            {tpl.isDefault && (
              <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>افتراضي</span>
              </span>
            )}
            {tpl.isSystem ? (
              <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-surface-container-highest text-on-surface-variant">
                نظامي
              </span>
            ) : (
              <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                مخصص
              </span>
            )}
          </div>

          {/* نقاط ألوان الثيم */}
          <div className="flex items-center -space-x-1.5 rtl:space-x-reverse" title="ألوان القالب">
            <span
              className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-xs"
              style={{ backgroundColor: tpl.styles?.primaryColor || '#0891b2' }}
            />
            <span
              className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shadow-xs"
              style={{ backgroundColor: tpl.styles?.headerColor || '#0e7490' }}
            />
          </div>
        </div>

        {/* المحتوى الرئيسي مع المجسم المصغر للورقة */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="shrink-0 p-1.5 rounded-2xl bg-surface-container/60 border border-outline-variant/15 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            <PaperMiniature
              paperSize={tpl.paperSize}
              primaryColor={tpl.styles?.primaryColor}
              headerColor={tpl.styles?.headerColor}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold font-cairo text-on-surface mb-1 group-hover:text-primary transition-colors">
              {tpl.name}
            </h3>
            <p className="text-xs text-on-surface-variant line-clamp-2 mb-3 leading-relaxed">
              {tpl.description || 'قالب طباعة مستندات تجارية مخصص'}
            </p>

            {/* المستندات المدعومة */}
            <div>
              <div className="text-[11px] font-bold text-on-surface-variant mb-1">الوثائق المدعومة:</div>
              <div className="flex flex-wrap gap-1">
                {!tpl.supportedDocuments || tpl.supportedDocuments.length === 0 ? (
                  <span className="text-xs text-on-surface-variant/70 italic">عام لجميع الوثائق</span>
                ) : (
                  tpl.supportedDocuments.slice(0, 3).map((dt) => (
                    <span
                      key={dt}
                      className="px-2 py-0.5 rounded-md bg-surface-container-high text-[10px] font-semibold text-on-surface border border-outline-variant/10"
                    >
                      {DOC_TYPE_LABELS_AR[dt] || dt}
                    </span>
                  ))
                )}
                {tpl.supportedDocuments && tpl.supportedDocuments.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-surface-container-high text-[10px] font-semibold text-on-surface-variant">
                    +{tpl.supportedDocuments.length - 3}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* شريط الإجراءات السفلي */}
      <div className="pt-3.5 border-t border-outline-variant/15 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPreview(tpl)}
            className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-all flex items-center gap-1.5"
            title="معاينة حية"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>معاينة</span>
          </button>

          {canEdit && (
            <button
              onClick={() => onEdit(tpl.id)}
              className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all flex items-center gap-1.5"
              title="فتح المحرر المرئي"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>تخصيص</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canSetDefault && !tpl.isDefault && (
            <button
              onClick={() => onSetDefault(tpl.id)}
              className="p-2 rounded-xl text-on-surface-variant hover:text-amber-500 hover:bg-amber-500/10 transition-all"
              title="تعيين كافتراضي"
            >
              <Star className="w-4 h-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onDuplicate({ id: tpl.id, name: tpl.name })}
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all"
              title="نسخ القالب"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}

          {canDelete && !tpl.isSystem && (
            <button
              onClick={() => onDelete(tpl)}
              className="p-2 rounded-xl text-on-surface-variant hover:text-red-600 hover:bg-red-500/10 transition-all"
              title="حذف القالب"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
