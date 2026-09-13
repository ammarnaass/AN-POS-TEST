import React from 'react';
import { Barcode, History, Eye, EyeOff, Printer } from 'lucide-react';

interface BarcodeLabelsHeaderProps {
  printHistoryCount: number;
  previewVisible: boolean;
  labelItemsCount: number;
  isPrinting: boolean;
  onToggleHistory: () => void;
  onTogglePreview: () => void;
  onPrint: () => void;
}

export const BarcodeLabelsHeader: React.FC<BarcodeLabelsHeaderProps> = ({
  printHistoryCount,
  previewVisible,
  labelItemsCount,
  isPrinting,
  onToggleHistory,
  onTogglePreview,
  onPrint,
}) => {
  return (
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
          onClick={onToggleHistory}
          className="flex items-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          <History className="w-4 h-4 text-primary" />
          <span>السجل ({printHistoryCount})</span>
        </button>

        <button
          onClick={onTogglePreview}
          className="flex items-center gap-2 px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          {previewVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-primary" />}
          <span>{previewVisible ? 'إخفاء المعاينة' : 'عرض المعاينة'}</span>
        </button>

        <button
          onClick={onPrint}
          disabled={labelItemsCount === 0 || isPrinting}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl text-xs font-bold shadow-md hover:shadow-primary/30 hover:opacity-95 transition-all disabled:opacity-40 cursor-pointer active:scale-95"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة الملصقات ({labelItemsCount})</span>
        </button>
      </div>
    </div>
  );
};
