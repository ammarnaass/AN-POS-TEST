import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Barcode,
  Layers,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  FileText,
  Plus,
  ArrowLeftRight,
} from 'lucide-react';

interface InventoryHeaderProps {
  inventoryTab: 'products' | 'barcode-report' | 'movements';
  setInventoryTab: (tab: 'products' | 'barcode-report' | 'movements') => void;
  productsCount: number;
  isFetching: boolean;
  onRefetch: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onOpenPdfInvoice: () => void;
  onOpenCreateProduct: () => void;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  inventoryTab,
  setInventoryTab,
  productsCount,
  isFetching,
  onRefetch,
  onImport,
  onExport,
  onOpenPdfInvoice,
  onOpenCreateProduct,
}) => {
  const navigate = useNavigate();

  return (
    <section
      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      data-purpose="action-bar"
      dir="rtl"
    >
      {/* Action Quick Buttons */}
      <div className="flex flex-wrap items-center gap-2 order-2 lg:order-1">
        {/* Add Product Button (Primary CTA) */}
        <button
          onClick={onOpenCreateProduct}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition shadow-blue-500/20 active:scale-95 cursor-pointer"
          type="button"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>منتج جديد</span>
        </button>

        {/* Real-time Sync Button */}
        <button
          onClick={onRefetch}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          type="button"
          title="تحديث فوري لبيانات المخزون"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isFetching ? 'animate-spin' : ''}`} />
          <span>تحديث فوري</span>
        </button>

        {/* Excel Import Button */}
        <label className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95">
          <Upload className="w-3.5 h-3.5 text-indigo-500" />
          <span>استيراد Excel</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onImport} className="hidden" />
        </label>

        {/* Export CSV/Excel Button */}
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          type="button"
          title="تصدير جدول المنتجات (Excel / CSV)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>تصدير Excel / CSV</span>
        </button>

        {/* Supplier Invoice (PDF) */}
        <button
          onClick={onOpenPdfInvoice}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
          type="button"
          title="إدخال بضاعة المخزون من فاتورة مورد PDF"
        >
          <FileText className="w-3.5 h-3.5 text-sky-600" />
          <span>فاتورة مورد (PDF)</span>
        </button>
      </div>

      {/* Segmented Navigation Tabs */}
      <nav
        className="inline-flex p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs self-start lg:self-auto order-1 lg:order-2"
        data-purpose="inventory-tabs"
      >
        {/* Products List Tab */}
        <button
          onClick={() => setInventoryTab('products')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            inventoryTab === 'products'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>قائمة المنتجات</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-mono ${
              inventoryTab === 'products' ? 'bg-blue-800/80 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {productsCount}
          </span>
        </button>

        {/* Barcode Report Tab */}
        <button
          onClick={() => setInventoryTab('barcode-report')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl transition cursor-pointer ${
            inventoryTab === 'barcode-report'
              ? 'bg-blue-700 text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>تقرير الباركود</span>
        </button>

        {/* Stock Movements Journal Tab */}
        <button
          onClick={() => setInventoryTab('movements')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl transition cursor-pointer ${
            inventoryTab === 'movements'
              ? 'bg-blue-700 text-white font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>سجل الحركات</span>
        </button>

        {/* Wholesale & Bundles Tab */}
        <button
          onClick={() => navigate('/packs')}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
          title="الانتقال إلى إدارة عبوات الجملة والباقات"
        >
          <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>عبوات الجملة والباقات</span>
        </button>
      </nav>
    </section>
  );
};

export default InventoryHeader;
