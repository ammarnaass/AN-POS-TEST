import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Printer as PrintIcon,
  Edit2 as EditIcon,
  Trash2,
} from 'lucide-react';
import type { Product } from '@/types';

interface InventoryProductCardProps {
  product: Product;
  onQuickAdjust: (product: Product, delta: number) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  expiringSoon: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const InventoryProductCard: React.FC<InventoryProductCardProps> = ({
  product,
  onQuickAdjust,
  onEdit,
  onDelete,
  stockStatus,
  expiringSoon,
  isSelected = false,
  onToggleSelect,
}) => {
  const navigate = useNavigate();

  const categoryName =
    typeof product.category === 'object' && product.category !== null
      ? (product.category as any).name
      : String(product.category || 'غير مصنف');

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between group shadow-xs ${
      isSelected
        ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-50/20 dark:bg-blue-900/10'
        : 'border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-lg'
    }`}>
      <div>
        {/* Card Image & Status Badges */}
        <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden mb-3.5 border border-slate-100 dark:border-slate-700/60 flex items-center justify-center">
          {/* Checkbox overlay */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect?.(product.id);
              }}
              className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 transition-all bg-white dark:bg-slate-800 shadow-sm"
              aria-label={`تحديد المنتج ${product.name}`}
            />
          </div>
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-600" />
          )}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1">
            {stockStatus === 'out_of_stock' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
                نافذ
              </span>
            ) : stockStatus === 'low_stock' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs animate-pulse">
                مخزون منخفض
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                متوفر
              </span>
            )}
            {expiringSoon && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white shadow-xs">
                قريب الصلاحية
              </span>
            )}
          </div>
        </div>

        {/* Product Details */}
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {product.name}
        </h4>
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span>{categoryName}</span>
          <span className="font-mono">{product.barcode || '—'}</span>
        </div>

        {/* Pricing & Stock Metrics */}
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400">سعر البيع</p>
            <p className="font-cairo font-bold text-base text-blue-600 dark:text-blue-400 font-mono">
              {Number(product.retailPrice || 0).toFixed(2)} <span className="text-xs font-normal">دج</span>
            </p>
          </div>
          <div className="text-left">
            <p className="text-[11px] text-slate-400">الكمية الحالية</p>
            <p className="font-cairo font-bold text-base text-slate-800 dark:text-slate-200 font-mono">
              {Number(product.quantity || 0).toLocaleString('ar-DZ')}{' '}
              <span className="text-xs font-normal text-slate-500">{product.unit || 'قطعة'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onQuickAdjust(product, -1)}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90 transition-all text-slate-700 dark:text-slate-300"
            title="إنقاص 1"
          >
            -
          </button>
          <button
            onClick={() => onQuickAdjust(product, 1)}
            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 flex items-center justify-center font-bold text-xs cursor-pointer active:scale-90 transition-all text-slate-700 dark:text-slate-300"
            title="زيادة 1"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/barcode/labels?productId=${product.id}`)}
            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer"
            title="طباعة باركود"
          >
            <PrintIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(product)}
            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all cursor-pointer"
            title="تعديل"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(product)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all cursor-pointer"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryProductCard;
