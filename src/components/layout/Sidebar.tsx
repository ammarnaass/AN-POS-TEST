import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import type { UserRole } from '@/types';
import {
  X,
  Store,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Users,
  Truck,
  Settings,
  LogOut,
  DollarSign,
  HelpCircle,
  Tag,
  Barcode,
  FolderTree,
  ShieldCheck,
  Smartphone,
  Wifi,
  Cloud,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  Zap,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Store;
  roles?: UserRole[];
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const menuSections: NavSection[] = [
  {
    title: 'المبيعات والكاشير',
    items: [
      { path: '/pos/quick', label: 'نقطة البيع السريعة', icon: Zap, badge: '⚡ سريع' },
      { path: '/pos', label: 'نقطة البيع المتقدمة', icon: ShoppingCart, badge: 'PRO' },
      { path: '/', label: 'لوحة الإحصائيات', icon: LayoutDashboard },
      { path: '/sales', label: 'سجل الفواتير والمبيعات', icon: Receipt },
      { path: '/cash', label: 'إدارة الخزينة والصندوق', icon: DollarSign, roles: ['admin', 'cashier'] },
    ],
  },
  {
    title: 'المنتجات والمخزون',
    items: [
      { path: '/inventory', label: 'إدارة المخزون والبضائع', icon: Package },
      { path: '/categories', label: 'العائلات والتصنيفات', icon: FolderTree },
      { path: '/barcode/labels', label: 'طباعة الباركود والملصقات', icon: Barcode },
      { path: '/promotions', label: 'العروض والخصومات', icon: Tag },
    ],
  },
  {
    title: 'العملاء والموردين',
    items: [
      { path: '/customers', label: 'حسابات العملاء', icon: Users },
      { path: '/suppliers', label: 'حسابات الموردين', icon: Truck },
    ],
  },
  {
    title: 'النظام والإعدادات',
    items: [
      { path: '/settings', label: 'إعدادات النظام والطباعة', icon: Settings },
      { path: '/support', label: 'المساعدة والدعم الفني', icon: HelpCircle },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isPosMode?: boolean;
}

export default function Sidebar({ isOpen, onClose, isPosMode = false }: SidebarProps) {
  const { user: currentUser, logout } = useAuthStore();
  const { isCollapsed, toggleCollapse } = useSidebarStore();
  const navigate = useNavigate();

  const queryClient = useQueryClient();

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
    staleTime: 60000,
  });

  useEffect(() => {
    const electron = (window as any).electronAPI;
    if (electron?.db?.onTableUpdated) {
      return electron.db.onTableUpdated((data: { table: string }) => {
        if (data.table === 'settings' || data.table === 'network_settings') {
          queryClient.invalidateQueries({ queryKey: ['settings'] });
          queryClient.invalidateQueries({ queryKey: ['server-status-sidebar'] });
          queryClient.invalidateQueries({ queryKey: ['connected-devices-sidebar'] });
        }
      });
    }
  }, [queryClient]);

  const { data: serverStatus } = useQuery({
    queryKey: ['server-status-sidebar'],
    queryFn: async () => {
      const electron = (window as any).electronAPI;
      if (electron?.server?.status) {
        return await electron.server.status();
      }
      return null;
    },
    refetchInterval: 30000,
  });

  const { data: connectedDevices } = useQuery({
    queryKey: ['connected-devices-sidebar'],
    queryFn: async () => {
      const electron = (window as any).electronAPI;
      if (electron?.server?.connectedDevices) {
        const res = await electron.server.connectedDevices();
        return res?.data || [];
      }
      return [];
    },
    refetchInterval: 30000,
  });

  const shopName = rawSettings?.shopName || (rawSettings as any)?.shop_name || 'AN POS';
  const shopLogo = (rawSettings as any)?.shopLogo || (rawSettings as any)?.shop_logo || (rawSettings as any)?.logo;
  const syncMode = (rawSettings?.syncMode || (rawSettings as any)?.sync_mode || 'single') as 'single' | 'lan' | 'cloud' | 'hybrid';

  const activeOnlineCount = Array.isArray(connectedDevices)
    ? connectedDevices.filter((d: any) => d.status === 'online').length
    : 0;

  const getConnectionStatus = () => {
    if (syncMode === 'single') {
      return {
        label: 'محطة مستقلة (أوفلاين)',
        icon: HardDrive,
        dotClass: 'bg-slate-400',
        textClass: 'text-on-surface-variant/70',
      };
    }

    if (syncMode === 'lan') {
      if (activeOnlineCount > 0) {
        return {
          label: activeOnlineCount === 1 ? 'متزامن مع الهاتف' : `متزامن مع ${activeOnlineCount} هواتف`,
          icon: Smartphone,
          dotClass: 'bg-emerald-500 animate-pulse',
          textClass: 'text-emerald-600',
        };
      }
      return {
        label: serverStatus?.running ? 'خادم LAN (بانتظار هاتف)' : 'شبكة محلية (LAN)',
        icon: Wifi,
        dotClass: serverStatus?.running ? 'bg-sky-500' : 'bg-slate-400',
        textClass: 'text-sky-600',
      };
    }

    if (syncMode === 'cloud') {
      return {
        label: 'متزامن سحابياً (Cloud)',
        icon: Cloud,
        dotClass: 'bg-purple-500 animate-pulse',
        textClass: 'text-purple-600',
      };
    }

    if (syncMode === 'hybrid') {
      return {
        label: 'مزامنة هجينة (LAN + Cloud)',
        icon: Zap,
        dotClass: 'bg-amber-500 animate-pulse',
        textClass: 'text-amber-600',
      };
    }

    return {
      label: 'محطة مستقلة',
      icon: HardDrive,
      dotClass: 'bg-slate-400',
      textClass: 'text-on-surface-variant/70',
    };
  };

  const statusInfo = getConnectionStatus();
  const StatusIcon = statusInfo.icon;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine desktop width and mode
  // If isPosMode is true, the sidebar is an off-canvas drawer that slides over content when isOpen is true.
  // Otherwise, it is static in layout: 72px when collapsed, 270px when full.
  const desktopWidthClass = isPosMode
    ? 'w-[280px]'
    : isCollapsed
    ? 'lg:w-[72px]'
    : 'lg:w-[270px]';

  const positionClass = isPosMode
    ? `fixed top-0 right-0 h-full z-[100] transition-transform duration-300 shadow-2xl ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`
    : `fixed top-0 right-0 h-full z-[100] lg:static lg:z-auto transition-all duration-300 shadow-2xl lg:shadow-none ${
        isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`;

  return (
    <>
      {/* Backdrop overlay for mobile or POS drawer */}
      {(isOpen || (isPosMode && isOpen)) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity cursor-pointer"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`${positionClass} ${desktopWidthClass} bg-surface-container-low border-l border-outline-variant/20 flex flex-col shrink-0 select-none overflow-hidden`}
      >
        {/* Header: Store Name, Logo, and Collapse Toggle */}
        <div
          className={`p-3.5 flex items-center justify-between border-b border-outline-variant/15 shrink-0 ${
            !isPosMode && isCollapsed ? 'lg:flex-col lg:gap-2 lg:p-2.5' : ''
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {shopLogo ? (
              <img
                src={shopLogo}
                alt={shopName}
                className="w-10 h-10 rounded-2xl object-cover border border-outline-variant/20 shadow-md shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-md shadow-primary/25 shrink-0">
                <Store className="w-5 h-5" />
              </div>
            )}

            {/* Shop Details (Hidden when collapsed on desktop) */}
            <div className={`min-w-0 overflow-hidden ${!isPosMode && isCollapsed ? 'lg:hidden' : 'block'}`}>
              <h1 className="text-sm font-black text-on-surface font-cairo tracking-tight truncate leading-none">
                {shopName}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusInfo.dotClass}`} />
                <span className={`text-[10px] font-bold ${statusInfo.textClass} flex items-center gap-1 truncate`}>
                  <span className="truncate">{statusInfo.label}</span>
                  <StatusIcon className="w-3 h-3 shrink-0" />
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Collapse toggle button on desktop (only in normal mode) */}
            {!isPosMode && (
              <button
                onClick={toggleCollapse}
                className="hidden lg:flex text-on-surface-variant hover:text-on-surface p-1.5 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
                title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
              >
                {isCollapsed ? (
                  <PanelRightOpen className="w-4 h-4 text-primary" />
                ) : (
                  <PanelRightClose className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Mobile / POS Close button */}
            <button
              onClick={onClose}
              className={`${isPosMode ? 'flex' : 'lg:hidden'} text-on-surface-variant hover:text-on-surface p-1.5 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer`}
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-4 custom-scrollbar">
          {menuSections.map((section) => {
            const filteredItems = section.items.filter(
              (item) => !item.roles || currentUser?.role === 'developer' || item.roles.includes(currentUser?.role ?? 'seller')
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                {/* Section Title (Hidden when collapsed on desktop) */}
                <p
                  className={`px-3 text-[10px] font-black text-on-surface-variant/60 tracking-wider mb-1.5 font-cairo ${
                    !isPosMode && isCollapsed ? 'lg:hidden' : 'block'
                  }`}
                >
                  {section.title}
                </p>

                {filteredItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (isPosMode || window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    title={!isPosMode && isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        !isPosMode && isCollapsed
                          ? 'lg:justify-center lg:p-2.5 px-3 py-2 justify-between'
                          : 'justify-between px-3 py-2.5'
                      } ${
                        isActive
                          ? 'bg-primary text-on-primary font-bold shadow-md shadow-primary/20 scale-[1.01]'
                          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div
                          className={`flex items-center gap-2.5 ${
                            !isPosMode && isCollapsed ? 'lg:gap-0' : ''
                          }`}
                        >
                          <item.icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? 'text-on-primary stroke-[2.5]' : 'text-on-surface-variant group-hover:text-primary'
                            }`}
                          />
                          <span className={`${!isPosMode && isCollapsed ? 'lg:hidden' : 'inline'}`}>
                            {item.label}
                          </span>
                        </div>

                        {isActive && (
                          <ChevronLeft
                            className={`w-3.5 h-3.5 stroke-[3] text-on-primary/80 shrink-0 ${
                              !isPosMode && isCollapsed ? 'lg:hidden' : 'block'
                            }`}
                          />
                        )}

                        {/* Badge if present and expanded */}
                        {item.badge && (!isCollapsed || isPosMode) && (
                          <span
                            className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md ${
                              isActive
                                ? 'bg-black/25 text-white'
                                : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Footer: User profile & Logout */}
        <div className="p-2.5 border-t border-outline-variant/15 bg-surface-container-lowest/60 shrink-0">
          <div
            className={`flex items-center rounded-2xl bg-surface-container-low border border-outline-variant/15 p-2 ${
              !isPosMode && isCollapsed ? 'lg:justify-center lg:p-1.5' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div
                className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20 shrink-0"
                title={currentUser?.name || 'مستخدم'}
              >
                {currentUser?.name?.charAt(0) || 'U'}
              </div>

              <div className={`overflow-hidden min-w-0 ${!isPosMode && isCollapsed ? 'lg:hidden' : 'block'}`}>
                <p className="text-xs font-bold text-on-surface truncate font-cairo leading-tight">
                  {currentUser?.name || 'كاشير'}
                </p>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                  <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">
                    {currentUser?.role === 'developer'
                      ? 'مطور النظام'
                      : currentUser?.role === 'admin'
                      ? 'مدير'
                      : currentUser?.role === 'cashier'
                      ? 'كاشير'
                      : 'بائع'}
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className={`p-1.5 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors cursor-pointer shrink-0 ${
                !isPosMode && isCollapsed ? 'lg:hidden' : 'block'
              }`}
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
