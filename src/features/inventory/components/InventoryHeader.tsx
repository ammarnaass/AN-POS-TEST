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
} from 'lucide-react';

interface InventoryHeaderProps {
  inventoryTab: 'products' | 'barcode-report';
  setInventoryTab: (tab: 'products' | 'barcode-report') => void;
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/15" dir="rtl">
      {/* Top Bar Tabs Switcher */}
      <div className="flex items-center gap-2 p-1 bg-surface-container rounded-2xl border border-outline-variant/20 w-fit">
        <button
          onClick={() => setInventoryTab('products')}
          className={`px-5 py-2.5 rounded-xl font-medium text-body-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            inventoryTab === 'products'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>قائمة المنتجات</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              inventoryTab === 'products'
                ? 'bg-white/20 text-white'
                : 'bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            {productsCount}
          </span>
        </button>

        <button
          onClick={() => setInventoryTab('barcode-report')}
          className={`px-5 py-2.5 rounded-xl font-medium text-body-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
            inventoryTab === 'barcode-report'
              ? 'bg-primary text-on-primary shadow-md shadow-primary/20 scale-[1.02]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>تقرير الباركود</span>
        </button>

        <button
          onClick={() => navigate('/packs')}
          className="px-5 py-2.5 rounded-xl font-medium text-body-sm transition-all duration-200 flex items-center gap-2 cursor-pointer text-on-surface-variant hover:text-primary hover:bg-surface-container-high border border-transparent hover:border-primary/20"
          title="الانتقال إلى إدارة عبوات الجملة والباقات"
        >
          <Layers className="w-4 h-4 text-primary" />
          <span>عبوات الجملة والباقات</span>
        </button>
      </div>

      {/* Global Action Buttons */}
      {inventoryTab === 'products' && (
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onRefetch}
            className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-3.5 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface hover:border-outline-variant/40 transition-all text-body-sm font-medium active:scale-95 shadow-sm cursor-pointer"
            title="تحديث فوري لبيانات المخزون"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث فوري</span>
          </button>

          <label className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:border-outline-variant/40 transition-all cursor-pointer text-body-sm font-medium active:scale-95 shadow-sm">
            <Upload className="w-4 h-4 text-primary" />
            <span>استيراد Excel</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={onImport} className="hidden" />
          </label>

          <button
            onClick={onExport}
            className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:border-outline-variant/40 transition-all text-body-sm font-medium active:scale-95 shadow-sm cursor-pointer"
            title="تصدير جدول المنتجات (Excel / CSV)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>تصدير Excel / CSV</span>
          </button>

          <button
            onClick={onOpenPdfInvoice}
            className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-3.5 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:border-outline-variant/40 transition-all text-body-sm font-medium active:scale-95 shadow-sm cursor-pointer"
            title="إدخال بضاعة المخزون من فاتورة مورد PDF"
          >
            <FileText className="w-4 h-4 text-primary" />
            <span>فاتورة مورد (PDF)</span>
          </button>

          <button
            onClick={onOpenCreateProduct}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-5 py-2.5 rounded-xl shadow-md hover:shadow-primary/30 hover:opacity-95 transition-all active:scale-95 text-body-sm font-bold cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>منتج جديد</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryHeader;
