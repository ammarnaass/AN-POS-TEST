// PrintTemplatesPage — POS-PRINT-001
// إدارة وتخصيص قوالب الطباعة للمستندات التجارية (هيكلية نظيفة ومعمارية قوية)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  FileText,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Download,
} from 'lucide-react';
import { TEMPLATE_PRESETS } from '@/services/print/templateService';
import { seedDefaultTemplates } from '@/services/print/defaultTemplates';
import { useNotificationStore } from '@/store/notificationStore';
import TemplateEditor from '@/components/print/TemplateEditor';
import TemplateAssignmentManager from '@/components/print/TemplateAssignmentManager';

import { usePrintTemplatesManager } from './hooks/usePrintTemplatesManager';
import { useTemplatePreview } from './hooks/useTemplatePreview';
import { TemplatesHeader } from './components/templates/TemplatesHeader';
import { PrintLogoHub } from './components/templates/PrintLogoHub';
import { MyTemplatesTab } from './components/templates/MyTemplatesTab';
import { PresetTemplatesTab } from './components/templates/PresetTemplatesTab';
import { CreateTemplateModal } from './components/templates/CreateTemplateModal';
import { DuplicateTemplateModal } from './components/templates/DuplicateTemplateModal';
import { InteractivePreviewModal } from './components/templates/InteractivePreviewModal';
import { type PrintTemplate } from '@/types/invoicePrint';

