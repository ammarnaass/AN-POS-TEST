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
  Tablet,
  Smartphone,
  Maximize2,
  Scan,
  Sliders,
  Check,
  Terminal,
  Layers,
  Tv,
  Palette,
  Laptop,
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

type ModalTab = 'resolution' | 'layouts' | 'appearance';

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
  const [activeTab, setActiveTab] = useState<ModalTab>('resolution');
  const { theme, setTheme } = useThemeStore();
  const {
    design7ShowBottomFavorites,
    setDesign7ShowBottomFavorites,
  } = usePOSSessionStore();
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

  // Layout name helper for footer indicator
  const getLayoutName = (layout: POSLayout) => {
    switch (layout) {
      case 'sidebar':
        return 'تصميم 1 (العصري)';
      case 'bottom':
        return 'تصميم 2 (السفلي)';
      case 'classic':
        return 'تصميم 3 (الكلاسيكي)';
      case 'modern':
        return 'تصميم 4 (الحديث)';
      case 'design7':
        return 'تصميم 5 (الكلاسيكي المتقدم)';
      case 'workstation':
        return 'تصميم 6 (محطة العمل الاحترافية)';
      default:
        return 'تلقائي';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low dark:bg-slate-900 rounded-3xl border border-outline-variant/20 dark:border-slate-800 w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 dark:border-slate-800 flex items-center justify-between bg-surface-container dark:bg-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shadow-2xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-on-surface dark:text-white">
                إعدادات العرض ودقة الشاشة
              </h3>
              <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                تخصيص التخطيط، دقة العرض، والمظهر لنقطة البيع المتقدمة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-container-high dark:bg-slate-700/60 hover:bg-surface-container-highest dark:hover:bg-slate-700 flex items-center justify-center text-on-surface-variant hover:text-on-surface dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BEGIN: Tab Navigation Bar (شريط التبويبات الثلاثة) */}
        <div className="px-6 pt-3 pb-2 border-b border-outline-variant/15 dark:border-slate-800 bg-surface-container/40 dark:bg-slate-850/60 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-high dark:bg-slate-800 rounded-2xl border border-outline-variant/10 dark:border-slate-700/60">
            {/* Tab 1: دقة الشاشة والأبعاد */}
            <button
              type="button"
              onClick={() => setActiveTab('resolution')}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'resolution'
                  ? 'bg-primary text-white shadow-xs font-black'
                  : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-slate-700/50'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>دقة الشاشة</span>
            </button>

            {/* Tab 2: تصاميم الكاشير */}
            <button
              type="button"
              onClick={() => setActiveTab('layouts')}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'layouts'
                  ? 'bg-primary text-white shadow-xs font-black'
                  : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-slate-700/50'
              }`}
            >
              <Columns className="w-4 h-4 shrink-0" />
              <span>تصاميم الكاشير</span>
            </button>

            {/* Tab 3: المظهر والتفضيلات */}
            <button
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'appearance'
                  ? 'bg-primary text-white shadow-xs font-black'
                  : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white hover:bg-surface-container dark:hover:bg-slate-700/50'
              }`}
            >
              <Palette className="w-4 h-4 shrink-0" />
              <span>المظهر والتفضيلات</span>
            </button>
          </div>
        </div>
        {/* END: Tab Navigation Bar */}

        {/* Tab Content Area */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 min-h-[380px]">
          {/* ========================================================= */}
          {/* TAB 1: دقة الشاشة والأبعاد (RESOLUTION)                  */}
          {/* ========================================================= */}
          {activeTab === 'resolution' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              {/* بطاقة تشخيص الشاشة الحية */}
              <div className="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-slate-950 border border-outline-variant/15 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 text-on-surface-variant dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e] animate-pulse shrink-0" />
                  <span>دقة الشاشة الفيزيائية:</span>
                  <strong className="font-mono text-on-surface dark:text-slate-200 text-sm">
                    {screenInfo.screenWidth} × {screenInfo.screenHeight}
                  </strong>
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant dark:text-slate-400">
                  <span>أبعاد النافذة الحالية:</span>
                  <span className="font-mono font-bold text-primary dark:text-blue-400 text-sm">
                    {screenInfo.windowWidth} × {screenInfo.windowHeight}
                  </span>
                </div>
              </div>

              {/* شبكة الدقات الجاهزة (Resolution Presets Grid) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-extrabold text-on-surface dark:text-slate-200">
                    اختر دقة الشاشة المستهدفة:
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-blue-400 font-bold">
                    {activeResolution}
                  </span>
                </div>

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
                          <div
                            className={`p-1.5 rounded-xl shrink-0 ${
                              isSelected
                                ? 'bg-primary text-white'
                                : 'bg-surface-container-high dark:bg-slate-700 text-on-surface-variant'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold">{preset.label}</span>
                              {preset.badge && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                                    isSelected
                                      ? 'bg-primary text-white'
                                      : 'bg-primary/10 text-primary dark:text-blue-300'
                                  }`}
                                >
                                  {preset.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-on-surface-variant/80 dark:text-slate-400 mt-0.5 line-clamp-1">
                              {preset.sub}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'border-primary' : 'border-outline-variant/40'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* خيارات الدقة المخصصة إذا كانت محددة */}
              {activeResolution === 'custom' && (
                <div className="p-3.5 rounded-2xl bg-surface-container-high/60 dark:bg-slate-850 border border-outline-variant/20 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface dark:text-slate-200">
                      تحديد الأبعاد المخصصة بالبكسل:
                    </span>
                    <span className="text-[10px] font-mono text-primary font-bold">
                      {activeCustomResolution.width} × {activeCustomResolution.height} px
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-on-surface-variant dark:text-slate-400 block mb-1">
                        العرض (Width - px):
                      </label>
                      <input
                        type="number"
                        min="800"
                        max="3840"
                        step="10"
                        value={activeCustomResolution.width}
                        onChange={(e) =>
                          handleSetCustomResolution({
                            ...activeCustomResolution,
                            width: parseInt(e.target.value) || 1920,
                          })
                        }
                        className="w-full bg-surface-container dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-on-surface dark:text-white focus:border-primary focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-on-surface-variant dark:text-slate-400 block mb-1">
                        الارتفاع (Height - px):
                      </label>
                      <input
                        type="number"
                        min="600"
                        max="2160"
                        step="10"
                        value={activeCustomResolution.height}
                        onChange={(e) =>
                          handleSetCustomResolution({
                            ...activeCustomResolution,
                            height: parseInt(e.target.value) || 1080,
                          })
                        }
                        className="w-full bg-surface-container dark:bg-slate-900 border border-outline-variant/30 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-on-surface dark:text-white focus:border-primary focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* أزرار النسب السريعة */}
                  <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/10 dark:border-slate-700">
                    <span className="text-[10px] text-on-surface-variant dark:text-slate-400">
                      نسب شائعة:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSetCustomResolution({ width: 1280, height: 720 })}
                      className="px-2 py-1 rounded-lg bg-surface-container-high dark:bg-slate-700 text-[10px] font-mono hover:text-primary transition-colors cursor-pointer"
                    >
                      1280×720 (16:9)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetCustomResolution({ width: 1440, height: 900 })}
                      className="px-2 py-1 rounded-lg bg-surface-container-high dark:bg-slate-700 text-[10px] font-mono hover:text-primary transition-colors cursor-pointer"
                    >
                      1440×900 (16:10)
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

              {/* نمط تكييف وتطبيق الحجم على الشاشة */}
              {activeResolution !== 'auto' && (
                <div className="pt-2 border-t border-outline-variant/15 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant dark:text-slate-300 block">
                    نمط تكييف وتطبيق الحجم على الشاشة:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSetScaleMode('fit_screen')}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                        activeScaleMode === 'fit_screen'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs ring-2 ring-emerald-500/30'
                          : 'border-outline-variant/20 dark:border-slate-800 bg-surface-container dark:bg-slate-850 text-on-surface dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Maximize2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">ملء وملاءمة الشاشة بالكامل</div>
                          <div className="text-[10px] text-on-surface-variant/80 dark:text-slate-400">
                            تطبيق كثافة الدقة مع ملء النافذة دون هوامش
                          </div>
                        </div>
                      </div>
                      {activeScaleMode === 'fit_screen' && (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetScaleMode('fixed_canvas')}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                        activeScaleMode === 'fixed_canvas'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-2 ring-blue-500/30'
                          : 'border-outline-variant/20 dark:border-slate-800 bg-surface-container dark:bg-slate-850 text-on-surface dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Scan className="w-4 h-4 text-blue-500 shrink-0" />
                        <div>
                          <div className="text-xs font-bold">إطار ثابت متمركز (Canvas)</div>
                          <div className="text-[10px] text-on-surface-variant/80 dark:text-slate-400">
                            الحفاظ على نسبة أبعاد الدقة في منتصف الشاشة
                          </div>
                        </div>
                      </div>
                      {activeScaleMode === 'fixed_canvas' && (
                        <Check className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* مقياس التكبير اليدوي (UI Zoom) */}
              <div className="pt-2 border-t border-outline-variant/15 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-on-surface-variant dark:text-slate-400">
                    مقياس التكبير اليدوي للواجهة (UI Zoom)
                  </h4>
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
          )}

          {/* ========================================================= */}
          {/* TAB 2: تصاميم الكاشير (LAYOUTS)                          */}
          {/* ========================================================= */}
          {activeTab === 'layouts' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              <div>
                <h4 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 mb-2.5">
                  اختر نمط واجهة نقطة البيع (التصاميم الستة):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: تصميم 1 - العصري */}
                  <button
                    type="button"
                    onClick={() => {
                      setPosLayout('sidebar');
                      localStorage.setItem('pos_layout_mode', 'sidebar');
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      posLayout === 'sidebar'
                        ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Columns
                        className={`w-5 h-5 ${
                          posLayout === 'sidebar' ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      />
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          posLayout === 'sidebar' ? 'border-primary' : 'border-outline-variant/40'
                        }`}
                      >
                        {posLayout === 'sidebar' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-on-surface dark:text-white">
                          تصميم 1 (العصري)
                        </p>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold">
                          جديد
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                        شريط إجمالي علوي متدرج وسلة جانبية وشبكة منظمة
                      </p>
                    </div>
                  </button>

                  {/* Option 2: تصميم 2 - الملخص أسفل المنتجات */}
                  <button
                    type="button"
                    onClick={() => {
                      setPosLayout('bottom');
                      localStorage.setItem('pos_layout_mode', 'bottom');
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      posLayout === 'bottom'
                        ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Rows
                        className={`w-5 h-5 ${
                          posLayout === 'bottom' ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      />
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          posLayout === 'bottom' ? 'border-primary' : 'border-outline-variant/40'
                        }`}
                      >
                        {posLayout === 'bottom' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface dark:text-white">تصميم 2</p>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                        الملخص أسفل المنتجات
                      </p>
                    </div>
                  </button>

                  {/* Option 3: تصميم 3 - الكاشير الكلاسيكي */}
                  <button
                    type="button"
                    onClick={() => {
                      setPosLayout('classic');
                      localStorage.setItem('pos_layout_mode', 'classic');
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      posLayout === 'classic'
                        ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/20'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <LayoutDashboard
                        className={`w-5 h-5 ${
                          posLayout === 'classic' ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      />
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          posLayout === 'classic' ? 'border-primary' : 'border-outline-variant/40'
                        }`}
                      >
                        {posLayout === 'classic' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface dark:text-white">
                        تصميم 3 (الكلاسيكي المحسن)
                      </p>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                        شاشة سعر LED خضراء، زر دفع سريع F1، وشريط وظائف سريع
                      </p>
                    </div>
                  </button>

                  {/* Option 4: تصميم 4 - الحديث */}
                  <button
                    type="button"
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
                        <Sparkles
                          className={`w-5 h-5 ${
                            posLayout === 'modern'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-on-surface-variant'
                          }`}
                        />
                        <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px] font-bold">
                          حديث
                        </span>
                      </div>
                      <span
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          posLayout === 'modern' ? 'border-blue-600' : 'border-outline-variant/40'
                        }`}
                      >
                        {posLayout === 'modern' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        )}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface dark:text-white">
                        تصميم 4 (الحديث)
                      </p>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                        شريط الإجمالي العلوي وسلة تفاعلية
                      </p>
                    </div>
                  </button>

                  {/* Option 5: تصميم 5 - نقطة البيع الكلاسيكية المتقدمة (Skeuomorphic Touch POS) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPosLayout('design7');
                      localStorage.setItem('pos_layout_mode', 'design7');
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      posLayout === 'design7'
                        ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/40 shadow-xs ring-2 ring-amber-500/40'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-amber-400/40 bg-surface-container dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Terminal
                          className={`w-5 h-5 ${
                            posLayout === 'design7'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-on-surface-variant'
                          }`}
                        />
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold shadow-xs">
                          تصميم 5 المتقدم ★
                        </span>
                        <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                          Classic Touch POS
                        </span>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          posLayout === 'design7' ? 'border-amber-500' : 'border-outline-variant/40'
                        }`}
                      >
                        {posLayout === 'design7' && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface dark:text-white">
                        تصميم 5 (الكلاسيكي المتقدم)
                      </p>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">
                        واجهة لمسية احترافية، شاشة LED حمراء، شريط أدوات علوي، مصفوفة تحكم 3×5،
                        وشبكة أصناف سريعة 4×4
                      </p>
                    </div>
                  </button>

                  {/* Option 6: تصميم 6 - محطة العمل الاحترافية (Pro Workstation) */}
                  <button
                    type="button"
                    onClick={() => {
                      setPosLayout('workstation');
                      localStorage.setItem('pos_layout_mode', 'workstation');
                    }}
                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      posLayout === 'workstation'
                        ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/40 shadow-xs ring-2 ring-emerald-500/40'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-emerald-400/40 bg-surface-container dark:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Laptop
                          className={`w-5 h-5 ${
                            posLayout === 'workstation'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-on-surface-variant'
                          }`}
                        />
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                          تصميم 6 جديد ★
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                          Pro Workstation
                        </span>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          posLayout === 'workstation'
                            ? 'border-emerald-500'
                            : 'border-outline-variant/40'
                        }`}
                      >
                        {posLayout === 'workstation' && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface dark:text-white">
                        تصميم 6 (محطة العمل الاحترافية)
                      </p>
                      <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">
                        شاشة LED نيون خضراء، لوحة محاسبة 350px، حاسبة فئات نقدية، وجدول بنود مالي موسع
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* إعدادات سياقية إضافية لتصميم 5 */}
              <div className="p-4 rounded-2xl bg-surface-container-high/60 dark:bg-slate-850 border border-outline-variant/20 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <span className="text-xs font-bold text-on-surface dark:text-white">
                      شريط العبوات والمفضلة في تصميم 5
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                    تصميم 5 فقط
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant dark:text-slate-400 leading-relaxed">
                  التحكم في إظهار أو إخفاء شريط العبوات وتصنيفات المفضلة السفلي لتوسيع مساحة جدول
                  سلة المشتريات:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setDesign7ShowBottomFavorites(true)}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                      design7ShowBottomFavorites
                        ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/50 shadow-xs ring-1 ring-sky-500'
                        : 'border-outline-variant/20 dark:border-slate-700 bg-surface-container dark:bg-slate-800'
                    }`}
                  >
                    <Layers
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        design7ShowBottomFavorites ? 'text-sky-500' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-on-surface dark:text-white">
                        إظهار شريط المفضلة والعبوات
                      </div>
                      <div className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                        عرض شبكة العبوات السريعة أسفل الشاشة للوصول السريع
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDesign7ShowBottomFavorites(false)}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                      !design7ShowBottomFavorites
                        ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/50 shadow-xs ring-1 ring-amber-500'
                        : 'border-outline-variant/20 dark:border-slate-700 bg-surface-container dark:bg-slate-800'
                    }`}
                  >
                    <LayoutDashboard
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        !design7ShowBottomFavorites ? 'text-amber-500' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-bold text-on-surface dark:text-white">
                        إخفاء الشريط (شاشة كاملة)
                      </div>
                      <div className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                        توسيع جدول الفاتورة لكامل الارتفاع (مثالي لمسح الباركود)
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: المظهر والتفضيلات (APPEARANCE)                    */}
          {/* ========================================================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-5 animate-in fade-in-50 duration-150">
              {/* نمط المظهر (نهاري / ليلي) */}
              <div>
                <h4 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 mb-2.5">
                  المظهر والسمة (Theme)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold shadow-xs ring-2 ring-amber-500/30'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60 text-on-surface dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sun className="w-5 h-5 text-amber-500" />
                      <div>
                        <span className="text-xs font-bold block">الوضع النهاري</span>
                        <span className="text-[10px] text-on-surface-variant/70 dark:text-slate-400">
                          ألوان واضحة ومتباينة
                        </span>
                      </div>
                    </div>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        theme === 'light' ? 'border-amber-500' : 'border-outline-variant/40'
                      }`}
                    >
                      {theme === 'light' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-xs ring-2 ring-blue-500/30'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60 text-on-surface dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Moon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      <div>
                        <span className="text-xs font-bold block">الوضع المظلم</span>
                        <span className="text-[10px] text-on-surface-variant/70 dark:text-slate-400">
                          حماية العينين في الإضاءة الخافتة
                        </span>
                      </div>
                    </div>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        theme === 'dark' ? 'border-blue-500' : 'border-outline-variant/40'
                      }`}
                    >
                      {theme === 'dark' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* نمط عرض المنتجات (شبكي / قائمة) */}
              <div>
                <h4 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 mb-2.5">
                  نمط عرض المنتجات في الشبكة السريعة
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('grid');
                      localStorage.setItem('pos_view_mode', 'grid');
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'border-primary bg-primary text-on-primary font-bold shadow-xs'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60 text-on-surface dark:text-slate-300'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <div>
                      <span className="text-xs font-bold block">عرض شبكي (Grid)</span>
                      <span className="text-[10px] opacity-80 block">بطاقات منتجات مرئية</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('list');
                      localStorage.setItem('pos_view_mode', 'list');
                    }}
                    className={`p-3.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'border-primary bg-primary text-on-primary font-bold shadow-xs'
                        : 'border-outline-variant/20 dark:border-slate-800 hover:border-outline-variant/40 bg-surface-container dark:bg-slate-800/60 text-on-surface dark:text-slate-300'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <div>
                      <span className="text-xs font-bold block">عرض قائمة (List)</span>
                      <span className="text-[10px] opacity-80 block">قائمة مدمجة عالية الكثافة</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* إظهار صور المنتجات */}
              <div className="p-3.5 rounded-2xl bg-surface-container dark:bg-slate-800/60 border border-outline-variant/15 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <div>
                    <span className="text-xs font-bold text-on-surface dark:text-white">
                      إظهار صور المنتجات
                    </span>
                    <p className="text-[10px] text-on-surface-variant dark:text-slate-400 mt-0.5">
                      إخفاء الصور يوفر مساحة أوسع للأصناف ويسرع التحميل على الشاشات الصغيرة
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showProductImages;
                    setShowProductImages(next);
                    localStorage.setItem('pos_show_images', String(next));
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                    showProductImages ? 'bg-primary' : 'bg-surface-container-high dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      showProductImages ? 'translate-x-0' : '-translate-x-6'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (تذييل المودال مع ملخص الحالة وزر التأكيد) */}
        <div className="px-6 py-3.5 border-t border-outline-variant/15 dark:border-slate-800 flex items-center justify-between bg-surface-container/60 dark:bg-slate-800/60 shrink-0">
          <div className="text-[11px] text-on-surface-variant dark:text-slate-400 flex items-center gap-2">
            <span className="font-bold text-on-surface dark:text-slate-200">
              {getLayoutName(posLayout)}
            </span>
            <span>•</span>
            <span className="font-mono text-primary dark:text-blue-400">{activeResolution}</span>
            <span>•</span>
            <span>{theme === 'dark' ? 'الوضع المظلم' : 'الوضع النهاري'}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
          >
            تم وحفظ
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomizeLayoutModal;
