import React from 'react';
import {
  Truck,
  MessageSquare,
  Phone,
  ShoppingCart,
  DollarSign,
  FileText,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import type { Supplier, SupplierEntry } from '@/types';
import { formatSupplierMoney, getSupplierWhatsAppUrl } from '../services/supplierStatus';

interface SupplierTableProps {
  suppliers: Supplier[];
  supplierEntries: SupplierEntry[];
  isLoading: boolean;
  currentPage: number;
  itemsPerPage: number;
  currencySymbol?: string;
  shopName?: string;
  onOpenPurchase: (supplierId: string) => void;
  onOpenPayment: (supplier: Supplier) => void;
  onOpenStatement: (supplierId: string) => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplier: Supplier) => void;
}

export const SupplierTable: React.FC<SupplierTableProps> = ({
  suppliers,
  supplierEntries,
  isLoading,
  currentPage,
  itemsPerPage,
  currencySymbol = 'دج',
  shopName = 'المتجر',
  onOpenPurchase,
  onOpenPayment,
  onOpenStatement,
  onEditSupplier,
  onDeleteSupplier,
}) => {
  return (
    <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-right border-collapse text-xs">
          <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              <th className="py-3.5 px-4 min-w-[200px]">المورد</th>
              <th className="py-3.5 px-4 min-w-[150px]">بيانات الاتصال والتواصل</th>
              <th className="py-3.5 px-4 text-center">طلبيات التوريد</th>
              <th className="py-3.5 px-4 text-center min-w-[150px]">المستحقات القائمة</th>
              <th className="py-3.5 px-4 text-center min-w-[130px]">الحالة</th>
              <th className="py-3.5 px-4 text-center min-w-[200px]">إجراءات الحساب والتوريد</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  <p className="font-bold">جاري تحميل سجل الموردين...</p>
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                  <Truck className="w-12 h-12 opacity-25 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-bold text-on-surface">لا يوجد موردون مطابقون</p>
                  <p className="text-xs mt-1">قم بإضافة مورد جديد أو تعديل معايير البحث</p>
                </td>
              </tr>
            ) : (
              suppliers.map((supplier, index) => {
                const entryCount = supplierEntries.filter(
                  (e) => e.supplierId === supplier.id && e.type === 'purchase'
                ).length;
                const waUrl = getSupplierWhatsAppUrl(supplier, shopName);

                return (
                  <tr key={supplier.id} className="hover:bg-surface-container/60 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-on-surface-variant">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>

                    {/* Supplier Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                          {supplier.name.trim().charAt(0) || 'م'}
                        </div>
                        <div>
                          <h4 className="font-bold text-on-surface truncate">{supplier.name}</h4>
                          <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">
                            ID: {supplier.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Contact & WhatsApp */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-on-surface font-bold text-xs" dir="ltr">
                          {supplier.phone || '—'}
                        </span>
                        {supplier.phone && waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-all cursor-pointer"
                            title="تواصل B2B عبر واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {supplier.phone && (
                          <a
                            href={`tel:${supplier.phone}`}
                            className="p-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-all cursor-pointer"
                            title="اتصال هاتفي"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Orders count */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-on-surface">
                      <span className="bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/15">
                        {entryCount} طلبيات
                      </span>
                    </td>

                    {/* Balance */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg inline-block ${
                          supplier.balance > 0
                            ? 'text-amber-700 bg-amber-500/15'
                            : 'text-emerald-600 bg-emerald-500/10'
                        }`}
                      >
                        {formatSupplierMoney(supplier.balance)} <span className="text-[10px] font-cairo">{currencySymbol}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {supplier.balance > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 font-bold text-[10px]">
                          مستحقات معلقة
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 font-bold text-[10px]">
                          حساب مسوى (خالص)
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Create Purchase Invoice */}
                        <button
                          onClick={() => onOpenPurchase(supplier.id)}
                          className="px-2.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                          title="إنشاء فاتورة توريد جديدة"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>طلبية</span>
                        </button>

                        {/* Pay Supplier */}
                        <button
                          onClick={() => onOpenPayment(supplier)}
                          disabled={supplier.balance <= 0}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs disabled:opacity-40 cursor-pointer"
                          title="تسجيل تسديد دفعة للمورد"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>تسديد</span>
                        </button>

                        {/* Statement */}
                        <button
                          onClick={() => onOpenStatement(supplier.id)}
                          className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
                          title="كشف الحساب"
                        >
                          <FileText className="w-4 h-4 text-primary" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => onEditSupplier(supplier)}
                          className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
                          title="تعديل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteSupplier(supplier)}
                          className="p-1.5 rounded-xl bg-surface-container hover:bg-red-500/10 text-on-surface-variant hover:text-red-600 border border-outline-variant/20 transition-all cursor-pointer"
                          title="حذف"
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
