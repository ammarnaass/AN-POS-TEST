import { exportJsonToExcel, readExcelAsObjects } from '@/utils/excel';
import type { Customer } from '@/types';
import { generateId } from '@/utils';

export function exportCustomersToExcel(
  customers: Customer[],
  getCustomerSales: (id: string) => any[]
): void {
  const data = customers.map((c, index) => {
    const customerSales = getCustomerSales(c.id);
    const totalPurchases = customerSales.reduce((sum, s) => sum + (s.total || 0), 0);
    return {
      'الرقم': index + 1,
      'اسم الزبون': c.name,
      'الهاتف': c.phone || '',
      'إجمالي المشتريات': totalPurchases,
      'الدين الحالي': c.balance,
      'سقف الدين': c.creditLimit,
      'الحالة': c.balance > 0 ? (c.creditLimit > 0 && c.balance >= c.creditLimit ? 'متجاوز السقف' : 'مدين') : 'خالص',
    };
  });

  exportJsonToExcel(data, 'الزبائن والديون', `ديون_الزبائن_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function parseCustomersFromExcel(file: File): Promise<Customer[]> {
  const rows = await readExcelAsObjects(file);
  return rows.map((row) => ({
    id: generateId(),
    name: row['الاسم'] || row['name'] || 'زبون بدون اسم',
    phone: String(row['الهاتف'] || row['phone'] || ''),
    creditLimit: Number(row['سقف الدين'] || row['creditLimit'] || 0),
    balance: Number(row['الدين'] || row['الرصيد'] || row['balance'] || 0),
  }));
}
