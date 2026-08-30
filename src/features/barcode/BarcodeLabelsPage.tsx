// BarcodeLabelsPage — PRD: شاشة طباعة وتصميم ملصقات الباركود المتطورة
// 10 أحجام ملصقات • 6 أنواع باركود • QR حقيقي • معاينة تفاعلية وسجل تدقيق
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
  Eye, EyeOff, RefreshCw, Wand2, X, History, SlidersHorizontal,
  Sparkles, CheckCircle2, QrCode, Layers, ZoomIn, ZoomOut, Maximize2,
  FileSpreadsheet, Tag, ArrowUpDown, ChevronDown
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

export type BarcodeFormat = 'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'qr';

export interface LabelSize {
  id: string;
  label: string;
  name: string;
  width: number; // mm
  height: number; // mm
  category: 'small' | 'standard' | 'large' | 'special';
}

export const LABEL_SIZES: LabelSize[] = [
  { id: '40x20', label: '40×20', name: 'ملصق مصغر', width: 40, height: 20, category: 'small' },
  { id: '40x25', label: '40×25', name: 'قياسي افتراضي', width: 40, height: 25, category: 'standard' },
  { id: '35x35', label: '35×35', name: 'مربع صغير', width: 35, height: 35, category: 'standard' },
  { id: '45x35', label: '45×35', name: 'رفوف متوسط', width: 45, height: 35, category: 'standard' },
  { id: '50x25', label: '50×25', name: 'أفقي رفيع', width: 50, height: 25, category: 'standard' },
  { id: '55x35', label: '55×35', name: 'تفصيلي مع SKU', width: 55, height: 35, category: 'large' },
  { id: '55x45', label: '55×45', name: 'شامل تفصيلي', width: 55, height: 45, category: 'large' },
  { id: '50x50', label: '50×50', name: 'مربع كبير QR', width: 50, height: 50, category: 'large' },
  { id: '20x40', label: '20×40', name: 'عمودي طولي', width: 20, height: 40, category: 'special' },
  { id: '42x35', label: '42×35', name: 'متوازن تجاري', width: 42, height: 35, category: 'special' },
];

export const BARCODE_FORMATS: { id: BarcodeFormat; name: string; desc: string; is2D?: boolean }[] = [
  { id: 'ean13', name: 'EAN-13', desc: 'الباركود التجاري القياسي (13 رقم)' },
  { id: 'code128', name: 'CODE-128', desc: 'عالي الكثافة (حروف وأرقام)' },
  { id: 'qr', name: 'QR Code', desc: 'رمز استجابة سريع حقيقي ثنائي الأبعاد', is2D: true },
  { id: 'ean8', name: 'EAN-8', desc: 'باركود المنتجات الصغيرة (8 أرقام)' },
  { id: 'code39', name: 'CODE-39', desc: 'الباركود الصناعي والمخزني' },
  { id: 'upca', name: 'UPC-A', desc: 'الباركود الأمريكي القياسي (12 رقم)' },
];

interface PrintOptions {
  labelSizeId: string;
  barcodeFormat: BarcodeFormat;
  copies: number;
  entryMode: 'product' | 'random' | 'manual';
  manualBarcode: string;
  showCompany: boolean;
  showProduct: boolean;
  showSku: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showBorder: boolean;
  enlargePrice: boolean;
}

const DEFAULT_OPTS: PrintOptions = {
  labelSizeId: '40x25',
  barcodeFormat: 'ean13',
  copies: 1,
  entryMode: 'product',
  manualBarcode: '',
  showCompany: true,
  showProduct: true,
  showSku: false,
  showPrice: true,
  showBarcode: true,
  showBorder: true,
  enlargePrice: false,
};

interface ProductLabelItem {
  product: ProductEntity;
  barcode: string;
  copies: number;
}

