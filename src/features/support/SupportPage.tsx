import { useState, useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';

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

const CATEGORIES = [
  'الكل',
  'نقطة البيع (POS)',
  'المنتجات والباركود',
  'الصندوق والمصاريف',
  'العملاء والديون',
  'الطباعة والقوالب',
  'الهاتف والشبكة',
  'الأمان والحسابات',
] as const;

type CategoryType = (typeof CATEGORIES)[number];

const GUIDES: InteractiveGuide[] = [
  {
    id: 'pos-workflow',
    category: 'نقطة البيع (POS)',
    title: 'دورة المبيعات السريعة وإنشاء الفواتير',
    shortDesc: 'تعلم كيف تبيع بسرعة باستخدام الباركود أو الاختصارات، وتعليق وسداد الفواتير.',
    timeEstimate: 'دقيقتان',
    icon: ShoppingCart,
    iconColor: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30',
    route: '/pos',
    routeLabel: 'فتح شاشة نقطة البيع',
    proTip: 'يمكنك إتمام عملية البيع كاملة دون لمس الفأرة بالضغط على F1 للتأكيد الفوري وطباعة الوصل.',
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
        desc: 'اضغط على السطر داخل السلة لزيادة الكمية (+) أو إنقاصها (-)، أو اكتب الكمية يدوياً في حقل العدد.',
      },
      {
        title: '3. تحديد العميل ونوع السداد',
        desc: 'اختر "زبون عادي" للبيع النقدي، أو اختر اسماً من قائمة العملاء للبيع بالدين (آجل).',
      },
      {
        title: '4. إنهاء العملية (F1)',
        desc: 'اضغط زر "تأكيد بيع (F1)"، أدخل المبلغ المستلم لحساب الصرف المتبقي تلقائياً، أو اضغط حفظ ومتابعة للطباعة الفورية.',
        badge: 'موصى به',
      },
    ],
  },
  {
    id: 'products-barcodes',
    category: 'المنتجات والباركود',
    title: 'إدارة المنتجات والباركودات المتعددة',
    shortDesc: 'إضافة أصناف جديدة، دعم باركود القطعة والكرتونة، وإعدادات تنبيهات نفاد المخزون.',
    timeEstimate: '3 دقائق',
    icon: Package,
    iconColor: 'text-cyan-700 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/15 border-cyan-300 dark:border-cyan-500/30',
    route: '/products/new',
    routeLabel: 'إضافة منتج جديد',
    proTip: 'يمكنك ربط أكثر من باركود للمنتج الواحد (باركود القطعة الفردية، وباركود الحزمة أو الكرتونة) لسرعة الجرد.',
    steps: [
      {
        title: '1. إدخال البيانات الأساسية',
        desc: 'اكتب اسم السلعة، التصنيف، وحدد أسعار البيع الثلاثة (التجزئة، الجملة، وسعر الشراء للتكلفة).',
      },
      {
        title: '2. توليد أو قراءة الباركود',
        desc: 'امسح الباركود الدولي المطبوع على المنتج، أو اضغط "توليد كود تلقائي" لتوليد كود داخلي آمن.',
      },
      {
        title: '3. حد إعادة الطلب (Alert Quantity)',
        desc: 'عيّن حداً أدنى للمخزون (مثلاً 5 قطع) ليقوم النظام بتنبيهك تلقائياً في لوحة التحكم عند اقتراب النفاد.',
      },
    ],
  },
  {
    id: 'cash-register',
    category: 'الصندوق والمصاريف',
    title: 'إدارة الصندوق اليومي وجرد الوردية',
    shortDesc: 'فتح الصندوق، تتبع المداخيل والمصاريف النثرية، وتوليد تقرير الإغلاق النهائي (Z-Report).',
    timeEstimate: 'دقيقتان',
    icon: DollarSign,
    iconColor: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30',
    route: '/cash',
    routeLabel: 'إدارة الصندوق والمصاريف',
    proTip: 'قم بتسجيل كل سحب للمصاريف النثرية (قهوة، نقل، فواتير) فوراً لضمان مطابقة النقدية مع التقرير في المساء.',
    steps: [
      {
        title: '1. فتح الصندوق صباحاً',
        desc: 'أدخل رصيد الفكة الافتتاحي (Opening Balance) في بداية يوم العمل لتتبع التدفق بدقة.',
      },
      {
        title: '2. تسجيل السحب والإيداع',
        desc: 'عند سحب مبالغ للموردين أو المصاريف، استخدم زر "سحب نقدي" وسجل السبب وتاريخ العملية.',
      },
      {
        title: '3. الإغلاق اليومي ومطابقة العجز/الفائض',
        desc: 'في نهاية الدوام، قم بعدّ النقود الفعلية في الدرج وأدخلها في النظام لمقارنتها مع الرصيد المحسوب تلقائياً.',
      },
    ],
  },
  {
    id: 'customers-debts',
    category: 'العملاء والديون',
    title: 'إدارة حسابات العملاء ومتابعة الديون',
    shortDesc: 'تسجيل البيع بالدين، سقف الائتمان، استلام دفعات التحصيل، وطباعة كشف الحساب.',
    timeEstimate: '3 دقائق',
    icon: Users,
    iconColor: 'text-blue-700 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/30',
    route: '/customers',
    routeLabel: 'عرض قائمة العملاء والديون',
    proTip: 'يمكنك تحديد "سقف أقصى للديون" لكل عميل، بحيث يمنعه النظام برمجياً من تجاوز المبلغ المتفق عليه.',
    steps: [
      {
        title: '1. تسجيل العميل وربطه بالفاتورة',
        desc: 'في شاشة البيع، اختر العميل قبل إنهاء الفاتورة وحدد نوع السداد "آجل / بالدين".',
      },
      {
        title: '2. تحصيل دفعة نقدية',
        desc: 'من صفحة العملاء، افتح ملف العميل واضغط "تسديد دفعة"، أدخل المبلغ المسلم وسيتم خصمه فورياً من إجمالي الدين.',
      },
      {
        title: '3. طباعة وصل إبراء ذمة',
        desc: 'يصدر النظام وصلاً يحمل الرصيد السابق، المبلغ المدفوع، والرصيد المتبقي لإعطائه للزبون للإثبات.',
      },
    ],
  },
  {
    id: 'printers-templates',
    category: 'الطباعة والقوالب',
    title: 'ضبط الطابعات وتخصيص الفواتير',
    shortDesc: 'تعريف طابعة الفواتير الحرارية (USB / Network)، تصميم الفاتورة وإضافة الباركود وشعار المحل.',
    timeEstimate: '4 دقائق',
    icon: Printer,
    iconColor: 'text-purple-700 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-500/15 border-purple-300 dark:border-purple-500/30',
    route: '/settings/print-templates',
    routeLabel: 'إدارة قوالب الطباعة',
    proTip: 'يدعم النظام مقاسي 80mm و 58mm الحراري القياسيين مع الطباعة المباشرة دون الحاجة لمربعات حوار المتصفح.',
    steps: [
      {
        title: '1. اختيار الطابعة الافتراضية',
        desc: 'من صفحة المبيعات > تبويب الطابعات، اختر الطابعة الحرارية المتصلة بـ USB واضغط "تعيين كافتراضية".',
      },
      {
        title: '2. تخصيص معلومات الترويسة والتذييل',
        desc: 'أضف اسم المحل، أرقام الهواتف، السجل التجاري، ورسالة شكر مخصصة أسفل الوصل.',
      },
      {
        title: '3. تفعيل رمز الاستجابة السريعة (QR Code)',
        desc: 'فعّل خيار QR في محرر القوالب ليتم طباعة كود التحقق الإلكتروني على كل وصل تلقائياً.',
      },
    ],
  },
  {
    id: 'mobile-pairing',
    category: 'الهاتف والشبكة',
    title: 'ربط تطبيق الهاتف الذكي (React Native)',
    shortDesc: 'مزامنة المبيعات والجرد عن بعد عبر شبكة Wi-Fi المحلية ومسح رمز QR السريع.',
    timeEstimate: 'دقيقتان',
    icon: Smartphone,
    iconColor: 'text-indigo-700 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/30',
    route: '/settings',
    routeLabel: 'فتح إعدادات الشبكة والأجهزة',
    proTip: 'تأكد أن هاتف الجرد والحاسوب متصلان بنفس شبكة الـ Wi-Fi المحلية (على منفذ Fastify رقم 4321).',
    steps: [
      {
        title: '1. فتح تبويب الأجهزة المحمولة',
        desc: 'في صفحة الإعدادات، انتقل إلى "الأجهزة المحمولة" وسيظهر لك رمز QR يحتوي عنوان IP المنفذ المحلي.',
      },
      {
        title: '2. مسح الكود من تطبيق الهاتف',
        desc: 'افتح تطبيق AN POS على الهاتف واضغط "ربط بنقطة بيع" وامسح الشاشة ليتم الاقتران فورياً.',
      },
      {
        title: '3. بدء المزامنة والجرد اللاسلكي',
        desc: 'يمكن للبائع الآن مسح الباركود بهاتفه وإرسال الفواتير أو فحص الأسعار مباشرة إلى قاعدة البيانات المركزية.',
      },
    ],
  },
];

