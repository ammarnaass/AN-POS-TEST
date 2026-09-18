import React, { useState } from 'react';
import type { Product, Category } from '@/types';
import type { ProductImportSummary } from '@/services/products/productImportService';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  RefreshCw,
  PlusCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface ProductImportModalProps {
  open: boolean;
  onClose: () => void;
  summary: ProductImportSummary | null;
  onConfirm: (mode: 'upsert' | 'skip_duplicates') => Promise<void>;
  isImporting: boolean;
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  open,
  onClose,
  summary,
  onConfirm,
  isImporting,
}) => {
  const [importMode, setImportMode] = useState<'upsert' | 'skip_duplicates'>('upsert');
  const [showAllRows, setShowAllRows] = useState(false);

  if (!open || !summary) return null;

  const {
    filename,
    validProducts,
    skippedRows,
    newCategories,
    existingMatchCount,
    newProductsCount,
  } = summary;

  const displayRows = showAllRows ? validProducts : validProducts.slice(0, 6);

  const handleConfirm = async () => {
    await onConfirm(importMode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 id="import-modal-title" className="text-base font-bold text-slate-800 dark:text-slate-100">
                معاينة وتأكيد استيراد المنتجات من ملف Excel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                الملف: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{filename}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50 cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block mb-1">المنتجات الصالحة</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900 dark:text-slate-50">{validProducts.length}</span>
                <span className="text-[11px] text-slate-400">صنفاً</span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <span className="text-emerald-600 dark:text-emerald-400 block mb-1">أصناف جديدة كلياً</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{newProductsCount}</span>
                <span className="text-[11px] text-emerald-600/70">جديد</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-500/5 dark:bg-blue-500/10 rounded-xl border border-blue-500/20">
              <span className="text-blue-600 dark:text-blue-400 block mb-1">مطابقة لمنتجات سابقة</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{existingMatchCount}</span>
                <span className="text-[11px] text-blue-600/70">مسجل</span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/20">
              <span className="text-amber-600 dark:text-amber-400 block mb-1">تصنيفات جديدة للتثبيت</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-amber-700 dark:text-amber-300">{newCategories.length}</span>
                <span className="text-[11px] text-amber-600/70">تصنيف</span>
              </div>
            </div>
          </div>

          {/* New Categories Notice if any */}
          {newCategories.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-amber-800 dark:text-amber-300 text-xs">
              <FolderPlus className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                سيقوم النظام تلقائياً بإنشاء وربط التصنيفات الجديدة التالية:{' '}
                <strong className="font-semibold">{newCategories.join('، ')}</strong>
              </span>
            </div>
          )}

          {/* Skipped Rows Banner */}
          {skippedRows > 0 && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>
                تم تلقائياً تصفية واستبعاد {skippedRows} صفوف فارغة أو صفوف إجماليات ختامية لحماية قاعدة البيانات من الأصناف الوهمية.
              </span>
            </div>
          )}

          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-800 dark:text-slate-200 text-xs block">
              طريقة معالجة المنتجات المطابقة في الباركود:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  importMode === 'upsert'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500/50 text-slate-900 dark:text-slate-100'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="upsert"
                  checked={importMode === 'upsert'}
                  onChange={() => setImportMode('upsert')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>تحديث المنتجات الحالية وإضافة الجديدة</span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">
                      موصى به
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    تحديث أسعار ورصيد السلع المسجلة مسبقاً بالباركود، وإدراج السلع الجديدة بالكامل.
                  </p>
                </div>
              </label>

              <label
                className={`relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  importMode === 'skip_duplicates'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500/50 text-slate-900 dark:text-slate-100'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="skip_duplicates"
                  checked={importMode === 'skip_duplicates'}
                  onChange={() => setImportMode('skip_duplicates')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold">إضافة المنتجات الجديدة فقط</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    تجاهل وتخطي أي صنف مسجل مسبقاً في المخزون لمنع تعديل أسعاره الحالية.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Extracted Data Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                معاينة عينة من المنتجات المكتشفة ({validProducts.length} صنفاً):
              </span>
              {validProducts.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllRows(!showAllRows)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {showAllRows ? 'عرض عينة مختصرة (6)' : `عرض كافة السجلات (${validProducts.length})`}
                </button>
              )}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">اسم المنتج</th>
                    <th className="py-2.5 px-3">الباركود</th>
                    <th className="py-2.5 px-3">كود الصنف</th>
                    <th className="py-2.5 px-3">التصنيف</th>
                    <th className="py-2.5 px-3">الوحدة</th>
                    <th className="py-2.5 px-3">التكلفة</th>
                    <th className="py-2.5 px-3">الجملة</th>
                    <th className="py-2.5 px-3">التجزئة</th>
                    <th className="py-2.5 px-3">الكمية</th>
                    <th className="py-2.5 px-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {displayRows.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {p.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {p.barcode || '—'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{p.sku || '—'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{p.unit}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {p.costPrice.toFixed(2)} دج
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {p.wholesalePrice.toFixed(2)} دج
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {p.retailPrice.toFixed(2)} دج
                      </td>
                      <td className="py-2 px-3 font-mono font-bold whitespace-nowrap">{p.quantity}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {p.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            سيتم استيراد <strong className="text-slate-800 dark:text-slate-100 font-bold">{validProducts.length}</strong> صنفاً إلى المخزون.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isImporting || validProducts.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الاستيراد والتحديث...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأكيد واستيراد الآن ({validProducts.length} منتج)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductImportModal;
