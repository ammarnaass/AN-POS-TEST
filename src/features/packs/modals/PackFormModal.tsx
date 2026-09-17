// src/features/packs/modals/PackFormModal.tsx
// نافذة إنشاء وتعديل الباقات والحزم التجارية المجمعة (AN POS)

import React, { useState } from 'react';
import type { PackEntity } from '@/infrastructure/database/dexie/db';
import type { Product } from '@/types';
import { Layers, X, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { PackTypeSelector } from './components/PackTypeSelector';
import { PackBasicInfoSection } from './components/PackBasicInfoSection';
import { PackFinancialSimulator } from './components/PackFinancialSimulator';
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
              title="إغلاق"
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

            {/* 1. تصنيف الباقة ونوع التعبئة والحد الأدنى */}
            <PackTypeSelector
              packType={packType}
              setPackType={setPackType}
              unitName={unitName}
              setUnitName={setUnitName}
              minWholesaleQty={minWholesaleQty}
              setMinWholesaleQty={setMinWholesaleQty}
            />

            {/* 2. الاسم والباركود ومولد EAN-13 */}
            <PackBasicInfoSection
              packName={packName}
              setPackName={setPackName}
              packBarcode={packBarcode}
              setPackBarcode={setPackBarcode}
              onGenerateBarcode={onGenerateBarcode}
            />

            {/* 3. سعر البيع ومحاكي الربحية اللحظي */}
            <PackFinancialSimulator
              packPrice={packPrice}
              setPackPrice={setPackPrice}
              packCalculations={packCalculations}
              selectedItemsCount={selectedItems.length}
              currencySymbol={currencySymbol}
            />

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
