import React, { useState } from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import {
  Layers,
  X,
  AlertTriangle,
  Check,
  RefreshCw,
  Gift,
  Box,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Barcode,
} from 'lucide-react';
import { formatPackMoney } from '../services/packCalculations';
import { PackItemsSection } from './PackItemsSection';
import { ProductPickerModal } from './ProductPickerModal';
import type { PackType, PackItemSelection, PackCalculations } from '../types';

interface PackFormModalProps {
  isOpen: boolean;
  editingPack: PackEntity | null;
  packName: string;
  setPackName: (v: string) => void;
  packBarcode: string;
  setPackBarcode: (v: string) => void;
  packPrice: string;
  setPackPrice: (v: string) => void;
  packType: PackType;
  setPackType: (v: PackType) => void;
  unitName: string;
  setUnitName: (v: string) => void;
  minWholesaleQty: string;
  setMinWholesaleQty: (v: string) => void;
  selectedItems: PackItemSelection[];
  modalError: string;
  packCalculations: PackCalculations;
  products: Product[];
  currencySymbol: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onGenerateBarcode: () => void;
  onAddProduct: (product: Product) => void;
  onUpdateQty: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
}

export const PackFormModal: React.FC<PackFormModalProps> = ({
  isOpen,
  editingPack,
  packName,
  setPackName,
  packBarcode,
  setPackBarcode,
  packPrice,
  setPackPrice,
  packType,
  setPackType,
  unitName,
  setUnitName,
  minWholesaleQty,
  setMinWholesaleQty,
  selectedItems,
  modalError,
  packCalculations,
  products,
  currencySymbol,
  isSaving,
  onClose,
  onSave,
  onGenerateBarcode,
  onAddProduct,
  onUpdateQty,
  onRemoveItem,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!isOpen) return null;

  const priceNum = parseFloat(packPrice) || 0;
  const isLoss = priceNum > 0 && packCalculations.totalCost > priceNum;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div
          className="bg-surface-container-lowest rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl border border-outline-variant/40 animate-in zoom-in-95 duration-150"
          dir="rtl"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 bg-surface-container-low/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shadow-inner">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface font-cairo">
                  {editingPack ? 'تعديل بيانات الباقة / الحزمة' : 'إنشاء باقة أو حزمة جديدة'}
                </h2>
                <p className="text-xs text-on-surface-variant font-tajawal">
                  تحديد نوع التعبئة، تسعير الجملة، وحساب هامش الربح اللحظي
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* 1. تصنيف الباقة ونوع التعبئة */}
            <div className="space-y-3 bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/25">
              <label className="block text-xs font-bold text-on-surface font-tajawal">
                نوع الباقة والغرض التجاري:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPackType('bundle')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                    packType === 'bundle'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-xs ring-2 ring-purple-500/20'
                      : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs font-cairo">
                    <Gift className="w-4 h-4" />
                    <span>باقة وحزمة مجمعة</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-tajawal">
                    حزمة أصناف متنوعة بسعر ترويجي موحد
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPackType('wholesale')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                    packType === 'wholesale'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs font-cairo">
                    <Box className="w-4 h-4" />
                    <span>طرد كرتونة جملة</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-tajawal">
                    تعبئة كرتونة/طرد تجاري لصنف واحد
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPackType('half_wholesale')}
                  className={`p-3 rounded-xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                    packType === 'half_wholesale'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs ring-2 ring-amber-500/20'
                      : 'border-outline-variant/30 hover:bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs font-cairo">
                    <ShoppingBag className="w-4 h-4" />
                    <span>نصف جملة</span>
                  </div>
                  <span className="text-[10px] opacity-80 font-tajawal">
                    دزينة أو حزمة مصغرة لتجار التجزئة
                  </span>
                </button>
              </div>

              {/* تفاصيل وحدة التعبئة والحد الأدنى */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-outline-variant/20">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                    وحدة التعبئة (كرتونة، باقة، صندوق...)
                  </label>
                  <input
                    type="text"
                    placeholder="كرتونة"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs focus:outline-none focus:border-primary"
                  />
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {['كرتونة', 'باقة', 'طرد', 'صندوق', 'دزينة', 'حزمة', 'كيس'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUnitName(u)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                          unitName === u
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                    الحد الأدنى لطلب الجملة
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={minWholesaleQty}
                    onChange={(e) => setMinWholesaleQty(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-xs focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-on-surface-variant mt-1 block font-tajawal">
                    الحد الأدنى للعبوات لتطبيق هذا السعر
                  </span>
                </div>
              </div>
            </div>

            {/* 2. الاسم والباركود */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                  اسم الباقة / الحزمة <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  placeholder="مثال: باقة رمضان للتوفير، أو كرتونة زيت 12 حبة"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm focus:outline-none focus:border-primary font-tajawal font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1 font-tajawal">
                  الباركود الموحد للعبوة
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="text"
                      placeholder="امسح أو ولّد باركود..."
                      value={packBarcode}
                      onChange={(e) => setPackBarcode(e.target.value)}
                      className="w-full pl-3 pr-9 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 text-sm font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onGenerateBarcode}
                    className="px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/40 text-xs font-bold hover:bg-surface-container-high transition-colors shrink-0 cursor-pointer"
                    title="توليد باركود EAN-13 معتمد"
                  >
                    توليد EAN-13
                  </button>
                </div>
              </div>
            </div>

            {/* 3. سعر البيع وشريط مؤشرات الهامش المالي اللحظي */}
            <div className="bg-surface-container-low/70 p-4 rounded-2xl border border-outline-variant/25 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-on-surface font-tajawal">
                    سعر بيع الباقة النهائي ({currencySymbol}) <span className="text-error">*</span>
                  </label>
                  {packCalculations.totalRetail > 0 && (
                    <span className="text-[11px] text-on-surface-variant font-medium">
                      سعر التجزئة المقارن: {formatPackMoney(packCalculations.totalRetail)} {currencySymbol}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={packPrice}
                  onChange={(e) => setPackPrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/40 text-xl font-black text-primary focus:outline-none focus:border-primary font-cairo shadow-inner"
                />
              </div>

              {/* مؤشر الربحية والتوفير */}
              {selectedItems.length > 0 && (
                <div className="pt-2 border-t border-outline-variant/20 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/15">
                      <span className="text-on-surface-variant block text-[10px]">إجمالي التكلفة:</span>
                      <span className="font-bold text-on-surface">
                        {formatPackMoney(packCalculations.totalCost)} {currencySymbol}
                      </span>
                    </div>

                    <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/15">
                      <span className="text-on-surface-variant block text-[10px]">هامش الربح:</span>
                      <span
                        className={`font-bold ${
                          packCalculations.margin >= 20
                            ? 'text-green-600'
                            : packCalculations.margin > 0
                            ? 'text-blue-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {packCalculations.margin.toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/15">
                      <span className="text-on-surface-variant block text-[10px]">توفير الزبون:</span>
                      <span className="font-bold text-blue-600">
                        {formatPackMoney(packCalculations.savings)} {currencySymbol} ({packCalculations.savingsPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {isLoss && (
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>تنبيه: سعر البيع أقل من تكلفة الأصناف الإجمالية! ستسجل خسارة عند البيع.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. المنتجات المشمولة في الباقة */}
            <PackItemsSection
              selectedItems={selectedItems}
              products={products}
              currencySymbol={currencySymbol}
              onOpenPicker={() => setPickerOpen(true)}
              onUpdateQty={onUpdateQty}
              onRemoveItem={onRemoveItem}
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-outline-variant/20 bg-surface-container-low/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl text-xs font-bold font-tajawal hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editingPack ? 'حفظ تعديلات الباقة' : 'تأكيد إنشاء الباقة'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Product Picker */}
      <ProductPickerModal
        isOpen={pickerOpen}
        products={products}
        currencySymbol={currencySymbol}
        selectedProductIds={selectedItems.map((i) => i.productId)}
        onSelectProduct={(product) => {
          onAddProduct(product);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
};
