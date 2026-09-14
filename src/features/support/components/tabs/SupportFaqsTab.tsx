import React from 'react';
import {
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
} from 'lucide-react';
import type { FaqItem } from '../../types';
import { SupportHighlightText } from '../SupportHighlightText';

interface SupportFaqsTabProps {
  filteredFaqs: FaqItem[];
  openFaq: string | null;
  setOpenFaq: (id: string | null) => void;
  copiedId: string | null;
  feedbackGiven: Record<string, 'up' | 'down'>;
  searchQuery: string;
  handleCopyFaq: (faq: FaqItem) => void;
  handleFeedback: (id: string, type: 'up' | 'down') => void;
  resetFilters: () => void;
}

export const SupportFaqsTab: React.FC<SupportFaqsTabProps> = ({
  filteredFaqs,
  openFaq,
  setOpenFaq,
  copiedId,
  feedbackGiven,
  searchQuery,
  handleCopyFaq,
  handleFeedback,
  resetFilters,
}) => {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            الأسئلة الشائعة والأجوبة الفورية
          </h2>
          <p className="text-xs text-on-surface-variant">
            إجابات واضحة ومباشرة على أكثر التساؤلات المتكررة حول المحاسبة، أسعار العبوات، والعتاد
          </p>
        </div>
        <span className="text-xs font-semibold text-on-surface-variant/80 bg-surface-container-high px-3 py-1 rounded-full w-fit">
          {filteredFaqs.length} إجابة معتمدة
        </span>
      </div>

      {filteredFaqs.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-on-surface">لم يتم العثور على أسئلة تطابق بحثك</h3>
          <p className="text-xs text-on-surface-variant">جرب كلمة بحث أخرى أو اختر تصنيف "الكل".</p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
          >
            إعادة ضبط الفلتر
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq) => {
            const isOpen = openFaq === faq.id;
            const feedback = feedbackGiven[faq.id];
            const isCopied = copiedId === faq.id;

            return (
              <div
                key={faq.id}
                className={`glass-card rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'border-primary/40 bg-surface-container-high/80 shadow-sm'
                    : 'bg-surface-container/40 hover:bg-surface-container border-outline-variant/15'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between p-4 md:p-5 text-right transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 pr-1">
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm md:text-base font-bold text-on-surface font-cairo">
                      <SupportHighlightText text={faq.q} query={searchQuery} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant hidden sm:inline-block">
                      {faq.category}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-on-surface-variant" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 border-t border-outline-variant/10 space-y-4 text-right">
                    <div className="text-xs md:text-sm text-on-surface-variant leading-relaxed whitespace-pre-line pt-2">
                      <SupportHighlightText text={faq.a} query={searchQuery} />
                    </div>

                    {/* Action & Feedback row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant/10 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface-variant">هل ساعدتك هذه الإجابة؟</span>
                        <button
                          onClick={() => handleFeedback(faq.id, 'up')}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            feedback === 'up'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                              : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/15'
                          }`}
                          title="نعم، كانت مفيدة"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleFeedback(faq.id, 'down')}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            feedback === 'down'
                              ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
                              : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/15'
                          }`}
                          title="لا، غير كافية"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                        {feedback && (
                          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">شكراً لتقييمك!</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyFaq(faq)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/20 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer font-medium"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-700 dark:text-emerald-400 font-bold">تم نسخ الإجابة!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>نسخ الإجابة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
