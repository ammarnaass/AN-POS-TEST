// PaperMiniature — POS-PRINT-001
import { Printer, Check } from 'lucide-react';
import { type PaperSize } from '@/types/invoicePrint';

/**
 * مجسم مصغر واقعي لطبيعة الورق (حراري 80mm/58mm مقابل فواتير A4/A5)
 * مصمم وفق معايير UI/UX Pro Max لإعطاء انطباع بصري فوري ودقيق لنوع المستند
 */
export interface PaperMiniatureProps {
  paperSize: PaperSize;
  primaryColor?: string;
  headerColor?: string;
}

export function PaperMiniature({
  paperSize,
  primaryColor = '#0891b2',
  headerColor = '#0e7490',
}: PaperMiniatureProps) {
  const isThermal = paperSize === '80mm' || paperSize === '58mm' || paperSize === '76mm';
  const isCompact = paperSize === '58mm';

  if (isThermal) {
    return (
      <div
        className={`relative ${isCompact ? 'w-20' : 'w-24'} h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-lg shadow-sm flex flex-col justify-between overflow-hidden select-none shrink-0`}
      >
        {/* شق تلقيم الورق العلوي */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-700/60" />

        {/* رأس التذكرة مع أيقونة الطابعة */}
        <div className="p-1.5 space-y-1 text-center">
          <div
            className="w-5 h-5 mx-auto rounded-full flex items-center justify-center shadow-xs"
            style={{ backgroundColor: primaryColor }}
          >
            <Printer className="w-2.5 h-2.5 text-white" />
          </div>
          <div className="h-1 w-10 mx-auto rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="h-1 w-6 mx-auto rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-0.5" />
        </div>

        {/* خطوط جدول التذكرة المحاكية */}
        <div className="px-2 space-y-1 flex-1">
          <div className="flex justify-between items-center">
            <div className="h-1 w-5 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-1 w-3 rounded bg-slate-300 dark:bg-slate-700" />
          </div>
          <div className="flex justify-between items-center">
            <div className="h-1 w-7 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-1 w-3 rounded bg-slate-300 dark:bg-slate-700" />
          </div>
          <div className="border-b border-dashed border-slate-300 dark:border-slate-700 my-0.5" />
          <div className="flex justify-between items-center pt-0.5">
            <div className="h-1 w-5 rounded bg-slate-400 dark:bg-slate-600 font-bold" />
            <div
              className="px-1 py-0.5 rounded text-[7px] font-black text-white leading-none"
              style={{ backgroundColor: primaryColor }}
            >
              {isCompact ? '58mm' : '80mm'}
            </div>
          </div>
        </div>

        {/* الحافة المسننة السفلية المتعرجة للورق الحراري المقطوع */}
        <div className="w-full h-2 overflow-hidden flex bg-surface-container-low">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-white dark:bg-slate-900 transform rotate-45 -mt-1.5 -mr-1 border-r border-b border-slate-200 dark:border-slate-800 shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  // فواتير A4 / A5 القياسية
  return (
    <div
      className={`relative ${paperSize === 'A5' ? 'w-22' : 'w-24'} h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-sm flex flex-col justify-between overflow-hidden select-none shrink-0`}
    >
      {/* شريط الترويسة الرسمي للفاتورة */}
      <div
        className="h-2.5 w-full flex items-center justify-between px-1 text-white text-[7px] font-bold"
        style={{ backgroundColor: headerColor }}
      >
        <span>FACTURE</span>
        <div className="w-1 h-1 rounded-full bg-white/80" />
      </div>

      {/* هيكل الفاتورة والأعمدة */}
      <div className="p-1.5 space-y-1 flex-1">
        <div className="flex items-center gap-1">
          <div
            className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0"
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
          </div>
          <div className="space-y-0.5 flex-1">
            <div className="h-1 w-8 rounded bg-slate-300 dark:bg-slate-700" />
            <div className="h-0.5 w-5 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        {/* مجسم جدول المنتجات */}
        <div className="rounded border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" />
          <div className="h-1.5 border-b border-slate-100 dark:border-slate-800" />
          <div className="h-1.5" />
        </div>

        {/* ختم مائي وشارة الإجمالي */}
        <div className="flex justify-between items-end pt-0.5">
          <div className="w-3.5 h-3.5 rounded-full border border-dashed border-emerald-500/60 flex items-center justify-center">
            <Check className="w-2 h-2 text-emerald-500" />
          </div>
          <div
            className="px-1 py-0.5 rounded text-[7px] font-bold text-white leading-none"
            style={{ backgroundColor: primaryColor }}
          >
            {paperSize}
          </div>
        </div>
      </div>

      {/* حافة الورقة السفلية */}
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800" />
    </div>
  );
}
