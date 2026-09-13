import React from 'react';
import { FileText, X } from 'lucide-react';
import { formatSupplierMoney } from '../services/supplierStatus';

interface SupplierInvoiceViewModalProps {
  isOpen: boolean;
  invoice: any | null;
  onClose: () => void;
  currencySymbol?: string;
}

export const SupplierInvoiceViewModal: React.FC<SupplierInvoiceViewModalProps> = ({
  isOpen,
  invoice,
  onClose,
  currencySymbol = 'دج',
}) => {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">
                تفاصيل فاتورة التوريد #{invoice.number}
              </h3>
              <p className="text-xs text-on-surface-variant">
                المورد: <strong className="text-on-surface">{invoice.supplierName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-surface-container p-3 rounded-2xl text-center text-xs font-mono">
          <div>
            <span className="text-[10px] text-on-surface-variant font-cairo block">التاريخ:</span>
            <strong>{new Date(invoice.date).toLocaleDateString('ar-DZ')}</strong>
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-cairo block">إجمالي الفاتورة:</span>
            <strong className="text-primary">
              {formatSupplierMoney(invoice.total)} {currencySymbol}
            </strong>
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-cairo block">المبلغ المدفوع:</span>
            <strong className="text-emerald-600">
              {formatSupplierMoney(invoice.paidAmount || 0)} {currencySymbol}
            </strong>
          </div>
        </div>

        {/* Items List */}
        <div className="overflow-y-auto max-h-56 custom-scrollbar border border-outline-variant/20 rounded-2xl">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
              <tr>
                <th className="py-2 px-3">السلعة</th>
                <th className="py-2 px-3 text-center">الكمية</th>
                <th className="py-2 px-3 text-center">سعر الوحدة</th>
                <th className="py-2 px-3 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {(invoice.items || []).map((it: any, i: number) => (
                <tr key={i}>
                  <td className="py-2 px-3 font-bold text-on-surface">{it.name}</td>
                  <td className="py-2 px-3 text-center font-mono">{it.qty}</td>
                  <td className="py-2 px-3 text-center font-mono">{formatSupplierMoney(it.unitPrice)}</td>
                  <td className="py-2 px-3 text-left font-mono font-bold text-primary">
                    {formatSupplierMoney(it.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
