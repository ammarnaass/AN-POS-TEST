// DuplicateTemplateModal — POS-PRINT-001
import { useState, useEffect } from 'react';

export interface DuplicateTemplateModalProps {
  isOpen: boolean;
  templateName: string;
  onClose: () => void;
  isSubmitting: boolean;
  onConfirm: (newName: string) => void;
}

export function DuplicateTemplateModal({
  isOpen,
  templateName,
  onClose,
  isSubmitting,
  onConfirm,
}: DuplicateTemplateModalProps) {
  const [duplicateName, setDuplicateName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDuplicateName(`${templateName} (نسخة)`);
    }
  }, [isOpen, templateName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-surface-container-low w-full max-w-sm rounded-3xl p-6 border border-outline-variant/20 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold font-cairo text-on-surface">نسخ القالب</h3>
        <p className="text-xs text-on-surface-variant">أدخل اسماً للنسخة الجديدة من القالب:</p>
        <input
          type="text"
          value={duplicateName}
          onChange={(e) => setDuplicateName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold hover:bg-surface-container-highest transition-all"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onConfirm(duplicateName)}
            disabled={isSubmitting || !duplicateName.trim()}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all"
          >
            {isSubmitting ? 'جاري النسخ...' : 'نسخ'}
          </button>
        </div>
      </div>
    </div>
  );
}
