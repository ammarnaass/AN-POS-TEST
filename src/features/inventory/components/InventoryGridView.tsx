import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Printer as PrintIcon,
  Edit2 as EditIcon,
  Trash2,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [columns, setColumns] = useState(4);
  const [scrollMargin, setScrollMargin] = useState(0);

  // تحديث عدد الأعمدة ديناميكياً بما يتطابق مع فئات Tailwind (sm: 2, lg: 3, xl: 4)
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const updateColumns = () => {
      const width = el.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
      if (width >= 1280) {
        setColumns(4);
      } else if (width >= 1024) {
        setColumns(3);
      } else if (width >= 640) {
        setColumns(2);
      } else {
        setColumns(1);
      }
    };

    updateColumns();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateColumns);
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // العثور على الحاوية المسؤولة عن التمرير الرأسي (مثل عنصر main في لوحة التحكم)
  useEffect(() => {
    if (!parentRef.current) return;
    let parent = parentRef.current.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        setScrollElement(parent);
        return;
      }
      parent = parent.parentElement;
    }
    setScrollElement((document.scrollingElement as HTMLElement) || document.documentElement);
  }, []);

  // حساب الهامش الرأسي scrollMargin بالنسبة لحاوية التمرير
  useEffect(() => {
    if (!parentRef.current || !scrollElement) return;

    const updateMargin = () => {
      if (!parentRef.current || !scrollElement) return;
      if (
        scrollElement === document.documentElement ||
        scrollElement === document.body ||
        scrollElement === document.scrollingElement
      ) {
        const rect = parentRef.current.getBoundingClientRect();
        setScrollMargin(rect.top + window.scrollY);
      } else {
        const nodeRect = parentRef.current.getBoundingClientRect();
        const parentRect = scrollElement.getBoundingClientRect();
        setScrollMargin(nodeRect.top - parentRect.top + scrollElement.scrollTop);
      }
    };

    updateMargin();
    const handleUpdate = () => updateMargin();
    window.addEventListener('resize', handleUpdate);
    scrollElement.addEventListener('scroll', handleUpdate, { passive: true });
    return () => {
      window.removeEventListener('resize', handleUpdate);
      scrollElement.removeEventListener('scroll', handleUpdate);
    };
  }, [scrollElement]);

  // تقسيم المنتجات إلى صفوف بحسب عدد الأعمدة
  const safeColumns = Math.max(1, columns);
  const rows = useMemo(() => {
    if (!products || products.length === 0) return [];
    const result: Product[][] = [];
    for (let i = 0; i < products.length; i += safeColumns) {
      result.push(products.slice(i, i + safeColumns));
    }
    return result;
  }, [products, safeColumns]);

  // تهيئة المحاكي الافتراضي من TanStack Virtual للصفوف
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement || parentRef.current,
    estimateSize: () => 410,
    scrollMargin,
    overscan: 2,
    observeElementRect: (instance, cb) => {
      const el = instance.scrollElement as HTMLElement | null;
      cb({
        width: el?.clientWidth || 1280,
        height: el?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800),
      });
    },
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  // في حال عدم اكتمال الحسابات أو وجود بيئة اختبارية، يتم استخدام صفوف احتياطية لضمان عدم حدوث شاشة فارغة
  const itemsToRender =
    virtualRows.length > 0
      ? virtualRows.map((virtualRow) => ({
          index: virtualRow.index,
          key: virtualRow.key,
          start: virtualRow.start - (rowVirtualizer.options.scrollMargin ?? 0),
          measureRef: rowVirtualizer.measureElement,
        }))
      : rows.map((_, index) => ({
          index,
          key: index,
          start: index * 410,
          measureRef: undefined,
        }));

  return (
    <div ref={parentRef} className="w-full relative" dir="rtl">
      <div
        style={{
          height: `${totalSize || rows.length * 410}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {itemsToRender.map((item) => {
          const rowProducts = rows[item.index] || [];
          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={item.measureRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${item.start}px)`,
              }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                {rowProducts.map((product) => {
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryGridView;
