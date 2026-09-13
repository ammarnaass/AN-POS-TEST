# معمارية وهندسة استوديو طباعة الباركود والملصقات (Barcode Labels Printing Architecture)
> **AN POS System — Enterprise Barcode & Shelf Label Printing Architecture**

---

## 1. التحليل والملخص التنفيذي (Executive Summary & Problem Statement)

يُعد قسم طباعة الباركود والملصقات (`/barcode/labels`) أحد أهم الركائز التشغيلية في نظام نقاط البيع والمستودعات. عند مراجعة الكود، تبيّن أن ملف:
- **`src/features/barcode/BarcodeLabelsPage.tsx`** يحتوي على **945 سطراً برمجياً** مكدسة في ملف أحادي واحد (Monolith).

### المشكلات الهندسية الحالية في الملف:
1. **تداخل المسؤوليات (High Coupling & Violation of SRP)**:
   - يدمج الملف بين إدارة الاتصال بقاعدة البيانات (Dexie) وسجل تدقيق الطباعة (Electron IPC).
   - خوارزميات توليد وتنسيق الباركود الخطية (1D) وثنائية الأبعاد (QR Code SVG).
   - إدارة حالة الاختيار الجماعي والتصفية حسب الأقسام والبحث بالاسم/الباركود.
   - إعدادات تصميم الملصق (10 مقاسات، 6 أنواع باركود، مفاتيح إظهار العناصر، التكبير، النسخ).
   - عرض المعاينة التفاعلية وحساب مقاييس الرسم والـ Zoom وشبكة الـ CSS Grid.
   - شفرة التصميم الرسومي (JSX) الممتدة لأكثر من 500 سطر لواجهات متعددة في نفس الملف.
2. **صعوبة الاختبار الآلي (Hard to Unit Test)**:
   - خوارزميات توزيع الملصقات وتكرار النسخ بحسب المقاس وإعدادات الطباعة مدمجة ضمن خطافات الواجهة (Hooks) والـ JSX، مما يجعل اختبارها منعزلاً غير ممكن دون رندر كامل للمكون.
3. **غياب إعادة الاستخدام (Lack of Reusability)**:
   - مكون رندر الباركود `BarcodeSvg` وبطاقة الملصق `label-card` لا يمكن إعادة استخدامها في شاشات أخرى (مثل بطاقة تفاصيل المنتج أو كشف استلام المشتريات).

---

## 2. المعمارية المستهدفة (`src/features/barcode/`)

سنقوم بتفكيك الشاشة بالكامل وفق مبادئ **Clean Architecture** و **Domain-Driven Design (DDD)** إلى طبقات نقية ومستقلة:

