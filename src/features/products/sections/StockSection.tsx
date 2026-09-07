// StockSection — PRD section 3: إدارة المخزون والتنبيهات (UI/UX Pro Max)
import { useMemo } from 'react';
import type { Product } from '@/types';
import {
  Box, MapPin, Layers, AlertCircle,
  CheckCircle2, ShieldAlert
} from 'lucide-react';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

const COMMON_UNITS = ['قطعة', 'علبة', 'كرتونة', 'كيلو', 'لتر', 'متر', 'حزمة', 'دزينة'];

export default function StockSection({ form, setForm }: Props) {
  const qty = form.quantity ?? 0;
  const minThreshold = form.lowStockThreshold ?? 5;
  const maxStock = form.maxStock && form.maxStock > 0 ? form.maxStock : Math.max(qty * 1.5, 50);

  // حساب النسبة المئوية للمخزون
  const stockPercentage = Math.min(100, Math.round((qty / maxStock) * 100));

  // حساب الأيام المتبقية حتى انتهاء الصلاحية
  const expiryInfo = useMemo(() => {
    if (!form.expiryDate) return null;
    const now = new Date();
    const expiry = new Date(form.expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `منتهي منذ ${Math.abs(diffDays)} يوم`, isExpired: true, isNear: false };
    if (diffDays <= 30) return { text: `متبقي ${diffDays} يوم فقط`, isExpired: false, isNear: true };
    return { text: `متبقي ${diffDays} يوم`, isExpired: false, isNear: false };
  }, [form.expiryDate]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-cairo text-title-md font-bold text-on-surface">
              إدارة المخزون والتنبيهات
            </h3>
            <p className="text-body-xs text-on-surface-variant">
              الكميات، أماكن الحفظ، التنبيهات، وتواريخ الصلاحية
            </p>
          </div>
        </div>

        {/* مؤشر نوع التخزين */}
        <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/20 cursor-pointer hover:bg-surface-container transition-all">
          <input
            type="checkbox"
            checked={form.stockable ?? true}
            onChange={(e) => setForm((p) => ({ ...p, stockable: e.target.checked }))}
            className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
          />
          <span className="text-body-xs font-semibold text-on-surface">قابل للتخزين (Stockable)</span>
        </label>
      </div>

      {/* شريط حالة المخزون الحي */}
      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-bold text-on-surface">مستوى المخزون الحالي</span>
            {qty <= 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-error/10 text-error flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> نفد المخزون
              </span>
            ) : qty <= minThreshold ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> مخزون منخفض
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> مخزون متوفر
              </span>
            )}
          </div>
          <span className="font-mono text-body-sm font-bold text-on-surface">
            {qty} / {maxStock} {form.unit || 'قطعة'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              qty <= 0 ? 'bg-error' : qty <= minThreshold ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(5, stockPercentage)}%` }}
          />
        </div>
      </div>

      {/* الحقول الأساسية: الكمية، الوحدة، الوزن */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            الكمية الحالية بالمخزن <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              value={form.quantity ?? 0}
              onChange={(e) => setForm((p) => ({ ...p, quantity: Number(e.target.value) || 0 }))}
              className="w-full h-11 pr-3 pl-12 bg-surface-container-low rounded-xl text-body-md text-right font-mono focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 focus:border-primary font-bold text-on-surface"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body-xs text-on-surface-variant font-medium">
              {form.unit || 'قطعة'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            الوحدة
          </label>
          <input
            type="text"
            value={form.unit ?? 'قطعة'}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            placeholder="مثال: قطعة، كرتونة"
            className="w-full h-11 px-3 bg-surface-container-low rounded-xl text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
          />
          {/* شرائح الوحدات السريعة */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {COMMON_UNITS.slice(0, 5).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setForm((p) => ({ ...p, unit: u }))}
                className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                  form.unit === u
                    ? 'bg-primary text-on-primary border-primary font-bold'
                    : 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            الوزن (كغ)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.001"
              value={form.weight ?? 0}
              onChange={(e) => setForm((p) => ({ ...p, weight: Number(e.target.value) || 0 }))}
              className="w-full h-11 pr-3 pl-12 bg-surface-container-low rounded-xl text-body-md text-right font-mono focus:ring-2 focus:ring-primary/20 border border-outline-variant/20"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body-xs text-on-surface-variant font-medium">
              كغ
            </span>
          </div>
        </div>
      </div>

      {/* حدود التنبيه وإعادة الطلب */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-surface-container-low/40 border border-outline-variant/15">
        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            حد التنبيه (Low Stock)
          </label>
          <input
            type="number"
            min="0"
            value={form.lowStockThreshold ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-body-md text-right font-mono border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[10px] text-on-surface-variant mt-1">تنبيه الكاشير عند النزول عنه</p>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            نقطة إعادة الطلب (Reorder Point)
          </label>
          <input
            type="number"
            min="0"
            value={form.reorderPoint ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, reorderPoint: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-body-md text-right font-mono border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[10px] text-on-surface-variant mt-1">الكمية المقترحة لطلب شراء جديد</p>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            الحد الأقصى للمخزون
          </label>
          <input
            type="number"
            min="0"
            value={form.maxStock ?? 0}
            onChange={(e) => setForm((p) => ({ ...p, maxStock: Number(e.target.value) || 0 }))}
            className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-body-md text-right font-mono border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-[10px] text-on-surface-variant mt-1">السعة القصوى للتخزين</p>
        </div>
      </div>

      {/* الموقع، حجم التعبئة، الصلاحية والدفعة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            مكان التخزين
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.location ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              placeholder="مثال: رف A3 - درج 2"
              className="w-full h-10 pr-9 pl-3 bg-surface-container-low rounded-xl text-body-md text-right border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
            />
            <MapPin className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            حجم التعبئة
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.packageSize ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, packageSize: e.target.value }))}
              placeholder="مثال: 12×500مل"
              className="w-full h-10 pr-9 pl-3 bg-surface-container-low rounded-xl text-body-md text-right border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
            />
            <Layers className="w-4 h-4 text-on-surface-variant absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface mb-1.5">
            رقم الدفعة (Batch)
          </label>
          <input
            type="text"
            value={form.batchNumber ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, batchNumber: e.target.value }))}
            placeholder="مثال: BATCH-2026-09"
            className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-body-md text-right font-mono border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-label-sm font-semibold text-on-surface">
              تاريخ الصلاحية
            </label>
            {expiryInfo && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                expiryInfo.isExpired ? 'bg-error/10 text-error' : expiryInfo.isNear ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-600'
              }`}>
                {expiryInfo.text}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="date"
              value={form.expiryDate ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
              className="w-full h-10 px-3 bg-surface-container-low rounded-xl text-body-md text-right font-mono border border-outline-variant/20 focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
