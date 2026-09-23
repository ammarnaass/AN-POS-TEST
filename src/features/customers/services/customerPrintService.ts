import type { Customer } from '@/types';
import type { PaymentVoucherData, CustomerStatementEntry } from '../types';
import type { CustomerDebtAgingSummary } from './customerStatementService';

export function printPaymentVoucher(
  voucher: PaymentVoucherData,
  shopName = 'نقطة البيع',
  currencySymbol = 'دج'
): void {
  const methodNames: Record<string, string> = {
    cash: 'نقداً (Espèce)',
    baridimob: 'بريدي موب / CCP',
    check: 'شيك بنكي (Chèque)',
    transfer: 'تحويل بنكي (Virement)',
  };
  try {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;
    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>وصل تسديد - ${voucher.customerName}</title>
      <style>
        @page { size: 80mm auto; margin: 5mm; }
        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; padding: 10px; color: #0f172a; font-size: 13px; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 10px; margin-bottom: 12px; }
        .title { font-size: 17px; font-weight: 900; margin: 4px 0; color: #0046a8; }
        .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .amount-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; text-align: center; padding: 10px; margin: 12px 0; }
        .amount-val { font-size: 22px; font-weight: 900; color: #15803d; font-family: monospace; }
        .badge { text-align: center; padding: 6px; border-radius: 6px; margin: 10px 0; font-weight: 900; }
        .badge-paid { border: 2px solid #16a34a; color: #16a34a; background: #f0fdf4; }
        .badge-debt { border: 1px dashed #dc2626; color: #dc2626; background: #fef2f2; }
        .alloc-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; }
        .alloc-table th { border-bottom: 1px solid #cbd5e1; color: #64748b; padding: 3px 2px; }
        .alloc-table td { border-bottom: 1px dotted #e2e8f0; padding: 3px 2px; }
        .footer { text-align: center; border-top: 1px dashed #94a3b8; padding-top: 10px; margin-top: 16px; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-weight: 900; font-size: 15px;">${shopName}</div>
        <div class="title">وصل تسديد دين</div>
        <div style="color: #64748b; font-size: 11px;">${new Date(voucher.date).toLocaleString('ar-DZ')}</div>
      </div>
      <div class="row"><span>الزبون:</span><strong>${voucher.customerName}</strong></div>
      ${voucher.customerPhone ? `<div class="row"><span>الهاتف:</span><span dir="ltr">${voucher.customerPhone}</span></div>` : ''}
      <div class="row"><span>طريقة الدفع:</span><strong>${methodNames[voucher.method] || voucher.method}</strong></div>
      ${voucher.note ? `<div class="row"><span>ملاحظة:</span><span>${voucher.note}</span></div>` : ''}
      <div class="amount-box">
        <div style="font-size: 11px; font-weight: bold; color: #15803d;">المبلغ المسدد</div>
        <div class="amount-val">${voucher.amount.toLocaleString('fr-DZ')} ${currencySymbol}</div>
      </div>
      <div class="row"><span>الرصيد السابق:</span><span>${voucher.previousBalance.toLocaleString('fr-DZ')} ${currencySymbol}</span></div>
      <div class="row" style="font-weight: 900; font-size: 14px; color: ${voucher.newBalance > 0 ? '#b91c1c' : '#059669'};">
        <span>${voucher.newBalance < 0 ? 'الرصيد الدائن:' : 'الرصيد المتبقي:'}</span>
        <span>${Math.abs(voucher.newBalance).toLocaleString('fr-DZ')} ${currencySymbol}</span>
      </div>

      ${
        voucher.newBalance <= 0
          ? '<div class="badge badge-paid">✓ تمت تبرئة الذمة — الحساب مسدد بالكامل</div>'
          : `<div class="badge badge-debt">⚠ متبقي بذمة الزبون: ${voucher.newBalance.toLocaleString('fr-DZ')} ${currencySymbol}</div>`
      }

      ${
        voucher.allocations && voucher.allocations.length > 0
          ? `
          <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
            <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; color: #334155;">تسوية الفواتير المعلقة (FIFO):</div>
            <table class="alloc-table">
              <thead>
                <tr>
                  <th style="text-align: right;">الفاتورة</th>
                  <th style="text-align: left;">المسدد</th>
                  <th style="text-align: left;">المتبقي</th>
                  <th style="text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${voucher.allocations
                  .map(
                    (a) => `
                  <tr>
                    <td style="text-align: right;">#${a.invoiceNumber || a.saleId.slice(0, 8)}</td>
                    <td style="text-align: left; font-weight: bold; color: #16a34a;">${a.allocatedAmount.toLocaleString('fr-DZ')}</td>
                    <td style="text-align: left; color: ${a.remainingDebt > 0 ? '#dc2626' : '#64748b'};">${a.remainingDebt.toLocaleString('fr-DZ')}</td>
                    <td style="text-align: center;">${a.newStatus === 'paid' ? 'مسددة' : 'جزئية'}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
          : ''
      }

      <div class="footer">
        <div>شكراً لتعاملكم معنا ووفائكم!</div>
        <div style="margin-top: 6px;">توقيع وختم المتجر: _______________</div>
      </div>
      <script>
        window.onload = () => { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `);
    printWindow.document.close();
  } catch (err) {
    console.warn('Failed to open or write print payment window:', err);
  }
}

export function printCustomerStatement(
  customer: Customer,
  entries: CustomerStatementEntry[],
  shopName = 'متجرنا',
  shopPhone = '—',
  currencySymbol = 'دج',
  agingSummary?: CustomerDebtAgingSummary
): void {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) return;
  const totalSales = entries.filter((e) => e.type === 'sale').reduce((sum, e) => sum + e.debit, 0);
  const totalPayments = entries.filter((e) => e.type === 'payment').reduce((sum, e) => sum + e.credit, 0);

  const openingEntry = entries.find((e) => e.type === 'opening_balance' || e.type === 'previous_balance');
  const openingBalanceVal = openingEntry ? openingEntry.runningBalance : 0;
  const hasOpening = Math.abs(openingBalanceVal) >= 0.01;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>كشف حساب زبون - ${customer.name}</title>
      <style>
        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; padding: 25px; color: #0f172a; font-size: 12px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0046a8; padding-bottom: 12px; margin-bottom: 16px; }
        .title { font-size: 20px; font-weight: 900; color: #0046a8; }
        .info-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; }
        .summary-grid { display: grid; grid-template-columns: repeat(${hasOpening ? '4' : '3'}, 1fr); gap: 10px; margin-bottom: 18px; }
        .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; }
        .card-val { font-size: 16px; font-weight: bold; margin-top: 4px; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #0046a8; color: white; padding: 8px 10px; font-size: 11px; text-align: right; }
        td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; text-align: right; font-size: 11px; }
        .debit { color: #dc2626; font-weight: bold; }
        .credit { color: #16a34a; font-weight: bold; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">${shopName}</div>
          <div style="color: #64748b; font-size: 11px;">الهاتف: ${shopPhone}</div>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 16px; font-weight: bold; color: #0046a8;">كشف حساب ديون الزبون</div>
          <div style="color: #64748b; font-size: 11px;">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-DZ')}</div>
        </div>
      </div>

      <div class="info-box">
        <div><strong>الزبون:</strong> ${customer.name}</div>
        <div><strong>الهاتف:</strong> ${customer.phone || '—'}</div>
        <div><strong>سقف الائتمان:</strong> ${customer.creditLimit > 0 ? customer.creditLimit.toLocaleString('fr-DZ') + ' ' + currencySymbol : 'غير محدد'}</div>
      </div>

      <div class="summary-grid">
        ${hasOpening ? `
          <div class="card" style="background: #fffbeb; border-color: #fde68a;">
            <div style="color: #92400e; font-size: 11px;">${openingEntry?.type === 'previous_balance' ? 'رصيد منقول لما قبل الفترة' : 'الرصيد الافتتاحي السابق'}</div>
            <div class="card-val" style="color: #b45309;">${openingBalanceVal.toLocaleString('fr-DZ')} ${currencySymbol}</div>
          </div>
        ` : ''}
        <div class="card">
          <div style="color: #64748b; font-size: 11px;">إجمالي المشتريات</div>
          <div class="card-val" style="color: #0046a8;">${totalSales.toLocaleString('fr-DZ')} ${currencySymbol}</div>
        </div>
        <div class="card">
          <div style="color: #64748b; font-size: 11px;">إجمالي التسديدات</div>
          <div class="card-val" style="color: #16a34a;">${totalPayments.toLocaleString('fr-DZ')} ${currencySymbol}</div>
        </div>
        <div class="card" style="background: ${customer.balance > 0 ? '#fef2f2' : '#f0fdf4'}; border-color: ${customer.balance > 0 ? '#f87171' : '#86efac'};">
          <div style="color: #64748b; font-size: 11px;">الرصيد المتبقي المستحق</div>
          <div class="card-val" style="color: ${customer.balance > 0 ? '#dc2626' : '#16a34a'};">${customer.balance.toLocaleString('fr-DZ')} ${currencySymbol}</div>
        </div>
      </div>

      ${
        agingSummary && agingSummary.totalOverdue > 0
          ? `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: #1e293b;">
            تحليل أعمار الديون المستحقة (${agingSummary.unpaidInvoicesCount} فواتير معلقة • أقدم فاتورة منذ ${agingSummary.oldestInvoiceDays} يوم):
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
            ${agingSummary.buckets
              .map(
                (b) => `
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px; background: white;">
                <div style="font-size: 10px; color: #64748b;">${b.label}</div>
                <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: ${
                  b.severity === 'critical'
                    ? '#dc2626'
                    : b.severity === 'warning'
                    ? '#d97706'
                    : '#2563eb'
                }; margin-top: 2px;">
                  ${b.amount.toLocaleString('fr-DZ')} ${currencySymbol}
                </div>
                <div style="font-size: 9px; color: #94a3b8;">${b.invoicesCount} فاتورة</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }

      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>النوع</th>
            <th>البيان</th>
            <th style="text-align: center;">المدين (+)</th>
            <th style="text-align: center;">الدائن (-)</th>
            <th style="text-align: center;">الرصيد التراكمي</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => `
            <tr>
              <td>${new Date(e.date).toLocaleDateString('ar-DZ')}</td>
              <td>${
                e.type === 'sale'
                  ? 'فاتورة بيع'
                  : e.type === 'payment'
                  ? 'دفعة تسديد'
                  : e.type === 'opening_balance'
                  ? 'دين افتتاحي'
                  : 'رصيد منقول'
              }</td>
              <td>${e.description}</td>
              <td style="text-align: center;" class="debit">${e.debit > 0 ? e.debit.toLocaleString('fr-DZ') + ' ' + currencySymbol : '—'}</td>
              <td style="text-align: center;" class="credit">${e.credit > 0 ? e.credit.toLocaleString('fr-DZ') + ' ' + currencySymbol : '—'}</td>
              <td style="text-align: center; font-weight: bold; font-family: monospace;">${e.runningBalance.toLocaleString('fr-DZ')} ${currencySymbol}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>توقيع واستلام الزبون: __________________</div>
        <div>ختم وتوقيع الإدارة: __________________</div>
      </div>
      <script>
        window.onload = () => { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function printDebtsReport(
  indebtedList: Customer[],
  totalDebt: number,
  shopName = 'متجرنا',
  currencySymbol = 'دج'
): void {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>تقرير ديون الزبائن</title>
      <style>
        body { font-family: 'Cairo', system-ui, sans-serif; padding: 25px; color: #0f172a; font-size: 12px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0046a8; padding-bottom: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #0046a8; color: white; padding: 8px 10px; font-size: 11px; text-align: right; }
        td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; font-size: 11px; text-align: right; }
        .total-box { background: #fef2f2; border: 1px solid #f87171; border-radius: 8px; padding: 12px; text-align: center; font-size: 16px; font-weight: bold; color: #b91c1c; margin-bottom: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div style="font-size: 18px; font-weight: 900; color: #0046a8;">${shopName}</div>
          <div>تقرير متابعة ديون الزبائن المستحقة</div>
        </div>
        <div style="text-align: left; color: #64748b;">
          <div>التاريخ: ${new Date().toLocaleDateString('ar-DZ')}</div>
          <div>عدد المدينين: ${indebtedList.length} زبون</div>
        </div>
      </div>

      <div class="total-box">
        إجمالي الديون القائمة: ${totalDebt.toLocaleString('fr-DZ')} ${currencySymbol}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>اسم الزبون</th>
            <th>رقم الهاتف</th>
            <th style="text-align: center;">سقف الدين</th>
            <th style="text-align: center;">الدين المستحق</th>
            <th style="text-align: center;">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${indebtedList.map((c, i) => `
            <tr>
              <td>${i + 1}</td>
              <td><strong>${c.name}</strong></td>
              <td dir="ltr">${c.phone || '—'}</td>
              <td style="text-align: center;">${c.creditLimit > 0 ? c.creditLimit.toLocaleString('fr-DZ') : 'غير محدد'}</td>
              <td style="text-align: center; font-weight: bold; color: #dc2626; font-family: monospace;">${c.balance.toLocaleString('fr-DZ')} ${currencySymbol}</td>
              <td style="text-align: center;">${c.creditLimit > 0 && c.balance >= c.creditLimit ? 'متجاوز السقف' : 'مدين'}</td>
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
