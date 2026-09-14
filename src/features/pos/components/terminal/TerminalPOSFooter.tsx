import React from 'react';
import { User, Store, Receipt, FileText, Clock } from 'lucide-react';
import type { CartItem } from '@/types';

export interface TerminalPOSFooterProps {
  isSessionOpen: boolean;
  userName?: string;
  storeName?: string;
  onOpenSalesHistory?: () => void;
  onSaveAsProforma?: () => void;
  cart: CartItem[];
  formattedDate: string;
}

export const TerminalPOSFooter: React.FC<TerminalPOSFooterProps> = ({
  isSessionOpen,
  userName = 'Admin',
  storeName = 'AN POS',
  onOpenSalesHistory,
  onSaveAsProforma,
  cart,
  formattedDate,
}) => {
  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-200 text-xs px-3 py-1.5 flex items-center justify-between border-t border-slate-800 shrink-0 select-none">
      {/* Right: معلومات المحل والمستخدم وحالة الجلسة */}
      <div className="flex items-center gap-3 font-medium flex-wrap">
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
          isSessionOpen 
            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
            : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isSessionOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{isSessionOpen ? 'الجلسة متصلة ومفتوحة' : 'الجلسة مغلقة'}</span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
          <User className="w-3.5 h-3.5 text-blue-400" />
          <span>المستخدم: <strong className="text-white font-bold">{userName}</strong></span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
          <Store className="w-3.5 h-3.5 text-amber-400" />
          <span>المحل: <strong className="text-white font-bold">{storeName}</strong></span>
        </div>
        {onOpenSalesHistory && (
          <>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={onOpenSalesHistory}
              className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-bold cursor-pointer hover:underline"
              title="عرض سجل المبيعات والفواتير السابقة"
            >
              <Receipt className="w-3.5 h-3.5 text-blue-400" />
              <span>سجل المبيعات</span>
            </button>
          </>
        )}
      </div>

      {/* Left: خيارات الفاتورة وحالة النظام والوقت */}
      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
        {onSaveAsProforma && (
          <button
            type="button"
            onClick={onSaveAsProforma}
            disabled={cart.length === 0}
            className="text-slate-300 hover:text-amber-300 disabled:opacity-30 cursor-pointer font-sans flex items-center gap-1 font-bold hover:underline"
            title="حفظ الفاتورة الحالية كعرض سعر / فاتورة شكلية (Devis)"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>فاتورة شكلية (Devis)</span>
          </button>
        )}
        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 text-[10px] font-bold">
          Terminal v5
        </span>
        <span className="flex items-center gap-1.5 text-slate-300 font-bold">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{formattedDate}</span>
        </span>
      </div>
    </footer>
  );
};
