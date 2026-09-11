import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/infrastructure/database/dexie/db';
import {
  BookOpen,
  Phone,
  Mail,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ShoppingCart,
  Package,
  DollarSign,
  Printer,
  Smartphone,
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  Copy,
  Check,
  Cpu,
  Sparkles,
  X,
  AlertCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  QrCode,
  Tag,
  Gift,
  Monitor,
  Layers,
  Zap,
  Percent,
  Calculator,
  RefreshCw,
  SlidersHorizontal,
  Building2,
  Lock,
  ExternalLink,
  Bot,
  Terminal,
  ArrowUpRight,
  Compass,
  Wrench
} from 'lucide-react';

function FacebookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function YoutubeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface GuideStep {
  title: string;
  desc: string;
  badge?: string;
}

interface InteractiveGuide {
  id: string;
  category: string;
  title: string;
  shortDesc: string;
  timeEstimate: string;
  icon: typeof ShoppingCart;
  iconColor: string;
  iconBg: string;
  route: string;
  routeLabel: string;
  proTip: string;
  shortcuts?: { key: string; label: string }[];
  steps: GuideStep[];
}

interface FaqItem {
  id: string;
  category: string;
  q: string;
  a: string;
  keywords: string[];
}

interface SystemFeature {
  id: string;
  category: string;
  title: string;
  badge: string;
  desc: string;
  highlights: string[];
  icon: typeof ShoppingCart;
  iconColor: string;
  iconBg: string;
  route: string;
}

interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  badge?: string;
  steps?: string[];
  proTip?: string;
  route?: string;
  routeLabel?: string;
}

const CATEGORIES = [
  'الكل',
  'العبوات والمفضلة (تصميم 5)',
  'نقطة البيع (POS) والتصاميم',
  'الطباعة الحرارية وفاتورة الجملة',
  'المخزون والعائلات',
  'ملصقات الباركود',
  'الهاتف والشبكة والأجهزة',
  'الصندوق والمصاريف',
  'العملاء والديون',
  'الموردون والمشتريات',
  'الباقات والعروض',
  'دقة الشاشة والعرض',
  'الأمان والنسخ الاحتياطي',
] as const;

type CategoryType = (typeof CATEGORIES)[number];

type ViewTab = 'assistant' | 'guides' | 'features' | 'faqs' | 'contact';

