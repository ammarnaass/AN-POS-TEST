import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator, Package, Wallet, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';

const ZAKAT_RATE = 0.025; // 2.5%

export default function ZakatCalculatorTab() {
  const [includeCash, setIncludeCash] = useState(false);
  const [includeReceivables, setIncludeReceivables] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });

  const { data: cashSessions = [] } = useQuery({
    queryKey: ['cashSessions'],
    queryFn: () => db.cash_sessions.toArray(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.customers.toArray(),
  });

  const activeProducts = useMemo(() => products.filter(p => p.status === 'active'), [products]);

  // Inventory value (retail price * quantity)
  const inventoryStats = useMemo(() => {
    let totalRetailValue = 0;
    let totalCostValue = 0;
    let totalQuantity = 0;

    activeProducts.forEach(p => {
      totalRetailValue += p.retailPrice * p.quantity;
      totalCostValue += p.costPrice * p.quantity;
      totalQuantity += p.quantity;
    });

    return { totalRetailValue, totalCostValue, totalQuantity };
  }, [activeProducts]);

  // Cash on hand (from open sessions)
  const cashOnHand = useMemo(() => {
    if (!includeCash) return 0;
    return cashSessions
      .filter(s => s.status === 'open')
      .reduce((sum, s) => sum + (s.openingAmount || 0), 0);
  }, [cashSessions, includeCash]);

  // Receivables (customers with credit)
  const receivables = useMemo(() => {
    if (!includeReceivables) return 0;
    return customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [customers, includeReceivables]);

  // Zakat calculation
  const zakatCalc = useMemo(() => {
    const nisab = 85.0 * 1000; // ~85g gold ≈ 85,000 DZD (approximate)
    const totalWealth = inventoryStats.totalCostValue + cashOnHand + receivables;
    const isNisabMet = totalWealth >= nisab;
    const zakatAmount = isNisabMet ? totalWealth * ZAKAT_RATE : 0;

    return { nisab, totalWealth, isNisabMet, zakatAmount };
  }, [inventoryStats, cashOnHand, receivables]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-xl p-6 border border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center border border-success/30">
            <Calculator className="w-6 h-6 text-success" />
          </div>
          <div>
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface">حاسبة الزكاة الشرعية</h3>
            <p className="text-sm text-on-surface-variant">حساب زكاة المال (2.5% من إجمالي المال النصاب)</p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="glass-card rounded-xl p-5 border border-outline-variant/20">
        <h4 className="font-cairo text-title-md font-bold text-on-surface mb-3">عناصر المال</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-container/50 cursor-pointer hover:bg-surface-container-high transition-colors">
            <input type="checkbox" checked={true} disabled
              className="w-5 h-5 rounded accent-success" />
            <Package className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <span className="text-sm font-medium text-on-surface">المخزون</span>
              <span className="text-xs text-on-surface-variant block">(القيمة التكلفة × الكمية)</span>
            </div>
            <span className="text-sm font-bold text-on-surface">{inventoryStats.totalCostValue.toLocaleString('ar-DZ')} دج</span>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            includeCash ? 'bg-primary/10 border border-primary/20' : 'bg-surface-container/50 hover:bg-surface-container-high'
          }`}>
            <input type="checkbox" checked={includeCash} onChange={e => setIncludeCash(e.target.checked)}
              className="w-5 h-5 rounded accent-success" />
            <Wallet className="w-5 h-5 text-success" />
            <div className="flex-1">
              <span className="text-sm font-medium text-on-surface">النقدي في الصندوق</span>
              <span className="text-xs text-on-surface-variant block">(المبالغ المفتوحة فقط)</span>
            </div>
            <span className="text-sm font-bold text-on-surface">{cashOnHand.toLocaleString('ar-DZ')} دج</span>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            includeReceivables ? 'bg-primary/10 border border-primary/20' : 'bg-surface-container/50 hover:bg-surface-container-high'
          }`}>
            <input type="checkbox" checked={includeReceivables} onChange={e => setIncludeReceivables(e.target.checked)}
              className="w-5 h-5 rounded accent-success" />
            <span className="w-5 h-5 text-amber-400 flex items-center justify-center text-lg">💰</span>
            <div className="flex-1">
              <span className="text-sm font-medium text-on-surface">المدينون (الزبائن)</span>
              <span className="text-xs text-on-surface-variant block">(أرصدة الزبائن المستحقة)</span>
            </div>
            <span className="text-sm font-bold text-on-surface">{receivables.toLocaleString('ar-DZ')} دج</span>
          </label>
        </div>
      </div>

      {/* Nisab Status */}
      <div className={`glass-card rounded-xl p-5 border ${
        zakatCalc.isNisabMet ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'
      }`}>
        <div className="flex items-center gap-3">
          {zakatCalc.isNisabMet ? (
            <CheckCircle className="w-6 h-6 text-success" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-warning" />
          )}
          <div>
            <p className="text-sm font-medium text-on-surface">
              {zakatCalc.isNisabMet ? 'بلغ المال النصاب — تجب الزكاة' : 'لم يبلغ المال النصاب — لا تجب الزكاة'}
            </p>
            <p className="text-xs text-on-surface-variant">
              النصاب ≈ {zakatCalc.nisab.toLocaleString('ar-DZ')} دج (يعادل 85g ذهب)
            </p>
          </div>
        </div>
      </div>

      {/* Zakat Result */}
      <div className="glass-card rounded-xl p-6 border border-outline-variant/20">
        <h4 className="font-cairo text-headline-sm font-bold text-on-surface mb-4">الحساب التفصيلي</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
            <span className="text-sm text-on-surface-variant">قيمة المخزون (تكلفة)</span>
            <span className="text-sm font-bold text-on-surface">{inventoryStats.totalCostValue.toLocaleString('ar-DZ')} دج</span>
          </div>
          {includeCash && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">النقدي في الصندوق</span>
              <span className="text-sm font-bold text-on-surface">{cashOnHand.toLocaleString('ar-DZ')} دج</span>
            </div>
          )}
          {includeReceivables && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
              <span className="text-sm text-on-surface-variant">المدينون (الزبائن)</span>
              <span className="text-sm font-bold text-on-surface">{receivables.toLocaleString('ar-DZ')} دج</span>
            </div>
          )}
          <div className="h-px bg-outline-variant/20" />
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-sm font-medium text-on-surface">إجمالي المال</span>
            <span className="text-sm font-bold text-primary">{zakatCalc.totalWealth.toLocaleString('ar-DZ')} دج</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/50">
            <span className="text-sm text-on-surface-variant">نسبة الزكاة</span>
            <span className="text-sm font-bold text-on-surface">2.5%</span>
          </div>
          <div className={`flex items-center justify-between p-4 rounded-xl border ${
            zakatCalc.isNisabMet ? 'bg-success/10 border-success/30' : 'bg-surface-container/50 border-outline-variant/20'
          }`}>
            <span className="text-base font-medium text-on-surface">زكاة مستحقة</span>
            <span className={`font-cairo text-headline-md font-bold ${zakatCalc.isNisabMet ? 'text-success' : 'text-on-surface-variant'}`}>
              {zakatCalc.zakatAmount.toLocaleString('ar-DZ')} دج
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="glass-card rounded-xl p-4 border border-outline-variant/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-on-surface-variant space-y-1">
            <p><strong>ملاحظة:</strong> هذا الحساب تقريبي ويستند إلى قاعدة "85g ذهب" كنِصاب. يُنصح بالرجوع لعالم شرعي للتأكد.</p>
            <p>• الزكاة تُحسب على <strong>قيمة التكلفة</strong> للمخزون (وليس سعر البيع)</p>
            <p>• لا تُحتسب الديون على الآخرين (المدينون) في هذا الحساب</p>
            <p>• نِصاب الذهب المقدر: ≈ {zakatCalc.nisab.toLocaleString('ar-DZ')} دج</p>
          </div>
        </div>
      </div>
    </div>
  );
}
