import React, { useState } from 'react';
import { ArrowLeftRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Sale } from '@/types';
import type { InvoiceStatusToggleParams } from '../types';

export interface InvoiceStatusToggleSwitchProps {
  sale: Sale;
  onToggleStatus: (params: InvoiceStatusToggleParams) => Promise<any>;
  isToggling?: boolean;
  currentSessionId?: string | null;
}

export const InvoiceStatusToggleSwitch: React.FC<InvoiceStatusToggleSwitchProps> = ({
  sale,
  onToggleStatus,
  isToggling = false,
  currentSessionId,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');

  const isCurrentlyPaid = sale.status === 'paid';
  const targetStatus = isCurrentlyPaid ? 'unpaid' : 'paid';

  const handleExecute = async () => {
    await onToggleStatus({
      saleId: sale.id,
      targetStatus,
      paymentMethod,
      currentSessionId,
    });
    setShowConfirm(false);
  };

  if (sale.type === 'return') {
    return null; // لا يمكن تبديل حالة المرتجع
  }

  return (
    <div className="relative inline-block">
      {!showConfirm ? (
        <button
          type="button"
          disabled={isToggling}
          onClick={() => setShowConfirm(true)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
            isCurrentlyPaid
              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20'
          }`}
          title={isCurrentlyPaid ? 'تحويل الفاتورة إلى دين غير مسدد' : 'تسديد الفاتورة الآن'}
        >
          {isToggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5" />
          )}
          <span>{isCurrentlyPaid ? 'تحويل لدين (غير مسدد)' : 'تسديد الفاتورة (مدفوع)'}</span>
        </button>
      ) : (
        <div className="p-3 bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-xl space-y-2.5 z-20 min-w-[240px] text-right animate-in zoom-in-95">
          <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-primary" />
            <span>تأكيد تغيير حالة الفاتورة #{sale.number}</span>
          </p>

          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {targetStatus === 'paid'
              ? `سيتم تسجيل الفاتورة كمدفوعة وتخفيض دين الزبون بمقدار ${(sale.total || 0).toLocaleString()} دج.`
              : `سيتم قيد مبلغ ${(sale.total || 0).toLocaleString()} دج كدين مستحق على الزبون.`}
          </p>

          {targetStatus === 'paid' && (
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant block mb-1">
                طريقة تحصيل المبلغ:
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full h-8 px-2 bg-surface-container border border-outline-variant/25 rounded-lg text-xs font-bold text-on-surface focus:outline-none"
              >
                <option value="cash">نقداً في الصندوق</option>
                <option value="card">بطاقة بنكية</option>
                <option value="transfer">تحويل بنكي</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              disabled={isToggling}
              onClick={handleExecute}
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {isToggling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              <span>تأكيد التغيير</span>
            </button>
            <button
              type="button"
              disabled={isToggling}
              onClick={() => setShowConfirm(false)}
              className="py-1.5 px-2.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
