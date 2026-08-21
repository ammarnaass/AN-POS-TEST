import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Customer } from '@/types';
import { generateId } from '@/utils';
import {
  Plus, Search, Edit2, Trash2, Upload, X, Users, CreditCard,
  AlertTriangle, FileText, ChevronLeft, ChevronRight, Phone,
  DollarSign, Filter, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CustomersPage() {
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery({
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

  const addCustomerMutation = useMutation({
    mutationFn: (data: { name: string; phone: string; creditLimit: number }) =>
      db.customers.add({
        id: generateId(),
        name: data.name,
        phone: data.phone,
        creditLimit: data.creditLimit,
        balance: 0,
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
        name: data.name,
        phone: data.phone,
        creditLimit: data.creditLimit,
        balance: data.balance,
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
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async ({ customerId, amount, currentBalance }: { customerId: string; amount: number; currentBalance: number }) => {
      await db.payments.add({
        id: generateId(),
        date: new Date().toISOString(),
        customerId,
        amount,
        type: 'credit',
        method: 'cash',
        createdBy: '',
        createdAt: new Date().toISOString(),
      });
      await db.customers.update(customerId, {
        balance: currentBalance - amount,
        updatedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const importCustomersMutation = useMutation({
    mutationFn: (customers: Customer[]) =>
      db.customers.bulkAdd(
        customers.map((c) => ({
          ...c,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', creditLimit: 0 });
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, searchQuery]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalDebt = customers.reduce((sum, c) => sum + c.balance, 0);
    const customersWithDebt = customers.filter(c => c.balance > 0).length;
    const totalCreditLimit = customers.reduce((sum, c) => sum + c.creditLimit, 0);
    return { totalCustomers, totalDebt, customersWithDebt, totalCreditLimit };
  }, [customers]);

  const handleSubmit = () => {
    if (!formData.name) return;
    if (editingCustomer) {
      updateCustomerMutation.mutate({ ...editingCustomer, ...formData });
    } else {
      addCustomerMutation.mutate(formData);
    }
    setFormData({ name: '', phone: '', creditLimit: 0 });
    setEditingCustomer(null);
    setShowForm(false);
  };

  const handlePayment = (customerId: string) => {
    if (paymentAmount <= 0) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;
    addPaymentMutation.mutate({ customerId, amount: paymentAmount, currentBalance: customer.balance });
    setPaymentAmount(0);
    setShowPayment(null);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const wb = XLSX.read(event.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
      const imported: Customer[] = data.map((row) => ({
        id: generateId(),
        name: row['الاسم'] || row['name'] || '',
        phone: String(row['الهاتف'] || row['phone'] || ''),
        creditLimit: Number(row['سقف الدين'] || row['creditLimit'] || 0),
        balance: 0,
      }));
      importCustomersMutation.mutate(imported);
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const getCustomerSales = (customerId: string) =>
    sales.filter((s) => s.customerId === customerId && s.type === 'sale');

  const getCustomerPayments = (customerId: string) =>
    payments.filter((p) => p.customerId === customerId);

  const getStatementEntries = (customerId: string) => {
    const customerSales = getCustomerSales(customerId).map((s) => ({
      date: s.date,
      type: 'sale' as const,
      number: s.number,
      description: `فاتورة ${s.number}`,
      debit: s.total,
      credit: s.paidAmount,
      status: s.status,
    }));
    const customerPayments = getCustomerPayments(customerId).map((p) => ({
      date: p.date,
      type: 'payment' as const,
      number: '-',
      description: 'دفعة',
      debit: 0,
      credit: p.amount,
      status: 'paid' as const,
    }));
    const all = [...customerSales, ...customerPayments].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let runningBalance = 0;
    return all.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, runningBalance };
    });
  };

  const getCreditWarning = (customer: Customer) => {
    if (customer.creditLimit <= 0) return null;
    const ratio = customer.balance / customer.creditLimit;
    if (ratio >= 1) return 'exceeded';
    if (ratio >= 0.8) return 'warning';
    return null;
  };

  return (
    <div className="space-y-6 glass-card rounded-xl border border-outline-variant/20 p-6">
      {/* Page Header */}
      <div className="flex flex-row-reverse justify-between items-center">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">إدارة الزبائن</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">إدارة حسابات الزبائن والديون والدفعات</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-5 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer text-label-md">
            <Upload className="w-4 h-4" />
            استيراد
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={() => { setFormData({ name: '', phone: '', creditLimit: 0 }); setEditingCustomer(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg shadow-md hover:bg-primary-container transition-all active:scale-95 text-label-md"
          >
            <Plus className="w-5 h-5" />
            إضافة زبون
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-primary/10 p-2 rounded-lg text-primary"><Users className="w-5 h-5" /></div>
            <span className="text-tertiary text-label-sm">+2.3%</span>
          </div>
          <p className="text-on-surface-variant text-label-sm">إجمالي الزبائن</p>
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.totalCustomers}</h3>
        </div>
        <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-error/10 p-2 rounded-lg text-error"><DollarSign className="w-5 h-5" /></div>
            <span className="text-error text-label-sm">+5.1%</span>
          </div>
          <p className="text-on-surface-variant text-label-sm">إجمالي الديون</p>
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.totalDebt.toFixed(2)} دج</h3>
        </div>
        <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-secondary/10 p-2 rounded-lg text-secondary"><AlertTriangle className="w-5 h-5" /></div>
            <span className="text-on-surface-variant text-label-sm">نشط</span>
          </div>
          <p className="text-on-surface-variant text-label-sm">زبائن مدينون</p>
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.customersWithDebt}</h3>
        </div>
        <div className="glass-card rounded-xl border border-outline-variant/20 p-5 hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-tertiary/10 p-2 rounded-lg text-tertiary"><CreditCard className="w-5 h-5" /></div>
            <span className="text-on-surface-variant text-label-sm">إجمالي</span>
          </div>
          <p className="text-on-surface-variant text-label-sm">سقف الديون</p>
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mt-1">{stats.totalCreditLimit.toFixed(2)} دج</h3>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="glass-card rounded-xl border border-outline-variant/20 p-4 flex items-center gap-4 flex-row-reverse">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث بالاسم أو رقم الهاتف..."
            className="w-full bg-surface-container border border-outline-variant/20 rounded-lg py-2.5 pr-10 pl-4 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
        </div>
        <button className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-4 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all">
          <Filter className="w-4 h-4" />
          <span className="text-label-md">تصفية</span>
        </button>
        <button className="flex items-center gap-2 bg-surface-container border border-outline-variant/20 px-4 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all">
          <Download className="w-4 h-4" />
          <span className="text-label-md">تصدير</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="glass-card rounded-xl border border-outline-variant/20 shadow-sm overflow-hidden">
        <table className="w-full text-right border-collapse">
          <thead className="bg-surface-container border-b border-outline-variant/20">
            <tr>
              <th className="px-6 py-4 text-on-surface-variant text-label-sm">اسم الزبون</th>
              <th className="px-6 py-4 text-on-surface-variant text-label-sm">بيانات الاتصال</th>
              <th className="px-6 py-4 text-on-surface-variant text-label-sm text-center">إجمالي المشتريات</th>
              <th className="px-6 py-4 text-on-surface-variant text-label-sm text-center">الرصيد الحالي</th>
              <th className="px-6 py-4 text-on-surface-variant text-label-sm text-center">سقف الدين</th>
              <th className="px-6 py-4 text-on-surface-variant text-label-sm text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {paginatedCustomers.map((customer) => {
              const customerSales = getCustomerSales(customer.id);
              const totalPurchases = customerSales.reduce((sum, s) => sum + s.total, 0);
              const creditWarning = getCreditWarning(customer);
              const initials = customer.name.split(' ').map(w => w[0]).join('').slice(0, 2);
              const avatarColors = ['bg-primary/10 text-primary', 'bg-secondary/10 text-secondary', 'bg-tertiary/10 text-tertiary'];
              const avatarColor = avatarColors[customers.indexOf(customer) % avatarColors.length];

              return (
                <tr key={customer.id} className={`hover:bg-surface-container/50 transition-colors group ${creditWarning === 'exceeded' ? 'bg-error-container/20' : creditWarning === 'warning' ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center font-bold text-sm`}>
                        {initials || 'ز'}
                      </div>
                      <div>
                        <p className="text-label-md text-on-surface">{customer.name}</p>
                        <p className="text-body-sm text-on-surface-variant">زبون</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-body-md text-on-surface">{customer.phone || '—'}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-label-md">{totalPurchases.toFixed(2)} دج</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-label-md ${customer.balance > 0 ? 'text-error' : 'text-tertiary'}`}>
                      {customer.balance.toFixed(2)} دج
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {customer.creditLimit > 0 ? (
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-outline-variant/20 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${customer.balance / customer.creditLimit >= 1 ? 'bg-error' : customer.balance / customer.creditLimit >= 0.8 ? 'bg-amber-500' : 'bg-tertiary'}`}
                            style={{ width: `${Math.min(100, (customer.balance / customer.creditLimit) * 100)}%` }}
                          />
                        </div>
                        <span className="text-body-sm text-on-surface-variant">
                          {customer.balance.toFixed(0)}/{customer.creditLimit.toFixed(0)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-body-sm text-on-surface-variant">غير محدد</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setStatementCustomer(customer)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all"
                        title="كشف حساب"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {customer.balance > 0 && (
                        <button
                          onClick={() => setShowPayment(customer.id)}
                          className="p-1.5 rounded-lg text-tertiary hover:bg-tertiary/10 transition-all"
                          title="تسجيل تسديد"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingCustomer(customer); setFormData({ name: customer.name, phone: customer.phone, creditLimit: customer.creditLimit }); setShowForm(true); }}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-highest transition-all"
                        title="تعديل"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCustomerMutation.mutate(customer.id)}
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

        {filteredCustomers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center text-outline-variant mb-4">
              <Users className="w-12 h-12" />
            </div>
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-2">لا يوجد زبائن مسجلين</h3>
            <p className="text-body-md text-on-surface-variant mb-6 text-center max-w-xs">أضف زبائنك الجدد أو استيرادهم من ملف Excel</p>
            <button
              onClick={() => { setFormData({ name: '', phone: '', creditLimit: 0 }); setEditingCustomer(null); setShowForm(true); }}
              className="bg-primary text-on-primary px-8 py-3 rounded-lg shadow-sm text-label-md hover:bg-primary-container transition-all"
            >
              إضافة أول زبون
            </button>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 bg-surface-container flex justify-between items-center border-t border-outline-variant/20">
          <p className="text-body-sm text-on-surface-variant">عرض {paginatedCustomers.length > 0 ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)}` : '0'} من أصل {filteredCustomers.length} زبون</p>
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

      {/* ========== Customer Form Modal ========== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-xl border border-outline-variant/20 p-8 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-cairo text-headline-sm font-bold text-on-surface">{editingCustomer ? 'تعديل زبون' : 'إضافة زبون جديد'}</h3>
              </div>
              <button onClick={() => { setShowForm(false); setEditingCustomer(null); }} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input placeholder="الاسم *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pr-12 pl-4 py-3.5 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input placeholder="رقم الهاتف" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full pr-12 pl-4 py-3.5 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <div className="relative">
                <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
                <input type="number" placeholder="سقف الدين" value={formData.creditLimit || ''} onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) || 0 })} className="w-full pr-12 pl-4 py-3.5 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditingCustomer(null); }} className="flex-1 py-3.5 border border-outline-variant/20 rounded-lg text-on-surface-variant text-label-md hover:bg-surface-container transition-all">إلغاء</button>
              <button onClick={handleSubmit} className="flex-1 py-3.5 bg-primary text-on-primary rounded-lg text-label-md shadow-sm hover:bg-primary-container transition-all active:scale-95">{editingCustomer ? 'حفظ التعديلات' : 'إضافة الزبون'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Payment Modal ========== */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-xl border border-outline-variant/20 p-8 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="font-cairo text-headline-sm font-bold text-on-surface">تسجيل تسديد</h3>
              </div>
              <button onClick={() => { setShowPayment(null); setPaymentAmount(0); }} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface-container rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-body-md text-on-surface-variant">الدين الحالي:</span>
                <span className="font-cairo text-headline-sm font-bold text-error">{customers.find((c) => c.id === showPayment)?.balance.toFixed(2)} {settings?.baseCurrency ?? 'DZD'}</span>
              </div>
            </div>
            <div className="relative">
              <DollarSign className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input type="number" placeholder="مبلغ التسديد" value={paymentAmount || ''} onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)} className="w-full pr-12 pl-4 py-3.5 border border-outline-variant/20 rounded-lg text-right bg-surface-container focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowPayment(null); setPaymentAmount(0); }} className="flex-1 py-3.5 border border-outline-variant/20 rounded-lg text-on-surface-variant text-label-md hover:bg-surface-container transition-all">إلغاء</button>
              <button onClick={() => handlePayment(showPayment)} className="flex-1 py-3.5 bg-tertiary text-white rounded-lg text-label-md shadow-sm hover:bg-tertiary-container transition-all active:scale-95">تأكيد التسديد</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Statement Modal ========== */}
      {statementCustomer && (() => {
        const entries = getStatementEntries(statementCustomer.id);
        const totalSales = entries.filter((e) => e.type === 'sale').reduce((sum, e) => sum + e.debit, 0);
        const totalPayments = entries.filter((e) => e.type === 'payment').reduce((sum, e) => sum + e.credit, 0);
        const balance = statementCustomer.balance;

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-xl border border-outline-variant/20 p-8 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                    {statementCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-cairo text-headline-sm font-bold text-on-surface">كشف حساب - {statementCustomer.name}</h3>
                    <p className="text-body-sm text-on-surface-variant">{statementCustomer.phone || '—'}</p>
                  </div>
                </div>
                <button onClick={() => setStatementCustomer(null)} className="text-on-surface-variant hover:text-on-surface p-2 rounded-lg hover:bg-surface-container transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="glass-card rounded-xl border border-outline-variant/20 p-4 text-center">
                  <p className="text-body-sm text-on-surface-variant">إجمالي المشتريات</p>
                  <p className="font-cairo text-headline-sm font-bold text-primary">{totalSales.toFixed(2)} {settings?.baseCurrency ?? 'DZD'}</p>
                </div>
                <div className="glass-card rounded-xl border border-outline-variant/20 p-4 text-center">
                  <p className="text-body-sm text-on-surface-variant">إجمالي الدفعات</p>
                  <p className="font-cairo text-headline-sm font-bold text-tertiary">{totalPayments.toFixed(2)} {settings?.baseCurrency ?? 'DZD'}</p>
                </div>
                <div className={`glass-card rounded-xl border border-outline-variant/20 p-4 text-center ${balance > 0 ? 'bg-error-container/30' : ''}`}>
                  <p className="text-body-sm text-on-surface-variant">الرصيد الحالي</p>
                  <p className={`font-cairo text-headline-sm font-bold ${balance > 0 ? 'text-error' : 'text-tertiary'}`}>{balance.toFixed(2)} {settings?.baseCurrency ?? 'DZD'}</p>
                </div>
              </div>

              {statementCustomer.creditLimit > 0 && (
                <div className={`flex items-center gap-2 text-body-sm mb-4 px-4 py-2.5 rounded-lg ${getCreditWarning(statementCustomer) ? 'bg-error-container/30 text-error' : 'bg-surface-container text-on-surface-variant'}`}>
                  <AlertTriangle className="w-4 h-4" />
                  سقف الدين: {statementCustomer.creditLimit.toFixed(2)} {settings?.baseCurrency ?? 'DZD'}
                  {getCreditWarning(statementCustomer) === 'exceeded' && ' — تم تجاوز السقف!'}
                  {getCreditWarning(statementCustomer) === 'warning' && ' — قريب من سقف الدين'}
                </div>
              )}

              <div className="overflow-auto flex-1 min-h-0 border border-outline-variant/20 rounded-xl">
                {entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <FileText className="w-12 h-12 text-outline-variant mb-3" />
                    <p className="text-body-md text-on-surface-variant">لا توجد حركات</p>
                  </div>
                ) : (
                  <table className="w-full text-right">
                    <thead className="bg-surface-container sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-on-surface-variant text-label-sm">التاريخ</th>
                        <th className="px-4 py-3 text-on-surface-variant text-label-sm">النوع</th>
                        <th className="px-4 py-3 text-on-surface-variant text-label-sm">البيان</th>
                        <th className="px-4 py-3 text-on-surface-variant text-label-sm text-center">المدين</th>
                        <th className="px-4 py-3 text-on-surface-variant text-label-sm text-center">الدائن</th>
                        <th className="px-4 py-3 text-on-surface-variant text-label-sm text-center">الرصيد</th>
                        <th className="px-4 py-3 text-on-surface-variant text-label-sm text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20">
                      {entries.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                          <td className="px-4 py-3 text-body-md">{new Date(entry.date).toLocaleDateString('ar-DZ')}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-body-sm text-label-sm ${entry.type === 'sale' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-tertiary-container text-on-tertiary-container'}`}>
                              {entry.type === 'sale' ? 'فاتورة' : 'دفعة'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-body-md">{entry.description}</td>
                          <td className="px-4 py-3 text-center text-label-md">{entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</td>
                          <td className="px-4 py-3 text-center text-label-md text-tertiary">{entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</td>
                          <td className={`px-4 py-3 text-center text-label-md ${entry.runningBalance > 0 ? 'text-error' : 'text-tertiary'}`}>{entry.runningBalance.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-body-sm text-label-sm ${
                              entry.status === 'paid' ? 'bg-tertiary-container text-on-tertiary-container' :
                              entry.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-error-container text-on-error-container'
                            }`}>
                              {entry.status === 'paid' ? 'مدفوع' : entry.status === 'partial' ? 'جزئي' : 'غير مدفوع'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <button onClick={() => setStatementCustomer(null)} className="mt-4 py-3 bg-surface-container hover:bg-surface-container-high rounded-lg text-label-md text-on-surface-variant transition-all">
                إغلاق
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
