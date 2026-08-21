import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import type { Expense } from '@/types';
import { formatDate } from '@/utils';
import { Plus, Search, Edit2, Trash2, X, DollarSign, Wallet, TrendingDown, Calendar, Filter } from 'lucide-react';

const expenseCategories = ['إيجار', 'رواتب', 'نقل', 'فواتير', 'صيانة', 'تسويق', 'تغليف', 'أخرى'];

const categoryColors: Record<string, string> = {
  'إيجار': 'bg-cyan-500/20 text-cyan-400',
  'رواتب': 'bg-emerald-500/20 text-emerald-400',
  'نقل': 'bg-purple-500/20 text-purple-400',
  'فواتير': 'bg-amber-500/20 text-amber-400',
  'صيانة': 'bg-red-500/20 text-red-400',
  'تسويق': 'bg-pink-500/20 text-pink-400',
  'تغليف': 'bg-blue-500/20 text-blue-400',
  'أخرى': 'bg-gray-500/20 text-on-surface-variant',
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => db.expenses.toArray(),
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], label: '', category: 'أخرى', amount: 0 });

  const addMutation = useMutation({
    mutationFn: (data: { date: string; label: string; category: string; amount: number }) =>
      db.expenses.add({ id: crypto.randomUUID(), ...data, createdBy: 'unknown', createdAt: new Date().toISOString() }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; date: string; label: string; category: string; amount: number }) =>
      db.expenses.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.expenses.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter((e) => e.label.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }, [expenses, searchQuery]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory: Record<string, number> = {};
    filteredExpenses.forEach((e) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    return { total, count: filteredExpenses.length, topCategory: topCategory?.[0] || '—', topAmount: topCategory?.[1] || 0 };
  }, [filteredExpenses]);

  const handleSubmit = () => {
    if (!formData.label || formData.amount <= 0) return;
    if (editingExpense) updateMutation.mutate({ id: editingExpense.id, ...formData });
    else addMutation.mutate(formData);
    setFormData({ date: new Date().toISOString().split('T')[0], label: '', category: 'أخرى', amount: 0 });
    setEditingExpense(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <DollarSign className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-on-surface font-cairo">إدارة المصاريف</h1>
              <p className="text-sm text-on-surface-variant">تتبع المصروفات اليومية والشهرية</p>
            </div>
          </div>
          <button onClick={() => { setFormData({ date: new Date().toISOString().split('T')[0], label: '', category: 'أخرى', amount: 0 }); setEditingExpense(null); setShowForm(true); }}
            className="btn-primary">
            <Plus className="w-4 h-4" /> مصروف جديد
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-on-surface-variant">إجمالي المصاريف</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{stats.total.toLocaleString('ar-DZ')} دج</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <span className="text-sm text-on-surface-variant">عدد المصاريف</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{stats.count}</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-on-surface-variant">متوسط المصروف</span>
          </div>
          <p className="text-2xl font-bold text-on-surface">{stats.count > 0 ? Math.round(stats.total / stats.count).toLocaleString('ar-DZ') : 0} دج</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-sm text-on-surface-variant">أعلى فئة مصروف</span>
          </div>
          <p className="text-lg font-bold text-on-surface">{stats.topCategory}</p>
          <p className="text-xs text-on-surface-variant">{stats.topAmount.toLocaleString('ar-DZ')} دج</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="glass-card rounded-2xl p-4 flex items-center gap-4" dir="rtl">
        <div className="flex-1 relative">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث في المصاريف..."
            className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all pr-10" />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-on-surface-variant" />
          <span className="text-sm text-on-surface-variant">من:</span>
          <input type="date" className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all w-36" />
          <span className="text-sm text-on-surface-variant">إلى:</span>
          <input type="date" className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all w-36" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/20">
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">التاريخ</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">الوصف</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">الفئة</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">المبلغ</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">الحالة</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-on-surface-variant">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-b border-outline-variant/20/30 hover:bg-surface-container-high transition-colors">
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDate(expense.date)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center border border-red-500/30">
                        <DollarSign className="w-4 h-4 text-red-400" />
                      </div>
                      <span className="text-sm font-medium text-on-surface">{expense.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[expense.category] || 'bg-gray-500/20 text-on-surface-variant'}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-red-400">{expense.amount.toLocaleString('ar-DZ')} دج</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">مصروف</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingExpense(expense); setFormData({ date: expense.date.split('T')[0], label: expense.label, category: expense.category, amount: expense.amount }); setShowForm(true); }}
                        className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deleteMutation.mutate(expense.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredExpenses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
            <DollarSign className="w-14 h-14 mb-4 opacity-20" />
            <p className="text-sm">لا توجد مصاريف</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <DollarSign className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-on-surface font-cairo">{editingExpense ? 'تعديل مصروف' : 'إضافة مصروف'}</h3>
              </div>
              <button onClick={() => { setShowForm(false); setEditingExpense(null); }} className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-on-surface-variant mb-2">التاريخ</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-2">الوصف *</label>
                <input placeholder="وصف المصروف" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-2">الفئة</label>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all">
                  {expenseCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-on-surface-variant mb-2">المبلغ *</label>
                <input type="number" placeholder="0" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })} className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSubmit} className="flex-1 btn-primary">
                {editingExpense ? 'حفظ التعديلات' : 'إضافة المصروف'}
              </button>
              <button onClick={() => { setShowForm(false); setEditingExpense(null); }}
                className="px-6 py-3 text-on-surface-variant hover:text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-high transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
