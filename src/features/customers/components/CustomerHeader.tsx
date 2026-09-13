import React from 'react';
import { Wallet, Printer, Download, Upload, Plus } from 'lucide-react';

interface CustomerHeaderProps {
  onPrintDebtsReport: () => void;
  onExportExcel: () => void;
  onImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenAddModal: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  onPrintDebtsReport,
  onExportExcel,
  onImportExcel,
  onOpenAddModal,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low/95 p-5 rounded-2xl border border-outline-variant/20 shadow-2xs">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-on-surface font-cairo">دفتر حسابات الزبائن والديون</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              متابعة دقيقة لأرصدة العملاء، سقف الائتمان، التسديدات النقدية وكشوف الحساب
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
        {/* Print Debts Report */}
        <button
          onClick={onPrintDebtsReport}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="طباعة تقرير إجمالي الديون"
        >
          <Printer className="w-4 h-4 text-primary" />
          <span>تقرير الديون</span>
        </button>

        {/* Export Excel */}
        <button
          onClick={onExportExcel}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="تصدير إلى إكسل"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>تصدير Excel</span>
        </button>

        {/* Import Excel */}
        <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer">
          <Upload className="w-4 h-4 text-amber-600" />
          <span>استيراد</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onImportExcel} className="hidden" />
        </label>

        {/* Add New Customer */}
        <button
          onClick={onOpenAddModal}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>زبون جديد</span>
        </button>
      </div>
    </div>
  );
};
