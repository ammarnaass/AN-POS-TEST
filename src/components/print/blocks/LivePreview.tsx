// LivePreview — POS-PRINT-001 / FR-004
// معاينة مباشرة تفاعلية للقالب أثناء التحرير مع دعم اللغات، الشعار الفعلي، والاتجاه اللغوي. Debounce 300ms.
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe, ZoomIn, ZoomOut, Check } from 'lucide-react';
import type { PrintTemplate, DocumentContext, ShopLegalInfo, PrintLanguage } from '@/types/invoicePrint';
import { renderDocumentHTML, buildPrintPage } from '@/services/print/renderTemplate';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { db } from '@/infrastructure/database/dexie/db';

interface Props {
  templateName: string;
  templateId: string;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * بناء سياق المعاينة اعتماداً على إعدادات المتجر الفعلية واللغة المختارة
 */
function buildMockContext(
  template: PrintTemplate,
  settings: any,
  lang: PrintLanguage = 'ar',
): DocumentContext {
  const isRtl = lang === 'ar' || lang === 'ar-fr';

  const mockInvoice = {
    number: 'INV-2026-0001',
    date: new Date().toISOString().split('T')[0],
    subtotal: 5000,
    discount: 250,
    tvaAmount: 902.5,
    total: 5652.5,
    paymentMethod: isRtl ? 'نقداً' : 'Espèces',
    customerName: isRtl ? 'أحمد محمد' : 'Ahmed Mohamed',
    customerPhone: '0555 12 34 56',
    customerAddress: isRtl ? 'الجزائر العاصمة' : 'Alger Centre',
    items: [
      { name: isRtl ? 'حليب كامل الدسم' : 'Lait Entier 1L', qty: 10, unitPrice: 100, lineTotal: 1000, discount: 0, batchNumber: '' },
      { name: isRtl ? 'خبز فرنسي (Baguette)' : 'Baguette Tradition', qty: 20, unitPrice: 30, lineTotal: 600, discount: 0, batchNumber: '' },
      { name: isRtl ? 'زيت زيتون بكر 1ل' : 'Huile d\'Olive Vierge 1L', qty: 5, unitPrice: 400, lineTotal: 2000, discount: 100, batchNumber: '' },
      { name: isRtl ? 'سكر أبيض 1كغ' : 'Sucre Blanc 1kg', qty: 15, unitPrice: 90, lineTotal: 1350, discount: 150, batchNumber: '' },
    ],
  };

  const mockShopLegal: ShopLegalInfo = {
    name: settings?.shopName || 'سوبرماركت الأمل',
    phone: settings?.phone || settings?.shopPhone2 || '023 45 67 89',
    email: settings?.email || settings?.shopEmail || 'contact@example.dz',
    address: settings?.shopAddress || settings?.address || 'شارع العربي بن مهيدي، الجزائر',
    footer: settings?.receiptFooter || 'شكراً لزيارتكم · البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة',
    commercialRegister: settings?.commercialRegister || settings?.companyRC || '16/B/0012345',
    nif: settings?.companyNif || settings?.taxNumber || settings?.taxId || '001616012345678',
    ai: settings?.companyAI || settings?.companyArt || settings?.taxArticle || '16012345678',
    logo: settings?.shopLogo || settings?.logo || '',
  };

  return {
    invoice: mockInvoice as unknown as Record<string, unknown>,
    settings: { shopName: mockShopLegal.name },
    template,
    shopLegal: mockShopLegal,
    user: { id: 'preview', name: isRtl ? 'الكاشير' : 'Caissier', role: 'cashier' },
    lang,
  };
}

export default function LivePreview({ templateName, templateId }: Props) {
  const layout = useTemplateEditorStore((s) => s.layout);
  const styles = useTemplateEditorStore((s) => s.styles);
  const visibility = useTemplateEditorStore((s) => s.visibility);
  const paperSize = useTemplateEditorStore((s) => s.paperSize);
  const orientation = useTemplateEditorStore((s) => s.orientation);
  const description = useTemplateEditorStore((s) => s.description);
  const supportedDocuments = useTemplateEditorStore((s) => s.supportedDocuments);

  const [previewLang, setPreviewLang] = useState<PrintLanguage>('ar');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // جلب إعدادات المتجر والشعار الحقيقي
  const { data: storeSettings } = useQuery({
    queryKey: ['storeSettingsDefault'],
    queryFn: async () => {
      const s = await db.settings.get('default');
      return s || null;
    },
  });

  // إعادة توليد HTML عند تغيير أي خاصية — Debounce 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      try {
        const template: PrintTemplate = {
          id: templateId,
          name: templateName,
          description,
          paperSize,
          orientation,
          widthMm: 80,
          supportedDocuments,
          visibility,
          layout,
          styles,
          isDefault: false,
          isSystem: false,
          createdBy: 'preview',
          createdAt: now(),
          updatedAt: now(),
        };
        const ctx = buildMockContext(template, storeSettings, previewLang);
        const body = renderDocumentHTML(ctx);
        const page = buildPrintPage(template, body, `معاينة: ${templateName}`, previewLang);
        setHtml(page);
      } catch (err) {
        console.error('LivePreview error:', err);
        setHtml('<!doctype html><html><body><h3 style="color:red">تعذّر توليد المعاينة</h3></body></html>');
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [layout, styles, visibility, paperSize, orientation, templateName, storeSettings, previewLang]);