// ============ Barcode / QR Component ============
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
      // Real QR Code via qrcode package SVG
      generateQRSVG(value, { size: Math.max(30, Math.min(height * 2.8, 140)) })
        .then((svgStr) => {
          if (!active || !qrContainerRef.current) return;
          qrContainerRef.current.innerHTML = svgStr;
        })
        .catch((e) => {
          if (active) setErr(e?.message ?? 'خطأ في توليد QR');
        });
    } else {
      // Linear 1D barcode via JsBarcode
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
          margin: 1,
          fontSize: 9,
          valid: () => {},
        });
      } catch (e: any) {
        if (active) setErr(String(e?.message ?? 'تنسيق غير متوافق'));
      }
    }
    return () => {
      active = false;
    };
  }, [value, format, height, width]);

  if (err) {
    return (
      <div className="text-[9px] text-rose-500 font-mono text-center py-1 bg-rose-500/10 rounded px-1 max-w-full truncate">
        {err}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center max-w-full overflow-hidden">
      <svg ref={ref} className={format === 'qr' ? 'hidden' : 'max-w-full block'} />
      <div ref={qrContainerRef} className={format === 'qr' ? 'flex items-center justify-center' : 'hidden'} />
    </div>
  );
};

// ============ Main Barcode Studio Page ============
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
    queryFn: () => barcodePrintsApi.list({ limit: 30 }),
  });

  // State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [opts, setOpts] = useState<PrintOptions>(DEFAULT_OPTS);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  // Preselect from query params
  useEffect(() => {
    if (preselectProductId) {
      setSelectedIds(new Set([preselectProductId]));
    }
  }, [preselectProductId]);

  // Primary barcode map per product
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

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      const c = typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
      if (c && typeof c === 'string' && c.trim()) set.add(c.trim());
    }
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => {
        const c = typeof p.category === 'object' && p.category !== null ? (p.category as any).name : p.category;
        return c === selectedCategory;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, search, selectedCategory]);

  const labelSize = useMemo(
    () => LABEL_SIZES.find((l) => l.id === opts.labelSizeId) ?? LABEL_SIZES[1],
    [opts.labelSizeId],
  );

  // Barcode generator by format
  const generateBarcodeValue = useCallback((): string => {
    switch (opts.barcodeFormat) {
      case 'ean13': return generateEAN13();
      case 'ean8': return generateEAN8();
      case 'upca': return generateUPCA();
      case 'code128': return generateCode128('AN');
      case 'code39': return generateCode128('AN');
      case 'qr': return `AN-POS-${Date.now()}`;
      default: return generateEAN13();
    }
  }, [opts.barcodeFormat]);

  // Select helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
  }, [filteredProducts]);

  const clearAll = useCallback(() => setSelectedIds(new Set()), []);

  const generateForAll = useCallback(async () => {
    const ids = [...selectedIds].filter((id) => !productBars.get(id));
    if (ids.length === 0) {
      alert('جميع المنتجات المحددة تمتلك باركود بالفعل.');
      return;
    }
    let success = 0;
    for (const id of ids) {
      try {
        const code = generateBarcodeValue();
        await ProductBarcodeRepository.add({ productId: id, barcode: code, type: 'primary' });
        success++;
      } catch { /* ignore */ }
    }
    queryClient.invalidateQueries({ queryKey: ['product_barcodes'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    alert(`تم توليد وحفظ ${success} باركود بنجاح.`);
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
    onError: (err: any) => console.warn('save print record failed', err?.message),
  });

  // Build label items
  const labelItems: ProductLabelItem[] = useMemo(() => {
    const out: ProductLabelItem[] = [];
    for (const id of selectedIds) {
      const product = products.find((p) => p.id === id);
      if (!product) continue;
      
      let code = '';
      if (opts.entryMode === 'manual' && opts.manualBarcode) {
        code = opts.manualBarcode;
      } else if (opts.entryMode === 'random') {
        code = generateBarcodeValue();
      } else {
        // Use product barcode or fallback
        code = productBars.get(id) || product.barcode || generateBarcodeValue();
      }

      if (!code) continue;
      for (let i = 0; i < opts.copies; i++) {
        out.push({ product, barcode: code, copies: i + 1 });
      }
    }
    return out;
  }, [selectedIds, products, productBars, opts.entryMode, opts.manualBarcode, opts.copies, generateBarcodeValue]);

  // Print
  const handlePrint = useCallback(async () => {
    if (labelItems.length > 0) {
      savePrintMutation.mutate(labelItems);
    }
    setTimeout(() => window.print(), 250);
  }, [labelItems, savePrintMutation]);

  // Grid layout calculations
  const cols = Math.max(1, Math.floor(190 / (labelSize.width + 3)));
  const baseCurrency = settings?.baseCurrency ?? 'دج';
  const shopName = settings?.shopName || 'متجر AN POS';

  return (
    <div className="flex flex-col h-full gap-4 animate-fade-in" dir="rtl">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          @page { size: A4; margin: 6mm; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: grid !important;
          }
          .no-print { display: none !important; }
          .label-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Top Header Hub */}
      <div className="p-4 bg-surface-container rounded-2xl border border-outline-variant/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-cairo text-xl font-bold text-on-surface">استوديو ملصقات الباركود</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                10 أحجام • 6 أنواع • QR حقيقي
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              تصميم وتوليد وطباعة ملصقات الباركود والرفوف بمقاسات معيارية
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <History className="w-4 h-4 text-primary" />
            <span>السجل ({printHistory.length})</span>
          </button>

          <button
            onClick={() => setPreviewVisible((v) => !v)}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {previewVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-primary" />}
            <span>{previewVisible ? 'إخفاء المعاينة' : 'عرض المعاينة'}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={labelItems.length === 0 || savePrintMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl text-xs font-bold shadow-md hover:shadow-primary/30 hover:opacity-95 transition-all disabled:opacity-40 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الملصقات ({labelItems.length})</span>
          </button>
        </div>
      </div>

      {/* History Slide-Over / Modal */}
      {showHistory && (
        <div className="bg-surface-container rounded-2xl border border-primary/20 p-5 shadow-lg animate-scale-in no-print">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              <h3 className="font-cairo text-base font-bold text-on-surface">سجل عمليات طباعة الباركود الأخيرة</h3>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {printHistory.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-6">لا توجد عمليات طباعة مسجلة بعد</p>
          ) : (
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-surface-container-high/60 text-on-surface-variant font-semibold border-b border-outline-variant/15">
                    <th className="px-3.5 py-2">المنتج</th>
                    <th className="px-3.5 py-2">رمز الباركود</th>
                    <th className="px-3.5 py-2 text-center">المقاس</th>
                    <th className="px-3.5 py-2 text-center">النوع</th>
                    <th className="px-3.5 py-2 text-center">النسخ</th>
                    <th className="px-3.5 py-2 text-left">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {printHistory.map((ph) => (
                    <tr key={ph.id} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="px-3.5 py-2.5 font-medium text-on-surface">{ph.productName || 'منتج مخصص'}</td>
                      <td className="px-3.5 py-2.5 font-mono text-primary font-bold">{ph.barcode}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container-high font-mono">{ph.labelSize}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center uppercase font-bold text-[11px] text-on-surface-variant">
                        {ph.barcodeType}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-bold">{ph.copies}</td>
                      <td className="px-3.5 py-2.5 text-left text-on-surface-variant text-[11px]">
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

      {/* 3-Column Studio Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Column 1: Product Selection (4 Cols) */}
        <div className="lg:col-span-4 bg-surface-container rounded-2xl border border-outline-variant/20 flex flex-col shadow-sm no-print overflow-hidden">
          <div className="p-3.5 border-b border-outline-variant/20 space-y-3 bg-surface-container-high/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                اختيار المنتجات ({selectedIds.size}/{products.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={selectAll}
                  className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                >
                  الكل
                </button>
                <button
                  onClick={clearAll}
                  className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-lg text-[11px] font-medium transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم، الباركود، أو الفئة..."
                className="w-full h-9 pr-8 pl-8 bg-surface-container-high/70 rounded-xl text-xs text-on-surface border border-outline-variant/20 focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills Filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  الكل ({products.length})
                </button>
                {categories.map((cat: any) => {
                  const catName = typeof cat === 'object' && cat !== null ? (cat.name || cat.id) : String(cat);
                  return (
                    <button
                      key={catName}
                      onClick={() => setSelectedCategory(catName)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        selectedCategory === catName
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {catName}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Auto Generate Missing Button */}
            <button
              onClick={generateForAll}
              disabled={selectedIds.size === 0}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>توليد باركود تلقائي للأصناف المحددة</span>
            </button>
          </div>

          {/* Product Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {filteredProducts.map((p) => {
              const selected = selectedIds.has(p.id);
              const code = productBars.get(p.id) || p.barcode || '';
              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  className={`w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    selected
                      ? 'border-primary/60 bg-primary/5 shadow-sm'
                      : 'border-outline-variant/15 bg-surface-container-high/40 hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        selected ? 'bg-primary text-on-primary' : 'border border-outline-variant/40 bg-surface-container'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          code ? 'bg-emerald-500/10 text-emerald-600 font-bold' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {code || 'بدون باركود'}
                        </span>
                        {p.category && (
                          <span className="text-[10px] text-on-surface-variant truncate">
                            • {p.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-primary font-cairo shrink-0">
                    {Number(p.retailPrice || 0).toFixed(0)} <span className="text-[10px] font-normal">{baseCurrency}</span>
                  </span>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="text-center py-10 text-on-surface-variant text-xs">
                لا توجد منتجات مطابقة لخيارات البحث
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Label Configurator (4 Cols) */}
        <div className="lg:col-span-4 bg-surface-container rounded-2xl border border-outline-variant/20 p-4 space-y-4 shadow-sm no-print overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/15">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              تخصيص وإعدادات الملصق
            </span>
            <span className="text-[11px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-lg">
              {labelSize.label} mm
            </span>
          </div>

          {/* 10 Label Sizes Palette */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">
              1. حجم الملصق (10 أحجام جاهزة)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {LABEL_SIZES.map((ls) => {
                const isSelected = opts.labelSizeId === ls.id;
                return (
                  <button
                    key={ls.id}
                    onClick={() => setOpts({ ...opts, labelSizeId: ls.id })}
                    className={`py-2 px-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary shadow-sm font-bold'
                        : 'bg-surface-container-high/60 border-outline-variant/20 text-on-surface hover:bg-surface-container-highest'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs">{ls.label}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-on-surface-variant'}`}>
                        {ls.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6 Barcode Formats Palette */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-2">
              2. نوع وترميز الباركود (6 أنواع)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {BARCODE_FORMATS.map((fmt) => {
                const isSelected = opts.barcodeFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setOpts({ ...opts, barcodeFormat: fmt.id })}
                    className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                        : 'bg-surface-container-high/60 border-outline-variant/20 text-on-surface hover:bg-surface-container-highest'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{fmt.name}</span>
                      {fmt.is2D && (
                        <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-600 text-[9px] font-bold">
                          2D QR
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-on-surface-variant truncate mt-0.5">{fmt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Barcode Source Mode */}
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1.5">
              3. مصدر وقيمة الباركود
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-high/60 rounded-xl border border-outline-variant/20">
              {[
                { id: 'product', label: 'المسجل' },
                { id: 'random', label: 'عشوائي' },
                { id: 'manual', label: 'يدوي' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOpts({ ...opts, entryMode: m.id as any })}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    opts.entryMode === m.id
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {opts.entryMode === 'manual' && (
              <input
                type="text"
                value={opts.manualBarcode}
                onChange={(e) => setOpts({ ...opts, manualBarcode: e.target.value })}
                placeholder="أدخل نص الباركود المخصص هنا..."
                className="w-full h-9 mt-2 px-3 bg-surface-container-high rounded-xl text-xs text-on-surface border border-outline-variant/30 font-mono focus:border-primary"
              />
            )}
          </div>

          {/* Copies Stepper */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-on-surface">4. عدد النسخ لكل منتج</label>
              <div className="flex items-center gap-1">
                {[1, 5, 10, 20].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setOpts({ ...opts, copies: preset })}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      opts.copies === preset ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    ×{preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpts({ ...opts, copies: Math.max(1, opts.copies - 1) })}
                className="w-9 h-9 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-all cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 bg-surface-container-high/60 border border-outline-variant/20 rounded-xl h-9 flex items-center justify-center font-bold text-sm text-on-surface font-mono">
                {opts.copies} {opts.copies === 1 ? 'نسخة' : 'نسخ'}
              </div>
              <button
                onClick={() => setOpts({ ...opts, copies: Math.min(100, opts.copies + 1) })}
                className="w-9 h-9 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Label Content Element Toggles */}
          <div className="space-y-2 pt-2 border-t border-outline-variant/15">
            <label className="block text-xs font-bold text-on-surface mb-1">
              5. العناصر الظاهرة في الملصق
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: 'showCompany' as const, label: 'اسم المتجر' },
                { k: 'showProduct' as const, label: 'اسم المنتج' },
                { k: 'showPrice' as const, label: 'عرض السعر' },
                { k: 'enlargePrice' as const, label: 'تكبير السعر' },
                { k: 'showBarcode' as const, label: 'رقم الباركود' },
                { k: 'showSku' as const, label: 'رمز SKU' },
                { k: 'showBorder' as const, label: 'حدود القص' },
              ].map((item) => {
                const active = (opts as any)[item.k];
                return (
                  <label
                    key={item.k}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      active
                        ? 'bg-primary/5 border-primary/40 text-on-surface'
                        : 'bg-surface-container-high/40 border-outline-variant/15 text-on-surface-variant'
                    }`}
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setOpts({ ...opts, [item.k]: e.target.checked })}
                      className="w-4 h-4 rounded text-primary focus:ring-primary"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Live Preview Sandbox (4 Cols) */}
        <div className="lg:col-span-4 bg-surface-container rounded-2xl border border-outline-variant/20 p-4 flex flex-col shadow-sm overflow-hidden">
          {/* Preview Controls Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15 no-print">
            <div>
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                المعاينة الحية للطباعة
              </span>
              <p className="text-[10px] text-on-surface-variant mt-0.5">
                جاهز لطباعة {labelItems.length} ملصق
              </p>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-surface-container-high px-2 py-1 rounded-xl border border-outline-variant/20 text-xs">
              <button
                onClick={() => setPreviewZoom((z) => Math.max(50, z - 15))}
                className="p-1 hover:text-primary transition-colors cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[11px] font-bold px-1">{previewZoom}%</span>
              <button
                onClick={() => setPreviewZoom((z) => Math.min(160, z + 15))}
                className="p-1 hover:text-primary transition-colors cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preview Sandbox Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-zinc-100 dark:bg-zinc-950 rounded-xl border border-outline-variant/20 mt-3 flex items-start justify-center">
            {labelItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-on-surface-variant no-print">
                <Barcode className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-bold text-xs">لا توجد منتجات محددة</p>
                <p className="text-[11px] mt-1 max-w-xs">
                  اختر منتجاً أو أكثر من القائمة على اليمين لتوليد ومعاينة ملصقات الباركود فوراً
                </p>
              </div>
            ) : (
              <div
                className="print-area grid gap-2 mx-auto bg-white p-3 rounded-lg shadow-sm"
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${labelSize.width}mm)`,
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
              >
                {labelItems.map((item, i) => (
                  <div
                    key={`${item.product.id}-${i}`}
                    className={`label-card flex flex-col items-center justify-between p-1 bg-white text-black text-center box-border overflow-hidden select-none ${
                      opts.showBorder ? 'border border-dashed border-zinc-400' : 'border border-transparent'
                    }`}
                    style={{
                      width: `${labelSize.width}mm`,
                      height: `${labelSize.height}mm`,
                    }}
                  >
                    {/* Shop Name */}
                    {opts.showCompany && (
                      <span className="text-[7.5px] font-bold text-black text-center truncate w-full leading-tight">
                        {shopName}
                      </span>
                    )}

                    {/* Product Name */}
                    {opts.showProduct && (
                      <span className="text-[8.5px] font-bold text-black text-center truncate w-full leading-tight">
                        {item.product.name}
                      </span>
                    )}

                    {/* SKU */}
                    {opts.showSku && item.product.sku && (
                      <span className="text-[7px] text-zinc-700 font-mono truncate w-full">
                        SKU: {item.product.sku}
                      </span>
                    )}

                    {/* Barcode / QR Visual Render */}
                    <div className="my-auto flex items-center justify-center w-full max-w-full overflow-hidden">
                      <BarcodeSvg
                        value={item.barcode}
                        format={opts.barcodeFormat}
                        height={Math.max(16, labelSize.height - (opts.showPrice ? 16 : 10))}
                      />
                    </div>

                    {/* Human-readable code */}
                    {opts.showBarcode && opts.barcodeFormat !== 'qr' && (
                      <span className="text-[7.5px] font-mono font-bold text-black tracking-wider leading-none">
                        {item.barcode}
                      </span>
                    )}

                    {/* Price Tag */}
                    {opts.showPrice && (
                      <span className={`font-bold text-black leading-tight ${
                        opts.enlargePrice ? 'text-[13px] font-cairo' : 'text-[9.5px]'
                      }`}>
                        {Number(item.product.retailPrice || 0).toFixed(0)} {baseCurrency}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
