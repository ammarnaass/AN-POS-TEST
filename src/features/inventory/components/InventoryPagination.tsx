import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface InventoryPaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (p: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (n: number) => void;
  paginatedCount: number;
  totalFilteredCount: number;
}

export const InventoryPagination: React.FC<InventoryPaginationProps> = ({
  currentPage,
  totalPages,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage,
  paginatedCount,
  totalFilteredCount,
}) => {
  const from = paginatedCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const to = Math.min(currentPage * itemsPerPage, totalFilteredCount);

  return (
    <div
      className="p-4 bg-surface-container rounded-2xl border border-outline-variant/20 flex flex-col sm:flex-row justify-between items-center gap-4"
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        <p className="text-xs text-on-surface-variant">
          عرض {paginatedCount > 0 ? `${from}-${to}` : '0'} من أصل {totalFilteredCount} منتج
        </p>
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant border-r border-outline-variant/20 pr-3 mr-1">
          <span>عرض في الصفحة:</span>
          {[10, 25, 50].map((size) => (
            <button
              key={size}
              onClick={() => setItemsPerPage(size)}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                itemsPerPage === size
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all cursor-pointer"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number;
            if (totalPages <= 7) p = i + 1;
            else if (currentPage <= 4) p = i + 1;
            else if (currentPage >= totalPages - 3) p = totalPages - 6 + i;
            else p = currentPage - 3 + i;
            return (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  currentPage === p
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all cursor-pointer"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryPagination;
