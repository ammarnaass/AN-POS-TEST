// Tab Component: UpdatesTab (Refactored from SettingsPage.tsx)
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface UpdatesTabProps {
  [key: string]: any;
}

export default function UpdatesTab({
  addNotification
}: UpdatesTabProps) {
  return (
    <div className="space-y-6">
            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              <div className="flex items-center gap-3 mb-6">
                <RefreshCw className="w-5 h-5 text-primary" />
                <h2 className="font-headline-lg text-headline-lg text-on-surface">التحديثات</h2>
              </div>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-tertiary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-tertiary" />
                </div>
                <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-2">الإصدار الحالي: v1.0.0</h3>
                <p className="text-body-md text-on-surface-variant mb-6">لا توجد تحديثات متاحة حالياً</p>
                <button onClick={() => addNotification({ title: 'تحديث', message: 'انك تستخدم احدث إصدار', type: 'success' })}
                  className="px-6 py-3 bg-primary text-on-primary rounded-lg text-label-md hover:bg-primary-container transition-all shadow-md">
                  فحص التحديثات
                </button>
              </div>
            </div>

            <div className="glass-card rounded-xl border border-outline-variant/20 p-6">
              <h3 className="font-cairo text-headline-sm font-bold text-on-surface mb-4">سجل التحديثات</h3>
              <div className="space-y-3">
                {[
                  { version: 'v1.0.0', date: '2026-07-02', changes: 'الإصدار الأولي - نظام نقاط البيع' },
                ].map((release) => (
                  <div key={release.version} className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg">
                    <div>
                      <p className="text-label-md text-on-surface">{release.version}</p>
                      <p className="text-body-sm text-on-surface-variant">{release.changes}</p>
                    </div>
                    <span className="text-body-sm text-outline">{release.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
  );
}
