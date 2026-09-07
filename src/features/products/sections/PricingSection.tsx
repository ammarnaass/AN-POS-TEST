// PricingSection — PRD section 2: الأسعار والربحية (UI/UX Pro Max)
import type { Product } from '@/types';
import {
  DollarSign, ArrowDownRight, ArrowUpRight, Sparkles
} from 'lucide-react';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

export default function PricingSection({ form, setForm }: Props) {
  const cost = form.costPrice ?? 0;
  const avgCost = form.averagePrice ?? cost;
  const sale1 = form.salePrice1 ?? form.retailPrice ?? 0;
  const profitPerUnit = sale1 - cost;
  const marginPercent = cost > 0 ? ((sale1 - cost) / cost) * 100 : 0;

  // تحديد الحالة اللبصرية لهامش الربح
  const getMarginTone = (margin: number) => {
    if (cost <= 0 || sale1 <= 0) return { bg: 'bg-surface-container', text: 'text-on-surface-variant', label: 'غير محدد' };
    if (margin < 0) return { bg: 'bg-error/10 text-error border-error/30', text: 'text-error', label: 'خسارة' };
    if (margin < 10) return { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', text: 'text-amber-500', label: 'هامش ضئيل' };
    if (margin < 30) return { bg: 'bg-primary/10 text-primary border-primary/30', text: 'text-primary', label: 'جيد' };
    return { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', text: 'text-emerald-500', label: 'ممتاز' };
  };

  const marginTone = getMarginTone(marginPercent);

  // أداة سريعة لحساب سعر البيع من هامش مستهدف
  const applyTargetMargin = (percent: number) => {
    if (cost <= 0) return;
    const targetPrice = Math.round(cost * (1 + percent / 100));
    setForm((p) => ({
      ...p,
      salePrice1: targetPrice,
      retailPrice: targetPrice,
      profitMargin: percent,
    }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-cairo text-title-md font-bold text-on-surface">
              الأسعار والربحية
            </h3>
            <p className="text-body-xs text-on-surface-variant">
              تسعير الشراء ومستويات البيع المتعددة ومعدل الربح
            </p>
          </div>
        </div>

        {/* أزرار الهوامش السريعة */}
        <div className="hidden sm:flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-xl border border-outline-variant/20">
          <span className="text-[11px] text-on-surface-variant font-medium ml-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            تطبيق هامش:
          </span>
          {[15, 25, 35, 50].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyTargetMargin(pct)}
              className="px-2 py-0.5 text-xs font-semibold rounded-lg bg-surface-container hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
            >
              +{pct}%
            </button>
          ))}
        </div>
      </div>

      {/* لوحة KPI الربحية السريعة */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20">
          <span className="text-[11px] font-medium text-on-surface-variant">سعر الشراء الأساسي</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-title-md font-bold text-on-surface">
              {cost.toLocaleString()}
            </span>
            <span className="text-xs text-on-surface-variant">دج</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20">
          <span className="text-[11px] font-medium text-primary">سعر البيع 1 (التجزئة)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-title-md font-bold text-primary">
              {sale1.toLocaleString()}
            </span>
            <span className="text-xs text-primary/70">دج</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-on-surface-variant">صافي ربح القطعة</span>
            {profitPerUnit >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-error" />
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`font-mono text-title-md font-bold ${profitPerUnit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-error'}`}>
              {profitPerUnit > 0 ? `+${profitPerUnit.toLocaleString()}` : profitPerUnit.toLocaleString()}
            </span>
            <span className="text-xs text-on-surface-variant">دج</span>
          </div>
        </div>

        <div className={`p-3.5 rounded-2xl border ${marginTone.bg}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium opacity-80">نسبة هامش الربح</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/40 dark:bg-black/20">
              {marginTone.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono text-title-md font-extrabold">
              {Number.isFinite(marginPercent) ? Math.round(marginPercent * 10) / 10 : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* حقول الأسعار التفصيلية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PriceInputField
          label="آخر سعر شراء"
          value={cost}
          onChange={(v) => setForm((p) => ({ ...p, costPrice: v }))}
          required
        />
        <PriceInputField
          label="متوسط سعر الشراء"
          value={avgCost}
          onChange={(v) => setForm((p) => ({ ...p, averagePrice: v }))}
          hint="يُحسب تلقائيًا من فواتير المشتريات"
          readOnly
        />
        <PriceInputField
          label="سعر البيع 1 (التجزئة) *"
          value={sale1}
          onChange={(v) => setForm((p) => ({ ...p, salePrice1: v, retailPrice: v }))}
          highlight
          required
        />
        <PriceInputField
          label="سعر البيع 2 (نصف جملة)"
          value={form.salePrice2 ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, salePrice2: v }))}
        />
        <PriceInputField
          label="سعر البيع 3 (جملة)"
          value={form.salePrice3 ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, salePrice3: v }))}
        />
        <PriceInputField
          label="سعر البيع بالفاتورة"
          value={form.invoicePrice ?? form.wholesalePrice ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, invoicePrice: v, wholesalePrice: v }))}
        />
        <PriceInputField
          label="نسبة الضريبة %"
          value={form.tax ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, tax: v }))}
          isPercent
        />
        <PriceInputField
          label="خصم خاص %"
          value={form.discount ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, discount: v }))}
          isPercent
        />
      </div>
    </div>
  );
}

function PriceInputField({
  label,
  value,
  onChange,
  hint,
  readOnly,
  highlight,
  required,
  isPercent,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  readOnly?: boolean;
  highlight?: boolean;
  required?: boolean;
  isPercent?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-label-sm font-semibold text-on-surface">
          {label}
        </label>
        {hint && <span className="text-[10px] text-on-surface-variant">{hint}</span>}
      </div>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          min="0"
          value={value === 0 && !readOnly ? '' : value}
          placeholder="0.00"
          readOnly={readOnly}
          required={required}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className={`w-full h-11 pr-3 pl-11 rounded-xl text-body-md text-right font-mono transition-all border ${
            highlight
              ? 'bg-primary/5 border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 font-bold text-primary'
              : readOnly
              ? 'bg-surface-container-lowest/80 border-outline-variant/15 text-on-surface-variant cursor-not-allowed'
              : 'bg-surface-container-low border-outline-variant/20 focus:border-primary focus:ring-2 focus:ring-primary/20'
          }`}
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body-xs font-semibold text-on-surface-variant">
          {isPercent ? '%' : 'دج'}
        </span>
      </div>
    </div>
  );
}
