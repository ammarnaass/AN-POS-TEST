// TemplatesTableView — POS-PRINT-001
import { Star, Eye, Edit2, Copy, Trash2 } from 'lucide-react';
import {
  PAPER_LABELS_AR,
  DOC_TYPE_LABELS_AR,
  type PrintTemplate,
} from '@/types/invoicePrint';

export interface TemplatesTableViewProps {
  templates: PrintTemplate[];
  canEdit: boolean;
  canDelete: boolean;
  onPreview: (tpl: PrintTemplate) => void;
  onEdit: (tplId: string) => void;
  onDuplicate: (tpl: { id: string; name: string }) => void;
  onDelete: (tpl: PrintTemplate) => void;
}

export function TemplatesTableView({
  templates,
  canEdit,
  canDelete,
  onPreview,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplatesTableViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low shadow-sm">
      <table className="w-full">
        <thead className="bg-surface-container-high/60 text-on-surface-variant text-xs font-bold text-right border-b border-outline-variant/15">
          <tr>
            <th className="px-5 py-3.5">القالب</th>
            <th className="px-4 py-3.5">المقاس</th>
            <th className="px-4 py-3.5">الوثائق المدعومة</th>
            <th className="px-4 py-3.5">الحالة</th>
            <th className="px-5 py-3.5 text-left">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10 text-sm">
          {templates.map((tpl) => (
            <tr key={tpl.id} className="hover:bg-surface-container/50 transition-colors">
              <td className="px-5 py-3.5">
                <div className="font-bold text-on-surface">{tpl.name}</div>
                <div className="text-xs text-on-surface-variant line-clamp-1">{tpl.description}</div>
              </td>
              <td className="px-4 py-3.5">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-primary/10 text-primary border border-primary/20">
                  {PAPER_LABELS_AR[tpl.paperSize]}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex flex-wrap gap-1">
                  {!tpl.supportedDocuments || tpl.supportedDocuments.length === 0 ? (
                    <span className="text-xs text-on-surface-variant/70 italic">عام لجميع الوثائق</span>
                  ) : (
                    tpl.supportedDocuments.map((dt) => (
                      <span key={dt} className="px-2 py-0.5 rounded-md bg-surface-container-high text-[11px] font-semibold text-on-surface">
                        {DOC_TYPE_LABELS_AR[dt] || dt}
                      </span>
                    ))
                  )}
                </div>
              </td>
              <td className="px-4 py-3.5">
                {tpl.isDefault ? (
                  <span className="px-2 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>افتراضي</span>
                  </span>
                ) : (
                  <span className="text-xs text-on-surface-variant">عادي</span>
                )}
              </td>
              <td className="px-5 py-3.5 text-left">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onPreview(tpl)}
                    className="p-2 rounded-lg hover:bg-surface-container-highest text-primary transition-all"
                    title="معاينة"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => onEdit(tpl.id)}
                      className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface transition-all"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => onDuplicate({ id: tpl.id, name: tpl.name })}
                      className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant transition-all"
                      title="نسخ"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && !tpl.isSystem && (
                    <button
                      onClick={() => onDelete(tpl)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 transition-all"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
