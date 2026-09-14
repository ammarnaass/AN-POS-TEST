import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { SystemFeature } from '../../types';
import { SupportHighlightText } from '../SupportHighlightText';

interface SupportFeaturesTabProps {
  filteredFeatures: SystemFeature[];
  searchQuery: string;
  resetFilters: () => void;
}

export const SupportFeaturesTab: React.FC<SupportFeaturesTabProps> = ({
  filteredFeatures,
  searchQuery,
  resetFilters,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            ميزات وقدرات نظام AN POS
          </h2>
          <p className="text-xs text-on-surface-variant">
            نظرة هندسية شاملة على وحدات النظام الخارقة المصممة لتسريع المحل وضمان استقرار العمل دون توقف
          </p>
        </div>
        <span className="text-xs font-semibold text-on-surface-variant/80 bg-surface-container-high px-3 py-1 rounded-full w-fit">
          {filteredFeatures.length} ميزات معمارية
        </span>
      </div>

      {filteredFeatures.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-on-surface">لم يتم العثور على ميزات تطابق بحثك</h3>
          <p className="text-xs text-on-surface-variant">جرب كلمة بحث أخرى أو اختر تصنيف "الكل".</p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            إعادة ضبط الفلتر
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFeatures.map((feat) => {
            const IconComp = feat.icon;
            return (
              <div
                key={feat.id}
                className="glass-card rounded-3xl p-6 border border-outline-variant/15 hover:border-primary/40 bg-surface-container/60 hover:bg-surface-container transition-all flex flex-col justify-between space-y-5 shadow-sm hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className={`p-3 rounded-2xl border ${feat.iconBg}`}>
                      <IconComp className={`w-6 h-6 ${feat.iconColor}`} />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/20">
                      {feat.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-on-surface font-cairo">
                      <SupportHighlightText text={feat.title} query={searchQuery} />
                    </h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1.5">
                      <SupportHighlightText text={feat.desc} query={searchQuery} />
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-outline-variant/10">
                    <div className="text-[11px] font-bold text-on-surface-variant">أبرز النقاط التقنية:</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {feat.highlights.map((hl, hIdx) => (
                        <div key={hIdx} className="flex items-center gap-2 text-xs text-on-surface">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            <SupportHighlightText text={hl} query={searchQuery} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-outline-variant/10 flex items-center justify-between">
                  <span className="text-[11px] text-on-surface-variant font-medium">{feat.category}</span>
                  <button
                    onClick={() => navigate(feat.route)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    <span>فتح الشاشة</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
