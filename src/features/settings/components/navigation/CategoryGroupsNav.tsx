import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export interface TabGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  badge?: string;
  items: TabItem[];
}

interface CategoryGroupsNavProps {
  tabGroups: TabGroup[];
  activeGroup: TabGroup;
  activeTab: string;
  setActiveTab: (id: string) => void;
  navMode: 'grouped' | 'all';
  setNavMode: (mode: 'grouped' | 'all') => void;
  isExpiredAndLocked: boolean;
  onBlockedTabClick?: () => void;
}

export default function CategoryGroupsNav({
  tabGroups,
  activeGroup,
  activeTab,
  setActiveTab,
  navMode,
  setNavMode,
  isExpiredAndLocked,
  onBlockedTabClick,
}: CategoryGroupsNavProps) {
  return (
    <div className="p-2 sm:p-2.5 bg-surface-container-low/40">
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="المجموعات التشغيلية">
        {/* Category Groups Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto">
          {tabGroups.map((group) => {
            const isGroupActive = activeGroup.id === group.id;
            const GroupIcon = group.icon;

            const themeStyles = {
              store_ops: {
                activeIcon: 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30',
                inactiveIcon: 'bg-surface-container text-emerald-600 dark:text-emerald-400',
                activeIndicator: 'bg-emerald-500',
              },
              security_users: {
                activeIcon: 'bg-blue-500/20 text-blue-500 border border-blue-500/30',
                inactiveIcon: 'bg-surface-container text-blue-600 dark:text-blue-400',
                activeIndicator: 'bg-blue-500',
              },
              connectivity_devices: {
                activeIcon: 'bg-sky-500/20 text-sky-500 border border-sky-500/30',
                inactiveIcon: 'bg-surface-container text-sky-600 dark:text-sky-400',
                activeIndicator: 'bg-sky-500',
              },
              system_data: {
                activeIcon: 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
                inactiveIcon: 'bg-surface-container text-amber-600 dark:text-amber-400',
                activeIndicator: 'bg-amber-500',
              },
            }[group.id as 'store_ops' | 'security_users' | 'connectivity_devices' | 'system_data'];

            return (
              <button
                key={group.id}
                id={`group-tab-${group.id}`}
                role="tab"
                aria-selected={isGroupActive}
                aria-controls={`group-panel-${group.id}`}
                tabIndex={isGroupActive ? 0 : -1}
                type="button"
                onClick={() => {
                  if (!group.items.some((i) => i.id === activeTab)) {
                    const targetTab = isExpiredAndLocked
                      ? (group.items.find((i) => i.id === 'activation') || group.items[0])
                      : group.items[0];

                    if (isExpiredAndLocked && targetTab.id !== 'activation') {
                      onBlockedTabClick?.();
                      return;
                    }
                    setActiveTab(targetTab.id);
                  }
                }}
                className={`relative group flex items-center gap-2.5 px-3.5 sm:px-4 py-2.5 min-h-[48px] rounded-2xl font-cairo text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isGroupActive
                    ? 'bg-surface-container-highest text-on-surface shadow-xs border border-outline-variant/30'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 border border-transparent'
                }`}
              >
                {/* Category Icon Badge */}
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  isGroupActive ? themeStyles?.activeIcon : themeStyles?.inactiveIcon
                }`}>
                  <GroupIcon className="w-4 h-4" />
                </div>

                <span>{group.title}</span>

                {/* Badge / Count */}
                {group.badge ? (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-black leading-none ${
                    isGroupActive
                      ? 'bg-primary text-on-primary shadow-2xs'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}>
                    {group.badge}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold leading-none ${
                    isGroupActive
                      ? 'bg-surface-container text-on-surface'
                      : 'bg-surface-container/80 text-on-surface-variant/70'
                  }`}>
                    {group.items.length}
                  </span>
                )}

                {/* Active Accent Underline Indicator */}
                {isGroupActive && (
                  <span className={`absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full ${themeStyles?.activeIndicator || 'bg-primary'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher (تبويبات مصنفة مقابل كافة التبويبات) */}
        <div className="hidden md:flex items-center gap-1 bg-surface-container/60 p-1 rounded-xl border border-outline-variant/15 shrink-0">
          <button
            type="button"
            onClick={() => setNavMode('grouped')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer ${
              navMode === 'grouped'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            تبويبات مصنفة
          </button>
          <button
            type="button"
            onClick={() => setNavMode('all')}
            className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer ${
              navMode === 'all'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            كافة التبويبات ({tabGroups.flatMap((g) => g.items).length})
          </button>
        </div>
      </div>
    </div>
  );
}
