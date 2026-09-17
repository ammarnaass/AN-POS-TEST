import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Product } from '@/types';
import { InventoryProductCard } from './grid/InventoryProductCard';

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

  // العثور على الحاوية المسؤولة عن التمرير الرأسي
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

  // حساب الهامش الرأسي scrollMargin
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

  // تهيئة المحاكي الافتراضي
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElement || parentRef.current,
    estimateSize: () => 380,
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
          start: index * 380,
          measureRef: undefined,
        }));

  return (
    <div ref={parentRef} className="w-full relative" dir="rtl">
      <div
        style={{
          height: `${totalSize || rows.length * 380}px`,
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
                {rowProducts.map((product) => (
                  <InventoryProductCard
                    key={product.id}
                    product={product}
                    onQuickAdjust={onQuickAdjust}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    stockStatus={getStockStatus(product)}
                    expiringSoon={isExpiringSoon(product)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryGridView;
