import type { Supplier } from '@/types';
import type { SupplierPaymentVoucherData, SupplierStatementEntry } from '../types';

export function printPaymentVoucher(
  voucher: SupplierPaymentVoucherData,
  shopName = 'المتجر',
  currencySymbol = 'دج'
): void {
  const methodNames: Record<string, string> = {
    cash: 'نقداً (Espèce)',
    check: 'صك بنكي (Chèque)',
    transfer: 'تحويل بنكي (Virement)',
    baridimob: 'بريدي موب / CCP',
  };
  const printWindow = window.open('', '_blank', 'width=450,height=650');
  if (!printWindow) return;
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>وصل تسليم دفعة لمورد - ${voucher.supplierName}</title>
      <style>
        @page { size: 80mm auto; margin: 5mm; }
        body { font-family: 'Cairo', system-ui, sans-serif; padding: 10px; color: #0f172a; font-size: 13px; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 10px; margin-bottom: 12px; }
        .title { font-size: 17px; font-weight: 900; margin: 4px 0; color: #0046a8; }
        .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .amount-box { background: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; text-align: center; padding: 10px; margin: 12px 0; }
        .amount-val { font-size: 22px; font-weight: 900; color: #1d4ed8; font-family: monospace; }
        .footer { text-align: center; border-top: 1px dashed #94a3b8; padding-top: 10px; margin-top: 16px; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-weight: 900; font-size: 15px;">${shopName}</div>
        <div class="title">وصل تسليم دفعة للمورد</div>
        <div style="color: #64748b; font-size: 11px;">${new Date(voucher.date).toLocaleString('ar-DZ')}</div>
      </div>
      <div class="row"><span>المورد:</span><strong>${voucher.supplierName}</strong></div>
      ${voucher.supplierPhone ? `<div class="row"><span>الهاتف:</span><span dir="ltr">${voucher.supplierPhone}</span></div>` : ''}
      <div class="row"><span>طريقة الدفع:</span><strong>${methodNames[voucher.method] || voucher.method}</strong></div>
      ${voucher.note ? `<div class="row"><span>ملاحظة:</span><span>${voucher.note}</span></div>` : ''}
      <div class="amount-box">
        <div style="font-size: 11px; font-weight: bold; color: #1d4ed8;">المبلغ المسدد للمورد</div>
        <div class="amount-val">${voucher.amount.toLocaleString('fr-DZ')} ${currencySymbol}</div>
      </div>
      <div class="row"><span>المستحقات السابقة:</span><span>${voucher.previousBalance.toLocaleString('fr-DZ')} ${currencySymbol}</span></div>
      <div class="row" style="font-weight: 900; font-size: 14px; color: #b45309;"><span>المستحقات المتبقية:</span><span>${voucher.newBalance.toLocaleString('fr-DZ')} ${currencySymbol}</span></div>
      <div class="footer">
        <div>تم التسديد بموجب هذا السند</div>
        <div style="margin-top: 10px;">توقيع واستلام المورد: _______________</div>
      </div>
      <script>
        window.onload = () => { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function printSupplierStatement(
  supplier: Supplier,
  entries: SupplierStatementEntry[],
  shopName = 'المتجر',
  phone = '—',
  currencySymbol = 'دج'
): void {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) return;
  const totalPurchases = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalPaid = entries.reduce((sum, e) => sum + e.credit, 0);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>كشف حساب مورد - ${supplier.name}</title>
      <style>
        body { font-family: 'Cairo', system-ui, sans-serif; padding: 25px; color: #0f172a; font-size: 12px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0046a8; padding-bottom: 12px; margin-bottom: 16px; }
        .title { font-size: 20px; font-weight: 900; color: #0046a8; }
        .info-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
        .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; }
        .card-val { font-size: 16px; font-weight: bold; margin-top: 4px; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #0046a8; color: white; padding: 8px 10px; font-size: 11px; text-align: right; }
        td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: right; font-size: 11px; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">${shopName}</div>
          <div style="color: #64748b; font-size: 11px;">الهاتف: ${phone}</div>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 16px; font-weight: bold; color: #0046a8;">كشف حساب مورد ومستحقات التوريد</div>
          <div style="color: #64748b; font-size: 11px;">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-DZ')}</div>
        </div>
      </div>

      <div class="info-box">
        <div><strong>المورد:</strong> ${supplier.name}</div>
        <div><strong>الهاتف:</strong> ${supplier.phone || '—'}</div>
      </div>

      <div class="summary-grid">
        <div class="card">
          <div style="color: #64748b; font-size: 11px;">إجمالي المشتريات منه</div>
          <div class="card-val" style="color: #0046a8;">${totalPurchases.toLocaleString('fr-DZ')} ${currencySymbol}</div>
        </div>
        <div class="card">
          <div style="color: #64748b; font-size: 11px;">إجمالي المسدد له</div>
          <div class="card-val" style="color: #16a34a;">${totalPaid.toLocaleString('fr-DZ')} ${currencySymbol}</div>
        </div>
        <div class="card" style="background: ${supplier.balance > 0 ? '#fffbeb' : '#f0fdf4'}; border-color: ${supplier.balance > 0 ? '#fcd34d' : '#86efac'};">
          <div style="color: #64748b; font-size: 11px;">المستحقات المتبقية له</div>
          <div class="card-val" style="color: ${supplier.balance > 0 ? '#b45309' : '#16a34a'};">${supplier.balance.toLocaleString('fr-DZ')} ${currencySymbol}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>رقم المعاملة</th>
            <th>البيان</th>
            <th style="text-align: center;">قيمة البضاعة (+)</th>
            <th style="text-align: center;">المدفوع له (-)</th>
            <th style="text-align: center;">الرصيد التراكمي المستحق</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map((e) => `
            <tr>
              <td>${new Date(e.date).toLocaleDateString('ar-DZ')}</td>
              <td style="font-family: monospace;">${e.number}</td>
              <td>${e.description}</td>
              <td style="text-align: center; color: #b45309; font-weight: bold;">${e.debit > 0 ? e.debit.toLocaleString('fr-DZ') + ' ' + currencySymbol : '—'}</td>
              <td style="text-align: center; color: #16a34a; font-weight: bold;">${e.credit > 0 ? e.credit.toLocaleString('fr-DZ') + ' ' + currencySymbol : '—'}</td>
              <td style="text-align: center; font-weight: bold; font-family: monospace;">${e.runningBalance.toLocaleString('fr-DZ')} ${currencySymbol}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>توقيع واستلام المورد: __________________</div>
        <div>ختم وتوقيع المحل: __________________</div>
      </div>
      <script>
        window.onload = () => { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function printPayablesReport(
  suppliers: Supplier[],
  totalDebt: number,
  shopName = 'المتجر',
  currencySymbol = 'دج'
): void {
  const indebtedList = suppliers.filter((s) => s.balance > 0).sort((a, b) => b.balance - a.balance);
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>تقرير مستحقات الموردين</title>
      <style>
        body { font-family: 'Cairo', system-ui, sans-serif; padding: 25px; color: #0f172a; font-size: 12px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0046a8; padding-bottom: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #0046a8; color: white; padding: 8px 10px; font-size: 11px; text-align: right; }
        td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; font-size: 11px; text-align: right; }
        .total-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; text-align: center; font-size: 16px; font-weight: bold; color: #b45309; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div style="font-size: 18px; font-weight: 900; color: #0046a8;">${shopName}</div>
          <div>تقرير الديون والمستحقات القائمة للموردين</div>
        </div>
        <div style="text-align: left; color: #64748b;">
          <div>التاريخ: ${new Date().toLocaleDateString('ar-DZ')}</div>
          <div>عدد الموردين المستحقين: ${indebtedList.length} مورد</div>
        </div>
      </div>

      <div class="total-box">
        إجمالي المستحقات الواجب دفعها للموردين: ${totalDebt.toLocaleString('fr-DZ')} ${currencySymbol}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>اسم المورد</th>
            <th>رقم الهاتف</th>
            <th style="text-align: center;">المستحقات القائمة</th>
            <th style="text-align: center;">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${indebtedList.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${s.name}</strong></td>
              <td dir="ltr">${s.phone || '—'}</td>
              <td style="text-align: center; font-weight: bold; color: #b45309; font-family: monospace;">${s.balance.toLocaleString('fr-DZ')} ${currencySymbol}</td>
              <td style="text-align: center;">مستحقات معلقة</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <script>
        window.onload = () => { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
