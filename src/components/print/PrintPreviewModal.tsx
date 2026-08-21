// PrintPreviewModal — POS-PRINT-001
// نافذة معاينة الفاتورة قبل الطباعة مع دعم اللغات المتعددة والـ QR الفوري
import { useEffect, useState } from 'react';
import { X, Printer, FileText, RefreshCw, Copy, Globe, Check } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { previewDocument, printDocument } from '@/services/print/printService';
import type { DocTypeKey, PrintLanguage } from '@/types/invoicePrint';

interface PrintPreviewModalProps {
  saleId: string;
  docType?: DocTypeKey;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  templateId?: string;
  title?: string;
}

const LANGUAGE_OPTIONS: { key: PrintLanguage; label: string; flag: string }[] = [
  { key: 'ar', label: 'العربية', flag: '🇩🇿' },
  { key: 'ar-fr', label: 'عربي / Français', flag: '🌐' },
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'en', label: 'English', flag: '🇬🇧' },
];

export default function PrintPreviewModal({
  saleId,
  docType = 'sale-invoice',
  isOpen,
  onClose,
  userId,
  userName,
  templateId,
  title = 'معاينة وطباعة الفاتورة',
}: PrintPreviewModalProps) {
  const [copies, setCopies] = useState(1);
  const [selectedLang, setSelectedLang] = useState<PrintLanguage>('ar');
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // جلب المعاينة
  const previewMutation = useMutation({
    mutationFn: async (lang: PrintLanguage) => {
      const result = await previewDocument(saleId, docType, {
        userId,
        userName,
        templateId,
        lang,
      } as any);
      return result;
    },
    onSuccess: (result) => {
      if (result.success && result.html) {
        setPreviewHtml(result.html);
        setError(null);
      } else {
        setError(result.error ?? 'فشل تحميل المعاينة');
      }
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  // طباعة
  const printMutation = useMutation({
    mutationFn: async () => {
      return printDocument(saleId, docType, {
        userId,
        userName,
        templateId,
        copies,
        lang: selectedLang,
      } as any);
    },
    onSuccess: (result) => {
      if (result.success) {
        onClose();
      } else {
        setError(result.error ?? 'فشلت الطباعة');
      }
    },
  });

  useEffect(() => {
    if (isOpen) {
      previewMutation.mutate(selectedLang);
    }
  }, [isOpen, saleId, selectedLang]);

  const handleLanguageChange = (lang: PrintLanguage) => {
    setSelectedLang(lang);
    setPreviewHtml(null);
    previewMutation.mutate(lang);
  };

  const handleRefresh = () => {
    setPreviewHtml(null);
    previewMutation.mutate(selectedLang);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-outline-variant/20 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface-container-low border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-cairo text-lg font-black text-on-surface">{title}</h2>
              <p className="text-xs text-on-surface-variant">معاينة فورية للفاتورة قبل الطباعة مع دعم اللغات</p>
            </div>
          </div>

          {/* محدد اللغة في رأس المودال */}
          <div className="flex items-center gap-2 bg-surface p-1 rounded-2xl border border-outline-variant/20">
            <Globe className="w-4 h-4 text-on-surface-variant mr-2" />
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleLanguageChange(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedLang === opt.key
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span>{opt.flag}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-surface-container-high transition-colors flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6 flex flex-col bg-surface-container-low/50">
          <div className="flex-1 bg-surface rounded-2xl overflow-auto border border-outline-variant/30 shadow-inner flex flex-col items-center justify-center p-4">
            {previewMutation.isPending ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-on-surface-variant font-cairo">جاري تجهيز الفاتورة والباركود...</p>
              </div>
            ) : error && !previewHtml ? (
              <div className="text-center py-8">
                <p className="text-error font-bold mb-2">خطأ في تحميل المعاينة</p>
                <p className="text-on-surface-variant text-xs mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-sm"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                title="معاينة الفاتورة"
                className="w-full h-full min-h-[440px] border-0 rounded-xl bg-white shadow-sm"
                sandbox="allow-same-origin"
              />
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 bg-surface">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={previewMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${previewMutation.isPending ? 'animate-spin' : ''}`} />
              <span>تحديث المعاينة</span>
            </button>

            {/* عدد النسخ */}
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1 rounded-xl border border-outline-variant/20">
              <span className="text-xs font-bold text-on-surface-variant">النسخ:</span>
              <button
                type="button"
                onClick={() => setCopies(Math.max(1, copies - 1))}
                className="w-7 h-7 rounded-lg bg-surface hover:bg-surface-container-high flex items-center justify-center text-on-surface font-bold text-sm"
              >
                -
              </button>
              <span className="w-6 text-center font-bold text-xs">{copies}</span>
              <button
                type="button"
                onClick={() => setCopies(Math.min(10, copies + 1))}
                className="w-7 h-7 rounded-lg bg-surface hover:bg-surface-container-high flex items-center justify-center text-on-surface font-bold text-sm"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-outline-variant/30 rounded-xl text-on-surface font-bold text-xs hover:bg-surface-container-high transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <button
              onClick={() => printMutation.mutate()}
              disabled={printMutation.isPending || !previewHtml}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-md shadow-primary/25 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{printMutation.isPending ? 'جاري الطباعة...' : `طباعة (${copies})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}