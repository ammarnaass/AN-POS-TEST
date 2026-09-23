import React from 'react';
import { Eye, ShoppingCart, RotateCcw } from 'lucide-react';
import type { Sale } from '@/types';
import { formatMoney } from '@/features/pos/utils/format';
import { InvoicePaymentStatusBadge } from './InvoicePaymentStatusBadge';
import { InvoiceStatusToggleSwitch } from './InvoiceStatusToggleSwitch';
import type { InvoiceStatusToggleParams } from '../types';

export interface CustomerInvoicesTableProps {
  invoices: Sale[];
  onSelectInvoice?: (sale: Sale) => void;
  onRecallToCart?: (sale: Sale) => void;
  onFullReturn?: (sale: Sale) => void;
  onTogglePaymentStatus?: (params: InvoiceStatusToggleParams) => Promise<any>;
  isToggling?: boolean;
  currentSessionId?: string | null;
  currencySymbol?: string;
}

export const CustomerInvoicesTable: React.FC<CustomerInvoicesTableProps> = ({
  invoices,
  onSelectInvoice,
  onRecallToCart,
  onFullReturn,
  onTogglePaymentStatus,
  isToggling = false,
  currentSessionId,
  currencySymbol = 'دج',
}) => {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-variant text-xs space-y-1">
        <p className="font-bold">لا توجد فواتير مطابقة لمعايير البحث</p>
        <p className="text-[11px] opacity-70">جرّب تغيير كلمات البحث أو تصنيف الحالة</p>
      </div>
    );
  }

  return (
    <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-surface-container-low shadow-xs">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant/15 text-on-surface-variant font-bold">
              <th className="py-3 px-4">رقم الفاتورة</th>
              <th className="py-3 px-4">التاريخ</th>
              <th className="py-3 px-4">الأصناف</th>
              <th className="py-3 px-4">المبلغ الإجمالي</th>
              <th className="py-3 px-4">المسدد</th>
              <th className="py-3 px-4">الحالة</th>
              <th className="py-3 px-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {invoices.map((sale) => {
              const itemsCount = sale.items?.length || 0;
              const paidAmount = Number(sale.paidAmount) || (sale.status === 'paid' ? sale.total : 0);
              const isReturn = sale.type === 'return';

              return (
                <tr
                  key={sale.id}
                  className="hover:bg-surface-container/50 transition-colors group"
                >
                  {/* Number */}
                  <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                    <button
                      type="button"
                      onClick={() => onSelectInvoice?.(sale)}
                      className="hover:text-primary hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <span>#{sale.number}</span>
                    </button>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-on-surface-variant text-[11px] font-mono whitespace-nowrap">
                    {new Date(sale.date).toLocaleDateString('ar-DZ')}
                  </td>

                  {/* Items Count */}
                  <td className="py-3.5 px-4 text-on-surface-variant">
                    <span className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] font-bold">
                      {itemsCount} صنف
                    </span>
                  </td>

                  {/* Total */}
                  <td className="py-3.5 px-4 font-mono font-bold text-on-surface whitespace-nowrap">
                    <span className={isReturn ? 'text-purple-600' : ''}>
                      {formatMoney(sale.total)} {currencySymbol}
                    </span>
                  </td>

                  {/* Paid */}
                  <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                    {formatMoney(paidAmount)} {currencySymbol}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <InvoicePaymentStatusBadge
                      status={sale.status}
                      type={sale.type}
                      total={sale.total}
                      paidAmount={sale.paidAmount}
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* View Details */}
                      {onSelectInvoice && (
                        <button
                          type="button"
                          onClick={() => onSelectInvoice(sale)}
                          className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
                          title="معاينة تفاصيل الفاتورة كاملة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Toggle Status */}
                      {onTogglePaymentStatus && !isReturn && (
                        <InvoiceStatusToggleSwitch
                          sale={sale}
                          onToggleStatus={onTogglePaymentStatus}
                          isToggling={isToggling}
                          currentSessionId={currentSessionId}
                        />
                      )}

                      {/* Recall to Cart */}
                      {onRecallToCart && !isReturn && (
                        <button
                          type="button"
                          onClick={() => onRecallToCart(sale)}
                          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all cursor-pointer"
                          title="استرجاع الفاتورة كاملة إلى السلة"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Full Return */}
                      {onFullReturn && !isReturn && (
                        <button
                          type="button"
                          onClick={() => onFullReturn(sale)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 transition-all cursor-pointer"
                          title="إرجاع الفاتورة كاملة (مرتجع)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
