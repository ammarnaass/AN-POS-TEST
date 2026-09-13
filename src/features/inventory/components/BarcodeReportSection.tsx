import React, { useState, useEffect, useCallback } from 'react';
import { Zap, AlertTriangle, Barcode, Package } from 'lucide-react';
import type { Product } from '@/types';
import { findDuplicateBarcodes, findMissingBarcodes } from '@/services/barcode';
import BulkAssignBarcodesModal from '@/features/barcode/BulkAssignBarcodesModal';

interface BarcodeReportSectionProps {
  setShowBulkGenerate?: (v: boolean) => void;
}

export const BarcodeReportSection: React.FC<BarcodeReportSectionProps> = ({
  setShowBulkGenerate,
}) => {
  const [duplicates, setDuplicates] = useState<
    { barcode: string; productIds: string[]; count: number; sources: string[] }[]
  >([]);
  const [missing, setMissing] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalShowBulk, setInternalShowBulk] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [d, m] = await Promise.all([findDuplicateBarcodes(), findMissingBarcodes()]);
      setDuplicates(d as any);
      setMissing(m as Product[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenBulkModal = () => {
    if (setShowBulkGenerate) {
      setShowBulkGenerate(true);
    } else {
      setInternalShowBulk(true);
    }
  };

  const handleCloseBulkModal = () => {
    setInternalShowBulk(false);
    loadData();
  };

  if (loading) {
    return <div className="text-center py-12 text-on-surface-variant">جارٍ تحليل الباركودات...</div>;
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-row-reverse items-center justify-between">
        <div>
          <h2 className="font-cairo text-headline-sm font-bold text-on-surface">تقرير الباركودات</h2>
          <p className="text-body-sm text-on-surface-variant">كشف المكرّرة والناقصة</p>
        </div>
        <button
          onClick={handleOpenBulkModal}
          disabled={missing.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-tertiary text-on-tertiary rounded-lg text-label-md hover:opacity-80 transition-all disabled:opacity-40 cursor-pointer"
        >
          <Zap className="w-4 h-4" /> توليد باركودات للناقصة ({missing.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Duplicates Column */}
        <div className="glass-card rounded-xl border border-error/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-error" />
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface">باركودات مكرّرة</h3>
            <span className="bg-error/15 text-error px-2 py-0.5 rounded-full text-label-sm">{duplicates.length}</span>
          </div>
          {duplicates.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant text-center py-6">لا تكرار</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {duplicates.map((d) => (
                <div key={d.barcode} className="p-3 bg-error/5 rounded-lg border border-error/10">
                  <div className="flex flex-row-reverse items-center justify-between">
                    <span className="font-mono text-body-md text-on-surface" dir="ltr">{d.barcode}</span>
                    <span className="text-label-sm text-error">{d.count} منتج</span>
                  </div>
                  <p className="text-body-xs text-on-surface-variant mt-1 text-right">
                    المصادر: {d.sources.join(' + ')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Missing Column */}
        <div className="glass-card rounded-xl border border-warning/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Barcode className="w-5 h-5 text-warning" />
            <h3 className="font-cairo text-headline-sm font-bold text-on-surface">منتجات بدون باركود</h3>
            <span className="bg-warning/15 text-warning px-2 py-0.5 rounded-full text-label-sm">{missing.length}</span>
          </div>
          {missing.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant text-center py-6">كل المنتجات لها باركود</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
              {missing.slice(0, 50).map((p) => (
                <div key={p.id} className="flex flex-row-reverse items-center justify-between p-2 bg-warning/5 rounded-md">
                  <Package className="w-4 h-4 text-outline" />
                  <span className="text-body-sm text-on-surface flex-1 truncate text-right">{p.name}</span>
                  <span className="text-body-xs text-on-surface-variant">
                    {typeof p.category === 'object' && p.category !== null ? (p.category as any).name : (p.category || '—')}
                  </span>
                </div>
              ))}
              {missing.length > 50 && (
                <p className="text-body-xs text-on-surface-variant text-center mt-2">+{missing.length - 50} منتج آخر...</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Internal bulk modal fallback */}
      {internalShowBulk && (
        <BulkAssignBarcodesModal products={missing as any} open={true} onClose={handleCloseBulkModal} />
      )}
    </div>
  );
};

export function BulkAssignBarcodesModalWrapper({ onClose }: { onClose: () => void }) {
  const [missing, setMissing] = useState<Product[]>([]);

  useEffect(() => {
    findMissingBarcodes().then((m) => setMissing(m as Product[]));
  }, []);

  return <BulkAssignBarcodesModal products={missing as any} open={true} onClose={onClose} />;
}

export default BarcodeReportSection;
