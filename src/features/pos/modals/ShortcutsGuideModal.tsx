import React from 'react';
import { HelpCircle } from 'lucide-react';

interface ShortcutsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsGuideModal: React.FC<ShortcutsGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-on-surface">اختصارات لوحة المفاتيح</h3>
              <p className="text-xs text-on-surface-variant">تحكم كامل وسريع بدون استخدام الفأرة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>إغلاق</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant/30 text-[10px] font-mono">Esc</kbd>
          </button>
        </div>

        {/* Modal Body with 3 Distinct Sections */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Group 1: Sales Screen */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h4 className="text-xs font-black uppercase tracking-wider text-primary">شاشة المبيعات</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { key: 'F1', label: 'تسوية الفاتورة / الدفع', desc: 'فتح نافذة الدفع السريع' },
                { key: 'F2', label: 'حفظ السلة كمسودة / تعليق', desc: 'تعليق الفاتورة والاحتفاظ بها' },
                { key: 'F3', label: 'فتح المسودات للإسترجاع', desc: 'عرض الطلبات المعلقة واستعادتها' },
                { key: 'F4', label: 'إلغاء الفاتورة الحالية', desc: 'إفراغ جميع محتويات السلة' },
                { key: 'F5', label: 'الطباعة التلقائية (تفعيل/إيقاف)', desc: 'تبديل وضع الطباعة الفورية' },
                { key: 'F6', label: 'عرض المنتجات المميزة', desc: 'تصفية الأصناف المميزة بنجمة' },
                { key: 'F7', label: 'البحث عن منتج بالاسم / الكود', desc: 'التركيز الفوري على حقل البحث' },
                { key: 'F8', label: 'منتج حر / صنف مخصص', desc: 'إضافة منتج أو خدمة بدون كود' },
                { key: 'F9', label: 'سجل المبيعات / المرتجع', desc: 'استعراض الفواتير واسترجاع الأصناف' },
              ].map((s) => (
                <div
                  key={s.key}
                  className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:border-primary/30 transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-on-surface">{s.label}</p>
                    <p className="text-[10px] text-on-surface-variant">{s.desc}</p>
                  </div>
                  <kbd className="px-3 py-1.5 rounded-xl bg-surface border-2 border-outline-variant/30 text-primary font-mono font-extrabold text-xs shadow-xs min-w-10 text-center">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Group 2: Quick Operations */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">عمليات سريعة</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { key: '+ / -', label: 'زيادة / إنقاص كمية السطر المحدد', desc: 'تعديل مباشر على الكمية' },
                { key: 'Ctrl + D', label: 'حذف الصنف المحدد', desc: 'إزالة الصنف المختار من السلة' },
                { key: 'F10', label: 'فتح الصندوق', desc: 'إدارة الوردية النقدية' },
                { key: 'F11', label: 'ملء الشاشة', desc: 'توسيع نافذة نقطة البيع' },
                { key: 'F12', label: 'دليل الاختصارات', desc: 'عرض هذه النافذة الإرشادية' },
              ].map((s) => (
                <div
                  key={s.key}
                  className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:border-amber-500/30 transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-on-surface">{s.label}</p>
                    <p className="text-[10px] text-on-surface-variant">{s.desc}</p>
                  </div>
                  <kbd className="px-2.5 py-1.5 rounded-xl bg-surface border-2 border-outline-variant/30 text-amber-600 dark:text-amber-400 font-mono font-extrabold text-xs shadow-xs text-center">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Group 3: Navigation */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">التنقل العام</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { key: 'Enter', label: 'تأكيد العملية / الحفظ', desc: 'تنفيذ الإجراء الافتراضي' },
                { key: 'Esc', label: 'إغلاق النوافذ المفتوحة', desc: 'الرجوع لشاشة البيع الرئيسية' },
              ].map((s) => (
                <div
                  key={s.key}
                  className="p-3 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between hover:border-emerald-500/30 transition-all"
                >
                  <div>
                    <p className="text-xs font-bold text-on-surface">{s.label}</p>
                    <p className="text-[10px] text-on-surface-variant">{s.desc}</p>
                  </div>
                  <kbd className="px-3 py-1.5 rounded-xl bg-surface border-2 border-outline-variant/30 text-emerald-600 dark:text-emerald-400 font-mono font-extrabold text-xs shadow-xs min-w-10 text-center">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
