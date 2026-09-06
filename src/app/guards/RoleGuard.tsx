import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function RoleGuard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);

  if (!user || (user.role !== 'developer' && !roles.includes(user.role))) {
    return (
      <div className="flex items-center justify-center h-64 text-on-surface-variant font-headline-md">
        غير مصرح
      </div>
    );
  }

  return <>{children}</>;
}
