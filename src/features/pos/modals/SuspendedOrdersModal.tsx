import React from 'react';
import { Clock, X } from 'lucide-react';

interface SuspendedOrder {
  id: string;
  items: any[];
  createdAt: string;
}

interface SuspendedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SuspendedOrder[];
  onResumeOrder: (id: string) => void;
}

export const SuspendedOrdersModal: React.FC<SuspendedOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  onResumeOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">
              الفواتير والطلبات المعلقة ({orders.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant text-xs">
            لا توجد طلبات معلقة حالياً
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-on-surface">{order.items.length} أصناف في الطلب</p>
                  <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                    {new Date(order.createdAt).toLocaleTimeString('ar-DZ')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onResumeOrder(order.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-2xs hover:bg-primary/90 transition-all cursor-pointer"
                >
                  استرجاع للبيع
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
