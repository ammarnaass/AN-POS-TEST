// PricingSection — PRD section 2: الأسعار
import type { Product } from '@/types';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

export default function PricingSection({ form, setForm }: Props) {
  // حساب هامش الربح تلقائيًا: (salePrice1 - averagePrice) / averagePrice * 100
  const avgPrice = form.averagePrice ?? 0;
  const sale1 = form.salePrice1 ?? form.retailPrice ?? 0;
  const computedMargin = avgPrice > 0
    ? ((sale1 - avgPrice) / avgPrice) * 100
    : 0;

  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="font-cairo text-headline-sm font-bold text-on-surface border-r-4 border-primary pr-3">
        الأسعار
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberField
          label="آخر سعر شراء"
          value={form.costPrice ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, costPrice: v }))}
        />
        <NumberField
          label="متوسط سعر الشراء"
          value={form.averagePrice ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, averagePrice: v }))}
          hint="يُحسب تلقائيًا من حركات الشراء"
          readOnly
        />
        <NumberField
          label="سعر البيع 1"
          value={form.salePrice1 ?? form.retailPrice ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, salePrice1: v, retailPrice: v }))}
        />
        <NumberField
          label="سعر البيع 2"
          value={form.salePrice2 ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, salePrice2: v }))}
        />
        <NumberField
          label="سعر البيع 3"
          value={form.salePrice3 ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, salePrice3: v }))}
        />
        <NumberField
          label="سعر البيع بالفاتورة"
          value={form.invoicePrice ?? form.wholesalePrice ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, invoicePrice: v, wholesalePrice: v }))}
        />
        <NumberField
          label="هامش الربح %"
          value={Number.isFinite(computedMargin) ? Math.round(computedMargin * 100) / 100 : 0}
          onChange={(v) => setForm((p) => ({ ...p, profitMargin: v }))}
          hint="يُحسب تلقائيًا"
          readOnly
        />
        <NumberField
          label="نسبة الضريبة %"
          value={form.tax ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, tax: v }))}
        />
        <NumberField
          label="خصم خاص %"
          value={form.discount ?? 0}
          onChange={(v) => setForm((p) => ({ ...p, discount: v }))}
        />
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  readOnly,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-label-sm text-on-surface mb-1.5">{label}</label>
      <input
        type="number"
        step="0.01"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={`w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 ${
          readOnly ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      />
      {hint && <p className="text-body-xs text-on-surface-variant mt-1">{hint}</p>}
    </div>
  );
}
