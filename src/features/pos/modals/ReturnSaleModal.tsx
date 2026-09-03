import React, { useState } from 'react';
import { RotateCcw, Search, X } from 'lucide-react';
import { formatNumber } from '../utils/format';
import type { Sale } from '@/types';

interface ReturnSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  onSelectReturnSale: (sale: Sale) => void;
}

export const ReturnSaleModal: React.FC<ReturnSaleModalProps> = ({
  isOpen,
  onClose,
  sales,
  onSelectReturnSale,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredSales = sales.filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.number?.toLowerCase().includes(q) ||
      s.customerName?.toLowerCase().includes(q) ||
      s.soldBy?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-bold text-on-surface">اختر فاتورة سابقة للإرجاع</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة أو اسم الزبون..."
            className="w-full h-10 pr-9 pl-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-red-500/20"
            autoFocus
          />
          <Search className="w-4 h-4 text-on-surface-variant/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sales List */}
        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
          {filteredSales.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant text-xs">
              لم يتم العثور على فواتير مطابقة
            </div>
          ) : (
            filteredSales.slice(0, 40).map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  onSelectReturnSale(s);
                  onClose();
                }}
                className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 hover:border-red-500/40 hover:bg-red-500/5 cursor-pointer flex items-center justify-between transition-all"
              >
                <div>
                  <p className="text-xs font-bold text-on-surface">فاتورة #{s.number}</p>
                  <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                    {new Date(s.date).toLocaleDateString('ar-DZ')} — {s.items?.length || 0} أصناف {s.customerName ? `• ${s.customerName}` : ''}
                  </p>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-primary font-mono">
                    {formatNumber(s.total)} دج
                  </span>
                  <p className="text-[10px] text-on-surface-variant">{s.soldBy}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
