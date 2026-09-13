# وثيقة المعمارية النمطية لنقطة البيع السريعة (Quick POS Architecture)
## Clean Architecture & Modular Decomposition

---

## 1. تحليل الوضع الراهن وتحديد الملفات الضخمة (Current State Analysis)

تعد **نقطة البيع السريعة (Quick POS)** شاشة الكاشير فائقة السرعة المخصصة لخدمة الزبائن بلمسات محدودة وبأداء سريع جداً. 

### الملفات ذات الأسطر البرمجية الكبيرة الحالية:
1. **[QuickPOSPage.tsx](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/src/features/pos/QuickPOSPage.tsx)**: **735 سطر برمجي** في ملف واحد، يجمع بين:
   - طبقة البيانات: استعلامات React Query للمنتجات، الباقات، التصنيفات، الزبائن، الجلسات، الفواتير المعلقة، والإعدادات.
   - منطق الصوتيات: تهيئة `AudioContext` والتنبيه الصوتي `playBeep`.
   - كواشف الباركود: منطق مسح الرموز من قارئ USB ومن تطبيق الهاتف عبر شبكة LAN، مع إدارة الـ Debouncing المخصص (`lastScanRef`) لمنع المسح المزدوج.
   - إدارة الفواتير المعلقة: عمليات التعليق، الاسترجاع، والحذف المباشر في Dexie.
   - إتمام عمليات البيع السريع: استدعاء `completeSale`، التنبيهات، والطباعة التلقائية.
   - اختصارات لوحة المفاتيح: ربط شامل لمفاتيح `F1` إلى `F12`.
   - رندر النوافذ المنبثقة: 6 نوافذ منبثقة مدمجة مباشرة في JSX الصفحة.

2. **[QuickPOSCart.tsx](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/src/features/pos/quick/components/QuickPOSCart.tsx)**: **408 سطر برمجي**، يدمج:
   - ترويسة السلة واختيار العميل وبانر الديون السابقة.
   - قائمة الأصناف مع أزرار الزيادة والنقصان والحذف.
   - طرق الدفع الأربعة (نقداً، آجل، بطاقة، تحويل).
   - حاسبة الفئات النقدية السريعة (+200، +500، +1000، +2000، بالضبط).
   - حقول المقبوض والمتبقي (الفكة).
   - زر الحفظ الفوري العملاق `F1`.
   - شريط السلة العائم للأجهزة المحمولة.

3. **[QuickPOSCatalog.tsx](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/src/features/pos/quick/components/QuickPOSCatalog.tsx)**: **230 سطر برمجي**، يدمج شريط البحث وحبوب التصنيفات وشبكة بطاقات المنتجات.

---

## 2. الهيكلية المعمارية النمطية الجديدة (`src/features/pos/quick/`)

تفكيك الوحدة وفق مبادئ **Clean Architecture** و **Single Responsibility Principle (SRP)**:

```
src/features/pos/quick/
├── types.ts                                     # عقود بيانات نقطة البيع السريعة وخيارات الدفع
├── services/
│   ├── quickPOSAudioService.ts                  # خدمة التنبيه الصوتي النقي (Web Audio API)
│   └── quickPOSCalculationService.ts            # خوارزميات حساب الفكة والفئات النقدية والمجاميع
├── hooks/
│   ├── useQuickPOSData.ts                       # خطاف جلب المنتجات، الباقات، التصنيفات، العملاء، الجلسات، والإعدادات
│   ├── useQuickPOSScanner.ts                    # خطاف معالجة مسح الباركود (USB + الهاتف) مع منع التكرار (Debouncing)
│   ├── useQuickPOSSuspendedOrders.ts            # خطاف تعليق واسترجاع وحذف الفواتير المعلقة
│   └── useQuickPOSCheckout.ts                   # خطاف إتمام الدفع الفوري والطباعة الفورية وتفريغ السلة
├── components/
│   ├── QuickPOSHeader.tsx                       # ترويسة الكاشير السريع والشعار وبيانات الكاشير
│   ├── QuickPOSClock.tsx                        # ساعة الترويسة الرقمية الحية
│   ├── catalog/
│   │   ├── QuickPOSCatalog.tsx                  # الحاوية الرئيسية للكتالوج
│   │   ├── QuickPOSCatalogSearchBar.tsx         # حقل البحث وكاشف الباركود ومفتاح F7
│   │   ├── QuickPOSCategoryPills.tsx            # شريط أزرار تصفية التصنيفات
│   │   └── QuickPOSProductCard.tsx              # بطاقة المنتج التفاعلية مع السعر والمخزون
│   ├── cart/
│   │   ├── QuickPOSCart.tsx                     # الحاوية الرئيسية لسلة الكاشير
│   │   ├── QuickPOSCartHeader.tsx               # ترويسة السلة واختيار العميل وتنبيه الديون وأزرار F2/F4
│   │   ├── QuickPOSCartItemList.tsx             # قائمة بنود السلة وأزرار الكمية السريعة
│   │   ├── QuickPOSCartPaymentSection.tsx       # طرق الدفع وحاسبة الفئات النقدية وزر الدفع F1
│   │   └── QuickPOSMobileCartBar.tsx            # شريط السلة العائم لشاشات الهواتف
│   └── QuickPOSModals.tsx                       # حاوية النوافذ المنبثقة الستة الموحدة
├── __tests__/
│   └── quickPOSCalculationService.test.ts       # اختبارات الوحدة لحسابات الفكة والفئات النقدية
└── index.ts                                     # نقطة التصدير المركزية
```

