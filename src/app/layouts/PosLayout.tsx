import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/app/guards/AuthGuard';
import { useSidebarStore } from '@/store/sidebarStore';

export default function PosLayout() {
  const { isOpen, close } = useSidebarStore();

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background" dir="rtl">
        <Sidebar isOpen={isOpen} onClose={close} />
        <div className="flex-1 min-w-0 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </AuthGuard>
  );
}
