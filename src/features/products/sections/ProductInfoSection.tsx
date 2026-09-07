// ProductInfoSection — PRD section 1: معلومات المنتج (UI/UX Pro Max)
import { useState } from 'react';
import CategorySelect from '@/components/products/CategorySelect';
import ImageUpload from '@/components/products/ImageUpload';
import type { Product } from '@/types';
import {
  Package, Hash, Copy, Check, Sparkles,
  Boxes, Wrench, Gift, Zap
} from 'lucide-react';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

const PRODUCT_TYPES = [
  { id: '', label: 'عام', icon: Package, desc: 'منتج قياسي' },
  { id: 'physical', label: 'مادي', icon: Boxes, desc: 'سلعة بمخزن' },
  { id: 'service', label: 'خدمة', icon: Wrench, desc: 'خدمة بلا مخزون' },
  { id: 'bundle', label: 'حزمة', icon: Gift, desc: 'مجموعة منتجات' },
  { id: 'digital', label: 'رقمي', icon: Zap, desc: 'كود أو بطاقة' },
];

export default function ProductInfoSection({ form, setForm }: Props) {
  const [copied, setCopied] = useState(false);

  const handleGenerateSku = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const newSku = `ART${randomNum}`;
    setForm((p) => ({ ...p, sku: newSku }));
  };

  const handleCopySku = () => {
    if (!form.sku) return;
    navigator.clipboard.writeText(form.sku);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-cairo text-title-md font-bold text-on-surface">
              البيانات الأساسية للمنتج
            </h3>
            <p className="text-body-xs text-on-surface-variant">
              معلومات التعريف والتصنيف والنوع والصورة
            </p>
          </div>
        </div>
      </div>

      {/* نوع المنتج — بطاقات تفاعلية */}
      <div>
        <label className="block text-label-sm font-semibold text-on-surface mb-2">
          نوع الصنف
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {PRODUCT_TYPES.map((t) => {
            const Icon = t.icon;
            const isSelected = (form.type || '') === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: t.id }))}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 border-primary text-primary shadow-sm shadow-primary/10'
                    : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`} />
                <span className="text-body-sm font-bold">{t.label}</span>
                <span className="text-[10px] opacity-70 mt-0.5">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* رمز المنتج SKU */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-label-sm font-semibold text-on-surface">
              رمز الصنف (SKU) <span className="text-primary">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              {form.sku && (
                <button
                  type="button"
                  onClick={handleCopySku}
                  className="flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer px-1.5 py-0.5 rounded"
                  title="نسخ الرمز"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateSku}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors cursor-pointer font-medium px-1.5 py-0.5 rounded bg-primary/5 hover:bg-primary/10"
              >
                <Sparkles className="w-3 h-3" />
                <span>توليد تلقائي</span>
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              value={form.sku ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="مثال: ART00025"
              className="w-full h-11 pr-10 pl-3 bg-surface-container-low rounded-xl text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 focus:border-primary transition-all font-mono"
            />
            <Hash className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* اسم المنتج */}
        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            اسم المنتج <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.name ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="مثال: شاحن سامسونج أصلي 25W"
              required
              className="w-full h-11 pr-10 pl-3 bg-surface-container-low rounded-xl text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 focus:border-primary transition-all font-medium"
            />
            <Package className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* العائلة / الفئة */}
        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            العائلة والتصنيف
          </label>
          <CategorySelect
            value={form.categoryId ?? null}
            onChange={(categoryId, categoryName) =>
              setForm((p) => ({ ...p, categoryId, category: categoryName ?? (categoryId ? p.category : '') }))
            }
          />
        </div>

        {/* صورة المنتج */}
        <div className="md:col-span-2">
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            صورة المنتج
          </label>
          <div className="bg-surface-container-low/50 border border-outline-variant/20 rounded-2xl p-4">
            <ImageUpload
              value={form.image}
              onChange={(image) => setForm((p) => ({ ...p, image }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
