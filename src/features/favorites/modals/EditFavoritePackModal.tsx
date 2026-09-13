import React from 'react';
import {
  Edit2,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import type { Product } from '@/types';
import type { FavoriteCategory, FavoriteItem } from '../types';
import { formatMoney } from '@/features/pos/utils/format';

export interface EditFavoritePackModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: FavoriteItem | null;
  categories: FavoriteCategory[];
  name: string;
  setName: (name: string) => void;
  price: string;
  setPrice: (price: string) => void;
  piecesCount: number;
  setPiecesCount: React.Dispatch<React.SetStateAction<number>>;
  unitName: string;
  setUnitName: (unit: string) => void;
  barcode: string;
  setBarcode: (barcode: string) => void;
  targetCatId: string;
  setTargetCatId: (id: string) => void;
  isSaving: boolean;
  error: string;
  parentProduct: Product | null;
  onSave: (e: React.FormEvent) => void;
}

export const EditFavoritePackModal: React.FC<EditFavoritePackModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  categories,
  name,
  setName,
  price,
  setPrice,
  piecesCount,
  setPiecesCount,
  unitName,
  setUnitName,
  barcode,
  setBarcode,
  targetCatId,
  setTargetCatId,
  isSaving,
  error,
  parentProduct,
  onSave,
}) => {
  if (!isOpen || !editingItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl w-full max-w-xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-xs">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-cairo text-on-surface dark:text-white flex items-center gap-2">
                <span>تعديل بيانات وسعر العبوة</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-sans">
                  المفضلة
                </span>
              </h3>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                تعديل الاسم أو سعة القطع أو سعر البيع أو التصنيف المفضل التابع له
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSave} className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
          {/* بطاقة معلومات الصنف الأساسي إن وجد */}
          {parentProduct && (
            <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-2xl flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-blue-900 dark:text-blue-200 truncate">
                  المنتج الأساسي: {parentProduct.name}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  <span>
                    سعر الحبة تجزئة:{' '}
                    <strong className="text-blue-700 dark:text-blue-300">
                      {formatMoney(parentProduct.retailPrice || (parentProduct as any).price || 0)} د.ج
                    </strong>
                  </span>
                  <span>
                    المخزون المتاح:{' '}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {parentProduct.quantity ?? 0} قطعة
                    </strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const basePrice = Number(
                    parentProduct.retailPrice || (parentProduct as any).price || 0
                  );
                  const calculated = basePrice * Math.max(1, piecesCount);
                  setPrice(String(calculated));
                }}
                className="text-[11px] font-bold text-blue-700 dark:text-blue-300 hover:underline px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-700 shrink-0 cursor-pointer"
                title="حساب سعر العبوة تلقائياً: سعر الحبة × عدد القطع"
              >
                حساب السعر التلقائي
              </button>
            </div>
          )}

          {/* اسم العبوة */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1">
              اسم العبوة / الكرتونة: <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: كرتونة حليب كانديا (6 قطع)..."
              className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* عدد القطع واسم الوحدة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1">
                عدد القطع في العبوة: <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPiecesCount((prev) => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 font-bold text-sm flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={piecesCount}
                  onChange={(e) => setPiecesCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-2 py-1.5 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-center text-on-surface dark:text-white focus:outline-none focus:border-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPiecesCount((prev) => prev + 1)}
                  className="w-8 h-8 rounded-lg bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 font-bold text-sm flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  +
                </button>
              </div>
              {/* أزرار سريعة للأعداد الشائعة */}
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {[4, 6, 8, 12, 24, 30].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPiecesCount(num)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border cursor-pointer ${
                      piecesCount === num
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-surface-container dark:bg-slate-800 border-outline-variant/20 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1">
                اسم الوحدة / نوع التعبئة:
              </label>
              <input
                type="text"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                placeholder="مثال: كرتونة، طرد، باقة..."
                className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
              />
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {['كرتونة', 'طرد', 'علبة', 'باقة', 'صندوق', 'كيس', 'ربطة'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnitName(u)}
                    className={`text-[10px] px-2 py-0.5 rounded-md border cursor-pointer ${
                      unitName === u
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-surface-container dark:bg-slate-800 border-outline-variant/20 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* سعر البيع الإجمالي للعبوة */}
          <div className="p-3 bg-surface-container dark:bg-slate-800/80 border border-outline-variant/20 dark:border-slate-700/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block">
                سعر البيع الإجمالي للعبوة (د.ج): <span className="text-rose-500">*</span>
              </label>
              {Number(price) > 0 && piecesCount > 0 && (
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                  سعر الحبة داخل العبوة: {formatMoney(Number(price) / piecesCount)} د.ج
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-12 pr-3 py-2.5 bg-surface-container-high dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-700 rounded-xl text-base font-black font-mono text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
                required
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                د.ج
              </span>
            </div>
          </div>

          {/* الباركود وتصنيف المفضلة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1">
                باركود العبوة (اختياري):
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="اتركه فارغاً للبيع باللمس..."
                className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs font-mono text-on-surface dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1">
                التصنيف المفضل: <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetCatId}
                onChange={(e) => setTargetCatId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/15 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
