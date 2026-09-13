import React from 'react';
import { History, X } from 'lucide-react';
import type { BarcodePrint } from '@/services/api/barcodePrintsApi';

interface BarcodePrintHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: BarcodePrint[];
}

export const BarcodePrintHistoryModal: React.FC<BarcodePrintHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  if (!isOpen) return null;

  return (
    <div className="bg-surface-container rounded-2xl border border-primary/20 p-5 shadow-lg animate-scale-in no-print">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <h3 className="font-cairo text-base font-bold text-on-surface">
            سجل عمليات طباعة الباركود الأخيرة
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {history.length === 0 ? (
        <p className="text-xs text-on-surface-variant text-center py-6">
          لا توجد عمليات طباعة مسجلة بعد
        </p>
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
              {history.map((ph) => (
                <tr key={ph.id} className="hover:bg-surface-container-high/40 transition-colors">
                  <td className="px-3.5 py-2.5 font-medium text-on-surface">
                    {ph.productName || 'منتج مخصص'}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-primary font-bold">{ph.barcode}</td>
                  <td className="px-3.5 py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-high font-mono">
                      {ph.labelSize}
                    </span>
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
  );
};