const GUIDES: InteractiveGuide[] = [
  {
    id: 'pos-packages-favs-design5',
    category: 'العبوات والمفضلة (تصميم 5)',
    title: 'إدارة المفضلة والعبوات حصرياً في نقطة البيع (تصميم 5)',
    shortDesc: 'فصل تصنيف المفضلة التام عن التجزئة، حصر المفضلة على العبوات والكراتين، وتعديل العبوات والأسعار مباشرة.',
    timeEstimate: '3 دقائق',
    icon: Package,
    iconColor: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30',
    route: '/pos/advanced',
    routeLabel: 'فتح نقطة البيع المتقدمة (تصميم 5)',
    proTip: 'في تصميم 5، تم تصميم المفضلة لتبيع العبوات فقط (مثل كرتونة حليب 6 علب) لتسريع العمل دون الحاجة لقراءة باركود الكرتونة.',
    shortcuts: [
      { key: 'Tab / Click', label: 'التبديل بين تجزئة ومفضلة' },
      { key: 'تعديل عبوة', label: 'ضبط السعر والقطع' },
    ],
    steps: [
      {
        title: '1. استقلالية تصنيف المفضلة التامة',
        desc: 'تصنيف المفضلة في تصميم 5 منفصل برمجياً ومفصول تماماً عن شجرة تصنيفات التجزئة، مما يمنع تداخل الأصناف الفردية مع العبوات.',
        badge: 'تصميم 5 حصرياً',
      },
      {
        title: '2. حصر العرض على العبوات المعبأة فقط',
        desc: 'تم استبعاد المنتجات الحرة والمفردة من المفضلة لتظهر فقط العبوات التي تحوي عدداً مصرحاً به من القطع (مثل كرتونة، باقة، دستة).',
      },
      {
        title: '3. أداة تعديل العبوات المباشرة',
        desc: 'يمكنك من زر إدارة المفضلة تعديل بيانات أي عبوة، مثل عدد القطع بداخلها وسعرها المحدد دون الحاجة لمغادرة شاشة الكاشير.',
      },
      {
        title: '4. منع خلط السلع عند التبديل',
        desc: 'عند الضغط على تصنيف تجزئة ثم العودة للمفضلة، يتم تصفية العناصر بدقة وتحديث الأسعار بشكل متزامن دون أي أخطاء عرض.',
      },
    ],
  },
  {
    id: 'pos-pricing-wholesale-invoice',
    category: 'الطباعة الحرارية وفاتورة الجملة',
    title: 'قواعد بيع العبوات وفاتورة الجملة (س1-س4 تجزئة مقابل س3 جملة)',
    shortDesc: 'كيفية احتساب كميات العبوات في الفاتورة والطباعة التلقائية: فواتير التجزئة للأسعار س1/س2/س4 وفاتورة الجملة لسعر س3.',
    timeEstimate: 'دقيقتان ونصف',
    icon: Printer,
    iconColor: 'text-blue-700 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/30',
    route: '/pos/advanced',
    routeLabel: 'معاينة شاشة البيع المتقدمة',
    proTip: 'التحويل إلى سعر الجملة (س3) لا يغير السعر فحسب، بل يوجه أمر الطباعة تلقائياً إلى قالب "فاتورة الجملة" المخصص!',
    shortcuts: [
      { key: 'س1 / س2 / س4', label: 'فاتورة بيع عادية' },
      { key: 'س3', label: 'فاتورة جملة مخصصة' },
    ],
    steps: [
      {
        title: '1. سلوك البيع بالأسعار العادية (س1، س2، س4)',
        desc: 'عند إضافة عبوة (مثلاً كرتونة تحوي 6 قطع) في س1 (تجزئة) أو س2 (نصف جملة) أو س4 (خاص): تُسجل الكمية في الفاتورة بعدد القطع الفعلي (6) وتطبع الفاتورة في قالب البيع العادي.',
        badge: 'تجزئة ونصف جملة',
      },
      {
        title: '2. سلوك البيع بسعر الجملة (س3)',
        desc: 'عند التبديل لسعر س3 (جملة): يتم تسجيل عدد العبوات وعدد القطع في العبوة بوضوح في الفاتورة، وتُطبع تلقائياً في "فاتورة الجملة" المجهزة ببيانات العميل وشروط الدفع.',
        badge: 'جملة متقدمة',
      },
      {
        title: '3. الطباعة الذكية المتكيفة مع نوع السعر',
        desc: 'يقوم النظام بتحليل نوع السعر في السلة آلياً عند الضغط على تأكيد (F1) واختيار القالب المناسب (وصل حراري 80mm/58mm أو صفحة A4/A5 للجملة).',
      },
    ],
  },
  {
    id: 'pos-workflow',
    category: 'نقطة البيع (POS) والتصاميم',
    title: 'دورة المبيعات السريعة وإنشاء الفواتير',
    shortDesc: 'تعلم كيف تبيع بسرعة باستخدام الباركود أو الاختصارات، وتعليق وسداد الفواتير وطباعة الإيصال.',
    timeEstimate: 'دقيقتان',
    icon: ShoppingCart,
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30',
    route: '/pos',
    routeLabel: 'فتح نقطة البيع',
    proTip: 'يمكنك إتمام عملية البيع كاملة دون لمس الفأرة بالضغط على F1 للتأكيد الفوري وإدخال المبلغ المستلم.',
    shortcuts: [
      { key: 'F1', label: 'تأكيد ودفع' },
      { key: 'F2', label: 'تطبيق تخفيض' },
      { key: 'F3', label: 'تعليق السلة' },
      { key: 'F4', label: 'إلغاء الفاتورة' },
      { key: 'Space', label: 'بحث سريع' },
    ],
    steps: [
      {
        title: '1. مسح أو إضافة المنتجات',
        desc: 'وجّه قارئ الباركود نحو السلعة، أو اكتب جزءاً من الاسم أو الكود في حقل البحث العلوي واضغط Enter لإضافتها للسلة مباشرة.',
      },
      {
        title: '2. تعديل الكمية أو السعر',
        desc: 'اضغط على السطر داخل السلة لزيادة الكمية (+) أو إنقاصها (-)، أو اكتب الكمية يدوياً في حقل العدد لتعديلها فورياً.',
      },
      {
        title: '3. تحديد العميل ونوع السداد',
        desc: 'اختر "زبون عادي" للبيع النقدي، أو اختر اسماً من قائمة العملاء للبيع بالدين (آجل) أو الدفع الإلكتروني.',
      },
      {
        title: '4. إنهاء العملية وطباعة الوصل (F1)',
        desc: 'اضغط زر "تأكيد بيع (F1)"، أدخل المبلغ المستلم لحساب الصرف المتبقي تلقائياً، واضغط حفظ لطباعة الوصل فورياً وفتح درج النقدية.',
        badge: 'موصى به',
      },
    ],
  },
  {
    id: 'pos-design-5',
    category: 'نقطة البيع (POS) والتصاميم',
    title: 'شاشة الكاشير المتطورة (تصميم 5) وشريط العمليات',
    shortDesc: 'استكشف محطة العمل الاحترافية المجهزة بشريط أدوات موحد ومؤشرات المبالغ المالية الملونة.',
    timeEstimate: '3 دقائق',
    icon: Monitor,
    iconColor: 'text-blue-700 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/30',
    route: '/pos/advanced',
    routeLabel: 'فتح نقطة البيع المتقدمة (تصميم 5)',
    proTip: 'شريط العمليات العلوي يجمع أهم وظائف المحطة: الصفحة الرئيسية، صنف حر، فتح الدرج، عارض الأسعار، والحاسبة.',
    shortcuts: [
      { key: 'Esc', label: 'الصفحة الرئيسية' },
      { key: '/ Diver', label: 'منتج حر طارئ' },
      { key: 'F12', label: 'فتح درج الكاشير' },
      { key: 'F6', label: 'فاحص الأسعار' },
      { key: 'س1 - س4', label: 'تبديل فئات الأسعار' },
    ],
    steps: [
      {
        title: '1. شريط العمليات الموحد أعلى الشاشة',
        desc: 'يتضمن زر "الصفحة الرئيسية (Esc)" للعودة للوحة التحكم، وزر "منتج حر (/ Diver)" لبيع صنف غير مسجل، وزر "فتح الدرج (F12)" لإرسال نبضة الدرج دون طباعة.',
      },
      {
        title: '2. عارض وفاحص الأسعار السريع (F6)',
        desc: 'اضغط F6 لمسح أي باركود والاستعلام عن سعره ورصيده في المخزون للزبون دون إضافته في سلة المشتريات الحالية.',
      },
      {
        title: '3. التبديل الفوري بين فئات الأسعار (س1 - س4)',
        desc: 'يمكنك بضغطة زر واحدة تحويل تسعير كافة أصناف السلة بين (تجزئة س1، نصف جملة س2، جملة س3، وسعر خاص س4).',
        badge: 'ميزة حصرية',
      },
      {
        title: '4. مؤشرات المبالغ المالية الملونة',
        desc: 'شريط عريض يبرز بالأرقام الكبيرة: إجمالي السلة، التخفيض، الصافي بعد الخصم، المبلغ المقبوض، والصرف المتبقي لإرجاعه للزبون بدقة.',
      },
    ],
  },
  {
    id: 'mobile-fastify-sync',
    category: 'الهاتف والشبكة والأجهزة',
    title: 'ربط هواتف بائعي الصالة عبر QR وخادم Fastify المحلي',
    shortDesc: 'مزامنة الهواتف الذكية مع جهاز سطح المكتب دون إنترنت لإتمام عمليات البيع والجرد المتنقل.',
    timeEstimate: 'دقيقتان',
    icon: Smartphone,
    iconColor: 'text-indigo-700 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30',
    route: '/settings',
    routeLabel: 'فتح إعدادات الشبكة والأجهزة',
    proTip: 'تأكد أن هاتف الجرد والحاسوب متصلان بنفس شبكة Wi-Fi المحلية (أو بنقطة Hotspot من الحاسوب).',
    steps: [
      {
        title: '1. فحص مؤشرات الخادم الداخلي',
        desc: 'في صفحة الإعدادات > الشبكة، تأكد أن خادم Fastify يعمل باللون الأخضر على المنفذ 3000 وعنوان الـ IP ظاهر.',
      },
      {
        title: '2. مسح رمز QR للاقتران اللحظي',
        desc: 'افتح تطبيق الهاتف، اضغط "ربط بنقطة بيع" وامسح رمز QR المعروض على شاشة الحاسوب ليتم الاتصال خلال ثانية واحدة.',
      },
      {
        title: '3. إدارة الأجهزة وحصص الاتصال',
        desc: 'تحكم في الأجهزة المتصلة من تبويب القائمة البيضاء؛ يمنحك النظام إمكانية توثيق هواتف العمال وفصل أي جهاز غير مصرح به فوراً.',
        badge: 'أمان متقدم',
      },
    ],
  },
  {
    id: 'barcode-labels-studio',
    category: 'ملصقات الباركود',
    title: 'استوديو تصميم وطباعة ملصقات الباركود والأسعار',
    shortDesc: 'طباعة ملصقات حرارية بقياسات متعددة (38x25، 40x30، 50x30) أو على ورق A4 العادي مع تخصيص المظهر.',
    timeEstimate: 'دقيقتان',
    icon: Tag,
    iconColor: 'text-pink-700 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-500/15 border-pink-300 dark:border-pink-500/30',
    route: '/barcode-print',
    routeLabel: 'فتح استوديو طباعة الباركود',
    proTip: 'يمكنك اختيار زر "استيراد أرصدة المخزون" ليقوم النظام بطباعة عدد ملصقات يساوي تماماً الكمية المتوفرة في المستودع!',
    shortcuts: [
      { key: '38x25mm', label: 'المقاس الأكثر شيوعاً' },
      { key: 'A4 Paper', label: 'ورق لاصق مقسم' },
    ],
    steps: [
      {
        title: '1. تحديد الأصناف والكميات',
        desc: 'اختر المنتجات المراد طباعة ملصقات لها، وحدد عدد الملصقات لكل سلعة يدوياً أو اجلب الأرصدة تلقائياً.',
      },
      {
        title: '2. اختيار مقاس الورق ونوع الباركود',
        desc: 'حدد قياس الملصق الحراري المناسب لطابعتك، ونوع الترميز (Code128 عالي الكثافة أو EAN-13 القياسي).',
      },
      {
        title: '3. تخصيص البيانات المعروضة',
        desc: 'اختر إظهار أو إخفاء: اسم المتجر، اسم الصنف، السعر بالدينار، وتاريخ الإنتاج أو الانتهاء.',
      },
      {
        title: '4. المعاينة والطباعة الفورية',
        desc: 'عاين شكل الملصق على الشاشة واضغط "طباعة" لإرسال الأوامر مباشرة لطابعة الباركود الحرارية.',
        badge: 'احترافي',
      },
    ],
  },
];

