import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

function getPeriodLabel(p: Period): string {
  switch (p) {
    case 'today': return 'اليوم';
    case 'week': return 'هذا الأسبوع';
    case 'month': return 'هذا الشهر';
    case 'year': return 'هذا العام';
    case 'custom': return 'فترة مخصصة';
  }
}

function getDateRange(period: Period, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let from: string;
  let to = today;

  switch (period) {
    case 'today':
      from = today;
      break;
    case 'week': {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      from = monday.toISOString().split('T')[0];
      break;
    }
    case 'month':
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    case 'year':
      from = `${now.getFullYear()}-01-01`;
      break;
    case 'custom':
      from = customFrom || today;
      to = customTo || today;
      break;
  }
  return { from, to };
}

export default function ProfitCenterTab() {
  const [period, setPeriod] = useState<Period>('today');
  const [customFrom, setCustomFrom] = useState(new Date().toISOString().split('T')[0]);
  const [customTo, setCustomTo] = useState(new Date().toISOString().split('T')[0]);

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => db.sales.toArray(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => db.expenses.toArray(),
  });

  const range = getDateRange(period, customFrom, customTo);

  const productCostMap = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => { map[p.id] = p.costPrice; });
    return map;
  }, [products]);

  const stats = useMemo(() => {
    const filtered = sales.filter(s => {
      const d = s.date.split('T')[0];
      return d >= range.from && d <= range.to;
    });

    const saleRecords = filtered.filter(s => s.type === 'sale');
    const returnRecords = filtered.filter(s => s.type === 'return');

    const revenue = saleRecords.reduce((sum, s) => sum + s.total, 0);
    const returns = returnRecords.reduce((sum, s) => sum + s.total, 0);
    const netRevenue = revenue - returns;

    let cogs = 0;
    saleRecords.forEach(s => {
      s.items.forEach(item => {
        const cost = productCostMap[item.productId] || 0;
        cogs += cost * item.qty;
      });
    });

    let returnCogs = 0;
    returnRecords.forEach(s => {
      s.items.forEach(item => {
        const cost = productCostMap[item.productId] || 0;
        returnCogs += cost * item.qty;
      });
    });

    const netCogs = cogs - returnCogs;
    const grossProfit = netRevenue - netCogs;
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

    const periodExpenses = expenses.filter(e => {
      const d = e.date.split('T')[0];
      return d >= range.from && d <= range.to;
    });
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    const netProfit = grossProfit - totalExpenses;
    const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    const avgOrderValue = saleRecords.length > 0 ? revenue / saleRecords.length : 0;

    return {
      revenue, returns, netRevenue,
      cogs: netCogs, grossProfit, grossMargin,
      totalExpenses, netProfit, netMargin,
      salesCount: saleRecords.length, returnsCount: returnRecords.length,
      avgOrderValue,
    };
  }, [sales, expenses, productCostMap, range]);

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'اليوم' },
    { key: 'week', label: 'الأسبوع' },
    { key: 'month', label: 'الشهر' },
    { key: 'year', label: 'العام' },
    { key: 'custom', label: 'مخصص' },
  ];

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p.key
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2 mr-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm" />
            <span className="text-on-surface-variant text-sm">إلى</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-sm" />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Revenue */}
        <div className="glass-card rounded-xl p-5 border border-outline-variant/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center border border-primary-container/30">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-on-surface-variant">{getPeriodLabel(period)}</span>
          </div>
          <p className="text-label-md text-on-surface-variant mb-1">صافي الإيرادات</p>
          <h3 className="font-cairo text-headline-lg font-bold text-on-surface">{stats.netRevenue.toFixed(2)} دج</h3>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="text-success">مبيعات {stats.revenue.toFixed(0)}</span>
            <span className="text-error">مرتجعات {stats.returns.toFixed(0)}</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="glass-card rounded-xl p-5 border border-outline-variant/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center border border-success/30">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <span className={`flex items-center gap-1 text-xs ${stats.grossMargin >= 0 ? 'text-success' : 'text-error'}`}>
              {stats.grossMargin >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {stats.grossMargin.toFixed(1)}%
            </span>
          </div>
          <p className="text-label-md text-on-surface-variant mb-1">الربح الإجمالي</p>
          <h3 className="font-cairo text-headline-lg font-bold text-on-surface">{stats.grossProfit.toFixed(2)} دج</h3>
          <p className="text-xs text-on-surface-variant mt-2">هامش الربح الإجمالي</p>
        </div>

        {/* Expenses */}
        <div className="glass-card rounded-xl p-5 border border-outline-variant/20">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-xl bg-error/20 flex items-center justify-center border border-error/30">
              <TrendingDown className="w-6 h-6 text-error" />
            </div>
          </div>
          <p className="text-label-md text-on-surface-variant mb-1">المصروفات</p>
          <h3 className="font-cairo text-headline-lg font-bold text-error">{stats.totalExpenses.toFixed(2)} دج</h3>
          <p className="text-xs text-on-surface-variant mt-2">{stats.totalExpenses > 0 ? 'تم تسجيلها في الفترة' : 'لا توجد مصروفات'}</p>
        </div>

        {/* Net Profit */}
        <div className="glass-card rounded-xl p-5 border border-outline-variant/20">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              stats.netProfit >= 0
                ? 'bg-success/20 border-success/30'
                : 'bg-error/20 border-error/30'
            }`}>
              {stats.netProfit >= 0
                ? <TrendingUp className="w-6 h-6 text-success" />
                : <TrendingDown className="w-6 h-6 text-error" />
              }
            </div>
            <span className={`flex items-center gap-1 text-xs ${stats.netMargin >= 0 ? 'text-success' : 'text-error'}`}>
              {stats.netMargin >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {stats.netMargin.toFixed(1)}%
            </span>
          </div>
          <p className="text-label-md text-on-surface-variant mb-1">صافي الربح</p>
          <h3 className={`font-cairo text-headline-lg font-bold ${stats.netProfit >= 0 ? 'text-success' : 'text-error'}`}>
            {stats.netProfit.toFixed(2)} دج
          </h3>
          <p className="text-xs text-on-surface-variant mt-2">بعد خصم المصروفات</p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Breakdown */}
        <div className="glass-card rounded-xl p-6 border border-outline-variant/20">
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            تفصيل الإيرادات
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">إجمالي المبيعات</span>
              <span className="text-sm font-bold text-on-surface">{stats.revenue.toFixed(2)} دج</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">قيمة المرتجعات</span>
              <span className="text-sm font-bold text-error">-{stats.returns.toFixed(2)} دج</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium text-on-surface">صافي الإيرادات</span>
              <span className="text-sm font-bold text-primary">{stats.netRevenue.toFixed(2)} دج</span>
            </div>
            <div className="h-px bg-outline-variant/20" />
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">عدد المبيعات</span>
              <span className="text-sm font-bold text-on-surface">{stats.salesCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">عدد المرتجعات</span>
              <span className="text-sm font-bold text-error">{stats.returnsCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">متوسط قيمة الطلب</span>
              <span className="text-sm font-bold text-on-surface">{stats.avgOrderValue.toFixed(2)} دج</span>
            </div>
          </div>
        </div>

        {/* Profit Breakdown */}
        <div className="glass-card rounded-xl p-6 border border-outline-variant/20">
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-success" />
            تفصيل الأرباح
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">صافي الإيرادات</span>
              <span className="text-sm font-bold text-on-surface">{stats.netRevenue.toFixed(2)} دج</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">تكلفة البضاعة المباعة (COGS)</span>
              <span className="text-sm font-bold text-error">-{stats.cogs.toFixed(2)} دج</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
              <span className="text-sm font-medium text-on-surface">الربح الإجمالي</span>
              <span className="text-sm font-bold text-success">{stats.grossProfit.toFixed(2)} دج</span>
            </div>
            <div className="h-px bg-outline-variant/20" />
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">المصروفات</span>
              <span className="text-sm font-bold text-error">-{stats.totalExpenses.toFixed(2)} دج</span>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg border ${
              stats.netProfit >= 0
                ? 'bg-success/10 border-success/20'
                : 'bg-error/10 border-error/20'
            }`}>
              <span className="text-sm font-medium text-on-surface">صافي الربح</span>
              <span className={`text-sm font-bold ${stats.netProfit >= 0 ? 'text-success' : 'text-error'}`}>
                {stats.netProfit.toFixed(2)} دج
              </span>
            </div>
            {/* Margin Bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
                <span>هامش الربح الصافي</span>
                <span>{stats.netMargin.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stats.netMargin >= 0 ? 'bg-success' : 'bg-error'}`}
                  style={{ width: `${Math.min(Math.abs(stats.netMargin), 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
