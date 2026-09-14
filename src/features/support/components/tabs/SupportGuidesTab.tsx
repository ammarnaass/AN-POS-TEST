import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  AlertCircle,
  ArrowUpRight,
  Zap,
  Compass,
  Sparkles,
} from 'lucide-react';
import type { InteractiveGuide } from '../../types';
import { SupportHighlightText } from '../SupportHighlightText';

interface SupportGuidesTabProps {
  filteredGuides: InteractiveGuide[];
  activeGuide: InteractiveGuide;
  setActiveGuideId: (id: string) => void;
  searchQuery: string;
  resetFilters: () => void;
}

export const SupportGuidesTab: React.FC<SupportGuidesTabProps> = ({
  filteredGuides,
  activeGuide,
  setActiveGuideId,
  searchQuery,
  resetFilters,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            أدلة تشغيل النظام خطوة بخطوة
          </h2>
          <p className="text-xs text-on-surface-variant">
            اختر مسار العمل المطلوب لتتعلم كيفية تنفيذه بأعلى كفاءة وأسرع طريقة مع اختصارات لوحة المفاتيح
          </p>
        </div>
        <span className="text-xs font-semibold text-on-surface-variant/80 bg-surface-container-high px-3 py-1 rounded-full w-fit">
          {filteredGuides.length} أدلة متاحة
        </span>
      </div>

      {filteredGuides.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-on-surface">لم يتم العثور على أدلة تطابق بحثك</h3>
          <p className="text-xs text-on-surface-variant">جرب كلمة بحث أخرى أو اختر تصنيف "الكل".</p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            إعادة ضبط الفلتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Guides Navigation List */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {filteredGuides.map((guide) => {
              const IconComponent = guide.icon;
              const isSelected = activeGuide.id === guide.id;
              return (
                <button
                  key={guide.id}
                  onClick={() => setActiveGuideId(guide.id)}
                  className={`w-full text-right p-4 rounded-2xl transition-all border flex items-start gap-3.5 cursor-pointer ${
                    isSelected
                      ? 'bg-surface-container-highest border-primary/50 shadow-md shadow-primary/5 ring-1 ring-primary/20'
                      : 'bg-surface-container/60 hover:bg-surface-container border-outline-variant/15'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border shrink-0 ${guide.iconBg}`}>
                    <IconComponent className={`w-5 h-5 ${guide.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-sm font-bold text-on-surface truncate font-cairo">
                        <SupportHighlightText text={guide.title} query={searchQuery} />
                      </h4>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-medium shrink-0">
                        {guide.timeEstimate}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                      <SupportHighlightText text={guide.shortDesc} query={searchQuery} />
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Guide Detailed Interactive Card */}
          <div className="lg:col-span-7">
            <div className="glass-card rounded-3xl p-6 md:p-8 border border-primary/20 bg-surface-container/80 space-y-6 h-full flex flex-col justify-between">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/10 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-2xl border ${activeGuide.iconBg}`}>
                      {(() => {
                        const ActiveIcon = activeGuide.icon;
                        return <ActiveIcon className={`w-6 h-6 ${activeGuide.iconColor}`} />;
                      })()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {activeGuide.category}
                        </span>
                        <span className="text-xs text-on-surface-variant">المدة التقريبية: {activeGuide.timeEstimate}</span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-on-surface font-cairo mt-1">
                        <SupportHighlightText text={activeGuide.title} query={searchQuery} />
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(activeGuide.route)}
                    className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>{activeGuide.routeLabel}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Shortcuts Row */}
                {activeGuide.shortcuts && activeGuide.shortcuts.length > 0 && (
                  <div className="p-4 rounded-2xl bg-surface-container-high/70 border border-outline-variant/15 space-y-2">
                    <div className="text-xs font-bold text-on-surface font-cairo flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>أهم الاختصارات السريعة المرتبطة بهذه الميزة:</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activeGuide.shortcuts.map((sc, i) => (
                        <div
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                        >
                          <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px] border border-outline-variant/30">
                            {sc.key}
                          </kbd>
                          <span className="text-on-surface-variant font-cairo">{sc.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Steps List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-on-surface font-cairo flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" />
                    <span>خطوات التنفيذ العملية:</span>
                  </h4>

                  <div className="space-y-3">
                    {activeGuide.steps.map((step, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-surface-container-lowest/60 border border-outline-variant/15 flex items-start gap-3.5"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="text-sm font-bold text-on-surface font-cairo">
                              <SupportHighlightText text={step.title} query={searchQuery} />
                            </h5>
                            {step.badge && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 text-[10px] font-bold">
                                {step.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            <SupportHighlightText text={step.desc} query={searchQuery} />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro Tip Box */}
                {activeGuide.proTip && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-200">
                    <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold font-cairo">نصيحة تقنية من المطور: </span>
                      <span className="leading-relaxed">{activeGuide.proTip}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
