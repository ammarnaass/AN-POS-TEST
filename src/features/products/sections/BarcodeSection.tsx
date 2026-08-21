// BarcodeSection — PRD section 5: الباركود
import { useNavigate } from 'react-router-dom';
import { generateEAN13, generateCode128 } from '@/services/barcode';
import type { Product } from '@/types';
import { Barcode, RefreshCw, QrCode, Printer } from 'lucide-react';

interface Props {
  form: Partial<Product>;
  setForm: (updater: (p: Partial<Product>) => Partial<Product>) => void;
}

export default function BarcodeSection({ form, setForm }: Props) {
  const navigate = useNavigate();

  const handleGenerateEAN13 = () => {
    const code = generateEAN13();
    setForm((p) => ({ ...p, barcode: code }));
  };

  const handleGenerateCode128 = () => {
    const code = generateCode128('AN');
    setForm((p) => ({ ...p, barcode: code }));
  };

  const openPrintPage = () => {
    if (!form.id) {
      alert('احفظ المنتج أولًا قبل طباعة الباركود');
      return;
    }
    navigate(`/barcode/labels?productId=${form.id}`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="font-cairo text-headline-sm font-bold text-on-surface border-r-4 border-primary pr-3">
        الباركود
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-label-sm text-on-surface mb-1.5">رقم الباركود</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.barcode ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
              placeholder="أدخل باركود يدويًا أو ولّد واحدًا"
              className="flex-1 h-10 px-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20 border border-outline-variant/20 font-mono"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateEAN13}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-container/20 text-primary rounded-lg text-label-md hover:bg-primary-container/30"
        >
          <RefreshCw className="w-4 h-4" /> توليد EAN-13 عشوائي
        </button>

        <button
          type="button"
          onClick={handleGenerateCode128}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-container-high text-on-surface rounded-lg text-label-md hover:bg-surface-container-highest"
        >
          <Barcode className="w-4 h-4" /> توليد CODE128
        </button>

        <button
          type="button"
          onClick={() => alert('ميزة QR Code ستُضاف في تحديث BarcodeLabelsPage القادم.')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-tertiary/20 text-tertiary rounded-lg text-label-md hover:bg-tertiary/30"
        >
          <QrCode className="w-4 h-4" /> إنشاء QR Code
        </button>

        <button
          type="button"
          onClick={openPrintPage}
          disabled={!form.id}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container disabled:opacity-40"
        >
          <Printer className="w-4 h-4" /> طباعة الباركود
        </button>
      </div>
    </div>
  );
}
