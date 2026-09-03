import React, { useState } from 'react';
import { UserPlus, X } from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';
import { v4 as createId } from 'uuid';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (id: string) => void;
}

export const QuickCustomerModal: React.FC<QuickCustomerModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    const newId = createId();
    const newCustomer = {
      id: newId,
      name: name.trim(),
      phone: phone.trim(),
      creditLimit: 50000,
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await db.customers.add(newCustomer as any);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSelectCustomer(newId);
      setName('');
      setPhone('');
      onClose();
      addNotification({
        title: 'تمت إضافة الزبون بنجاح',
        message: `${newCustomer.name} أصبح متاحاً الآن في الفاتورة`,
        type: 'success',
      });
    } catch {
      addNotification({
        title: 'خطأ في حفظ الزبون',
        message: 'تعذر حفظ بيانات الزبون الجديد',
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
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">إضافة زبون سريع</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">اسم الزبون *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: أحمد بن علي"
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05 / 06 / 07..."
              className="w-full h-10 px-3 bg-surface-container border border-outline-variant/20 rounded-xl text-xs text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'جاري الحفظ...' : 'إضافة واختيار'}
          </button>
        </div>
      </div>
    </div>
  );
};
