import React from 'react';
import { RefreshCw, Users, MessageSquare, Phone, DollarSign, FileText, Edit2, Trash2, PlusCircle } from 'lucide-react';
import type { Customer } from '@/types';
import { formatCustomerMoney, getCreditStatus, getWhatsAppUrl } from '../services/customerStatus';

export interface CustomerTableProps {
  customers: Customer[];
  currencySymbol?: string;
  storeName?: string;
  shopName?: string;
  getCustomerSales?: (id: string) => any[];
  onOpenPayment: (customer: Customer) => void;
  onOpenAddDebt?: (customer: Customer) => void;
  onOpenStatement: (customer: Customer) => void;
  onEditCustomer?: (customer: Customer) => void;
  onOpenEdit?: (customer: Customer) => void;
  onDeleteCustomer?: (customer: Customer) => void;
  onOpenDelete?: (customer: Customer) => void;
  isLoading?: boolean;
  currentPage?: number;
  itemsPerPage?: number;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  currencySymbol = 'دج',
  storeName,
  shopName,
  getCustomerSales,
  onOpenPayment,
  onOpenAddDebt,
  onOpenStatement,
  onEditCustomer,
  onOpenEdit,
  onDeleteCustomer,
  onOpenDelete,
  isLoading = false,
  currentPage = 1,
  itemsPerPage = 12,
}) => {
  const effectiveShopName = storeName || shopName || 'متجرنا';
  const handleEdit = onEditCustomer || onOpenEdit || (() => {});
  const handleDelete = onDeleteCustomer || onOpenDelete || (() => {});

  // Safe accessor to prevent "getCustomerSales is not a function"
  const safeGetSales = (id: string) => {
    if (typeof getCustomerSales === 'function') {
      try {
        const res = getCustomerSales(id);
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  return (
    <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-right border-collapse text-xs">
          <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              <th className="py-3.5 px-4 min-w-[200px]">الزبون</th>
              <th className="py-3.5 px-4 min-w-[150px]">الاتصال والمتابعة</th>
              <th className="py-3.5 px-4 text-center">إجمالي المشتريات</th>
              <th className="py-3.5 px-4 text-center min-w-[140px]">الدين الحالي</th>
              <th className="py-3.5 px-4 text-center min-w-[160px]">سقف الائتمان والاستهلاك</th>
              <th className="py-3.5 px-4 text-center min-w-[180px]">إجراءات الحساب</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  <p className="font-bold">جاري تحميل سجل الزبائن...</p>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                  <Users className="w-12 h-12 opacity-25 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-bold text-on-surface">لا توجد نتائج مطابقة</p>
                  <p className="text-xs mt-1">جرّب تغيير عبارة البحث أو الفلتر المحدد</p>
                </td>
              </tr>
            ) : (
              customers.map((customer, index) => {
                const customerSales = safeGetSales(customer.id);
                const totalPurchases = customerSales.reduce(
                  (sum, s) => sum + (Number(s?.total) || 0),
                  0
                );
                const creditStatus = getCreditStatus(customer);
                const ratio =
                  customer.creditLimit > 0
                    ? (Math.max(0, customer.balance) / customer.creditLimit) * 100
                    : 0;
                const waUrl = getWhatsAppUrl(customer, effectiveShopName, currencySymbol);

                return (
                  <tr
                    key={customer.id}
                    className={`hover:bg-surface-container/60 transition-colors ${
                      creditStatus === 'exceeded'
                        ? 'bg-red-500/5'
                        : creditStatus === 'warning'
                        ? 'bg-amber-500/5'
                        : ''
                    }`}
                  >
                    {/* # Index */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-on-surface-variant">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>

                    {/* Customer Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                          {customer.name.trim().charAt(0) || 'ز'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-on-surface truncate">{customer.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {customer.customerType === 'wholesale' && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-black border border-blue-500/30">
                                تاجر جملة (Gros)
                              </span>
                            )}
                            {customer.customerType === 'semi_wholesale' && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/30">
                                نصف جملة
                              </span>
                            )}
                            {customer.rc && (
                              <span className="text-[10px] text-on-surface-variant font-mono">
                                س.ت: {customer.rc}
                              </span>
                            )}
                            {creditStatus === 'in_credit' && (
                              <span className="px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-700 dark:text-teal-400 text-[10px] font-black border border-teal-500/30">
                                رصيد دائن (دفعة مسبقة)
                              </span>
                            )}
                            {creditStatus === 'settled' && (
                              <span className="px-2 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                                خالص (لا يوجد دين)
                              </span>
                            )}
                            {creditStatus === 'exceeded' && (
                              <span className="px-2 py-0.2 rounded-md bg-red-500/15 text-red-600 text-[10px] font-black animate-pulse">
                                تجاوز سقف الدين
                              </span>
                            )}
                            {creditStatus === 'warning' && (
                              <span className="px-2 py-0.2 rounded-md bg-amber-500/15 text-amber-700 text-[10px] font-bold">
                                قريب من السقف
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact & WhatsApp Reminder */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-on-surface font-bold text-xs" dir="ltr">
                          {customer.phone || '—'}
                        </span>
                        {customer.phone && customer.balance > 0 && waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-all cursor-pointer"
                            title="إرسال تذكير بالدين عبر واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {customer.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-all cursor-pointer"
                            title="اتصال هاتفي"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Total Purchases */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-on-surface">
                      {formatCustomerMoney(totalPurchases)}{' '}
                      <span className="text-[10px] text-on-surface-variant font-cairo">{currencySymbol}</span>
                    </td>

                    {/* Current Balance / Debt */}
                    <td className="py-3.5 px-4 text-center">
                      {customer.balance < 0 ? (
                        <span className="font-mono font-black text-sm px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/30">
                          <span>+{formatCustomerMoney(Math.abs(customer.balance))}</span>
                          <span className="text-[10px] font-cairo">دائن ({currencySymbol})</span>
                        </span>
                      ) : (
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg inline-block ${
                            customer.balance > 0
                              ? 'text-red-600 bg-red-500/10 font-mono'
                              : 'text-emerald-600 bg-emerald-500/10 font-mono'
                          }`}
                        >
                          {formatCustomerMoney(customer.balance)}{' '}
                          <span className="text-[10px] font-cairo">{currencySymbol}</span>
                        </span>
                      )}
                    </td>

                    {/* Credit Limit & Consumption Gauge */}
                    <td className="py-3.5 px-4">
                      {customer.creditLimit > 0 ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-on-surface-variant">
                              السقف: {formatCustomerMoney(customer.creditLimit)}
                            </span>
                            <span
                              className={`font-black ${
                                ratio >= 100
                                  ? 'text-red-600'
                                  : ratio >= 80
                                  ? 'text-amber-600'
                                  : 'text-primary'
                              }`}
                            >
                              {Math.round(ratio)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                ratio >= 100
                                  ? 'bg-red-500'
                                  : ratio >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${Math.min(100, ratio)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-on-surface-variant block text-center">
                          سقف غير محدد
                        </span>
                      )}
                    </td>

                    {/* Financial Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Direct Debt Addition Button */}
                        {onOpenAddDebt && (
                          <button
                            onClick={() => onOpenAddDebt(customer)}
                            className="px-2 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/25 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="إضافة قيد دين مباشر على حساب هذا الزبون"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>دين</span>
                          </button>
                        )}

                        {/* Quick Payment Button */}
                        <button
                          onClick={() => onOpenPayment(customer)}
                          disabled={customer.balance <= 0}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs disabled:opacity-40 disabled:hover:bg-emerald-600 cursor-pointer active:scale-95"
                          title="تسجيل تسديد جديد"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>تسديد</span>
                        </button>

                        {/* Statement Button */}
                        <button
                          onClick={() => onOpenStatement(customer)}
                          className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
                          title="عرض وطباعة كشف الحساب"
                        >
                          <FileText className="w-4 h-4 text-primary" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
                          title="تعديل بيانات الزبون"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(customer)}
                          className="p-1.5 rounded-xl bg-surface-container hover:bg-red-500/10 text-on-surface-variant hover:text-red-600 border border-outline-variant/20 transition-all cursor-pointer"
                          title="حذف الزبون"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
