import React from 'react';
import {
  LayoutDashboard,
  Columns,
  Rows,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';

interface CustomizeLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  posLayout: 'sidebar' | 'bottom' | 'classic';
  setPosLayout: (layout: 'sidebar' | 'bottom' | 'classic') => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  showProductImages: boolean;
  setShowProductImages: (show: boolean) => void;
  uiZoom: number;
  setUiZoom: (zoom: number) => void;
}

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
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="glass-card bg-surface-container-low rounded-3xl border border-outline-variant/20 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-on-surface">إعدادات العرض</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Section 1: التخطيط */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant mb-2.5">التخطيط والتصميم</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: تصميم 1 - الملخص أسفل السلة */}
              <button
                onClick={() => {
                  setPosLayout('sidebar');
                  localStorage.setItem('pos_layout_mode', 'sidebar');
                }}
                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                  posLayout === 'sidebar'
                    ? 'border-primary bg-primary/5 shadow-xs ring-2 ring-primary/20'
                    : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container'
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
                  <p className="text-xs font-bold text-on-surface">تصميم 1</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">الملخص أسفل السلة</p>
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
                    : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container'
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
                  <p className="text-xs font-bold text-on-surface">تصميم 2</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">الملخص أسفل المنتجات</p>
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
                    : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container'
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
                  <p className="text-xs font-bold text-on-surface">تصميم 3</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">الكاشير الكلاسيكي (جدول بالوسط وشبكة بالأسفل)</p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: نمط العرض */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant mb-2.5">نمط العرض</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setViewMode('grid');
                  localStorage.setItem('pos_view_mode', 'grid');
                }}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'border-primary bg-primary text-on-primary font-bold shadow-xs'
                    : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container text-on-surface'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-xs font-bold">عرض شبكي</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('list');
                  localStorage.setItem('pos_view_mode', 'list');
                }}
                className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'border-primary bg-primary text-on-primary font-bold shadow-xs'
                    : 'border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container text-on-surface'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-xs font-bold">عرض قائمة</span>
              </button>
            </div>
          </div>

          {/* Section 3: إظهار الصور */}
          <div className="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-on-surface">إظهار الصور</span>
            </div>
            <button
              onClick={() => {
                const next = !showProductImages;
                setShowProductImages(next);
                localStorage.setItem('pos_show_images', String(next));
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                showProductImages ? 'bg-primary' : 'bg-surface-container-high'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  showProductImages ? 'translate-x-0' : '-translate-x-5'
                }`}
              />
            </button>
          </div>

          {/* Section 4: تكبير الواجهة */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant mb-2.5">تكبير الواجهة</h4>
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-container border border-outline-variant/15">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const next = Math.max(75, uiZoom - 5);
                    setUiZoom(next);
                    localStorage.setItem('pos_ui_zoom', String(next));
                  }}
                  className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center font-bold transition-all shadow-2xs cursor-pointer"
                  title="تصغير (-)"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-14 text-center font-mono font-extrabold text-sm text-primary">
                  {uiZoom}%
                </span>
                <button
                  onClick={() => {
                    const next = Math.min(130, uiZoom + 5);
                    setUiZoom(next);
                    localStorage.setItem('pos_ui_zoom', String(next));
                  }}
                  className="w-8 h-8 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center font-bold transition-all shadow-2xs cursor-pointer"
                  title="تكبير (+)"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setUiZoom(100);
                  localStorage.setItem('pos_ui_zoom', '100');
                }}
                className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                title="إعادة ضبط (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
