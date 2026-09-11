import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Columns,
  Rows,
  Sparkles,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Minus,
  Plus,
  RotateCcw,
  X,
  Sun,
  Moon,
  Monitor,
  Tv,
  Tablet,
  Smartphone,
  Maximize2,
  Scan,
  Sliders,
  Check,
  Terminal,
  Star,
  Package,
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import {
  usePOSSessionStore,
  type ScreenResolution,
  type ResolutionScaleMode,
  type POSLayout,
} from '../store/usePOSSessionStore';

interface CustomizeLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  posLayout: POSLayout;
  setPosLayout: (layout: POSLayout) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  showProductImages: boolean;
  setShowProductImages: (show: boolean) => void;
  uiZoom: number;
  setUiZoom: (zoom: number) => void;
  screenResolution?: ScreenResolution;
  setScreenResolution?: (res: ScreenResolution) => void;
  customResolution?: { width: number; height: number };
  setCustomResolution?: (custom: { width: number; height: number }) => void;
  resolutionScaleMode?: ResolutionScaleMode;
  setResolutionScaleMode?: (mode: ResolutionScaleMode) => void;
}

const RESOLUTION_PRESETS: {
  id: ScreenResolution;
  label: string;
  sub: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  aspect: string;
}[] = [
  {
    id: 'auto',
    label: 'تلقائي (شاشة كاملة)',
    sub: 'يتكيف 100% مع أبعاد شاشتك أو نافذتك دون قيود',
    badge: 'تلقائي',
    icon: Monitor,
    aspect: 'مرن',
  },
  {
    id: '1920x1080',
    label: '1920 × 1080 (FHD)',
    sub: 'الدقة القياسية لمعظم شاشات سطح المكتب الحديثة',
    badge: '1080p الأكثر شيوعاً ★',
    icon: Tv,
    aspect: '16:9',
  },
  {
    id: '1366x768',
    label: '1366 × 768 (HD)',
    sub: 'الشاشات التجارية وشاشات الحواسيب المحمولة الأكثر انتشاراً',
    badge: 'لابتوب / تجاري',
    icon: Monitor,
    aspect: '16:9',
  },
  {
    id: '1280x800',
    label: '1280 × 800 (WXGA)',
    sub: 'الأجهزة اللوحية وشاشات نقاط البيع اللمسية المحمولة',
    badge: 'شاشات لوحية',
    icon: Tablet,
    aspect: '16:10',
  },
  {
    id: '1024x768',
    label: '1024 × 768 (XGA)',
    sub: 'شاشات اللمس الكلاسيكية (4:3) - أزرار كبيرة وعريضة للكاشير',
    badge: 'شاشات لمس POS',
    icon: Smartphone,
    aspect: '4:3',
  },
  {
    id: '1600x900',
    label: '1600 × 900 (HD+)',
    sub: 'شاشات سطح المكتب المتوسطة والعريضة',
    badge: 'HD+ مكتبي',
    icon: Monitor,
    aspect: '16:9',
  },
  {
    id: '2560x1440',
    label: '2560 × 1440 (2K QHD)',
    sub: 'الشاشات الكبيرة وفائقة الدقة',
    badge: '2K فائقة',
    icon: Tv,
    aspect: '16:9',
  },
  {
    id: 'custom',
    label: 'دقة مخصصة (Custom)',
    sub: 'تحديد العرض والارتفاع بالبكسل يدوياً',
    badge: 'يدوي',
    icon: Sliders,
    aspect: 'مخصص',
  },
];

