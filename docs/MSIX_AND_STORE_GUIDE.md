# دليل التوزيع عبر حزم MSIX ومتجر مايكروسوفت — AN POS

> **الوثيقة:** مرجع تشغيلي وتقني لحزم التثبيت الحديثة MSIX / AppX ونشر التطبيق عبر Microsoft Store ونظام التوزيع المُدار (Track D).  
> **الإصدار المستهدف:** `3.0.0` فما فوق.  
> **المسار:** `docs/MSIX_AND_STORE_GUIDE.md`

---

## 1. نظرة عامة والمعمارية

حزم **MSIX** هي معيار التغليف والتوزيع الحديث لتطبيقات Windows 10 و 11 الصادر من شركة Microsoft، والذي يدمج أفضل ميزات MSI و AppX و ClickOnce في حزمة آمنة ومُدارة بالكامل.

### مقارنة استراتيجيات التوزيع في AN POS

| المعيار | NSIS (المسار A) | WiX v4 MSI (المسار B) | MSIX / AppX (المسار D) |
| :--- | :--- | :--- | :--- |
| **الجمهور المستهدف** | المستخدم الفردي والمحلات الصغيرة | الشركات والمؤسسات الكبرى (IT) | عملاء Microsoft Store و Intune الحديث |
| **نموذج التثبيت** | Per-User في LocalAppData | Per-Machine في Program Files | Per-User حاوية افتراضية مُدارة من النظام |
| **صلاحيات UAC** | لا يتطلب (asInvoker) | يتطلب صلاحيات مسؤول للتثبيت | لا يتطلب UAC عند التثبيت |
| **التحديثات التلقائية** | مدمجة عبر `electron-updater` | عبر أنظمة GPO / SCCM / Intune | تلقائية بالكامل عبر Windows Store / App Installer |
| **إلغاء التثبيت** | سكربت NSIS مع حماية البيانات | محرك Windows Installer النظيف | إزالة فورية ونظيفة بنسبة 100% بدون مخلفات |
| **خادم LAN كخدمة** | عبر نمط Tray المصغر | خدمة Windows مستقلة (`sc.exe`) | تطبيق FullTrust مباشر داخل جلسة المستخدم |

---

## 2. مواصفات وهوية الحزمة (Identity & Manifest)

تعتمد حزم MSIX على ملف بيان التطبيق `AppxManifest.xml` الذي يعرّف هوية البرنامج وصلاحياته وموارده البصرية.

### 2.1 إعدادات `package.json`

تم ضبط تكوين `appx` في [`package.json`](../package.json):

```json
"appx": {
  "applicationId": "com.anpos.desktop",
  "identityName": "ANPOS.Desktop",
  "publisher": "CN=AN POS, O=AN POS, C=LY",
  "publisherDisplayName": "AN POS",
  "displayName": "AN POS",
  "backgroundColor": "#0f172a",
  "languages": [
    "ar-SA",
    "en-US"
  ],
  "showNameOnTiles": true,
  "capabilities": [
    "runFullTrust",
    "privateNetworkClientServer",
    "internetClientServer"
  ],
  "artifactName": "${productName}-${version}-${arch}.msix"
}
```

### 2.2 الصلاحيات والقدرات (Capabilities)

1. **`runFullTrust` (إلزامي):** يسمح لتطبيق AN POS (المبني على بيئة Electron و Node.js) بالعمل بكامل إمكانيات برامج سطح المكتب التقليدية والوصول المباشر إلى قاعدة البيانات والمنافذ التسلسلية للطابعات وقارئات الباركود.
2. **`privateNetworkClientServer`:** يسمح لخادم Fastify المدمج بالاستماع على المنفذ `3000` واستقبال اتصالات الهواتف الذكية وطرفيات البيع الأخرى عبر الشبكة المحلية (LAN).
3. **`internetClientServer`:** يسمح بالاتصال الخارجي للتحقق من التراخيص الرقمية، وجلب التحديثات، والتكامل السحابي.

### 2.3 الأصول البصرية ومربعات شاشة البدء (`build/appx/`)

تم تجهيز الأيقونات البصرية المخصصة بألوان الهوية الداكنة (`#0f172a`) في مجلد `build/appx/`:
- **`StoreLogo.png`** (50×50): أيقونة الظهور في متجر مايكروسوفت.
- **`Square150x150Logo.png`** (150×150): المربع القياسي في قائمة ابدأ.
- **`Square44x44Logo.png`** (44×44): أيقونة شريط المهام وقوائم التطبيقات.
- **`Wide310x150Logo.png`** (310×150): المربع العريض في قائمة ابدأ بشعار AN POS في المنتصف.
- **`Square310x310Logo.png`** (310×310): المربع الكبير عالي الدقة.
- **`Square71x71Logo.png`** (71×71): المربع الصغير في قائمة ابدأ.

---

## 3. مسار النشر في متجر مايكروسوفت (Microsoft Store)

عند اتخاذ قرار نشر AN POS تجارياً على متجر Windows، يتم اتباع الخطوات التالية:

