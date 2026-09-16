// TemplatesHeader — POS-PRINT-001
import { Printer, ArrowRight, Plus } from 'lucide-react';

export interface TemplatesHeaderProps {
  canEdit: boolean;
  onCreateBlank: () => void;
  onNavigateToSettings: () => void;
}

export function TemplatesHeader({
  canEdit,
  onCreateBlank,
  onNavigateToSettings,
}: TemplatesHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-surface-container-low via-surface-container to-surface-container-high p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
      <div>
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-cairo text-on-surface tracking-tight">إدارة وتخصيص قوالب الطباعة</h1>
            <p className="text-xs text-on-surface-variant">معرض القوالب الجاهزة، التخصيص المرئي، والربط بالوثائق التجارية · POS-PRINT-001</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={onNavigateToSettings}
          className="px-4 py-2.5 rounded-xl bg-surface-container-highest/80 hover:bg-surface-container-highest text-on-surface transition-all flex items-center gap-2 text-sm font-semibold border border-outline-variant/20 shadow-sm"
        >
          <ArrowRight className="w-4 h-4" />
          <span>إعدادات الفواتير</span>
        </button>

        {canEdit && (
          <button
            onClick={onCreateBlank}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>إنشاء قالب فارغ</span>
          </button>
        )}
      </div>
    </header>
  );
}
