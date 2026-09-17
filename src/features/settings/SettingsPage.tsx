import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Store, ShoppingCart, FileText, Users, Globe, Smartphone,
  HardDrive, Key, RefreshCw, User as UserIcon, Shield, Wifi,
} from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { useLicenseActivation } from './hooks/useLicenseActivation';
import { useNetworkServer } from './hooks/useNetworkServer';
import { useUsersAndRoles } from './hooks/useUsersAndRoles';
import SettingsHeader from './components/navigation/SettingsHeader';
import CategoryGroupsNav, { type TabGroup } from './components/navigation/CategoryGroupsNav';
import SubTabsRibbon from './components/navigation/SubTabsRibbon';

// Lazy-loaded tab components for maximum performance and fast initial rendering
const ActivationTab = lazy(() => import('./tabs/ActivationTab'));
const GeneralTab = lazy(() => import('./tabs/GeneralTab'));
const PosSettingsTab = lazy(() => import('./tabs/PosSettingsTab'));
const InvoicesTab = lazy(() => import('./tabs/InvoicesTab'));
const UsersRolesTab = lazy(() => import('./tabs/UsersRolesTab'));
const NetworkTab = lazy(() => import('./tabs/NetworkTab'));
const ExportBackupTab = lazy(() => import('./tabs/ExportBackupTab'));
const MobileDevicesTab = lazy(() => import('./tabs/MobileDevicesTab'));
const UpdatesTab = lazy(() => import('./tabs/UpdatesTab'));
const AccountTab = lazy(() => import('./tabs/AccountTab'));

function TabLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant gap-3 min-h-[350px]">
      <div className="w-9 h-9 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-sm font-medium font-tajawal">جارٍ تحميل القسم...</span>
    </div>
  );
}

