// LivePreview — POS-PRINT-001 / FR-004
// معاينة مباشرة تفاعلية للقالب أثناء التحرير. Debounce 300ms.
import { useEffect, useRef, useState } from 'react';
import type { PrintTemplate, DocumentContext, ShopLegalInfo } from '@/types/invoicePrint';
import { renderDocumentHTML, buildPrintPage } from '@/services/print/renderTemplate';
import { useTemplateEditorStore } from '@/store/templateEditorStore';

interface Props {
  templateName: string;
  templateId: string;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * بيانات وهمية للمعاينة — مماثلة للقيم المستعملة في TemplateEditor.tsx القديم.
 */
function buildMockContext(template: PrintTemplate): DocumentContext {
  const mockInvoice = {
    number: 'INV-2026-0001',
    date: new Date().toISOString().split('T')[0],
    subtotal: 5000,
    discount: 250,
    tvaAmount: 902.5,
    total: 5652.5,
    paymentMethod: 'نقداً',
    customerName: 'أحمد محمد',
    customerPhone: '0555 12 34 56',
    customerAddress: 'الجزائر العاصمة',
    items: [
      { name: 'حليب كامل الدسم', qty: 10, unitPrice: 100, lineTotal: 1000, discount: 0, batchNumber: '' },
      { name: 'خبز فرنسي', qty: 20, unitPrice: 30, lineTotal: 600, discount: 0, batchNumber: '' },
      { name: 'زيت زيتون 1ل', qty: 5, unitPrice: 400, lineTotal: 2000, discount: 100, batchNumber: '' },
      { name: 'سكر 1كغ', qty: 15, unitPrice: 90, lineTotal: 1350, discount: 150, batchNumber: '' },
    ],
  };

  const mockShopLegal: ShopLegalInfo = {
    name: 'سوبرماركت الأمل',
    phone: '023 45 67 89',
    email: 'info@example.com',
    address: 'حي البدر، الجزائر العاصمة',
    footer: 'شكراً لزيارتكم · البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة',
    commercialRegister: '16/B/123456',
    nif: '1234567890123',
    ai: '1234567890',
    logo: '',
  };

  return {
    invoice: mockInvoice as unknown as Record<string, unknown>,
    settings: { shopName: 'سوبرماركت الأمل' },
    template,
    shopLegal: mockShopLegal,
    user: { id: 'preview', name: 'الكاشير', role: 'cashier' },
    lang: 'ar',
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

  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const ctx = buildMockContext(template);
        const body = renderDocumentHTML(ctx);
        const page = buildPrintPage(template, body, `معاينة: ${templateName}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, styles, visibility, paperSize, orientation, templateName]);

  const openInWindow = () => {
    if (!html) return;
    const win = window.open('', '_blank', 'width=500,height=700');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-label-lg text-on-surface">معاينة مباشرة</h3>
        <button
          onClick={openInWindow}
          disabled={!html}
          className="text-xs px-3 py-1.5 bg-primary text-on-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          فتح في نافذة
        </button>
      </div>
      <div className="flex-1 bg-surface-container rounded-lg overflow-hidden border border-outline-variant/30 min-h-[400px] relative">
        {isLoading && (
          <div className="absolute top-2 right-2 z-10 bg-surface-container-high/80 rounded px-2 py-1 text-xs text-on-surface-variant">
            تحديث...
          </div>
        )}
        {html ? (
          <iframe
            srcDoc={html}
            title="معاينة مباشرة"
            className="w-full h-full min-h-[400px] border-0 bg-white"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-on-surface-variant text-sm">جاري التحضير...</div>
          </div>
        )}
      </div>
    </div>
  );
}
