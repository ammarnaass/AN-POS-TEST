// Tab Component: PosSettingsTab (Refactored from SettingsPage.tsx)
import React from 'react';
import { ShoppingCart, Zap, Package, Bell, BarChart3, CreditCard, ShieldCheck, ArrowLeftRight } from 'lucide-react';

interface PosSettingsTabProps {
  [key: string]: any;
}

export default function PosSettingsTab({
  handleSaveSettings,
  settings
}: PosSettingsTabProps) {
  return (
    <div className="space-y-6">
            <div className="bg-surface-container-low rounded-3xl border border-outline-variant/20 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-cairo text-on-surface">إعدادات وقواعد نقطة البيع (POS)</h2>
                    <p className="text-xs text-on-surface-variant">التحكم في سلاسة وسرعة إتمام المبيعات وحركات المخزون في الصندوق</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'quickSale',
                    title: 'البيع السريع اللحظي',
                    desc: 'إتمام المعاملات فوراً بدون نوافذ تأكيد إضافية لتسريع خدمة الزبائن',
                    icon: Zap,
                    color: 'text-amber-500 bg-amber-500/10',
                  },
                  {
                    key: 'allowNegativeStock',
                    title: 'السماح بالمخزون السالب',
                    desc: 'إمكانية إتمام البيع حتى لو كانت كمية المنتج في المخزون صفراً أو غير مدخلة',
                    icon: Package,
                    color: 'text-purple-500 bg-purple-500/10',
                  },
                  {
                    key: 'confirmNoStock',
                    title: 'تنبيه تحذيري عند نفاذ المخزون',
                    desc: 'إظهار تنبيه بصري للكاشير عند محاولة بيع منتج منتهي الرصيد',
                    icon: Bell,
                    color: 'text-blue-500 bg-blue-500/10',
                  },
                  {
                    key: 'averagePricing',
                    title: 'التسعير بمتوسط التكلفة المرجح (PMP)',
                    desc: 'حساب تكلفة وأرباح المنتجات بناءً على متوسط سعر الشراء التراكمي',
                    icon: BarChart3,
                    color: 'text-emerald-500 bg-emerald-500/10',
                  },
                  {
                    key: 'accountingOnly',
                    title: 'وضع المحاسبة المالية فقط',
                    desc: 'تعطيل تتبع حركات المخزون واستخدام النظام كمحاسبة مبيعات وصندوق فقط',
                    icon: CreditCard,
                    color: 'text-rose-500 bg-rose-500/10',
                  },
                  {
                    key: 'zakatEnabled',
                    title: 'حساب وتتبع وعاء الزكاة الشرعية',
                    desc: 'حساب زكاة عروض التجارة والنقدية تلقائياً عند بلوغ النصاب السنوي',
                    icon: ShieldCheck,
                    color: 'text-teal-500 bg-teal-500/10',
                  },
                  {
                    key: 'allowCardPayment',
                    title: 'الدفع بالبطاقة البنكية (CIB / الذهبية / Visa)',
                    desc: 'إظهار خيار الدفع عبر البطاقة في نافذة إتمام البيع بنقطة البيع (افتراضياً: غير مفعل)',
                    icon: CreditCard,
                    color: 'text-indigo-500 bg-indigo-500/10',
                  },
                  {
                    key: 'allowTransferPayment',
                    title: 'الدفع بالتحويل البنكي / بريدي موب',
                    desc: 'إظهار خيار الدفع عبر التحويل البنكي أو التطبيقات المالية في نافذة الدفع (افتراضياً: غير مفعل)',
                    icon: ArrowLeftRight,
                    color: 'text-cyan-500 bg-cyan-500/10',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-2xl bg-surface-container border border-outline-variant/15 flex items-start justify-between gap-3 hover:border-primary/30 transition-all shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-on-surface font-cairo">{item.title}</p>
                        <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveSettings({ [item.key]: !settings[item.key as keyof typeof settings] })}
                      className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                        settings[item.key as keyof typeof settings] ? 'bg-primary' : 'bg-surface-container-highest border border-outline-variant/30'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                          settings[item.key as keyof typeof settings] ? 'right-0.5' : 'right-[26px]'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
  );
}
