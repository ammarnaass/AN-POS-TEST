import React, { useState, useMemo } from 'react';
import { User, Search, UserPlus, X, Check, Phone, Wallet } from 'lucide-react';
import type { Customer } from '@/types';

interface CustomerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomerId: string;
  onSelectCustomer: (id: string) => void;
  onOpenAddCustomer: () => void;
  formatMoney: (amount?: number) => string;
}

export const CustomerSelectModal: React.FC<CustomerSelectModalProps> = ({
  isOpen,
  onClose,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenAddCustomer,
  formatMoney,
}) => {
  const [search, setSearch] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q))
    );
  }, [customers, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-on-surface font-cairo">تحديد زبون الفاتورة</h3>
              <p className="text-[11px] text-on-surface-variant font-mono">
                اختر من الزبائن المسجلين أو أضف زبوناً جديداً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Add Customer Button */}
        <div className="p-3 border-b border-outline-variant/15 bg-surface-container/50 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="البحث بالاسم أو رقم الهاتف..."
              className="w-full h-10 pr-9 pl-3 rounded-xl bg-surface border border-outline-variant/20 focus:border-primary/50 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-hidden transition-all shadow-inner"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAddCustomer();
            }}
            className="h-10 px-3.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-2xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>زبون جديد</span>
          </button>
        </div>

        {/* Customers List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {/* General Customer (Default) */}
          <button
            type="button"
            onClick={() => {
              onSelectCustomer('');
              onClose();
            }}
            className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition-all cursor-pointer ${
              !selectedCustomerId
                ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                : 'bg-surface hover:bg-surface-container border-outline-variant/15 text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold">زبون عام (افتراضي)</p>
                <p className="text-[10px] text-on-surface-variant font-mono">بدون حساب ديون</p>
              </div>
            </div>
            {!selectedCustomerId && <Check className="w-4 h-4 text-primary shrink-0" />}
          </button>

          {/* Filtered Customers List */}
          {filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant/60 text-xs">
              لا يوجد زبون مطابق للبحث
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const isSelected = selectedCustomerId === c.id;
              const hasDebt = c.balance && c.balance > 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCustomer(c.id);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-2xl border text-right flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/15 border-primary text-primary font-bold shadow-xs'
                      : 'bg-surface hover:bg-surface-container border-outline-variant/15 text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{c.name}</p>
                      {c.phone && (
                        <p className="text-[10px] text-on-surface-variant/70 font-mono flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          <span>{c.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasDebt ? (
                      <span className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Wallet className="w-3 h-3" />
                        <span>دين: {formatMoney(c.balance)} دج</span>
                      </span>
                    ) : null}
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-outline-variant/15 bg-surface-container flex items-center justify-between text-xs text-on-surface-variant shrink-0 font-mono">
          <span>إجمالي الزبائن المسجلين: {customers.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
export default CustomerSelectModal;
