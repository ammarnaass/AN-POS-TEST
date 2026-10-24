import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useThemeStore } from '@/store/themeStore';

export const AppTitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { theme } = useThemeStore();

  const isElectron = Boolean(
    typeof window !== 'undefined' && window.electronAPI?.windowControls
  );

  // جلب اسم المتجر النشط لعرضه في منتصف شريط العنوان
  const { data: rawSettings } = useQuery({
    queryKey: ['settings-titlebar'],
    queryFn: () => db.settings.get('default'),
    staleTime: 60000,
  });

  const shopName =
    rawSettings?.shopName || (rawSettings as any)?.shop_name || 'AN POS';

  // متابعة حالة تكبير النافذة وملء الشاشة
  useEffect(() => {
    if (isElectron && window.electronAPI?.windowControls) {
      window.electronAPI.windowControls.isMaximized().then((max) => {
        setIsMaximized(Boolean(max));
      }).catch(() => {});

      const unsubscribe = window.electronAPI.windowControls.onMaximizedChange(
        (max) => {
          setIsMaximized(max);
        }
      );
      return () => {
        unsubscribe?.();
      };
    }
  }, [isElectron]);

  // رصد الدخول والخروج من وضع ملء الشاشة (F11) لإخفاء الشريط تلقائياً
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.windowControls?.minimize();
  };

  const handleToggleMaximize = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    window.electronAPI?.windowControls?.maximize().then((max) => {
      setIsMaximized(Boolean(max));
    }).catch(() => {});
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.electronAPI?.windowControls?.close();
  };

  // في وضع ملء الشاشة (POS Kiosk / Fullscreen)، يتم إخفاء شريط العنوان تماماً
  if (isFullscreen) {
    return null;
  }

  // في بيئة المتصفح العادي بدون Electron، لا نعرض شريط النافذة الخارجي
  if (!isElectron) {
    return null;
  }

  return (
    <header
      id="app-title-bar"
      data-testid="app-title-bar"
      onDoubleClick={() => handleToggleMaximize()}
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className={`h-8 w-full flex items-center justify-between select-none shrink-0 z-[9999] transition-colors duration-150 no-print border-b ${
        theme === 'dark'
          ? 'bg-[#0f172a] text-slate-200 border-slate-800'
          : 'bg-[#f1f5f9] text-slate-800 border-slate-200'
      }`}
      dir="rtl"
    >
      {/* ── الجانب الأيمن (RTL): الشعار + اسم النظام + نقطة الحالة + الإصدار ── */}
      <div
        className="flex items-center gap-2 px-3 min-w-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <img
          src="/an-pos-icon.png"
          alt="AN POS Logo"
          className="w-4 h-4 rounded-xs object-contain shrink-0 shadow-2xs"
          onError={(e) => {
            // صورة احتياطية في حال تعذر تحميل الأيقونة
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <div className="flex items-center gap-1.5 font-cairo">
          <span className="text-xs font-black tracking-tight leading-none">
            AN POS
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
            title="النظام متصل ويعمل"
          />
          <span className="text-[10px] font-mono font-bold opacity-60 leading-none">
            v3.0.0
          </span>
        </div>
      </div>

      {/* ── المنتصف: اسم المتجر الحالي النشط (منطقة سحب خالية) ── */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2 pointer-events-none">
        <span className="text-[11px] font-semibold opacity-70 truncate max-w-xs font-cairo">
          {shopName}
        </span>
      </div>

      {/* ── الجانب الأيسر (RTL): أزرار التحكم بالنافذة (تصغير، تكبير، إغلاق) ── */}
      <div
        className="flex items-center h-full shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        dir="ltr"
      >
        {/* زر التصغير (Minimize) */}
        <button
          type="button"
          onClick={handleMinimize}
          title="تصغير النافذة"
          aria-label="تصغير النافذة"
          className={`h-full w-11 flex items-center justify-center transition-colors duration-100 cursor-pointer ${
            theme === 'dark'
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-200 text-slate-600 hover:text-black'
          }`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* زر التكبير / الاستعادة (Maximize / Restore) */}
        <button
          type="button"
          onClick={handleToggleMaximize}
          title={isMaximized ? 'استعادة الحجم' : 'تكبير النافذة'}
          aria-label={isMaximized ? 'استعادة الحجم' : 'تكبير النافذة'}
          className={`h-full w-11 flex items-center justify-center transition-colors duration-100 cursor-pointer ${
            theme === 'dark'
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-200 text-slate-600 hover:text-black'
          }`}
        >
          {isMaximized ? (
            <Copy className="w-3 h-3 rotate-180" />
          ) : (
            <Square className="w-3 h-3" />
          )}
        </button>

        {/* زر الإغلاق (Close) */}
        <button
          type="button"
          onClick={handleClose}
          title="إغلاق البرنامج"
          aria-label="إغلاق البرنامج"
          className="h-full w-12 flex items-center justify-center transition-colors duration-100 text-slate-400 hover:bg-[#dc2626] hover:text-white cursor-pointer active:bg-red-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default AppTitleBar;