const FAQS: FaqItem[] = [
  {
    id: 'faq-offline',
    category: 'نقطة البيع (POS)',
    q: 'هل يعمل نظام AN POS بدون اتصال بالإنترنت؟',
    a: 'نعم بالكامل! يعتمد النظام على معمارية Offline-First المزدوجة؛ حيث تُدار البيانات محلياً على جهازك بواسطة محرك SQLite مدمج وDexie. لا تتوقف عمليات البيع أو الطباعة أو المخزون أبداً حتى في حال انقطاع الإنترنت التام.',
    keywords: ['انترنت', 'offline', 'شبكة', 'انقطاع', 'اتصال', 'محلي'],
  },
  {
    id: 'faq-shortcuts',
    category: 'نقطة البيع (POS)',
    q: 'ما هي أهم اختصارات لوحة المفاتيح في شاشة نقطة البيع؟',
    a: 'أهم الاختصارات المصممة لتسريع الكاشير:\n• [F1]: تأكيد وإنهاء البيع (الدفع الفوري).\n• [F2]: إضافة خصم/تخفيض للمنتج أو الفاتورة.\n• [F3]: تعليق الفاتورة الحالية لخدمة زبون آخر ثم استرجاعها.\n• [F4]: إلغاء السلة وتفريغها بعد التأكيد.\n• [Space]: الانتقال المباشر لحقل البحث عن المنتجات.',
    keywords: ['اختصارات', 'f1', 'f4', 'f2', 'f3', 'سريعة', 'كيبورد', 'لوحة المفاتيح'],
  },
  {
    id: 'faq-multi-barcode',
    category: 'المنتجات والباركود',
    q: 'كيف يمكنني إضافة أكثر من باركود لنفس السلعة؟',
    a: 'عند تعديل المنتج، انتقل إلى قسم "الباركودات المرتبطة". يمكنك إضافة باركود القطعة وباركود الكرتونة أو العلبة، مع إمكانية تعيين معامل التحويل (مثلاً 1 كرتونة = 24 قطعة) ليخصم النظام الكمية بدقة فور المسح.',
    keywords: ['باركود', 'متعدد', 'كرتونة', 'حزمة', 'قطع', 'منتج'],
  },
  {
    id: 'faq-negative-stock',
    category: 'المنتجات والباركود',
    q: 'ماذا يحدث إذا تم بيع سلعة ورصيدها بالمخزون صفر؟',
    a: 'يدعم النظام ميزة "السماح بالبيع بالسالب" اختيارياً من الإعدادات للأنشطة التي تستلم البضاعة قبل إدخال فواتير الشراء، ويقوم النظام بتمييز هذه الأصناف بلون تحذيري في جدول المخزون حتى يتم توريدها وتسوية الرصيد.',
    keywords: ['سالب', 'نفاد', 'صفر', 'مخزون', 'تنبيه'],
  },
  {
    id: 'faq-printer-connect',
    category: 'الطباعة والقوالب',
    q: 'كيف أربط طابعة فواتير حرارية جديدة (USB) بالنظام؟',
    a: '1. قم بتوصيل كابل USB وتثبيت تعريف الطابعة على نظام التشغيل (Windows / Linux).\n2. افتح صفحة "المبيعات" ثم انتقل إلى تبويب "الطابعات".\n3. ستظهر طابعتك في القائمة، اضغط "تعيين كافتراضية" ثم اضغط "اختبار الطباعة" للتأكد من خروج وصل التجربة بنجاح.',
    keywords: ['طابعة', 'حرارية', 'usb', 'طباعة', 'وصل', 'فاتورة', 'تعريف'],
  },
  {
    id: 'faq-invoice-types',
    category: 'نقطة البيع (POS)',
    q: 'ما الفرق بين الفاتورة النهائية والمبدئية (Proforma) والطلبية؟',
    a: '• الفاتورة النهائية: تخصم من المخزون فوراً وتُسجل كإيراد فعلي في الصندوق.\n• الفاتورة المبدئية (Proforma / Devis): عرض سعر موجه للزبون لا يخصم من المخزون ولا يؤثر على الصندوق.\n• الطلبية (Order): حجز للسلع للتحضير أو التوصيل لحين استلام المبلغ وتحويلها لفاتورة مبيعات نهائية.',
    keywords: ['مبدئية', 'طلبية', 'عرض سعر', 'devis', 'proforma', 'فروقات'],
  },
  {
    id: 'faq-password-security',
    category: 'الأمان والحسابات',
    q: 'كيف يحمي النظام كلمات مرور وحسابات المستخدمين؟',
    a: 'يعتمد النظام خوارزمية التشفير الفولاذية scrypt مع قيمة Salt عشوائية فريدة لكل مستخدم (16 بايت) ومقارنة آمنة ضد هجمات التوقيت. لا يتم حفظ أي كلمة مرور بنص صريح أبداً، ويتم التحقق من قوة كلمة المرور (أحرف، أرقام، رموز، وطول لا يقل عن 8 محارف).',
    keywords: ['تشفير', 'امان', 'حماية', 'scrypt', 'كلمة المرور', 'حساب'],
  },
  {
    id: 'faq-admin-only-reg',
    category: 'الأمان والحسابات',
    q: 'كيف أمنع الكاشير أو الأشخاص الغرباء من إنشاء حسابات في النظام؟',
    a: 'من صفحة "الإعدادات" > تبويب "المستخدمين والأدوار" > التبويب الفرعي "سياسات التسجيل والأمان": قم بإلغاء تفعيل خيار "السماح بالتسجيل الذاتي". سيتم فورياً قفل التسجيل من شاشة الدخول ويصبح إنشاء الحسابات مقتصراً حصراً على المدير المسؤول.',
    keywords: ['تسجيل', 'منع', 'صلاحيات', 'مدير', 'كاشير', 'حساب جديد'],
  },
  {
    id: 'faq-debts-management',
    category: 'العملاء والديون',
    q: 'كيف أسجل بيعاً بالدين وكيف أستلم دفعات السداد لاحقاً؟',
    a: '1. في شاشة البيع، اختر اسم العميل من القائمة العلوية ثم اختر نوع الدفع "آجل / دين".\n2. لمتابعة الديون، افتح صفحة "العملاء" وستجد إجمالي ديون كل عميل وسقف حسابه.\n3. عند قدوم العميل للتسديد، اضغط على زر "تسديد دفعة"، أدخل المبلغ المسلم واطبع وصل القبض.',
    keywords: ['دين', 'ديون', 'عملاء', 'زبائن', 'تسديد', 'قسط', 'اجل'],
  },
  {
    id: 'faq-cash-closure',
    category: 'الصندوق والمصاريف',
    q: 'كيف أقوم بجرد الصندوق اليومي وطباعة تقرير Z للإغلاق؟',
    a: 'في نهاية يوم العمل، افتح صفحة "الصندوق" واضغط "إغلاق الصندوق اليومي". قم بإحصاء النقدية الفعلية داخل الدرج وأدخل الرقم؛ سيحسب النظام فوراً أي زيادة أو عجز مالي، ثم اضغط "تأكيد وإغلاق" لطباعة التقرير الشامل وتصفير اليومية بأمان.',
    keywords: ['جرد', 'صندوق', 'اغلاق', 'تقرير z', 'عجز', 'فائض', 'وردية'],
  },
  {
    id: 'faq-mobile-sync-port',
    category: 'الهاتف والشبكة',
    q: 'ما هو المنفذ الشبكي المخصص لربط تطبيق الهاتف وما متطلباته؟',
    a: 'يعمل خادم Fastify الداخلي للنظام على المنفذ 4321. كل ما تحتاجه هو اتصال الحاسوب والهاتف بنفس شبكة الـ Wi-Fi المحلية (أو نقطة اتصال Hotspot)، ثم مسح رمز QR من إعدادات الأجهزة المحمولة للربط التلقائي بدون أي أسلاك.',
    keywords: ['هاتف', 'منفذ', '4321', 'واي فاي', 'شبكة', 'تطبيق', 'موبايل'],
  },
  {
    id: 'faq-backup-restore',
    category: 'الأمان والحسابات',
    q: 'كيف أقوم بأخذ نسخة احتياطية من قاعدة بيانات المحل واسترجاعها؟',
    a: 'من صفحة الإعدادات، انتقل لقسم النسخ الاحتياطي واضغط "تصدير نسخة احتياطية (Backup)". سيتم حفظ ملف مشفر يحتوي على كافة المنتجات، المبيعات، والديون. يمكنك حفظه على فلاشة USB ونقله لأي جهاز كمبيوتر آخر لاسترجاعه بضغطة زر.',
    keywords: ['نسخ', 'احتياطي', 'استرجاع', 'backup', 'فلاشة', 'قاعدة بيانات'],
  },
];

