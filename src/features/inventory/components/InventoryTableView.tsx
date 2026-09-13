import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Barcode,
  Tag,
  Edit2 as EditIcon,
  Printer as PrintIcon,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import type { Product } from '@/types';

interface InventoryTableViewProps {
  products: Product[];
  onQuickAdjust: (product: Product, delta: number) => void;
  onOpenCustomAdjust: (product: Product) => void;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  onDelete: (product: Product) => void;
  getStockStatus: (product: Product) => 'in_stock' | 'low_stock' | 'out_of_stock';
  isExpiringSoon: (product: Product) => boolean;
}

export const InventoryTableView: React.FC<InventoryTableViewProps> = ({
  products,
  onQuickAdjust,
  onOpenCustomAdjust,
  onEdit,
  onToggleStatus,
  onDelete,
  getStockStatus,
  isExpiringSoon,
}) => {
  const navigate = useNavigate();

  return (
    <div className="bg-surface-container rounded-2xl border border-outline-variant/20 shadow-sm overflow-hidden" dir="rtl">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-surface-container-high/50 text-on-surface-variant text-xs font-semibold border-b border-outline-variant/20">
              <th className="px-5 py-3.5">المنتج</th>
              <th className="px-4 py-3.5">الباركود / SKU</th>
              <th className="px-4 py-3.5">الفئة</th>
              <th className="px-4 py-3.5 text-center">سعر البيع</th>
              <th className="px-4 py-3.5 text-center">الكمية والحالة</th>
              <th className="px-4 py-3.5 text-center">تعديل سريع</th>
              <th className="px-5 py-3.5 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 text-body-sm">
            {products.map((product) => {
              const stockStatus = getStockStatus(product);
              const expiringSoon = isExpiringSoon(product);
              const marginVal =
                product.costPrice > 0
                  ? ((product.retailPrice - product.costPrice) / product.costPrice) * 100
                  : 0;

              return (
                <tr
                  key={product.id}
                  className={`hover:bg-surface-container-high/40 transition-colors group ${
                    expiringSoon ? 'bg-amber-500/5' : ''
                  }`}
                >
                  {/* Product Info with Avatar */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center overflow-hidden border border-outline-variant/20 shrink-0">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-on-surface-variant/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                            {product.name}
                          </p>
                          {product.status === 'inactive' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-surface-container-highest text-on-surface-variant">
                              معطل
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface-variant">
                          {product.variant && <span>المقاس/اللون: {product.variant}</span>}
                          {product.unit && <span>· الوحدة: {product.unit}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Barcode & SKU */}
                  <td className="px-4 py-3.5 font-mono text-xs text-on-surface-variant">
                    {product.barcode ? (
                      <div className="flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-primary/70" />
                        <span>{product.barcode}</span>
                      </div>
                    ) : (
                      <span className="text-on-surface-variant/40">—</span>
                    )}
                    {product.sku && (
                      <div className="text-[11px] text-on-surface-variant/70 mt-0.5">
                        SKU: {product.sku}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3.5">
                    {product.category ? (
                      <span className="inline-flex items-center gap-1 bg-surface-container-high px-2.5 py-1 rounded-lg text-xs font-medium text-on-surface-variant">
                        <Tag className="w-3 h-3 text-primary" />
                        {typeof product.category === 'object' && product.category !== null
                          ? (product.category as any).name
                          : String(product.category)}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">—</span>
                    )}
                  </td>

                  {/* Price & Cost */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="font-bold text-on-surface text-sm">
                      {Number(product.retailPrice || 0).toFixed(2)} <span className="text-xs font-normal">دج</span>
                    </div>
                    <div className="text-xs text-on-surface-variant/70 mt-0.5 flex items-center justify-center gap-1">
                      <span>تكلفة: {Number(product.costPrice || 0).toFixed(0)}</span>
                      {marginVal > 0 && (
                        <span className="text-emerald-500 text-[10px] font-semibold">
                          (+{marginVal.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Quantity & Visual Stock Gauge */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`font-cairo text-lg font-bold ${
                          stockStatus === 'out_of_stock'
                            ? 'text-rose-500'
                            : stockStatus === 'low_stock'
                            ? 'text-amber-500'
                            : 'text-on-surface'
                        }`}
                      >
                        {product.quantity}
                      </span>
                      <span className="text-xs text-on-surface-variant">{product.unit || 'قطعة'}</span>
                    </div>

                    {/* Mini Stock Gauge */}
                    <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden mx-auto mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          stockStatus === 'out_of_stock'
                            ? 'bg-rose-500 w-full'
                            : stockStatus === 'low_stock'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width:
                            stockStatus === 'out_of_stock'
                              ? '100%'
                              : `${Math.min(
                                  100,
                                  (product.quantity / Math.max(1, (product.lowStockThreshold || 5) * 3)) * 100
                                )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1">
                      {stockStatus === 'out_of_stock' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500">
                          نافذ
                        </span>
                      ) : stockStatus === 'low_stock' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500">
                          منخفض
                        </span>
                      ) : expiringSoon ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500">
                          صلاحية قريبة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          متوفر
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Quick Adjust Buttons */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onQuickAdjust(product, -1)}
                        className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-rose-500/20 hover:text-rose-500 flex items-center justify-center text-on-surface-variant font-bold transition-all active:scale-90 cursor-pointer"
                        title="إنقاص 1"
                      >
                        -
                      </button>
                      <button
                        onClick={() => onOpenCustomAdjust(product)}
                        className="px-2 py-1 rounded-lg bg-surface-container-high hover:bg-primary/20 hover:text-primary text-xs font-semibold text-on-surface-variant transition-all cursor-pointer"
                        title="تحديد يدوي"
                      >
                        ضبط
                      </button>
                      <button
                        onClick={() => onQuickAdjust(product, 1)}
                        className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-emerald-500/20 hover:text-emerald-500 flex items-center justify-center text-on-surface-variant font-bold transition-all active:scale-90 cursor-pointer"
                        title="زيادة 1"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(product)}
                        className="p-2 rounded-xl text-primary hover:bg-primary/10 transition-all active:scale-95 cursor-pointer"
                        title="تعديل تفاصيل المنتج"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/barcode/labels?productId=${product.id}`)}
                        className="p-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all active:scale-95 cursor-pointer"
                        title="طباعة ملصق باركود"
                      >
                        <PrintIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onToggleStatus(product)}
                        className={`p-2 rounded-xl transition-all active:scale-95 cursor-pointer ${
                          product.status === 'active'
                            ? 'text-emerald-500 hover:bg-emerald-500/10'
                            : 'text-on-surface-variant/60 hover:bg-surface-container-high'
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
                        className="p-2 rounded-xl text-rose-500/80 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-95 cursor-pointer"
                        title="حذف المنتج"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTableView;
