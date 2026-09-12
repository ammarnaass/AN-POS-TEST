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
    <>
      {/* ─── 3. BOTTOM STATUS BAR (شريط الحالة الاحترافي والأنيق) ─── */}
      <footer className="bg-blue-950 dark:bg-slate-950 text-slate-200 text-xs px-3 py-1.5 flex items-center justify-between border-t border-blue-900 dark:border-slate-800 shrink-0">
        {/* Right: معلومات المحل والمستخدم */}
        <div className="flex items-center gap-3 font-medium">
          <div className={`flex items-center gap-1.5 ${isSessionOpen ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isSessionOpen ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[11px] font-bold">{isSessionOpen ? 'النظام متصل (جلسة مفتوحة)' : 'الجلسة مغلقة'}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-300">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>المستخدم: <strong className="text-white">{userName}</strong></span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-300">
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span>المحل: <strong className="text-white">{storeName}</strong></span>
          </div>
          {onOpenSalesHistory && (
            <>
              <span className="text-slate-600">|</span>
              <button
                type="button"
                onClick={onOpenSalesHistory}
                className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer hover:underline"
                title="عرض سجل المبيعات والفواتير السابقة"
              >
                <Receipt className="w-3 h-3 text-blue-400" />
                <span>سجل المبيعات</span>
              </button>
            </>
          )}
        </div>

        {/* Left: حالة النظام والوقت ورقم النسخة */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          {onSaveAsProforma && (
            <button
              type="button"
              onClick={onSaveAsProforma}
              disabled={cart.length === 0}
              className="hover:text-blue-300 disabled:opacity-30 cursor-pointer font-sans flex items-center gap-1 hover:underline"
              title="حفظ الفاتورة كعرض سعر / فاتورة مبدئية شكلية (Devis)"
            >
              <FileText className="w-3 h-3 text-amber-400" />
              <span>فاتورة شكلية (Devis)</span>
            </button>
          )}
          <span className="bg-blue-900/80 dark:bg-slate-800 text-blue-200 px-2 py-0.5 rounded border border-blue-800 dark:border-slate-700">
            POS-AN Terminal v5.0
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 inline text-slate-400" />
            <span>{formattedDate}</span>
          </span>
        </div>
      </footer>

      {/* ─── 4. SUBTLE MONITOR BEZEL SIMULATION (أسفل الشاشة كما بالصورة الأصلية) ─── */}
      <div className="w-full flex items-center justify-between px-3 pt-1 text-[10px] text-slate-400 font-sans tracking-wide shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">AN-POS RETAIL</span>
          <span className="text-slate-500">SyncStation Terminal 5</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span className="text-slate-400">60Hz POS STATION</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-slate-400">POWER ON</span>
          </div>
        </div>
      </div>
    </>
  );
};
