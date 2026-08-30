import { Navigate, Outlet } from 'react-router-dom';
import { getTrialState } from '@/services/trialService';
import { useAuthStore } from '@/store/authStore';

const SETUP_FLAG = 'anpos_setup_completed';

export function isFirstRun(): boolean {
  return !localStorage.getItem(SETUP_FLAG);
}

export function completeFirstRun(): void {
  localStorage.setItem(SETUP_FLAG, 'true');
}

export function isTrialActive(): boolean {
  return getTrialState().isActive;
}

export default function FirstRunGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const trial = getTrialState();

  if (isAuthenticated || trial.isActive) {
    return <Outlet />;
  }

  return <Navigate to="/login" replace />;
}
