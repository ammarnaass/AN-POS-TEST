import React from 'react';
import { KeyRound, Server } from 'lucide-react';
import type { ActiveSection } from '../types';

interface SectionTabSwitcherProps {
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
}

export const SectionTabSwitcher: React.FC<SectionTabSwitcherProps> = ({
  activeSection,
  setActiveSection,
}) => {
  return (
    <div className="flex p-1.5 rounded-2xl bg-surface-container-low border border-outline-variant/25 max-w-xl mx-auto shadow-xs">
      <button
        type="button"
        onClick={() => setActiveSection('pairing')}
        className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 cursor-pointer ${
          activeSection === 'pairing'
            ? 'bg-primary text-on-primary shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
        }`}
      >
        <KeyRound className="w-4 h-4" />
        <span>1. اقتران نقطة البيع الفرعية</span>
      </button>

      <button
        type="button"
        onClick={() => setActiveSection('server_info')}
        className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold font-cairo transition-all flex items-center justify-center gap-2 cursor-pointer ${
          activeSection === 'server_info'
            ? 'bg-primary text-on-primary shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
        }`}
      >
        <Server className="w-4 h-4" />
        <span>2. إعداد الخادم الرئيسي ومعلوماته</span>
      </button>
    </div>
  );
};
