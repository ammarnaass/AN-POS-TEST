import { describe, it, expect } from 'vitest';
import {
  findBestAssistantAnswer,
  normalizeArabicText,
  KNOWLEDGE_BASE
} from '../services/assistantKnowledgeEngine';

describe('assistantKnowledgeEngine', () => {
  describe('normalizeArabicText', () => {
    it('normalizes alef variants and removes harakat', () => {
      expect(normalizeArabicText('إِعْدَادَاتْ الأَجْهِزَةِ')).toBe('اعدادات الاجهزه');
      expect(normalizeArabicText('طَابِعَةٌ حَرَارِيَّةٌ')).toBe('طابعه حراريه');
    });

    it('normalizes ta-marbuta and alif maqsura', () => {
      expect(normalizeArabicText('فاتورة الجملة للمشتري')).toBe('فاتوره الجمله للمشتري');
      expect(normalizeArabicText('أدنى مستوى')).toBe('ادني مستوي');
    });
  });

  describe('findBestAssistantAnswer', () => {
    it('accurately answers wholesale invoice packaging question (user problem statement)', () => {
      const q = 'في عمليةالبيع لا يضع عدد القطعة العبوة في فاتورة الجملة في كل حالات';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toContain('فواتير الجملة');
      expect(answer.text).toContain('التعبئة (Colisage)');
      expect(answer.text).toContain('قطع/عبوة (Pièces/Colis)');
      expect(answer.steps).toBeDefined();
      expect(answer.steps?.length).toBeGreaterThan(0);
      expect(answer.route).toBe('/pos/advanced');
    });

    it('accurately answers keyboard shortcuts question without falling back', () => {
      const q = 'ما هي أهم اختصارات لوحة المفاتيح لتسريع الكاشير (F1-F12)؟';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toContain('اختصارات');
      expect(answer.text).toContain('F1');
      expect(answer.steps?.some(s => s.includes('F1'))).toBe(true);
      expect(answer.steps?.some(s => s.includes('F12'))).toBe(true);
      expect(answer.route).toBe('/pos');
    });

    it('accurately answers thermal printer setup and does not confuse it with wholesale pricing', () => {
      const q = 'كيف أربط وأضبط طابعة الإيصالات الحرارية 80mm؟';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toContain('الطابعات');
      expect(answer.text).toContain('ESC/POS');
      expect(answer.steps?.some(s => s.includes('80mm'))).toBe(true);
      expect(answer.route).toBe('/settings');
    });

    it('accurately answers free product (Diver) question', () => {
      const q = 'كيف أبيع سلعة طارئة ليست مسجلة مسبقاً في المخزون (منتج حر)؟';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toContain('منتج حر Diver');
      expect(answer.text).toContain('Diver');
      expect(answer.steps?.some(s => s.includes('Slash') || s.includes('Diver'))).toBe(true);
    });

    it('accurately answers mobile phone QR sync question', () => {
      const q = 'كيف أربط هواتف بائعي الصالة بكاشير المحل عبر مسح QR؟';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toContain('مزامنة الهواتف');
      expect(answer.text).toContain('Fastify');
      expect(answer.text).toContain('3000');
    });

    it('accurately answers offline-first questions', () => {
      const q = 'هل يعمل نظام AN POS بدون اتصال بالإنترنت إذا انقطعت الشبكة؟';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toContain('العمل دون إنترنت 100%');
      expect(answer.steps?.some(s => s.includes('SQLite') && s.includes('Dexie'))).toBe(true);
    });

    it('accurately answers credit and customer debt questions', () => {
      const q = 'كيف أبيع بالدين لزبون وأسجل دفعات السداد؟';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toContain('الديون والبيع بالآجل');
      expect(answer.route).toBe('/customers');
    });

    it('accurately answers shift closing and cash register questions', () => {
      const q = 'كيف أقفل الصندوق والوردية في نهاية اليوم؟';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toContain('الصندوق وتقفيل الوردية');
      expect(answer.steps?.some(s => s.includes('إغلاق الوردية'))).toBe(true);
      expect(answer.route).toBe('/cash-register');
    });

    it('provides smart fallback with suggested questions for completely unknown or short text', () => {
      const q = 'مرحبا كيف الحال؟';
      const answer = findBestAssistantAnswer(q);

      expect(answer.badge).toBe('دليل الإرشاد السريع');
      expect(answer.suggestedQuestions).toBeDefined();
      expect(answer.suggestedQuestions?.length).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Base Integrity', () => {
    it('contains at least 15 comprehensive topics', () => {
      expect(KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(15);
    });

    it('ensures every topic has valid metadata and action steps', () => {
      for (const topic of KNOWLEDGE_BASE) {
        expect(topic.id).toBeTruthy();
        expect(topic.title).toBeTruthy();
        expect(topic.keywords.length).toBeGreaterThan(0);
        expect(topic.steps.length).toBeGreaterThan(0);
        expect(topic.proTip).toBeTruthy();
      }
    });
  });
});
