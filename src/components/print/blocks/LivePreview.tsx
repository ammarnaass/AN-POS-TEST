// LivePreview — POS-PRINT-001 / FR-004
// معاينة مباشرة تفاعلية للقالب أثناء التحرير مع دعم اللغات، الشعار الفعلي، والاتجاه اللغوي. Debounce 300ms.
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Globe, ZoomIn, ZoomOut, Check, FileCheck } from 'lucide-react';
import type { PrintTemplate, DocumentContext, ShopLegalInfo, PrintLanguage, DocTypeKey } from '@/types/invoicePrint';
import { DOC_TYPE_LABELS_AR } from '@/types/invoicePrint';
import { renderDocumentHTML, buildPrintPage } from '@/services/print/renderTemplate';
import { buildMockDocumentContext } from '@/services/print/mockPreviewContext';
import { useTemplateEditorStore } from '@/store/templateEditorStore';
import { db } from '@/infrastructure/database/dexie/db';

interface Props {
  templateName: string;
  templateId: string;
}

function now(): string {
  return new Date().toISOString();
}

export default function LivePreview({ templateName, templateId }: Props) {
  const layout = useTemplateEditorStore((s) => s.layout);
  const styles = useTemplateEditorStore((s) => s.styles);
  const visibility = useTemplateEditorStore((s) => s.visibility);
  const paperSize = useTemplateEditorStore((s) => s.paperSize);
  const orientation = useTemplateEditorStore((s) => s.orientation);
  const description = useTemplateEditorStore((s) => s.description);
  const supportedDocuments = useTemplateEditorStore((s) => s.supportedDocuments);

  const [previewDocType, setPreviewDocType] = useState<DocTypeKey>(
    supportedDocuments && supportedDocuments.length > 0 ? supportedDocuments[0] : 'wholesale-invoice'
  );
  const [previewLang, setPreviewLang] = useState<PrintLanguage>('ar');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // تحديث نوع الوثيقة إذا تغيرت قائمة الوثائق المدعومة للقالب
  useEffect(() => {
    if (supportedDocuments && supportedDocuments.length > 0 && !supportedDocuments.includes(previewDocType)) {
      setPreviewDocType(supportedDocuments[0]);
    }
  }, [supportedDocuments]);

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
        const ctx = buildMockDocumentContext(template, storeSettings, previewDocType, previewLang);
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
  }, [layout, styles, visibility, paperSize, orientation, templateName, storeSettings, previewLang, previewDocType, supportedDocuments]);


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
          <span className="font-bold text-on-surface font-cairo">معاينة مباشرة</span>
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

        {/* محدد نوع الوثيقة المدعومة في المعاينة */}
        {supportedDocuments && supportedDocuments.length > 1 && (
          <div className="flex items-center gap-1 bg-surface-container-high rounded-lg p-0.5 border border-outline-variant/20">
            {supportedDocuments.map((dt) => (
              <button
                key={dt}
                type="button"
                onClick={() => setPreviewDocType(dt)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  previewDocType === dt
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                title={`معاينة كـ ${DOC_TYPE_LABELS_AR[dt] || dt}`}
              >
                {DOC_TYPE_LABELS_AR[dt] || dt}
              </button>
            ))}
          </div>
        )}

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
