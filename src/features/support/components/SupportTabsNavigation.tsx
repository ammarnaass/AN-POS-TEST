import React from 'react';
import { Bot, BookOpen, Sparkles, HelpCircle, Phone } from 'lucide-react';
import type { ViewTab } from '../types';

interface SupportTabsNavigationProps {
  currentTab: ViewTab;
  setCurrentTab: (tab: ViewTab) => void;
}

export const SupportTabsNavigation: React.FC<SupportTabsNavigationProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  return (
    <div className="flex items-center gap-2 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/20 overflow-x-auto">
      <button
        onClick={() => setCurrentTab('assistant')}
        className={`flex-1 min-w-[190px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          currentTab === 'assistant'
            ? 'bg-gradient-to-r from-primary to-cyan-600 text-white shadow-md shadow-primary/20 scale-[1.02]'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`}
      >
        <Bot className="w-4 h-4 shrink-0" />
        <span>المساعد الفني الذكي (AI)</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block" />
      </button>

      <button
        onClick={() => setCurrentTab('guides')}
        className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          currentTab === 'guides'
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`}
      >
        <BookOpen className="w-4 h-4 shrink-0" />
        <span>أدلة التشغيل التفاعلية</span>
      </button>

      <button
        onClick={() => setCurrentTab('features')}
        className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          currentTab === 'features'
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`}
      >
        <Sparkles className="w-4 h-4 shrink-0" />
        <span>ميزات وقدرات النظام</span>
      </button>

      <button
        onClick={() => setCurrentTab('faqs')}
        className={`flex-1 min-w-[150px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          currentTab === 'faqs'
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`}
      >
        <HelpCircle className="w-4 h-4 shrink-0" />
        <span>الأسئلة الشائعة (FAQ)</span>
      </button>

      <button
        onClick={() => setCurrentTab('contact')}
        className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          currentTab === 'contact'
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        }`}
      >
        <Phone className="w-4 h-4 shrink-0" />
        <span>قنوات الدعم الفني المباشر</span>
      </button>
    </div>
  );
};
