# دليل تشغيل وإدارة خدمة خادم AN POS LAN لنظام ويندوز (Windows Service Guide)

> **الهدف:** توثيق المعمارية والتشغيل المستقل لخادم الشبكة المحلية لنظام AN POS كخدمة نظام تشغيل ويندوز (`ANPOSLanService`) تعمل باستمرار في الخلفية حتى قبل تسجيل دخول المستخدم.
>
> **المسار المستهدف:** المسار C ضمن [PROFESSIONAL_INSTALLER_MIGRATION_PLAN.md](../PROFESSIONAL_INSTALLER_MIGRATION_PLAN.md).

---

## 1. لماذا خدمة ويندوز المستقلة (Windows Service)؟

في البيئات التجارية التي تحتوي على عدة محطات بيع (Workstations) أو هواتف ذكية وأجهزة تابلت تعمل على شبكة المتجر:
* **العمل المستمر:** لا يتوقف خادم الشبكة المحلية عند إغلاق نافذة البرنامج أو عند تسجيل خروج موظف الكاشير من ويندوز.
* **البدء التلقائي مع النظام:** تبدأ الخدمة فور إقلاع جهاز الخادم وقبل تسجيل دخول أي مستخدم (`Start=auto`).
* **إعادة التشغيل التلقائي عند الفشل (Auto-Recovery):** يعيد نظام ويندوز تشغيل الخدمة تلقائياً خلال ثوانٍ في حال حدوث أي انقطاع.
* **الملكية الحصرية لقاعدة البيانات (Single Writer):** تتولى الخدمة وحدها الكتابة على ملف SQLite الرئيسي وتنسيق سجلات WAL وتفريغها بأمان.

---

## 2. المعمارية وتدفق البيانات

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Windows Service Process: AN POS.exe --service                         │
│  (حساب التشغيل: NT AUTHORITY\NetworkService أو LocalSystem)             │
│                                                                        │
│  ├─ Fastify HTTP Server (Port 3000)                                    │
│  ├─ WebSocket Realtime Event Bus                                       │
│  ├─ SQLite Engine (node:sqlite + WAL Mode)                             │
│  │    └─ المسار المشترك: %PROGRAMDATA%\AN POS\data\anpos.db            │
│  ├─ Discovery (UDP Listener + Bonjour Advertising)                     │
│  ├─ Automated WAL Checkpoint & Backup Scheduler (كل 6 ساعات)           │
│  └─ Endpoints: /api/health & /api/service/status                       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
              ▼ LAN                                     ▼ Localhost
┌───────────────────────────────┐         ┌──────────────────────────────┐
│  Mobile & Tablet Terminals    │         │  Local Desktop Workstation   │
│  (هواتف الكاشير وأجهزة الجرد)   │         │  AN POS.exe (UI - asInvoker) │
│  اتصال عبر Wi-Fi/LAN           │         │  يعمل كـ Connected Client    │
└───────────────────────────────┘         └──────────────────────────────┘
```

---

## 3. إدارة الخدمة عبر سطر الأوامر (Service CLI)

تم تضمين سكربت إدارة الخدمة في المشروع عبر أوامر npm السريعة:

| الأمر | الوظيفة | أمر Windows المقابل |
| :--- | :--- | :--- |
| `npm run service:install` | تسجيل وتثبيت الخدمة وضبط سياسة التعافي | `sc.exe create ANPOSLanService ...` |
| `npm run service:start` | تشغيل الخدمة فوراً | `sc.exe start ANPOSLanService` |
| `npm run service:stop` | إيقاف الخدمة بأمان | `sc.exe stop ANPOSLanService` |
| `npm run service:status` | الاستعلام عن حالة الخدمة الحالية | `sc.exe query ANPOSLanService` |
| `npm run service:uninstall` | إيقاف وحذف الخدمة بالكامل | `sc.exe delete ANPOSLanService` |

### تفاصيل أمر التثبيت اليدوي عبر `sc.exe`:
```cmd
:: 1. إنشاء الخدمة
sc.exe create ANPOSLanService binPath= "\"C:\Program Files\AN POS\AN POS\AN POS.exe\" --service" start= auto DisplayName= "AN POS LAN Service"

:: 2. ضبط الوصف
sc.exe description ANPOSLanService "خدمة خادم الشبكة المحلية لنظام AN POS للعمل الدائم في الخلفية قبل تسجيل الدخول"

:: 3. تفعيل إعادة التشغيل التلقائي عند أي تعثر
sc.exe failure ANPOSLanService reset= 86400 actions= restart/5000/restart/10000/restart/30000
```

---

## 4. التثبيت التلقائي للخدمة عبر حزم MSI

عند استخدام حزمة تثبيت Windows Installer (`.msi`) التي تم بناؤها في المسار B، يمكن تثبيت وتفعيل الخدمة تلقائياً عبر تحديد خيار النمط `EDITION=Server`:

```cmd
msiexec /i "ANPOS-Setup-3.0.0-x64.msi" /qn EDITION=Server SERVER_PORT=3000 /l*v "C:\Logs\service_install.log"
```

* **ما يقوم به المثبت تلقائياً:**
  1. إنشاء مجلد البيانات المشتركة في `%PROGRAMDATA%\AN POS\data` مع منح صلاحيات القراءة والكتابة لـ `Users` و `NetworkService`.
  2. تسجيل خدمة `ANPOSLanService` في Windows Service Control Manager.
  3. ضبط المنفذ في جدار الحماية (Private/Domain على نطاق localSubnet).
  4. تشغيل الخدمة تلقائياً فور انتهاء التثبيت (`Start="install"`).
  5. إيقاف الخدمة بأمان عند الترقية أو إلغاء التثبيت (`Stop="both"`).

---

## 5. مراقبة الصحة والسجلات (Health & Logging)

### 5.1 فحص صحة الخادم عبر HTTP:
يمكن فحص استجابة الخادم فوراً عبر أي متصفح أو عبر سطر الأوامر:
```bash
curl http://localhost:3000/api/health
```
الاستجابة النموذجية:
```json
{
  "status": "ok",
  "timestamp": "2026-10-23T17:40:00.000Z",
  "app": "an-pos",
  "version": "3.0.0",
  "mode": "service",
  "uptime": 1420,
  "clientsCount": 3
}
```

### 5.2 الاستعلام عن حالة الخدمة والموارد:
```bash
curl http://localhost:3000/api/service/status
```
تُرجع تفاصيل استهلاك الذاكرة، ومسار قاعدة البيانات النشطة، وعدد الأجهزة المتصلة.

### 5.3 ملفات السجلات (Logs):
* يتم كتابة كافة أحداث بدء التشغيل، والاتصالات، والأخطاء، وتفريغ النسخ الاحتياطية في:  
  `%PROGRAMDATA%\AN POS\logs\service.log`

---

## 6. سلوك واجهة سطح المكتب عند تشغيل الخدمة

* عند فتح تطبيق سطح المكتب (`AN POS.exe`) في وضع الواجهة العادي:
  1. يقوم التطبيق أولاً بفحص `http://127.0.0.1:3000/api/health`.
  2. في حال اكتشاف أن خدمة ويندوز تعمل بالفعل في الخلفية، يتخطى التطبيق تلقائياً تشغيل خادم مكرر، ويعمل كطرفية عرض ومحاسبة مرتبطة بالخادم المشترك دون أي تضارب على المنفذ أو قفل قاعدة البيانات.
