// PrintLogoHub — POS-PRINT-001
import {
  Store,
  Check,
  Upload,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  SlidersHorizontal,
  Globe,
} from 'lucide-react';
import { type SettingsEntity } from '@/infrastructure/database/dexie/db';

export interface PrintLogoHubProps {
  storeSettings?: SettingsEntity | null;
  isLogoHubOpen: boolean;
  setIsLogoHubOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  logoWidth: number;
  logoHeight: number;
  logoAlign: 'right' | 'center' | 'left' | 'auto';
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onSaveDimensions: (w: number, h: number, a: 'right' | 'center' | 'left' | 'auto') => void;
}

export function PrintLogoHub({
  storeSettings,
  isLogoHubOpen,
  setIsLogoHubOpen,
  logoWidth,
  logoHeight,
  logoAlign,
  onUpload,
  onRemove,
  onSaveDimensions,
}: PrintLogoHubProps) {
  return (
    <section className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-cairo text-on-surface">هوية وشعار المتجر للطباعة</h2>
              {storeSettings?.shopLogo ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>شعار مضبوط ومفعّل</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  لم يُحدد شعار بعد
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant">
              يظهر الشعار في ترويسة الإيصالات الحرارية (80/58mm) والفواتير الرسمية (A4/A5) بدقة مع ضبط الأبعاد والمحاذاة التلقائية حسب اللغة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95">
            <Upload className="w-4 h-4" />
            <span>{storeSettings?.shopLogo ? 'تغيير الشعار' : 'رفع شعار المتجر'}</span>
            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </label>
          {storeSettings?.shopLogo && (
            <button
              type="button"
              onClick={onRemove}
              className="p-2 rounded-xl bg-surface-container-high hover:bg-red-500/10 hover:text-red-600 text-on-surface-variant text-xs transition-all"
              title="إزالة الشعار"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsLogoHubOpen(!isLogoHubOpen)}
            className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant transition-all flex items-center gap-1 text-xs font-semibold"
            title="خيارات المقاس والمحاذاة"
          >
            <Sliders className="w-4 h-4" />
            <span className="hidden sm:inline">خيارات المقاس</span>
            {isLogoHubOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* محتوى لوحة الشعار: استعراض الشعار وأدوات الضبط والمحاذاة */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* بطاقة معاينة الشعار الحالية */}
        <div className="md:col-span-4 flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container/60 border border-outline-variant/15">
          <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-900 border border-outline-variant/20 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {storeSettings?.shopLogo ? (
              <img
                src={storeSettings.shopLogo}
                alt="شعار المتجر"
                className="max-w-full max-h-full object-contain"
                style={{ width: `${Math.min(logoWidth, 80)}px`, height: `${Math.min(logoHeight, 80)}px` }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-on-surface-variant/40 text-center gap-1">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[10px] font-bold">لا يوجد شعار</span>
              </div>
            )}
          </div>
          <div className="space-y-1 text-xs flex-1 min-w-0">
            <div className="font-bold text-on-surface truncate font-cairo">
              {storeSettings?.shopName || 'سوبرماركت المتجر'}
            </div>
            <div className="text-[11px] text-on-surface-variant flex flex-wrap items-center gap-1.5">
              <span>المقاس: <strong className="font-mono text-primary font-black">{logoWidth}×{logoHeight}px</strong></span>
              <span>•</span>
              <span>المحاذاة: <strong className="text-on-surface font-bold">{logoAlign === 'auto' ? 'تلقائي' : logoAlign === 'center' ? 'وسط' : logoAlign === 'right' ? 'يمين' : 'يسار'}</strong></span>
            </div>
            <div className="text-[10px] text-on-surface-variant/70">
              يتم تطبيق الشعار تلقائياً على كافة نماذج الفواتير والإيصالات
            </div>
          </div>
        </div>

        {/* لوحة ضبط المقاسات والمحاذاة السريعة */}
        <div className="md:col-span-8 flex flex-col justify-between gap-3">
          {/* أزرار المقاسات السريعة */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>المقاس الموصى به للشعار:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { l: 'صغير 50px', w: 50, h: 50 },
                { l: 'متوسط 80px (مثالي)', w: 80, h: 80 },
                { l: 'كبير 120px', w: 120, h: 100 },
                { l: 'عريض 160×70px', w: 160, h: 70 },
              ].map((p) => {
                const isCur = logoWidth === p.w && logoHeight === p.h;
                return (
                  <button
                    key={p.l}
                    type="button"
                    onClick={() => onSaveDimensions(p.w, p.h, logoAlign)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                      isCur
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface'
                    }`}
                  >
                    {p.l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* محاذاة الشعار حسب اتجاه اللغة */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/10 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-on-surface">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>محاذاة الشعار بالترويسة:</span>
            </div>
            <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-outline-variant/20">
              {[
                { id: 'auto', label: 'تلقائي حسب اللغة (RTL/LTR)' },
                { id: 'center', label: 'وسط' },
                { id: 'right', label: 'يمين' },
                { id: 'left', label: 'يسار' },
              ].map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSaveDimensions(logoWidth, logoHeight, a.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    logoAlign === a.id
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* سلايدرات التحكم الموسع عند فتح التفاصيل */}
      {isLogoHubOpen && (
        <div className="pt-3 border-t border-outline-variant/15 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-on-surface">
              <span>عرض الشعار (Width)</span>
              <span className="font-mono text-primary font-bold">{logoWidth}px</span>
            </div>
            <input
              type="range"
              min={40}
              max={220}
              step={5}
              value={logoWidth}
              onChange={(e) => onSaveDimensions(Number(e.target.value), logoHeight, logoAlign)}
              className="w-full accent-primary"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-on-surface">
              <span>ارتفاع الشعار (Height)</span>
              <span className="font-mono text-primary font-bold">{logoHeight}px</span>
            </div>
            <input
              type="range"
              min={30}
              max={160}
              step={5}
              value={logoHeight}
              onChange={(e) => onSaveDimensions(logoWidth, Number(e.target.value), logoAlign)}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}
    </section>
  );
}