```
src/features/barcode/
├── types.ts                                   # العقود والأنواع (BarcodeFormat, LabelSize, PrintOptions, ProductLabelItem)
├── constants/
│   └── labelConfigs.ts                        # ثوابت المقاسات (10 أحجام)، الصيغ (6 أنواع)، والقيم الافتراضية
├── services/
│   ├── barcodeLabelGenerator.ts               # محرك بناء بنود الملصقات والتوليد الآلي واليدوي
│   └── barcodePrintEngine.ts                  # محرك حسابات الشبكة الطباعية وتنسيقات الطباعة @media print
├── hooks/
│   ├── useBarcodeLabelsData.ts                # خطاف جلب المنتجات، الإعدادات، والباركودات وسجل العمليات
│   ├── useBarcodeLabelFilters.ts              # خطاف التصفية والبحث وإدارة الاختيار الجماعي (Set<string>)
│   ├── useBarcodeLabelConfig.ts               # خطاف إدارة إعدادات وتخصيص الملصقات والتحكم في الزووم
│   └── useBarcodePrintMutation.ts             # خطاف تنفيذ الطباعة وتسجيل الأرشفة في Electron IPC
├── components/
│   ├── BarcodeSvg.tsx                         # مكون العرض الرسومي النقي للباركود (JsBarcode 1D + QR Code SVG)
│   ├── BarcodeLabelItemCard.tsx               # بطاقة الملصق المفردة القابلة للطباعة والمعاينة
│   ├── BarcodeLabelsHeader.tsx                # ترويسة الاستوديو، الإحصائيات، وأزرار الإجراءات السريعة
│   ├── BarcodePrintHistoryModal.tsx           # نافذة سجل عمليات الطباعة السابقة
│   ├── ProductSelectionPanel.tsx              # لوحة اختيار وبحث المنتجات وفلتر التصنيفات والتوليد التلقائي
│   ├── LabelConfiguratorPanel.tsx             # لوحة تخصيص المقاسات والصيغ والنسخ والعناصر الظاهرة
│   └── LabelPreviewSandbox.tsx                # منطقة المعاينة الحية وشبكة الطباعة وعناصر التحكم بالزووم
├── __tests__/
│   ├── barcodeLabelGenerator.test.ts          # اختبارات بناء وتوزيع بنود الملصقات
│   └── barcodePrintEngine.test.ts             # اختبارات حسابات الشبكة وأعمدة الطباعة
├── BarcodeLabelsPage.tsx                      # المنسق الرئيسي الخفيف (Orchestrator < 140 سطر)
├── BulkAssignBarcodesModal.tsx                # نافذة التوليد الجماعي (قائمة بذاتها)
└── useBarcodeScanner.ts                       # خطاف قارئ الباركود العتادي
```

---

## 3. تفصيل طبقات المعمارية والمسؤوليات

### 3.1 طبقة العقود والأنواع (`types.ts`)
- **`BarcodeFormat`**: `'ean13' | 'ean8' | 'code128' | 'code39' | 'upca' | 'qr'`.
- **`LabelSize`**: معرف المقاس، الأبعاد بالمليمتر (العرض والارتفاع)، التصنيف (`small` / `standard` / `large` / `special`).
- **`PrintOptions`**: خيارات الطباعة وتضمين العناصر (اسم المتجر، اسم المنتج، السعر، الباركود، SKU، حدود القص، تكبير السعر، عدد النسخ ومصدر الرمز).
- **`ProductLabelItem`**: كائن البند المجهز للطباعة متضمناً المنتج والباركود ورقم النسخة.

### 3.2 طبقة الثوابت المعيارية (`constants/labelConfigs.ts`)
- **`LABEL_SIZES`**: قائمة الأحجام العشرة المعيارية المعتمدة (من 40×20 ملم إلى 55×45 ملم وغيرها).
- **`BARCODE_FORMATS`**: تعريفات الصيغ الست مع أسماء التنسيق والشارات ثنائية الأبعاد (2D).
- **`DEFAULT_OPTS`**: الإعدادات القياسية المتوازنة للتصميم والطباعة.

### 3.3 طبقة الخدمات والمحركات النقية (`services/`)
1. **`barcodeLabelGenerator.ts`**:
   - `generateBarcodeValue(format)`: توليد قيمة باركود عشوائية فريدة بحسب الصيغة المختارة.
   - `buildProductLabelItems(selectedIds, products, productBars, opts)`: بناء مصفوفة بنود الطباعة بدقة مع تكرار النسخ وحل الباركود المسجل أو اليدوي أو العشوائي.
   - `generateMissingBarcodes(ids, productBars, format)`: منطق إنشاء باركودات للمنتجات التي لا تملك باركود.
2. **`barcodePrintEngine.ts`**:
   - `calculatePrintColumns(labelWidthMm, pageUsableWidthMm)`: حساب عدد الأعمدة في الصفحة بدقة لمنع التداخل.
   - `triggerSystemPrint()`: استدعاء آمن للطباعة عبر المتصفح/Electron مع معالجة التأخيرات.

