import React, { useRef, useState, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Product } from '@/types';
import { InventoryTableHeader } from './table/InventoryTableHeader';
import { InventoryTableRow } from './table/InventoryTableRow';

interface InventoryTableViewProps {
  products: Product[];
  onQuickAdjust: (product: Product, delta: number) => void;
  onOpenCustomAdjust: (product: Product) => void;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  onDelete: (product: Product) => void;
  getStockStatus: (product: Product) => 'in_stock' | 'low_stock' | 'out_of_stock';
  isExpiringSoon: (product: Product) => boolean;
  selectedProductIds?: Set<string>;
  onToggleSelectProduct?: (id: string) => void;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
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
  selectedProductIds,
  onToggleSelectProduct,
  onToggleSelectAll,
  isAllSelected = false,
  isIndeterminate = false,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

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

  // تهيئة المحاكي الافتراضي من TanStack Virtual لصفوف الجدول
  const rowVirtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => scrollElement || parentRef.current,
    estimateSize: () => 70,
    scrollMargin,
    overscan: 5,
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

  const paddingTop =
    virtualRows.length > 0
      ? Math.max(0, (virtualRows[0]?.start ?? 0) - (rowVirtualizer.options.scrollMargin ?? 0))
      : 0;

  const paddingBottom =
    virtualRows.length > 0
      ? Math.max(
          0,
          totalSize - ((virtualRows[virtualRows.length - 1]?.end ?? 0) - (rowVirtualizer.options.scrollMargin ?? 0))
        )
      : 0;

  const itemsToRender =
    virtualRows.length > 0
      ? virtualRows
      : products.map((_, index) => ({
          index,
          key: index,
          start: index * 70,
          end: (index + 1) * 70,
          size: 70,
          lane: 0,
        }));

  return (
    <section
      ref={parentRef}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs"
      data-purpose="products-table"
      dir="rtl"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm border-collapse" id="products-table">
          <InventoryTableHeader
            isAllSelected={isAllSelected}
            isIndeterminate={isIndeterminate}
            onToggleSelectAll={onToggleSelectAll}
          />
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {paddingTop > 0 && (
              <tr>
                <td colSpan={8} style={{ height: `${paddingTop}px`, padding: 0, border: 0 }} />
              </tr>
            )}
            {itemsToRender.map((virtualRow) => {
              const product = products[virtualRow.index];
              if (!product) return null;

              return (
                <InventoryTableRow
                  key={product.id}
                  product={product}
                  virtualIndex={virtualRow.index}
                  measureElement={rowVirtualizer.measureElement}
                  onQuickAdjust={onQuickAdjust}
                  onOpenCustomAdjust={onOpenCustomAdjust}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                  stockStatus={getStockStatus(product)}
                  expiringSoon={isExpiringSoon(product)}
                  isSelected={selectedProductIds?.has(product.id)}
                  onToggleSelect={onToggleSelectProduct}
                />
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td colSpan={8} style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default InventoryTableView;
