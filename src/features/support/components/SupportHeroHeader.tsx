import React from 'react';
import { Search, X, BookOpen } from 'lucide-react';
import type { CategoryType, SupportContactInfo } from '../types';
import { SUPPORT_CATEGORIES } from '../types';
import { FacebookIcon, InstagramIcon, YoutubeIcon } from './SupportSocialIcons';

interface SupportHeroHeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: CategoryType;
  setActiveCategory: (cat: CategoryType) => void;
  contactInfo?: SupportContactInfo;
}

export const SupportHeroHeader: React.FC<SupportHeroHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  contactInfo,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 border border-primary/20 bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-low dark:from-surface-container dark:via-surface-container-high/80 dark:to-surface-container shadow-xl backdrop-blur-xl">
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 text-primary dark:text-primary-container border border-primary/25 text-xs font-bold tracking-wide shadow-sm animate-pulse">
          <BookOpen className="w-4 h-4" />
          <span>الدليل التشغيلي المتكامل والمساعد الذكي 2026</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-on-surface font-cairo tracking-tight leading-tight">
          مركز الدعم الفني والمساعد الذكي لنظام <span className="text-primary">AN POS</span>
        </h1>

        <p className="text-sm md:text-base text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          دليلك الشامل لتعلم أسرار تشغيل الكاشير، بيع العبوات والكراتين في تصميم 5، فواتير الجملة، إعدادات الطابعات الحرارية، وربط الهواتف بالشبكة المحلية دون إنترنت.
        </p>

        {/* Global Search Bar */}
        <div className="pt-2 max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن ميزة، اختصار كيبورد، أو حل مشكلة (مثلاً: بيع عبوة، طابعة حرارية، F1)..."
              className="w-full bg-surface-container-lowest/90 border-2 border-outline-variant/30 rounded-2xl pr-12 pl-12 py-3.5 text-sm md:text-base text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-4 focus:ring-primary/15 outline-none transition-all shadow-lg"
            />
            <Search className="w-5 h-5 text-primary absolute right-4 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center justify-center gap-2 pt-2 flex-wrap max-w-4xl mx-auto">
          {SUPPORT_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white shadow-md shadow-primary/25 scale-105'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest border border-outline-variant/15'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Social Media Quick Bar */}
        <div className="flex items-center justify-center gap-2.5 pt-3 flex-wrap text-xs text-on-surface-variant font-medium border-t border-outline-variant/10">
          <span>قنوات ومجتمع المطور:</span>
          <a
            href={contactInfo?.facebookUrl || 'https://facebook.com'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-semibold border border-[#1877F2]/20 transition-all hover:scale-105"
          >
            <FacebookIcon className="w-3.5 h-3.5" />
            <span>فيسبوك</span>
          </a>
          <a
            href={contactInfo?.instagramUrl || 'https://instagram.com/andev2000'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E4405F]/10 hover:bg-[#E4405F]/20 text-[#E4405F] font-semibold border border-[#E4405F]/20 transition-all hover:scale-105"
          >
            <InstagramIcon className="w-3.5 h-3.5" />
            <span>إنستغرام (@andev2000)</span>
          </a>
          <a
            href={contactInfo?.youtubeUrl || 'https://youtube.com/@andev20'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF0000]/10 hover:bg-[#FF0000]/20 text-[#FF0000] font-semibold border border-[#FF0000]/20 transition-all hover:scale-105"
          >
            <YoutubeIcon className="w-3.5 h-3.5" />
            <span>يوتيوب (@andev20)</span>
          </a>
        </div>
      </div>
    </div>
  );
};
