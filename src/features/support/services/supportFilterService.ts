import type { InteractiveGuide, SystemFeature, FaqItem } from '../types';

/**
 * تصفية أدلة التشغيل حسب التصنيف وكلمات البحث
 */
export function filterGuides(
  guides: InteractiveGuide[],
  category: string,
  query: string
): InteractiveGuide[] {
  const normalizedCategory = category.trim();
  const normalizedQuery = query.toLowerCase().trim();

  return guides.filter((guide) => {
    const matchesCategory = normalizedCategory === 'الكل' || guide.category === normalizedCategory;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const inTitle = guide.title.toLowerCase().includes(normalizedQuery);
    const inDesc = guide.shortDesc.toLowerCase().includes(normalizedQuery);
    const inSteps = guide.steps.some(
      (s) => s.title.toLowerCase().includes(normalizedQuery) || s.desc.toLowerCase().includes(normalizedQuery)
    );
    const inShortcuts = guide.shortcuts?.some((sc) => sc.label.toLowerCase().includes(normalizedQuery)) || false;

    return inTitle || inDesc || inSteps || inShortcuts;
  });
}

/**
 * تصفية ميزات النظام حسب التصنيف وكلمات البحث
 */
export function filterFeatures(
  features: SystemFeature[],
  category: string,
  query: string
): SystemFeature[] {
  const normalizedCategory = category.trim();
  const normalizedQuery = query.toLowerCase().trim();

  return features.filter((feat) => {
    const matchesCategory = normalizedCategory === 'الكل' || feat.category === normalizedCategory;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const inTitle = feat.title.toLowerCase().includes(normalizedQuery);
    const inDesc = feat.desc.toLowerCase().includes(normalizedQuery);
    const inHighlights = feat.highlights.some((h) => h.toLowerCase().includes(normalizedQuery));

    return inTitle || inDesc || inHighlights;
  });
}

/**
 * تصفية الأسئلة الشائعة حسب التصنيف والكلمات المفتاحية
 */
export function filterFaqs(
  faqs: FaqItem[],
  category: string,
  query: string
): FaqItem[] {
  const normalizedCategory = category.trim();
  const normalizedQuery = query.toLowerCase().trim();

  return faqs.filter((faq) => {
    const matchesCategory = normalizedCategory === 'الكل' || faq.category === normalizedCategory;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const inQ = faq.q.toLowerCase().includes(normalizedQuery);
    const inA = faq.a.toLowerCase().includes(normalizedQuery);
    const inKeywords = faq.keywords.some((k) => k.toLowerCase().includes(normalizedQuery));

    return inQ || inA || inKeywords;
  });
}

/**
 * تقسيم النص إلى أجزاء لتسليط الضوء على الكلمات المطابقة للبحث
 */
export function splitTextForHighlight(
  text: string,
  query: string
): Array<{ text: string; isMatch: boolean }> {
  if (!query.trim() || !text) {
    return [{ text, isMatch: false }];
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      isMatch: part.toLowerCase() === query.toLowerCase(),
    }));
}
