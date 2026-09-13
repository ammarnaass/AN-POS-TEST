import React, { useState, useMemo } from 'react';
import type { Product } from '@/types';
import { Search, X } from 'lucide-react';
import { formatPackMoney } from '../services/packCalculations';

interface ProductPickerModalProps {
  isOpen: boolean;
  products: Product[];
  currencySymbol: string;
  selectedProductIds: string[];
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
}

export const ProductPickerModal: React.FC<ProductPickerModalProps> = ({
  isOpen,
  products,
  currencySymbol,
  selectedProductIds,
  onSelectProduct,
  onClose,
}) => {
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 30);

    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [products, productSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-surface-container-lowest rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl border border-outline-variant/40"
        dir="rtl"
      >
        <div className="flex items-center justify-between p-3.5 border-b border-outline-variant/30">
          <h3 className="text-sm font-bold text-on-surface font-cairo">
            اختر منتجاً لإضافته للعبوة
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-outline-variant/20">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الباركود، أو الرمز..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              autoFocus
              className="w-full pl-3 pr-9 py-2 bg-surface-container-low rounded-lg border border-outline-variant/40 text-xs focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-72">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-xs text-on-surface-variant">
              لا توجد منتجات مطابقة
            </div>
          ) : (
            filteredProducts.map((prod) => {
              const isSelected = selectedProductIds.includes(prod.id);
              return (
                <button
                  key={prod.id}
                  onClick={() => {
                    onSelectProduct(prod);
                    setProductSearch('');
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-right text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-surface-container-low'
                  }`}
                >
                  <div className="min-w-0 pr-1">
                    <span className="font-bold text-on-surface block truncate">
                      {prod.name}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-variant mt-0.5">
                      {prod.barcode && <span>باركود: {prod.barcode}</span>}
                      <span>مخزون: {prod.quantity ?? 0}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-left">
                    <span className="font-bold text-primary">
                      {formatPackMoney(prod.retailPrice)} {currencySymbol}
                    </span>
                    {isSelected && (
                      <span className="block text-[10px] text-primary font-bold">مضاف ✓</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
