import { exportJsonToExcel } from '@/utils/excel';
import type { Supplier, SupplierEntry } from '@/types';

export function exportSuppliersToExcel(
  suppliers: Supplier[],
  supplierEntries: SupplierEntry[]
): void {
  const data = suppliers.map((s, index) => {
    const ordersCount = supplierEntries.filter(
      (e) => e.supplierId === s.id && e.type === 'purchase'
    ).length;
    return {
      'الرقم': index + 1,
      'اسم المورد': s.name,
      'الهاتف': s.phone || '',
      'عدد الطلبيات': ordersCount,
      'المستحقات القائمة': s.balance,
      'الحالة': s.balance > 0 ? 'مستحقات معلقة' : 'خالص',
    };
  });

  exportJsonToExcel(data, 'الموردون والمستحقات', `الموردون_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
