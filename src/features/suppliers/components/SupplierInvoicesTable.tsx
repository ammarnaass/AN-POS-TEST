import React from 'react';
import { Search, RefreshCw, FileText, Eye } from 'lucide-react';
import type { EnrichedPurchase } from '../types';
import { formatSupplierMoney } from '../services/supplierStatus';

interface SupplierInvoicesTableProps {
  purchases: EnrichedPurchase[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currencySymbol?: string;
  onViewInvoice: (invoice: EnrichedPurchase) => void;
}

export const SupplierInvoicesTable: React.FC<SupplierInvoicesTableProps> = ({
  purchases,
  isLoading,
  searchQuery,
  setSearchQuery,
  currencySymbol = 'دج',
  onViewInvoice,
}) => {
  const filteredList = purchases.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return p.number.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-low/95 p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو اسم المورد..."
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
          />
        </div>

        <div className="text-xs text-on-surface-variant font-bold">
          إجمالي فواتير التوريد: <strong className="text-on-surface font-mono">{filteredList.length}</strong>
        </div>
      </div>

      <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">المورد</th>
                <th className="py-3 px-4 text-center">عدد الأصناف</th>
                <th className="py-3 px-4 text-center">إجمالي الفاتورة</th>
                <th className="py-3 px-4 text-center">المدفوع</th>
                <th className="py-3 px-4 text-center">المتبقي</th>
                <th className="py-3 px-4 text-center">الحالة</th>
                <th className="py-3 px-4 text-center">معاينة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-on-surface-variant">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="font-bold">جاري تحميل فواتير الشراء...</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-on-surface-variant">
                    <FileText className="w-10 h-10 opacity-25 mx-auto mb-2 text-primary" />
                    <p className="font-bold text-sm text-on-surface">لا توجد فواتير توريد مسجلة</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((inv) => {
                  const rem = (inv as any).remainingBalance ?? (inv.total - ((inv as any).paidAmount || 0));
                  const isPaid = rem <= 0;
                  const isPartial = (inv as any).paidAmount > 0 && rem > 0;

                  return (
                    <tr key={inv.id} className="hover:bg-surface-container/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{inv.number}</td>
                      <td className="py-3 px-4 font-mono text-on-surface-variant">
                        {new Date(inv.date).toLocaleDateString('ar-DZ')}
                      </td>
                      <td className="py-3 px-4 font-bold text-on-surface">{inv.supplierName}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className="bg-surface-container px-2 py-0.5 rounded-lg">
                          {inv.itemsCount} صنف
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black text-sm">
                        {formatSupplierMoney(inv.total)} <span className="text-[10px] font-cairo font-bold">{currencySymbol}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">
                        {formatSupplierMoney((inv as any).paidAmount || 0)}
                      </td>
                      <td className={`py-3 px-4 text-center font-mono font-bold ${rem > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                        {formatSupplierMoney(rem)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : isPartial
                              ? 'bg-amber-500/15 text-amber-800'
                              : 'bg-red-500/10 text-red-700'
                          }`}
                        >
                          {isPaid ? 'مدفوعة بالكامل' : isPartial ? 'دفع جزئي' : 'غير مدفوعة'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary transition-all cursor-pointer"
                          title="عرض تفاصيل الفاتورة والسلع"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
