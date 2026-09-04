import React from 'react';
import { ScanLine, Search } from 'lucide-react';

interface ClassicPOSSearchBarProps {
  barcodeInputRef: React.RefObject<HTMLInputElement | null>;
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export const ClassicPOSSearchBar: React.FC<ClassicPOSSearchBarProps> = React.memo(({
  barcodeInputRef,
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <div className="bg-surface-container-low/70 border-b border-outline-variant/15 px-3 py-2 flex items-center gap-2.5 shrink-0">
      {/* Barcode Input with Instant Scan Capability */}
      <form onSubmit={onBarcodeSubmit} className="flex-1 flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-primary">
            <ScanLine className="w-4 h-4" />
          </div>
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="امسح الباركود (F7) أو اكتب الرمز واضغط Enter..."
            className="w-full bg-surface-container border border-outline-variant/30 rounded-xl pr-9 pl-3 py-2 text-xs sm:text-sm font-mono text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-bold rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          إضافة
        </button>
      </form>

      {/* Search Input for Quick Finding */}
      <div className="relative w-48 sm:w-64 hidden sm:block">
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-on-surface-variant/60">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو التعيين..."
          className="w-full bg-surface-container border border-outline-variant/30 rounded-xl pr-8 pl-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden focus:border-primary transition-all shadow-inner"
        />
      </div>
    </div>
  );
});
