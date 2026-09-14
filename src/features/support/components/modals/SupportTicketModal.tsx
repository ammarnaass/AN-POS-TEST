import React from 'react';
import { Send, X, CheckCircle2 } from 'lucide-react';
import type { SupportTicketForm } from '../../types';

export interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketSent: boolean;
  ticketForm: SupportTicketForm;
  onFieldChange: <K extends keyof SupportTicketForm>(
    field: K,
    value: SupportTicketForm[K]
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  isOpen,
  onClose,
  ticketSent,
  ticketForm,
  onFieldChange,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-card rounded-3xl p-6 md:p-8 max-w-lg w-full border border-outline-variant/30 space-y-6 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface font-cairo">فتح تذكرة دعم داخلي</h3>
              <p className="text-xs text-on-surface-variant">يتم إرسال التقرير لمكتب المطور الفني</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {ticketSent ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-on-surface font-cairo">تم إرسال تذكرتك بنجاح!</h4>
            <p className="text-xs text-on-surface-variant">
              سيتواصل معك فريق الدعم التقني في أقرب وقت عبر الهاتف المسجل.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-on-surface font-cairo">تصنيف المشكلة</label>
              <select
                value={ticketForm.category}
                onChange={(e) => onFieldChange('category', e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:border-primary outline-none"
              >
                <option value="استفسار عام">استفسار عام</option>
                <option value="نقطة البيع وتصميم 5">نقطة البيع وتصميم 5 والعبوات</option>
                <option value="طباعة حرارية وفواتير">طباعة حرارية وفواتير جملة</option>
                <option value="مزامنة الهواتف">مزامنة الهواتف وشبكة Fastify</option>
                <option value="مخزون وباركود">مخزون وباركودات متعددة</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-on-surface font-cairo">عنوان البلاغ</label>
              <input
                type="text"
                required
                placeholder="مثال: مشكلة في طباعة فاتورة الجملة بسعر س3..."
                value={ticketForm.subject}
                onChange={(e) => onFieldChange('subject', e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:border-primary outline-none"
              />
            </div>

            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-on-surface font-cairo">رقم الهاتف للتواصل</label>
              <input
                type="text"
                required
                value={ticketForm.phone}
                onChange={(e) => onFieldChange('phone', e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:border-primary outline-none font-mono dir-ltr text-right"
              />
            </div>

            <div className="space-y-1 text-right">
              <label className="text-xs font-bold text-on-surface font-cairo">تفاصيل المشكلة أو الاستفسار</label>
              <textarea
                required
                rows={4}
                placeholder="اكتب شرحاً مفصلاً للمشكلة أو الرسالة التي ظهرت لك..."
                value={ticketForm.message}
                onChange={(e) => onFieldChange('message', e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-xs text-on-surface focus:border-primary outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال التذكرة الآن</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
