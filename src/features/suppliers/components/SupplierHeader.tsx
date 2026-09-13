import React from 'react';
import { Truck, Printer, Download, FileText, Plus } from 'lucide-react';

interface SupplierHeaderProps {
  onPrintPayablesReport: () => void;
  onExportExcel: () => void;
  onImportPdfInvoice: () => void;
  onAddSupplier: () => void;
}

export const SupplierHeader: React.FC<SupplierHeaderProps> = ({
  onPrintPayablesReport,
  onExportExcel,
  onImportPdfInvoice,
  onAddSupplier,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low/95 p-5 rounded-2xl border border-outline-variant/20 shadow-2xs">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-on-surface font-cairo">دليل الموردين وطلبيات التوريد</h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              إدارة شاملة لحسابات الموردين، فواتير الشراء، الأرصدة المستحقة، وتوريدات المخزون
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
        {/* Print Payables */}
        <button
          onClick={onPrintPayablesReport}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="طباعة تقرير مستحقات الموردين"
        >
          <Printer className="w-4 h-4 text-primary" />
          <span>طباعة المستحقات</span>
        </button>

        {/* Export Excel */}
        <button
          onClick={onExportExcel}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
          title="تصدير الموردين إلى Excel"
        >
          <Download className="w-4 h-4 text-emerald-600" />
          <span>تصدير Excel</span>
        </button>

        {/* Import Supplier Invoice PDF */}
        <button
          onClick={onImportPdfInvoice}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary hover:opacity-95 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
          title="إدخال بضاعة المخزون من فاتورة مورد PDF"
        >
          <FileText className="w-4 h-4" />
          <span>استيراد فاتورة توريد (PDF)</span>
        </button>

        {/* Add Supplier Button */}
        <button
          onClick={onAddSupplier}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>مورد جديد</span>
        </button>
      </div>
    </div>
  );
};
