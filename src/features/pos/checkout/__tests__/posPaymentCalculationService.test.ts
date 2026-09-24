import { describe, it, expect } from 'vitest';
import {
  calculateChange,
  calculateRemainingDeficit,
  isCashAmountSufficient,
  calculateEffectivePaid,
  resolvePaymentStatus,
  calculatePaymentBreakdown,
  getCashPresets,
  calculateChangeDenominations,
} from '../services/posPaymentCalculationService';

describe('posPaymentCalculationService — خدمة الحسابات المالية للدفع والفكة', () => {
  describe('calculateChange (حساب الصرف / الفكة)', () => {
    it('يعيد 0 عندما يكون المبلغ المدفوع مساوياً للإجمالي بالضبط', () => {
      expect(calculateChange(1500, 1500)).toBe(0);
    });

    it('يعيد 0 عندما يكون المبلغ المدفوع أقل من الإجمالي', () => {
      expect(calculateChange(1500, 1000)).toBe(0);
    });

    it('يحسب الفكة بشكل صحيح عندما يدفع الزبون أكثر من الإجمالي', () => {
      expect(calculateChange(1500, 2000)).toBe(500);
      expect(calculateChange(3250, 5000)).toBe(1750);
    });

    it('يتعامل بأمان مع القيم غير الرقمية أو السالبة', () => {
      expect(calculateChange(1500, NaN)).toBe(0);
      expect(calculateChange(1500, -500)).toBe(0);
      expect(calculateChange(1500, undefined as any)).toBe(0);
    });
  });

  describe('calculateRemainingDeficit (حساب العجز المتبقي)', () => {
    it('يعيد 0 عندما يكون المبلغ كافياً أو فائضاً', () => {
      expect(calculateRemainingDeficit(1000, 1000)).toBe(0);
      expect(calculateRemainingDeficit(1000, 1500)).toBe(0);
    });

    it('يحسب المبلغ الناقص بدقة عندما يكون المدفوع أقل من الإجمالي', () => {
      expect(calculateRemainingDeficit(1000, 600)).toBe(400);
      expect(calculateRemainingDeficit(2500, 0)).toBe(2500);
    });
  });

  describe('isCashAmountSufficient (التحقق من كفاية المبلغ)', () => {
    it('يعيد true عندما يكون المبلغ المدفوع أكبر من أو يساوي الإجمالي', () => {
      expect(isCashAmountSufficient(1000, 1000)).toBe(true);
      expect(isCashAmountSufficient(1000, 2000)).toBe(true);
    });

    it('يعيد false عندما يكون المبلغ أقل من الإجمالي أو غير محدد', () => {
      expect(isCashAmountSufficient(1000, 999)).toBe(false);
      expect(isCashAmountSufficient(1000, 0)).toBe(false);
      expect(isCashAmountSufficient(1000, NaN)).toBe(false);
    });
  });

  describe('calculateEffectivePaid (حساب المبلغ الصافي الفعال)', () => {
    it('للدفع النقدي (cash): يأخذ المبلغ المدفوع إن وُجد، أو الإجمالي افتراضياً', () => {
      expect(calculateEffectivePaid('cash', 2000, 1500)).toBe(2000);
      expect(calculateEffectivePaid('cash', 0, 1500)).toBe(1500);
      expect(calculateEffectivePaid('cash', undefined, 1500)).toBe(1500);
    });

    it('للدفع بالدين (credit): يصفّر المبلغ إذا كان مساوياً للإجمالي (القيمة الافتراضية للكاش) ليكون ديناً كاملاً', () => {
      expect(calculateEffectivePaid('credit', 1500, 1500)).toBe(0);
      expect(calculateEffectivePaid('credit', undefined, 1500)).toBe(0);
      expect(calculateEffectivePaid('credit', 0, 1500)).toBe(0);
    });

    it('للدفع بالدين (credit): يقبل التسديد الجزئي إذا دفع الزبون جزءاً أقل من الإجمالي', () => {
      expect(calculateEffectivePaid('credit', 500, 1500)).toBe(500);
    });

    it('للبطاقة والتحويل: يعتمد المبلغ المسجل أو الإجمالي', () => {
      expect(calculateEffectivePaid('card', undefined, 1500)).toBe(1500);
      expect(calculateEffectivePaid('transfer', 1200, 1500)).toBe(1200);
    });
  });

  describe('resolvePaymentStatus (تحديد حالة الفاتورة)', () => {
    it('في البيع بالدين: يعين unpaid إذا كان المدفوع 0', () => {
      expect(resolvePaymentStatus('credit', 0, 2000)).toBe('unpaid');
    });

    it('في البيع بالدين: يعين partial إذا كان المدفوع أكبر من 0 وأقل من الإجمالي', () => {
      expect(resolvePaymentStatus('credit', 500, 2000)).toBe('partial');
    });

    it('في الكاش والبطاقة: يعين paid إذا غطى المدفوع الإجمالي بالكامل', () => {
      expect(resolvePaymentStatus('cash', 2000, 2000)).toBe('paid');
      expect(resolvePaymentStatus('cash', 3000, 2000)).toBe('paid');
      expect(resolvePaymentStatus('card', 2000, 2000)).toBe('paid');
    });

    it('في الكاش: يعين partial إذا دفع جزءاً من الفاتورة', () => {
      expect(resolvePaymentStatus('cash', 1000, 2000)).toBe('partial');
    });
  });

  describe('calculatePaymentBreakdown (التقرير المالي الشامل)', () => {
    it('يعطي تفصيلاً مالياً دقيقاً لعملية كاش مع فكة', () => {
      const res = calculatePaymentBreakdown('cash', 2000, 1600);
      expect(res.effectivePaidAmount).toBe(2000);
      expect(res.changeAmount).toBe(400);
      expect(res.paymentStatus).toBe('paid');
    });

    it('يعطي تفصيلاً مالياً دقيقاً لعملية دين كامل', () => {
      const res = calculatePaymentBreakdown('credit', 1600, 1600); // 1600 افتراضي يتم تصفيره
      expect(res.effectivePaidAmount).toBe(0);
      expect(res.changeAmount).toBe(0);
      expect(res.unpaidAmount).toBe(1600);
      expect(res.paymentStatus).toBe('unpaid');
    });
  });

  describe('getCashPresets (توليد مبالغ الكاش السريعة)', () => {
    it('يولد أزرار مبالغ الكاش بمقادير صحيحة واختصارات لوحة المفاتيح', () => {
      const presets = getCashPresets(2300);
      expect(presets).toHaveLength(4);
      expect(presets[0]).toEqual({ label: 'المبلغ بالضبط', val: 2300, shortcut: 'F5' });
      expect(presets[1]).toEqual({ label: '+500 دج', val: 2800, shortcut: 'F6' });
      expect(presets[2]).toEqual({ label: '+1,000 دج', val: 3300, shortcut: 'F7' });
      expect(presets[3]).toEqual({ label: '+2,000 دج', val: 4300, shortcut: 'F8' });
    });
  });

  describe('calculateChangeDenominations (تفكيك الفكة إلى أوراق وقطع نقدية)', () => {
    it('يعيد مصفوفة فارغة إذا كانت الفكة 0 أو سالبة', () => {
      expect(calculateChangeDenominations(0)).toEqual([]);
      expect(calculateChangeDenominations(-100)).toEqual([]);
    });

    it('يفكك الفكة بشكل مثالي إلى أكبر الأوراق والقطع النقدية المتاحة', () => {
      // 3750 دج = 1×2000 + 1×1000 + 1×500 + 1×200 + 1×50
      const denoms = calculateChangeDenominations(3750);
      expect(denoms).toEqual([
        { denomination: 2000, count: 1, type: 'banknote' },
        { denomination: 1000, count: 1, type: 'banknote' },
        { denomination: 500, count: 1, type: 'banknote' },
        { denomination: 200, count: 1, type: 'banknote' },
        { denomination: 50, count: 1, type: 'coin' },
      ]);
    });

    it('يتعامل مع المضاعفات الكبيرة (مثلاً ورقتين من فئة 2000)', () => {
      const denoms = calculateChangeDenominations(4000);
      expect(denoms).toEqual([
        { denomination: 2000, count: 2, type: 'banknote' },
      ]);
    });
  });
});

