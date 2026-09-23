import type { DebtSettlementResult, AddCustomerDebtResult, CustomerStatementSummary } from '../types';

export function printPOSDebtSettlementSlip(
  result: DebtSettlementResult,
  customerName: string,
  customerPhone?: string,
  shopName = 'نقطة البيع',
  currencySymbol = 'دج'
): void {
  const methodNames: Record<string, string> = {
    cash: 'نقداً (Espèce)',
    card: 'بطاقة بنكية',
    transfer: 'تحويل بنكي / بريدي موب',
  };

  try {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;
    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>وصل تحصيل دين - ${customerName}</title>
      <style>
        @page { size: 80mm auto; margin: 5mm; }
        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; padding: 10px; color: #0f172a; font-size: 13px; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 10px; margin-bottom: 12px; }
        .title { font-size: 16px; font-weight: 900; margin: 4px 0; color: #0046a8; }
        .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .amount-box { background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; text-align: center; padding: 10px; margin: 12px 0; }
        .amount-val { font-size: 22px; font-weight: 900; color: #15803d; font-family: monospace; }
        .footer { text-align: center; border-top: 1px dashed #94a3b8; padding-top: 10px; margin-top: 16px; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-weight: 900; font-size: 15px;">${shopName}</div>
        <div class="title">وصل تسديد دين (نقطة البيع)</div>
        <div style="color: #64748b; font-size: 11px;">${new Date(result.timestamp).toLocaleString('ar-DZ')}</div>
        ${result.receiptNumber ? `<div style="font-size: 10px; font-family: monospace; color: #64748b;">رقم الإيصال: #${result.receiptNumber}</div>` : ''}
      </div>
      <div class="row"><span>الزبون:</span><strong>${customerName}</strong></div>
      ${customerPhone ? `<div class="row"><span>الهاتف:</span><span dir="ltr">${customerPhone}</span></div>` : ''}
      <div class="row"><span>طريقة الدفع:</span><strong>${methodNames[result.paymentMethod] || result.paymentMethod}</strong></div>
      <div class="amount-box">
        <div style="font-size: 11px; font-weight: bold; color: #15803d;">المبلغ المسدد</div>
        <div class="amount-val">${result.settledAmount.toLocaleString('fr-DZ')} ${currencySymbol}</div>
      </div>
      <div class="row"><span>الرصيد السابق:</span><span>${result.previousBalance.toLocaleString('fr-DZ')} ${currencySymbol}</span></div>
      <div class="row" style="font-weight: 900; font-size: 14px; color: ${result.newBalance > 0 ? '#b91c1c' : '#059669'};">
        <span>${result.newBalance < 0 ? 'الرصيد الدائن:' : 'الرصيد المتبقي:'}</span>
        <span>${Math.abs(result.newBalance).toLocaleString('fr-DZ')} ${currencySymbol}</span>
      </div>

      ${
        result.newBalance <= 0
          ? '<div style="text-align:center; padding: 6px; border: 2px solid #16a34a; color: #16a34a; background: #f0fdf4; border-radius: 6px; margin: 10px 0; font-weight: 900;">✓ تمت تبرئة الذمة — الحساب مسدد بالكامل</div>'
          : `<div style="text-align:center; padding: 6px; border: 1px dashed #dc2626; color: #dc2626; background: #fef2f2; border-radius: 6px; margin: 10px 0; font-weight: bold;">⚠ متبقي بذمة الزبون: ${result.newBalance.toLocaleString('fr-DZ')} ${currencySymbol}</div>`
      }

      ${
        result.allocations && result.allocations.length > 0
          ? `
          <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
            <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px; color: #334155;">الفواتير المسواة (FIFO):</div>
            <table style="width:100%; border-collapse: collapse; font-size: 10px; text-align: right;">
              <thead>
                <tr style="border-bottom: 1px solid #cbd5e1; color: #64748b;">
                  <th style="padding: 2px;">الفاتورة</th>
                  <th style="padding: 2px; text-align: left;">المسدد</th>
                  <th style="padding: 2px; text-align: left;">المتبقي</th>
                  <th style="padding: 2px; text-align: center;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${result.allocations
                  .map(
                    (a) => `
                  <tr style="border-bottom: 1px dotted #e2e8f0;">
                    <td style="padding: 2px;">#${a.invoiceNumber || a.saleId.slice(0, 8)}</td>
                    <td style="padding: 2px; text-align: left; font-weight: bold; color: #16a34a;">${a.allocatedAmount.toLocaleString('fr-DZ')}</td>
                    <td style="padding: 2px; text-align: left; color: ${a.remainingDebt > 0 ? '#dc2626' : '#64748b'};">${a.remainingDebt.toLocaleString('fr-DZ')}</td>
                    <td style="padding: 2px; text-align: center;">${a.newStatus === 'paid' ? 'مسددة' : 'جزئية'}</td>
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
    console.error('Failed to print debt settlement slip:', err);
  }
}

/**
 * Prints a thermal slip for direct debt addition on a customer.
 */
export function printPOSDebtAdditionSlip(
  result: AddCustomerDebtResult,
  customerName: string,
  customerPhone?: string,
  shopName = 'نقطة البيع',
  currencySymbol = 'دج'
): void {
  try {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;
    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>سند قيد دين - ${customerName}</title>
      <style>
        @page { size: 80mm auto; margin: 5mm; }
        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; padding: 10px; color: #0f172a; font-size: 13px; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 10px; margin-bottom: 12px; }
        .title { font-size: 16px; font-weight: 900; margin: 4px 0; color: #dc2626; }
        .row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .amount-box { background: #fef2f2; border: 2px solid #ef4444; border-radius: 8px; text-align: center; padding: 10px; margin: 12px 0; }
        .amount-val { font-size: 22px; font-weight: 900; color: #dc2626; font-family: monospace; }
        .footer { text-align: center; border-top: 1px dashed #94a3b8; padding-top: 10px; margin-top: 16px; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-weight: 900; font-size: 15px;">${shopName}</div>
        <div class="title">سند قيد دين مباشر (نقطة البيع)</div>
        <div style="color: #64748b; font-size: 11px;">${new Date(result.timestamp).toLocaleString('ar-DZ')}</div>
        ${result.voucherNumber ? `<div style="font-size: 10px; font-family: monospace; color: #64748b;">رقم السند: #${result.voucherNumber}</div>` : ''}
      </div>
      <div class="row"><span>الزبون:</span><strong>${customerName}</strong></div>
      ${customerPhone ? `<div class="row"><span>الهاتف:</span><span dir="ltr">${customerPhone}</span></div>` : ''}
      <div class="row"><span>البيان / السبب:</span><strong>${result.reason || 'قيد دين إضافي'}</strong></div>
      <div class="amount-box">
        <div style="font-size: 11px; font-weight: bold; color: #dc2626;">مبلغ الدين المضاف</div>
        <div class="amount-val">+${result.addedAmount.toLocaleString('fr-DZ')} ${currencySymbol}</div>
      </div>
      <div class="row"><span>الرصيد السابق:</span><span>${result.previousBalance.toLocaleString('fr-DZ')} ${currencySymbol}</span></div>
      <div class="row" style="font-weight: 900; font-size: 14px; color: #b91c1c;">
        <span>إجمالي الدين الجديد:</span>
        <span>${result.newBalance.toLocaleString('fr-DZ')} ${currencySymbol}</span>
      </div>
      <div class="footer">
        <div style="display: flex; justify-content: space-between; margin-top: 10px;">
          <div>توقيع الكاشير: _______</div>
          <div>توقيع الزبون: _______</div>
        </div>
      </div>
      <script>
        window.onload = () => { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `);
    printWindow.document.close();
  } catch (err) {
    console.error('Failed to print debt addition slip:', err);
  }
}

/**
 * Prints a thermal statement of account slip for a customer.
 */
export function printPOSCustomerStatementSlip(
  summary: CustomerStatementSummary,
  customerName: string,
  customerPhone?: string,
  shopName = 'نقطة البيع',
  currencySymbol = 'دج'
): void {
  try {
    const printWindow = window.open('', '_blank', 'width=500,height=750');
    if (!printWindow) return;

    const rows = summary.entries
      .map(
        (e) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 4px 2px;">${e.date ? new Date(e.date).toLocaleDateString('ar-DZ') : '—'}</td>
          <td style="padding: 4px 2px;">${e.description}</td>
          <td style="padding: 4px 2px; text-align: left; color: ${e.debit > 0 ? '#b91c1c' : '#64748b'}; font-family: monospace;">${e.debit > 0 ? e.debit.toLocaleString('fr-DZ') : '—'}</td>
          <td style="padding: 4px 2px; text-align: left; color: ${e.credit > 0 ? '#15803d' : '#64748b'}; font-family: monospace;">${e.credit > 0 ? e.credit.toLocaleString('fr-DZ') : '—'}</td>
          <td style="padding: 4px 2px; text-align: left; font-weight: bold; font-family: monospace;">${e.runningBalance.toLocaleString('fr-DZ')}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>كشف حساب زبون - ${customerName}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; padding: 6px; color: #0f172a; font-size: 12px; line-height: 1.4; }
        .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 8px; margin-bottom: 10px; }
        .title { font-size: 15px; font-weight: 900; margin: 3px 0; color: #0046a8; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #f1f5f9; padding: 4px 2px; font-size: 10px; text-align: right; border-bottom: 1px solid #cbd5e1; }
        .footer { text-align: center; border-top: 1px dashed #94a3b8; padding-top: 8px; margin-top: 12px; font-size: 10px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div style="font-weight: 900; font-size: 14px;">${shopName}</div>
        <div class="title">كشف حساب ديون الزبون</div>
        <div style="font-size: 10px; color: #64748b;">تاريخ الطباعة: ${new Date().toLocaleString('ar-DZ')}</div>
      </div>
      <div><strong>الزبون:</strong> ${customerName} ${customerPhone ? `(${customerPhone})` : ''}</div>
      ${summary.periodFrom || summary.periodTo ? `<div style="font-size: 10px; color: #64748b;">الفترة: ${summary.periodFrom || 'البداية'} إلى ${summary.periodTo || 'اليوم'}</div>` : ''}

      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>البيان</th>
            <th style="text-align: left;">مدين(+)</th>
            <th style="text-align: left;">دائن(-)</th>
            <th style="text-align: left;">الرصيد</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div style="margin-top: 10px; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>إجمالي المدين (+):</span>
          <strong style="color: #b91c1c; font-family: monospace;">${summary.totalDebit.toLocaleString('fr-DZ')} ${currencySymbol}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
          <span>إجمالي المسدد (-):</span>
          <strong style="color: #15803d; font-family: monospace;">${summary.totalCredit.toLocaleString('fr-DZ')} ${currencySymbol}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; margin-top: 6px; border-top: 1px solid #cbd5e1; padding-top: 4px;">
          <span>الرصيد المستحق النهائي:</span>
          <span style="color: ${summary.finalBalance > 0 ? '#b91c1c' : '#059669'}; font-family: monospace;">
            ${summary.finalBalance.toLocaleString('fr-DZ')} ${currencySymbol}
          </span>
        </div>
      </div>

      <div class="footer">
        <div>شكراً لتعاملكم معنا وثقتكم!</div>
      </div>
      <script>
        window.onload = () => { window.print(); window.close(); };
      </script>
    </body>
    </html>
  `);
    printWindow.document.close();
  } catch (err) {
    console.error('Failed to print customer statement slip:', err);
  }
}
