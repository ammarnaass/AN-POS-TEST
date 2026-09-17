import React from 'react';
import { Lock } from 'lucide-react';
import type { TabItem } from './CategoryGroupsNav';

interface SubTabsRibbonProps {
  displayedTabs: TabItem[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  isExpiredAndLocked: boolean;
  onBlockedTabClick?: () => void;
}

export default function SubTabsRibbon({
  displayedTabs,
  activeTab,
  setActiveTab,
  isExpiredAndLocked,
  onBlockedTabClick,
}: SubTabsRibbonProps) {
  return (
    <div className="p-2.5 sm:p-3 bg-surface-container-low/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
      {/* Subtabs horizontal strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0" role="tablist" aria-label="التبويبات الفرعية">
        {displayedTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isTabDisabled = isExpiredAndLocked && tab.id !== 'activation';

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={isTabDisabled}
              type="button"
              onClick={() => {
                if (isTabDisabled) {
                  onBlockedTabClick?.();
                  return;
                }
                setActiveTab(tab.id);
              }}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 min-h-[44px] rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors duration-150 shrink-0 font-cairo ${
                isActive
                  ? 'bg-primary text-on-primary shadow-sm shadow-primary/25 border border-primary/30 cursor-default'
                  : isTabDisabled
                  ? 'opacity-40 text-on-surface-variant bg-surface-container/20 cursor-not-allowed border border-transparent'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container bg-surface-container/50 border border-outline-variant/15 active:bg-surface-container-high cursor-pointer'
              }`}
            >
              {isTabDisabled ? (
                <Lock className="w-4 h-4 text-rose-500 shrink-0" />
              ) : (
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-on-primary' : 'text-primary'}`} />
              )}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-black leading-none ${
                    isActive ? 'bg-white/20 text-white border border-white/30' : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Status & Database Pill */}
      <div className="flex items-center gap-2 sm:gap-3 px-3.5 py-2 min-h-[44px] rounded-xl sm:rounded-2xl bg-surface-container/70 border border-outline-variant/20 text-xs text-on-surface-variant shrink-0 justify-between md:justify-start">
        <div className="flex items-center gap-1.5 font-mono font-bold text-on-surface">
          <span className="text-[11px] text-on-surface-variant/70">الإصدار</span>
          <span className="px-1.5 py-0.5 rounded-md bg-surface-container-highest border border-outline-variant/30 text-[11px] font-bold">v1.0.0</span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/50" />
        <span className="flex items-center gap-2 text-emerald-500 font-bold font-cairo">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
          قاعدة بيانات جاهزة
        </span>
      </div>
    </div>
  );
}