export default function SupportPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('الكل');
  const [activeGuideId, setActiveGuideId] = useState<string>('pos-workflow');
  const [openFaq, setOpenFaq] = useState<string | null>('faq-offline');
  const [copiedFaqId, setCopiedFaqId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: '', category: 'استفسار عام', message: '', phone: '0555220620' });

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
  const whatsappUrl1 = `https://wa.me/213555220620?text=${encodeURIComponent(
    `السلام عليكم، أحتاج مساعدة في نظام ${shopName} بخصوص نقطة البيع.`
  )}`;
  const whatsappUrl2 = `https://wa.me/213674784859?text=${encodeURIComponent(
    `السلام عليكم، أحتاج مساعدة في نظام ${shopName} بخصوص نقطة البيع.`
  )}`;

  // Real-time filtering for guides and FAQs
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

  const totalResultsCount = filteredGuides.length + filteredFaqs.length;

  const handleCopyFaq = (faq: FaqItem) => {
    const textToCopy = `س: ${faq.q}\n\nج: ${faq.a}\n\n(مرجع الدعم الفني: AN POS)`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedFaqId(faq.id);
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
      setTicketForm({ subject: '', category: 'استفسار عام', message: '', phone: supportPhone });
    }, 2000);
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

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 dark:border-primary/30 text-primary text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>مركز المساعدة ودليل تشغيل {shopName}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-on-surface font-cairo tracking-tight">
            كيف يمكننا مساعدتك اليوم؟
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant font-medium leading-relaxed">
            ابحث عن إجابات، شاهد الدروس التعليمية، أو تواصل مع فريق الخبراء للحصول على دعم مباشر
          </p>

          {/* Interactive Search Bar */}
          <div className="relative max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مقالات، دروس، أو مشكلة معينة..."
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl pr-12 pl-24 py-4 text-sm md:text-base text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-md outline-none"
              />
              <Search className="absolute right-4 w-5 h-5 text-on-surface-variant pointer-events-none" />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-20 p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <div className="absolute left-3">
                <span className="px-3 py-1.5 bg-primary text-white dark:bg-primary/20 dark:text-primary font-bold text-xs rounded-xl border border-primary/30">
                  {totalResultsCount} نتيجة
                </span>
              </div>
            </div>
          </div>

          {/* Category Chips Filter */}
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
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
        </div>
      </div>

      {/* 2. SYSTEM DIAGNOSTIC & STATUS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium">قاعدة البيانات المحلية</div>
            <div className="text-sm font-bold text-on-surface font-cairo">SQLite + Dexie (نشطة)</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-300 dark:border-cyan-500/30 flex items-center justify-center text-cyan-700 dark:text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium">الخادم الداخلي (Fastify)</div>
            <div className="text-sm font-bold text-cyan-700 dark:text-cyan-300 font-mono">المنفذ :4321 جاهز</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/15 border border-purple-300 dark:border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium">أمان وكلمات المرور</div>
            <div className="text-sm font-bold text-on-surface font-cairo">تشفير scrypt مفعل</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex items-center gap-3.5 border border-outline-variant/15">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-on-surface-variant font-medium">وضع العمل</div>
            <div className="text-sm font-bold text-amber-700 dark:text-amber-400 font-cairo">Offline-First 100%</div>
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE SYSTEM OPERATION GUIDES (دليل استخدام النظام التفاعلي) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              أدلة تشغيل النظام خطوة بخطوة
            </h2>
            <p className="text-xs text-on-surface-variant">
              اختر مسار العمل المطلوب لتتعلم كيفية تنفيذه بأعلى كفاءة وأسرع طريقة
            </p>
          </div>
          <span className="text-xs font-semibold text-on-surface-variant/80 bg-surface-container-high px-3 py-1 rounded-full">
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
            <div className="lg:col-span-5 space-y-2.5">
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
                  {/* Guide Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 pb-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-primary">{activeGuide.category}</span>
                      <h3 className="text-xl font-bold text-on-surface font-cairo">{activeGuide.title}</h3>
                      <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed">
                        {activeGuide.shortDesc}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(activeGuide.route)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-sm"
                    >
                      <span>{activeGuide.routeLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                  </div>

                  {/* Keyboard Shortcuts Strip */}
                  {activeGuide.shortcuts && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-on-surface-variant">اختصارات لوحة المفاتيح السريعة:</div>
                      <div className="flex flex-wrap gap-2">
                        {activeGuide.shortcuts.map((sc, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant/20 text-xs text-on-surface font-medium"
                          >
                            <kbd className="px-1.5 py-0.5 bg-surface-container-lowest text-primary font-mono font-bold rounded shadow-sm border border-outline-variant/30 text-[11px]">
                              {sc.key}
                            </kbd>
                            <span>{sc.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step-by-step instructions */}
                  <div className="space-y-3.5">
                    <div className="text-xs font-bold text-on-surface-variant">خطوات التنفيذ العملية:</div>
                    <div className="space-y-3">
                      {activeGuide.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container/50 border border-outline-variant/10 hover:border-outline-variant/20 transition-all"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
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
                    <div className="text-xs font-bold text-amber-800 dark:text-amber-300 font-cairo mb-0.5">نصيحة ذهبية للكاشير:</div>
                    <p className="text-xs text-amber-950 dark:text-on-surface leading-relaxed">{activeGuide.proTip}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. INTELLIGENT SEARCHABLE & CATEGORIZED FAQ ACCORDION */}
      <div className="glass-card rounded-3xl p-6 md:p-8 border border-outline-variant/15 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/10 pb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-on-surface font-cairo flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              الأسئلة الأكثر شيوعاً
            </h2>
            <p className="text-xs text-on-surface-variant">
              حلول عملية وفورية لأكثر الاستفسارات والمشاكل شيوعاً أثناء تشغيل نقطة البيع
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/20 w-fit">
            {filteredFaqs.length} سؤال متاح
          </span>
        </div>

        {filteredFaqs.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <HelpCircle className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
            <p className="text-sm font-semibold text-on-surface">لم نجد إجابة مطابقة لبحثك في هذا القسم</p>
            <p className="text-xs text-on-surface-variant">
              يمكنك كتابة استفسارك المباشر لفريق الدعم عبر زر "فتح تذكرة داخلية".
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

      {/* 5. DIRECT CHANNELS & TICKETING (حل مشكلة الألوان بالكامل ومعلومات الاتصال الرسمية) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WhatsApp Card */}
        <div className="glass-card rounded-3xl p-6 text-center border border-emerald-500/30 bg-surface-container/70 flex flex-col justify-between space-y-4 shadow-sm hover:border-emerald-500/50 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mx-auto shadow-sm">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-on-surface font-cairo">محادثة دعم فورية</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              تواصل مباشرة مع مهندسي الدعم عبر تطبيق WhatsApp للتدخل السريع وحل المشاكل التقنية.
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
            <h3 className="text-base font-bold text-on-surface font-cairo">تذكرة دعم فني</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              افتح تذكرة مباشرة من داخل التطبيق تتضمن التقرير التشخيصي لحسابك ورد خلال ساعات العمل.
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
              للطوارئ وانقطاع الخدمة في أوقات الذروة، متاح من السبت إلى الخميس (08:00 - 20:00).
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

      {/* 6. IN-APP TICKET MODAL */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-lg rounded-3xl p-6 md:p-8 border border-outline-variant/30 bg-surface-container space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/20 flex items-center justify-center text-cyan-700 dark:text-cyan-400">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-on-surface font-cairo">إرسال استفسار أو تذكرة مساعدة</h3>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ticketSent ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-on-surface font-cairo">تم إرسال تذكرتك بنجاح!</h4>
                <p className="text-xs text-on-surface-variant">
                  تم تسجيل البلاغ وسيتواصل معك الفريق الفني على رقمك ({ticketForm.phone || phone1}) في أقرب وقت.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface">نوع الاستفسار</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-3.5 py-2.5 text-xs text-on-surface focus:border-primary outline-none"
                  >
                    <option value="استفسار عام">استفسار عام عن النظام</option>
                    <option value="مشكلة في نقطة البيع">مشكلة في نقطة البيع أو السلة</option>
                    <option value="مشكلة في الطباعة">مشكلة في طابعة الفواتير أو الباركود</option>
                    <option value="المزامنة وتطبيق الهاتف">المزامنة مع تطبيق الهاتف</option>
                    <option value="طلب ميزة جديدة">اقتراح ميزة أو تطوير جديد</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface">عنوان المشكلة أو الموضوع</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الطابعة الحرارية لا تطبع شعار المحل"
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-3.5 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface">رقم الهاتف للتواصل</label>
                  <input
                    type="tel"
                    placeholder="05XXXXXXXX"
                    value={ticketForm.phone}
                    onChange={(e) => setTicketForm({ ...ticketForm, phone: e.target.value })}
                    className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl px-3.5 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-on-surface">تفاصيل المشكلة والخطوات</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="اشرح ما حدث بالتفصيل ورسالة الخطأ إن وجدت..."
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                    className="w-full bg-surface-container-high border border-outline-variant/20 rounded-xl p-3 text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary outline-none resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/10 text-[11px] text-on-surface-variant flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>سيتم إرفاق الإصدار التقني وحالة قاعدة البيانات مع التذكرة لمساعدة الفني.</span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTicketModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20"
                  >
                    إرسال التذكرة الآن
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 7. FOOTER */}
      <div className="glass-card rounded-2xl p-6 border border-outline-variant/15">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span className="font-bold text-on-surface font-cairo">{shopName}</span>
            <span>•</span>
            <span>نظام إدارة نقاط البيع والمخازن الذكي</span>
            <span>•</span>
            <span>الإصدار 2.4.0 (Enterprise)</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} كافة الحقوق محفوظة ومؤمنة محلياً.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