export const CustomizeLayoutModal: React.FC<CustomizeLayoutModalProps> = ({
  isOpen,
  onClose,
  posLayout,
  setPosLayout,
  viewMode,
  setViewMode,
  showProductImages,
  setShowProductImages,
  uiZoom,
  setUiZoom,
  screenResolution,
  setScreenResolution,
  customResolution,
  setCustomResolution,
  resolutionScaleMode,
  setResolutionScaleMode,
}) => {
  const { theme, setTheme } = useThemeStore();
  const { terminalCategoryMode, setTerminalCategoryMode } = usePOSSessionStore();
  const store = usePOSSessionStore();

  const activeResolution = screenResolution ?? store.screenResolution;
  const handleSetResolution = setScreenResolution ?? store.setScreenResolution;
  const activeCustomResolution = customResolution ?? store.customResolution;
  const handleSetCustomResolution = setCustomResolution ?? store.setCustomResolution;
  const activeScaleMode = resolutionScaleMode ?? store.resolutionScaleMode;
  const handleSetScaleMode = setResolutionScaleMode ?? store.setResolutionScaleMode;

  // Real-time window and screen diagnostic info
  const [screenInfo, setScreenInfo] = useState(() => ({
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 1920,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 1080,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));

  useEffect(() => {
    const update = () => {
      setScreenInfo({
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low dark:bg-slate-900 rounded-3xl border border-outline-variant/20 dark:border-slate-800 w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 dark:border-slate-800 flex items-center justify-between bg-surface-container dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-on-surface dark:text-white">إعدادات العرض ودقة الشاشة</h3>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400">تخصيص التخطيط، دقة العرض، والمظهر لنقطة البيع</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-container-high dark:bg-slate-700/60 hover:bg-surface-container-highest dark:hover:bg-slate-700 flex items-center justify-center text-on-surface-variant hover:text-on-surface dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          {/* Section 0: نمط المظهر (نهاري / ليلي) */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 mb-2.5">المظهر والسمة (Theme)</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold shadow-xs ring-2 ring-amber-500/30'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60 text-on-surface dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold">الوضع النهاري</span>
                </div>
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  theme === 'light' ? 'border-amber-500' : 'border-outline-variant/40'
                }`}>
                  {theme === 'light' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-2 ring-blue-500/30'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60 text-on-surface dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  <span className="text-xs font-bold">الوضع المظلم</span>
                </div>
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  theme === 'dark' ? 'border-blue-500' : 'border-outline-variant/40'
                }`}>
                  {theme === 'dark' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </span>
              </button>
            </div>
          </div>

          {/* Section 1: خيار دقة العرض وتكييف الشاشة (NEW) */}
          <div className="p-4 rounded-3xl bg-surface-container/60 dark:bg-slate-800/40 border border-outline-variant/20 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-extrabold text-on-surface dark:text-slate-200">دقة العرض المستهدفة (Resolution)</h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
                1920×1080 / مخصص
              </span>
            </div>

            {/* Live Screen Diagnostics Pill */}
            <div className="p-2.5 rounded-2xl bg-surface-container-lowest/80 dark:bg-slate-950/80 border border-outline-variant/15 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2 text-on-surface-variant dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>الشاشة الحالية:</span>
                <strong className="font-mono text-on-surface dark:text-slate-200">{screenInfo.screenWidth} × {screenInfo.screenHeight}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface-variant dark:text-slate-400">
                <span>النافذة:</span>
                <span className="font-mono font-bold text-primary">{screenInfo.windowWidth} × {screenInfo.windowHeight}</span>
              </div>
            </div>

            {/* Resolution Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {RESOLUTION_PRESETS.map((preset) => {
                const IconComponent = preset.icon;
                const isSelected = activeResolution === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSetResolution(preset.id)}
                    className={`p-3 rounded-2xl border text-right transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary dark:text-blue-300 font-bold shadow-xs ring-2 ring-primary/30'
                        : 'border-outline-variant/20 dark:border-slate-800/80 hover:border-primary/40 bg-surface-container dark:bg-slate-850 text-on-surface dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-xl shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-surface-container-high dark:bg-slate-700 text-on-surface-variant'
                      }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate">{preset.label}</span>
                          {preset.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-surface-container-highest dark:bg-slate-700 text-on-surface-variant dark:text-slate-300 font-mono">
                              {preset.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-on-surface-variant/80 dark:text-slate-400 mt-0.5 leading-tight line-clamp-1">
                          {preset.sub}
                        </p>
                      </div>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected ? 'border-primary' : 'border-outline-variant/40'
                    }`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Resolution Inputs when 'custom' selected */}
            {activeResolution === 'custom' && (
              <div className="p-3.5 rounded-2xl bg-surface-container dark:bg-slate-800/80 border border-outline-variant/20 dark:border-slate-700 space-y-2.5 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between text-xs font-bold text-on-surface dark:text-slate-200">
                  <span>تعيين الدقة المخصصة يدويًا (بكسل):</span>
                  <span className="font-mono text-primary text-[11px]">
                    {activeCustomResolution.width} × {activeCustomResolution.height}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block mb-1">
                      العرض (Width px):
                    </label>
                    <input
                      type="number"
                      min={800}
                      max={3840}
                      step={10}
                      value={activeCustomResolution.width}
                      onChange={(e) => {
                        const val = Math.max(600, Math.min(5000, Number(e.target.value) || 1920));
                        handleSetCustomResolution({ ...activeCustomResolution, width: val });
                      }}
                      className="w-full h-9 px-3 bg-surface-container-low dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-700 rounded-xl text-xs font-mono text-on-surface dark:text-white focus:outline-hidden focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 block mb-1">
                      الارتفاع (Height px):
                    </label>
                    <input
                      type="number"
                      min={600}
                      max={2160}
                      step={10}
                      value={activeCustomResolution.height}
                      onChange={(e) => {
                        const val = Math.max(400, Math.min(4000, Number(e.target.value) || 1080));
                        handleSetCustomResolution({ ...activeCustomResolution, height: val });
                      }}
                      className="w-full h-9 px-3 bg-surface-container-low dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-700 rounded-xl text-xs font-mono text-on-surface dark:text-white focus:outline-hidden focus:border-primary"
                    />
                  </div>
                </div>

                {/* Quick Aspect Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-on-surface-variant dark:text-slate-400 font-bold">دقات سريعة:</span>
                  <button
                    type="button"
                    onClick={() => handleSetCustomResolution({ width: 1280, height: 1024 })}
                    className="px-2 py-1 rounded-lg bg-surface-container-high dark:bg-slate-700 text-[10px] font-mono hover:text-primary transition-colors cursor-pointer"
                  >
                    1280×1024 (5:4)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCustomResolution({ width: 1920, height: 1200 })}
                    className="px-2 py-1 rounded-lg bg-surface-container-high dark:bg-slate-700 text-[10px] font-mono hover:text-primary transition-colors cursor-pointer"
                  >
                    1920×1200 (16:10)
                  </button>
                </div>
              </div>
            )}

            {/* Scale Adaptation Mode */}
            {activeResolution !== 'auto' && (
              <div className="pt-2 border-t border-outline-variant/15 dark:border-slate-800 space-y-2">
                <label className="text-[11px] font-bold text-on-surface-variant dark:text-slate-300 block">
                  نمط تكييف وتطبيق الحجم على الشاشة:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSetScaleMode('fit_screen')}
                    className={`p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      activeScaleMode === 'fit_screen'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs ring-2 ring-emerald-500/30'
                        : 'border-outline-variant/20 dark:border-slate-800 bg-surface-container dark:bg-slate-850 text-on-surface dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">ملء وملاءمة الشاشة بالكامل</div>
                        <div className="text-[10px] text-on-surface-variant/80 dark:text-slate-400">تطبيق كثافة الدقة مع ملء النافذة دون هوامش</div>
                      </div>
                    </div>
                    {activeScaleMode === 'fit_screen' && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSetScaleMode('fixed_canvas')}
                    className={`p-2.5 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      activeScaleMode === 'fixed_canvas'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-2 ring-blue-500/30'
                        : 'border-outline-variant/20 dark:border-slate-800 bg-surface-container dark:bg-slate-850 text-on-surface dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Scan className="w-4 h-4 text-blue-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">إطار ثابت متمركز (Canvas)</div>
                        <div className="text-[10px] text-on-surface-variant/80 dark:text-slate-400">الحفاظ على نسبة أبعاد الدقة في منتصف الشاشة</div>
                      </div>
                    </div>
                    {activeScaleMode === 'fixed_canvas' && <Check className="w-4 h-4 text-blue-500 shrink-0" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: التخطيط والتصميم */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 mb-2.5">التخطيط والتصميم</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: تصميم 1 - العصري */}
              <button
                onClick={() => {
                  setPosLayout('sidebar');
                  localStorage.setItem('pos_layout_mode', 'sidebar');
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                  posLayout === 'sidebar'
                    ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Columns className={`w-5 h-5 ${posLayout === 'sidebar' ? 'text-primary' : 'text-on-surface-variant'}`} />
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    posLayout === 'sidebar' ? 'border-primary' : 'border-outline-variant/40'
                  }`}>
                    {posLayout === 'sidebar' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-on-surface dark:text-white">تصميم 1 (العصري)</p>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold">جديد</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">شريط إجمالي علوي متدرج وسلة جانبية وشبكة منظمة</p>
                </div>
              </button>

              {/* Option 2: تصميم 2 - الملخص أسفل المنتجات */}
              <button
                onClick={() => {
                  setPosLayout('bottom');
                  localStorage.setItem('pos_layout_mode', 'bottom');
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                  posLayout === 'bottom'
                    ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Rows className={`w-5 h-5 ${posLayout === 'bottom' ? 'text-primary' : 'text-on-surface-variant'}`} />
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    posLayout === 'bottom' ? 'border-primary' : 'border-outline-variant/40'
                  }`}>
                    {posLayout === 'bottom' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface dark:text-white">تصميم 2</p>
                  <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">الملخص أسفل المنتجات</p>
                </div>
              </button>

              {/* Option 3: تصميم 3 - الكاشير الكلاسيكي */}
              <button
                onClick={() => {
                  setPosLayout('classic');
                  localStorage.setItem('pos_layout_mode', 'classic');
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                  posLayout === 'classic'
                    ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <LayoutDashboard className={`w-5 h-5 ${posLayout === 'classic' ? 'text-primary' : 'text-on-surface-variant'}`} />
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    posLayout === 'classic' ? 'border-primary' : 'border-outline-variant/40'
                  }`}>
                    {posLayout === 'classic' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface dark:text-white">تصميم 3</p>
                  <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">الكاشير الكلاسيكي (شاشات لمس قديمة)</p>
                </div>
              </button>

              {/* Option 4: تصميم 4 - الحديث */}
              <button
                onClick={() => {
                  setPosLayout('modern');
                  localStorage.setItem('pos_layout_mode', 'modern');
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                  posLayout === 'modern'
                    ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-900/20 shadow-xs ring-2 ring-blue-500/30'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-blue-400/40 bg-surface-container dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className={`w-5 h-5 ${posLayout === 'modern' ? 'text-blue-600 dark:text-blue-400' : 'text-on-surface-variant'}`} />
                    <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">جديد</span>
                  </div>
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    posLayout === 'modern' ? 'border-blue-600' : 'border-outline-variant/40'
                  }`}>
                    {posLayout === 'modern' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface dark:text-white">تصميم 4 (الحديث)</p>
                  <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">شريط الإجمالي العلوي وسلة تفاعلية</p>
                </div>
              </button>

              {/* Option 5: تصميم 5 - كاشير التجزئة والمكتبات المتقدم */}
              <button
                onClick={() => {
                  setPosLayout('terminal');
                  localStorage.setItem('pos_layout_mode', 'terminal');
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer sm:col-span-2 ${
                  posLayout === 'terminal'
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/30 shadow-xs ring-2 ring-emerald-500/30'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-emerald-400/40 bg-surface-container dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Terminal className={`w-5 h-5 ${posLayout === 'terminal' ? 'text-emerald-600 dark:text-emerald-400' : 'text-on-surface-variant'}`} />
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                      تصميم 5 جديد ★
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                      Terminal Station
                    </span>
                  </div>
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    posLayout === 'terminal' ? 'border-emerald-500' : 'border-outline-variant/40'
                  }`}>
                    {posLayout === 'terminal' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface dark:text-white">تصميم 5 (كاشير التجزئة والمكتبات المتقدم)</p>
                  <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                    شاشة رقمية نيون، أوامر F1-F12 سريعة، جدول أصناف مركزي، وقوائم تصنيفات عمودية مدمجة
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: نمط العرض (شبكي / قائمة) */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 mb-2.5">نمط عرض المنتجات</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setViewMode('grid');
                  localStorage.setItem('pos_view_mode', 'grid');
                }}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'border-primary bg-primary text-on-primary font-bold shadow-xs'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60 text-on-surface dark:text-slate-300'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-xs font-bold">عرض شبكي (Grid)</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('list');
                  localStorage.setItem('pos_view_mode', 'list');
                }}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'border-primary bg-primary text-on-primary font-bold shadow-xs'
                    : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60 text-on-surface dark:text-slate-300'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-xs font-bold">عرض قائمة (List)</span>
              </button>
            </div>
          </div>

          {/* Section 4: إظهار الصور */}
          <div className="p-3.5 rounded-2xl bg-surface-container dark:bg-slate-800/60 border border-outline-variant/15 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-primary" />
              <div>
                <span className="text-xs font-bold text-on-surface dark:text-white">إظهار صور المنتجات</span>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400">إخفاء الصور يوفر مساحة أوسع للأصناف على الشاشات الصغيرة</p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !showProductImages;
                setShowProductImages(next);
                localStorage.setItem('pos_show_images', String(next));
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                showProductImages ? 'bg-primary' : 'bg-surface-container-high dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  showProductImages ? 'translate-x-0' : '-translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* Section: تبويبات الشريط السفلي في تصميم 5 (Terminal POS) */}
          <div className="p-3.5 rounded-2xl bg-surface-container dark:bg-slate-800/60 border border-outline-variant/15 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-on-surface dark:text-white">
                  تبويبات الشريط السفلي في تصميم 5 (Terminal POS)
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                تصميم 5
              </span>
            </div>
            <p className="text-[10px] text-on-surface-variant dark:text-slate-400">
              اختر ما يظهر في شريط الفئات والأصناف السريعة أسفل شاشة كاشير تصميم 5:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTerminalCategoryMode('favorites')}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                  terminalCategoryMode === 'favorites'
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/40 shadow-xs ring-1 ring-emerald-500'
                    : 'border-outline-variant/20 dark:border-slate-700 bg-surface-container-high dark:bg-slate-800'
                }`}
              >
                <Star className={`w-4 h-4 shrink-0 mt-0.5 ${terminalCategoryMode === 'favorites' ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-on-surface dark:text-white">المفضلة وتصنيفات العبوات (★)</div>
                  <div className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">
                    عرض تصنيفات المفضلة والعبوات والكراتين السريعة لتسريع خدمة الزبائن
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTerminalCategoryMode('products')}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                  terminalCategoryMode === 'products'
                    ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/40 shadow-xs ring-1 ring-blue-500'
                    : 'border-outline-variant/20 dark:border-slate-700 bg-surface-container-high dark:bg-slate-800'
                }`}
              >
                <Package className={`w-4 h-4 shrink-0 mt-0.5 ${terminalCategoryMode === 'products' ? 'text-blue-500' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-on-surface dark:text-white">تصنيفات التجزئة القياسية (📦)</div>
                  <div className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">
                    عرض تصنيفات المنتجات المعتادة للمتجر والأصناف السريعة
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 5: تكبير وتصغير الواجهة (Zoom) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-on-surface-variant dark:text-slate-400">مقياس التكبير اليدوي (UI Zoom)</h4>
              <span className="text-[11px] font-mono font-bold text-primary">{uiZoom}%</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container dark:bg-slate-800/60 border border-outline-variant/15 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(70, uiZoom - 5);
                    setUiZoom(next);
                    localStorage.setItem('pos_ui_zoom', String(next));
                  }}
                  className="w-8 h-8 rounded-xl bg-surface-container-high dark:bg-slate-700 hover:bg-surface-container-highest text-on-surface dark:text-white flex items-center justify-center font-bold transition-all shadow-2xs cursor-pointer"
                  title="تصغير (-)"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-14 text-center font-mono font-extrabold text-sm text-primary">
                  {uiZoom}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(150, uiZoom + 5);
                    setUiZoom(next);
                    localStorage.setItem('pos_ui_zoom', String(next));
                  }}
                  className="w-8 h-8 rounded-xl bg-surface-container-high dark:bg-slate-700 hover:bg-surface-container-highest text-on-surface dark:text-white flex items-center justify-center font-bold transition-all shadow-2xs cursor-pointer"
                  title="تكبير (+)"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUiZoom(100);
                  localStorage.setItem('pos_ui_zoom', '100');
                }}
                className="p-2 rounded-xl bg-surface-container-high dark:bg-slate-700 hover:bg-surface-container-highest text-on-surface-variant dark:text-slate-300 hover:text-primary transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="إعادة ضبط (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط (100%)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
