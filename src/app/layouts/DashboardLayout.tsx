import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import AuthGuard from '@/app/guards/AuthGuard';
import TrialBanner from '@/components/trial/TrialBanner';
import TrialNotification from '@/components/trial/TrialNotification';
import ActivationLockModal from '@/components/license/ActivationLockModal';
import { getTrialState, clearTrial } from '@/services/trialService';
import { isLicensed } from '@/services/licenseService';
import { useAuthStore } from '@/store/authStore';
import { usePrintQueueSweep } from '@/services/print/usePrintQueue';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user: currentUser, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const isDeveloper = currentUser?.role === 'developer';
  const [trial, setTrial] = useState(() => getTrialState(currentUser?.role));
  const isExpiredAndLocked = !isDeveloper && !isLicensed() && trial.isExpired;

  // شريط التجربة يظهر دائماً لكل الحسابات (عدا المطور) حتى يتم التفعيل
  const showTrialBanner = !isDeveloper && !isLicensed() && trial.isActive;

  // POS-PRINT-001 Phase 2 (BR-004/005): TTL sweep + إعادة المعالجة عند تنشيط التبويب
  usePrintQueueSweep();

  // مزامنة حالة التجربة عند تغيير المستخدم
  useEffect(() => {
    setTrial(getTrialState(currentUser?.role));
  }, [currentUser?.role]);

  // إشعار الترحيب بالتجربة (يظهر مرة واحدة فقط عند أول دخول)
  const [showNotification, setShowNotification] = useState(() => {
    if (!isDeveloper && !isLicensed() && trial.isActive) {
      const notifDismissed = localStorage.getItem('anpos_trial_notif_dismissed');
      return !notifDismissed;
    }
    return false;
  });

  // فحص انتهاء مدة الـ 7 أيام دورياً لكافة الحسابات ما عدا حساب المطور
  useEffect(() => {
    if (isDeveloper || isLicensed()) return;

    const timer = setInterval(() => {
      const state = getTrialState(currentUser?.role);
      setTrial(state);
    }, 2000);
    return () => clearInterval(timer);
  }, [isDeveloper, currentUser?.role]);

  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false);
        localStorage.setItem('anpos_trial_notif_dismissed', 'true');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  const dismissNotification = () => {
    setShowNotification(false);
    localStorage.setItem('anpos_trial_notif_dismissed', 'true');
  };

  return (
    <AuthGuard>
      {/* نافذة قفل التطبيق وإلزام التفعيل عند انتهاء فترة الـ 7 أيام (لكل الحسابات عدا المطور) */}
      {isExpiredAndLocked && (
        <ActivationLockModal onActivated={() => window.location.reload()} />
      )}

      {/* إشعار ترحيب بالتجربة (يظهر مرة واحدة فقط ثم يختفي تلقائياً) */}
      {!isDeveloper && !isLicensed() && showNotification && (
        <TrialNotification onClose={dismissNotification} />
      )}

      <div className={`flex h-screen overflow-hidden bg-background ${isExpiredAndLocked ? 'pointer-events-none select-none blur-[2px]' : ''}`} dir="rtl">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* شريط التجربة الدائم - لا يُحذف إلا بعد تفعيل الترخيص */}
          {showTrialBanner && <TrialBanner />}
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-24 lg:pb-6 bg-background custom-scrollbar">
            <div className="max-w-[1920px] w-full mx-auto space-y-4 sm:space-y-6">
              <Outlet />
            </div>
          </main>
          <MobileNav />
        </div>
      </div>
    </AuthGuard>
  );
}
