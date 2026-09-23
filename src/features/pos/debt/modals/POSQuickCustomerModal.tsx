import React from 'react';
import { UserPlus, X, Phone, User, ShieldAlert } from 'lucide-react';
import type { Customer } from '@/types';
import { useCustomerRegistration } from '../hooks/useCustomerRegistration';

export interface POSQuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (id: string) => void;
  defaultCreditLimit?: number;
}

export const POSQuickCustomerModal: React.FC<POSQuickCustomerModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
}) => {
  const {
    name,
    setName,
    phone,
    setPhone,
    creditLimit,
    setCreditLimit,
    isSubmitting,
    error,
    registerCustomer,
  } = useCustomerRegistration({
    onSuccess: (newCustomer: Customer) => {
      onSelectCustomer(newCustomer.id);
    },
    onClose,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    await registerCustomer();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">إضافة زبون سريع</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">
              اسم الزبون <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أحمد بن علي"
                className="w-full h-10 px-3 pl-8 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
            </div>
          </div>

          {/* Customer Phone */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">رقم الهاتف</label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="05 / 06 / 07..."
                className="w-full h-10 px-3 pl-8 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none" />
            </div>
          </div>

          {/* Credit Limit */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-on-surface">سقف الائتمان (الحد الأقصى للدين):</label>
              <span className="text-[10px] text-on-surface-variant font-mono">دج</span>
            </div>
            <input
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="50000"
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              {[20000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCreditLimit(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-colors cursor-pointer ${
                    creditLimit === preset
                      ? 'bg-primary/10 border-primary text-primary font-bold'
                      : 'bg-surface-container border-outline-variant/20 text-on-surface-variant'
                  }`}
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'إضافة واختيار'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
