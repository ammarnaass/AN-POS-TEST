import * as XLSX from 'xlsx';
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

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الزبائن والديون');
  XLSX.writeFile(wb, `ديون_الزبائن_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function parseCustomersFromExcel(file: File): Promise<Customer[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
        const imported: Customer[] = data.map((row) => ({
          id: generateId(),
          name: row['الاسم'] || row['name'] || 'زبون بدون اسم',
          phone: String(row['الهاتف'] || row['phone'] || ''),
          creditLimit: Number(row['سقف الدين'] || row['creditLimit'] || 0),
          balance: Number(row['الدين'] || row['الرصيد'] || row['balance'] || 0),
        }));
        resolve(imported);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}