### 3.4 طبقة الخطافات المخصصة (`hooks/`)
1. **`useBarcodeLabelsData`**:
   - جلب وتخزين مؤقت لـ: المنتجات (`db.products`)، الإعدادات العامة (`db.settings`)، الباركودات الأساسية (`ProductBarcodeRepository`)، وسجل الطباعة (`barcodePrintsApi`).
   - استخراج قائمة التصنيفات الفريدة (`categories`) وخريطة الباركودات الأساسية (`productBars`).
2. **`useBarcodeLabelFilters`**:
   - إدارة حالة البحث والتصنيف المحدد.
   - مصفوفة `Set<string>` للمنتجات المختارة مع دوال: `toggleSelect`, `selectAll`, `clearAll`, `isAllSelected`.
   - معالجة التحديد المسبق عبر معلمات الرابط `searchParams.get('productId')`.
3. **`useBarcodeLabelConfig`**:
   - إدارة حالة خيارات الطباعة `opts: PrintOptions`.
   - تبديل الحجم، الصيغة، النسخ (مع أزرار المضاعفة السريعة ×1, ×5, ×10, ×20)، وتبديل عناصر الملصق الظاهرة.
   - إدارة مستوى تكبير المعاينة `previewZoom` (من 50% إلى 160%).
4. **`useBarcodePrintMutation`**:
   - إدارة حفظ عمليات الطباعة في قاعدة البيانات عبر `barcodePrintsApi.create`.
   - تشغيل تدفق الطباعة وتحديث كاش السجلات.

### 3.5 طبقة المكونات المرئية (`components/`)
1. **`BarcodeSvg`**:
   - مكوّن نقي لعرض الباركود الخطي بواسطة مكتبة `JsBarcode` وعرض رمز QR حقيقي بواسطة `generateQRSVG` مع التعامل مع الأخطاء.
2. **`BarcodeLabelItemCard`**:
   - بطاقة الملصق الفردية الملتزمة بأبعاد الـ `mm` الدقيقة وحدود القص.
3. **`BarcodeLabelsHeader`**:
   - الترويسة الرئيسية مع شارة الإحصاءات وزر عرض السجل وزر تبديل المعاينة وزر الطباعة الرئيسي.
4. **`BarcodePrintHistoryModal`**:
   - جدول تفاعلي يعرض آخر 30 عملية طباعة مع تفاصيل المقاس والتاريخ والنسخ.
5. **`ProductSelectionPanel`**:
   - العمود الأيمن: حقل البحث، شرائح الفئات، زر التوليد التلقائي، وقائمة المنتجات التفاعلية مع شارات التحديد.
6. **`LabelConfiguratorPanel`**:
   - العمود الأوسط: شبكة اختيار المقاسات العشرة، شبكة الصيغ، مصدر الباركود، عدد النسخ، ومفاتيح العناصر الظاهرة.
7. **`LabelPreviewSandbox`**:
   - العمود الأيسر: شريط تحكم بالزووم، واللوحة التفاعلية لعرض وتوزيع الملصقات وفق تنسيق ورقة A4.

### 3.6 المنسق الرئيسي (`BarcodeLabelsPage.tsx`)
- تجميع الطبقات في أقل من 140 سطر برمجي نظيف ومقروء بالكامل، مع تصدير نظيف وتوافق عكسي تام 100%.

---

## 4. خطة الاختبار الآلي ومراقبة الجودة (Test Strategy)
- كتابة اختبارات وحدة شاملة في `src/features/barcode/__tests__/barcodeLabelGenerator.test.ts` لتغطية:
  1. حساب وتكرار عدد النسخ بدقة.
  2. سلوك مصادر الباركود (المسجل / العشوائي / اليدوي).
  3. تنسيق المقاسات وأعمدة الشبكة وحالات عدم وجود منتجات.
- التحقق من فحص `TypeScript` الصارم لضمان عدم وجود أي خطأ نوعي في المشروع.
