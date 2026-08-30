// ProductInfoSection — PRD section 1: معلومات المنتج
import CategorySelect from '@/components/products/CategorySelect';
import ImageUpload from '@/components/products/ImageUpload';
import type { Product } from '@/types';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

export default function ProductInfoSection({ form, setForm }: Props) {
  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="font-cairo text-headline-sm font-bold text-on-surface border-r-4 border-primary pr-3">
        معلومات المنتج
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">
            رمز المنتج (SKU) *
          </label>
          <input
            type="text"
            value={form.sku ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
            placeholder="ART00025"
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">
            اسم المنتج *
          </label>
          <input
            type="text"
            value={form.name ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="شاحن سامسونج أصلي 25W"
            required
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">العائلة / الفئة</label>
          <CategorySelect
            value={form.categoryId ?? null}
            onChange={(categoryId, categoryName) =>
              setForm((p) => ({ ...p, categoryId, category: categoryName ?? (categoryId ? p.category : '') }))
            }
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">النوع</label>
          <select
            value={form.type ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          >
            <option value="">— عام —</option>
            <option value="physical">منتج مادي</option>
            <option value="digital">منتج رقمي</option>
            <option value="service">خدمة</option>
            <option value="bundle">حزمة</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-label-sm text-on-surface mb-1.5">صورة المنتج</label>
          <ImageUpload
            value={form.image}
            onChange={(image) => setForm((p) => ({ ...p, image }))}
          />
        </div>
      </div>
    </div>
  );
}
