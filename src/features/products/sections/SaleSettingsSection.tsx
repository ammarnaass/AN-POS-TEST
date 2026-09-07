// SaleSettingsSection — PRD section 4: إعدادات وطرق البيع (UI/UX Pro Max)
import type { Product } from '@/types';
import {
  SlidersHorizontal, MapPin, Award, Tag,
  Layers, Coins
} from 'lucide-react';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

const SALE_SETTINGS: {
  key: keyof Product;
  label: string;
  hint: string;
  icon: any;
  color: string;
  badge: string;
}[] = [
  {
    key: 'pricingByZone',
    label: 'التسعير حسب المجال / المنطقة',
    hint: 'تطبيق أسعار بيع مختلفة بحسب فرع أو منطقة البيع المحددة.',
    icon: MapPin,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    badge: 'فروع متعددة',
  },
  {
    key: 'loyaltyCard',
    label: 'حساب نقاط بطاقة الوفاء',
    hint: 'منح الزبون نقاط ولاء إضافية عند شراء هذا المنتج من نقطة البيع.',
    icon: Award,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    badge: 'ولاء الزبائن',
  },
  {
    key: 'askPrice',
    label: 'سؤال الكاشير عن السعر يدويًا',
    hint: 'مطالبة الكاشير بإدخال السعر يدويًا عند كل عملية بيع (للمنتجات متغيرة السعر).',
    icon: Tag,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    badge: 'سعر مخصص',
  },
  {
    key: 'askQuantity',
    label: 'سؤال الكاشير عن الكمية يدويًا',
    hint: 'إظهار نافذة إدخال الكمية فور مسح باركود المنتج بدل افتراض 1.',
    icon: Layers,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    badge: 'كمية متغيرة',
  },
  {
    key: 'pointPrice',
    label: 'البيع بنقاط الوفاء بدل العملة',
    hint: 'السماح للزبون باستبدال هذا المنتج بنقاط المكافآت مباشرة.',
    icon: Coins,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30',
    badge: 'مكافآت',
  },
];

export default function SaleSettingsSection({ form, setForm }: Props) {
  const toggleSetting = (key: keyof Product) => {
    setForm((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-cairo text-title-md font-bold text-on-surface">
              إعدادات وقواعد البيع
            </h3>
            <p className="text-body-xs text-on-surface-variant">
              سلوك الصنف في شاشة الكاشير (POS) ونقاط الولاء والتسعير المخصص
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {SALE_SETTINGS.map((item) => {
          const Icon = item.icon;
          const isChecked = Boolean(form[item.key]);
          return (
            <div
              key={item.key}
              onClick={() => toggleSetting(item.key)}
              className={`flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                isChecked
                  ? 'bg-primary/5 border-primary/40 shadow-sm shadow-primary/5'
                  : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container hover:border-outline-variant/35'
              }`}
            >
              <div className="flex items-start gap-3 flex-1 ml-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isChecked ? item.color : 'bg-surface-container text-on-surface-variant'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`text-body-md font-bold ${isChecked ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                      {item.label}
                    </p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-body-xs text-on-surface-variant/80 mt-1 leading-relaxed">
                    {item.hint}
                  </p>
                </div>
              </div>

              {/* Modern Switch UI */}
              <div
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
                  isChecked ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out shadow-sm ${
                    isChecked ? '-translate-x-6' : '-translate-x-1'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