const SYSTEM_FEATURES: SystemFeature[] = [
  {
    id: 'feat-packages-favs',
    category: 'العبوات والمفضلة (تصميم 5)',
    title: 'إدارة المفضلة والعبوات المخصصة لتصميم 5',
    badge: 'بيع سريع وموجه',
    desc: 'شاشة مفضلة مستقلة مخصصة لبيع العبوات والكراتين فقط لتسريع حركة المحل ومنع خلط التجزئة مع الجملة.',
    highlights: ['عرض العبوات فقط', 'استقلالية تامة عن تصنيفات التجزئة', 'أداة تعديل العبوات الحية', 'تسعير سريع وفوري'],
    icon: Package,
    iconColor: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30',
    route: '/pos/advanced',
  },
  {
    id: 'feat-wholesale-print',
    category: 'الطباعة الحرارية وفاتورة الجملة',
    title: 'نظام الطباعة المزدوج وفاتورة الجملة الآلية',
    badge: 'طباعة ذكية',
    desc: 'توجيه الطباعة تلقائياً: فواتير عادية للأسعار س1/س2/س4، وفاتورة جملة مخصصة مفصلة العبوات عند البيع بسعر س3.',
    highlights: ['توجيه تلقائي حسب نوع السعر', 'فاتورة جملة بتفاصيل الكراتين', 'دعم طابعات 80mm و 58mm', 'معاينة فورية وطباعة صامتة'],
    icon: Printer,
    iconColor: 'text-blue-700 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/30',
    route: '/settings',
  },
  {
    id: 'feat-pos',
    category: 'نقطة البيع (POS) والتصاميم',
    title: 'نقطة البيع المتقدمة (5 تصاميم متخصصة)',
    badge: 'القلب النابض',
    desc: 'واجهة بيع متطورة تدعم 5 أنماط عرض (Classic, Touch Grid, Compact, Split, Terminal 5) لتناسب أي متجر أو مطعم.',
    highlights: ['أزرار العمليات العلوية', 'مؤشرات مالية ملونة', 'دعم الشاشات اللمسية', 'اختصارات F1-F12'],
    icon: ShoppingCart,
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30',
    route: '/pos/advanced',
  },
  {
    id: 'feat-quick-pos',
    category: 'نقطة البيع (POS) والتصاميم',
    title: 'نقطة البيع السريع (Quick POS)',
    badge: 'سرعة فائقة',
    desc: 'نمط مسح متواصل ومباشر بالباركود مصمم لمواجهة طوابير الانتظار في السوبرماركت ومحلات البقالة الكبيرة.',
    highlights: ['مسح متكرر لمضاعفة الكمية', 'طباعة فورية', 'حساب الصرف تلقائياً', 'دون لمس الفأرة'],
    icon: Zap,
    iconColor: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30',
    route: '/pos/quick',
  },
  {
    id: 'feat-fastify-sync',
    category: 'الهاتف والشبكة والأجهزة',
    title: 'اقتران هواتف بائعي الصالة عبر QR',
    badge: 'مزامنة لاسلكية',
    desc: 'تحويل أي هاتف ذكي لنقطة بيع أو جهاز جرد متنقل عبر مسح رمز QR على شبكة Wi-Fi المحلية على خادم Fastify الداخلي.',
    highlights: ['ربط لحظي بمسح QR', 'منفذ Fastify :3000 محلي', 'جرد وفحص أسعار بالممرات', 'قائمة بيضاء للأجهزة'],
    icon: Smartphone,
    iconColor: 'text-indigo-700 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30',
    route: '/settings',
  },
  {
    id: 'feat-barcode-bench',
    category: 'الهاتف والشبكة والأجهزة',
    title: 'منصة فحص واختبار قارئ الباركود الحية',
    badge: 'تشخيص العتاد',
    desc: 'بيئة اختبار تفاعلية تقيس زمن استجابة الماسحات الضوئية بالمللي ثانية وتفحص تواجد السلعة في القاعدة مع صوت Beep.',
    highlights: ['تغذية صوتية إلكترونية', 'قياس زمن الاستجابة (ms)', 'فحص الكود بالقاعدة فورياً', 'التحقق من لاحقة Enter'],
    icon: QrCode,
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30',
    route: '/settings',
  },
  {
    id: 'feat-security-backup',
    category: 'الأمان والنسخ الاحتياطي',
    title: 'أمان scrypt والنسخ الاحتياطي السريع',
    badge: 'حماية مصرفية',
    desc: 'تشفير كلمات المرور بـ scrypt مع Salt عشوائي، قفل التسجيل الذاتي للغرباء، وتصدير قاعدة البيانات واسترجاعها بضغطة زر.',
    highlights: ['تشفير scrypt الفولاذي', 'حظر التسجيل الذاتي', 'تصدير نسخة مشفرة', 'استرجاع فوري للبيانات'],
    icon: Lock,
    iconColor: 'text-red-700 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-500/15 border-red-300 dark:border-red-500/30',
    route: '/settings',
  },
  {
    id: 'feat-offline-first',
    category: 'الأمان والنسخ الاحتياطي',
    title: 'معمارية العمل دون إنترنت (Offline-First 100%)',
    badge: 'استمرارية تامة',
    desc: 'يعمل النظام محلياً بالكامل عبر محركي SQLite و Dexie المدمجين، ولا يتوقف البيع أو إصدار الوثائق أبداً عند انقطاع الشبكة.',
    highlights: ['لا يتطلب اتصال إنترنت', 'محرك SQLite صلب', 'واجهة Dexie بدون تأخير', 'استقرار مستمر 24/7'],
    icon: Cpu,
    iconColor: 'text-cyan-700 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/15 border-cyan-300 dark:border-cyan-500/30',
    route: '/pos',
  },
];

