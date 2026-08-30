// TemplateAssignmentManager — POS-PRINT-001
// إدارة تعيينات القوالب لأنواع الوثائق
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  getAllAssignments, 
  assignTemplateToDocType, 
  getAllTemplates,
} from '@/services/print/templateService';
import { DOC_TYPE_LABELS_AR, PAPER_LABELS_AR } from '@/types/invoicePrint';
import type { DocTypeKey } from '@/types/invoicePrint';
import { FileText, Printer, SlidersHorizontal, CheckCircle2, ChevronRight, Palette, Layers } from 'lucide-react';

export default function TemplateAssignmentManager() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const { data: assignments = [], isLoading: loadingAssign } = useQuery({
    queryKey: ['templateAssignments'],
    queryFn: getAllAssignments,
  });
  
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: getAllTemplates,
  });
  
  const assignMutation = useMutation({
    mutationFn: ({ docType, templateId }: { docType: DocTypeKey; templateId: string }) =>
      assignTemplateToDocType(docType, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templateAssignments'] });
    },
  });
  
  const allDocTypes: { key: DocTypeKey; desc: string }[] = [
    { key: 'thermal-receipt', desc: 'إيصالات نقاط البيع الحرارية السريعة' },
    { key: 'sale-invoice', desc: 'فاتورة المبيعات الرسمية للزبائن' },
    { key: 'proforma', desc: 'فاتورة شكلية أولية غير محاسبية' },
    { key: 'devis', desc: 'عرض أسعار تجاري تفصيلي للعميل' },
    { key: 'bl', desc: 'وصل تسليم البضائع وخروج المخزون' },
    { key: 'return-invoice', desc: 'إشعار إرجاع بضاعة ومردودات' },
    { key: 'purchase-invoice', desc: 'فاتورة استلام المشتريات من المورد' },
    { key: 'customer-statement', desc: 'كشف حساب الزبون وحركات الديون' },
    { key: 'supplier-statement', desc: 'كشف حساب المورد والمستحقات' },
  ];
  
  const assignmentMap = new Map(assignments.map(a => [a.docType, a.templateId]));
  
  if (loadingAssign || loadingTemplates) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant gap-3">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-body-sm">جارٍ تحميل تعيينات القوالب...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header and Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-primary/10 via-surface-container to-surface-container rounded-2xl border border-primary/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </span>
            <h3 className="font-cairo text-lg font-bold text-on-surface">تعيين القوالب الافتراضية للوثائق</h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            حدد لكل نوع مستند القالب المناسب (طابعة حرارية 80mm أو صفحات A4/A5) لطباعته تلقائياً عند إتمام العملية
          </p>
        </div>

        <button
          onClick={() => navigate('/settings/print-templates')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
        >
          <Palette className="w-4 h-4 text-primary" />
          <span>محرر ومصمم القوالب الكامل</span>
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
        </button>
      </div>
      
      {/* Grid of Doc Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {allDocTypes.map(({ key: docType, desc }) => {
          const currentTemplateId = assignmentMap.get(docType);
          const currentTemplate = templates.find(t => t.id === currentTemplateId);
          
          return (
            <div
              key={docType}
              className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                currentTemplate
                  ? 'bg-surface-container border-outline-variant/25 hover:border-primary/40 shadow-sm'
                  : 'bg-surface-container-low/60 border-dashed border-outline-variant/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    currentTemplate ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-on-surface">
                      {DOC_TYPE_LABELS_AR[docType] || docType}
                    </h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 line-clamp-1">{desc}</p>
                  </div>
                </div>

                {currentTemplate && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold shrink-0">
                    {PAPER_LABELS_AR[currentTemplate.paperSize] || currentTemplate.paperSize}
                  </span>
                )}
              </div>
              
              <div className="pt-2 border-t border-outline-variant/10 flex items-center gap-2">
                <select
                  value={currentTemplateId ?? ''}
                  onChange={(e) => assignMutation.mutate({ docType, templateId: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant/20 rounded-xl text-xs text-on-surface font-medium focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                >
                  <option value="">— اختيار قالب تلقائي / افتراضي —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({PAPER_LABELS_AR[t.paperSize] || t.paperSize})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}