# دليل إعداد وتشغيل التوقيع الرقمي (Code Signing Guide) — AN POS

> **الهدف:** توثيق البنية التحتية والخطوات العملية لتوقيع حزم تثبيت AN POS والملفات التنفيذية برمجياً عبر شهادات Authenticode المعتمدة، وبناء بيئة اختبار محلية متكاملة وسير عمل CI/CD مؤتمت.
>
> **المسار المستهدف:** المسار A1 ضمن [PROFESSIONAL_INSTALLER_MIGRATION_PLAN.md](../PROFESSIONAL_INSTALLER_MIGRATION_PLAN.md).

---

## 1. ما هو التوقيع الرقمي ولماذا هو ضروري؟

نظام التوقيع الرقمي على ويندوز (Microsoft Authenticode) هو المعيار الأساسي لإثبات:
1. **هوية الناشر (Publisher Identity):** التحقق من أن التطبيق صادر عن جهة موثوقة وليس جهة مجهولة أو ضارة.
2. **سلامة الحزمة (Integrity):** التأكد من عدم التلاعب بالملفات التنفيذية (`.exe` و `.dll`) منذ لحظة بنائها وإصدارها.
3. **تجاوز تحذيرات SmartScreen:** منع ظهور شاشات الحجب الزرقاء «Windows protected your PC / Unknown publisher» عند قيام العملاء بتثبيت البرنامج.
4. **حماية محرك التحديثات (`electron-updater`):** تفعيل `verifyUpdateCodeSignature: true` لضمان أن التحديثات القادمة عبر الإنترنت موقّعة بنفس شهادة الناشر حصراً.

---

## 2. أنواع شهادات التوقيع وخيارات التشغيل

| النوع | آلية التخزين | تكلفة وسرعة السمعة | مناسب لـ |
| :--- | :--- | :--- | :--- |
| **Self-Signed (تجريبية)** | ملف محلي `.pfx` | مجاني — لا تعمل إلا بعد تثبيت الشهادة في Root Store للعميل | التطوير الداخلي واختبارات CI/CD والمعامل |
| **OV Code Signing** | ملف مشفر أو Token | متوسطة التكلفة — تحتاج وقتاً لبناء السمعة في SmartScreen | الإصدارات الرسمية للشركات الفردية |
| **EV Code Signing** | وحدة أمان عتادية (HSM / Token) | تكلفة أعلى — تمنح سمعة SmartScreen فورية وموثوقية مطلقة | النشر التجاري الواسع والتوزيع المباشر |
| **Azure Trusted Signing** | سحابي (Microsoft Managed) | اشتراك سحابي — تكامل مباشر مع GitHub Actions بلا Tokens عتادية | فرق التطوير التي تعتمد على البناء المؤتمت كلياً |

---

## 3. أدوات التوقيع المدمجة في مستودع AN POS

تم تجهيز المستودع بمجموعة من السكربتات المخصصة لإدارة واختبار التوقيع الرقمي:

### 3.1 توليد شهادة تطوير تجريبية (`npm run cert:generate-dev`)
يقوم السكربت `scripts/generate-dev-cert.mjs` بإنشاء شهادة PKCS#12 (`dev-cert.pfx`) صالحة للتوقيع البرمجي (Extended Key Usage: `codeSigning`):
```bash
npm run cert:generate-dev
```
* **المسار الافتراضي:** `build/dev-cert.pfx` (مستبعد تلقائياً في `.gitignore`).
* **كلمة المرور الافتراضية:** `anpos-dev-cert-2026` (يمكن تخصيصها عبر المتغير `DEV_CERT_PASSWORD`).

### 3.2 فحص وتدقيق تواقيع الحزم (`npm run verify:signatures`)
يقوم السكربت `scripts/verify-signature.mjs` بفحص ترويسات PE للملفات التنفيذية في مجلد `release/` مباشرة:
```bash
npm run verify:signatures
```
* يفحص جدول الأمان (`IMAGE_DIRECTORY_ENTRY_SECURITY`).
* يتحقق من وجود كتل `PKCS#7 SignedData`.
* يستخرج حالة نظام ويندوز واسم الشهادة عند التشغيل على بيئة Windows.
* يدعم العلم `--require-signed` لإلزام النجاح فقط إذا كانت جميع الحزم موقّعة (مستخدم في CI).

