// CreateTemplateModal — POS-PRINT-001
import { useState } from 'react';
import { Plus, X, Printer, CheckCircle2 } from 'lucide-react';
import { PAPER_LABELS_AR, type PaperSize } from '@/types/invoicePrint';

export interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSubmitting: boolean;
  onSubmit: (input: {
    name: string;
    description: string;
    paperSize: PaperSize;
    theme: 'cyan' | 'blue' | 'emerald' | 'crimson' | 'amber' | 'slate';
  }) => void;
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  isSubmitting,
  onSubmit,
}: CreateTemplateModalProps) {
  const [newTplName, setNewTplName] = useState('');
  const [newTplDescription, setNewTplDescription] = useState('');
  const [newTplPaperSize, setNewTplPaperSize] = useState<PaperSize>('80mm');
  const [newTplTheme, setNewTplTheme] = useState<'cyan' | 'blue' | 'emerald' | 'crimson' | 'amber' | 'slate'>('cyan');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: newTplName,
      description: newTplDescription,
      paperSize: newTplPaperSize,
      theme: newTplTheme,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-surface-container-low w-full max-w-lg rounded-3xl p-6 border border-outline-variant/20 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-cairo text-on-surface">إنشاء قالب طباعة جديد</h3>
              <p className="text-xs text-on-surface-variant">اختر مقاس الورق والثيم الأولي لبدء التخصيص</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-highest transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">اسم القالب</label>
            <input
              type="text"
              placeholder="مثال: إيصال نقطة البيع السريع (80mm)"
              value={newTplName}
              onChange={(e) => setNewTplName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">الوصف (اختياري)</label>
            <input
              type="text"
              placeholder="مثال: مخصص لطابعات الاستقبال مع باركود وQR ضريبي"
              value={newTplDescription}
              onChange={(e) => setNewTplDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* اختيار مقاس الورق */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">مقاس الورق</label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['80mm', '58mm', 'A4', 'A5'] as PaperSize[]).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setNewTplPaperSize(sz)}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    newTplPaperSize === sz
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                      : 'bg-surface-container border-outline-variant/20 text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <Printer className="w-4 h-4 opacity-70" />
                  <span className="text-xs">{PAPER_LABELS_AR[sz]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* اختيار الثيم اللوني */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">الثيم اللوني الأولي</label>
            <div className="flex items-center gap-3">
              {[
                { id: 'cyan', label: 'سماوي', bg: '#0891b2' },
                { id: 'blue', label: 'أزرق', bg: '#2563eb' },
                { id: 'emerald', label: 'زمردي', bg: '#059669' },
                { id: 'crimson', label: 'عنابي', bg: '#dc2626' },
                { id: 'amber', label: 'ذهبي', bg: '#d97706' },
                { id: 'slate', label: 'رمادي', bg: '#334155' },
              ].map((thm) => (
                <button
                  key={thm.id}
                  type="button"
                  onClick={() => setNewTplTheme(thm.id as any)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    newTplTheme === thm.id ? 'ring-3 ring-primary ring-offset-2 ring-offset-surface scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: thm.bg }}
                  title={thm.label}
                >
                  {newTplTheme === thm.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-sm font-semibold transition-all"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-sm font-bold shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء والانتقال للمحرر'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
