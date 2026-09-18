import React from 'react';

interface InventoryTableHeaderProps {
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  onToggleSelectAll?: () => void;
}

export const InventoryTableHeader: React.FC<InventoryTableHeaderProps> = ({
  isAllSelected = false,
  isIndeterminate = false,
  onToggleSelectAll,
}) => {
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <thead>
      <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80 text-xs font-bold uppercase tracking-wider">
        <th className="py-3.5 px-3 text-center w-12" scope="col">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            title={isAllSelected ? "إلغاء تحديد الكل" : "تحديد كل المعروض في هذه الصفحة"}
            className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 transition-all"
            aria-label="تحديد كل المنتجات المعروضة"
          />
        </th>
        <th className="py-3.5 px-4 text-right" scope="col">
          المنتج والوحدة
        </th>
        <th className="py-3.5 px-4 text-right" scope="col">
          الباركود / SKU
        </th>
        <th className="py-3.5 px-4 text-right" scope="col">
          الفئة والتصنيف
        </th>
        <th className="py-3.5 px-4 text-right" scope="col">
          سعر البيع والتكلفة
        </th>
        <th className="py-3.5 px-4 text-center" scope="col">
          الكمية الحالية
        </th>
        <th className="py-3.5 px-4 text-center" scope="col">
          تعديل سريع
        </th>
        <th className="py-3.5 px-4 text-center" scope="col">
          إجراءات
        </th>
      </tr>
    </thead>
  );
};

export default InventoryTableHeader;

