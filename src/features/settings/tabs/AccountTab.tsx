// Tab Component: AccountTab (Refactored from SettingsPage.tsx)
import React from 'react';
import { Shield, User as UserIcon } from 'lucide-react';

interface AccountTabProps {
  [key: string]: any;
}

export default function AccountTab({
  currentUser
}: AccountTabProps) {
  return (
    <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="w-5 h-5 text-primary" />
              <h2 className="font-headline-lg text-headline-lg text-on-surface">الحساب الشخصي</h2>
            </div>
            {currentUser ? (
              <div className="space-y-5">
                <div className="flex items-center gap-5 p-5 bg-surface-container-low rounded-lg">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary"><Shield className="w-8 h-8" /></div>
                  <div>
                    <p className="font-headline-lg text-on-surface">{currentUser.name}</p>
                    <p className="text-body-md text-on-surface-variant">{currentUser.role === 'admin' ? 'مدير النظام' : currentUser.role === 'cashier' ? 'كاشير' : 'بائع'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'اسم المستخدم', value: currentUser.username },
                    { label: 'الدور', value: currentUser.role === 'admin' ? 'مدير' : currentUser.role === 'cashier' ? 'كاشير' : 'بائع' },
                    { label: 'الحالة', value: currentUser.status === 'active' ? 'نشط' : 'غير نشط', isBadge: true, active: currentUser.status === 'active' },
                    { label: 'الرمز السري', value: '••••••' },
                  ].map((item) => (
                    <div key={item.label} className="bg-surface-container-low rounded-lg p-4">
                      <p className="text-body-sm text-on-surface-variant mb-1.5">{item.label}</p>
                      {item.isBadge ? (
                        <span className={`inline-block px-3 py-1 rounded-full text-body-sm text-label-sm ${item.active ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>{item.value}</span>
                      ) : (
                        <p className="text-label-md text-on-surface">{item.value}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant">لم يتم تسجيل الدخول</p>
            )}
          </div>
  );
}
