import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getTrialState } from '@/services/trialService';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const trial = getTrialState();
  if (trial.isActive) {
    return <>{children}</>;
  }

  return <Navigate to="/login" state={{ from: location }} replace />;
}