export default function PrintTemplatesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  // حالات التبويب ومحرر القوالب والنوافذ
  const [activeTopTab, setActiveTopTab] = useState<'my-templates' | 'presets' | 'assignments'>('my-templates');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<{ id: string; name: string } | null>(null);

  // خطاف إدارة القوالب والعمليات وهوية الشعار
  const manager = usePrintTemplatesManager();

  // خطاف المعاينة التفاعلية وحسابات التحجيم
  const preview = useTemplatePreview(manager.storeSettings);

  // ====== شاشة محرر القوالب المرئي الكامل ======
  if (editingTemplateId && manager.user) {
    return (
      <div className="p-6 max-w-7xl mx-auto" dir="rtl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/15">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditingTemplateId(null)}
              className="p-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-all flex items-center gap-2 font-bold"
            >
              <ArrowRight className="w-5 h-5" />
              <span>رجوع إلى قائمة القوالب</span>
            </button>
            <div className="h-6 w-px bg-outline-variant/30" />
            <div>
              <h1 className="text-xl font-bold font-cairo text-on-surface">محرر القوالب المرئي</h1>
              <p className="text-xs text-on-surface-variant">تخصيص الهيكل، الأنماط، الشعار، والـ QR Code لحظياً</p>
            </div>
          </div>
        </div>
        <TemplateEditor
          templateId={editingTemplateId}
          userId={manager.user.id}
          userName={manager.user.name}
          onClose={() => setEditingTemplateId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* الرأس الأساسي للوحة القوالب */}
      <TemplatesHeader
        canEdit={manager.canEdit}
        onCreateBlank={() => setIsCreateModalOpen(true)}
        onNavigateToSettings={() => navigate('/settings', { state: { tab: 'invoices' } })}
      />

      {/* قسم هوية وشعار المتجر للطباعة */}
      <PrintLogoHub
        storeSettings={manager.storeSettings}
        isLogoHubOpen={manager.isLogoHubOpen}
        setIsLogoHubOpen={manager.setIsLogoHubOpen}
        logoWidth={manager.logoWidth}
        logoHeight={manager.logoHeight}
        logoAlign={manager.logoAlign}
        onUpload={manager.handleLogoUpload}
        onRemove={manager.handleRemoveLogo}
        onSaveDimensions={manager.handleSaveLogoDimensions}
      />

      {/* شريط التبويبات الرئيسي المتقدم */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-2 rounded-2xl border border-outline-variant/20 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTopTab('my-templates')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTopTab === 'my-templates'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>قوالب المتجر النشطة</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTopTab === 'my-templates'
                  ? 'bg-on-primary/20 text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {manager.templates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTopTab('presets')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTopTab === 'presets'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>معرض النماذج الجاهزة</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-black ${
                activeTopTab === 'presets'
                  ? 'bg-on-primary/20 text-on-primary'
                  : 'bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {TEMPLATE_PRESETS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTopTab('assignments')}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTopTab === 'assignments'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>ربط القوالب بالوثائق</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTopTab === 'my-templates' && (
            <button
              type="button"
              onClick={async () => {
                await seedDefaultTemplates();
                await queryClient.invalidateQueries({ queryKey: ['printTemplates'] });
                await queryClient.invalidateQueries({ queryKey: ['templateAssignments'] });
                addNotification({
                  title: 'تم تحديث القوالب',
                  message: 'تمت مزامنة القوالب الافتراضية وفاتورة بيع بالجملة بنجاح',
                  type: 'success',
                });
              }}
              className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
              title="مزامنة وتثبيت القوالب الافتراضية النظامية"
            >
              <RefreshCw className="w-3.5 h-3.5 text-primary" />
              <span>مزامنة القوالب الافتراضية</span>
            </button>
          )}

          {activeTopTab === 'presets' && manager.canEdit && (
            <button
              type="button"
              onClick={() => {
                manager.importAllMutation.mutate(undefined, {
                  onSuccess: () => setActiveTopTab('my-templates'),
                });
              }}
              disabled={manager.importAllMutation.isPending}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{manager.importAllMutation.isPending ? 'جاري الاستيراد...' : 'استيراد كافة النماذج (10 قوالب)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* تبويب: ربط القوالب بالوثائق */}
      {activeTopTab === 'assignments' && (
        <div className="p-6 rounded-3xl bg-surface-container-low border border-outline-variant/20 shadow-md animate-in fade-in duration-200">
          <TemplateAssignmentManager />
        </div>
      )}

      {/* تبويب: معرض النماذج الجاهزة */}
      {activeTopTab === 'presets' && (
        <PresetTemplatesTab
          presetCategoryFilter={manager.presetCategoryFilter}
          setPresetCategoryFilter={manager.setPresetCategoryFilter}
          templates={manager.templates}
          canEdit={manager.canEdit}
          isCreating={manager.createFromPresetMutation.isPending}
          onCreateFromPreset={(presetId) => {
            manager.createFromPresetMutation.mutate(presetId, {
              onSuccess: (tpl) => {
                if (tpl) setEditingTemplateId(tpl.id);
              },
            });
          }}
          onPreview={(tpl) => preview.openPreview(tpl)}
        />
      )}

      {/* تبويب: قوالب المتجر النشطة */}
      {activeTopTab === 'my-templates' && (
        <MyTemplatesTab
          stats={manager.stats}
          searchQuery={manager.searchQuery}
          setSearchQuery={manager.setSearchQuery}
          selectedPaperFilter={manager.selectedPaperFilter}
          setSelectedPaperFilter={manager.setSelectedPaperFilter}
          viewMode={manager.viewMode}
          setViewMode={manager.setViewMode}
          isLoading={manager.isLoading}
          filteredTemplates={manager.filteredTemplates}
          canEdit={manager.canEdit}
          canDelete={manager.canDelete}
          canSetDefault={manager.canSetDefault}
          onPreview={(tpl) => preview.openPreview(tpl)}
          onEdit={(id) => setEditingTemplateId(id)}
          onSetDefault={(id) => manager.setDefaultMutation.mutate(id)}
          onDuplicate={(target) => setDuplicateTarget(target)}
          onDelete={(tpl: PrintTemplate) => {
            if (confirm(`هل أنت متأكد من حذف قالب "${tpl.name}"؟`)) {
              manager.deleteMutation.mutate(tpl.id);
            }
          }}
          onGoToPresets={() => setActiveTopTab('presets')}
        />
      )}

      {/* نافذة إنشاء قالب جديد */}
      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        isSubmitting={manager.createMutation.isPending}
        onSubmit={(input) => {
          manager.createMutation.mutate(input, {
            onSuccess: (created) => {
              setIsCreateModalOpen(false);
              setEditingTemplateId(created.id);
            },
          });
        }}
      />

      {/* نافذة المعاينة التفاعلية المتقدمة */}
      <InteractivePreviewModal
        template={preview.previewTemplate}
        canEdit={manager.canEdit}
        onClose={preview.closePreview}
        onEdit={(id) => setEditingTemplateId(id)}
        previewDocType={preview.previewDocType}
        setPreviewDocType={preview.setPreviewDocType}
        previewLang={preview.previewLang}
        setPreviewLang={preview.setPreviewLang}
        previewZoom={preview.previewZoom}
        setPreviewZoom={preview.setPreviewZoom}
        previewFitMode={preview.previewFitMode}
        setPreviewFitMode={preview.setPreviewFitMode}
        previewFullscreen={preview.previewFullscreen}
        setPreviewFullscreen={preview.setPreviewFullscreen}
        previewContainerRef={preview.previewContainerRef}
        effectiveZoom={preview.effectiveZoom}
        sheetDimensions={preview.sheetDimensions}
        isLandscape={preview.isLandscape}
        previewHtml={preview.previewHtml}
        onPrint={preview.handlePrint}
        onOpenStandalone={preview.handleOpenStandalone}
      />

      {/* نافذة نسخ القالب */}
      <DuplicateTemplateModal
        isOpen={duplicateTarget !== null}
        templateName={duplicateTarget?.name || ''}
        onClose={() => setDuplicateTarget(null)}
        isSubmitting={manager.duplicateMutation.isPending}
        onConfirm={(newName) => {
          if (duplicateTarget) {
            manager.duplicateMutation.mutate(
              { id: duplicateTarget.id, newName },
              {
                onSuccess: () => setDuplicateTarget(null),
              },
            );
          }
        }}
      />
    </div>
  );
}
