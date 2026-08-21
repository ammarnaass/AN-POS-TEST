// StockSection — PRD section 3: المخزون
import type { Product } from '@/types';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

export default function StockSection({ form, setForm }: Props) {
  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="font-cairo text-headline-sm font-bold text-on-surface border-r-4 border-primary pr-3">
        المخزون
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">الكمية بالمخزن</label>
          <input
            type="number"
            step="0.01"
            value={form.quantity ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">الوحدة</label>
          <input
            type="text"
            value={form.unit ?? 'قطعة'}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">الوزن (كغ)</label>
          <input
            type="number"
            step="0.001"
            value={form.weight ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, weight: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">حجم التعبئة</label>
          <input
            type="text"
            value={form.packageSize ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, packageSize: e.target.value }))}
            placeholder="مثال: 12×500مل"
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">مكان المنتج</label>
          <input
            type="text"
            value={form.location ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            placeholder="مثال: رف A3"
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">حد التنبيه</label>
          <input
            type="number"
            value={form.lowStockThreshold ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">نقطة إعادة الطلب</label>
          <input
            type="number"
            value={form.reorderPoint ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, reorderPoint: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">الحد الأقصى للمخزون</label>
          <input
            type="number"
            value={form.maxStock ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, maxStock: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">المقاس / الصنف</label>
          <input
            type="text"
            value={form.variant ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, variant: e.target.value }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">تاريخ الصلاحية</label>
          <input
            type="date"
            value={form.expiryDate ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div>
          <label className="block text-label-sm text-on-surface mb-1.5">رقم الدفعة</label>
          <input
            type="text"
            value={form.batchNumber ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-3 text-body-md text-on-surface">
            <input
              type="checkbox"
              checked={form.stockable ?? true}
              onChange={(e) => setForm((p) => ({ ...p, stockable: e.target.checked }))}
              className="w-4 h-4"
            />
            قابل للتخزين (Stockable)
          </label>
        </div>
      </div>
    </div>
  );
}
