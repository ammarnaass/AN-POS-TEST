import React from 'react';
import { Eye, ZoomIn, ZoomOut, Barcode } from 'lucide-react';
import type { ProductLabelItem, LabelSize, PrintOptions } from '../types';
import { BarcodeLabelItemCard } from './BarcodeLabelItemCard';
import { calculatePrintColumns } from '../services/barcodePrintEngine';

interface LabelPreviewSandboxProps {
  labelItems: ProductLabelItem[];
  labelSize: LabelSize;
  opts: PrintOptions;
  shopName: string;
  baseCurrency: string;
  previewZoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export const LabelPreviewSandbox: React.FC<LabelPreviewSandboxProps> = ({
  labelItems,
  labelSize,
  opts,
  shopName,
  baseCurrency,
  previewZoom,
  onZoomIn,
  onZoomOut,
}) => {
  const cols = calculatePrintColumns(labelSize.width, 190);

  return (
    <div className="lg:col-span-4 bg-surface-container rounded-2xl border border-outline-variant/20 p-4 flex flex-col shadow-sm overflow-hidden">
      {/* Print Stylesheet for Browser / Electron */}
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
            onClick={onZoomOut}
            className="p-1 hover:text-primary transition-colors cursor-pointer"
            title="تصغير"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] font-bold px-1">{previewZoom}%</span>
          <button
            onClick={onZoomIn}
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
              <BarcodeLabelItemCard
                key={`${item.product.id}-${i}`}
                item={item}
                labelSize={labelSize}
                opts={opts}
                shopName={shopName}
                baseCurrency={baseCurrency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
