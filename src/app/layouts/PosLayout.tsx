import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/app/guards/AuthGuard';
import TrialBanner from '@/components/trial/TrialBanner';
import ActivationLockModal from '@/components/license/ActivationLockModal';
import { getTrialState } from '@/services/trialService';
import { isLicensed } from '@/services/licenseService';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';

export default function PosLayout() {
  const { isOpen, close } = useSidebarStore();
  const { user: currentUser } = useAuthStore();

  const isDeveloper = currentUser?.role === 'developer';
  const [trial, setTrial] = useState(() => getTrialState(currentUser?.role));
  const isExpiredAndLocked = !isDeveloper && !isLicensed() && trial.isExpired;
  const showTrialBanner = !isDeveloper && !isLicensed() && trial.isActive;

  useEffect(() => {
    setTrial(getTrialState(currentUser?.role));
  }, [currentUser?.role]);

  // فحص دوري لانتهاء الـ 7 أيام
  useEffect(() => {
    if (isDeveloper || isLicensed()) return;

    const timer = setInterval(() => {
      setTrial(getTrialState(currentUser?.role));
    }, 2000);
    return () => clearInterval(timer);
  }, [isDeveloper, currentUser?.role]);

  return (
    <AuthGuard>
      {/* قفل واجهة نقطة البيع بالكامل عند انتهاء التجربة وإلزام التفعيل */}
      {isExpiredAndLocked && (
        <ActivationLockModal onActivated={() => window.location.reload()} />
      )}

      <div className={`flex h-screen w-screen flex-col overflow-hidden bg-background ${isExpiredAndLocked ? 'pointer-events-none select-none blur-[2px]' : ''}`} dir="rtl">
        {/* شريط التنبيه أثناء سريان التجربة في نقطة البيع */}
        {showTrialBanner && <TrialBanner />}

        <div className="flex-1 flex min-w-0 h-full overflow-hidden">
          {/* On POS screens, the sidebar is an off-canvas drawer that opens when invoked, saving 100% width for cashier */}
          <Sidebar isOpen={isOpen} onClose={close} isPosMode={true} />
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
