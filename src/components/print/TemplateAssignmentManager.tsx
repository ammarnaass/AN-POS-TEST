// TemplateAssignmentManager — POS-PRINT-001
// إدارة تعيينات القوالب لأنواع الوثائق
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllAssignments, 
  assignTemplateToDocType, 
  getAllTemplates,
} from '@/services/print/templateService';
import { DOC_TYPE_LABELS_AR, PAPER_LABELS_AR } from '@/types/invoicePrint';
import type { DocTypeKey, PrintTemplate } from '@/types/invoicePrint';

export default function TemplateAssignmentManager() {
  const queryClient = useQueryClient();
  
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
  
  const allDocTypes: DocTypeKey[] = [
    'thermal-receipt', 'sale-invoice', 'proforma', 'devis', 'bl',
    'return-invoice', 'purchase-invoice', 'customer-statement', 'supplier-statement',
  ];
  
  const assignmentMap = new Map(assignments.map(a => [a.docType, a.templateId]));
  
  if (loadingAssign || loadingTemplates) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="font-headline-md text-headline-md text-on-surface">تعيين القوالب لأنواع الوثائق</h3>
      <p className="text-body-sm text-on-surface-variant">اختر القالب الافتراضي لكل نوع من أنواع الوثائق</p>
      
      <div className="space-y-2">
        {allDocTypes.map((docType) => {
          const currentTemplateId = assignmentMap.get(docType);
          const currentTemplate = templates.find(t => t.id === currentTemplateId);
          
          return (
            <div key={docType} className="flex items-center justify-between p-4 bg-surface-container/40 rounded-xl border border-outline-variant/20">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <div>
                  <p className="text-on-surface font-medium">{DOC_TYPE_LABELS_AR[docType]}</p>
                  {currentTemplate && (
                    <p className="text-on-surface-variant text-body-sm">
                      {currentTemplate.name} · {PAPER_LABELS_AR[currentTemplate.paperSize]}
                    </p>
                  )}
                </div>
              </div>
              
              <select
                value={currentTemplateId ?? ''}
                onChange={(e) => assignMutation.mutate({ docType, templateId: e.target.value })}
                className="px-3 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest text-sm min-w-[180px]"
              >
                <option value="">— لا يوجد قالب —</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({PAPER_LABELS_AR[t.paperSize]})
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}