  const openInWindow = () => {
    if (!html) return;
    const win = window.open('', '_blank', 'width=550,height=750');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="h-full flex flex-col gap-2">
      {/* شريط أدوات المعاينة التفاعلية المتقدمة */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-on-surface font-cairo">المعاينة الحية:</span>
          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px]">
            {paperSize}
          </span>
          {storeSettings?.shopLogo && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-bold text-[10px] flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>الشعار مفعل</span>
            </span>
          )}
        </div>

        {/* محدد لغة المعاينة والاتجاه */}
        <div className="flex items-center gap-1 bg-surface-container-high rounded-lg p-0.5 border border-outline-variant/20">
          {[
            { key: 'ar', label: 'عربي (RTL)' },
            { key: 'ar-fr', label: 'عربي/فرنسي' },
            { key: 'fr', label: 'Français (LTR)' },
            { key: 'en', label: 'English' },
          ].map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setPreviewLang(l.key as PrintLanguage)}
              className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                previewLang === l.key
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* أزرار التكبير والفتح في نافذة */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
            className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant"
            title="تصغير"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-on-surface-variant px-1 font-bold">{zoomLevel}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
            className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant"
            title="تكبير"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="h-3.5 w-px bg-outline-variant/30 mx-0.5" />
          <button
            type="button"
            onClick={openInWindow}
            disabled={!html}
            className="px-2.5 py-1 rounded bg-surface-container-highest hover:bg-primary/10 hover:text-primary text-on-surface text-[11px] font-bold transition-all flex items-center gap-1 disabled:opacity-50"
            title="فتح في نافذة مستقلة للطباعة"
          >
            <ExternalLink className="w-3 h-3" />
            <span>نافذة</span>
          </button>
        </div>
      </div>

      {/* حاوية الـ iframe بمحاكاة مظهر الورقة */}
      <div className="flex-1 bg-slate-200 dark:bg-slate-900/60 rounded-2xl overflow-hidden border border-outline-variant/30 min-h-[420px] relative p-3 flex items-center justify-center">
        {isLoading && (
          <div className="absolute top-4 right-4 z-10 bg-surface-container-highest/90 backdrop-blur-xs rounded-lg px-2.5 py-1 text-xs text-primary font-bold shadow-sm flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>تحديث المعاينة...</span>
          </div>
        )}
        {html ? (
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              srcDoc={html}
              title="معاينة مباشرة"
              className="w-full h-full min-h-[500px] border-0 rounded-xl shadow-lg bg-white"
              sandbox="allow-same-origin"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="text-on-surface-variant text-xs">جاري تجهيز المعاينة...</div>
          </div>
        )}
      </div>
    </div>
  );
}
