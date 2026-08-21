import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  MoreHorizontal,
} from 'lucide-react';

const navItems = [
  { path: '/pos', label: 'البيع', icon: ShoppingCart },
  { path: '/', label: 'الإحصائيات', icon: LayoutDashboard },
  { path: '/inventory', label: 'المخزون', icon: Package },
  { path: '/sales', label: 'المبيعات', icon: Receipt },
  { path: '/customers', label: 'الزبائن', icon: Users },
  { path: '/settings', label: 'المزيد', icon: MoreHorizontal },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container/95 backdrop-blur-lg border-t border-outline-variant/20 z-50 no-print lg:hidden safe-area-bottom shadow-elevated-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-primary bg-primary-container/15'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
