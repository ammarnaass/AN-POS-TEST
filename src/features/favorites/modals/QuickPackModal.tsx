import React, { useMemo } from 'react';
import {
  Zap,
  X,
  AlertCircle,
  Package,
  Search,
  Info,
} from 'lucide-react';
import type { Product } from '@/types';
import type { FavoriteCategory } from '../types';
import { formatMoney } from '@/features/pos/utils/format';

export interface QuickPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: FavoriteCategory[];
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  piecesCount: number;
  onChangePiecesCount: (count: number) => void;
  unitName: string;
  onChangeUnitName: (unit: string) => void;
  packName: string;
  setPackName: (name: string) => void;
  packPrice: string;
  setPackPrice: (price: string) => void;
  setIsCustomPrice: (val: boolean) => void;
  barcode: string;
  setBarcode: (val: string) => void;
  targetCatId: string;
  setTargetCatId: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  isSaving: boolean;
  error: string;
  onSelectBaseProduct: (p: Product) => void;
  onSave: (e: React.FormEvent) => void;
}

export const QuickPackModal: React.FC<QuickPackModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  selectedProduct,
  setSelectedProduct,
  piecesCount,
  onChangePiecesCount,
  unitName,
  onChangeUnitName,
  packName,
  setPackName,
  packPrice,
  setPackPrice,
  setIsCustomPrice,
  barcode,
  setBarcode,
  targetCatId,
  setTargetCatId,
  searchQuery,
  setSearchQuery,
  isSaving,
  error,
  onSelectBaseProduct,
  onSave,
}) => {
  const filteredModalProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [products, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface-container-low dark:bg-slate-900 border border-outline-variant/20 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs">
              <Zap className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold font-cairo text-on-surface dark:text-white flex items-center gap-2">
                <span>إنشاء عبوة سريعة من منتج تجزئة</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-sans">
                  خاص بتصميم 5
                </span>
              </h3>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                تحويل سلع التجزئة إلى كراتين أو باقات (مثل 6 علب حليب) تُباع باللمس بدون باركود مع خصم المخزون التلقائي
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
          {/* الخطوة 1: اختيار منتج التجزئة الأساسي */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-300 mb-1.5">
              1. اختر منتج التجزئة الأساسي المراد إنشاء العبوة منه: <span className="text-rose-500">*</span>
            </label>

            {selectedProduct ? (
              <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-on-surface dark:text-white truncate">
                      {selectedProduct.name}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                      <span>
                        سعر الحبة:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatMoney(selectedProduct.retailPrice || (selectedProduct as any).price || 0)} د.ج
                        </strong>
                      </span>
                      <span>
                        المخزون المتوفر:{' '}
                        <strong className="font-mono text-slate-700 dark:text-slate-300">
                          {selectedProduct.quantity ?? 0} قطعة
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline px-2.5 py-1 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-700 shrink-0 cursor-pointer"
                >
                  تغيير المنتج
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم المنتج أو الباركود (مثال: حليب، ماء، زبادي)..."
                    className="w-full pl-3 pr-9 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar border border-outline-variant/15 dark:border-slate-800 rounded-2xl p-2 bg-surface-container/50 dark:bg-slate-800/40">
                  {filteredModalProducts.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400">
                      لا توجد نتائج مطابقة
                    </div>
                  ) : (
                    filteredModalProducts.map((p) => {
                      const pPrice = p.retailPrice || (p as any).price || 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onSelectBaseProduct(p)}
                          className="p-2.5 rounded-xl border border-outline-variant/15 dark:border-slate-700/60 bg-surface-container dark:bg-slate-800 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 text-right transition cursor-pointer flex items-center justify-between gap-2 group"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-on-surface dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {p.barcode || 'بدون باركود'} · متبقي: {p.quantity ?? 0}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {formatMoney(pPrice)} د.ج
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* الخطوة 2 و 3: عدد القطع ووحدة التعبئة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* عدد القطع في العبوة */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300">
                  2. عدد القطع المصرح بها في العبوة: <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  يُخصم من المخزون
                </span>
              </div>

              <input
                type="number"
                min="1"
                value={piecesCount}
                onChange={(e) => onChangePiecesCount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                required
              />

              {/* أزرار سريعة للقطع */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {[3, 4, 6, 12, 24, 30, 48].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => onChangePiecesCount(count)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                      piecesCount === count
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-surface-container dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-outline-variant/20 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    ×{count}
                  </button>
                ))}
              </div>
            </div>

            {/* اسم وحدة العبوة */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block">
                3. مسمى وحدة العبوة:
              </label>

              <input
                type="text"
                value={unitName}
                onChange={(e) => onChangeUnitName(e.target.value)}
                placeholder="مثال: كرتونة، طرد، باقة..."
                className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs text-on-surface dark:text-white focus:outline-none focus:border-primary"
              />

              {/* أزرار سريعة للوحدات */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {['كرتونة', 'طرد', 'باقة', 'شدة', 'صندوق', 'علبة'].map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => onChangeUnitName(unit)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                      unitName === unit
                        ? 'bg-primary text-on-primary border-primary shadow-2xs'
                        : 'bg-surface-container dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-outline-variant/20 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* الخطوة 4 و 5: اسم العبوة في الكاشير وسعر البيع */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* اسم العبوة */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block">
                4. الاسم الظاهر على زر الكاشير: <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={packName}
                onChange={(e) => setPackName(e.target.value)}
                placeholder="مثال: كرتون حليب (6 علب)"
                className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:border-primary"
                required
              />
              <p className="text-[10px] text-slate-400">
                هذا الاسم يظهر على بطاقة الشريط السفلي لكاشير تصميم 5
              </p>
            </div>

            {/* سعر بيع العبوة */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300">
                  5. سعر بيع العبوة (د.ج): <span className="text-rose-500">*</span>
                </label>
                {selectedProduct && (
                  <span className="text-[10px] font-mono text-slate-400">
                    تلقائي:{' '}
                    {formatMoney(
                      (selectedProduct.retailPrice || (selectedProduct as any).price || 0) * piecesCount
                    )}{' '}
                    د.ج
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={packPrice}
                onChange={(e) => {
                  setPackPrice(e.target.value);
                  setIsCustomPrice(true);
                }}
                placeholder="سعر البيع الإجمالي للعبوة"
                className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-primary"
                required
              />
              {selectedProduct &&
                Number(packPrice) <
                  (selectedProduct.retailPrice || (selectedProduct as any).price || 0) * piecesCount && (
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    ★ سعر تشجيعي بتخفيض{' '}
                    {formatMoney(
                      (selectedProduct.retailPrice || (selectedProduct as any).price || 0) * piecesCount -
                        Number(packPrice)
                    )}{' '}
                    د.ج للكرتونة
                  </div>
                )}
            </div>
          </div>

          {/* الخطوة 6 و 7: الباركود الاختياري وتصنيف المفضلة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* باركود العبوة */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300">
                  6. باركود العبوة (اختياري):
                </label>
                <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  يترك فارغاً للبيع باللمس
                </span>
              </div>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="اتركه فارغاً إذا كانت العبوة بدون باركود..."
                className="w-full px-3 py-2 bg-surface-container dark:bg-slate-800 border border-outline-variant/20 dark:border-slate-700 rounded-xl text-xs font-mono text-on-surface dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            {/* تصنيف المفضلة المستهدف */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block">
                7. إضافة العبوة إلى تصنيف المفضلة: <span className="text-rose-500">*</span>
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

          {/* بطاقة توضيحية لآلية الخصم والسرعة */}
          <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-bold block">ملاحظة تشغيلية لكاشير تصميم 5:</span>
              <span>
                هذه العبوة ستظهر كزر لمس مباشر في الشريط السفلي. عند النقر عليها، ستُضاف فوراً بدون باركود بالسعر المحدد، وعند إتمام الفاتورة، سيقوم النظام تلقائياً بخصم{' '}
                <strong>{piecesCount} قطع</strong> من رصيد المنتج الأصلي في المخزن.
              </span>
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
              disabled={isSaving || !selectedProduct}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
              <span>{isSaving ? 'جارٍ الحفظ...' : '⚡ حفظ وإضافة العبوة للمفضلة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
