import { useState, useMemo } from 'react';
import type { CategoryType, InteractiveGuide, FaqItem } from '../types';
import { SUPPORT_GUIDES, SUPPORT_FEATURES, SUPPORT_FAQS } from '../constants';
import { filterGuides, filterFeatures, filterFaqs } from '../services/supportFilterService';

export function useSupportFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('الكل');
  const [activeGuideId, setActiveGuideId] = useState<string>(SUPPORT_GUIDES[0]?.id || '');
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});

  const filteredGuides = useMemo(() => {
    return filterGuides(SUPPORT_GUIDES, activeCategory, searchQuery);
  }, [activeCategory, searchQuery]);

  const filteredFeatures = useMemo(() => {
    return filterFeatures(SUPPORT_FEATURES, activeCategory, searchQuery);
  }, [activeCategory, searchQuery]);

  const filteredFaqs = useMemo(() => {
    return filterFaqs(SUPPORT_FAQS, activeCategory, searchQuery);
  }, [activeCategory, searchQuery]);

  const activeGuide = useMemo<InteractiveGuide>(() => {
    return (
      SUPPORT_GUIDES.find((g) => g.id === activeGuideId) ||
      filteredGuides[0] ||
      SUPPORT_GUIDES[0]
    );
  }, [activeGuideId, filteredGuides]);

  const totalResultsCount = filteredGuides.length + filteredFeatures.length + filteredFaqs.length;

  const handleCopyText = (text: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleCopyFaq = (faq: FaqItem) => {
    const textToCopy = `س: ${faq.q}\n\nج: ${faq.a}\n\n(مرجع الدعم الفني: AN POS)`;
    handleCopyText(textToCopy, faq.id);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbackGiven((prev) => ({ ...prev, [id]: type }));
  };

  const resetFilters = () => {
    setSearchQuery('');
    setActiveCategory('الكل');
  };

  return {
    searchQuery,
    setSearchQuery,
    activeCategory,
    setActiveCategory,
    activeGuideId,
    setActiveGuideId,
    activeGuide,
    openFaq,
    setOpenFaq,
    copiedId,
    feedbackGiven,
    filteredGuides,
    filteredFeatures,
    filteredFaqs,
    totalResultsCount,
    handleCopyText,
    handleCopyFaq,
    handleFeedback,
    resetFilters,
  };
}
