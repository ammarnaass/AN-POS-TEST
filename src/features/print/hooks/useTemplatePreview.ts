// useTemplatePreview — POS-PRINT-001
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  type PrintTemplate,
  type DocTypeKey,
  type PrintLanguage,
} from '@/types/invoicePrint';
import { renderDocumentHTML, buildPrintPage } from '@/services/print/renderTemplate';
import { buildMockDocumentContext } from '@/services/print/mockPreviewContext';
import { type SettingsEntity } from '@/infrastructure/database/dexie/db';

export function useTemplatePreview(storeSettings?: SettingsEntity | null) {
  const [previewTemplate, setPreviewTemplate] = useState<PrintTemplate | null>(null);
  const [previewDocType, setPreviewDocType] = useState<DocTypeKey>('wholesale-invoice');
  const [previewLang, setPreviewLang] = useState<PrintLanguage>('ar');
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [previewFitMode, setPreviewFitMode] = useState<'fit-page' | 'fit-width' | 'custom'>('fit-page');
  const [previewFullscreen, setPreviewFullscreen] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [calculatedFitZoom, setCalculatedFitZoom] = useState<number>(65);

  const openPreview = (tpl: PrintTemplate, preferredDocType?: DocTypeKey) => {
    const initialDocType =
      preferredDocType ||
      (tpl.supportedDocuments && tpl.supportedDocuments.length > 0
        ? tpl.supportedDocuments[0]
        : 'wholesale-invoice');
    setPreviewDocType(initialDocType);
    setPreviewTemplate(tpl);
    setPreviewLang('ar');
    setPreviewFitMode('fit-page');
    setPreviewFullscreen(false);
  };

  const closePreview = () => {
    setPreviewTemplate(null);
  };

  // بناء محتوى المعاينة السريعة للقالب مع دعم اللغات وشعار المتجر الفعلي وسياق الوثيقة الكامل
  const previewHtml = useMemo(() => {
    if (!previewTemplate) return '';
    try {
      const mockContext = buildMockDocumentContext(
        previewTemplate,
        storeSettings,
        previewDocType,
        previewLang,
      );
      const bodyHtml = renderDocumentHTML(mockContext);
      return buildPrintPage(previewTemplate, bodyHtml, `معاينة: ${previewTemplate.name}`, previewLang);
    } catch (err) {
      return `<!doctype html><html dir="rtl"><body style="font-family:sans-serif;padding:2rem;text-align:center;color:#ef4444;"><p>تعذر تجهيز المعاينة: ${String(err)}</p></body></html>`;
    }
  }, [previewTemplate, previewLang, storeSettings, previewDocType]);

  // حساب الملاءمة التلقائية لورقة المعاينة بناءً على أبعاد الحاوية الفعلية لمختلف الشاشات (Responsive Fit)
  useEffect(() => {
    if (!previewContainerRef.current || !previewTemplate) return;
    const updateFit = () => {
      const el = previewContainerRef.current;
      if (!el) return;
      const { clientWidth, clientHeight } = el;
      const isLandscape = previewTemplate.orientation === 'landscape';
      let sheetW = 820;
      let sheetH = 1160;
      if (previewTemplate.paperSize === 'A4') {
        sheetW = isLandscape ? 1160 : 820;
        sheetH = isLandscape ? 820 : 1160;
      } else if (previewTemplate.paperSize === 'A5') {
        sheetW = isLandscape ? 820 : 580;
        sheetH = isLandscape ? 580 : 820;
      } else if (previewTemplate.paperSize === '80mm') {
        sheetW = 380;
        sheetH = 700;
      } else {
        sheetW = 320;
        sheetH = 620;
      }

      // أبعاد الحواشي التكيفية بحسب عرض وارتفاع الشاشة
      const padX = clientWidth < 640 ? 16 : clientWidth < 1024 ? 28 : 48;
      const padY = clientHeight < 500 ? 12 : clientHeight < 800 ? 24 : 48;
      const scaleW = Math.max(0.2, (clientWidth - padX) / sheetW);
      const scaleH = Math.max(0.2, (clientHeight - padY) / sheetH);

      const bestFitPage = Math.max(25, Math.min(130, Math.round(Math.min(scaleW, scaleH) * 100)));
      setCalculatedFitZoom(bestFitPage);
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, [previewTemplate, previewFullscreen]);

  // دعم اختصارات لوحة المفاتيح لتسهيل المعاينة السريعة على شاشات نقاط البيع والحواسيب
  useEffect(() => {
    if (!previewTemplate) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        closePreview();
      } else if (e.key === 'f' || e.key === 'F') {
        setPreviewFullscreen((prev) => !prev);
      } else if (e.key === '+' || e.key === '=') {
        setPreviewFitMode('custom');
        setPreviewZoom((z) => Math.min(160, z + 10));
      } else if (e.key === '-' || e.key === '_') {
        setPreviewFitMode('custom');
        setPreviewZoom((z) => Math.max(25, z - 10));
      } else if (e.key === '0') {
        setPreviewFitMode('fit-page');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewTemplate]);

  const effectiveZoom = useMemo(() => {
    if (previewFitMode === 'fit-page') {
      return calculatedFitZoom;
    }
    if (previewFitMode === 'fit-width') {
      if (!previewContainerRef.current || !previewTemplate) return 100;
      const isLandscape = previewTemplate.orientation === 'landscape';
      const sheetW =
        previewTemplate.paperSize === 'A4'
          ? isLandscape
            ? 1160
            : 820
          : previewTemplate.paperSize === 'A5'
          ? isLandscape
            ? 820
            : 580
          : 380;
      const padX = previewContainerRef.current.clientWidth < 640 ? 20 : 48;
      const scaleW = (previewContainerRef.current.clientWidth - padX) / sheetW;
      return Math.max(30, Math.min(150, Math.round(scaleW * 100)));
    }
    return previewZoom;
  }, [previewFitMode, calculatedFitZoom, previewZoom, previewTemplate]);

  const isLandscape = previewTemplate?.orientation === 'landscape';
  const sheetDimensions = useMemo(() => {
    if (!previewTemplate) return { w: 820, h: 1160 };
    if (previewTemplate.paperSize === 'A4') {
      return { w: isLandscape ? 1160 : 820, h: isLandscape ? 820 : 1160 };
    }
    if (previewTemplate.paperSize === 'A5') {
      return { w: isLandscape ? 820 : 580, h: isLandscape ? 580 : 820 };
    }
    if (previewTemplate.paperSize === '80mm') {
      return { w: 380, h: 720 };
    }
    return { w: 320, h: 650 };
  }, [previewTemplate, isLandscape]);

  const handlePrint = () => {
    const iframe = document.getElementById('template-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    } else {
      window.print();
    }
  };

  const handleOpenStandalone = () => {
    if (!previewHtml) return;
    const win = window.open('', '_blank', 'width=840,height=980');
    if (win) {
      win.document.write(previewHtml);
      win.document.close();
    }
  };

  return {
    previewTemplate,
    setPreviewTemplate,
    openPreview,
    closePreview,
    previewDocType,
    setPreviewDocType,
    previewLang,
    setPreviewLang,
    previewZoom,
    setPreviewZoom,
    previewFitMode,
    setPreviewFitMode,
    previewFullscreen,
    setPreviewFullscreen,
    previewContainerRef,
    effectiveZoom,
    sheetDimensions,
    isLandscape,
    previewHtml,
    handlePrint,
    handleOpenStandalone,
  };
}
