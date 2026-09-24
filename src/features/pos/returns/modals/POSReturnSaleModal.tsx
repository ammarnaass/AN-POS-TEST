import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import type { Sale } from '@/types';
import type { POSReturnSaleModalProps } from '../types';
import { usePOSReturnSearch } from '../hooks/usePOSReturnSearch';
import { ReturnFilterPills } from '../components/ReturnFilterPills';
import { ReturnSaleSearchList } from '../components/ReturnSaleSearchList';

export const POSReturnSaleModal: React.FC<POSReturnSaleModalProps> = ({
  isOpen,
  onClose,
  sales: initialSales,
  onSelectReturnSale,
  onQuickFullReturn,
  onLoadToCart,
}) => {
  const {
    query,
    setQuery,
    searchMode,
    setSearchMode,
    dateRange,
    setDateRange,
    eligibilityStatus,
    setEligibilityStatus,
    results,
    stats,
    isLoading,
    handleBarcodeScan,
  } = usePOSReturnSearch({
    isOpen,
    initialSales,
    onAutoSelectSale: (sale) => {
      onSelectReturnSale(sale);
      onClose();
    },
  });

  if (!isOpen) return null;

  const handleSelect = (sale: Sale) => {
    onSelectReturnSale(sale);
    onClose();
  };

  const handleQuickFull = (sale: Sale) => {
    if (onQuickFullReturn) {
      onQuickFullReturn(sale);
      onClose();
    } else {
      // إذا لم يتم تمرير معالج خاص، نفتح نافذة التخصيص
      handleSelect(sale);
    }
  };

  const handleLoadCart = (sale: Sale) => {
    if (onLoadToCart) {
      onLoadToCart(sale);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* رأس النافذة */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-on-surface">إرجاع مبيعات سابقة</h3>
                <span className="px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant font-mono text-xs font-bold">
                  {stats.matchedCount} فاتورة
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                البحث السريع برقم الفاتورة، الباركود، الزبون، أو الصنف المسترجع
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* جسم النافذة القابل للتمرير */}
        <div className="p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
          {/* شريط الفلاتر المتقدمة (أوضاع البحث، التواريخ، والأهلية) */}
          <ReturnFilterPills
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            eligibilityStatus={eligibilityStatus}
            onEligibilityChange={setEligibilityStatus}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            refundableCount={stats.refundableCount}
            partiallyReturnedCount={stats.partiallyReturnedCount}
            fullyReturnedCount={stats.fullyReturnedCount}
          />

          {/* قائمة نتائج البحث مع حقل الإدخال وقارئ الباركود */}
          <ReturnSaleSearchList
            results={results}
            isLoading={isLoading}
            searchQuery={query}
            onSearchChange={setQuery}
            onSelectSale={handleSelect}
            onQuickFullReturn={onQuickFullReturn ? handleQuickFull : undefined}
            onLoadToCart={onLoadToCart ? handleLoadCart : undefined}
            onBarcodeSubmit={handleBarcodeScan}
          />
        </div>
      </div>
    </div>
  );
};
