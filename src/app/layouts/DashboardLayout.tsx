import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import MobileNav from '@/components/layout/MobileNav';
import AuthGuard from '@/app/guards/AuthGuard';
import TrialBanner from '@/components/trial/TrialBanner';
import TrialNotification from '@/components/trial/TrialNotification';
import { getTrialState, clearTrial } from '@/services/trialService';
import { useAuthStore } from '@/store/authStore';
import { usePrintQueueSweep } from '@/services/print/usePrintQueue';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const trial = getTrialState();

  // POS-PRINT-001 Phase 2 (BR-004/005): TTL sweep + إعادة المعالجة عند تنشيط التبويب
  usePrintQueueSweep();

  const [showNotification, setShowNotification] = useState(() => {
    if (!isAuthenticated && trial.isActive) {
      const notifDismissed = localStorage.getItem('anpos_trial_notif_dismissed');
      return !notifDismissed;
    }
    return false;
  });

  const [showBanner, setShowBanner] = useState(() => {
    if (!isAuthenticated && trial.isActive) {
      const bannerDismissed = localStorage.getItem('anpos_trial_banner_dismissed');
      return !bannerDismissed;
    }
    return false;
  });

  // Check trial expiration every second
  useEffect(() => {
    if (isAuthenticated) return; // No trial check for logged-in users

    const timer = setInterval(() => {
      const state = getTrialState();
      if (state.isExpired) {
        clearTrial();
        logout();
        navigate('/login', { replace: true });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isAuthenticated, logout, navigate]);

  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setShowNotification(false);
        localStorage.setItem('anpos_trial_notif_dismissed', 'true');
        setShowBanner(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem('anpos_trial_banner_dismissed', 'true');
  }, []);

  const dismissNotification = useCallback(() => {
    setShowNotification(false);
    localStorage.setItem('anpos_trial_notif_dismissed', 'true');
    setShowBanner(true);
  }, []);

  return (
    <AuthGuard>
      {showNotification && <TrialNotification onClose={dismissNotification} />}
      {showBanner && trial.isActive && (
        <TrialBanner onDismiss={dismissBanner} />
      )}
      <div className="flex h-screen overflow-hidden bg-background" dir="rtl">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