### 3.1 إعداد الحساب في Microsoft Partner Center
1. سجل الدخول إلى [Microsoft Partner Center](https://partner.microsoft.com/dashboard).
2. أنشئ حساب مطور (Company or Individual Developer Account).
3. احجز اسم التطبيق (App Name): **AN POS**.

### 3.2 مطابقة هوية الحزمة مع المتجر
من صفحة **Product management** > **Product Identity** في Partner Center، انسخ المعرّفات واستبدلها في `package.json` أو مررها عبر متغيرات البيئة قبل البناء:
- **Package/Identity/Name:** استبدل `identityName` بالاسم الصادر من المتجر.
- **Package/Identity/Publisher:** استبدل `publisher` بالمعرف المخصص للمتجر (مثال: `CN=12345678-ABCD-EF01-2345-6789ABCDEF01`).
- **Package/Properties/PublisherDisplayName:** استبدل `publisherDisplayName` باسم الناشر المسجل.

### 3.3 الرفع والموافقة
1. قم ببناء حزمة MSIX الإنتاجية:
   ```bash
   npm run package:win:msix
   ```
2. ارفع الحزمة الناتجة `release/AN POS-3.0.0-x64.msix` إلى صفحة **Packages** في مسار الإرسال.
3. يقوم نظام المتجر بفحص الحزمة آلياً بواسطة **Windows App Certification Kit (WACK)**.
4. بمجرد اعتماد التطبيق، تقوم خوادم Microsoft بتوقيع الحزمة بشهادة متجر Windows الرسمية ليصبح التثبيت متاحاً بنقرة واحدة لجميع مستخدمي Windows 10/11 دون أي تحذيرات أمنية.

---

## 4. التحميل الجانبي والاختبار المحلي (Sideloading)

تفرض أنظمة ويندوز حماية صارمة تمنع تثبيت حزم MSIX محلياً (خارج المتجر) ما لم تكن موقعة بشهادة رقمية موثوقة في جهاز العميل، وأن يتطابق حقل `Publisher` في الشهادة تماماً مع المعرف المكتوب في `AppxManifest.xml`.

### 4.1 توليد وتثبيت شهادة التطوير المحلية
1. ولّد شهادة التطوير الذاتية:
   ```bash
   npm run cert:generate-dev
   ```
2. ثبّت الشهادة في مخزن **الأشخاص الموثوق بهم (Trusted People)** عبر PowerShell كمدير:
   ```powershell
   $certPath = "build\dev-cert.pfx"
   $password = ConvertTo-SecureString "anpos-dev-cert-2026" -AsPlainText -Force
   Import-PfxCertificate -FilePath $certPath -CertStoreLocation "Cert:\LocalMachine\TrustedPeople" -Password $password
   ```

### 4.2 تثبيت الحزمة عبر PowerShell
```powershell
Add-AppxPackage -Path "release\AN POS-3.0.0-x64.msix"
```

### 4.3 التحقق وإدارة الحزمة المثبتة
- **فحص وجود الحزمة:**
  ```powershell
  Get-AppxPackage -Name "ANPOS.Desktop"
  ```
- **تشغيل التطبيق:**
  ابحث عن **AN POS** في قائمة ابدأ أو شغّله بالأمر:
  ```powershell
  Start-Process "shell:AppsFolder\com.anpos.desktop!com.anpos.desktop"
  ```
- **إزالة الحزمة:**
  ```powershell
  Get-AppxPackage -Name "ANPOS.Desktop" | Remove-AppxPackage
  ```

### 4.4 فحص سجلات تثبيت AppX عند حدوث أخطاء
إذا واجهت أي خطأ أثناء `Add-AppxPackage`، افحص سجل أحداث ويندوز:
```powershell
Get-WinEvent -LogName "Microsoft-Windows-AppXDeployment-Server/Operational" -MaxEvents 20 | Format-Table -Wrap TimeCreated, Id, Message
```

---

## 5. قواعد البيانات والملفات والشبكة في بيئة MSIX

### 5.1 سلوك نظام الملفات الافتراضي (Virtual File System - VFS)
- في تطبيقات MSIX العادية، يُعاد توجيه عمليات الكتابة في `%APPDATA%` و `%LOCALAPPDATA%` إلى مسار الحاوية المعزول:  
  `%LOCALAPPDATA%\Packages\ANPOS.Desktop_...\LocalCache\Local`
- بفضل قدرة **`runFullTrust`**، يحتفظ AN POS بقدرته الكاملة على قراءة وكتابة البيانات في مسار قاعدة البيانات المشتركة:  
  `%PROGRAMDATA%\AN POS\data\anpos.db`  
  مما يسمح بتشارك البيانات بسلاسة حتى لو تم التثبيت كحزمة MSIX.

### 5.2 خادم LAN وجدار الحماية (Firewall)
- قدرة `privateNetworkClientServer` تمنح التطبيق صلاحية فتح السوكتات والاستماع عبر بطاقة الشبكة المحلية للمنفذ `3000`.
- إذا واجهت حزم UWP بيئة تقييد محلية (Loopback Restriction)، فإن تطبيقات FullTrust معفاة تلقائياً منها لأنها تعمل كعمليات Win32 حقيقية.

---

## 6. أوامر البناء والتكامل المستمر (CI/CD)

### الأوامر المتاحة في `package.json`

| الأمر | الوظيفة |
| :--- | :--- |
| `npm run package:win:msix` | بناء وتغليف حزمة MSIX لمعمارية x64 باستخدام electron-builder. |
| `npm run verify:signatures` | فحص محتويات الحزمة والتأكد من وجود التوقيع الرقمي (`AppxSignature.p7x`). |
| `node scripts/generate-checksums.mjs` | حساب بصمة SHA-256 لحزمة `.msix` وحفظها في `SHA256SUMS.txt`. |

### التكامل في GitHub Actions (`.github/workflows/build.yml`)
يقوم سير العمل الآلي في بيئة `windows-latest` بـ:
1. بناء أهداف التثبيت الأربعة بالتوازي: NSIS + Portable + MSI + MSIX.
2. التحقق من التوقيع الرقمي عبر `verify-signature.mjs`.
3. حساب بصمات SHA-256 لكافة الحزم.
4. رفع حزمة `release/*.msix` ضمن المرفقات وإصدارات GitHub Releases الرسمية.
