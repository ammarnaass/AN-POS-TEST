// BarcodeLabelsPage — PRD: شاشة طباعة ملصقات الباركود (مُعاد كتابتها)
// 10 أحجام ملصقات + 6 أنواع باركود + QR حقيقي + حفظ سجل الطباعة
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { db, type ProductEntity } from '@/infrastructure/database/dexie/db';
import { ProductBarcodeRepository } from '@/infrastructure/database/repositories/ProductBarcodeRepository';
import {
  generateEAN13, generateCode128, generateEAN8, generateUPCA,
} from '@/services/barcode/generateBarcode';
import { generateQRSVG } from '@/services/barcode/generateQR';
import { barcodePrintsApi } from '@/services/api/barcodePrintsApi';
import {
  Barcode, Package, Plus, Minus, Printer, Search, Check,
  Eye, EyeOff, RefreshCw, Wand2, X, History,
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

type BarcodeFormat = 'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'qr';

interface LabelSize {
  id: string;
  label: string;
  width: number; // mm
  height: number; // mm
}

const LABEL_SIZES: LabelSize[] = [
  { id: '40x20', label: '40×20', width: 40, height: 20 },
  { id: '40x25', label: '40×25', width: 40, height: 25 },
  { id: '35x35', label: '35×35', width: 35, height: 35 },
  { id: '45x35', label: '45×35', width: 45, height: 35 },
  { id: '50x25', label: '50×25', width: 50, height: 25 },
  { id: '55x35', label: '55×35', width: 55, height: 35 },
  { id: '55x45', label: '55×45', width: 55, height: 45 },
  { id: '50x50', label: '50×50', width: 50, height: 50 },
  { id: '20x40', label: '20×40', width: 20, height: 40 },
  { id: '42x35', label: '42×35', width: 42, height: 35 },
];

interface PrintOptions {
  labelSizeId: string;
  barcodeFormat: BarcodeFormat;
  copies: number;
  entryMode: 'random' | 'manual';
  manualBarcode: string;
  showCompany: boolean;
  showProduct: boolean;
  showSku: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  enlargePrice: boolean;
}

const DEFAULT_OPTS: PrintOptions = {
  labelSizeId: '40x25',
  barcodeFormat: 'ean13',
  copies: 1,
  entryMode: 'random',
  manualBarcode: '',
  showCompany: false,
  showProduct: true,
  showSku: false,
  showPrice: true,
  showBarcode: true,
  enlargePrice: false,
};

interface ProductLabelItem {
  product: ProductEntity;
  barcode: string;
  copies: number;
}

// ============ Barcode SVG component ============
const BarcodeSvg: React.FC<{
  value: string;
  format: BarcodeFormat;
  height?: number;
  width?: number;
}> = ({ value, format, height = 30, width = 1.2 }) => {
  const ref = useRef<SVGSVGElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setErr(null);

    if (!value || !value.trim()) {
      if (active) setErr('الباركود فارغ');
      return;
    }
    if (format === 'qr') {
      // QR Code via qrcode package
      generateQRSVG(value, { size: Math.min(height * 3, 120) })
        .then((svgStr) => {
          if (!active || !qrContainerRef.current) return;
          qrContainerRef.current.innerHTML = svgStr;
        })
        .catch((e) => setErr(e?.message ?? 'QR err'));
    } else {
      // Linear barcode via JsBarcode
      const fmtMap: Record<Exclude<BarcodeFormat, 'qr'>, string> = {
        ean13: 'EAN13',
        ean8: 'EAN8',
        code128: 'CODE128',
        code39: 'CODE39',
        upca: 'UPC',
      };
      const fmt = fmtMap[format as Exclude<BarcodeFormat, 'qr'>];
      if (!ref.current) return;
      try {
        JsBarcode(ref.current, value, {
          format: fmt,
          width,
          height,
          displayValue: false,
          margin: 2,
          fontSize: 10,
          valid: () => {},
        });
      } catch (e: any) {
        if (active) setErr(String(e?.message ?? e ?? 'JsBarcode err'));
      }
    }
    return () => { active = false; };
  }, [value, format, height, width]);

  if (err) {
    return <div className="text-[8px] text-error text-center py-1">خطأ: {err}</div>;
  }
  return (
    <>
      <svg ref={ref} className={format === 'qr' ? 'hidden' : ''} />
      <div ref={qrContainerRef} className={format === 'qr' ? '' : 'hidden'} />
    </>
  );
};

