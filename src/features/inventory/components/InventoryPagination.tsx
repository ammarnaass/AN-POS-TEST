import React from 'react';

interface InventoryPaginationProps {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  setItemsPerPage: (items: number) => void;
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
  if (totalFilteredCount === 0) return null;

  const start = Math.min((currentPage - 1) * itemsPerPage + 1, totalFilteredCount);
  const end = Math.min(start + paginatedCount - 1, totalFilteredCount);

  return (
    <div
      className="px-4 py-3.5 bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs"
      data-purpose="pagination"
      dir="rtl"
    >
      {/* Records Count Info */}
      <div className="text-slate-500 dark:text-slate-400 font-medium">
        عرض <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{start}-{end}</span> من أصل{' '}
        <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{totalFilteredCount}</span> منتج
      </div>

      <div className="flex items-center gap-4">
        {/* Rows Per Page Selector */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span>عرض في الصفحة:</span>
          <div className="inline-flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 font-bold font-mono">
            {[10, 25, 50].map((size) => (
              <button
                key={size}
                onClick={() => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  itemsPerPage === size
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Page Buttons */}
        {totalPages > 1 && (
          <div className="inline-flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs transition ${
                currentPage === 1
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed bg-white dark:bg-slate-800'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer'
              }`}
              type="button"
            >
              السابق
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                  currentPage === page
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }`}
                type="button"
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs transition ${
                currentPage === totalPages
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed bg-white dark:bg-slate-800'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 cursor-pointer'
              }`}
              type="button"
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPagination;
