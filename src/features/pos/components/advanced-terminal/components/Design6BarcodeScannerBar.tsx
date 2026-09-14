import React, { useRef, useEffect } from 'react';
import { ScanLine, Plus, Tag } from 'lucide-react';

export interface Design6BarcodeScannerBarProps {
  barcodeInput: string;
  setBarcodeInput: (val: string) => void;
  onBarcodeSubmit: (e?: React.FormEvent) => void;
  pendingQty: number;
  setPendingQty: (qty: number) => void;
  onOpenPriceEdit?: () => void;
  quantityInputRef?: React.RefObject<HTMLInputElement | null>;
  barcodeInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const Design6BarcodeScannerBar: React.FC<Design6BarcodeScannerBarProps> = ({
  barcodeInput,
  setBarcodeInput,
  onBarcodeSubmit,
  pendingQty,
  setPendingQty,
  onOpenPriceEdit,
  quantityInputRef,
  barcodeInputRef,
}) => {
  const localBarcodeInputRef = useRef<HTMLInputElement>(null);
  const activeBarcodeRef = barcodeInputRef || localBarcodeInputRef;

  useEffect(() => {
    // Keep focus on barcode input
    activeBarcodeRef.current?.focus();
  }, [activeBarcodeRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      onBarcodeSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-[#070b14] p-2 flex items-center gap-2 border-b border-slate-800/80 select-none"
    >
      {/* 1. Add Button (+ إضافة) */}
      <button
        type="submit"
        className="h-11 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-md cursor-pointer transition-all shrink-0 text-xs border border-blue-400/40"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>إضافة</span>
      </button>

      {/* 2. Price Shortcut Button ([F4 السعر]) */}
      <button
        type="button"
        onClick={onOpenPriceEdit}
        className="h-11 px-3 bg-[#1e293b] hover:bg-[#334155] active:scale-95 text-slate-200 hover:text-white rounded-lg border border-slate-700/80 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-xs"
        title="تعديل سعر الصنف المحدد في السلة (F4)"
      >
        <Tag className="w-3.5 h-3.5 text-amber-400" />
        <span>F4 السعر</span>
      </button>

      {/* 3. Barcode Search Input Bar */}
      <div className="flex-1 relative flex items-center">
        <input
          ref={activeBarcodeRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          placeholder="مسح الباركود أو ادخل اسم السلعة..."
          className="w-full h-11 bg-[#0c1220] border-2 border-slate-700/80 focus:border-cyan-500 rounded-lg pl-3 pr-10 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden font-medium transition-all shadow-inner"
        />
        <div className="absolute right-3 flex items-center pointer-events-none text-slate-400">
          <ScanLine className="w-4 h-4 text-cyan-400" />
        </div>
      </div>

      {/* 4. Quantity Input ([F3 الكمية]) */}
      <div className="flex items-center gap-1 bg-[#0c1220] border-2 border-[#f59e0b]/80 rounded-lg px-2.5 h-11 shrink-0">
        <input
          ref={quantityInputRef as React.RefObject<HTMLInputElement>}
          type="number"
          min="1"
          step="1"
          value={pendingQty}
          onChange={(e) => setPendingQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-12 bg-transparent text-center font-mono font-black text-sm text-[#f59e0b] focus:outline-hidden"
          title="الكمية قبل المسح (F3)"
        />
        <div className="text-right border-r border-slate-700/80 pr-2">
          <div className="text-[10px] font-bold text-[#f59e0b] leading-tight">الكمية</div>
          <div className="text-[8px] font-mono text-slate-400 leading-tight">[F3]</div>
        </div>
      </div>
    </form>
  );
};
