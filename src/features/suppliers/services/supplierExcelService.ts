import * as XLSX from 'xlsx';
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

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الموردون والمستحقات');
  XLSX.writeFile(wb, `الموردون_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
