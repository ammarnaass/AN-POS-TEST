import { describe, it, expect } from 'vitest';
import {
  filterGuides,
  filterFeatures,
  filterFaqs,
  splitTextForHighlight,
} from '../services/supportFilterService';
import type { InteractiveGuide, SystemFeature, FaqItem } from '../types';

describe('supportFilterService', () => {
  const mockGuides: InteractiveGuide[] = [
    {
      id: 'g1',
      title: 'دليل نقطة البيع والعبوات',
      category: 'كاشير ومبيعات',
      shortDesc: 'شرح طريقة بيع العبوة بالقطعة أو الحبة',
      targetAudience: 'الكاشير',
      difficulty: 'مبتدئ',
      route: '/pos',
      steps: [
        {
          num: 1,
          title: 'اختيار المنتج',
          desc: 'ابحث عن المنتج بالاسم أو الباركود',
        },
        {
          num: 2,
          title: 'تبديل وحدة البيع',
          desc: 'اضغط على زر كرتونة أو حبة للتبديل السريع',
        },
      ],
      shortcuts: [{ key: 'F2', label: 'فتح السلة' }],
    },
    {
      id: 'g2',
      title: 'إعدادات الطابعة والشبكة',
      category: 'طابعات وأجهزة',
      shortDesc: 'ضبط منفذ Fastify 3000 والطابعة الحرارية',
      targetAudience: 'المشرف',
      difficulty: 'متوسط',
      route: '/settings',
      steps: [
        {
          num: 1,
          title: 'فحص الاتصال',
          desc: 'تأكد من تشغيل الخادم والاتصال بالمنفذ المحلي',
        },
      ],
    },
  ];

  const mockFeatures: SystemFeature[] = [
    {
      id: 'f1',
      title: 'هندسة العبوات وتصميم 5',
      category: 'كاشير ومبيعات',
      desc: 'دعم بيع الكرتونة والباكيت والحبة مع الحساب الآلي للربح',
      status: 'active',
      highlights: ['حساب تلقائي لسعر التكلفة', 'تحديث المخزن فوري'],
    },
    {
      id: 'f2',
      title: 'محرك الطباعة المتقدم',
      category: 'طابعات وأجهزة',
      desc: 'طباعة الفواتير على مقاس 80mm و 58mm و A4',
      status: 'active',
      highlights: ['دعم USB والشبكة', 'قص الورق التلقائي'],
    },
  ];

  const mockFaqs: FaqItem[] = [
    {
      id: 'faq1',
      q: 'كيف يمكنني بيع علبة واحدة من كرتونة تحتوي 24 قطعة؟',
      a: 'اضغط على زر عبوة في تصميم 5 لاختيار الحبة وسيتم تقسيم السعر تلقائياً.',
      category: 'كاشير ومبيعات',
      keywords: ['عبوة', 'كرتونة', 'حبة', 'تصميم 5'],
    },
    {
      id: 'faq2',
      q: 'الطابعة الحرارية تطبع رموزاً غير مفهومة أو لا تستجيب؟',
      a: 'تأكد من ضبط Baud Rate إلى 9600 واختيار ESC/POS الصحيح من الإعدادات.',
      category: 'طابعات وأجهزة',
      keywords: ['طابعة', 'حرارية', 'usb', 'esc/pos'],
    },
  ];

  describe('filterGuides', () => {
    it('returns all guides when category is الكل and query is empty', () => {
      const result = filterGuides(mockGuides, 'الكل', '');
      expect(result).toHaveLength(2);
    });

    it('filters guides strictly by category', () => {
      const result = filterGuides(mockGuides, 'طابعات وأجهزة', '');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('g2');
    });

    it('filters guides by search query matching title', () => {
      const result = filterGuides(mockGuides, 'الكل', 'العبوات');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('g1');
    });

    it('filters guides by search query matching step description', () => {
      const result = filterGuides(mockGuides, 'الكل', 'الخادم');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('g2');
    });

    it('filters guides by search query matching shortcuts', () => {
      const result = filterGuides(mockGuides, 'الكل', 'السلة');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('g1');
    });

    it('returns empty array when no guide matches query', () => {
      const result = filterGuides(mockGuides, 'الكل', 'غير_موجود_على_الإطلاق');
      expect(result).toHaveLength(0);
    });
  });

  describe('filterFeatures', () => {
    it('returns all features when category is الكل and query is empty', () => {
      const result = filterFeatures(mockFeatures, 'الكل', '');
      expect(result).toHaveLength(2);
    });

    it('filters features by category', () => {
      const result = filterFeatures(mockFeatures, 'كاشير ومبيعات', '');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('f1');
    });

    it('filters features by query in highlights', () => {
      const result = filterFeatures(mockFeatures, 'الكل', 'الورق');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('f2');
    });
  });

  describe('filterFaqs', () => {
    it('returns all faqs when category is الكل and query is empty', () => {
      const result = filterFaqs(mockFaqs, 'الكل', '');
      expect(result).toHaveLength(2);
    });

    it('filters faqs by keywords', () => {
      const result = filterFaqs(mockFaqs, 'الكل', 'esc/pos');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('faq2');
    });

    it('filters faqs by answer content', () => {
      const result = filterFaqs(mockFaqs, 'الكل', 'تقسيم السعر');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('faq1');
    });
  });

  describe('splitTextForHighlight', () => {
    it('returns single non-matched item if query is empty', () => {
      const parts = splitTextForHighlight('مرحبا بك في النظام', '');
      expect(parts).toEqual([{ text: 'مرحبا بك في النظام', isMatch: false }]);
    });

    it('splits text correctly around matched term', () => {
      const parts = splitTextForHighlight('طريقة بيع العبوة بالقطعة', 'العبوة');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toEqual({ text: 'طريقة بيع ', isMatch: false });
      expect(parts[1]).toEqual({ text: 'العبوة', isMatch: true });
      expect(parts[2]).toEqual({ text: ' بالقطعة', isMatch: false });
    });

    it('safely handles special regex characters in query', () => {
      const parts = splitTextForHighlight('سعر المنتج هو (100.00$)? نعم', '(100.00$)?');
      expect(parts.some((p) => p.isMatch)).toBe(true);
    });
  });
});
