import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Printer as PrintIcon,
  Edit2 as EditIcon,
  Trash2,
} from 'lucide-react';
import type { Product } from '@/types';

interface InventoryGridViewProps {
  products: Product[];
  onQuickAdjust: (product: Product, delta: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  getStockStatus: (product: Product) => 'in_stock' | 'low_stock' | 'out_of_stock';
  isExpiringSoon: (product: Product) => boolean;
}

export const InventoryGridView: React.FC<InventoryGridViewProps> = ({
  products,
  onQuickAdjust,
  onEdit,
  onDelete,
  getStockStatus,
  isExpiringSoon,
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" dir="rtl">
      {products.map((product) => {
        const stockStatus = getStockStatus(product);
        const expiringSoon = isExpiringSoon(product);

        return (
          <div
            key={product.id}
            className="bg-surface-container rounded-2xl border border-outline-variant/20 p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
          >
            <div>
              {/* Card Image & Status Badges */}
              <div className="relative w-full h-40 bg-surface-container-high rounded-xl overflow-hidden mb-3.5 border border-outline-variant/15 flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Package className="w-12 h-12 text-on-surface-variant/40" />
                )}
                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
                  {stockStatus === 'out_of_stock' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm">
                      نافذ
                    </span>
                  ) : stockStatus === 'low_stock' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm">
                      مخزون منخفض
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
                      متوفر
                    </span>
                  )}
                  {expiringSoon && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-sm">
                      قريب الصلاحية
                    </span>
                  )}
                </div>
              </div>

              {/* Product Details */}
              <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors line-clamp-1">
                {product.name}
              </h4>
              <div className="flex items-center justify-between text-xs text-on-surface-variant mt-1">
                <span>
                  {product.category
                    ? typeof product.category === 'object' && product.category !== null
                      ? (product.category as any).name
                      : String(product.category)
                    : 'غير مصنف'}
                </span>
                <span className="font-mono">{product.barcode || '—'}</span>
              </div>

              {/* Pricing & Stock Metrics */}
              <div className="mt-3 p-3 bg-surface-container-high/50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-on-surface-variant">سعر البيع</p>
                  <p className="font-cairo font-bold text-base text-primary">
                    {Number(product.retailPrice || 0).toFixed(2)} <span className="text-xs font-normal">دج</span>
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-on-surface-variant">الكمية الحالية</p>
                  <p className="font-cairo font-bold text-base text-on-surface">
                    {product.quantity}{' '}
                    <span className="text-xs font-normal text-on-surface-variant">{product.unit}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Card Actions Footer */}
            <div className="mt-4 pt-3 border-t border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onQuickAdjust(product, -1)}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-rose-500/20 hover:text-rose-500 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90 transition-all"
                  title="إنقاص 1"
                >
                  -
                </button>
                <button
                  onClick={() => onQuickAdjust(product, 1)}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-emerald-500/20 hover:text-emerald-500 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90 transition-all"
                  title="زيادة 1"
                >
                  +
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/barcode/labels?productId=${product.id}`)}
                  className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
                  title="طباعة باركود"
                >
                  <PrintIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(product)}
                  className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all cursor-pointer"
                  title="تعديل"
                >
                  <EditIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(product)}
                  className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InventoryGridView;
