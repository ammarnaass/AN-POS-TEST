import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import type { Supplier, SupplierEntry, SaleItem } from '@/types';
import {
  Plus, Search, Edit2, Trash2, X, Truck, ShoppingCart,
  FileText, Printer, DollarSign, Eye, Download,
  ChevronLeft, ChevronRight, Package,
  Wallet, Calendar, Phone, MessageSquare,
  CheckCircle2, AlertTriangle, ArrowUpDown, RefreshCw,
  ShieldAlert
} from 'lucide-react';
import * as XLSX from 'xlsx';

type Tab = 'suppliers' | 'invoices' | 'statement';

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  // Queries
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.toArray(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });

  const { data: purchases = [], isLoading: isLoadingPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => db.purchases.toArray(),
  });

  const { data: purchaseItems = [] } = useQuery({
    queryKey: ['purchaseItems'],
    queryFn: () => db.purchase_items.toArray(),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const currencySymbol = settings?.baseCurrency || 'دج';
  const shopName = settings?.shopName || 'المتجر';
  const invoicePrefix = settings?.invoicePrefix || 'INV';

  // Currency Formatter
  const formatMoney = (val: number | undefined | null) => {
    return Number(val || 0).toLocaleString('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Build supplier entries
  const supplierEntries: SupplierEntry[] = useMemo(() => {
    return purchases.map((p) => ({
      id: p.id,
      supplierId: p.supplierId,
      date: p.date,
      type: 'purchase' as const,
      amount: p.total,
      items: purchaseItems
        .filter((pi) => pi.purchaseId === p.id)
        .map((pi) => ({
          productId: pi.productId,
          name: pi.name,
          qty: pi.qty,
          unitPrice: pi.unitPrice,
          lineTotal: pi.lineTotal,
        })),
      invoiceNumber: p.number,
      paidAmount: (p as any).paidAmount ?? 0,
      remainingBalance: (p as any).remainingBalance ?? p.total,
    }));
  }, [purchases, purchaseItems]);

  // Main UI State
  const [activeTab, setActiveTab] = useState<Tab>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'debt' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'debt_desc' | 'debt_asc' | 'name_asc' | 'recent'>('debt_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Modals & Forms State
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setCustomerToDelete] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', balance: 0 });

  // Purchase Invoice Creator Modal
  const [showPurchaseInvoice, setShowPurchaseInvoice] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<SaleItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // View Invoice Details Modal
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);

  // Statement State
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<string | null>(null);
  const [statementDateFrom, setStatementDateFrom] = useState('');
  const [statementDateTo, setStatementDateTo] = useState('');
  const [statementFilterType, setStatementFilterType] = useState<'all' | 'purchases' | 'payments'>('all');

  // Supplier Payment Modal
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'transfer' | 'baridimob'>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [printReceiptOnPayment, setPrintReceiptOnPayment] = useState(true);

  // Invoices Tab Search
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

  // High-Level Financial Metrics
  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const totalDebt = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
    const suppliersWithDebt = suppliers.filter((s) => s.balance > 0).length;
    const totalPurchasesAmount = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalPaidPurchases = purchases.reduce((sum, p) => sum + ((p as any).paidAmount || 0), 0);
    const today = new Date().toDateString();
    const todayPurchases = purchases.filter((p) => new Date(p.date).toDateString() === today);
    const todayTotal = todayPurchases.reduce((sum, p) => sum + p.total, 0);

    return {
      totalSuppliers,
      totalDebt,
      suppliersWithDebt,
      totalPurchasesAmount,
      totalPaidPurchases,
      todayPurchasesCount: todayPurchases.length,
      todayTotal,
    };
  }, [suppliers, purchases]);

  // WhatsApp B2B Link Helper
  const getWhatsAppUrl = (supplier: Supplier) => {
    if (!supplier.phone) return null;
    let cleanPhone = supplier.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '213' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('213')) {
      cleanPhone = '213' + cleanPhone;
    }
    const text = encodeURIComponent(
      `السلام عليكم ورحمة الله،\nمن متجر "${shopName}". بخصوص طلبيات التوريد ومتابعة الحساب...`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // Filter & Sort Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => {
        if (filterTab === 'debt' && s.balance <= 0) return false;
        if (filterTab === 'settled' && s.balance > 0) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          return s.name.toLowerCase().includes(q) || s.phone.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'debt_desc') return b.balance - a.balance;
        if (sortBy === 'debt_asc') return a.balance - b.balance;
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'ar');
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }, [suppliers, filterTab, searchQuery, sortBy]);

  // Pagination for Suppliers
  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSuppliers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSuppliers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterTab, sortBy, activeTab]);

  // Product Filter for Purchase Invoice
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return [];
    const q = productSearchQuery.toLowerCase().trim();
    return products.filter(
      (p) => p.status === 'active' && (p.name.toLowerCase().includes(q) || p.barcode.includes(q))
    );
  }, [products, productSearchQuery]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === showPurchaseInvoice) || null,
    [suppliers, showPurchaseInvoice]
  );

  const invoiceTotal = useMemo(
    () => (Array.isArray(invoiceItems) ? invoiceItems : []).reduce((sum, item) => sum + (Number(item?.lineTotal) || 0), 0),
    [invoiceItems]
  );

  // Statement Calculations
  const statementSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierForStatement),
    [suppliers, selectedSupplierForStatement]
  );

  const statementEntries = useMemo(() => {
    if (!selectedSupplierForStatement) return [];

    let entries = supplierEntries
      .filter((e) => e.supplierId === selectedSupplierForStatement)
      .map((e) => ({
        id: e.id,
        date: e.date,
        type: 'purchase' as const,
        number: e.invoiceNumber,
        description: `فاتورة شراء #${e.invoiceNumber}`,
        debit: e.amount, // Goods received increase payable to supplier
        credit: e.paidAmount, // Paid amount
        status: e.remainingBalance === 0 ? 'paid' : e.paidAmount > 0 ? 'partial' : 'unpaid',
      }));

    if (statementDateFrom) {
      entries = entries.filter((e) => new Date(e.date) >= new Date(statementDateFrom));
    }
    if (statementDateTo) {
      entries = entries.filter((e) => new Date(e.date) <= new Date(statementDateTo + 'T23:59:59'));
    }

    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return entries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, runningBalance };
    });
  }, [supplierEntries, selectedSupplierForStatement, statementDateFrom, statementDateTo]);

  // Mutations
  const addSupplierMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; balance: number }) =>
      db.suppliers.add({
        id: generateId(),
        name: data.name.trim(),
        phone: data.phone.trim(),
        balance: Number(data.balance) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: (supplier: Supplier) =>
      db.suppliers.update(supplier.id, {
        name: supplier.name.trim(),
        phone: supplier.phone.trim(),
        balance: Number(supplier.balance) || 0,
        updatedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.suppliers.delete(id);
      const relatedPurchases = await db.purchases.where({ supplierId: id }).toArray();
      for (const p of relatedPurchases) {
        await db.purchase_items.where({ purchaseId: p.id }).delete();
      }
      await db.purchases.where({ supplierId: id }).delete();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseItems'] });
      setCustomerToDelete(null);
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({
      supplierId,
      items,
      paidAmount: paid,
      total,
    }: {
      supplierId: string;
      items: SaleItem[];
      paidAmount: number;
      total: number;
    }) => {
      const allPurchases = await db.purchases.toArray();
      const maxNum = allPurchases.reduce((max, p) => {
        const num = parseInt(p.number.slice(-6));
        return num > max ? num : max;
      }, 0);
      const invoiceNumber = `${invoicePrefix}-PSH-${String(maxNum + 1).padStart(6, '0')}`;
      const purchaseId = generateId();
      const now = new Date().toISOString();

      await db.purchases.add({
        id: purchaseId,
        number: invoiceNumber,
        date: now,
        supplierId,
        subtotal: total,
        tvaAmount: 0,
        total,
        status: 'confirmed',
        createdAt: now,
        updatedAt: now,
        paidAmount: paid,
        remainingBalance: total - paid,
      } as any);

      for (const item of items) {
        await db.purchase_items.add({
          id: generateId(),
          purchaseId,
          productId: item.productId,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        });

        const product = await db.products.get(item.productId);
        if (product) {
          await db.products.update(item.productId, {
            quantity: product.quantity + item.qty,
            costPrice: item.unitPrice, // update cost price to latest purchase
            updatedAt: now,
          });
        }

        await db.stock_movements.add({
          id: generateId(),
          productId: item.productId,
          type: 'purchase',
          qty: item.qty,
          createdBy: 'system',
          createdAt: now,
        });
      }

      const supplier = await db.suppliers.get(supplierId);
      if (supplier) {
        await db.suppliers.update(supplierId, {
          balance: supplier.balance + (total - paid),
          updatedAt: now,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseItems'] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({
      supplierId,
      amount,
      method,
      note,
      supplierName,
      supplierPhone,
    }: {
      supplierId: string;
      amount: number;
      method: string;
      note?: string;
      supplierName: string;
      supplierPhone?: string;
    }) => {
      const supplier = await db.suppliers.get(supplierId);
      if (!supplier) return null;
      const prevBal = supplier.balance;
      const newBal = Math.max(0, supplier.balance - amount);
      const now = new Date().toISOString();

      await db.suppliers.update(supplierId, {
        balance: newBal,
        updatedAt: now,
      });

      return {
        supplierName,
        supplierPhone,
        amount,
        date: now,
        method,
        note,
        previousBalance: prevBal,
        newBalance: newBal,
      };
    },
    onSuccess: (voucherData) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      if (printReceiptOnPayment && voucherData) {
        handlePrintPaymentVoucher(voucherData);
      }
      setShowPayment(null);
      setPaymentAmount(0);
      setPaymentNote('');
    },
  });

  // Print Payment Voucher
  const handlePrintPaymentVoucher = (voucher: {
    supplierName: string;
    supplierPhone?: string;
    amount: number;
    date: string;
    method: string;
    note?: string;
    previousBalance: number;
    newBalance: number;
  }) => {
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
  };

  // Print Statement of Account for Supplier
  const handlePrintStatement = (supplier: Supplier, entries: any[]) => {
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
            <div style="color: #64748b; font-size: 11px;">الهاتف: ${settings?.phone || '—'}</div>
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
            ${entries.map(e => `
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
  };

  // Print Overall Payables Report
  const handlePrintPayablesReport = () => {
    const indebtedList = suppliers.filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance);
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
          إجمالي المستحقات الواجب دفعها للموردين: ${stats.totalDebt.toLocaleString('fr-DZ')} ${currencySymbol}
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
  };

  // Export Suppliers to Excel
  const handleExportSuppliersExcel = () => {
    const data = filteredSuppliers.map((s, index) => {
      const ordersCount = supplierEntries.filter((e) => e.supplierId === s.id && e.type === 'purchase').length;
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
  };

  // Handlers for Add/Edit Supplier
  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingSupplier) {
      updateSupplierMutation.mutate({
        ...editingSupplier,
        name: formData.name,
        phone: formData.phone,
        balance: formData.balance,
      });
    } else {
      addSupplierMutation.mutate(formData);
    }

    setFormData({ name: '', phone: '', balance: 0 });
    setEditingSupplier(null);
    setShowSupplierForm(false);
  };

  // Invoice Items Management
  const addProductToInvoice = (product: any) => {
    const existing = invoiceItems.find((item) => item.productId === product.id);
    if (existing) {
      setInvoiceItems(
        invoiceItems.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1, lineTotal: (item.qty + 1) * item.unitPrice }
            : item
        )
      );
    } else {
      setInvoiceItems([
        ...invoiceItems,
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          unitPrice: product.costPrice || 0,
          lineTotal: product.costPrice || 0,
        },
      ]);
    }
    setProductSearchQuery('');
  };

  const updateInvoiceItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setInvoiceItems(invoiceItems.filter((item) => item.productId !== productId));
      return;
    }
    setInvoiceItems(
      invoiceItems.map((item) =>
        item.productId === productId
          ? { ...item, qty, lineTotal: qty * item.unitPrice }
          : item
      )
    );
  };

  const updateInvoiceItemPrice = (productId: string, price: number) => {
    setInvoiceItems(
      invoiceItems.map((item) =>
        item.productId === productId
          ? { ...item, unitPrice: price, lineTotal: item.qty * price }
          : item
      )
    );
  };

  const confirmPurchaseInvoice = () => {
    if (!showPurchaseInvoice || invoiceItems.length === 0) return;
    purchaseMutation.mutate({
      supplierId: showPurchaseInvoice,
      items: invoiceItems,
      paidAmount,
      total: invoiceTotal,
    });
    setInvoiceItems([]);
    setPaidAmount(0);
    setProductSearchQuery('');
    setShowPurchaseInvoice(null);
  };

  // Supplier Payment Submit
  const handlePaymentSubmit = () => {
    if (!showPayment || paymentAmount <= 0) return;
    const targetSupplier = suppliers.find((s) => s.id === showPayment);
    if (!targetSupplier) return;

    paymentMutation.mutate({
      supplierId: targetSupplier.id,
      amount: paymentAmount,
      method: paymentMethod,
      note: paymentNote.trim(),
      supplierName: targetSupplier.name,
      supplierPhone: targetSupplier.phone,
    });
  };

  // Filtered Purchases for Invoices Tab
  const filteredPurchases = useMemo(() => {
    let list = purchases.map((p) => {
      const s = suppliers.find((sup) => sup.id === p.supplierId);
      const items = purchaseItems.filter((pi) => pi.purchaseId === p.id);
      return {
        ...p,
        supplierName: s?.name || 'مورد غير معروف',
        itemsCount: items.length,
      };
    });

    if (invoiceSearchQuery.trim()) {
      const q = invoiceSearchQuery.toLowerCase().trim();
      list = list.filter((p) => p.number.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q));
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, suppliers, purchaseItems, invoiceSearchQuery]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER ACTIONS & BRANDING                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-low/95 p-5 rounded-2xl border border-outline-variant/20 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-on-surface font-cairo">دليل الموردين وطلبيات التوريد</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                إدارة شاملة لحسابات الموردين، فواتير الشراء، الأرصدة المستحقة، وتوريدات المخزون
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          {/* Print Payables */}
          <button
            onClick={handlePrintPayablesReport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="طباعة تقرير مستحقات الموردين"
          >
            <Printer className="w-4 h-4 text-primary" />
            <span>طباعة المستحقات</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportSuppliersExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/25 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
            title="تصدير الموردين إلى Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          {/* Add Supplier Button */}
          <button
            onClick={() => {
              setFormData({ name: '', phone: '', balance: 0 });
              setEditingSupplier(null);
              setShowSupplierForm(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-on-primary px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>مورد جديد</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. EXECUTIVE FINANCIAL METRIC CARDS                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Supplier Payables */}
        <div
          onClick={() => {
            setActiveTab('suppliers');
            setFilterTab('debt');
          }}
          className="bg-surface-container-low/95 border border-amber-500/20 hover:border-amber-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">مستحقات الموردين القائمة</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-amber-600 tracking-tight">
            {formatMoney(stats.totalDebt)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span className="text-amber-600 font-mono font-black">{stats.suppliersWithDebt}</span>
            <span>موردين لهم مبالغ مستحقة في ذمتنا</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
        </div>

        {/* Metric 2: Total Purchases Amount */}
        <div className="bg-surface-container-low/95 border border-primary/20 hover:border-primary/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">إجمالي المشتريات والتوريد</span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-primary tracking-tight">
            {formatMoney(stats.totalPurchasesAmount)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span className="text-primary font-mono font-black">{purchases.length}</span>
            <span>فاتورة توريد مسجلة بالنظام</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-primary" />
        </div>

        {/* Metric 3: Total Deliveries Today */}
        <div className="bg-surface-container-low/95 border border-emerald-500/20 hover:border-emerald-500/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">عمليات التوريد اليوم</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-emerald-600 tracking-tight">
            {stats.todayPurchasesCount} <span className="text-xs font-cairo font-bold">طلبيات</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span className="text-emerald-600 font-mono font-black">{formatMoney(stats.todayTotal)} {currencySymbol}</span>
            <span>تم استلامها اليوم</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
        </div>

        {/* Metric 4: Active Suppliers Count */}
        <div className="bg-surface-container-low/95 border border-outline-variant/20 hover:border-outline-variant/40 p-4 sm:p-5 rounded-2xl transition-all shadow-2xs hover:shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-on-surface-variant">إجمالي الموردين</span>
            <div className="w-9 h-9 rounded-xl bg-surface-container text-on-surface flex items-center justify-center group-hover:scale-110 transition-transform">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-on-surface tracking-tight">
            {stats.totalSuppliers} <span className="text-xs font-cairo font-bold">مورد</span>
          </h3>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant font-bold">
            <span className="text-emerald-600 font-bold">{stats.totalSuppliers - stats.suppliersWithDebt} حسابات مسواة</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-surface-variant" />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. NAVIGATION TABS (الموردون / فواتير الشراء / كشف الحساب)      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 bg-surface-container p-1.5 rounded-2xl w-fit border border-outline-variant/20">
        {[
          { key: 'suppliers' as Tab, label: 'دليل الموردين والمستحقات', icon: Truck, count: suppliers.length },
          { key: 'invoices' as Tab, label: 'فواتير وطلبيات التوريد', icon: FileText, count: purchases.length },
          { key: 'statement' as Tab, label: 'كشف حساب مورد تفصيلي', icon: Eye },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === key
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            {count !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
                activeTab === key ? 'bg-black/20 text-white' : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SUPPLIERS DIRECTORY & PAYABLES                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="bg-surface-container-low/95 p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar shrink-0">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === 'all'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                }`}
              >
                <span>جميع الموردين</span>
                <span className="font-mono text-[11px] opacity-80">({suppliers.length})</span>
              </button>

              <button
                onClick={() => setFilterTab('debt')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  filterTab === 'debt'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                }`}
              >
                <span>لهم مستحقات علينا</span>
                <span className="font-mono text-[11px] opacity-80">({stats.suppliersWithDebt})</span>
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
                <span className="font-mono text-[11px] opacity-80">({suppliers.length - stats.suppliersWithDebt})</span>
              </button>
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-2 flex-1 md:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم المورد أو الهاتف..."
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

              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-9 pr-7 pl-3 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                >
                  <option value="debt_desc">الأعلى مستحقات أولاً</option>
                  <option value="debt_asc">الأقل مستحقات</option>
                  <option value="name_asc">ترتيب أبجدي (أ - ي)</option>
                  <option value="recent">الأحدث إضافة</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Suppliers Table */}
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
                  {isLoadingSuppliers ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                        <p className="font-bold">جاري تحميل سجل الموردين...</p>
                      </td>
                    </tr>
                  ) : paginatedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-on-surface-variant">
                        <Truck className="w-12 h-12 opacity-25 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-bold text-on-surface">لا يوجد موردون مطابقون</p>
                        <p className="text-xs mt-1">قم بإضافة مورد جديد أو تعديل معايير البحث</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map((supplier, index) => {
                      const entryCount = supplierEntries.filter(
                        (e) => e.supplierId === supplier.id && e.type === 'purchase'
                      ).length;
                      const waUrl = getWhatsAppUrl(supplier);

                      return (
                        <tr key={supplier.id} className="hover:bg-surface-container/60 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-on-surface-variant">
                            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
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
                              {formatMoney(supplier.balance)} <span className="text-[10px] font-cairo">{currencySymbol}</span>
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
                                onClick={() => {
                                  setShowPurchaseInvoice(supplier.id);
                                  setInvoiceItems([]);
                                  setPaidAmount(0);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                title="إنشاء فاتورة توريد جديدة"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>طلبية</span>
                              </button>

                              {/* Pay Supplier */}
                              <button
                                onClick={() => {
                                  setShowPayment(supplier.id);
                                  setPaymentAmount(supplier.balance);
                                }}
                                disabled={supplier.balance <= 0}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs disabled:opacity-40 cursor-pointer"
                                title="تسجيل تسديد دفعة للمورد"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>تسديد</span>
                              </button>

                              {/* Statement */}
                              <button
                                onClick={() => {
                                  setSelectedSupplierForStatement(supplier.id);
                                  setActiveTab('statement');
                                }}
                                className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
                                title="كشف الحساب"
                              >
                                <FileText className="w-4 h-4 text-primary" />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setEditingSupplier(supplier);
                                  setFormData({
                                    name: supplier.name,
                                    phone: supplier.phone,
                                    balance: supplier.balance,
                                  });
                                  setShowSupplierForm(true);
                                }}
                                className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all cursor-pointer"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => setCustomerToDelete(supplier)}
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

            {/* Pagination */}
            <div className="bg-surface-container px-4 py-3 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
              <div>
                عرض <strong className="font-mono text-on-surface">{filteredSuppliers.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</strong> إلى{' '}
                <strong className="font-mono text-on-surface">{Math.min(currentPage * ITEMS_PER_PAGE, filteredSuppliers.length)}</strong> من أصل{' '}
                <strong className="font-mono text-on-surface">{filteredSuppliers.length}</strong> مورد
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
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === i + 1
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: PURCHASE INVOICES (فواتير وطلبيات الشراء)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="bg-surface-container-low/95 p-3 sm:p-4 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                value={invoiceSearchQuery}
                onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                placeholder="ابحث برقم الفاتورة أو اسم المورد..."
                className="w-full pr-9 pl-3 py-2 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
              />
            </div>

            <div className="text-xs text-on-surface-variant font-bold">
              إجمالي فواتير التوريد: <strong className="text-on-surface font-mono">{filteredPurchases.length}</strong>
            </div>
          </div>

          <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
                  <tr>
                    <th className="py-3 px-4">رقم الفاتورة</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">المورد</th>
                    <th className="py-3 px-4 text-center">عدد الأصناف</th>
                    <th className="py-3 px-4 text-center">إجمالي الفاتورة</th>
                    <th className="py-3 px-4 text-center">المدفوع</th>
                    <th className="py-3 px-4 text-center">المتبقي</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                    <th className="py-3 px-4 text-center">معاينة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {isLoadingPurchases ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-on-surface-variant">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                        <p className="font-bold">جاري تحميل فواتير الشراء...</p>
                      </td>
                    </tr>
                  ) : filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-on-surface-variant">
                        <FileText className="w-10 h-10 opacity-25 mx-auto mb-2 text-primary" />
                        <p className="font-bold text-sm text-on-surface">لا توجد فواتير توريد مسجلة</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((inv) => {
                      const rem = (inv as any).remainingBalance ?? (inv.total - ((inv as any).paidAmount || 0));
                      const isPaid = rem <= 0;
                      const isPartial = (inv as any).paidAmount > 0 && rem > 0;

                      return (
                        <tr key={inv.id} className="hover:bg-surface-container/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-primary">{inv.number}</td>
                          <td className="py-3 px-4 font-mono text-on-surface-variant">
                            {new Date(inv.date).toLocaleDateString('ar-DZ')}
                          </td>
                          <td className="py-3 px-4 font-bold text-on-surface">{inv.supplierName}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold">
                            <span className="bg-surface-container px-2 py-0.5 rounded-lg">
                              {inv.itemsCount} صنف
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-sm">
                            {formatMoney(inv.total)} <span className="text-[10px] font-cairo font-bold">{currencySymbol}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600">
                            {formatMoney((inv as any).paidAmount || 0)}
                          </td>
                          <td className={`py-3 px-4 text-center font-mono font-bold ${rem > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                            {formatMoney(rem)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isPaid ? 'bg-emerald-500/10 text-emerald-700' : isPartial ? 'bg-amber-500/15 text-amber-800' : 'bg-red-500/10 text-red-700'
                            }`}>
                              {isPaid ? 'مدفوعة بالكامل' : isPartial ? 'دفع جزئي' : 'غير مدفوعة'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                const items = purchaseItems.filter((pi) => pi.purchaseId === inv.id);
                                setViewingInvoice({ ...inv, items });
                              }}
                              className="p-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary transition-all cursor-pointer"
                              title="عرض تفاصيل الفاتورة والسلع"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: SUPPLIER ACCOUNT STATEMENT (كشف حساب مورد)             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'statement' && (
        <div className="space-y-4">
          {/* Supplier Selector */}
          <div className="bg-surface-container-low/95 p-5 rounded-2xl border border-outline-variant/20 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:max-w-md">
              <label className="block text-xs font-bold text-on-surface mb-1.5">اختر المورد لعرض كشف الحساب:</label>
              <select
                value={selectedSupplierForStatement || ''}
                onChange={(e) => setSelectedSupplierForStatement(e.target.value || null)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
              >
                <option value="">— اختر مورداً من القائمة —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.balance > 0 ? `(مستحقات: ${formatMoney(s.balance)} ${currencySymbol})` : '(خالص)'}
                  </option>
                ))}
              </select>
            </div>

            {statementSupplier && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintStatement(statementSupplier, statementEntries)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة كشف الحساب (A4)</span>
                </button>
              </div>
            )}
          </div>

          {selectedSupplierForStatement && statementSupplier ? (
            <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 shadow-2xs p-5 space-y-5">
              {/* Supplier Header Summary */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black flex items-center justify-center text-sm shadow-2xs">
                    {statementSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-on-surface font-cairo">{statementSupplier.name}</h3>
                    <p className="text-xs text-on-surface-variant font-mono" dir="ltr">{statementSupplier.phone || 'بدون هاتف'}</p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-xs font-bold text-on-surface-variant">الرصيد المستحق الحالي للمورد:</span>
                  <p className={`text-2xl font-black font-mono mt-0.5 ${statementSupplier.balance > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                    {formatMoney(statementSupplier.balance)} <span className="text-xs font-cairo">{currencySymbol}</span>
                  </p>
                </div>
              </div>

              {/* Date Filters inside Statement */}
              <div className="bg-surface-container p-3 rounded-2xl border border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-on-surface-variant">من:</span>
                  <input
                    type="date"
                    value={statementDateFrom}
                    onChange={(e) => setStatementDateFrom(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant/25 font-mono"
                  />
                  <span className="font-bold text-on-surface-variant">إلى:</span>
                  <input
                    type="date"
                    value={statementDateTo}
                    onChange={(e) => setStatementDateTo(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-outline-variant/25 font-mono"
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

                <div className="text-on-surface-variant font-bold">
                  عدد الحركات: <strong className="font-mono text-on-surface">{statementEntries.length}</strong>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto custom-scrollbar border border-outline-variant/20 rounded-2xl">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
                    <tr>
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">رقم المعاملة</th>
                      <th className="py-3 px-4">البيان والتفاصيل</th>
                      <th className="py-3 px-4 text-center">قيمة البضاعة (+)</th>
                      <th className="py-3 px-4 text-center">المدفوع له (-)</th>
                      <th className="py-3 px-4 text-center">الرصيد التراكمي المستحق</th>
                      <th className="py-3 px-4 text-center">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15">
                    {statementEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                          <FileText className="w-8 h-8 opacity-25 mx-auto mb-2 text-primary" />
                          <p className="font-bold">لا توجد حركات مسجلة لهذا المورد</p>
                        </td>
                      </tr>
                    ) : (
                      statementEntries.map((e, idx) => (
                        <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-on-surface-variant">
                            {new Date(e.date).toLocaleDateString('ar-DZ')}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-primary">{e.number}</td>
                          <td className="py-2.5 px-4 font-bold text-on-surface">{e.description}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-700">
                            {formatMoney(e.debit)} {currencySymbol}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-600">
                            {formatMoney(e.credit)} {currencySymbol}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-black text-sm text-on-surface">
                            {formatMoney(e.runningBalance)} {currencySymbol}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              e.status === 'paid' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/15 text-amber-800'
                            }`}>
                              {e.status === 'paid' ? 'مدفوع' : 'معلق'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-low/95 rounded-2xl border border-outline-variant/20 p-12 text-center text-on-surface-variant">
              <Truck className="w-12 h-12 opacity-25 mx-auto mb-3 text-primary" />
              <h4 className="text-base font-bold text-on-surface">يرجى اختيار مورد</h4>
              <p className="text-xs mt-1">اختر مورداً من القائمة المنسدلة أعلاه لاستعراض كشف حسابه المحاسبي بالكامل</p>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. MODAL: ADD / EDIT SUPPLIER                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSupplierSubmit}
            className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface font-cairo">
                    {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">سجل بيانات المورد والاتصال</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSupplierForm(false);
                  setEditingSupplier(null);
                }}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">اسم المورد أو الشركة *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: شركة البركة للمواد الغذائية"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-1 block">رقم الهاتف أو WhatsApp</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0550... أو 0660..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                dir="ltr"
              />
            </div>

            {editingSupplier && (
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">الرصيد المستحق للمورد حالياً (دج)</label>
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
                  setShowSupplierForm(false);
                  setEditingSupplier(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-black transition-all shadow-xs hover:shadow-md cursor-pointer"
              >
                {editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: CREATE PURCHASE INVOICE (فاتورة شراء وتوريد)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPurchaseInvoice && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl space-y-4 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface font-cairo">تسجيل فاتورة توريد وشراء جديدة</h3>
                  <p className="text-xs text-on-surface-variant">المورد: <strong className="text-on-surface">{selectedSupplier.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPurchaseInvoice(null);
                  setInvoiceItems([]);
                  setPaidAmount(0);
                }}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Search */}
            <div className="relative shrink-0">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="ابحث عن منتج بالاسم أو الباركود لإضافته للفاتورة..."
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/25 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
              />
              {productSearchQuery && filteredProducts.length > 0 && (
                <div className="absolute top-full mt-1.5 w-full bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-xl z-20 max-h-52 overflow-y-auto custom-scrollbar">
                  {filteredProducts.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProductToInvoice(p)}
                      className="w-full px-4 py-2.5 text-right hover:bg-primary/10 flex items-center justify-between transition-colors border-b border-outline-variant/15 last:border-0 cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-on-surface">{p.name}</p>
                        <p className="text-[10px] font-mono text-on-surface-variant">الباركود: {p.barcode}</p>
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-xs font-black text-primary">{formatMoney(p.costPrice || 0)} {currencySymbol}</span>
                        <span className="text-[10px] text-on-surface-variant block">مخزون: {p.quantity}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="overflow-y-auto flex-1 custom-scrollbar border border-outline-variant/20 rounded-2xl">
              {invoiceItems.length === 0 ? (
                <div className="py-14 text-center text-on-surface-variant">
                  <Package className="w-10 h-10 opacity-25 mx-auto mb-2 text-primary" />
                  <p className="font-bold text-xs text-on-surface">لم يتم اختيار أي منتج بعد</p>
                  <p className="text-[11px] mt-0.5">استخدم شريط البحث أعلاه لإضافة المنتجات والكميات</p>
                </div>
              ) : (
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-surface-container sticky top-0 border-b border-outline-variant/25 text-on-surface-variant font-bold">
                    <tr>
                      <th className="py-2.5 px-3">المنتج</th>
                      <th className="py-2.5 px-3 text-center w-24">الكمية</th>
                      <th className="py-2.5 px-3 text-center w-28">سعر الشراء</th>
                      <th className="py-2.5 px-3 text-left w-28">الإجمالي</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15">
                    {invoiceItems.map((item) => (
                      <tr key={item.productId} className="hover:bg-surface-container/50">
                        <td className="py-2 px-3 font-bold text-on-surface">{item.name}</td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateInvoiceItemQty(item.productId, Number(e.target.value) || 0)}
                            className="w-16 px-1.5 py-1 text-center font-mono font-bold rounded-lg bg-surface-container border border-outline-variant/30 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItemPrice(item.productId, Number(e.target.value) || 0)}
                            className="w-20 px-1.5 py-1 text-center font-mono font-bold rounded-lg bg-surface-container border border-outline-variant/30 text-xs"
                          />
                        </td>
                        <td className="py-2 px-3 text-left font-mono font-black text-primary">
                          {formatMoney(item.lineTotal)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => updateInvoiceItemQty(item.productId, 0)}
                            className="p-1 rounded-lg hover:bg-red-500/10 text-on-surface-variant hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Totals & Payment Section */}
            {invoiceItems.length > 0 && (
              <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 space-y-3 shrink-0">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-on-surface-variant">إجمالي فاتورة التوريد:</span>
                  <span className="text-xl font-black font-mono text-primary">
                    {formatMoney(invoiceTotal)} <span className="text-xs font-cairo font-bold">{currencySymbol}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-on-surface-variant whitespace-nowrap">المبلغ المدفوع فوراً:</label>
                  <input
                    type="number"
                    min="0"
                    max={invoiceTotal}
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    placeholder="0.00"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/30 text-xs font-mono font-bold text-left"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/15">
                  <span className="font-bold text-on-surface-variant">المتبقي يضاف لمستحقات المورد:</span>
                  <span className={`font-mono font-black ${invoiceTotal - paidAmount > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                    {formatMoney(Math.max(0, invoiceTotal - paidAmount))} {currencySymbol}
                  </span>
                </div>

                <button
                  onClick={confirmPurchaseInvoice}
                  disabled={purchaseMutation.isPending}
                  className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  {purchaseMutation.isPending ? 'جاري التأكيد وتحديث المخزون...' : 'تأكيد الفاتورة وإدخال البضاعة للمخزن'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: PAY SUPPLIER (تسديد دفعة لمورد)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showPayment && (() => {
        const targetSupplier = suppliers.find((s) => s.id === showPayment);
        if (!targetSupplier) return null;
        const currentBalance = targetSupplier.balance;
        const remainingAfter = Math.max(0, currentBalance - (paymentAmount || 0));

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-on-surface font-cairo">تسديد مستحقات مورد</h3>
                    <p className="text-xs text-on-surface-variant">المورد: <strong className="text-on-surface">{targetSupplier.name}</strong></p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPayment(null)}
                  className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Balances card */}
              <div className="bg-surface-container p-4 rounded-2xl border border-outline-variant/20 grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[11px] font-bold text-on-surface-variant">المستحقات الحالية:</span>
                  <p className="text-xl font-black font-mono text-amber-700 mt-0.5">
                    {formatMoney(currentBalance)} <span className="text-xs font-cairo">{currencySymbol}</span>
                  </p>
                </div>
                <div className="border-r border-outline-variant/20 pr-3">
                  <span className="text-[11px] font-bold text-on-surface-variant">المتبقي بعد التسديد:</span>
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
                    كامل المبلغ (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(Math.round(currentBalance / 2))}
                    className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    النصف (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(10000)}
                    className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    10,000 دج
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(50000)}
                    className="py-1.5 px-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 text-xs font-bold transition-all cursor-pointer"
                  >
                    50,000 دج
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
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-lg font-black font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-xs text-on-surface-variant">
                    {currencySymbol}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1.5 block">طريقة الدفع:</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'cash' ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-container text-on-surface border-outline-variant/20'
                    }`}
                  >
                    نقداً (Cash)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('check')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'check' ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-container text-on-surface border-outline-variant/20'
                    }`}
                  >
                    صك بنكي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'transfer' ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-container text-on-surface border-outline-variant/20'
                    }`}
                  >
                    تحويل بنكي
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('baridimob')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      paymentMethod === 'baridimob' ? 'bg-primary text-on-primary border-primary shadow-xs' : 'bg-surface-container text-on-surface border-outline-variant/20'
                    }`}
                  >
                    بريدي موب / CCP
                  </button>
                </div>
              </div>

              {/* Note / Cheque Ref */}
              <div>
                <label className="text-xs font-bold text-on-surface-variant mb-1 block">ملاحظة أو رقم الصك/الحوالة (اختياري):</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="مثال: صك رقم 12345، أو تحويل..."
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
                <span className="text-xs font-bold text-on-surface">طباعة وصل تسليم دفعة للمورد فوراً بعد التأكيد</span>
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
                  disabled={paymentAmount <= 0 || paymentMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-xs hover:shadow-md active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  {paymentMutation.isPending ? 'جاري التسجيل...' : 'تأكيد وحفظ الدفعة'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. MODAL: VIEW INVOICE DETAILS (معاينة الفاتورة)              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewingInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-on-surface font-cairo">تفاصيل فاتورة التوريد #{viewingInvoice.number}</h3>
                  <p className="text-xs text-on-surface-variant">المورد: <strong className="text-on-surface">{viewingInvoice.supplierName}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setViewingInvoice(null)}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-surface-container p-3 rounded-2xl text-center text-xs font-mono">
              <div>
                <span className="text-[10px] text-on-surface-variant font-cairo block">التاريخ:</span>
                <strong>{new Date(viewingInvoice.date).toLocaleDateString('ar-DZ')}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant font-cairo block">إجمالي الفاتورة:</span>
                <strong className="text-primary">{formatMoney(viewingInvoice.total)} {currencySymbol}</strong>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant font-cairo block">المبلغ المدفوع:</span>
                <strong className="text-emerald-600">{formatMoney(viewingInvoice.paidAmount || 0)} {currencySymbol}</strong>
              </div>
            </div>

            {/* Items List */}
            <div className="overflow-y-auto max-h-56 custom-scrollbar border border-outline-variant/20 rounded-2xl">
              <table className="w-full text-right border-collapse text-xs">
                <thead className="bg-surface-container border-b border-outline-variant/25 text-on-surface-variant font-bold">
                  <tr>
                    <th className="py-2 px-3">السلعة</th>
                    <th className="py-2 px-3 text-center">الكمية</th>
                    <th className="py-2 px-3 text-center">سعر الوحدة</th>
                    <th className="py-2 px-3 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {(viewingInvoice.items || []).map((it: any, i: number) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-bold text-on-surface">{it.name}</td>
                      <td className="py-2 px-3 text-center font-mono">{it.qty}</td>
                      <td className="py-2 px-3 text-center font-mono">{formatMoney(it.unitPrice)}</td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-primary">{formatMoney(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setViewingInvoice(null)}
                className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. MODAL: DELETE CONFIRMATION                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {supplierToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-red-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface font-cairo">تأكيد حذف المورد</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                هل أنت متأكد من حذف المورد <strong className="text-on-surface">"{supplierToDelete.name}"</strong>؟
              </p>
              {supplierToDelete.balance > 0 && (
                <div className="mt-2.5 p-2 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-600 font-bold">
                  تنبيه: هذا المورد لديه مستحقات قائمة بقيمة {formatMoney(supplierToDelete.balance)} دج!
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
                onClick={() => deleteSupplierMutation.mutate(supplierToDelete.id)}
                disabled={deleteSupplierMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                {deleteSupplierMutation.isPending ? 'جاري الحذف...' : 'نعم، حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
