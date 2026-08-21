// ReprintModal — POS-PRINT-001
// نافذة إعادة طباعة فاتورة سابقة
import { useState } from 'react';
import { X, Printer, History, RefreshCw, FileText } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { reprintDocument, getPrintHistory } from '@/services/print/printService';
import { getAllTemplates } from '@/services/print/templateService';
import type { PrintHistoryRecord } from '@/types/invoicePrint';

interface ReprintModalProps {
  saleId: string;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export default function ReprintModal({ saleId, isOpen, onClose, userId, userName }: ReprintModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [copies, setCopies] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // سجل الطباعة
  const { data: printHistory = [] } = useQuery({
    queryKey: ['printHistory', saleId],
    queryFn: () => getPrintHistory(saleId),
    enabled: isOpen,
  });

  // القوالب المتاحة
  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates'],
    queryFn: getAllTemplates,
    enabled: isOpen,
  });

  // معلومات الفاتورة
  const { data: sale } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => db.sales.get(saleId),
    enabled: isOpen,
  });

  // إعادة الطباعة
  const reprintMutation = useMutation({
    mutationFn: async () => {
      return reprintDocument(saleId, {
        userId,
        userName,
        templateId: selectedTemplateId || undefined,
        copies,
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        setError(null);
        onClose();
      } else {
        setError(result.error ?? 'فشلت إعادة الطباعة');
      }
    },
    onError: (err) => {
      setError(String(err));
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant/20">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">إعادة طباعة الفاتورة</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {sale ? `فاتورة #${sale.number}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-surface-container transition-all flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* إعدادات الطباعة */}
          <div className="space-y-4">
            <div>
              <label className="block font-label-lg text-on-surface mb-2">القالب</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">القالب الافتراضي</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-label-lg text-on-surface mb-2">عدد النسخ</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all flex items-center justify-center"
                >-</button>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                  className="w-20 text-center px-4 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest focus:border-primary"
                />
                <button
                  onClick={() => setCopies(Math.min(10, copies + 1))}
                  className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high transition-all flex items-center justify-center"
                >+</button>
              </div>
            </div>
          </div>

          {/* سجل الطباعة */}
          {printHistory.length > 0 && (
            <div className="bg-surface-container/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-on-surface-variant" />
                <h4 className="font-label-lg text-on-surface">سجل الطباعة السابق</h4>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {printHistory.slice(0, 5).map((record) => (
                  <div key={record.id} className="flex items-center justify-between text-body-sm">
                    <span className="text-on-surface-variant">
                      {new Date(record.printedAt).toLocaleDateString('ar-DZ', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-on-surface-variant">{record.copies} نسخة</span>
                      {record.isReprint && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">إعادة</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* رسالة الخطأ */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-xl">
              <p className="text-error text-body-sm">{error}</p>
            </div>
          )}

          {/* ملاحظة */}
          <div className="p-4 bg-surface-container/30 rounded-xl border border-outline-variant/20">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-on-surface font-medium">ملاحظة</p>
                <p className="text-on-surface-variant text-body-sm">
                  إعادة الطباعة لا تنشئ فاتورة جديدة — يتم فقط طباعة نسخة إضافية من الفاتورة الأصلية.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20 bg-surface-container-lowest">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-outline-variant/30 rounded-xl text-on-surface hover:bg-surface-container transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={() => reprintMutation.mutate()}
            disabled={reprintMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {reprintMutation.isPending ? 'جاري الطباعة...' : `طباعة ${copies > 1 ? `(${copies} نسخ)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}