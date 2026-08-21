// SaleSettingsSection — PRD section 4: إعدادات البيع
import type { Product } from '@/types';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

const SWITCHES: { key: keyof Product; label: string; hint?: string }[] = [
  { key: 'pricingByZone', label: 'التسعير حسب المجال', hint: 'سعر مختلف حسب منطقة البيع' },
  { key: 'loyaltyCard', label: 'حساب مع بطاقة الوفاء', hint: 'يحتسب نقاط الوفاء عند بيع هذا المنتج' },
  { key: 'askPrice', label: 'سؤال عن السعر', hint: 'إدخال السعر يدويًا عند البيع' },
  { key: 'askQuantity', label: 'سؤال عن الكمية', hint: 'إدخال الكمية يدويًا عند البيع' },
  { key: 'pointPrice', label: 'السعر للنقطة', hint: 'يُباع بنقاط الوفاء بدل العملة' },
];

export default function SaleSettingsSection({ form, setForm }: Props) {
  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="font-cairo text-headline-sm font-bold text-on-surface border-r-4 border-primary pr-3">
        إعدادات البيع
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SWITCHES.map((sw) => (
          <label
            key={sw.key}
            className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container-high"
          >
            <div className="text-right">
              <p className="text-body-md text-on-surface">{sw.label}</p>
              {sw.hint && <p className="text-body-xs text-on-surface-variant mt-0.5">{sw.hint}</p>}
            </div>
            <input
              type="checkbox"
              checked={Boolean(form[sw.key])}
              onChange={(e) => setForm((p) => ({ ...p, [sw.key]: e.target.checked }))}
              className="w-5 h-5"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
