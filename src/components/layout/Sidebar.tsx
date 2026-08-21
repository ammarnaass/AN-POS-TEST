import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { useAuthStore } from '@/store/authStore';
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
  ChevronLeft,
  Zap,
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
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user: currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const shopName = rawSettings?.shopName || 'AN POS';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* خلفية التعتيم على الشاشات الصغيرة */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* الشريط الجانبي الرئيسي */}
      <aside
        className={`fixed top-0 right-0 h-full w-[280px] bg-surface-container-low/95 backdrop-blur-xl border-l border-outline-variant/20 z-50 flex flex-col transition-transform duration-300 shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* ── رأس القائمة مع اسم المحل والشعار ───────────────────────── */}
        <div className="p-5 flex items-center justify-between border-b border-outline-variant/15">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-md shadow-primary/25">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-black text-on-surface font-cairo tracking-tight leading-none">
                {shopName}
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-on-surface-variant/80 flex items-center gap-1">
                  <span>متزامن مع الهاتف</span>
                  <Smartphone className="w-3 h-3 text-primary" />
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-on-surface-variant hover:text-on-surface p-1.5 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── عناصر التنقل المقسمة لمجموعات ───────────────────────────── */}
        <nav className="flex-1 overflow-y-auto p-3.5 space-y-5 custom-scrollbar">
          {menuSections.map((section) => {
            const filteredItems = section.items.filter(
              (item) => !item.roles || item.roles.includes(currentUser?.role ?? 'seller')
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[11px] font-black text-on-surface-variant/60 tracking-wider mb-2 font-cairo">
                  {section.title}
                </p>
                {filteredItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-primary text-on-primary font-bold shadow-md shadow-primary/20 scale-[1.01]'
                          : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                              isActive ? 'text-on-primary stroke-[2.5]' : 'text-on-surface-variant group-hover:text-primary'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        {isActive && <ChevronLeft className="w-4 h-4 stroke-[3] text-on-primary/80" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* ── بطاقة المستخدم وتسجيل الخروج في الأسفل ───────────────────── */}
        <div className="p-3.5 border-t border-outline-variant/15 bg-surface-container-lowest/60">
          <div className="flex items-center justify-between p-2 rounded-2xl bg-surface-container-low border border-outline-variant/15">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm border border-primary/20 shrink-0">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-on-surface truncate font-cairo">
                  {currentUser?.name || 'كاشير رئيسي'}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <ShieldCheck className="w-3 h-3" />
                  <span>
                    {currentUser?.role === 'admin'
                      ? 'مدير النظام'
                      : currentUser?.role === 'cashier'
                      ? 'كاشير'
                      : 'بائع'}
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors cursor-pointer"
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
