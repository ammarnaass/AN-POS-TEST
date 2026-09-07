// BarcodeSection — PRD section 5: الباركود والترميز (UI/UX Pro Max)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateEAN13, generateCode128 } from '@/services/barcode';
import type { Product } from '@/types';
import {
  Barcode, RefreshCw, Printer,
  Copy, Check, ScanLine
} from 'lucide-react';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

export default function BarcodeSection({ form, setForm }: Props) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const barcode = form.barcode ?? '';

  const handleGenerateEAN13 = () => {
    const code = generateEAN13();
    setForm((p) => ({ ...p, barcode: code }));
  };

  const handleGenerateCode128 = () => {
    const code = generateCode128('AN');
    setForm((p) => ({ ...p, barcode: code }));
  };

  const handleCopyBarcode = () => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openPrintPage = () => {
    if (!form.id) {
      alert('احفظ المنتج أولًا قبل طباعة الباركود');
      return;
    }
    navigate(`/barcode/labels?productId=${form.id}`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-cairo text-title-md font-bold text-on-surface">
              الباركود والترميز
            </h3>
            <p className="text-body-xs text-on-surface-variant">
              مسح وتوليد الباركود الدولي (EAN-13 / CODE128) والطباعة
            </p>
          </div>
        </div>

        {form.id && (
          <button
            type="button"
            onClick={openPrintPage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة ملصق الباركود</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* إدخال وتوليد الباركود */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-label-sm font-semibold text-on-surface">
                رقم الباركود الرئيسي
              </label>
              {barcode && (
                <button
                  type="button"
                  onClick={handleCopyBarcode}
                  className="flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer px-1.5 py-0.5 rounded"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الرقم'}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
                placeholder="امسح بالماسح الضوئي أو اكتب أو ولّد بالأسفل"
                className="w-full h-11 pr-11 pl-4 bg-surface-container-low rounded-xl text-body-md text-right font-mono focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 focus:border-primary transition-all font-bold text-on-surface tracking-wider"
              />
              <ScanLine className="w-4 h-4 text-primary absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* أزرار التوليد السريع */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleGenerateEAN13}
              className="flex items-center justify-center gap-2 p-3 bg-surface-container-low hover:bg-primary/10 hover:border-primary/40 border border-outline-variant/20 rounded-xl text-body-sm font-bold text-on-surface transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-primary" />
              <span>توليد EAN-13</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateCode128}
              className="flex items-center justify-center gap-2 p-3 bg-surface-container-low hover:bg-primary/10 hover:border-primary/40 border border-outline-variant/20 rounded-xl text-body-sm font-bold text-on-surface transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Barcode className="w-4 h-4 text-primary" />
              <span>توليد CODE128</span>
            </button>
          </div>
        </div>

        {/* المعاينة الحية للباركود — بطاقة مرئية */}
        <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center justify-center text-center space-y-3">
          <span className="text-body-xs font-semibold text-on-surface-variant">معاينة بطاقة الباركود</span>

          <div className="bg-white text-black p-4 rounded-xl shadow-md border border-neutral-200 w-full max-w-[280px] flex flex-col items-center">
            <p className="text-[12px] font-bold text-neutral-800 truncate w-full mb-1">
              {form.name || 'اسم المنتج'}
            </p>

            {/* خطوط الباركود المصورة بـ SVG */}
            <div className="h-14 flex items-center justify-center gap-[2px] w-full px-2 my-1 overflow-hidden">
              {Array.from({ length: 38 }).map((_, i) => {
                const isThick = (i % 3 === 0 || i % 7 === 0);
                const isGap = (i % 5 === 0);
                if (isGap) return <div key={i} className="w-[1.5px] h-12 bg-transparent" />;
                return (
                  <div
                    key={i}
                    className={`${isThick ? 'w-[2.5px]' : 'w-[1.5px]'} h-12 bg-black rounded-none`}
                  />
                );
              })}
            </div>

            <p className="font-mono text-xs font-bold text-black tracking-widest mt-1" dir="ltr">
              {barcode || 'لا يوجد باركود'}
            </p>

            <p className="text-[11px] font-extrabold text-black mt-1">
              {form.salePrice1 || form.retailPrice ? `${(form.salePrice1 || form.retailPrice || 0).toLocaleString()} دج` : '0.00 دج'}
            </p>
          </div>

          <p className="text-[11px] text-on-surface-variant">
            هذا هو الشكل الذي سيظهر على ملصق السعر الحراري عند الطباعة.
          </p>
        </div>
      </div>
    </div>
  );
}
