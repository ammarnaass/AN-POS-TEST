import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import { BookOpen, Play, Phone, Mail, Users, Search, ChevronDown, ChevronUp, ExternalLink, MessageCircle } from 'lucide-react';

const faqItems = [
  { q: 'كيف يمكنني تفعيل خيارات الدفع الم多样؟', a: 'يمكنك تفعيل خيارات الدفع من إعدادات النظام > الدفع.' },
  { q: 'هل يدعم النظام العمل بدون إنترنت؟', a: 'نعم، يدعم العمل بدون إنترنت في وضع OFFLINE.' },
  { q: 'كيفية طباعة الفواتير عبر البلوتوث؟', a: 'قم بتوصيل الطابعة البلوتوث ثم اخترها من إعدادات الطباعة.' },
  { q: 'طريقة تصدير التقارير إلى Excel', a: 'من صفحة التقارير، اضغط على زر التصدير واختر صيغة Excel.' },
];

const categories = ['الكل', 'إدارة المبيعات', 'إعدادات النظام', 'إدارة المنتجات', 'القائمة والتصدير'];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const shopName = rawSettings?.shopName || 'AN POS';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="glass-card rounded-2xl p-8 text-center">
        <h1 className="text-3xl font-bold text-on-surface font-cairo mb-3">كيف يمكننا مساعدتك اليوم؟</h1>
        <p className="text-on-surface-variant mb-6">ابحث عن إجابات، شاهد الدروس التعليمية، أو تواصل مع فريق الخبراء للحصول على دعم مباشر</p>
        <div className="max-w-2xl mx-auto relative">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن مقالات، دروس، أو مشكلة معينة..."
            className="bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-3 text-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
          <button className="absolute left-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium border border-cyan-500/30 hover:bg-cyan-500/30 transition-all">
            بحث
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeCategory === cat ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-on-surface-variant hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Guide */}
        <div className="glass-card rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 mb-4">
            <BookOpen className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-lg font-bold text-on-surface font-cairo mb-2">دليل المستخدم</h3>
          <p className="text-sm text-on-surface-variant mb-4">نوفر تقرير مفصل لك بميزة في النظام لتشغيل عمليات البيع والمشتريات.</p>
          <div className="space-y-2">
            <a href="#" className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              <BookOpen className="w-4 h-4" /> الدليل السريع (PDF)
            </a>
            <a href="#" className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              <ExternalLink className="w-4 h-4" /> إدارة المخزون
            </a>
            <a href="#" className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              <ExternalLink className="w-4 h-4" /> التقارير والإحصائيات
            </a>
          </div>
        </div>

        {/* Video Tutorials */}
        <div className="glass-card rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-4">
            <Play className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-on-surface font-cairo mb-2">دروس الفيديو التعليمية</h3>
          <p className="text-sm text-on-surface-variant mb-4">تعلم كيفية استخدام AN POS خطوة بخطوة من خلال مقاطع فيديو احترافية.</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="aspect-video bg-surface-container-high rounded-lg flex items-center justify-center border border-outline-variant/20">
              <Play className="w-6 h-6 text-on-surface-variant" />
            </div>
            <div className="aspect-video bg-surface-container-high rounded-lg flex items-center justify-center border border-outline-variant/20">
              <Play className="w-6 h-6 text-on-surface-variant" />
            </div>
            <div className="aspect-video bg-surface-container-high rounded-lg flex items-center justify-center border border-outline-variant/20">
              <Play className="w-6 h-6 text-on-surface-variant" />
            </div>
          </div>
        </div>
      </div>

      {/* Live Chat & Contact */}
      <div className="flex items-center gap-3 mb-2">
        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-medium border border-cyan-500/30 hover:bg-cyan-500/30 transition-all">
          <MessageCircle className="w-4 h-4" /> محادثة مباشرة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Community */}
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 mx-auto mb-4">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-base font-bold text-on-surface font-cairo mb-2">مجتمع المستخدمين</h3>
          <p className="text-xs text-on-surface-variant mb-4">تواصل مع تجارب المستخدمين وشارك الخبرات</p>
          <div className="flex justify-center -space-x-2 space-x-reverse mb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full bg-cyan-500/30 border-2 border-surface-container flex items-center justify-center text-xs text-cyan-400">
                {i}
              </div>
            ))}
          </div>
          <button className="w-full py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-medium border border-cyan-500/30 hover:bg-cyan-500/30 transition-all">
            انضم للمجتمع
          </button>
        </div>

        {/* Email Support */}
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 mx-auto mb-4">
            <Mail className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-base font-bold text-on-surface font-cairo mb-2">الدعم عبر البريد</h3>
          <p className="text-xs text-on-surface-variant mb-2">رد مضمون في أقل من 24 ساعة عمل</p>
          <p className="text-sm text-cyan-400 mb-4">support@lumina-pos.com</p>
          <button className="w-full py-2 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-medium border border-cyan-500/30 hover:bg-cyan-500/30 transition-all">
            إرسال تذكرة
          </button>
        </div>

        {/* Phone Support */}
        <div className="glass-card rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 mx-auto mb-4">
            <Phone className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-on-surface font-cairo mb-2">الدعم عبر الهاتف</h3>
          <p className="text-xs text-on-surface-variant mb-2">متاح من السبت إلى الخميس للطلبات العاجلة</p>
          <p className="text-sm text-amber-400 font-bold mb-4">+213 555 123 456</p>
          <button className="w-full py-2 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-medium border border-amber-500/30 hover:bg-amber-500/30 transition-all">
            اتصل الآن
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-on-surface font-cairo mb-6 text-center">الأسئلة الأكثر شيوعاً</h2>
        <div className="space-y-3">
          {faqItems.map((item, i) => (
            <div key={i} className="border border-outline-variant/20 rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-right hover:bg-surface-container-high transition-colors">
                <span className="text-sm font-medium text-on-surface">{item.q}</span>
                {openFaq === i ? <ChevronUp className="w-5 h-5 text-on-surface-variant" /> : <ChevronDown className="w-5 h-5 text-on-surface-variant" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-on-surface-variant border-t border-outline-variant/20 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-on-surface-variant">
            <span>© {new Date().getFullYear()} {shopName}. جميع الحقوق محفوظة.</span>
            <a href="#" className="hover:text-white transition-colors">الشروط والأحكام</a>
            <a href="#" className="hover:text-white transition-colors">سياسة الخصوصية</a>
            <a href="#" className="hover:text-white transition-colors">اتفاقية الخدمة</a>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-on-surface font-cairo">{shopName}</span>
            <span className="text-xs text-on-surface-variant">الحل المتكامل لإدارة المبيعات الذكية</span>
          </div>
        </div>
      </div>
    </div>
  );
}
