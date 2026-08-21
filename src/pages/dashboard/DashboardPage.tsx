import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  Receipt,
  BarChart3,
  Users,
  ArrowUpRight,
  Wallet,
  Calculator,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  ChevronLeft,
  Store,
  Sparkles,
  Zap,
} from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';
import ExpensesPage from '@/features/expenses/ExpensesPage';
import ProfitCenterTab from './ProfitCenterTab';
import ZakatCalculatorTab from './ZakatCalculatorTab';

type Tab = 'overview' | 'expenses' | 'profit' | 'zakat';

const tabs: { key: Tab; label: string; icon: typeof ShoppingCart }[] = [
  { key: 'overview', label: 'لوحة المؤشرات العامة', icon: BarChart3 },
  { key: 'expenses', label: 'حساب المصروفات', icon: Wallet },
  { key: 'profit', label: 'مركز مراقبة الأرباح', icon: TrendingUp },
  { key: 'zakat', label: 'حساب الزكاة', icon: Calculator },
];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => db.expenses.toArray(),
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => (s.date || '').startsWith(todayStr));
  const totalRevenue = todaySales
    .filter((s) => s.type === 'sale' || !s.type)
    .reduce((sum, s) => sum + (s.total || 0), 0);
  const totalReturns = todaySales
    .filter((s) => s.type === 'return')
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const totalItemsSold = todaySales.reduce((sum, s) => {
    const items = (s.items as Array<{ qty?: number }>) || [];
    return sum + items.reduce((si, i) => si + Number(i.qty || 0), 0);
  }, 0);

  const activeProducts = products.filter((p) => p.status === 'active');
  const lowStockProducts = activeProducts.filter(
    (p) => Number(p.quantity || 0) <= Number(p.lowStockThreshold || 5)
  );

  const todayExpenses = expenses.filter((e) => (e.date || '').startsWith(todayStr));
  const totalExpenses = todayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const inventoryValue = activeProducts.reduce(
    (sum, p) => sum + (Number(p.retailPrice || 0) * Number(p.quantity || 0)),
    0
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── الرأس والترحيب وأزرار الإجراءات السريعة ─────────────────── */}
      <div className="bg-gradient-to-r from-surface-container-low via-surface to-surface-container-low p-6 rounded-3xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/25">
            <Store className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-on-surface font-cairo">
                مرحباً بك، {currentUser?.name || 'المدير'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                اليوم: {new Date().toLocaleDateString('ar-DZ')}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              لوحة التحكم والإحصائيات الشاملة — متطابقة ولحظية مع تطبيق الهاتف المحمول
            </p>
          </div>
        </div>

        {/* أزرار الاختصارات السريعة */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => navigate('/pos/quick')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>نقطة البيع السريعة</span>
          </button>
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>نقطة البيع المتقدمة (PRO)</span>
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface text-on-surface hover:bg-surface-container-high rounded-xl font-bold text-sm border border-outline-variant/20 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>إضافة صنف</span>
          </button>
        </div>
      </div>

      {/* ── تبويبات أقسام لوحة التحكم ───────────────────────────────── */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-primary text-on-primary shadow-md shadow-primary/20'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── محتوى تبويب النظرة العامة (Overview) ───────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* بطاقات المؤشرات الأساسية 4 KPI Cards (تطابق الهاتف) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* مبيعات اليوم */}
            <div className="bg-surface hover:bg-surface-container-lowest transition-all p-5 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shadow-inner shrink-0">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-on-surface-variant">مبيعات اليوم</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-on-surface font-cairo">
                    {totalRevenue.toFixed(2)}
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant">دج</span>
                </div>
              </div>
            </div>

            {/* أصناف مباعة */}
            <div className="bg-surface hover:bg-surface-container-lowest transition-all p-5 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shadow-inner shrink-0">
                <Package className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-on-surface-variant">أصناف مباعة اليوم</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-emerald-600 font-cairo">
                    {totalItemsSold}
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant">قطعة</span>
                </div>
              </div>
            </div>

            {/* إجمالي المنتجات في المخزون */}
            <div className="bg-surface hover:bg-surface-container-lowest transition-all p-5 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center shadow-inner shrink-0">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-on-surface-variant">إجمالي الأصناف بالمخزون</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-purple-600 font-cairo">
                    {activeProducts.length}
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant">صنف</span>
                </div>
              </div>
            </div>

            {/* تنبيهات المخزون المنخفض */}
            <div className="bg-surface hover:bg-surface-container-lowest transition-all p-5 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-4">
              <div className="w-13 h-13 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 flex items-center justify-center shadow-inner shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-on-surface-variant">أصناف قريبة من النفاد</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-red-600 font-cairo">
                    {lowStockProducts.length}
                  </span>
                  <span className="text-xs font-bold text-on-surface-variant">منتج</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── لوحتان رئيسيتان: آخر العمليات + تنبيهات النواقص ───────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* اللوحة 1: آخر عمليات البيع اليومية (عمودين على الشاشات الكبيرة) */}
            <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-outline-variant/20 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface font-cairo">
                      آخر العمليات اليوم
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      {todaySales.length} فاتورة مسجلة اليوم
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/sales')}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>عرض الكل</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              {todaySales.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant border border-dashed border-outline-variant/30 rounded-2xl">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">لا توجد عمليات بيع مسجلة لليوم حتى الآن</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {todaySales.slice(0, 6).map((sale) => {
                    const items = (sale.items as Array<{ name?: string }>) || [];
                    return (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3.5 bg-surface-container-low hover:bg-surface-container rounded-2xl border border-outline-variant/15 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface border border-outline-variant/20 flex items-center justify-center font-mono text-xs font-bold text-on-surface">
                            #{sale.number?.slice(-4) || '—'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface font-cairo">
                              {sale.customerName || 'زبون نقدي'}
                            </p>
                            <span className="text-xs text-on-surface-variant">
                              {items.length} صنف • {sale.paymentMethod === 'cash' ? 'نقداً' : 'آجل'}
                            </span>
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="text-base font-black text-primary font-cairo">
                            {(sale.total || 0).toFixed(2)} دج
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* اللوحة 2: النواقص وقيمة المخزون */}
            <div className="space-y-6">
              {/* بطاقة القيمة الإجمالية للمخزون */}
              <div className="bg-gradient-to-br from-primary/10 via-surface to-surface p-6 rounded-3xl border border-primary/20 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-on-surface-variant">القيمة الإجمالية للبضاعة</span>
                  <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-primary font-cairo">
                  {inventoryValue.toFixed(2)} <span className="text-xs text-on-surface-variant">دج</span>
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-2">
                  محسوبة بسعر البيع لكافة {activeProducts.length} صنف نشط
                </p>
              </div>

              {/* قائمة المنتجات المنخفضة */}
              <div className="bg-surface p-6 rounded-3xl border border-outline-variant/20 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-on-surface font-cairo flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>تنبيهات المخزون</span>
                  </h3>
                  <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                    {lowStockProducts.length} صنف
                  </span>
                </div>

                {lowStockProducts.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-bold text-center py-6">
                    جميع الأصناف متوفرة بكميات آمنة 👍
                  </p>
                ) : (
                  <div className="space-y-2">
                    {lowStockProducts.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/15 text-xs"
                      >
                        <span className="font-bold text-on-surface truncate max-w-[140px]">
                          {p.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md font-bold bg-red-500/15 text-red-600">
                          {p.quantity} {p.unit || 'قطعة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── التبويبات الأخرى ────────────────────────────────────────── */}
      {activeTab === 'expenses' && <ExpensesPage />}
      {activeTab === 'profit' && <ProfitCenterTab />}
      {activeTab === 'zakat' && <ZakatCalculatorTab />}
    </div>
  );
}
