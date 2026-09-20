/**
 * معلومات وإصدار تطبيق AN POS
 * المصدر الموحد الوحيد لإصدار النظام في كامل الواجهات والمكونات
 */
export const APP_NAME = 'AN POS';
export const APP_VERSION = '2.4.1';
export const APP_DISPLAY_VERSION = `v${APP_VERSION}`;
export const APP_FULL_NAME = `${APP_NAME} ${APP_DISPLAY_VERSION} Pro`;
export const APP_RELEASE_DATE = '2026-09-20';
export const APP_BUILD_NUMBER = '20260920.1';
export const APP_CHANNEL = 'مستقر (Production Stable)';

export interface AppRelease {
  version: string;
  date: string;
  badge?: string;
  title: string;
  changes: string[];
}

export const APP_CHANGELOG: AppRelease[] = [
  {
    version: 'v2.4.1',
    date: '2026-09-20',
    badge: 'الإصدار الحالي',
    title: 'تدقيق الأداء، استقرار الموارد، وضغط قاعدة البيانات',
    changes: [
      'تدقيق شامل للأداء والاستقرار واستهلاك الموارد والذاكرة.',
      'صيانة دورية وتنظيف سجلات الحذف (sync_tombstones) وضغط قاعدة بيانات SQLite بنسبة 97%.',
      'إصلاح استدعاءات خطافات React والامتثال الكامل لقواعد Hooks.',
      'فصل استيراد محرك الـ OCR ديناميكياً لتسريع تحميل واجهة الموردين.',
      'إعادة تصميم قنوات الدعم الفني والتواصل المباشر بواجهة Bento Box حديثة.',
      'تكامل وتوافق شامل مع تطبيق الهواتف الذكية (Mobile RN v3.0.0).',
    ],
  },
  {
    version: 'v2.4.0',
    date: '2026-08-15',
    title: 'خادم المزامنة الهجينة وربط الهواتف',
    changes: [
      'إطلاق محرك المزامنة الهجينة (Hybrid Sync) وخادم الشبكة المحلية LAN.',
      'إقران أجهزة الهاتف عبر مسح رمز الاستجابة السريعة (QR) أو المسح التلقائي.',
      'نظام المصادقة وإدارة صلاحيات الأجهزة المتصلة.',
    ],
  },
  {
    version: 'v2.3.0',
    date: '2026-07-28',
    title: 'واجهات الكاشير المتطورة والباقات الترويجية',
    changes: [
      'إضافة وتطوير واجهات الكاشير المتعددة (Classic, Modern, Terminal, Design7).',
      'نظام الباقات والحزم والعروض الترويجية والخصومات المتقدمة.',
      'محرك طباعة الباركود والملصقات الحرارية المتعددة القياسات.',
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-07-15',
    title: 'معمارية Offline-First ومحرك SQLite المدمج',
    changes: [
      'الاعتماد الكامل على معمارية Offline-First المزدوجة بمحركي SQLite و Dexie.',
      'إدارة متقدمة لطباعة الإيصالات والفواتير ودعم الطابعات الحرارية.',
      'تقارير الأرباح والمبيعات وإدارة ديون العملاء والموردين.',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-07-02',
    title: 'الإصدار الأولي لنظام AN POS',
    changes: [
      'الإطلاق الأولي لمنظومة إدارة نقاط البيع والمخزون والمبيعات.',
    ],
  },
];
