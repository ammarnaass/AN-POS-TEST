import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Customer } from '@/types';
import { generateId } from '@/utils';
import {
  Plus, Search, Edit2, Trash2, Upload, X, Users, CreditCard,
  AlertTriangle, FileText, ChevronLeft, ChevronRight, Phone,
  DollarSign, Download, Printer, MessageSquare,
  CheckCircle2, Wallet, RefreshCw,
  ShieldAlert, ArrowUpDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CustomersPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => db.payments.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  // Currency helper
  const currencySymbol = settings?.baseCurrency || 'دج';
  const formatMoney = (val: number | undefined | null) => {
    return Number(val || 0).toLocaleString('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'debt' | 'exceeded' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'debt_desc' | 'debt_asc' | 'name_asc' | 'recent'>('debt_desc');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', creditLimit: 0, balance: 0 });

  // Payment Modal State
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'baridimob' | 'check' | 'transfer'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [printReceiptOnPayment, setPrintReceiptOnPayment] = useState(true);

  // Statement Modal State
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementDateFrom, setStatementDateFrom] = useState('');
  const [statementDateTo, setStatementDateTo] = useState('');
  const [statementFilterType, setStatementFilterType] = useState<'all' | 'sales' | 'payments'>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Mutations
  const addCustomerMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; creditLimit: number; balance: number }) =>
      db.customers.add({
        id: generateId(),
        name: data.name.trim(),
        phone: data.phone.trim(),
        creditLimit: Number(data.creditLimit) || 0,
        balance: Number(data.balance) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (data: Customer) =>
      db.customers.update(data.id, {
        name: data.name.trim(),
        phone: data.phone.trim(),
        creditLimit: Number(data.creditLimit) || 0,
        balance: Number(data.balance) || 0,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => db.customers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setCustomerToDelete(null);
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async ({
      customerId,
      amount,
      currentBalance,
      method,
      note,
      customerName,
      customerPhone,
    }: {
      customerId: string;
      amount: number;
      currentBalance: number;
      method: string;
      note: string;
      customerName: string;
      customerPhone?: string;
    }) => {
      const paymentDate = new Date().toISOString();
      await db.payments.add({
        id: generateId(),
        date: paymentDate,
        customerId,
        amount,
        type: 'credit',
        method: method as any,
        note: note || undefined,
        createdBy: 'الكاشير',
        createdAt: paymentDate,
      });

      const newBalance = Math.max(0, currentBalance - amount);
      await db.customers.update(customerId, {
        balance: newBalance,
        updatedAt: paymentDate,
      });

      return {
        customerName,
        customerPhone,
        amount,
        date: paymentDate,
        method,
        note,
        previousBalance: currentBalance,
        newBalance,
      };
    },
    onSuccess: (voucherData) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (printReceiptOnPayment && voucherData) {
        handlePrintVoucher(voucherData);
      }
      setShowPayment(null);
      setPaymentAmount(0);
      setPaymentNote('');
    },
  });

  const importCustomersMutation = useMutation({
    mutationFn: (importedList: Customer[]) =>
      db.customers.bulkAdd(
        importedList.map((c) => ({
          ...c,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // Calculate high-level financial stats
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalDebt = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
    const customersWithDebt = customers.filter((c) => c.balance > 0).length;
    const totalCollections = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const exceededLimitCount = customers.filter((c) => c.creditLimit > 0 && c.balance >= c.creditLimit).length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const debtUtilization = totalCreditLimit > 0 ? Math.min(100, Math.round((totalDebt / totalCreditLimit) * 100)) : 0;

    return {
      totalCustomers,
      totalDebt,
      customersWithDebt,
      totalCollections,
      exceededLimitCount,
      totalCreditLimit,
      debtUtilization,
    };
  }, [customers, payments]);

  // Customer sales and payments helpers
  const getCustomerSales = (customerId: string) =>
    sales.filter((s) => s.customerId === customerId && s.type === 'sale');

  const getCustomerPayments = (customerId: string) =>
    payments.filter((p) => p.customerId === customerId);

  // Credit status check
  const getCreditStatus = (customer: Customer) => {
    if (customer.balance <= 0) return 'settled';
    if (customer.creditLimit <= 0) return 'normal_debt';
    const ratio = customer.balance / customer.creditLimit;
    if (ratio >= 1) return 'exceeded';
    if (ratio >= 0.8) return 'warning';
    return 'normal_debt';
  };

  // WhatsApp Reminder Link
  const getWhatsAppUrl = (customer: Customer) => {
    if (!customer.phone) return null;
    let cleanPhone = customer.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '213' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('213')) {
      cleanPhone = '213' + cleanPhone;
    }
    const storeName = settings?.shopName || 'محلنا';
    const text = encodeURIComponent(
      `السلام عليكم ورحمة الله أخي الكريم ${customer.name}،\n\nنود تذكيركم بأن الرصيد المتبقي المستحق في حسابكم لدى "${storeName}" هو: ${formatMoney(customer.balance)} ${currencySymbol}.\n\nنشكركم على ثقتكم وحسن تعاملكم!`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // Print Payment Voucher
  const handlePrintVoucher = (voucher: {
    customerName: string;
    customerPhone?: string;
    amount: number;
    date: string;
    method: string;
    note?: string;
    previousBalance: number;
    newBalance: number;
  }) => {
    const methodNames: Record<string, string> = {
      cash: 'نقداً (Espèce)',
      baridimob: 'بريدي موب / CCP',
      check: 'شيك بنكي (Chèque)',
      transfer: 'تحويل بنكي (Virement)',
    };
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
          .footer { text-align: center; border-top: 1px dashed #94a3b8; padding-top: 10px; margin-top: 16px; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-weight: 900; font-size: 15px;">${settings?.shopName || 'نقطة البيع'}</div>
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
        <div class="row" style="font-weight: 900; font-size: 14px; color: #b91c1c;"><span>الرصيد المتبقي:</span><span>${voucher.newBalance.toLocaleString('fr-DZ')} ${currencySymbol}</span></div>
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
  };

  // Print Statement of Account
  const handlePrintStatement = (customer: Customer, entries: any[]) => {
    const printWindow = window.open('', '_blank', 'width=850,height=900');
    if (!printWindow) return;
    const totalSales = entries.filter((e) => e.type === 'sale').reduce((sum, e) => sum + e.debit, 0);
    const totalPayments = entries.filter((e) => e.type === 'payment').reduce((sum, e) => sum + e.credit, 0);

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
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
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
            <div class="title">${settings?.shopName || 'متجرنا'}</div>
            <div style="color: #64748b; font-size: 11px;">الهاتف: ${settings?.phone || '—'}</div>
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
                <td>${e.type === 'sale' ? 'فاتورة بيع' : 'دفعة تسديد'}</td>
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
  };

  // Print Overall Debt Summary
  const handlePrintDebtsReport = () => {
    const indebtedList = customers.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
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
            <div style="font-size: 18px; font-weight: 900; color: #0046a8;">${settings?.shopName || 'متجرنا'}</div>
            <div>تقرير متابعة ديون الزبائن المستحقة</div>
          </div>
          <div style="text-align: left; color: #64748b;">
            <div>التاريخ: ${new Date().toLocaleDateString('ar-DZ')}</div>
            <div>عدد المدينين: ${indebtedList.length} زبون</div>
          </div>
        </div>

        <div class="total-box">
          إجمالي الديون القائمة: ${stats.totalDebt.toLocaleString('fr-DZ')} ${currencySymbol}
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
  };

  // Export Debts to Excel
  const handleExportExcel = () => {
    const data = filteredCustomers.map((c, index) => {
      const customerSales = getCustomerSales(c.id);
      const totalPurchases = customerSales.reduce((sum, s) => sum + s.total, 0);
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
  };

  // Filter and Sort Customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        // Tab Filter
        if (filterTab === 'debt' && c.balance <= 0) return false;
        if (filterTab === 'exceeded' && !(c.creditLimit > 0 && c.balance >= c.creditLimit)) return false;
        if (filterTab === 'settled' && c.balance > 0) return false;

        // Search Filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = c.name.toLowerCase().includes(q);
          const matchesPhone = c.phone.includes(q);
          return matchesName || matchesPhone;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'debt_desc') return b.balance - a.balance;
        if (sortBy === 'debt_asc') return a.balance - b.balance;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [customers, filterTab, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTab, sortBy]);

  // Statement entries builder
  const getStatementEntries = (customerId: string) => {
    let customerSales = getCustomerSales(customerId).map((s) => ({
      date: s.date,
      type: 'sale' as const,
      number: s.number,
      description: `فاتورة مبيعات #${s.number}`,
      debit: s.total,
      credit: s.paidAmount,
      status: s.status,
    }));

    let customerPayments = getCustomerPayments(customerId).map((p) => ({
      date: p.date,
      type: 'payment' as const,
      number: '-',
      description: `تسديد دفعة (${p.method || 'نقداً'})${p.note ? ' - ' + p.note : ''}`,
      debit: 0,
      credit: p.amount,
      status: 'paid' as const,
    }));

    // Filter by type if requested
    let combined = [...customerSales, ...customerPayments];
    if (statementFilterType === 'sales') combined = customerSales;
    if (statementFilterType === 'payments') combined = customerPayments;

    // Filter by date range
    if (statementDateFrom) {
      combined = combined.filter((e) => new Date(e.date) >= new Date(statementDateFrom));
    }
    if (statementDateTo) {
      combined = combined.filter((e) => new Date(e.date) <= new Date(statementDateTo + 'T23:59:59'));
    }

    combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return combined.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, runningBalance };
    });
  };

  // Form Submit Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCustomer) {
      updateCustomerMutation.mutate({
        ...editingCustomer,
        name: formData.name,
        phone: formData.phone,
        creditLimit: formData.creditLimit,
        balance: formData.balance,
      });
    } else {
      addCustomerMutation.mutate(formData);
    }

    setFormData({ name: '', phone: '', creditLimit: 0, balance: 0 });
    setEditingCustomer(null);
    setShowForm(false);
  };

  // Payment Submit Handler
  const handlePaymentSubmit = () => {
    if (!showPayment || paymentAmount <= 0) return;
    const targetCustomer = customers.find((c) => c.id === showPayment);
    if (!targetCustomer) return;

    addPaymentMutation.mutate({
      customerId: targetCustomer.id,
      amount: paymentAmount,
      currentBalance: targetCustomer.balance,
      method: paymentMethod,
      note: paymentNote.trim(),
      customerName: targetCustomer.name,
      customerPhone: targetCustomer.phone,
    });
  };

  // Import Handler
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        importCustomersMutation.mutate(imported);
      } catch (err) {
        console.error('Import error:', err);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. PAGE TITLE & MAIN HEADER ACTIONS                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low/95 p-5 rounded-2xl border border-outline-variant/20 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-on-surface font-cairo">دفتر حسابات الزبائن والديون</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">متابعة دقيقة لأرصدة العملاء، سقف الائتمان، التسديدات النقدية وكشوف الحساب</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          {/* Print Debts Report */}
          <button
            onClick={handlePrintDebtsReport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="طباعة تقرير بكافة ديون الزبائن"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>طباعة الديون</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="تصدير القائمة إلى ملف Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          {/* Import Excel */}
          <label className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>استيراد</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          </label>

          {/* Add New Customer */}
          <button
            onClick={() => {
              setFormData({ name: '', phone: '', creditLimit: 0, balance: 0 });
              setEditingCustomer(null);
              setShowForm(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>زبون جديد</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EXECUTIVE FINANCIAL METRIC CARDS                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Outstanding Debts */}
        <div
          onClick={() => setFilterTab('debt')}
          className="bg-surface-container-low/95 border border-red-500/20 hover:border-red-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">إجمالي الديون القائمة</span>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-red-600 tracking-tight">
            {formatMoney(stats.totalDebt)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span className="text-red-500 font-mono font-black">{stats.customersWithDebt}</span>
            <span>زبائن عليهم مبالغ مستحقة</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-red-500" />
        </div>

        {/* Metric 2: Total Payments Collected */}
        <div className="bg-surface-container-low/95 border border-emerald-500/20 hover:border-emerald-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">إجمالي التحصيلات</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
            {formatMoney(stats.totalCollections)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span className="text-emerald-600 font-mono font-black">{payments.length}</span>
            <span>عملية تسديد مسجلة بالنظام</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
        </div>

        {/* Metric 3: Credit Limit Exceeded Alerts */}
        <div
          onClick={() => setFilterTab('exceeded')}
          className="bg-surface-container-low/95 border border-amber-500/20 hover:border-amber-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">تجاوزوا سقف الائتمان</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-amber-600 tracking-tight">
            {stats.exceededLimitCount} <span className="text-xs font-cairo font-bold">زبون</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span className="text-amber-600 font-bold">تنبيه: يتطلب تجميد أو تسديد فوري</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
        </div>

        {/* Metric 4: Credit Utilization Rate */}
        <div className="bg-surface-container-low/95 border border-primary/20 hover:border-primary/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">نسبة استهلاك الائتمان</span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-primary tracking-tight">
            {stats.debtUtilization}%
          </h3>
          <div className="mt-2 pt-2 border-t border-outline-variant/15">
            <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  stats.debtUtilization >= 80 ? 'bg-red-500' : stats.debtUtilization >= 50 ? 'bg-amber-500' : 'bg-primary'
                }`}
                style={{ width: `${stats.debtUtilization}%` }}
              />
            </div>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-primary" />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. SMART FILTER TABS & SEARCH / SORT TOOLBAR                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-surface-container-low/95 p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Smart Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar shrink-0">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'all'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
            }`}
          >
            <span>جميع الزبائن</span>
            <span className="font-mono text-[11px] opacity-80">({customers.length})</span>
          </button>

          <button
            onClick={() => setFilterTab('debt')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'debt'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
            }`}
          >
            <span>عليهم ديون</span>
            <span className="font-mono text-[11px] opacity-80">({stats.customersWithDebt})</span>
          </button>

          <button
            onClick={() => setFilterTab('exceeded')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'exceeded'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
            }`}
          >
            <span>تجاوزوا السقف</span>
            <span className="font-mono text-[11px] opacity-80">({stats.exceededLimitCount})</span>
          </button>

          <button
            onClick={() => setFilterTab('settled')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'settled'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
            }`}
          >
            <span>حسابات مسواة (خالص)</span>
            <span className="font-mono text-[11px] opacity-80">({customers.length - stats.customersWithDebt})</span>
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو الهاتف..."
              className="w-full pr-9 pl-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 pr-7 pl-3 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            >
              <option value="debt_desc">الأعلى ديناً أولاً</option>
              <option value="debt_asc">الأقل ديناً</option>
              <option value="name_asc">ترتيب أبجدي (أ - ي)</option>
              <option value="recent">الأحدث إضافة</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MAIN CUSTOMER LEDGER TABLE                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
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
              {isLoadingCustomers ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <p className="font-bold">جاري تحميل سجل الزبائن...</p>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                    <Users className="w-12 h-12 opacity-25 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-bold text-on-surface">لا توجد نتائج مطابقة</p>
                    <p className="text-xs mt-1">جرّب تغيير عبارة البحث أو الفلتر المحدد</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer, index) => {
                  const customerSales = getCustomerSales(customer.id);
                  const totalPurchases = customerSales.reduce((sum, s) => sum + s.total, 0);
                  const creditStatus = getCreditStatus(customer);
                  const ratio = customer.creditLimit > 0 ? (customer.balance / customer.creditLimit) * 100 : 0;
                  const waUrl = getWhatsAppUrl(customer);

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
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {customer.name.trim().charAt(0) || 'ز'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-on-surface truncate">{customer.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
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
                        {formatMoney(totalPurchases)} <span className="text-[10px] text-on-surface-variant font-cairo">دج</span>
                      </td>

                      {/* Current Balance / Debt */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg inline-block ${
                            customer.balance > 0
                              ? 'text-red-600 bg-red-500/10 font-mono'
                              : 'text-emerald-600 bg-emerald-500/10 font-mono'
                          }`}
                        >
                          {formatMoney(customer.balance)} <span className="text-[10px] font-cairo">دج</span>
                        </span>
                      </td>

                      {/* Credit Limit & Consumption Gauge */}
                      <td className="py-3.5 px-4">
                        {customer.creditLimit > 0 ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-on-surface-variant">السقف: {formatMoney(customer.creditLimit)}</span>
                              <span
                                className={`font-black ${
                                  ratio >= 100 ? 'text-red-600' : ratio >= 80 ? 'text-amber-600' : 'text-primary'
                                }`}
                              >
                                {Math.round(ratio)}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  ratio >= 100 ? 'bg-red-500' : ratio >= 80 ? 'bg-amber-500' : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(100, ratio)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant block text-center">سقف غير محدد</span>
                        )}
                      </td>

                      {/* Financial Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Payment Button */}
                          <button
                            onClick={() => {
                              setShowPayment(customer.id);
                              setPaymentAmount(customer.balance);
                            }}
                            disabled={customer.balance <= 0}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs disabled:opacity-40 disabled:hover:bg-emerald-600 cursor-pointer"
                            title="تسجيل تسديد جديد"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>تسديد</span>
                          </button>

                          {/* Statement Button */}
                          <button
                            onClick={() => setStatementCustomer(customer)}
                            className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
                            title="عرض وطباعة كشف الحساب"
                          >
                            <FileText className="w-4 h-4 text-primary" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setEditingCustomer(customer);
                              setFormData({
                                name: customer.name,
                                phone: customer.phone,
                                creditLimit: customer.creditLimit,
                                balance: customer.balance,
                              });
                              setShowForm(true);
                            }}
                            className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
                            title="تعديل بيانات الزبون"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setCustomerToDelete(customer)}
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

        {/* Pagination Bar */}
        <div className="bg-surface-container px-4 py-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
          <div>
            عرض{' '}
            <strong className="font-mono text-on-surface">
              {filteredCustomers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}
            </strong>{' '}
            إلى{' '}
            <strong className="font-mono text-on-surface">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)}
            </strong>{' '}
            من إجمالي <strong className="font-mono text-on-surface">{filteredCustomers.length}</strong> زبون
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. ADVANCED PAYMENT MODAL (تسجيل تسديد دفعة مالية)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPayment && (() => {
        const targetCustomer = customers.find((c) => c.id === showPayment);
        if (!targetCustomer) return null;
        const currentBalance = targetCustomer.balance;
        const remainingAfter = Math.max(0, currentBalance - (paymentAmount || 0));

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-on-surface font-cairo">تسجيل تسديد دفعة مالية</h3>
                    <p className="text-xs text-on-surface-variant">الزبون: <strong className="text-on-surface">{targetCustomer.name}</strong></p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPayment(null)}
                  className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Debt Status Card */}
              <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant">الدين الحالي المستحق:</span>
                  <p className="text-xl font-black font-mono text-red-600 mt-0.5">
                    {formatMoney(currentBalance)} <span className="text-xs font-cairo">{currencySymbol}</span>
                  </p>
                </div>
                <div className="border-r border-outline-variant/20 pr-3">
                  <span className="text-[11px] font-bold text-on-surface-variant">الرصيد بعد التسديد:</span>
                  <p className={`text-xl font-black font-mono mt-0.5 ${remainingAfter === 0 ? 'text-emerald-600' : 'text-on-surface'}`}>
                    {formatMoney(remainingAfter)} <span className="text-xs font-cairo">{currencySymbol}</span>
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">خيارات سريعة للمبلغ:</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(currentBalance)}
                    className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-2xs"
                  >
                    كامل الدين (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(Math.round(currentBalance / 2))}
                    className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    نصف الدين (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(1000)}
                    className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    1,000 دج
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(5000)}
                    className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    5,000 دج
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">مبلغ الدفعة (دج) *</label>
                <div className="relative">
                  <input
                    type="number"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-lg font-black font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-center"
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xs text-on-surface-variant">
                    {currencySymbol}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">طريقة الدفع:</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'cash'
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container text-on-surface border-outline-variant/20'
                    }`}
                  >
                    نقداً (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('baridimob')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'baridimob'
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container text-on-surface border-outline-variant/20'
                    }`}
                  >
                    بريدي موب / CCP
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('check')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'check'
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container text-on-surface border-outline-variant/20'
                    }`}
                  >
                    شيك بنكي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'transfer'
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container text-on-surface border-outline-variant/20'
                    }`}
                  >
                    تحويل بنكي
                  </button>
                </div>
              </div>

              {/* Note / Reference */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">ملاحظة أو رقم العملية (اختياري):</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="مثال: دفعة نقداً عند الكاشير، أو رقم التحويل..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Print Receipt Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer bg-surface-container/60 p-3 rounded-xl border border-outline-variant/20">
                <input
                  type="checkbox"
                  checked={printReceiptOnPayment}
                  onChange={(e) => setPrintReceiptOnPayment(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                />
                <span className="text-xs font-bold text-on-surface">طباعة وصل تسديد دين فوري بعد التأكيد</span>
              </label>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayment(null)}
                  className="flex-1 py-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handlePaymentSubmit}
                  disabled={paymentAmount <= 0 || addPaymentMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {addPaymentMutation.isPending ? 'جاري التسجيل...' : 'تأكيد وحفظ التسديد'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. STATEMENT OF ACCOUNT MODAL (كشف حساب مفصل)                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {statementCustomer && (() => {
        const entries = getStatementEntries(statementCustomer.id);
        const totalPurchases = entries.filter((e) => e.type === 'sale').reduce((sum, e) => sum + e.debit, 0);
        const totalPayments = entries.filter((e) => e.type === 'payment').reduce((sum, e) => sum + e.credit, 0);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm shadow-2xs">
                    {statementCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-on-surface font-cairo">
                      كشف حساب مفصل - {statementCustomer.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant font-mono" dir="ltr">
                      {statementCustomer.phone || 'بدون رقم هاتف'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrintStatement(statementCustomer, entries)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all shadow-2xs hover:shadow-md cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الكشف</span>
                  </button>

                  <button
                    onClick={() => setStatementCustomer(null)}
                    className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Financial Summary Cards for Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 shrink-0">
                <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 text-center">
                  <span className="text-xs font-bold text-on-surface-variant">إجمالي المشتريات:</span>
                  <p className="text-lg font-black font-mono text-primary mt-0.5">
                    {formatMoney(totalPurchases)} <span className="text-xs font-cairo">{currencySymbol}</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/20 text-center">
                  <span className="text-xs font-bold text-on-surface-variant">إجمالي الدفعات المسددة:</span>
                  <p className="text-lg font-black font-mono text-emerald-600 mt-0.5">
                    {formatMoney(totalPayments)} <span className="text-xs font-cairo">{currencySymbol}</span>
                  </p>
                </div>

                <div
                  className={`p-3.5 rounded-2xl border text-center ${
                    statementCustomer.balance > 0
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/30'
                  }`}
                >
                  <span className="text-xs font-bold text-on-surface-variant">الرصيد المتبقي المستحق:</span>
                  <p
                    className={`text-lg font-black font-mono mt-0.5 ${
                      statementCustomer.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}
                  >
                    {formatMoney(statementCustomer.balance)} <span className="text-xs font-cairo">{currencySymbol}</span>
                  </p>
                </div>
              </div>

              {/* Filter controls inside statement */}
              <div className="bg-surface-container p-3 rounded-2xl border border-outline-variant/20 mb-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-on-surface-variant">نوع الحركات:</span>
                  <div className="flex items-center bg-surface-container-high rounded-xl p-0.5">
                    <button
                      onClick={() => setStatementFilterType('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        statementFilterType === 'all' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      onClick={() => setStatementFilterType('sales')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        statementFilterType === 'sales' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface'
                      }`}
                    >
                      مبيعات فقط
                    </button>
                    <button
                      onClick={() => setStatementFilterType('payments')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        statementFilterType === 'payments' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface'
                      }`}
                    >
                      دفعات فقط
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-on-surface-variant">من:</span>
                  <input
                    type="date"
                    value={statementDateFrom}
                    onChange={(e) => setStatementDateFrom(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-surface border border-outline-variant/25 text-xs font-mono"
                  />
                  <span className="font-bold text-on-surface-variant">إلى:</span>
                  <input
                    type="date"
                    value={statementDateTo}
                    onChange={(e) => setStatementDateTo(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-surface border border-outline-variant/25 text-xs font-mono"
                  />
                  {(statementDateFrom || statementDateTo) && (
                    <button
                      onClick={() => {
                        setStatementDateFrom('');
                        setStatementDateTo('');
                      }}
                      className="text-red-500 font-bold hover:underline cursor-pointer"
                    >
                      مسح
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions Ledger Table */}
              <div className="overflow-y-auto flex-1 custom-scrollbar border border-outline-variant/20 rounded-2xl">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-surface-container sticky top-0 z-10 border-b border-outline-variant/25 text-on-surface-variant font-bold">
                    <tr>
                      <th className="py-2.5 px-3">التاريخ</th>
                      <th className="py-2.5 px-3">النوع</th>
                      <th className="py-2.5 px-3">البيان</th>
                      <th className="py-2.5 px-3 text-center">المدين (+)</th>
                      <th className="py-2.5 px-3 text-center">الدائن (-)</th>
                      <th className="py-2.5 px-3 text-center">الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                          <FileText className="w-8 h-8 opacity-25 mx-auto mb-2 text-primary" />
                          <p className="font-bold">لا توجد حركات مسجلة لهذا الزبون في هذا النطاق</p>
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                          <td className="py-2 px-3 font-mono text-on-surface-variant">
                            {new Date(entry.date).toLocaleDateString('ar-DZ')}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                entry.type === 'sale'
                                  ? 'bg-blue-500/10 text-blue-600'
                                  : 'bg-emerald-500/10 text-emerald-600'
                              }`}
                            >
                              {entry.type === 'sale' ? 'فاتورة بيع' : 'دفعة تسديد'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-on-surface">{entry.description}</td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-red-600">
                            {entry.debit > 0 ? formatMoney(entry.debit) : '—'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600">
                            {entry.credit > 0 ? formatMoney(entry.credit) : '—'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-black text-on-surface">
                            {formatMoney(entry.runningBalance)} {currencySymbol}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between shrink-0">
                <button
                  onClick={() => setStatementCustomer(null)}
                  className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
                >
                  إغلاق
                </button>

                {statementCustomer.balance > 0 && (
                  <button
                    onClick={() => {
                      setShowPayment(statementCustomer.id);
                      setPaymentAmount(statementCustomer.balance);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>تسجيل دفعة لهذا الزبون</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. CUSTOMER FORM MODAL (إضافة وتعديل زبون)                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleFormSubmit}
            className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface font-cairo">
                    {editingCustomer ? 'تعديل بيانات الزبون' : 'إضافة زبون جديد'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">سجل بيانات الزبون وسقف الائتمان المتاح</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                }}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">اسم الزبون الكامل *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: أحمد بوعلام"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">رقم الهاتف</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0550... أو 0660..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">سقف الائتمان المسموح (دج)</label>
              <input
                type="number"
                value={formData.creditLimit || ''}
                onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) || 0 })}
                placeholder="0 يعني بدون سقف دين"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[10px] text-on-surface-variant mt-1">الحد الأقصى للديون المسموح بها لهذا العميل قبل التنبيه</p>
            </div>

            {editingCustomer && (
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">الرصيد / الدين المسجل حالياً (دج)</label>
                <input
                  type="number"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCustomer(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer"
              >
                {editingCustomer ? 'حفظ التعديلات' : 'إضافة الزبون'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. DELETE CONFIRMATION MODAL                                  */}
      {/* ───────────────────────────────────────────────────────────── */}
      {customerToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">تأكيد حذف الزبون</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                هل أنت متأكد من حذف الزبون <strong className="text-on-surface">"{customerToDelete.name}"</strong>؟
              </p>
              {customerToDelete.balance > 0 && (
                <div className="mt-2.5 p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 font-bold">
                  تنبيه: هذا الزبون لديه ديون قائمة بقيمة {formatMoney(customerToDelete.balance)} دج!
                </div>
              )}
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => deleteCustomerMutation.mutate(customerToDelete.id)}
                disabled={deleteCustomerMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                {deleteCustomerMutation.isPending ? 'جاري الحذف...' : 'نعم، حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
