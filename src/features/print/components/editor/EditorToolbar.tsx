import React from 'react';
import {
  PanelsTopLeft,
  Undo2,
  Redo2,
  RotateCcw,
  Sparkles,
  Save,
} from 'lucide-react';

export interface EditorToolbarProps {
  templateName: string;
  templateDescription?: string;
  isSystem: boolean;
  dirty: boolean;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canRevert: boolean;
  isCustomizing: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRequestRevert: () => void;
  onCustomize: () => void;
  onSave: () => void;
  onClose?: () => void;
}

export function EditorToolbar({
  templateName,
  templateDescription,
  isSystem,
  dirty,
  saving,
  canUndo,
  canRedo,
  canRevert,
  isCustomizing,
  onUndo,
  onRedo,
  onRequestRevert,
  onCustomize,
  onSave,
  onClose,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-outline-variant/20 bg-surface-container-lowest">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-fixed/30 flex items-center justify-center">
          <PanelsTopLeft className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2">
            {isSystem && <span className="text-xs text-on-surface-variant">(نظام)</span>}
            {templateName}
          </h2>
          {templateDescription && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {templateDescription}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {dirty && (
          <span className="text-xs text-amber-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            تغييرات غير محفوظة
          </span>
        )}

        {!isSystem && (
          <div className="flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="تراجع (Ctrl+Z)"
              aria-label="تراجع"
              className="w-9 h-9 rounded-lg hover:bg-surface-container transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="إعادة (Ctrl+Shift+Z)"
              aria-label="إعادة"
              className="w-9 h-9 rounded-lg hover:bg-surface-container transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-outline-variant/30 mx-1" />
            <button
              type="button"
              onClick={onRequestRevert}
              disabled={!canRevert}
              title="الرجوع لآخر حفظ"
              aria-label="الرجوع لآخر حفظ"
              className="w-9 h-9 rounded-lg hover:bg-surface-container transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed text-on-surface-variant"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {isSystem && (
          <button
            type="button"
            onClick={onCustomize}
            disabled={isCustomizing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl shadow-sm text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            title="إنشاء نسخة مخصصة والبدء بالتعديل"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isCustomizing ? 'جاري تجهيز النسخة...' : 'تخصيص القالب للتعديل'}</span>
          </button>
        )}

        <button
          onClick={onSave}
          disabled={saving || !dirty || isSystem}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl shadow-sm hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-surface-container transition-all flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
            aria-label="إغلاق"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default EditorToolbar;
