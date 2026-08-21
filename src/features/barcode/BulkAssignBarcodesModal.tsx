// BulkAssignBarcodesModal — BARCODE-MGMT-001
// توليد وإسناد باركودات جماعية للمنتجات الناقصة
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { type ProductEntity } from '@/infrastructure/database/dexie/db';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';
import { generateUniqueBarcodes } from '@/services/barcode';
import { X, Zap, AlertCircle, Check, RefreshCw } from 'lucide-react';

interface Props {
  products: ProductEntity[];       // المنتجات بدون باركود
  open: boolean;
  onClose: () => void;
}

export default function BulkAssignBarcodesModal({ products, open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [format, setFormat] = useState<'ean13' | 'code128'>('ean13');
  const [prefix, setPrefix] = useState('AN');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ added: number; failed: number; assignments: { name: string; code: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGenerate = async () => {
    if (processing) return;
    setProcessing(true);
    setError(null);
    try {
      const codes = await generateUniqueBarcodes(products.length, { format, prefix });
      let added = 0;
      let failed = 0;
      const assignments: { name: string; code: string }[] = [];
      for (let i = 0; i < products.length; i++) {
        try {
          await ProductBarcodeRepository.add({
            productId: products[i].id,
            barcode: codes[i],
            type: 'primary',
          });
          assignments.push({ name: products[i].name, code: codes[i] });
          added++;
        } catch {
          failed++;
        }
      }
      setResult({ added, failed, assignments });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product_barcodes'] });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setProcessing(false);
    }
  };

  const close = () => {
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
      <div className="bg-surface rounded-xl p-6 w-full max-w-2xl shadow-xl border border-outline-variant/20">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary border border-primary-container/30">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface">إسناد باركودات جماعية</h3>
            <p className="text-body-sm text-on-surface-variant">{products.length} منتج بدون باركود</p>
          </div>
          <button onClick={close} className="mr-auto p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant"><X className="w-5 h-5" /></button>
        </div>

        {!result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-sm text-on-surface mb-2">صيغة الباركود</label>
                <select value={format} onChange={e => setFormat(e.target.value as 'ean13' | 'code128')} className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg bg-surface-container text-right focus:border-primary">
                  <option value="ean13">EAN-13 (منتجات)</option>
                  <option value="code128">CODE128 (عام)</option>
                </select>
              </div>
              <div>
                <label className="block text-label-sm text-on-surface mb-2">بادئة CODE128</label>
                <input type="text" value={prefix} onChange={e => setPrefix(e.target.value.slice(0, 5))} maxLength={5} disabled={format === 'ean13'} className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg bg-surface-container text-right focus:border-primary disabled:opacity-50" />
              </div>
            </div>

            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning text-body-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <ul className="text-right">
                <li>سيُولّد {products.length} باركود فريداً.</li>
                <li>يُسجّل كل باركود كـ"باركود أساسي"+type:'primary' في جدول product_barcodes.</li>
                <li>لن يُعدّل حقل Product.barcode السطحي (يبقى فارغاً)؛ البحث يمر عبر searchByBarcode في الجدول المرتبط.</li>
              </ul>
            </div>

            <button
              onClick={handleGenerate}
              disabled={processing || products.length === 0}
              className="w-full py-3.5 bg-primary text-on-primary rounded-lg font-cairo font-bold text-headline-sm hover:bg-primary-container transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <><RefreshCw className="w-5 h-5 animate-spin" /> جاري التوليد...</> : <><Zap className="w-5 h-5" /> توليد وإضافة {products.length} باركود</>}
            </button>

            {error && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-body-sm text-right">{error}</div>
            )}
          </div>
        )}

        {/* قائمة معاينة الأسنادات الناجحة */}
        {result && (
          <div className="space-y-3">
            <div className="p-3 bg-tertiary-container/20 border border-tertiary/30 rounded-lg text-on-tertiary-container text-body-sm text-right flex items-center gap-2">
              <Check className="w-4 h-4 text-tertiary" />
              تم إضافة {result.added} باركود. فشل {result.failed}.
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 custom-scrollbar bg-surface-container-low rounded-lg p-3 border border-outline-variant/20">
              {result.assignments.map((a, i) => (
                <div key={i} className="flex flex-row-reverse items-center justify-between p-2 bg-surface-container rounded-md text-body-sm">
                  <span className="text-on-surface truncate">{a.name}</span>
                  <span className="font-mono text-on-surface-variant" dir="ltr">{a.code}</span>
                </div>
              ))}
            </div>
            <button onClick={close} className="w-full py-3 bg-tertiary text-on-tertiary rounded-lg font-bold hover:opacity-80">إغلاق</button>
          </div>
        )}
      </div>
    </div>
  );
}