const FAQS: FaqItem[] = [
  {
    id: 'faq-packages-design5',
    category: 'العبوات والمفضلة (تصميم 5)',
    q: 'لماذا تظهر العبوات فقط في مفضلة تصميم 5 وكيف أعدل عدد القطع والأسعار؟',
    a: 'في تصميم 5، صُممت المفضلة لتسهيل بيع العبوات المعبأة (مثل كرتونة 6 علب حليب) بسرعة فائقة ودون الحاجة لباركود كرتونة.\nتم فصل المفضلة تماماً عن تصنيفات التجزئة وحذف المنتجات الحرة منها.\nلتعديل عبوة: اضغط على زر تعديل العبوات في شريط المفضلة لتحديد عدد القطع وسعر العبوة وتثبيتها فورياً.',
    keywords: ['عبوات', 'تصميم 5', 'مفضلة', 'كرتونة', 'تعديل عبوة', 'قطع', 'تجزئة'],
  },
  {
    id: 'faq-s1-vs-s3',
    category: 'الطباعة الحرارية وفاتورة الجملة',
    q: 'ما هو الفرق بين أسعار س1-س4 وسعر س3 جملة في احتساب كميات العبوات؟',
    a: '• في أسعار التجزئة (س1)، نصف جملة (س2)، وخاص (س4): عند إضافة عبوة، تُسجل الفاتورة الكمية بعدد القطع الفعلي المصرح به في العبوة وتطبع في فاتورة البيع العادية.\n• في سعر الجملة (س3): تُسجل الفاتورة عدد العبوات وعدد القطع وتطبع تلقائياً في فاتورة الجملة المخصصة مع تفاصيل الكراتين الكاملة.',
    keywords: ['س1', 'س2', 'س3', 'س4', 'جملة', 'تجزئة', 'فاتورة جملة', 'طباعة'],
  },
  {
    id: 'faq-offline',
    category: 'نقطة البيع (POS) والتصاميم',
    q: 'هل يعمل نظام AN POS بدون اتصال بالإنترنت؟',
    a: 'نعم بالكامل وبنسبة 100%! يعتمد النظام على معمارية Offline-First المزدوجة؛ حيث تُدار البيانات محلياً على جهازك بواسطة محرك SQLite ومحرك Dexie IndexedDB. لا تتوقف عمليات البيع أو إصدار الفواتير أو الطباعة أو المخزون أبداً حتى في حال انقطاع الإنترنت التام.',
    keywords: ['انترنت', 'offline', 'شبكة', 'انقطاع', 'اتصال', 'محلي', 'دون انترنت'],
  },
  {
    id: 'faq-shortcuts',
    category: 'نقطة البيع (POS) والتصاميم',
    q: 'ما هي أهم اختصارات لوحة المفاتيح لتسريع الكاشير؟',
    a: 'صممت الاختصارات لتمكين الكاشير من البيع دون لمس الفأرة:\n• [F1]: تأكيد وإنهاء البيع وفتح نافذة السداد.\n• [F2]: إضافة خصم/تخفيض للسلة أو الصنف.\n• [F3]: تعليق الفاتورة لخدمة زبون آخر ثم استرجاعها.\n• [F4]: إلغاء وتفريغ السلة الحالية بعد التأكيد.\n• [F6]: عارض وفاحص الأسعار السريع دون بيع السلعة.\n• [F11]: وضع ملء الشاشة الذكي لحماية الواجهة.\n• [F12]: نبضة فتح درج النقدية الإلكتروني.\n• [Esc]: العودة الفورية للصفحة الرئيسية.\n• [/] (Slash): بيع منتج حر طارئ غير مسجل.\n• [Space]: الانتقال الفوري لحقل البحث بالاسم أو الكود.',
    keywords: ['اختصارات', 'f1', 'f4', 'f2', 'f3', 'f6', 'f11', 'f12', 'كيبورد', 'لوحة المفاتيح', 'سريع'],
  },
  {
    id: 'faq-pos-designs',
    category: 'نقطة البيع (POS) والتصاميم',
    q: 'كيف أختار بين تصاميم شاشة الكاشير الـ 5 وما الفروقات بينها؟',
    a: 'يمكنك التبديل بين التصاميم من الإعدادات أو زر التبديل في شريط الكاشير:\n• التصميم 1 (Classic): متوازن ومناسب لمحلات التجزئة والملابس.\n• التصميم 2 (Visual Grid): بطاقات مصورة بأزرار لمس كبيرة للمطاعم والمقاهي والحلويات.\n• التصميم 3 (Compact): مدمج ومناسب للشاشات الصغيرة والمربعة.\n• التصميم 4 (Split Velocity): مقسم لمحطات العمل الكثيفة وطوابير الانتظار.\n• التصميم 5 (Terminal Station): شاشة العمل الاحترافية المجهزة بشريط العمليات العلوي ومؤشرات الحالة المالية الملونة ومفضلة العبوات.',
    keywords: ['تصاميم', 'تصميم 5', 'شاشة الكاشير', 'تبديل', 'grid', 'terminal', 'لمس'],
  },
  {
    id: 'faq-multi-barcode',
    category: 'المخزون والعائلات',
    q: 'كيف أربط باركود القطعة وباركود الكرتونة لنفس المنتج مع معامل التحويل؟',
    a: 'عند إضافة أو تعديل المنتج:\n1. امسح باركود القطعة الفردية في حقل الباركود الرئيسي.\n2. انزل إلى قسم "الباركودات المرتبطة" واضغط "إضافة باركود".\n3. امسح باركود الكرتونة أو العلبة وحدد معامل التحويل (مثلاً: 1 كرتونة = 24 قطعة) وسعر الكرتونة.\n4. عند مسح باركود الكرتونة في الكاشير، سيخصم النظام 24 قطعة من المخزون تلقائياً ويطبق سعر الكرتونة!',
    keywords: ['باركود', 'متعدد', 'كرتونة', 'حزمة', 'معامل التحويل', 'قطع', 'جرد'],
  },
  {
    id: 'faq-barcode-labels-print',
    category: 'ملصقات الباركود',
    q: 'كيف أطبع ملصقات باركود حرارية للمنتجات وبأي مقاسات؟',
    a: 'افتح صفحة "طباعة الباركود" من القائمة الجانبية:\n1. اختر المنتجات والكمية المطلوبة (أو اضغط "مطابقة رصيد المخزون" لطباعة ملصق لكل قطعة متوفرة).\n2. اختر المقاس: ملصق حراري مفرد (38x25mm، 40x30mm، 50x30mm) أو ورق مكتبي A4.\n3. خصص البيانات (اسم المحل، السعر، الباركود Code128 / EAN-13).\n4. اضغط "طباعة الملصقات" لترسل الأوامر مباشرة لطابعة الباركود الحرارية.',
    keywords: ['ملصقات', 'طباعة باركود', 'استوديو', 'labels', '38x25', '40x30', 'a4'],
  },
];

