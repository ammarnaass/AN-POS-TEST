import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CustomerPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount?: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}

export const CustomerPagination: React.FC<CustomerPaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  totalItems,
  itemsPerPage = 12,
  onPageChange,
}) => {
  const count = totalItems ?? totalCount ?? 0;
  return (
    <div className="bg-surface-container px-4 py-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
      <div>
        عرض{' '}
        <strong className="font-mono text-on-surface">
          {count > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
        </strong>{' '}
        إلى{' '}
        <strong className="font-mono text-on-surface">
          {Math.min(currentPage * itemsPerPage, count)}
        </strong>{' '}
        من إجمالي <strong className="font-mono text-on-surface">{count}</strong> زبون
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-30 cursor-pointer"
            title="الصفحة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === pageNum
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-30 cursor-pointer"
            title="الصفحة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
