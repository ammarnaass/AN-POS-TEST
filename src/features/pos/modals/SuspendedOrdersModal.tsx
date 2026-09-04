import React from 'react';
import { Clock, X, Trash2, RotateCcw, User, ShoppingBag, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils';

export interface SuspendedOrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  isCustom?: boolean;
  isPack?: boolean;
  packId?: string;
  batchNumber?: string;
}

export interface SuspendedOrder {
  id: string;
  items: SuspendedOrderItem[] | string;
  customerId?: string;
  customerName?: string;
  subtotal?: number;
  discount?: number;
  discountType?: 'percent' | 'amount';
  total?: number;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

interface SuspendedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: SuspendedOrder[];
  onResumeOrder: (id: string) => void;
  onDeleteOrder?: (id: string) => void;
}

function parseItems(raw: unknown): SuspendedOrderItem[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function getOrderValues(order: SuspendedOrder) {
  const items = parseItems(order.items);
  const calculatedSubtotal = items.reduce(
    (sum, it) => sum + Number(it.lineTotal || (Number(it.unitPrice || 0) * Number(it.qty || 1)) || 0),
    0
  );
  const subtotal = Number(order.subtotal) > 0 ? Number(order.subtotal) : calculatedSubtotal;
  const discount = Number(order.discount || 0);
  const discountAmount = order.discountType === 'percent'
    ? (subtotal * discount) / 100
    : discount;
  const total = Number(order.total) > 0 ? Number(order.total) : Math.max(0, subtotal - discountAmount);

  return { items, subtotal, total, discountAmount };
}

export const SuspendedOrdersModal: React.FC<SuspendedOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  onResumeOrder,
  onDeleteOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">
                الفواتير والطلبات المعلقة ({orders.length})
              </h3>
              <p className="text-[11px] text-on-surface-variant">استرجاع أو حذف المسودات المحفوظة مع الحفاظ على قيمتها</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto text-outline-variant/60" />
            <p className="text-xs font-medium">لا توجد طلبات أو مسودات معلقة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {orders.map((order) => {
              const { items, total, discountAmount } = getOrderValues(order);

              return (
                <div
                  key={order.id}
                  className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 hover:border-outline-variant/30 flex items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-primary font-mono">
                        {formatCurrency(total)}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-medium">
                        {items.length} {items.length === 1 ? 'صنف' : 'أصناف'}
                      </span>
                      {order.customerName && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1 truncate max-w-[140px]">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{order.customerName}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-on-surface-variant">
                      <span className="font-mono">
                        {new Date(order.createdAt).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {discountAmount > 0 && (
                        <span className="text-amber-500 font-medium">
                          خصم: {formatCurrency(discountAmount)}
                        </span>
                      )}
                      {order.note && (
                        <span className="truncate max-w-[150px] italic">
                          "{order.note}"
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onDeleteOrder && (
                      <button
                        onClick={() => onDeleteOrder(order.id)}
                        className="p-2 rounded-xl text-error/80 hover:text-error hover:bg-error/10 border border-transparent hover:border-error/20 transition-all cursor-pointer"
                        title="حذف المسودة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onResumeOrder(order.id);
                        onClose();
                      }}
                      className="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-2xs hover:bg-primary/90 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استرجاع</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
