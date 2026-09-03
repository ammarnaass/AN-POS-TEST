import React, { useState } from 'react';
import { AlertTriangle, Wallet, X } from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';
import { v4 as createId } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuthStore } from '@/store/authStore';

interface SessionWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSessionRequested: () => void;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  onClose,
  onOpenSessionRequested,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/30">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-on-surface">يجب فتح مناوبة أولاً</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            لا يمكن إتمام المبيعات أو تحصيل النقود بدون جلسة ومناوبة صندوق مفتوحة.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenSessionRequested();
            }}
            className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            فتح المناوبة الآن
          </button>
        </div>
      </div>
    </div>
  );
};

interface OpenSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSessionsCount: number;
}

export const OpenSessionModal: React.FC<OpenSessionModalProps> = ({
  isOpen,
  onClose,
  existingSessionsCount,
}) => {
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const sessionId = createId();
    const sessionNumber = existingSessionsCount + 1;
    try {
      await db.cash_sessions.add({
        id: sessionId,
        sessionNumber,
        openedBy: currentUser?.name || 'الكاشير',
        openedAt: new Date().toISOString(),
        closedAt: '',
        openingBalance,
        deposits: [],
        totalSales: 0,
        totalReturns: 0,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['cashSessions'] });
      onClose();
      setOpeningBalance(0);
      addNotification({
        title: 'تم فتح المناوبة',
        message: `مناوبة رقم #${sessionNumber} مفتوحة وجاهزة`,
        type: 'success',
      });
    } catch {
      addNotification({
        title: 'خطأ',
        message: 'تعذر فتح مناوبة الصندوق',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">فتح مناوبة جديدة</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-on-surface mb-1.5">الرصيد الافتتاحي للصندوق (دج):</label>
          <input
            type="number"
            value={openingBalance || ''}
            onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
            placeholder="0.00"
            className="w-full h-11 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-sm font-mono font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
        </div>

        <button
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'جاري الفتح...' : 'تأكيد فتح المناوبة'}
        </button>
      </div>
    </div>
  );
};
