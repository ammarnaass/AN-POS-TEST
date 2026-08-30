import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import type { Supplier, SupplierEntry, SaleItem } from '@/types';
import {
  Plus, Search, Edit2, Trash2, X, Truck, ShoppingCart,
  FileText, Printer, DollarSign, Eye, Filter, Download,
  ChevronLeft, ChevronRight, Truck as TruckIcon, Package,
  Wallet, Calendar, User, Phone, Store
} from 'lucide-react';

type Tab = 'suppliers' | 'invoices' | 'statement';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => db.suppliers.toArray(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });
  const { data: purchases = [] } = useQuery({
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

  const baseCurrency = settings?.baseCurrency ?? 'DZD';
  const shopName = settings?.shopName ?? '';
  const invoicePrefix = settings?.invoicePrefix ?? 'INV';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('suppliers');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  const [showPurchaseInvoice, setShowPurchaseInvoice] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<SaleItem[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<string | null>(null);

  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter((s) => s.name.toLowerCase().includes(q) || s.phone.includes(q));
  }, [suppliers, searchQuery]);

  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);
  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSuppliers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSuppliers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab]);

  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.status === 'active' &&
        (p.name.toLowerCase().includes(q) || p.barcode.includes(q))
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

  const statementEntries = useMemo(() => {
    if (!selectedSupplierForStatement) return [];
    return supplierEntries
      .filter((e) => e.supplierId === selectedSupplierForStatement)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [supplierEntries, selectedSupplierForStatement]);

  const statementSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierForStatement),
    [suppliers, selectedSupplierForStatement]
  );

  const stats = useMemo(() => {
    const totalSuppliers = suppliers.length;
    const activeOrders = supplierEntries.filter(e => e.type === 'purchase').length;
    const totalDebt = suppliers.reduce((sum, s) => sum + s.balance, 0);
    const todayDeliveries = supplierEntries.filter(e => {
      const d = new Date(e.date);
      const today = new Date();
      return e.type === 'purchase' && d.toDateString() === today.toDateString();
    }).length;
    return { totalSuppliers, activeOrders, totalDebt, todayDeliveries };
  }, [suppliers, supplierEntries]);

  const addSupplierMutation = useMutation({
    mutationFn: (data: { name: string; phone: string }) =>
      db.suppliers.add({
        id: generateId(),
        name: data.name,
        phone: data.phone,
        balance: 0,
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
        name: supplier.name,
        phone: supplier.phone,
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
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async ({ supplierId, items, paidAmount: paid, total }: { supplierId: string; items: SaleItem[]; paidAmount: number; total: number }) => {
      const allPurchases = await db.purchases.toArray();
      const maxNum = allPurchases.reduce((max, p) => {
        const num = parseInt(p.number.slice(-6));
        return num > max ? num : max;
      }, 0);
      const invoiceNumber = `${invoicePrefix}-PSH-${String(maxNum + 1).padStart(6, '0')}`;
      const purchaseId = generateId();

      await db.purchases.add({
        id: purchaseId,
        number: invoiceNumber,
        date: new Date().toISOString(),
        supplierId,
        subtotal: total,
        tvaAmount: 0,
        total,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
            updatedAt: new Date().toISOString(),
          });
        }

        await db.stock_movements.add({
          id: generateId(),
          productId: item.productId,
          type: 'purchase',
          qty: item.qty,
          createdBy: 'system',
          createdAt: new Date().toISOString(),
        });
      }

      const supplier = await db.suppliers.get(supplierId);
      if (supplier) {
        await db.suppliers.update(supplierId, {
          balance: supplier.balance + (total - paid),
          updatedAt: new Date().toISOString(),
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
    mutationFn: async ({ supplierId, amount }: { supplierId: string; amount: number }) => {
      const supplier = await db.suppliers.get(supplierId);
      if (supplier) {
        await db.suppliers.update(supplierId, {
          balance: Math.max(0, supplier.balance - amount),
          updatedAt: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const handleSubmitSupplier = () => {
    if (!formData.name) return;
    if (editingSupplier) {
      updateSupplierMutation.mutate({ ...editingSupplier, ...formData });
    } else {
      addSupplierMutation.mutate(formData);
    }
    setFormData({ name: '', phone: '' });
    setEditingSupplier(null);
    setShowSupplierForm(false);
  };

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
          unitPrice: product.costPrice,
          lineTotal: product.costPrice,
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

  const handlePayment = () => {
    if (!showPayment || paymentAmount <= 0) return;
    const supplier = suppliers.find((s) => s.id === showPayment);
    if (!supplier) return;
    const actualPayment = Math.min(paymentAmount, supplier.balance);
    paymentMutation.mutate({ supplierId: showPayment, amount: actualPayment });
    setPaymentAmount(0);
    setShowPayment(null);
  };

  const printInvoice = (entry: SupplierEntry) => {
    const supplier = suppliers.find((s) => s.id === entry.supplierId);
    const printContent = `
      <html dir="rtl">
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h2 { margin: 0; } .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background: #f5f5f5; }
          .total { font-size: 18px; font-weight: bold; text-align: left; margin-top: 10px; }
          .info { display: flex; justify-content: space-between; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${shopName}</h2>
          <p>فاتورة شراء - ${entry.invoiceNumber}</p>
        </div>
        <div class="info">
          <div><strong>المورد:</strong> ${supplier?.name || '—'}</div>
          <div><strong>التاريخ:</strong> ${new Date(entry.date).toLocaleDateString('ar-DZ')}</div>
        </div>
        <table>
          <tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>المجموع</th></tr>
          ${entry.items
            .map(
              (item) =>
                `<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.unitPrice.toFixed(2)}</td><td>${item.lineTotal.toFixed(2)}</td></tr>`
            )
            .join('')}
        </table>
        <div class="total">الإجمالي: ${entry.amount.toFixed(2)} ${baseCurrency}</div>
        <div>المدفوع: ${entry.paidAmount.toFixed(2)} ${baseCurrency}</div>
        <div>المتبقي: ${entry.remainingBalance.toFixed(2)} ${baseCurrency}</div>
      </body></html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header Section */}
      <div className="flex flex-row-reverse justify-between items-center">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">إدارة الموردين</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">دليل الموردين، الطلبات، والأرصدة المستحقة</p>
        </div>
        <button
          onClick={() => { setFormData({ name: '', phone: '' }); setEditingSupplier(null); setShowSupplierForm(true); }}
          className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl shadow-md hover:bg-primary-container transition-all active:scale-95 font-label-lg"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مورد جديد</span>
        </button>
      </div>

      {/* Dashboard Metric Cards (Bento Style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <TruckIcon className="w-5 h-5" />
            </div>
            <span className="text-tertiary font-label-md text-label-md">+4.5%</span>
          </div>
          <p className="text-on-surface-variant font-label-md text-label-md">إجمالي الموردين</p>
          <h3 className="font-numeral-lg text-numeral-lg text-on-surface mt-1">{stats.totalSuppliers}</h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-secondary/10 p-2 rounded-lg text-secondary">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <span className="text-tertiary font-label-md text-label-md">+12%</span>
          </div>
          <p className="text-on-surface-variant font-label-md text-label-md">طلبيات نشطة</p>
          <h3 className="font-numeral-lg text-numeral-lg text-on-surface mt-1">{stats.activeOrders}</h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-error/10 p-2 rounded-lg text-error">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-error font-label-md text-label-md">-2.1%</span>
          </div>
          <p className="text-on-surface-variant font-label-md text-label-md">إجمالي المستحقات</p>
          <h3 className="font-numeral-lg text-numeral-lg text-on-surface mt-1">{stats.totalDebt.toFixed(2)} دج</h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-tertiary/10 p-2 rounded-lg text-tertiary">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-on-surface-variant font-label-md text-label-md">اليوم</span>
          </div>
          <p className="text-on-surface-variant font-label-md text-label-md">عمليات التوريد اليوم</p>
          <h3 className="font-numeral-lg text-numeral-lg text-on-surface mt-1">{stats.todayDeliveries}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low p-1.5 rounded-xl w-fit">
        {[
          { key: 'suppliers' as Tab, label: 'الموردون', icon: Truck },
          { key: 'invoices' as Tab, label: 'فواتير الشراء', icon: FileText },
          { key: 'statement' as Tab, label: 'كشف الحساب', icon: Eye },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-label-md font-label-md transition-all ${
              activeTab === key
                ? 'bg-surface-container-lowest shadow-sm text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ========== Suppliers Tab ========== */}
      {activeTab === 'suppliers' && (
        <>
          {/* Search and Filter Bar */}
          <div className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4 flex-row-reverse border border-outline-variant">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث عن مورد بواسطة الاسم، الهاتف..."
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 pr-10 pl-4 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
            </div>
            <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant px-4 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all">
              <Filter className="w-4 h-4" />
              <span className="font-label-lg">تصفية</span>
            </button>
            <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant px-4 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all">
              <Download className="w-4 h-4" />
              <span className="font-label-lg">تصدير</span>
            </button>
          </div>

          {/* Suppliers Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant">اسم المورد</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant">بيانات الاتصال</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">إجمالي الطلبات</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">الرصيد الحالي</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">الحالة</th>
                  <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {paginatedSuppliers.map((supplier) => {
                  const entryCount = supplierEntries.filter(
                    (e) => e.supplierId === supplier.id && e.type === 'purchase'
                  ).length;
                  const initials = supplier.name.split(' ').map(w => w[0]).join('').slice(0, 2);
                  const avatarColors = ['bg-primary/10 text-primary', 'bg-secondary/10 text-secondary', 'bg-tertiary/10 text-tertiary', 'bg-error/10 text-error'];
                  const avatarColor = avatarColors[suppliers.indexOf(supplier) % avatarColors.length];
                  return (
                    <tr key={supplier.id} className="hover:bg-surface-container-low/50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center font-bold text-sm`}>
                            {initials || 'م'}
                          </div>
                          <div>
                            <p className="font-label-lg text-on-surface">{supplier.name}</p>
                            <p className="text-body-sm text-on-surface-variant">{supplier.id?.slice(0, 8) || 'SUP-001'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-body-md text-on-surface">{supplier.phone || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-body-sm">
                          {entryCount} طلبية
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-numeral-lg text-body-lg ${supplier.balance > 0 ? 'text-error' : supplier.balance < 0 ? 'text-tertiary' : 'text-on-surface'}`}>
                          {supplier.balance.toFixed(2)} دج
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-body-sm font-label-md ${
                          supplier.balance > 0
                            ? 'bg-tertiary-container text-on-tertiary-container'
                            : 'bg-outline-variant text-on-surface-variant'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${supplier.balance > 0 ? 'bg-tertiary' : 'bg-outline'}`} />
                          {supplier.balance > 0 ? 'نشط' : 'مسدد'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => { setShowPurchaseInvoice(supplier.id); setInvoiceItems([]); setPaidAmount(0); }}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all"
                            title="فاتورة شراء"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingSupplier(supplier); setFormData({ name: supplier.name, phone: supplier.phone }); setShowSupplierForm(true); }}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {supplier.balance > 0 && (
                            <button
                              onClick={() => setShowPayment(supplier.id)}
                              className="p-1.5 rounded-lg text-tertiary hover:bg-tertiary/10 transition-all"
                              title="تسديد"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteSupplierMutation.mutate(supplier.id)}
                            className="p-1.5 rounded-lg text-error hover:bg-error-container/20 transition-all"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSuppliers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest">
                <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center text-outline-variant mb-4">
                  <Package className="w-12 h-12" />
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">لا يوجد موردين مسجلين</h3>
                <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-xs">ابدأ بإضافة مورديك هنا لإدارة مشترياتك ومستحقاتك المالية بكل سهولة.</p>
                <button
                  onClick={() => { setFormData({ name: '', phone: '' }); setEditingSupplier(null); setShowSupplierForm(true); }}
                  className="bg-primary text-on-primary px-8 py-3 rounded-xl shadow-sm font-label-lg hover:bg-primary-container transition-all"
                >
                  إضافة المورد الأول
                </button>
              </div>
            )}

            {/* Pagination */}
            <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center border-t border-outline-variant">
              <p className="text-body-sm text-on-surface-variant">
                عرض {paginatedSuppliers.length > 0 ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredSuppliers.length)}` : '0'} من أصل {filteredSuppliers.length} مورد
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 7) p = i + 1;
                    else if (currentPage <= 4) p = i + 1;
                    else if (currentPage >= totalPages - 3) p = totalPages - 6 + i;
                    else p = currentPage - 3 + i;
                    return (
                      <button key={p} onClick={() => setCurrentPage(p)}
                        className={`w-9 h-9 rounded-lg text-label-md transition-all ${currentPage === p ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest disabled:opacity-30 transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========== Purchase Invoices Tab ========== */}
      {activeTab === 'invoices' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-surface-container-low border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">رقم الفاتورة</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">المورد</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant">التاريخ</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">الإجمالي</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">المدفوع</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">المتبقي</th>
                <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {supplierEntries
                .filter((e) => e.type === 'purchase')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry) => {
                  const supplier = suppliers.find((s) => s.id === entry.supplierId);
                  return (
                    <tr key={entry.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-body-sm">{entry.invoiceNumber}</td>
                      <td className="px-6 py-4 text-body-md">{supplier?.name || '—'}</td>
                      <td className="px-6 py-4 text-body-md">{new Date(entry.date).toLocaleDateString('ar-DZ')}</td>
                      <td className="px-6 py-4 text-center font-label-lg">{entry.amount.toFixed(2)} {baseCurrency}</td>
                      <td className="px-6 py-4 text-center text-tertiary">{entry.paidAmount.toFixed(2)} {baseCurrency}</td>
                      <td className={`px-6 py-4 text-center font-label-lg ${entry.remainingBalance > 0 ? 'text-error' : ''}`}>
                        {entry.remainingBalance.toFixed(2)} {baseCurrency}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => printInvoice(entry)} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all" title="طباعة">
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {supplierEntries.filter((e) => e.type === 'purchase').length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="w-12 h-12 text-outline-variant mb-3" />
              <p className="text-body-md text-on-surface-variant">لا توجد فواتير شراء بعد</p>
            </div>
          )}
        </div>
      )}

      {/* ========== Supplier Statement Tab ========== */}
      {activeTab === 'statement' && (
        <div className="space-y-4">
          {/* Supplier selector */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
            <label className="block font-label-lg text-on-surface mb-3">اختر المورد</label>
            <select
              value={selectedSupplierForStatement || ''}
              onChange={(e) => setSelectedSupplierForStatement(e.target.value || null)}
              className="w-full px-4 py-3 border border-outline-variant rounded-lg text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="">— اختر مورد —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {selectedSupplierForStatement && statementSupplier && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-outline-variant">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    {statementSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-headline-md text-on-surface">{statementSupplier.name}</h3>
                    <p className="text-body-sm text-on-surface-variant">{statementSupplier.phone || '—'}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-body-sm text-on-surface-variant">الرصيد الحالي</p>
                  <p className={`font-numeral-lg ${statementSupplier.balance > 0 ? 'text-error' : statementSupplier.balance < 0 ? 'text-tertiary' : 'text-on-surface'}`}>
                    {statementSupplier.balance.toFixed(2)} {baseCurrency}
                  </p>
                </div>
              </div>

              <table className="w-full text-right">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant">رقم العملية</th>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant">النوع</th>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant">التاريخ</th>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">المبلغ</th>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">المدفوع</th>
                    <th className="px-6 py-4 font-label-lg text-on-surface-variant text-center">المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {statementEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-body-sm">{entry.invoiceNumber}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-body-sm font-label-md ${
                          entry.type === 'purchase'
                            ? 'bg-primary-fixed text-on-primary-fixed-variant'
                            : 'bg-tertiary-container text-on-tertiary-container'
                        }`}>
                          {entry.type === 'purchase' ? 'شراء' : 'تسديد'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-md">{new Date(entry.date).toLocaleDateString('ar-DZ')}</td>
                      <td className="px-6 py-4 text-center font-label-lg">{entry.amount.toFixed(2)} {baseCurrency}</td>
                      <td className="px-6 py-4 text-center text-tertiary">{entry.paidAmount.toFixed(2)} {baseCurrency}</td>
                      <td className={`px-6 py-4 text-center ${entry.remainingBalance > 0 ? 'text-error font-label-lg' : ''}`}>
                        {entry.remainingBalance.toFixed(2)} {baseCurrency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {statementEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Eye className="w-12 h-12 text-outline-variant mb-3" />
                  <p className="text-body-md text-on-surface-variant">لا توجد معاملات لهذا المورد</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== Supplier Form Modal ========== */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="font-headline-md text-on-surface">
                  {editingSupplier ? 'تعديل مورد' : 'إضافة مورد جديد'}
                </h3>
              </div>
              <button onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-low transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Store className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input
                  placeholder="الاسم *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pr-12 pl-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input
                  placeholder="رقم الهاتف"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pr-12 pl-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowSupplierForm(false); setEditingSupplier(null); }}
                className="flex-1 py-3.5 border border-outline-variant rounded-xl text-on-surface-variant font-label-lg hover:bg-surface-container-low transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmitSupplier}
                className="flex-1 py-3.5 bg-primary text-on-primary rounded-xl font-label-lg shadow-sm hover:bg-primary-container transition-all active:scale-95"
              >
                {editingSupplier ? 'حفظ التعديلات' : 'إضافة المورد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Purchase Invoice Modal ========== */}
      {showPurchaseInvoice && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-headline-md text-on-surface">فاتورة شراء</h3>
                  <p className="text-body-sm text-on-surface-variant">{selectedSupplier.name}</p>
                </div>
              </div>
              <button onClick={() => { setShowPurchaseInvoice(null); setInvoiceItems([]); setPaidAmount(0); }} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-low transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product search */}
            <div className="relative mb-4">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                type="text"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                placeholder="بحث عن منتج (الاسم أو الباركود)..."
                className="w-full pr-12 pl-4 py-3 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md"
              />
              {productSearchQuery && filteredProducts.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {filteredProducts.slice(0, 10).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addProductToInvoice(product)}
                      className="w-full px-4 py-3 text-right hover:bg-surface-container-low flex justify-between items-center text-body-md transition-colors border-b border-outline-variant/50 last:border-0"
                    >
                      <span className="font-label-lg">{product.name}</span>
                      <span className="text-body-sm text-on-surface-variant">
                        مخزون: {product.quantity} | سعر: {product.costPrice.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice items table */}
            {invoiceItems.length > 0 && (
              <div className="mb-4 bg-surface-container-low rounded-xl overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-surface-container border-b border-outline-variant">
                    <tr>
                      <th className="px-4 py-3 font-label-lg text-on-surface-variant">المنتج</th>
                      <th className="px-4 py-3 font-label-lg text-on-surface-variant text-center">الكمية</th>
                      <th className="px-4 py-3 font-label-lg text-on-surface-variant text-center">سعر الشراء</th>
                      <th className="px-4 py-3 font-label-lg text-on-surface-variant text-center">المجموع</th>
                      <th className="px-4 py-3 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {invoiceItems.map((item) => (
                      <tr key={item.productId} className="hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="px-4 py-3 text-body-md">{item.name}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateInvoiceItemQty(item.productId, Number(e.target.value) || 0)}
                            className="w-16 text-center border border-outline-variant rounded-lg px-1 py-1.5 text-body-sm bg-surface-container-lowest"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItemPrice(item.productId, Number(e.target.value) || 0)}
                            className="w-24 text-center border border-outline-variant rounded-lg px-1 py-1.5 text-body-sm bg-surface-container-lowest"
                          />
                        </td>
                        <td className="px-4 py-3 text-center font-label-lg text-on-surface">{item.lineTotal.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => updateInvoiceItemQty(item.productId, 0)}
                            className="text-error hover:bg-error-container/20 p-1.5 rounded-lg transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {invoiceItems.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant text-body-md bg-surface-container-low rounded-xl">
                <Package className="w-12 h-12 mx-auto mb-3 text-outline-variant" />
                ابحث عن منتج وأضفه للفاتورة
              </div>
            )}

            {/* Totals and payment */}
            {invoiceItems.length > 0 && (
              <div className="border-t border-outline-variant pt-4 space-y-4">
                <div className="flex flex-row-reverse justify-between items-center text-lg">
                  <span className="font-label-lg text-on-surface-variant">الإجمالي:</span>
                  <span className="font-numeral-lg text-on-surface">{invoiceTotal.toFixed(2)} {baseCurrency}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="font-label-lg text-on-surface-variant whitespace-nowrap">المبلغ المدفوع:</label>
                  <input
                    type="number"
                    min="0"
                    max={invoiceTotal}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                    className="flex-1 px-4 py-3 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="0"
                  />
                </div>
                <div className="flex flex-row-reverse justify-between items-center text-body-md">
                  <span className="text-on-surface-variant">المتبقي:</span>
                  <span className={`font-label-lg ${invoiceTotal - paidAmount > 0 ? 'text-error' : 'text-tertiary'}`}>
                    {(invoiceTotal - paidAmount).toFixed(2)} {baseCurrency}
                  </span>
                </div>
                <button
                  onClick={confirmPurchaseInvoice}
                  className="w-full py-3.5 bg-primary text-on-primary rounded-xl font-label-lg shadow-sm hover:bg-primary-container transition-all active:scale-95"
                >
                  تأكيد الفاتورة
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== Payment Modal ========== */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="font-headline-md text-on-surface">تسجيل تسديد</h3>
              </div>
              <button onClick={() => { setShowPayment(null); setPaymentAmount(0); }} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container-low transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-body-md text-on-surface-variant">الرصيد الحالي:</span>
                <span className="font-numeral-lg text-error">
                  {suppliers.find((s) => s.id === showPayment)?.balance.toFixed(2)} {baseCurrency}
                </span>
              </div>
            </div>
            <div className="relative">
              <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                type="number"
                placeholder="مبلغ التسديد"
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                className="w-full pr-12 pl-4 py-3.5 border border-outline-variant rounded-xl text-right bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPayment(null); setPaymentAmount(0); }}
                className="flex-1 py-3.5 border border-outline-variant rounded-xl text-on-surface-variant font-label-lg hover:bg-surface-container-low transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handlePayment}
                className="flex-1 py-3.5 bg-tertiary text-white rounded-xl font-label-lg shadow-sm hover:bg-tertiary-container transition-all active:scale-95"
              >
                تأكيد التسديد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