const PRESET_QUESTIONS = [
  {
    category: 'العبوات والمفضلة (تصميم 5)',
    q: 'كيف أبيع العبوات في المفضلة بتصميم 5 وأعدل عدد القطع؟',
  },
  {
    category: 'الطباعة الحرارية وفاتورة الجملة',
    q: 'ما هو الفرق بين سعر س1 وسعر س3 في العبوات وطباعة فاتورة الجملة؟',
  },
  {
    category: 'الهاتف والشبكة والأجهزة',
    q: 'كيف أربط هواتف بائعي الصالة بكاشير المحل عبر مسح QR؟',
  },
  {
    category: 'نقطة البيع (POS) والتصاميم',
    q: 'ما هي أهم اختصارات لوحة المفاتيح لتسريع الكاشير (F1-F12)؟',
  },
  {
    category: 'ملصقات الباركود',
    q: 'كيف أطبع ملصقات باركود حرارية للسلع بمقاسات مختلفة؟',
  },
  {
    category: 'نقطة البيع (POS) والتصاميم',
    q: 'كيف أبيع سلعة طارئة ليست مسجلة مسبقاً في المخزون (منتج حر)؟',
  },
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState<ViewTab>('assistant');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('الكل');
  const [activeGuideId, setActiveGuideId] = useState<string>('pos-packages-favs-design5');
  const [openFaq, setOpenFaq] = useState<string | null>('faq-packages-design5');
  const [copiedFaqId, setCopiedFaqId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', category: 'استفسار عام', message: '', phone: '0555220620' });

  // Assistant Chat State
  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: 'مرحباً بك في المساعد الفني الذكي لنظام AN POS! أنا محرك المساعدة الفني المحلي، أعمل بنسبة 100% Offline للإجابة الفورية على استفساراتك حول تشغيل الكاشير، بيع العبوات في تصميم 5، فواتير الجملة، وإعدادات الطابعات والشبكة.',
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      badge: 'الذكاء الفني المحلي',
      proTip: 'يمكنك كتابة سؤالك مباشرة أو النقر على أي من الأسئلة المقترحة بالأسفل لتلقي حل مفصل وخطوة بخطوة مع رابط الشاشة المطلوب!',
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.settings.get('default'),
  });

  const shopName = rawSettings?.shopName || 'متجر AN POS';
  const phone1 = '0555 22 06 20';
  const phone1Raw = '0555220620';
  const phone2 = '0674 78 48 59';
  const phone2Raw = '0674784859';
  const supportEmail = 'andev20000@gmail.com';
  const facebookUrl = 'https://www.facebook.com/profile.php?id=61591569137725';
  const instagramUrl = 'https://www.instagram.com/andev2000?fbclid=IwY2xjawUQkQ9wZG9mBWV4dG4DYWVtAjEwAGJyaWQRMXlGZGpkNEM4MFM1dUtZTkJzcnRjBmFwcF9pZBAyMjIwMzkxNzg4MjAwODkyAAEeAAZWiIYeIuwBhaRc88BIn6Q2ZywC3vbJXcN4G8DuNb0aiUhhlmEnKmJ3Ra8_aem_-OaaqMAitpVBgPx2ePIGLA';
  const youtubeUrl = 'https://youtube.com/@andev20?si=lEgm3MCiWbede7de';
  const whatsappUrl1 = `https://wa.me/213555220620?text=${encodeURIComponent(
    `السلام عليكم، أحتاج مساعدة في نظام ${shopName} بخصوص نقطة البيع.`
  )}`;
  const whatsappUrl2 = `https://wa.me/213674784859?text=${encodeURIComponent(
    `السلام عليكم، أحتاج مساعدة في نظام ${shopName} بخصوص نقطة البيع.`
  )}`;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAssistantThinking]);

  // Filtered guides based on search and category
  const filteredGuides = useMemo(() => {
    return GUIDES.filter((guide) => {
      const matchesCategory = activeCategory === 'الكل' || guide.category === activeCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = guide.title.toLowerCase().includes(q);
      const inDesc = guide.shortDesc.toLowerCase().includes(q);
      const inSteps = guide.steps.some((s) => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
      const inShortcuts = guide.shortcuts?.some((sc) => sc.key.toLowerCase().includes(q) || sc.label.toLowerCase().includes(q));

      return inTitle || inDesc || inSteps || inShortcuts;
    });
  }, [activeCategory, searchQuery]);

  // Filtered system features based on search and category
  const filteredFeatures = useMemo(() => {
    return SYSTEM_FEATURES.filter((feat) => {
      const matchesCategory = activeCategory === 'الكل' || feat.category === activeCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = feat.title.toLowerCase().includes(q);
      const inDesc = feat.desc.toLowerCase().includes(q);
      const inHighlights = feat.highlights.some((h) => h.toLowerCase().includes(q));
      const inBadge = feat.badge.toLowerCase().includes(q);

      return inTitle || inDesc || inHighlights || inBadge;
    });
  }, [activeCategory, searchQuery]);

  // Filtered FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    return FAQS.filter((faq) => {
      const matchesCategory = activeCategory === 'الكل' || faq.category === activeCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inQ = faq.q.toLowerCase().includes(q);
      const inA = faq.a.toLowerCase().includes(q);
      const inKeywords = faq.keywords.some((k) => k.toLowerCase().includes(q));

      return inQ || inA || inKeywords;
    });
  }, [activeCategory, searchQuery]);

  const activeGuide = useMemo(() => {
    return GUIDES.find((g) => g.id === activeGuideId) || filteredGuides[0] || GUIDES[0];
  }, [activeGuideId, filteredGuides]);

  const totalResultsCount = filteredGuides.length + filteredFeatures.length + filteredFaqs.length;

  const handleCopyFaq = (faq: FaqItem) => {
    const textToCopy = `س: ${faq.q}\n\nج: ${faq.a}\n\n(مرجع الدعم الفني: AN POS)`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedFaqId(faq.id);
    setTimeout(() => setCopiedFaqId(null), 2500);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFaqId(id);
    setTimeout(() => setCopiedFaqId(null), 2500);
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbackGiven((prev) => ({ ...prev, [id]: type }));
  };

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.message.trim()) return;

    setTicketSent(true);
    setTimeout(() => {
      setTicketSent(false);
      setIsTicketModalOpen(false);
      setTicketForm({ subject: '', category: 'استفسار عام', message: '', phone: phone1Raw });
    }, 2000);
  };

  // Smart Offline Knowledge Base Engine
  const generateAssistantAnswer = (queryText: string): AssistantMessage => {
    const q = queryText.toLowerCase().trim();

    // 1. Packages, Favorites, and Design 5
    if (q.includes('عبوة') || q.includes('عبوات') || q.includes('مفضلة') || q.includes('تصميم 5') || q.includes('كرتونة') || q.includes('حليب')) {
      return {
        id: String(Date.now()),
        sender: 'assistant',
        text: 'في نقطة البيع المتقدمة (تصميم 5)، تم تخصيص المفضلة لعرض العبوات والكراتين فقط، وفصلها تماماً عن تصنيفات التجزئة لتسريع وتيرة الكاشير.',
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        badge: 'تصميم 5 والعبوات',
        steps: [
          '1. في المفضلة تظهر العبوات المعبأة فقط، وتم حذف المنتجات الفردية الحرة لمنع الخلط.',
          '2. استقلالية تامة: تصنيف المفضلة منفصل ومستقل عن تصنيفات التجزئة لمنع التداخل عند التبديل.',
          '3. أداة تعديل العبوات: يمكنك فتح تعديل العبوات من المفضلة وضبط عدد القطع المصرح بها والسعر فورياً.',
          '4. احتساب الكميات: في س1/س2/س4 تسجل الكمية بعدد القطع، وفي س3 تسجل بعدد العبوات وتطبع فاتورة جملة.',
        ],
        proTip: 'تصميم 5 مثالي للبقالة والسوبرماركت التي تبيع كراتين العصير والحليب بالقطع أو بالجملة دون الحاجة لباركود كرتونة.',
        route: '/pos/advanced',
        routeLabel: 'فتح نقطة البيع المتقدمة (تصميم 5)',
      };
    }

    // 2. Pricing & Wholesale Invoices (S1 vs S3)
    if (q.includes('س1') || q.includes('س2') || q.includes('س3') || q.includes('س4') || q.includes('جملة') || q.includes('فاتورة الجملة') || q.includes('طباعة')) {
      return {
        id: String(Date.now()),
        sender: 'assistant',
        text: 'يمتلك نظام AN POS محرك تسعير ذكي يفرق تلقائياً بين مبيعات التجزئة ومبيعات الجملة في احتساب الكميات ونوع الفاتورة المطبوعة.',
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        badge: 'تسعير وطباعة مزدوجة',
        steps: [
          '1. أسعار التجزئة (س1)، نصف جملة (س2)، وخاص (س4): تسجل الفاتورة عدد القطع الفعلي في العبوة وتطبع في فاتورة البيع العادية.',
          '2. سعر الجملة (س3): تسجل الفاتورة عدد العبوات وعدد القطع وتطبع تلقائياً في "فاتورة الجملة" المجهزة ببيانات العميل.',
          '3. التبديل الفوري: يمكنك التحويل بين الفئات بضغطة زر (س1-س4) ليقوم النظام بتعديل الأسعار وإعادة توجيه قالب الطباعة.',
        ],
        proTip: 'يمكنك تخصيص قياسات الطباعة (80mm أو 58mm أو A4/A5) من إعدادات الطابعات الحرارية.',
        route: '/pos/advanced',
        routeLabel: 'معاينة نقطة البيع المتقدمة',
      };
    }

    // 3. Mobile & Network Sync
    if (q.includes('هاتف') || q.includes('جوال') || q.includes('qr') || q.includes('شبكة') || q.includes('fastify') || q.includes('مزامنة')) {
      return {
        id: String(Date.now()),
        sender: 'assistant',
        text: 'يتصل تطبيق الهاتف بنقطة بيع AN POS سطح المكتب لاسلكياً عبر شبكة Wi-Fi المحلية وخادم Fastify على المنفذ 3000 دون الحاجة للإنترنت.',
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        badge: 'مزامنة الهواتف',
        steps: [
          '1. تأكد أن الحاسوب والهاتف متصلان بنفس شبكة Wi-Fi أو بنقطة اتصال (Hotspot).',
          '2. من شاشة الإعدادات > الشبكة، امسح رمز QR الظاهر على شاشة الحاسوب عبر تطبيق الهاتف.',
          '3. يتم الاقتران فورياً خلال ثانية واحدة وتتبادل الأجهزة المبيعات والجرد والأسعار.',
          '4. يمكنك مراقبة الأجهزة المتصلة وتوثيق هواتف عمال الصالة من تبويب القائمة البيضاء.',
        ],
        proTip: 'يعمل الاتصال في الشبكة المحلية دون استهلاك أي رصيد إنترنت.',
        route: '/settings',
        routeLabel: 'إعدادات الشبكة والـ QR',
      };
    }

    // 4. Barcode Labels Printing
    if (q.includes('ملصق') || q.includes('ملصقات') || q.includes('باركود') || q.includes('طباعة باركود') || q.includes('استوديو')) {
      return {
        id: String(Date.now()),
        sender: 'assistant',
        text: 'يتيح لك استوديو طباعة الباركود تصميم وطباعة ملصقات الأسعار والباركود لمختلف أنواع السلع والقياسات الحرارية.',
        timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
        badge: 'ملصقات الباركود',
        steps: [
          '1. افتح صفحة "طباعة الباركود" من القائمة الجانبية.',
          '2. اختر المنتجات أو اضغط "مطابقة رصيد المخزون" لجلب الكميات المتوفرة تلقائياً.',
          '3. حدد المقاس: ملصق حراري مفرد (38x25mm، 40x30mm) أو صفحة A4 مقسمة.',
          '4. اضغط "طباعة الملصقات" لإرسال الأوامر مباشرة لطابعة الباركود.',
        ],
        proTip: 'يمكنك إظهار أو إخفاء السعر واسم المتجر وتاريخ الصلاحية من خيارات التصميم.',
        route: '/barcode-print',
        routeLabel: 'فتح استوديو طباعة الباركود',
      };
    }

    // Default Fallback
    return {
      id: String(Date.now()),
      sender: 'assistant',
      text: `لقد استلمت استفسارك بخصوص: "${queryText}". نظام AN POS مجهز بقاعدة معرفية شاملة تغطي كافة الخصائص التشغيلية لنقطة البيع.`,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
      badge: 'إجابة عامة',
      steps: [
        '1. يمكنك تصفح التبويبات أعلاه للاطلاع على "أدلة التشغيل خطوة بخطوة" أو "موسوعة ميزات التطبيق".',
        '2. إذا كنت تقصد بيع العبوات: افتح نقطة البيع المتقدمة (تصميم 5) وتصفح المفضلة المستقلة.',
        '3. إذا كنت تبحث عن اختصارات الكاشير: اضغط F1 للبيع، F2 للخصم، F3 للتعليق، و F6 لفحص الأسعار.',
        '4. للتواصل مع فريق المهندسين مباشرة، استخدم تبويب "قنوات الدعم الفني" عبر واتساب.',
      ],
      proTip: 'اضغط على أحد الأسئلة المقترحة السريعة للحصول على شرح تقني فوري ومباشر!',
      route: '/pos/advanced',
      routeLabel: 'فتح نقطة البيع المتقدمة',
    };
  };

  const handleSendAssistantMessage = (customText?: string) => {
    const textToSend = (customText || assistantInput).trim();
    if (!textToSend) return;

    const userMsg: AssistantMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setAssistantInput('');
    setIsAssistantThinking(true);

    setTimeout(() => {
      const responseMsg = generateAssistantAnswer(textToSend);
      setChatMessages((prev) => [...prev, responseMsg]);
      setIsAssistantThinking(false);
    }, 450);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="bg-amber-200 text-amber-950 dark:bg-amber-500/30 dark:text-amber-200 font-bold px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      {/* 1. HERO & SEARCH EXPERIENCE */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 border border-primary/20 bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-low dark:from-surface-container dark:via-surface-container-high/80 dark:to-surface-container shadow-xl backdrop-blur-xl">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 dark:border-primary/30 text-primary text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مركز المساعدة ودليل تشغيل {shopName} (الإصدار 2.5.0 المتطور)</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-on-surface font-cairo tracking-tight">
            دليل التشغيل الشامل والمساعد الفني الذكي
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant font-medium leading-relaxed max-w-2xl mx-auto">
            شرح تفصيلي ومساعد تفاعلي ذكي لكافة ميزات النظام، نقطة البيع بتصميم 5 والعبوات، الطباعة المزدوجة، ملصقات الباركود، وشبكة الهواتف
          </p>

          {/* Interactive Search Bar */}
          <div className="relative max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن ميزة، عبوة، تصميم 5، فاتورة جملة، أو اختصار زر (مثال: س3، عبوات، F1)..."
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl pr-12 pl-28 py-4 text-sm md:text-base text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-md outline-none"
              />
              <Search className="absolute right-4 w-5 h-5 text-on-surface-variant pointer-events-none" />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-24 p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="absolute left-3">
                <span className="px-3 py-1.5 bg-primary text-white dark:bg-primary/20 dark:text-primary font-bold text-xs rounded-xl border border-primary/30 shadow-sm">
                  {totalResultsCount} نتيجة
                </span>
              </div>
            </div>
          </div>

          {/* Category Chips Filter */}
          <div className="flex items-center justify-center gap-1.5 pt-2 flex-wrap max-w-4xl mx-auto">
            {CATEGORIES.map((cat) => {
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
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-semibold border border-[#1877F2]/20 transition-all hover:scale-105"
            >
              <FacebookIcon className="w-3.5 h-3.5" />
              <span>فيسبوك</span>
            </a>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E4405F]/10 hover:bg-[#E4405F]/20 text-[#E4405F] font-semibold border border-[#E4405F]/20 transition-all hover:scale-105"
            >
              <InstagramIcon className="w-3.5 h-3.5" />
              <span>إنستغرام (@andev2000)</span>
            </a>
            <a
              href={youtubeUrl}
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

      {/* 2. SYSTEM DIAGNOSTIC & STATUS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-on-surface-variant font-medium truncate">قاعدة البيانات المحلية</div>
            <div className="text-sm font-bold text-on-surface font-cairo truncate">SQLite + Dexie (نشطة)</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-on-surface-variant font-medium truncate">الخادم الداخلي (Fastify)</div>
            <div className="text-sm font-bold text-cyan-700 dark:text-cyan-400 font-mono truncate">المنفذ :3000 متصل</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-on-surface-variant font-medium truncate">محطة الكاشير (تصميم 5)</div>
            <div className="text-sm font-bold text-amber-700 dark:text-amber-400 font-cairo truncate">مفضلة العبوات المخصصة</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/15 border border-blue-300 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
            <Printer className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-on-surface-variant font-medium truncate">منظومة الطباعة والتسعير</div>
            <div className="text-sm font-bold text-blue-700 dark:text-blue-400 font-cairo truncate">فواتير عادية + جملة (س3)</div>
          </div>
        </div>
      </div>

      {/* 3. VIEW TABS SWITCHER (SUB-NAVIGATION) */}
      <div className="flex items-center gap-2 p-1.5 bg-surface-container rounded-2xl border border-outline-variant/20 overflow-x-auto">
        <button
          onClick={() => setCurrentTab('assistant')}
          className={`flex-1 min-w-[190px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === 'assistant'
              ? 'bg-gradient-to-r from-primary to-cyan-600 text-white shadow-md shadow-primary/20 scale-[1.02]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Bot className="w-4 h-4 shrink-0" />
          <span>المساعد الفني الذكي</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold">
            AI Offline
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('guides')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === 'guides'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>أدلة التشغيل خطوة بخطوة</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${currentTab === 'guides' ? 'bg-white/20' : 'bg-surface-container-highest'}`}>
            {filteredGuides.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('features')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === 'features'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>موسوعة ميزات التطبيق</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${currentTab === 'features' ? 'bg-white/20' : 'bg-surface-container-highest'}`}>
            {filteredFeatures.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('faqs')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === 'faqs'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>الأسئلة الشائعة والحلول</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono ${currentTab === 'faqs' ? 'bg-white/20' : 'bg-surface-container-highest'}`}>
            {filteredFaqs.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentTab('contact')}
          className={`flex-1 min-w-[170px] py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            currentTab === 'contact'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Phone className="w-4 h-4 shrink-0" />
          <span>قنوات الدعم الفني المباشر</span>
        </button>
      </div>

      {/* 4. TAB 0: SMART AI ASSISTANT (OFFLINE INTELLIGENCE) */}
      {currentTab === 'assistant' && (
        <div className="space-y-6 animate-fade-in">
          <div className="glass-card rounded-3xl p-6 md:p-8 border border-primary/25 bg-surface-container/70 shadow-lg space-y-6">
            {/* Assistant Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/15 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 text-white flex items-center justify-center shadow-md shadow-primary/25">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-on-surface font-cairo">المساعد الفني الذكي التفاعلي</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      يعمل محلياً (Offline 100%)
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    اطرح أي سؤال حول تشغيل الكاشير، بيع العبوات في تصميم 5، فواتير الجملة، أو إعدادات الطابعات والشبكة
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setChatMessages([
                    {
                      id: 'welcome-reset',
                      sender: 'assistant',
                      text: 'تمت إعادة تعيين المحادثة. كيف يمكنني مساعدتك الآن في نظام AN POS؟',
                      timestamp: new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }),
                      badge: 'جلسة جديدة',
                      proTip: 'يمكنك تجربة أحد الأسئلة المقترحة بالأسفل.',
                    },
                  ]);
                }}
                className="px-3.5 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-high rounded-xl border border-outline-variant/20 hover:bg-surface-container-highest transition-all flex items-center gap-1.5 w-fit cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>بدء استفسار جديد</span>
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>استفسارات وحالات شائعة جاهزة للإرسال:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_QUESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendAssistantMessage(item.q)}
                    className="text-right px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-high hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-outline-variant/15 text-on-surface transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3 h-3 rotate-180 text-primary shrink-0" />
                    <span>{item.q}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat History Box */}
            <div className="bg-surface-container-lowest/80 border border-outline-variant/20 rounded-2xl p-4 md:p-6 min-h-[420px] max-h-[560px] overflow-y-auto space-y-4 shadow-inner">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        isUser
                          ? 'bg-primary text-white'
                          : 'bg-gradient-to-br from-cyan-600 to-primary text-white'
                      }`}
                    >
                      {isUser ? <Users className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-3 ${
                        isUser
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-surface-container border border-outline-variant/20 text-on-surface rounded-tl-none shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-black/10 dark:border-white/10 pb-1.5 text-[11px]">
                        <span className="font-bold flex items-center gap-1">
                          {isUser ? 'أنت' : 'المساعد الفني الذكي'}
                          {msg.badge && (
                            <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary dark:text-cyan-300 font-bold border border-primary/25 text-[10px]">
                              {msg.badge}
                            </span>
                          )}
                        </span>
                        <span className="opacity-70 font-mono">{msg.timestamp}</span>
                      </div>

                      <p className="text-xs md:text-sm leading-relaxed whitespace-pre-line font-medium">
                        {msg.text}
                      </p>

                      {/* Structured Steps if available */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-xs font-bold text-primary dark:text-cyan-300">خطوات التنفيذ الموصى بها:</div>
                          <div className="space-y-1 text-xs text-on-surface-variant bg-surface-container-high/60 p-3 rounded-xl border border-outline-variant/15">
                            {msg.steps.map((st, i) => (
                              <div key={i} className="leading-relaxed">
                                {st}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pro Tip if available */}
                      {msg.proTip && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">نصيحة ذهبية: </span>
                            <span>{msg.proTip}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Bar (Navigate + Copy) */}
                      {!isUser && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/10 text-xs">
                          {msg.route && (
                            <button
                              onClick={() => navigate(msg.route!)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <span>{msg.routeLabel || 'فتح الشاشة'}</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/20 transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedFaqId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-600 font-bold">تم النسخ!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>نسخ الرد</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isAssistantThinking && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-primary text-white flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface-variant flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span>المساعد الفني يحلل السؤال في قاعدة البيانات المحلية...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendAssistantMessage();
              }}
              className="relative flex items-center gap-2 pt-2"
            >
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder="اكتب استفسارك هنا (مثال: كيف أبيع عبوة حليب في س3؟ كيف أربط الهاتف؟)..."
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl pr-4 pl-28 py-3.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
              />
              <button
                type="submit"
                disabled={!assistantInput.trim()}
                className="absolute left-2.5 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-primary/20"
              >
                <span>إرسال</span>
                <Send className="w-3.5 h-3.5 rotate-180" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. TAB 1: INTERACTIVE STEP-BY-STEP OPERATION GUIDES */}
      {currentTab === 'guides' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                أدلة تشغيل النظام خطوة بخطوة
              </h2>
              <p className="text-xs text-on-surface-variant">
                اختر مسار العمل المطلوب لتتعلم كيفية تنفيذه بأعلى كفاءة وأسرع طريقة مع اختصارات لوحة المفاتيح
              </p>
            </div>
            <span className="text-xs font-semibold text-on-surface-variant/80 bg-surface-container-high px-3 py-1 rounded-full w-fit">
              {filteredGuides.length} أدلة متاحة
            </span>
          </div>

          {filteredGuides.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-on-surface">لم يتم العثور على أدلة تطابق بحثك</h3>
              <p className="text-xs text-on-surface-variant">جرب كلمة بحث أخرى أو اختر تصنيف "الكل".</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('الكل');
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                إعادة ضبط الفلتر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Guides Navigation List */}
              <div className="lg:col-span-5 space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
                {filteredGuides.map((guide) => {
                  const IconComponent = guide.icon;
                  const isSelected = activeGuide.id === guide.id;
                  return (
                    <button
                      key={guide.id}
                      onClick={() => setActiveGuideId(guide.id)}
                      className={`w-full text-right p-4 rounded-2xl transition-all border flex items-start gap-3.5 cursor-pointer ${
                        isSelected
                          ? 'bg-surface-container-highest border-primary/50 shadow-md shadow-primary/5 ring-1 ring-primary/20'
                          : 'bg-surface-container/60 hover:bg-surface-container border-outline-variant/15'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl border shrink-0 ${guide.iconBg}`}>
                        <IconComponent className={`w-5 h-5 ${guide.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-on-surface truncate font-cairo">
                            {highlightText(guide.title, searchQuery)}
                          </h4>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-medium shrink-0">
                            {guide.timeEstimate}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                          {highlightText(guide.shortDesc, searchQuery)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Guide Detailed Interactive Card */}
              <div className="lg:col-span-7">
                <div className="glass-card rounded-3xl p-6 md:p-8 border border-primary/20 bg-surface-container/80 space-y-6 h-full flex flex-col justify-between">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/10 pb-5">
                      <div className="flex items-center gap-3.5">
                        <div className={`p-3 rounded-2xl border ${activeGuide.iconBg}`}>
                          {(() => {
                            const ActiveIcon = activeGuide.icon;
                            return <ActiveIcon className={`w-6 h-6 ${activeGuide.iconColor}`} />;
                          })()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                              {activeGuide.category}
                            </span>
                            <span className="text-xs text-on-surface-variant">المدة التقريبية: {activeGuide.timeEstimate}</span>
                          </div>
                          <h3 className="text-lg md:text-xl font-bold text-on-surface font-cairo mt-1">
                            {highlightText(activeGuide.title, searchQuery)}
                          </h3>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(activeGuide.route)}
                        className="px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>{activeGuide.routeLabel}</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Shortcuts Row */}
                    {activeGuide.shortcuts && activeGuide.shortcuts.length > 0 && (
                      <div className="p-4 rounded-2xl bg-surface-container-high/70 border border-outline-variant/15 space-y-2">
                        <div className="text-xs font-bold text-on-surface font-cairo flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>أهم الاختصارات السريعة المرتبطة بهذه الميزة:</span>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {activeGuide.shortcuts.map((sc, i) => (
                            <div
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                            >
                              <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px] border border-outline-variant/30">
                                {sc.key}
                              </kbd>
                              <span className="text-on-surface-variant font-cairo">{sc.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Steps List */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-on-surface font-cairo flex items-center gap-2">
                        <Compass className="w-4 h-4 text-primary" />
                        <span>خطوات التنفيذ العملية:</span>
                      </h4>

                      <div className="space-y-3">
                        {activeGuide.steps.map((step, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl bg-surface-container-lowest/60 border border-outline-variant/15 flex items-start gap-3.5"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-on-surface font-cairo">
                                  {highlightText(step.title, searchQuery)}
                                </h5>
                                {step.badge && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20 text-[10px] font-bold">
                                    {step.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-on-surface-variant leading-relaxed">
                                {highlightText(step.desc, searchQuery)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pro Tip Box */}
                  <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-300 font-cairo mb-0.5">نصيحة ذهبية لتسريع العمل:</div>
                      <p className="text-xs text-amber-950 dark:text-on-surface leading-relaxed">{activeGuide.proTip}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB 2: SYSTEM FEATURES ENCYCLOPEDIA */}
      {currentTab === 'features' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 border-b border-outline-variant/10 pb-4">
            <div>
              <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                موسوعة ميزات وخصائص نظام AN POS
              </h2>
              <p className="text-xs text-on-surface-variant">
                دليل تفصيلي شامل يوثق كل أداة وخاصية في التطبيق وكيفية الوصول إليها والاستفادة منها في إدارة متجرك
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 w-fit">
              {filteredFeatures.length} ميزة معرفة
            </span>
          </div>

          {filteredFeatures.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-on-surface">لم نجد ميزات تطابق بحثك</h3>
              <p className="text-xs text-on-surface-variant">جرب كلمة بحث أخرى أو غير التصنيف المحدد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFeatures.map((feat) => {
                const IconComponent = feat.icon;
                return (
                  <div
                    key={feat.id}
                    className="glass-card rounded-3xl p-5 border border-outline-variant/15 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 hover:shadow-lg group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`p-2.5 rounded-xl border ${feat.iconBg}`}>
                          <IconComponent className={`w-5 h-5 ${feat.iconColor}`} />
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-highest text-on-surface-variant border border-outline-variant/20">
                          {feat.badge}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-primary font-bold">{feat.category}</span>
                        <h4 className="text-base font-bold text-on-surface font-cairo mt-0.5">
                          {highlightText(feat.title, searchQuery)}
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                          {highlightText(feat.desc, searchQuery)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-outline-variant/10 space-y-1.5">
                        <div className="text-[11px] font-bold text-on-surface font-cairo">أبرز الخصائص:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {feat.highlights.map((h, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-medium border border-outline-variant/10"
                            >
                              {highlightText(h, searchQuery)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(feat.route)}
                      className="w-full py-2.5 px-3 rounded-xl bg-surface-container-high group-hover:bg-primary group-hover:text-white text-on-surface-variant text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>الانتقال للميزة</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 7. TAB 3: FAQ & DIAGNOSTIC ACCORDION */}
      {currentTab === 'faqs' && (
        <div className="glass-card rounded-3xl p-6 md:p-8 border border-outline-variant/15 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/10 pb-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                الأسئلة الأكثر شيوعاً وحلول المشاكل التقنية
              </h2>
              <p className="text-xs text-on-surface-variant">
                حلول عملية فورية ومباشرة لكافة الاستفسارات التي قد تواجه الكاشير أو مدير النظام أثناء العمل اليومي
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/20 w-fit">
              {filteredFaqs.length} سؤال متوفر
            </span>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
              <p className="text-sm font-semibold text-on-surface">لم نجد إجابة مطابقة لبحثك في هذا القسم</p>
              <p className="text-xs text-on-surface-variant">
                يمكنك كتابة استفسارك في تبويب "المساعد الفني الذكي" أو عبر قنوات الدعم المباشر.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                const isCopied = copiedFaqId === faq.id;
                const feedback = feedbackGiven[faq.id];

                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isOpen
                        ? 'bg-surface-container-high/80 border-primary/40 shadow-lg'
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
                          {highlightText(faq.q, searchQuery)}
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
                          {highlightText(faq.a, searchQuery)}
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
      )}

      {/* 8. TAB 4: DIRECT CHANNELS & TICKETING */}
      {currentTab === 'contact' && (
        <div className="space-y-6 animate-fade-in">
          <div className="border-b border-outline-variant/10 pb-4 px-1">
            <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              قنوات الدعم الفني والتواصل المباشر
            </h2>
            <p className="text-xs text-on-surface-variant">
              فريق المهندسين والدعم الفني متاح لمساعدتك عبر الهاتف، الواتساب، أو عبر فتح تذكرة دعم برمجية فورية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* WhatsApp Card */}
            <div className="glass-card rounded-3xl p-6 text-center border border-emerald-500/30 bg-surface-container/70 flex flex-col justify-between space-y-4 shadow-sm hover:border-emerald-500/50 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mx-auto shadow-sm">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-on-surface font-cairo">محادثة واتساب فورية</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  تواصل مباشرة مع فريق الخبراء عبر تطبيق WhatsApp للتدخل السريع وحل المشاكل التقنية واستفسارات التشغيل.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-sm font-bold dir-ltr select-all">
                  <a
                    href={whatsappUrl1}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 hover:underline px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                  >
                    {phone1}
                  </a>
                  <span className="text-xs text-on-surface-variant font-cairo">أو</span>
                  <a
                    href={whatsappUrl2}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 hover:underline px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                  >
                    {phone2}
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={whatsappUrl1}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/25"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب (1)</span>
                </a>
                <a
                  href={whatsappUrl2}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/25"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب (2)</span>
                </a>
              </div>
            </div>

            {/* Email / Ticket Support */}
            <div className="glass-card rounded-3xl p-6 text-center border border-cyan-500/30 bg-surface-container/70 flex flex-col justify-between space-y-4 shadow-sm hover:border-cyan-500/50 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 mx-auto shadow-sm">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-on-surface font-cairo">تذكرة مساعدة داخلية</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  أرسل بلاغاً أو مشكلة برمجية مشفوعة ببيانات إصدار النظام وقاعدة البيانات للمتابعة.
                </p>
                <p className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 dir-ltr select-all">
                  {supportEmail}
                </p>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-cyan-600/25"
              >
                <Send className="w-4 h-4" />
                <span>فتح تذكرة داخلية</span>
              </button>
            </div>

            {/* Emergency Phone Support */}
            <div className="glass-card rounded-3xl p-6 text-center border border-amber-500/30 bg-surface-container/70 flex flex-col justify-between space-y-4 shadow-sm hover:border-amber-500/50 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 mx-auto shadow-sm">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-on-surface font-cairo">الاتصال الهاتفي المباشر</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  للحالات العاجلة وانقطاع العمل في أوقات الذروة، متاح من السبت إلى الخميس (08:00 - 20:00).
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-sm font-bold dir-ltr select-all">
                  <a
                    href={`tel:${phone1Raw}`}
                    className="text-amber-800 dark:text-amber-300 hover:underline px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                  >
                    {phone1}
                  </a>
                  <span className="text-xs text-on-surface-variant font-cairo">أو</span>
                  <a
                    href={`tel:${phone2Raw}`}
                    className="text-amber-800 dark:text-amber-300 hover:underline px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
                  >
                    {phone2}
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${phone1Raw}`}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/25"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>اتصال (1)</span>
                </a>
                <a
                  href={`tel:${phone2Raw}`}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/25"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>اتصال (2)</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. INTERNAL TICKET MODAL */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card rounded-3xl p-6 md:p-8 max-w-lg w-full border border-outline-variant/30 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface font-cairo">فتح تذكرة دعم داخلي</h3>
                  <p className="text-xs text-on-surface-variant">يتم إرسال التقرير لمكتب المطور الفني</p>
                </div>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ticketSent ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-on-surface font-cairo">تم إرسال تذكرتك بنجاح!</h4>
                <p className="text-xs text-on-surface-variant">
                  سيتواصل معك فريق الدعم التقني في أقرب وقت عبر الهاتف المسجل.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-4">
                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-on-surface font-cairo">تصنيف المشكلة</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:border-primary outline-none"
                  >
                    <option value="استفسار عام">استفسار عام</option>
                    <option value="نقطة البيع وتصميم 5">نقطة البيع وتصميم 5 والعبوات</option>
                    <option value="طباعة حرارية وفواتير">طباعة حرارية وفواتير جملة</option>
                    <option value="مزامنة الهواتف">مزامنة الهواتف وشبكة Fastify</option>
                    <option value="مخزون وباركود">مخزون وباركودات متعددة</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-on-surface font-cairo">عنوان البلاغ</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مشكلة في طباعة فاتورة الجملة بسعر س3..."
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:border-primary outline-none"
                  >
                  </input>
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-on-surface font-cairo">رقم الهاتف للتواصل</label>
                  <input
                    type="text"
                    required
                    value={ticketForm.phone}
                    onChange={(e) => setTicketForm({ ...ticketForm, phone: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:border-primary outline-none font-mono dir-ltr text-right"
                  >
                  </input>
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-xs font-bold text-on-surface font-cairo">تفاصيل المشكلة أو الاستفسار</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="اكتب شرحاً مفصلاً للمشكلة أو الرسالة التي ظهرت لك..."
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-3 text-xs text-on-surface focus:border-primary outline-none resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setIsTicketModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال التذكرة الآن</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
