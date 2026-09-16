import React from 'react';

interface Design7DisplayAndCustomerBannerProps {
  totalAmount: number;
  formatMoney: (amount?: number | null) => string;
  currency?: string;
  selectedCustomerName: string;
  onSelectCustomer: () => void;
}

export const Design7DisplayAndCustomerBanner: React.FC<Design7DisplayAndCustomerBannerProps> = ({
  totalAmount,
  formatMoney,
  currency = 'DA',
  selectedCustomerName,
  onSelectCustomer,
}) => {
  // Format total string for the classic digital display
  const displayTotal = formatMoney(totalAmount);

  return (
    <div className="flex items-stretch h-14 sm:h-16 md:h-20 border-b border-[#204060] shrink-0 overflow-hidden" data-purpose="digital-banner">
      {/* Large LED Digital Amount Banner (Right in RTL) */}
      <div className="flex-[3] d7-led-display-bg flex items-center justify-center px-2 sm:px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
        <span
          className="text-red-500 font-black tracking-wider text-2xl sm:text-3xl md:text-5xl drop-shadow-[0_2px_8px_rgba(255,0,0,0.7)] select-none truncate max-w-full px-1"
          style={{ fontFamily: "'Courier New', monospace, sans-serif" }}
        >
          {displayTotal}
        </span>
      </div>

      {/* Customer Identity Section (Left in RTL) */}
      <div className="flex-[2] bg-[#cde4f9] border-r-2 border-[#5a8bb8] flex items-center px-2 sm:px-4 justify-between overflow-hidden gap-2">
        <button
          onClick={onSelectCustomer}
          type="button"
          title="تغيير أو اختيار الزبون"
          className="bg-gradient-to-b from-[#7ec5f9] to-[#3a99e0] hover:from-[#6db6ee] hover:to-[#2c8ed6] active:from-[#2c8ed6] active:to-[#1e7dc4] text-white border border-[#2684cd] rounded px-2 sm:px-3 py-1 sm:py-1.5 font-bold shadow text-[10px] sm:text-xs cursor-pointer transition-all shrink-0"
        >
          الزبون
        </button>
        <div
          onClick={onSelectCustomer}
          title={selectedCustomerName?.trim() ? selectedCustomerName : 'زبون غير معروف'}
          className="text-amber-600 hover:text-amber-700 font-extrabold text-sm sm:text-lg md:text-xl drop-shadow-sm pr-1 sm:pr-2 truncate cursor-pointer transition-colors"
        >
          {selectedCustomerName?.trim() ? selectedCustomerName : 'زبون غير معروف'}
        </div>
      </div>
    </div>
  );
};
