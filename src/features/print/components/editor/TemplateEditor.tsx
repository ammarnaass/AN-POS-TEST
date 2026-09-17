import React from 'react';
import {
  Palette,
  Settings as SettingsIcon,
  Eye,
} from 'lucide-react';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import { PointerSensor, KeyboardSensor, PointerActivationConstraints } from '@dnd-kit/dom';
import type { Section } from '@/store/templateEditorStore';
import BlockPalette from '@/components/print/blocks/BlockPalette';
import BlockPropertiesPanel from '@/components/print/blocks/BlockPropertiesPanel';
import LivePreview from '@/components/print/blocks/LivePreview';
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { EditorSecondaryModal } from './EditorSecondaryModal';
import { useTemplateEditorState } from './useTemplateEditorState';

export interface TemplateEditorProps {
  templateId: string;
  userId: string;
  userName: string;
  onClose?: () => void;
}

const SECTION_LABELS: Record<Section, string> = {
  header: 'الرأس',
  body: 'المتن',
  footer: 'التذييل',
};

const SECTION_ICONS: Record<Section, string> = {
  header: '⬆',
  body: '☰',
  footer: '⬇',
};

export function TemplateEditor({ templateId, userId, userName, onClose }: TemplateEditorProps) {
  const {
    name,
    description,
    paperSize,
    orientation,
    supportedDocuments,
    layout,
    visibility,
    styles,
    activeSection,
    selectedBlockId,
    dirty,
    savedSnapshot,
    template,
    isLoading,
    isCustomizing,
    canUndo,
    canRedo,
    confirmRevert,
    secondaryTab,
    selectedBlock,
    overlayBlock,
    saveMutation,
    setActiveSection,
    selectBlock,
    removeBlock,
    updateBlock,
    updateMeta,
    updateStyles,
    updateVisibility,
    revert,
    undo,
    redo,
    setConfirmRevert,
    setSecondaryTab,
    handleSave,
    handleAddBlock,
    handleCustomizeSystemTemplate,
  } = useTemplateEditorState({ templateId, userId, userName });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-on-surface-variant">القالب غير موجود</p>
      </div>
    );
  }

  const isSystem = template.isSystem;

  return (
    <DragDropProvider
      sensors={[
        PointerSensor.configure({
          activationConstraints: [
            new PointerActivationConstraints.Distance({ value: 5 }),
          ],
        }),
        KeyboardSensor.configure(),
      ]}
    >
      <div className="h-full flex flex-col bg-surface-container-lowest" dir="rtl">
        {/* Header Toolbar */}
        <EditorToolbar
          templateName={name || template.name}
          templateDescription={description || template.description}
          isSystem={isSystem}
          dirty={dirty}
          saving={saveMutation.isPending}
          canUndo={canUndo}
          canRedo={canRedo}
          canRevert={dirty && !!savedSnapshot}
          isCustomizing={isCustomizing}
          onUndo={undo}
          onRedo={redo}
          onRequestRevert={() => setConfirmRevert(true)}
          onCustomize={handleCustomizeSystemTemplate}
          onSave={handleSave}
          onClose={onClose}
        />

        {/* Body: Split View — يسار: المحرر / أيمن: Live Preview */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_minmax(320px,40%)] overflow-hidden">
          {/* ====== Left: المحرر ====== */}
          <div className="relative flex flex-col overflow-hidden border-l border-outline-variant/20">
            {/* Section tabs */}
            <div className="flex gap-1 px-4 py-2 border-b border-outline-variant/20 bg-surface-container-low/50">
              {(['header', 'body', 'footer'] as Section[]).map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setActiveSection(sec)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-lg transition-all ${
                    activeSection === sec
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span>{SECTION_ICONS[sec]}</span>
                  {SECTION_LABELS[sec]}
                  <span className={activeSection === sec ? 'text-on-primary/70' : 'text-on-surface-variant/60'}>
                    ({layout[sec].length})
                  </span>
                </button>
              ))}
            </div>

            {/* Three-pane: Palette | Canvas | Properties */}
            <div className="flex-1 grid grid-cols-[200px_1fr_280px] overflow-hidden">
              {/* BlockPalette + أدوات ثانوية */}
              <div className="overflow-y-auto p-3 border-l border-outline-variant/20 bg-surface-container-low/30">
                <BlockPalette onAddBlock={handleAddBlock} disabled={isSystem} />
                <div className="mt-6 space-y-2 pt-4 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setSecondaryTab('visual')}
                    className="w-full text-right text-xs text-primary hover:bg-primary/10 rounded px-2 py-1.5 flex items-center gap-2"
                  >
                    <Palette className="w-3.5 h-3.5" /> المظهر
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecondaryTab('settings')}
                    className="w-full text-right text-xs text-primary hover:bg-primary/10 rounded px-2 py-1.5 flex items-center gap-2"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" /> الإعدادات
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecondaryTab('visibility')}
                    className="w-full text-right text-xs text-primary hover:bg-primary/10 rounded px-2 py-1.5 flex items-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5" /> حقول العرض
                  </button>
                </div>
              </div>

              {/* Editor Canvas */}
              <div className="overflow-y-auto p-4 bg-surface-container-lowest">
                <EditorCanvas
                  section={activeSection}
                  blocks={layout[activeSection]}
                  selectedBlockId={selectedBlockId}
                  isSystem={isSystem}
                  onSelect={(id) => selectBlock(id)}
                  onRemove={(id) => removeBlock(activeSection, id)}
                  onCustomize={handleCustomizeSystemTemplate}
                  isCustomizing={isCustomizing}
                />
              </div>

              {/* Properties */}
              <div className="overflow-y-auto p-2 border-r border-outline-variant/20 bg-surface-container-low/30">
                <BlockPropertiesPanel
                  section={activeSection}
                  block={selectedBlock}
                  onUpdate={(sec, id, updates) => updateBlock(sec, id, updates)}
                />
              </div>
            </div>

            {/* Secondary panels: settings / visual / visibility */}
            {secondaryTab && (
              <EditorSecondaryModal
                tab={secondaryTab}
                isSystem={isSystem}
                name={name}
                description={description}
                paperSize={paperSize}
                orientation={orientation}
                supportedDocuments={supportedDocuments}
                styles={styles}
                visibility={visibility}
                dirty={dirty}
                saving={saveMutation.isPending}
                onClose={() => setSecondaryTab(null)}
                onSave={handleSave}
                onMeta={(m) => updateMeta(m)}
                onStyles={(u) => updateStyles(u)}
                onVisibility={(u) => updateVisibility(u)}
              />
            )}
          </div>

          {/* ====== Right: Live Preview (B3) ====== */}
          <div className="overflow-hidden bg-surface-container-low/40 flex flex-col">
            <div className="flex-1 p-3 overflow-hidden">
              <LivePreview templateName={name || template.name} templateId={templateId} />
            </div>
          </div>
        </div>

        {/* keep userId/userName contract reference (used elsewhere in V2 history) */}
        <span className="hidden" data-user-id={userId} data-user-name={userName} />
      </div>

      <DragOverlay>
        {overlayBlock && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-high border border-primary/40 shadow-lg max-w-xs select-none">
            <overlayBlock.Icon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-on-surface truncate">{overlayBlock.label}</span>
          </div>
        )}
      </DragOverlay>

      {/* ====== Revert Confirmation Modal ====== */}
      {confirmRevert && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="تأكيد الرجوع لآخر حفظ"
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm shadow-xl mx-4">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
              الرجوع لآخر حفظ؟
            </h3>
            <p className="text-body-sm text-on-surface-variant mb-4 leading-relaxed">
              سيتم التخلي عن جميع التغييرات غير المحفوظة. لا يمكن استرجاعها.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRevert(false)}
                className="px-4 py-2 rounded-lg hover:bg-surface-container transition-all text-on-surface"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  revert();
                  setConfirmRevert(false);
                }}
                className="px-4 py-2 rounded-lg bg-error text-on-error hover:bg-error/90 transition-all"
              >
                نعم، رجوع
              </button>
            </div>
          </div>
        </div>
      )}
    </DragDropProvider>
  );
}

export default TemplateEditor;
