import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/app/guards/AuthGuard';
import { useSidebarStore } from '@/store/sidebarStore';

export default function PosLayout() {
  const { isOpen, close } = useSidebarStore();

  return (
    <AuthGuard>
      <div className="flex h-screen w-screen overflow-hidden bg-background" dir="rtl">
        {/* On POS screens, the sidebar is an off-canvas drawer that opens when invoked, saving 100% width for cashier */}
        <Sidebar isOpen={isOpen} onClose={close} isPosMode={true} />
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <Outlet />
        </div>
      </div>
    </AuthGuard>
  );
}
