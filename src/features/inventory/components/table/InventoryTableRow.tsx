import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Edit2 as EditIcon,
  Printer as PrintIcon,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import type { Product } from '@/types';

interface InventoryTableRowProps {
  product: Product;
  virtualIndex: number;
  measureElement?: (el: HTMLElement | null) => void;
  onQuickAdjust: (product: Product, delta: number) => void;
  onOpenCustomAdjust: (product: Product) => void;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  onDelete: (product: Product) => void;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  expiringSoon: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const InventoryTableRow: React.FC<InventoryTableRowProps> = ({
  product,
  virtualIndex,
  measureElement,
  onQuickAdjust,
  onOpenCustomAdjust,
  onEdit,
  onToggleStatus,
  onDelete,
  stockStatus,
  expiringSoon,
  isSelected = false,
  onToggleSelect,
}) => {
  const navigate = useNavigate();

  const marginVal =
    product.costPrice > 0
      ? ((product.retailPrice - product.costPrice) / product.costPrice) * 100
      : 0;

  const categoryName =
    typeof product.category === 'object' && product.category !== null
      ? (product.category as any).name
      : String(product.category || 'عام');

  return (
    <tr
      data-index={virtualIndex}
      ref={measureElement}
      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group ${
        isSelected ? 'bg-blue-50/70 dark:bg-blue-900/20' : expiringSoon ? 'bg-amber-500/5' : ''
      }`}
    >
      {/* 0. Checkbox */}
      <td className="py-3.5 px-3 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect?.(product.id);
          }}
          className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 transition-all"
          aria-label={`تحديد المنتج ${product.name}`}
        />
      </td>

      {/* 1. Product Name & Unit */}
      <td className="py-3.5 px-4">
        <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
          {product.name}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          {product.variant ? `المقاس: ${product.variant} · ` : ''}
          الوحدة: <span className="text-slate-600 dark:text-slate-300 font-medium">{product.unit || 'قطعة'}</span>
          {product.status === 'inactive' && (
            <span className="mr-2 px-1.5 py-0.2 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500">
              معطل
            </span>
          )}
        </div>
      </td>

      {/* 2. Barcode & SKU */}
      <td className="py-3.5 px-4">
        <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
          {product.barcode || '—'}
        </div>
        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
          {product.sku ? `SKU: ${product.sku}` : `SKU: ${product.barcode || '—'}`}
        </div>
      </td>

      {/* 3. Category */}
      <td className="py-3.5 px-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
          {categoryName}
        </span>
      </td>

      {/* 4. Selling Price & Cost */}
      <td className="py-3.5 px-4">
        <div className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
          {Number(product.retailPrice || 0).toFixed(2)} دج
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
          <span>تكلفة: <span className="font-mono">{Number(product.costPrice || 0).toFixed(0)} دج</span></span>
          {marginVal > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px]">
              +{marginVal.toFixed(0)}%
            </span>
          )}
        </div>
      </td>

      {/* 5. Current Quantity & Status */}
      <td className="py-3.5 px-4 text-center">
        <div className="inline-flex items-center gap-1.5">
          <span
            className={`font-bold text-sm font-mono ${
              stockStatus === 'out_of_stock'
                ? 'text-rose-600 dark:text-rose-400'
                : stockStatus === 'low_stock'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {Number(product.quantity || 0).toLocaleString('ar-DZ')}
          </span>
          <span className="text-xs text-slate-400">{product.unit || 'قطعة'}</span>
        </div>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          {stockStatus === 'out_of_stock' ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">نافذ</span>
            </>
          ) : stockStatus === 'low_stock' ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">منخفض</span>
            </>
          ) : expiringSoon ? (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">قريب الصلاحية</span>
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">متوفر</span>
            </>
          )}
        </div>
      </td>

      {/* 6. Quick Adjustment Buttons */}
      <td className="py-3.5 px-4 text-center">
        <div
          className={`inline-flex items-center justify-center border rounded-lg p-0.5 shadow-xs ${
            stockStatus === 'low_stock'
              ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
          }`}
        >
          <button
            onClick={() => onQuickAdjust(product, -1)}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition font-bold cursor-pointer"
            title="إنقاص 1"
          >
            -
          </button>
          <button
            onClick={() => onOpenCustomAdjust(product)}
            className={`px-2 text-xs font-semibold transition cursor-pointer hover:underline ${
              stockStatus === 'low_stock'
                ? 'text-amber-800 dark:text-amber-400'
                : 'text-slate-700 dark:text-slate-200'
            }`}
            title="تعديل يدوي دقيق"
          >
            {stockStatus === 'low_stock' ? 'طلب' : 'ضبط'}
          </button>
          <button
            onClick={() => onQuickAdjust(product, 1)}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition font-bold cursor-pointer"
            title="زيادة 1"
          >
            +
          </button>
        </div>
      </td>

      {/* 7. Action Icons */}
      <td className="py-3.5 px-4 text-center">
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => onEdit(product)}
            aria-label="تعديل المنتج"
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
            title="تعديل المنتج"
          >
            <EditIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/barcode/labels?productId=${product.id}`)}
            aria-label="طباعة الباركود"
            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition cursor-pointer"
            title="طباعة ملصق الباركود"
          >
            <PrintIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToggleStatus(product)}
            aria-label={product.status === 'active' ? 'تعطيل المنتج' : 'تفعيل المنتج'}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              product.status === 'active'
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={product.status === 'active' ? 'تعطيل المنتج' : 'تفعيل المنتج'}
          >
            {product.status === 'active' ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(product)}
            aria-label="حذف المنتج"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
            title="حذف المنتج"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default InventoryTableRow;