export default function SettingsPage() {
  const location = useLocation();
  const { addNotification } = useNotificationStore();

  const { isDeveloper, isLicenseActive, trial, isExpiredAndLocked } = useLicenseActivation();
  const { serverStatus, mobilePhones } = useNetworkServer();
  const { users } = useUsersAndRoles();

  const [activeTab, setActiveTab] = useState<string>(() => {
    const t = (location.state as { tab?: string } | null)?.tab;
    const known = ['activation', 'general', 'pos', 'invoices', 'users', 'network', 'export', 'mobile', 'updates', 'account'];
    return t && known.includes(t) ? t : 'activation';
  });

  const [navMode, setNavMode] = useState<'grouped' | 'all'>('grouped');

  // Enforce license lock redirection if trial expired
  useEffect(() => {
    if (isExpiredAndLocked && activeTab !== 'activation') {
      setActiveTab('activation');
    }
  }, [isExpiredAndLocked, activeTab]);

  const handleBlockedTabClick = () => {
    addNotification({
      title: 'النظام متوقف',
      message: 'انتهت فترة التجربة المجانية (7 أيام). يرجى تفعيل الترخيص أولاً للمتابعة.',
      type: 'warning',
    });
  };

  const tabGroups: TabGroup[] = [
    {
      id: 'store_ops',
      title: 'المتجر والعمليات',
      icon: Store,
      badge: undefined,
      items: [
        { id: 'general', label: 'الإعدادات العامة', icon: Store, badge: undefined },
        { id: 'pos', label: 'نقطة البيع (POS)', icon: ShoppingCart, badge: undefined },
        { id: 'invoices', label: 'الفواتير والطباعة', icon: FileText, badge: undefined },
      ],
    },
    {
      id: 'security_users',
      title: 'الأمان والمستخدمون',
      icon: Shield,
      badge: users.length > 0 ? `${users.length}` : '6',
      items: [
        { id: 'users', label: 'المستخدمون والأدوار', icon: Users, badge: users.length > 0 ? `${users.length}` : '6' },
      ],
    },
    {
      id: 'connectivity_devices',
      title: 'الاتصال والأجهزة',
      icon: Wifi,
      badge: mobilePhones.length > 0 ? `${mobilePhones.length}` : '2',
      items: [
        { id: 'network', label: 'الشبكة والخادم المحلي', icon: Globe, badge: serverStatus?.running ? 'نشط' : undefined },
        { id: 'mobile', label: 'تطبيق الهاتف المقترن', icon: Smartphone, badge: mobilePhones.length > 0 ? `${mobilePhones.length}` : '2' },
      ],
    },
    {
      id: 'system_data',
      title: 'النظام والبيانات',
      icon: HardDrive,
      badge: isDeveloper ? 'مطور' : isLicenseActive ? 'مفعّل' : trial.isActive ? 'تجريبي' : 'مطور',
      items: [
        { id: 'export', label: 'النسخ الاحتياطي والبيانات', icon: HardDrive, badge: undefined },
        { id: 'activation', label: 'تفعيل الترخيص', icon: Key, badge: isDeveloper ? 'مطور' : isLicenseActive ? 'مفعّل' : trial.isActive ? 'تجريبي' : 'مطور' },
        { id: 'updates', label: 'تحديثات النظام', icon: RefreshCw, badge: undefined },
        { id: 'account', label: 'الملف والحساب', icon: UserIcon, badge: undefined },
      ],
    },
  ];

  const activeGroup = tabGroups.find((g) => g.items.some((item) => item.id === activeTab)) || tabGroups[0];
  const displayedTabs = navMode === 'grouped' ? activeGroup.items : tabGroups.flatMap((g) => g.items);

  return (
    <div className="min-h-screen bg-background p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full" dir="rtl">
      {/* Header Banner with server pulse & license badge */}
      <SettingsHeader
        serverStatus={serverStatus}
        isDeveloper={isDeveloper}
        isLicenseActive={isLicenseActive}
        trial={trial}
      />

      {/* Horizontal Tabs Navigation (Unified Multi-Tier Command Hub) */}
      <nav aria-label="أقسام الإعدادات" className="bg-surface-container-low/95 backdrop-blur-xl border border-outline-variant/25 rounded-3xl shadow-sm overflow-hidden divide-y divide-outline-variant/15">
        {/* Tier 1: Category Groups */}
        <CategoryGroupsNav
          tabGroups={tabGroups}
          activeGroup={activeGroup}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          navMode={navMode}
          setNavMode={setNavMode}
          isExpiredAndLocked={isExpiredAndLocked}
          onBlockedTabClick={handleBlockedTabClick}
        />

        {/* Tier 2: Sub-Tabs Horizontal Ribbon */}
        <SubTabsRibbon
          displayedTabs={displayedTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isExpiredAndLocked={isExpiredAndLocked}
          onBlockedTabClick={handleBlockedTabClick}
        />
      </nav>

      {/* Active Section Breadcrumbs */}
      <div className="flex items-center justify-between px-2 text-xs text-on-surface-variant font-tajawal">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary font-cairo">{activeGroup.title}</span>
          <span className="text-outline-variant/60">←</span>
          <span className="font-bold text-on-surface font-cairo">
            {tabGroups.flatMap((g) => g.items).find((i) => i.id === activeTab)?.label}
          </span>
        </div>
        <div className="text-[11px] text-on-surface-variant/70 hidden sm:block">
          انقر على التبويبات أعلاه للتنقل السريع بين أقسام الإعدادات
        </div>
      </div>

      {/* Main Tab Panel with Suspense fallback */}
      <main id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="w-full min-w-0">
        <Suspense fallback={<TabLoadingSkeleton />}>
          {activeTab === 'activation' && <ActivationTab />}
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'pos' && <PosSettingsTab />}
          {activeTab === 'invoices' && <InvoicesTab />}
          {activeTab === 'users' && <UsersRolesTab />}
          {activeTab === 'network' && <NetworkTab />}
          {activeTab === 'export' && <ExportBackupTab />}
          {activeTab === 'mobile' && <MobileDevicesTab />}
          {activeTab === 'updates' && <UpdatesTab addNotification={addNotification} />}
          {activeTab === 'account' && <AccountTab />}
        </Suspense>
      </main>
    </div>
  );
}
