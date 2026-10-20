import { Navigate, Outlet } from 'react-router-dom';
import { getTrialState } from '@/services/trialService';
import { useAuthStore } from '@/store/authStore';

/**
 * بوابة صفحات التطبيق: تسمح بالوصول عند تسجيل الدخول أو وجود تجربة نشطة.
 *
 * ملاحظة: فحص «التشغيل الأول» أصبح مسؤولية LoginPage عبر system.isFirstRun
 * (config.json + جدول settings + كشف رمز المدير الافتراضي)، وأُزيلت من هنا
 * الدوال الميتة (isFirstRun / checkDesktopFirstRun / completeFirstRun / isTrialActive).
 */
export default function FirstRunGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const trial = getTrialState();

  if (isAuthenticated || trial.isActive) {
    return <Outlet />;
  }

  return <Navigate to="/login" replace />;
}