### 3.3 بناء حزم ويندوز مع فرض التوقيع (`npm run package:win:signed`)
```bash
npm run package:win:signed
```
يقوم بتجميع الواجهة وتشغيل `electron-builder` مع العلم `-c.forceCodeSigning=true`، مما يضمن إيقاف عملية البناء فوراً إذا لم تتوفر الشهادة أو تعذر التوقيع.

---

## 4. إعداد التوقيع في سير عمل CI/CD (GitHub Actions)

في ملف `.github/workflows/build.yml`، تم دمج دعم التوقيع التلقائي بناءً على توفر أسرار المستودع:

### 4.1 الأسرار المطلوبة في GitHub Secrets:
1. **`CSC_LINK`**: مسار الشهادة أو محتواها بصيغة Base64.
   * لتحويل ملف الشهادة التجاري `cert.pfx` إلى Base64:
     ```bash
     # Linux / macOS
     base64 -w 0 cert.pfx > cert.base64.txt
     
     # Windows PowerShell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.pfx")) | Out-File -Encoding ascii cert.base64.txt
     ```
   * انسخ محتوى الملف وضعه في Secret باسم `CSC_LINK`.
2. **`CSC_KEY_PASSWORD`**: كلمة مرور ملف الـ PFX.

### 4.2 السلوك التلقائي في CI:
* إذا كانت المتغيرات فارغة: يُبنى المثبت بدون توقيع، ويُسجل تقرير `verify-signature.mjs` التشخيصي كملف توثيقي.
* إذا كانت المتغيرات موجودة: يفرض `electron-builder` التوقيع عبر `signtoolOptions` المحددة في `package.json` مع خادم الوقت `http://timestamp.digicert.com`، ويتحقق سير العمل عبر `--require-signed` لضمان صحة النواتج قبل النشر.

---

## 5. اختبار التوقيع محلياً وعلى أجهزة الاختبار (VMs)

### الخطوة 1: توليد شهادة التطوير
```bash
npm run cert:generate-dev
```

### الخطوة 2: تثبيت الشهادة في مستودع الثقة (على جهاز الاختبار)
حتى يعتبر نظام ويندوز الشهادة الذاتية موثوقة:
1. انقر نقراً مزدوجاً على `build/dev-cert.pfx`.
2. اختر **Current User** أو **Local Machine** واضغط التالي.
3. أدخل كلمة المرور (`anpos-dev-cert-2026`).
4. اختر: **Place all certificates in the following store** ثم انقر **Browse**.
5. حدد: **Trusted Root Certification Authorities** (جهات إصدار الشهادات الجذرية الموثوقة).
6. أتمم المعالج واضغط تأكيد عند ظهور تحذير الأمان.

### الخطوة 3: التجميع والتوقيع
```bash
# على Windows PowerShell:
$env:CSC_LINK = "build/dev-cert.pfx"
$env:CSC_KEY_PASSWORD = "anpos-dev-cert-2026"
npm run package:win:signed
```

### الخطوة 4: التحقق
```bash
npm run verify:signatures
```
أو عبر أدوات نظام ويندوز:
```powershell
Get-AuthenticodeSignature "release\AN POS-Setup-3.0.0-x64.exe" | Format-List
```
النتيجة المتوقعة: `Status: Valid`.

---

## 6. إرشادات التعامل مع تحذيرات SmartScreen

1. **الشهادات الذاتية (Self-Signed):** تعمل فقط على الأجهزة التي تم تثبيت شهادتها مسبقاً في مخزن الثقة.
2. **شهادات OV الجديدة:** قد تُظهر تحذير «Windows protected your PC» في الأسابيع الأولى لأن SmartScreen يعتمد على نظام السمعة التراكمية (Reputation-based).
3. **لتسريع بناء السمعة وتجاوز الحجب الكاذب:**
   * رفع الحزمة إلى بوابة Microsoft Defender Security Intelligence:  
     https://www.microsoft.com/en-us/wdsi/filesubmission
   * اختيار نوع البلاغ: **Incorrectly detected as malware / Unknown developer**.
   * وضع رابط الموقع الرسمي وتفاصيل الناشر، حيث تستغرق المراجعة عادة بين 24 إلى 48 ساعة لمنح الحزمة والشهادة سمعة معتمدة.
4. **تفعيل التحقق من التحديثات (`updater.ts`):**
   * عند إطلاق الإصدار الموقّع رسمياً، يُعاد ضبط `verifyUpdateCodeSignature: true` في `package.json` ويُسند اسم الناشر المطابق تماماً لبيانات الشهادة تحت `signtoolOptions.publisherName`.
