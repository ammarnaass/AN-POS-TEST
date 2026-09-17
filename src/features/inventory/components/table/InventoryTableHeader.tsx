import React from 'react';

export const InventoryTableHeader: React.FC = () => {
  return (
    <thead>
      <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/80 text-xs font-bold uppercase tracking-wider">
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
