import React, { useState } from 'react';
import type { Product, Category } from '@/types';
import {
  exportProductsToFile,
  type ProductExportFormat,
  type ProductExportTemplate,
} from '@/services/products/productExportService';
import { useNotificationStore } from '@/store/notificationStore';
import {
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Table,
  SlidersHorizontal,
  Layers,
  Info,
} from 'lucide-react';

interface ProductExportModalProps {
  open: boolean;
  onClose: () => void;
  allProducts: Product[];
  filteredProducts: Product[];
  categories: Category[];
}

export default function ProductExportModal({
  open,
  onClose,
  allProducts,
  filteredProducts,
  categories,
}: ProductExportModalProps) {
  const { addNotification } = useNotificationStore();

  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');
  const [exportTemplate, setExportTemplate] =
    useState<ProductExportTemplate>('inventory_audit');
  const [exportFormat, setExportFormat] = useState<ProductExportFormat>('xlsx');
  const [includeSummaryRow, setIncludeSummaryRow] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  if (!open) return null;

  const targetProducts =
    exportScope === 'filtered' ? filteredProducts : allProducts;

  const handleExport = async () => {
    if (!targetProducts || targetProducts.length === 0) {
      addNotification({
        title: 'لا توجد بيانات',
        message: 'لا توجد منتجات مطابقة للنطاق المحدد لتصديرها.',
        type: 'warning',
      });
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportProductsToFile(targetProducts, {
        format: exportFormat,
        template: exportTemplate,
        includeSummaryRow,
        categories,
      });

      addNotification({
        title: 'تم التصدير بنجاح',
        message: `تم تصدير ${result.count} منتج إلى ملف ${
          exportFormat === 'xlsx' ? 'Microsoft Excel (.xlsx)' : 'CSV (.csv)'
        } بنجاح.`,
        type: 'success',
      });

      onClose();
    } catch (err: any) {
      console.error('Export error:', err);
      addNotification({
        title: 'فشل التصدير',
        message: err?.message || 'حدث خطأ أثناء تصدير ملف المنتجات',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-surface border border-outline-variant/30 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-right font-cairo"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20 bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-on-surface">
                تصدير جدول المنتجات (Excel / CSV)
              </h2>
              <p className="text-xs text-on-surface-variant">
                جدول بيانات متوافق مع Microsoft Excel وبرامج الجرد
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* 1. نطاق البيانات */}
          <div>
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 mb-2.5">
              <Layers className="w-4 h-4 text-primary" />
              <span>نطاق المنتجات المراد تصديرها</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative ${
                  exportScope === 'all'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-outline-variant/30 bg-surface-container/50 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-on-surface">جميع المنتجات</span>
                  {exportScope === 'all' && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  كامل المخزون المسجل ({allProducts.length} منتج)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative ${
                  exportScope === 'filtered'
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : 'border-outline-variant/30 bg-surface-container/50 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-on-surface">المنتجات المفلترة</span>
                  {exportScope === 'filtered' && (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  حسب البحث والتصنيف الحالي ({filteredProducts.length} منتج)
                </p>
              </button>
            </div>
          </div>

          {/* 2. نمط الأعمدة والحقول */}
          <div>
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 mb-2.5">
              <Table className="w-4 h-4 text-emerald-500" />
              <span>أعمدة وحقول الجدول</span>
            </label>
            <div className="space-y-3">
              {/* قالب مراجعة الجرد والأسعار (الأساسي) */}
              <button
                type="button"
                onClick={() => setExportTemplate('inventory_audit')}
                className={`w-full p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                  exportTemplate === 'inventory_audit'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-outline-variant/30 bg-surface-container/50 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface">
                      نموذج مراجعة الأسعار والجرد
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      7 حقول أساسية
                    </span>
                  </div>
                  {exportTemplate === 'inventory_audit' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  يحتوي على: <strong className="text-on-surface">الاسم، الباركود، التصنيف، سعر التكلفة، سعر الجملة، سعر التجزئة، والكمية.</strong>
                </p>
              </button>

              {/* القالب الشامل لكافة بيانات المنتجات */}
              <button
                type="button"
                onClick={() => setExportTemplate('comprehensive')}
                className={`w-full p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                  exportTemplate === 'comprehensive'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-outline-variant/30 bg-surface-container/50 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface">
                      النموذج الشامل لكافة بيانات المنتجات
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                      20 حقلاً شاملاً
                    </span>
                  </div>
                  {exportTemplate === 'comprehensive' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  يشمل جميع البيانات: كود الصنف SKU، الوحدة، هوامش الربح، القيم الإجمالية للتكلفة والبيع، حدود التنبيه، تاريخ الصلاحية، رقم الدفعة، موقع الرف، والحالة.
                </p>
              </button>
            </div>
          </div>

          {/* 3. صيغة التصدير */}
          <div>
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5 mb-2.5">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>صيغة الملف الناتجة</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  exportFormat === 'xlsx'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-outline-variant/30 bg-surface-container/50 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-on-surface">
                    Microsoft Excel (.xlsx)
                  </span>
                  {exportFormat === 'xlsx' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  تنسيق منظم، اتجاه RTL لليمين، وحماية أرقام الباركود
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  exportFormat === 'csv'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-outline-variant/30 bg-surface-container/50 hover:bg-surface-container'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-on-surface">جدول بيانات (.csv)</span>
                  {exportFormat === 'csv' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant">
                  متوافق مع برامج الجرد وقواعد البيانات (ترميز UTF-8)
                </p>
              </button>
            </div>
          </div>

          {/* 4. خيارات إضافية: صف الإجماليات */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-container-high/30 border border-outline-variant/20">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs font-bold text-on-surface">
                  إضافة صف الإجماليات في نهاية الجدول
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  حساب مجموع الكميات وإجمالي القيم المالية تلقائياً
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeSummaryRow}
              onChange={(e) => setIncludeSummaryRow(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-outline-variant/40 cursor-pointer"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 bg-surface-container-high/20">
          <div className="text-xs text-on-surface-variant">
            سيتم تصدير:{' '}
            <strong className="text-on-surface font-bold">
              {targetProducts.length} منتج
            </strong>{' '}
            بصيغة{' '}
            <span className="font-mono text-emerald-600 font-bold uppercase">
              .{exportFormat}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-outline-variant/30 rounded-xl text-on-surface-variant hover:bg-surface-container text-xs font-semibold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || targetProducts.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري تجهيز الملف...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تصدير وتحميل الملف</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
