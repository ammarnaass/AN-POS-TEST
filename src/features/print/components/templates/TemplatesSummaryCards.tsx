// TemplatesSummaryCards — POS-PRINT-001
import { FileText, Printer, FileCheck, Palette } from 'lucide-react';

export interface TemplatesSummaryCardsProps {
  stats: {
    total: number;
    thermal: number;
    standard: number;
    custom: number;
  };
}

export function TemplatesSummaryCards({ stats }: TemplatesSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-3.5 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-black font-cairo text-on-surface">{stats.total}</div>
          <div className="text-xs text-on-surface-variant font-medium">إجمالي القوالب</div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-3.5 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
          <Printer className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-black font-cairo text-on-surface">{stats.thermal}</div>
          <div className="text-xs text-on-surface-variant font-medium">إيصالات حرارية (80/58mm)</div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-3.5 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
          <FileCheck className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-black font-cairo text-on-surface">{stats.standard}</div>
          <div className="text-xs text-on-surface-variant font-medium">فواتير قياسية (A4/A5)</div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/15 flex items-center gap-3.5 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-black font-cairo text-on-surface">{stats.custom}</div>
          <div className="text-xs text-on-surface-variant font-medium">قوالب مخصصة للمتجر</div>
        </div>
      </div>
    </div>
  );
}