---

## 3. تفصيل طبقات المعمارية (Architectural Layers)

### 1. طبقة الخدمات الصرفة (Pure Domain Services)
- **`quickPOSCalculationService.ts`**:
  - `calculateChangeDue(cashTendered: number, total: number): number`
  - `calculateNextDenomination(current: number, step: number, total: number): number`
- **`quickPOSAudioService.ts`**:
  - إدارة صوت الصافرة بنغمة احترافية (880Hz Sine Wave) دون تسريب موارد صوتية.

### 2. طبقة الخطافات المخصصة (Custom Hooks Layer)
- **`useQuickPOSData`**: يعزل استعلامات React Query واستخراج مصفوفة التصنيفات الفريدة وإعدادات النظام الافتراضية مع التحقق من فتح جلسة الصندوق.
- **`useQuickPOSScanner`**: يدير كاشف الباركود USB وكاشف الهاتف المحمول عبر SSE/LAN مع حماية منع التكرار المزدوج في نافذة 400ms.
- **`useQuickPOSSuspendedOrders`**: يعزل منطق تعليق الفاتورة، استرجاعها بكامل بنودها، وحذفها.
- **`useQuickPOSCheckout`**: يتولى التحقق من صحة الفاتورة (جلسة مفتوحة، عميل في حالة الآجل)، واستدعاء محرك البيع الذري، وطباعة الإيصال الحراري التلقائي.

### 3. طبقة المكونات العرضية (Presentation Components)
- تقسيم السلة [QuickPOSCart.tsx](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/src/features/pos/quick/components/QuickPOSCart.tsx) من 408 أسطر إلى 4 مكونات متخصصة ومستقلة، كل مكون أقل من 100 سطر.
- تقسيم الكتالوج [QuickPOSCatalog.tsx](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/src/features/pos/quick/components/QuickPOSCatalog.tsx) إلى مكونات شريط البحث، شريط التصنيفات، وبطاقة المنتج.
- تجميع النوافذ المنبثقة في مكون موحد `QuickPOSModals.tsx`.

### 4. المنسق الرئيسي (Page Orchestrator)
- يتقلص [QuickPOSPage.tsx](file:///run/media/ammar/وحدة%20تخزين%20جديدة/AN-POS-TEST/src/features/pos/QuickPOSPage.tsx) من **735 سطر** إلى منسق رشيق ومنظم ومركّز يربط الخطافات بالمكونات العرضية ويعزل كل منطق العمليات.

---

## 4. خطة الحفاظ على التوافق التام (100% Backward Compatibility)

1. الحفاظ على مسار المسار `/pos/quick` وتصدير `QuickPOSPage` الافتراضي بنفس التوقيع لـ `App.tsx`.
2. الحفاظ على كافة اختصارات لوحة المفاتيح المعتمدة (`F1` - `F12`) دون أي تغيير في السلوك.
3. التوافق التام مع قارئ الباركود العتادي USB وكاشف الهاتف المحمول.
4. التوافق التام مع فواتير التعليق والطباعة الحرارية وجلسات الصندوق.
