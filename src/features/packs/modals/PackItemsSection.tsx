import React from 'react';
import { Package, Plus, Trash2, Box } from 'lucide-react';
import { formatPackMoney } from '../services/packCalculations';
import type { PackItemSelection } from '../types';
import type { Product } from '@/types';

interface PackItemsSectionProps {
  selectedItems: PackItemSelection[];
  products?: Product[];
  currencySymbol: string;
  onOpenPicker: () => void;
  onUpdateQty: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
}

export const PackItemsSection: React.FC<PackItemsSectionProps> = ({
  selectedItems,
  products = [],
  currencySymbol,
  onOpenPicker,
  onUpdateQty,
  onRemoveItem,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-on-surface font-tajawal block">
            المنتجات المشمولة في الباقة ({selectedItems.length})
          </label>
          <span className="text-[11px] text-on-surface-variant font-medium">
            حدد الأصناف وكمية كل صنف داخل الباقة الواحدة
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenPicker}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منتج</span>
        </button>
      </div>

      {selectedItems.length === 0 ? (
        <div className="text-center py-8 bg-surface-container-low/40 rounded-2xl border border-dashed border-outline-variant/40">
          <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center mx-auto mb-2 text-on-surface-variant/50">
            <Box className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-on-surface font-cairo">لم يتم اختيار أي أصناف بعد</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            يجب إضافة منتج واحد على الأقل لتكوين الباقة أو الكرتونة
          </p>
          <button
            type="button"
            onClick={onOpenPicker}
            className="mt-3 px-4 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-bold font-tajawal inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>تصفح واختيار المنتجات</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
          {selectedItems.map((item, idx) => {
            const prod = products.find((p) => p.id === item.productId);
            const cost = item.costPrice ?? prod?.costPrice ?? 0;
            const stock = prod?.quantity ?? (prod as any)?.qty ?? 0;
            const lineCost = cost * item.qty;

            return (
              <div
                key={item.productId}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/25 gap-3 hover:border-outline-variant/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-on-surface truncate block font-cairo">
                      {item.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        stock > 10
                          ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                          : stock > 0
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      مخزون: {stock}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-1">
                    <span>
                      تكلفة القطعة: {formatPackMoney(cost)} {currencySymbol}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-on-surface">
                      إجمالي تكلفة الصنف: {formatPackMoney(lineCost)} {currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(idx, item.qty - 1)}
                      className="w-7 h-7 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center font-bold cursor-pointer transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => onUpdateQty(idx, parseInt(e.target.value) || 1)}
                      className="w-12 text-center text-xs font-bold text-on-surface py-1 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQty(idx, item.qty + 1)}
                      className="w-7 h-7 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center font-bold cursor-pointer transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(idx)}
                    className="p-1.5 text-error hover:bg-error/10 rounded-xl transition-colors cursor-pointer"
                    title="حذف الصنف من الباقة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