// ============ Page ============
export default function BarcodeLabelsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectProductId = searchParams.get('productId');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => db.products.toArray(),
  });
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });
  const { data: barcodes = [] } = useQuery({
    queryKey: ['product_barcodes'],
    queryFn: () => ProductBarcodeRepository.listAll(),
  });
  const { data: printHistory = [] } = useQuery({
    queryKey: ['barcode-prints'],
    queryFn: () => barcodePrintsApi.list({ limit: 20 }),
  });

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [opts, setOpts] = useState<PrintOptions>(DEFAULT_OPTS);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Preselect product from query param
  useEffect(() => {
    if (preselectProductId) {
      setSelectedIds(new Set([preselectProductId]));
    }
  }, [preselectProductId]);

  // Primary barcode per product
  const productBars = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      if (p.barcode) map.set(p.id, p.barcode);
    }
    for (const b of barcodes) {
      if (b.type === 'primary' && !map.has(b.productId)) map.set(b.productId, b.barcode);
    }
    return map;
  }, [products, barcodes]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q),
    );
  }, [products, search]);

  const labelSize = useMemo(
    () => LABEL_SIZES.find((l) => l.id === opts.labelSizeId) ?? LABEL_SIZES[0],
    [opts.labelSizeId],
  );

  // Generate barcode by format
  const generateBarcodeValue = useCallback((): string => {
    switch (opts.barcodeFormat) {
      case 'ean13': return generateEAN13();
      case 'ean8': return generateEAN8();
      case 'upca': return generateUPCA();
      case 'code128': return generateCode128('AN');
      case 'code39': return generateCode128('AN');
      case 'qr': return `AN-${Date.now()}`;
      default: return generateEAN13();
    }
  }, [opts.barcodeFormat]);

  // Actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(products.map((p) => p.id)));
  }, [products]);

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const generateForAll = useCallback(async () => {
    const ids = [...selectedIds].filter((id) => !productBars.get(id));
    let success = 0;
    for (const id of ids) {
      try {
        const code = generateBarcodeValue();
        await ProductBarcodeRepository.add({ productId: id, barcode: code, type: 'primary' });
        success++;
      } catch { /* ignore */ }
    }
    alert(`تم توليد ${success} باركود`);
    queryClient.invalidateQueries({ queryKey: ['product_barcodes'] });
  }, [selectedIds, productBars, generateBarcodeValue, queryClient]);

  // Save print record mutation
  const savePrintMutation = useMutation({
    mutationFn: async (items: ProductLabelItem[]) => {
      await Promise.all(items.map((item) =>
        barcodePrintsApi.create({
          productId: item.product.id,
          barcode: item.barcode,
          labelSize: opts.labelSizeId,
          copies: item.copies,
          barcodeType: opts.barcodeFormat,
          showCompany: opts.showCompany,
          showProduct: opts.showProduct,
          showSku: opts.showSku,
          showPrice: opts.showPrice,
          showBarcode: opts.showBarcode,
          enlargePrice: opts.enlargePrice,
          printOptions: {},
        }),
      ));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barcode-prints'] }),
    onError: (err: ApiError) => console.warn('save print record failed', err.message),
  });

  // Build label items
  const labelItems: ProductLabelItem[] = useMemo(() => {
    const out: ProductLabelItem[] = [];
    for (const id of selectedIds) {
      const product = products.find((p) => p.id === id);
      if (!product) continue;
      const code = opts.entryMode === 'manual' && opts.manualBarcode
        ? opts.manualBarcode
        : productBars.get(id) || product.barcode || generateBarcodeValue();
      if (!code) continue;
      for (let i = 0; i < opts.copies; i++) {
        out.push({ product, barcode: code, copies: i + 1 });
      }
    }
    return out;
  }, [selectedIds, products, productBars, opts.entryMode, opts.manualBarcode, opts.copies, generateBarcodeValue]);

  // Print
  const handlePrint = useCallback(async () => {
    // Save history first (non-blocking on failure)
    if (labelItems.length > 0) {
      savePrintMutation.mutate(labelItems);
    }
    // Give the save a tick then print
    setTimeout(() => window.print(), 200);
  }, [labelItems, savePrintMutation]);

  const cols = Math.max(1, Math.floor(190 / (labelSize.width + 2)));

  return (
    <div className="flex flex-col h-full gap-4" dir="rtl">
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; inset: 0; }
          .no-print { display: none !important; }
          .label-card { page-break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="px-5 py-4 bg-surface-container rounded-lg flex flex-row-reverse items-center gap-4 no-print">
        <Barcode className="w-6 h-6 text-primary" />
        <div className="text-right mr-auto">
          <h2 className="font-cairo text-headline-md font-bold text-on-surface">ملصقات الباركود</h2>
          <p className="text-body-sm text-on-surface-variant">10 أحجام • 6 أنواع باركود • QR حقيقي</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-3 py-2.5 bg-surface-container-high rounded-lg text-label-md hover:bg-surface-container-highest"
        >
          <History className="w-4 h-4" /> السجل ({printHistory.length})
        </button>
        <button
          onClick={handlePrint}
          disabled={labelItems.length === 0 || savePrintMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container transition-all shadow-sm disabled:opacity-40"
        >
          <Printer className="w-4 h-4" /> طباعة ({labelItems.length})
        </button>
        <button
          onClick={() => setPreviewVisible(!previewVisible)}
          className="flex items-center gap-2 px-3 py-2.5 bg-surface-container-high rounded-lg text-label-md hover:bg-surface-container-highest"
        >
          {previewVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {previewVisible ? 'إخفاء' : 'إظهار'}
        </button>
      </div>

      {/* Print History Panel */}
      {showHistory && (
        <div className="bg-surface rounded-lg border border-outline-variant/20 p-4 no-print">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface">آخر عمليات الطباعة</h3>
            <button onClick={() => setShowHistory(false)} className="p-1 text-on-surface-variant hover:text-on-surface">
              <X className="w-5 h-5" />
            </button>
          </div>
          {printHistory.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-4">لا يوجد سجل بعد</p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-3 py-2">المنتج</th>
                    <th className="px-3 py-2">الباركود</th>
                    <th className="px-3 py-2">الحجم</th>
                    <th className="px-3 py-2">النوع</th>
                    <th className="px-3 py-2">النسخ</th>
                    <th className="px-3 py-2">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {printHistory.map((ph) => (
                    <tr key={ph.id} className="border-b border-outline-variant/5">
                      <td className="px-3 py-2">{ph.productName || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{ph.barcode}</td>
                      <td className="px-3 py-2">{ph.labelSize}</td>
                      <td className="px-3 py-2 uppercase">{ph.barcodeType}</td>
                      <td className="px-3 py-2 text-center">{ph.copies}</td>
                      <td className="px-3 py-2 text-xs text-on-surface-variant">
                        {new Date(ph.createdAt).toLocaleString('ar-DZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Products column */}
        <div className="bg-surface rounded-lg border border-outline-variant/20 flex flex-col no-print">
          <div className="p-3 border-b border-outline-variant/20">
            <div className="relative mb-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث..."
                className="w-full h-10 pr-9 pl-3 bg-surface-container-low rounded-lg text-body-md text-right focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-row-reverse gap-2 text-xs">
              <button onClick={selectAll} className="px-3 py-1.5 bg-primary-container/20 text-primary rounded-md hover:bg-primary-container/30">تحديد الكل</button>
              <button onClick={clearAll} className="px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded-md hover:bg-surface-container-highest">إلغاء</button>
              <button onClick={generateForAll} className="flex items-center gap-1 px-3 py-1.5 bg-tertiary text-on-tertiary rounded-md hover:opacity-80">
                <Wand2 className="w-3 h-3" /> توليد تلقائي
              </button>
            </div>
            <p className="text-body-xs text-on-surface-variant mt-2 text-right">{selectedIds.size} محدّد</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredProducts.map((p) => {
              const selected = selectedIds.has(p.id);
              const code = productBars.get(p.id) || '';
              return (
                <button
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`w-full flex flex-row-reverse items-center gap-3 p-3 rounded-lg border transition-all text-right ${
                    selected
                      ? 'border-primary bg-primary-container/10'
                      : 'border-outline-variant/20 bg-surface-container-low hover:bg-surface-container-highest'
                  } ${!code ? 'opacity-60' : ''}`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${selected ? 'bg-primary' : 'border border-outline-variant/30'}`}>
                    {selected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <Package className="w-4 h-4 text-outline" />
                  <div className="flex-1 min-w-0">
                    <p className="text-label-md text-on-surface truncate">{p.name}</p>
                    <p className="text-body-xs text-on-surface-variant font-mono">{code || '— بدون —'}</p>
                  </div>
                  <span className="text-label-sm font-bold text-primary shrink-0">{p.retailPrice?.toFixed(0)} دج</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Options column */}
        <div className="bg-surface rounded-lg border border-outline-variant/20 p-4 space-y-4 no-print overflow-y-auto">
          <h3 className="font-cairo text-headline-sm font-bold text-on-surface">إعدادات الملصق</h3>

          {/* Label sizes */}
          <div>
            <label className="block text-label-sm text-on-surface mb-2">حجم الملصق ({LABEL_SIZES.length})</label>
            <div className="grid grid-cols-3 gap-1.5">
              {LABEL_SIZES.map((ls) => (
                <button
                  key={ls.id}
                  onClick={() => setOpts({ ...opts, labelSizeId: ls.id })}
                  className={`py-2 px-2 rounded-lg text-label-sm transition-all ${
                    opts.labelSizeId === ls.id
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  {ls.label}
                </button>
              ))}
            </div>
          </div>

          {/* Barcode format */}
          <div>
            <label className="block text-label-sm text-on-surface mb-2">نوع الباركود</label>
            <select
              value={opts.barcodeFormat}
              onChange={(e) => setOpts({ ...opts, barcodeFormat: e.target.value as BarcodeFormat })}
              className="w-full px-3 py-2 border border-outline-variant/20 rounded-lg text-right bg-surface-container-low focus:border-primary"
            >
              <option value="ean13">EAN-13</option>
              <option value="ean8">EAN-8</option>
              <option value="code128">CODE128</option>
              <option value="code39">CODE39</option>
              <option value="upca">UPC-A</option>
              <option value="qr">QR Code (حقيقي)</option>
            </select>
          </div>

          {/* Entry mode */}
          <div>
            <label className="block text-label-sm text-on-surface mb-2">إدخال الباركود</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOpts({ ...opts, entryMode: 'random' })}
                className={`py-2 rounded-lg text-label-sm flex items-center justify-center gap-1 ${
                  opts.entryMode === 'random' ? 'bg-primary text-on-primary' : 'bg-surface-container-high'
                }`}
              >
                <RefreshCw className="w-3 h-3" /> عشوائي
              </button>
              <button
                onClick={() => setOpts({ ...opts, entryMode: 'manual' })}
                className={`py-2 rounded-lg text-label-sm ${
                  opts.entryMode === 'manual' ? 'bg-primary text-on-primary' : 'bg-surface-container-high'
                }`}
              >
                يدوي
              </button>
            </div>
            {opts.entryMode === 'manual' && (
              <input
                type="text"
                value={opts.manualBarcode}
                onChange={(e) => setOpts({ ...opts, manualBarcode: e.target.value })}
                placeholder="أدخل الباركود يدويًا"
                className="w-full h-10 mt-2 px-3 bg-surface-container-low rounded-lg text-body-md text-right border border-outline-variant/20 font-mono"
              />
            )}
          </div>

          {/* Copies */}
          <div>
            <label className="block text-label-sm text-on-surface mb-2">عدد النسخ لكل منتج</label>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpts({ ...opts, copies: Math.max(1, opts.copies - 1) })}
                className="w-8 h-8 bg-surface-container-high rounded-lg"
              >
                <Minus className="w-3.5 h-3.5 mx-auto" />
              </button>
              <span className="w-8 text-center text-label-md">{opts.copies}</span>
              <button
                onClick={() => setOpts({ ...opts, copies: Math.min(50, opts.copies + 1) })}
                className="w-8 h-8 bg-surface-container-high rounded-lg"
              >
                <Plus className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>
          </div>

          {/* Print options */}
          <div className="space-y-2">
            <label className="block text-label-sm text-on-surface mb-1">خيارات الطباعة</label>
            {[
              { k: 'showCompany' as const, label: 'طباعة اسم الشركة' },
              { k: 'showProduct' as const, label: 'طباعة اسم المنتج' },
              { k: 'showSku' as const, label: 'طباعة رمز المنتج (SKU)' },
              { k: 'enlargePrice' as const, label: 'تكبير السعر' },
              { k: 'showBarcode' as const, label: 'بيانات الباركود' },
            ].map((opt) => (
              <label key={opt.k} className="flex items-center gap-2 text-label-md text-on-surface">
                <input
                  type="checkbox"
                  checked={opts[opt.k]}
                  onChange={(e) => setOpts({ ...opts, [opt.k]: e.target.checked })}
                  className="w-4 h-4"
                />
                {opt.label}
              </label>
            ))}
            <label className="flex items-center gap-2 text-label-md text-on-surface">
              <input
                type="checkbox"
                checked={opts.showPrice}
                onChange={(e) => setOpts({ ...opts, showPrice: e.target.checked })}
                className="w-4 h-4"
              />
              عرض السعر
            </label>
          </div>

          <div className="p-3 bg-surface-container-low rounded-lg text-body-sm text-on-surface-variant">
            <p className="text-right">{labelItems.length} ملصق جاهز</p>
            <p className="text-body-xs mt-1 text-right">{labelSize.label}mm • {opts.barcodeFormat.toUpperCase()}</p>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-surface rounded-lg border border-outline-variant/20 overflow-y-auto custom-scrollbar p-4">
          {previewVisible && (
            <>
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-3 no-print">المعاينة</h3>
              <div
                className="print-area grid gap-1 mx-auto bg-white"
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${labelSize.width}mm)`,
                }}
              >
                {labelItems.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-on-surface-variant no-print">
                    <Barcode className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-body-sm">اختر منتجات لعرض الملصقات</p>
                  </div>
                ) : (
                  labelItems.map((item, i) => (
                    <div
                      key={`${item.product.id}-${i}`}
                      className="label-card flex flex-col items-center justify-between p-1 border border-dashed border-outline-variant/20"
                      style={{ width: `${labelSize.width}mm`, height: `${labelSize.height}mm` }}
                    >
                      {opts.showCompany && settings?.shopName && (
                        <span className="text-[7px] font-bold text-black text-center truncate w-full leading-tight">
                          {settings.shopName}
                        </span>
                      )}
                      {opts.showProduct && (
                        <span className="text-[8px] font-bold text-black text-center truncate w-full leading-tight">
                          {item.product.name}
                        </span>
                      )}
                      {opts.showSku && item.product.sku && (
                        <span className="text-[7px] text-black font-mono">{item.product.sku}</span>
                      )}
                      <BarcodeSvg
                        value={item.barcode}
                        format={opts.barcodeFormat}
                        height={Math.max(18, labelSize.height - 12)}
                      />
                      {opts.showBarcode && (
                        <span className="text-[7px] font-mono text-black">{item.barcode}</span>
                      )}
                      {opts.showPrice && (
                        <span className={`font-bold text-black ${opts.enlargePrice ? 'text-[14px]' : 'text-[10px]'}`}>
                          {item.product.retailPrice?.toFixed(0)} دج
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
