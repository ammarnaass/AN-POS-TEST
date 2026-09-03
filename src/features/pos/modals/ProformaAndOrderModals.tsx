import React from 'react';
import { FileText, FileCheck } from 'lucide-react';

interface ProformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SaveAsProformaModal: React.FC<ProformaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 flex items-center justify-center mx-auto border border-blue-500/30">
          <FileText className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-on-surface">حفظ كفاتورة مبدئية / عرض أسعار</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            سيتم حفظ الفاتورة بدون خصم من المخزون أو تسجيل مدفوعات مالية
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            تأكيد الحفظ
          </button>
        </div>
      </div>
    </div>
  );
};

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SaveAsOrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/30">
          <FileCheck className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-on-surface">حفظ كطلبية زبون معلقة</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            سيتم تسجيل الطلبية لتجهيزها وتسليمها لاحقاً
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/15">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            تأكيد الطلبية
          </button>
        </div>
      </div>
    </div>
  );
};
