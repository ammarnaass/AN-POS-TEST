# 🔐 نظام إنشاء الحساب، تفعيل التطبيق، وتعيين الصلاحيات — AN POS V3.0

> **المشروع**: AN POS | **الإصدار**: V3.0 Pro  
> **تاريخ التوثيق**: 2026-09-04  
> **النطاق**: دورة حياة المستخدم الكاملة — من التسجيل حتى صلاحيات الوصول الدقيقة

---

## 📋 فهرس المحتويات

1. [نظرة عامة على المعمارية](#1--نظرة-عامة-على-المعمارية)
2. [المرحلة الأولى: إنشاء الحساب](#2--المرحلة-الأولى-إنشاء-الحساب)
3. [المرحلة الثانية: تسجيل الدخول واستعادة الجلسة](#3--المرحلة-الثانية-تسجيل-الدخول-واستعادة-الجلسة)
4. [المرحلة الثالثة: التجربة المجانية (Trial)](#4--المرحلة-الثالثة-التجربة-المجانية-trial)
5. [المرحلة الرابعة: تفعيل التطبيق (الترخيص)](#5--المرحلة-الرابعة-تفعيل-التطبيق-الترخيص)
6. [المرحلة الخامسة: نظام الأدوار والصلاحيات](#6--المرحلة-الخامسة-نظام-الأدوار-والصلاحيات)
7. [حراسات التوجيه (Route Guards)](#7--حراسات-التوجيه-route-guards)
8. [مخطط تدفق الحالة الكامل](#8--مخطط-تدفق-الحالة-الكامل)
9. [جداول البيانات والمخطط التخزيني](#9--جداول-البيانات-والمخطط-التخزيني)
10. [خريطة الملفات المصدرية](#10--خريطة-الملفات-المصدرية)

---

## 1. 🏗 نظرة عامة على المعمارية

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AN POS — Electron Desktop App                   │
├──────────────────────┬──────────────────────────────────────────────┤
│   Renderer Process   │              Main Process                    │
│   (React/Vite)       │              (Node.js/SQLite)                │
│                      │                                              │
│  LoginPage.tsx       │◄─── IPC ───► handlers/auth.ts               │
│  authStore.ts        │              (loginUser, registerUser,       │
│  trialService.ts     │               getCurrentUser, logoutUser)    │
│  licenseService.ts   │◄─── IPC ───► license/licenseManager.ts      │
│  FirstRunGuard.tsx   │              (activate, deactivate,          │
│  AuthGuard.tsx       │               getStatus, fingerprint)        │
│  UsersRolesTab.tsx   │◄─── IPC ───► handlers/db-utils.ts           │
│  permissions.ts      │              (SQLite CRUD)                   │
└──────────────────────┴──────────────────────────────────────────────┘
```

### طبقات الأمان الثلاث

| الطبقة | الغرض | الملفات المسؤولة |
|--------|--------|------------------|
| **المصادقة (Authentication)** | إثبات هوية المستخدم | `authStore.ts`, `handlers/auth.ts` |
| **الترخيص (Licensing)** | تفعيل التطبيق وربطه بالجهاز | `licenseService.ts`, `licenseManager.ts` |
| **التفويض (Authorization)** | صلاحيات الوصول الدقيقة | `permissions.ts`, `UsersRolesTab.tsx` |

---

## 2. 👤 المرحلة الأولى: إنشاء الحساب

### 2.1 التدفق الكامل

```
المستخدم ──► LoginPage (view='register') ──► handleRegister()
                                                    │
                                    ┌───────────────┼───────────────┐
                                    ▼               ▼               ▼
                              التحقق من          authStore         Dexie
                              المدخلات          .register()      .users.put()
                               (Client)              │           (كاش محلي)
                                                     │
                                                     ▼
                                            waitForElectronAPI()
                                                     │
                                                     ▼
                                          electronAPI.auth.register()
                                                     │
                                              ┌──────┴──────┐
                                              ▼             ▼
                                          preload/       IPC Bridge
                                          index.ts      'auth:register'
                                              │             │
                                              ▼             ▼
                                          ipc/auth.ts ──► handlers/auth.ts
                                                          registerUser()
                                                              │
                                                              ▼
                                                     SQLite INSERT INTO users
```

### 2.2 نقطة الدخول — `LoginPage.tsx`

**الملف**: `src/pages/auth/LoginPage.tsx`

#### الحقول المطلوبة:

| الحقل | النوع | مطلوب | التحقق |
|-------|-------|--------|--------|
| `regName` | `string` | ✅ | غير فارغ |
| `regUsername` | `string` | ✅ | غير فارغ + فريد في قاعدة البيانات |
| `regPassword` | `string` | ✅ | ≥ 8 أحرف (واجهة) / ≥ 4 أحرف (خادم) |
| `regPhone` | `string` | ❌ | اختياري |

#### خوارزمية `handleRegister()`:

```typescript
// 1. التحقق الأمامي (Client-Side Validation)
if (!regName.trim())     → خطأ: "أدخل الاسم الكامل"
if (!regUsername.trim())  → خطأ: "أدخل اسم المستخدم"
if (!regPassword)        → خطأ: "أدخل كلمة المرور"
if (regPassword.length < 8) → خطأ: "كلمة المرور يجب أن تكون 8 أحرف على الأقل"

// 2. التسجيل عبر IPC في قاعدة SQLite الحقيقية
const result = await authStore.register({
  username, name, pin: regPassword, phone?
});

// 3. مزامنة Dexie (IndexedDB) كنسخة احتياطية للواجهات
await db.users.put({
  id: result.user.id,
  role: 'seller',      // ← الدور الافتراضي
  status: 'active',    // ← الحالة الافتراضية
  ...
});

// 4. عرض رسالة النجاح → تحويل لشاشة تسجيل الدخول
```

### 2.3 المعالج الخلفي — `handlers/auth.ts → registerUser()`

**الملف**: `electron/main/handlers/auth.ts`

```typescript
export async function registerUser(data) {
  // التحقق من المدخلات
  if (!username || !name || !pin) → خطأ 422
  if (pin.length < 4)            → خطأ 422

  // التحقق من التكرار
  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) → خطأ 409: "اسم المستخدم موجود مسبقاً"

  // الإدراج في SQLite
  const id = randomUUID();
  execute('INSERT INTO users (...) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, username, name, pin, phone, email, 'seller', 'active', now, now]);

  return { user: { id, username, name, role: 'seller', status: 'active' } };
}
```

### 2.4 مخطط جدول المستخدمين (SQLite)

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,                    -- كلمة المرور (نص عادي حالياً)
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'seller',  -- الدور الوظيفي
  role_id TEXT DEFAULT '',              -- معرف الدور المخصص (إن وُجد)
  status TEXT NOT NULL DEFAULT 'active', -- active | inactive
  last_login TEXT DEFAULT '',
  login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT DEFAULT '',         -- قفل الحساب
  password_changed_at TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

> ⚠️ **ملاحظة أمنية**: كلمة المرور (`pin`) تُخزّن حالياً كنص عادي بدون تشفير (hashing). يُوصى بشدة بتطبيق bcrypt أو argon2 قبل بيئة الإنتاج.

---

## 3. 🔑 المرحلة الثانية: تسجيل الدخول واستعادة الجلسة

### 3.1 تدفق تسجيل الدخول

```
المستخدم ──► LoginPage (view='login') ──► handleLogin()
                                               │
                                               ▼
                                        authStore.login(username, pin)
                                               │
                                               ▼
                                      waitForElectronAPI(15s)
                                               │
                                    ┌──────────┼──────────┐
                                    ▼                     ▼
                               API متاح              API غير متاح
                                    │                     │
                                    ▼                     ▼
                          electronAPI.auth.login()   → خطأ: "Electron API
                                    │                 غير متاح"
                                    ▼
                           handlers/auth.ts
                           loginUser(username, pin)
                                    │
                           ┌────────┼────────┐
                           ▼        ▼        ▼
                      مستخدم    حساب     رمز سري
                     غير موجود  معطّل    غير صحيح
                       401      403      401 + عدّاد
                                         │
                                    ┌────┴────┐
                                    ▼         ▼
                              < 5 محاولات  = 5 محاولات
                                              │
                                              ▼
                                      قفل 15 دقيقة (423)
                                              │
                                              ▼
                                    logActivity('account_locked')
```

### 3.2 آلية الأمان — قفل الحساب (BR-USR-009)

| المعامل | القيمة | الوصف |
|---------|--------|-------|
| `MAX_LOGIN_ATTEMPTS` | `5` | عدد المحاولات الفاشلة قبل القفل |
| `LOCK_DURATION_MS` | `15 * 60 * 1000` | مدة القفل (15 دقيقة) |

#### سيناريو القفل:
```
محاولة 1: خطأ → "رمز سري غير صحيح (4 محاولات متبقية)"
محاولة 2: خطأ → "رمز سري غير صحيح (3 محاولات متبقية)"
...
محاولة 5: قفل → "قُفل الحساب بعد 5 محاولات فاشلة. حاول بعد 15 دقيقة"
```

### 3.3 حفظ الجلسة واستعادتها

**الملف**: `src/store/authStore.ts`

```typescript
// عند تسجيل الدخول الناجح:
localStorage.setItem('anpos_setup_completed', 'true');  // إتمام الإعداد الأولي
localStorage.setItem('anpos_user_id', result.user.id);  // حفظ معرف الجلسة

// استعادة الجلسة عند إعادة فتح التطبيق:
restoreSession: async () => {
  const userId = localStorage.getItem('anpos_user_id');
  if (!userId) return;
  const result = await api.auth.getCurrentUser(userId);
  if (result.user) set({ user: result.user, isAuthenticated: true });
}
```

### 3.4 تسجيل الخروج

```typescript
logout: () => {
  api.auth.logout(user.id);        // تسجيل نشاط الخروج
  localStorage.removeItem('anpos_user_id');  // حذف الجلسة
  set({ user: null, isAuthenticated: false });
}
```

---

## 4. 🧪 المرحلة الثالثة: التجربة المجانية (Trial)

### 4.1 نظرة عامة

**الملف**: `src/services/trialService.ts`

التجربة المجانية تسمح للمستخدم بتجربة التطبيق **بدون تسجيل حساب أو ترخيص** لمدة محدودة.

| المعامل | القيمة | التخزين |
|---------|--------|---------|
| مدة التجربة | **7 أيام** | `localStorage('anpos_trial_started')` |
| حد المبيعات | **1000 عملية** | `localStorage('anpos_trial_sales')` |

### 4.2 تفعيل التجربة

**الملف**: `src/pages/auth/LoginPage.tsx → handleSkipTrial()`

```typescript
const handleSkipTrial = () => {
  // 1. بدء التجربة (حفظ وقت البدء)
  startTrial();  // localStorage.setItem('anpos_trial_started', new Date().toISOString())

  // 2. وضع علامة إكمال الإعداد الأولي
  completeFirstRun();  // localStorage.setItem('anpos_setup_completed', 'true')

  // 3. إنشاء مستخدم تجريبي وهمي
  useAuthStore.setState({
    user: {
      id: 'trial-user',
      username: 'trial',
      name: 'مستخدم تجريبي',
      role: 'seller',
      status: 'active',
    },
    isAuthenticated: true,
  });

  // 4. التحويل للصفحة الرئيسية
  navigate('/', { replace: true });
};
```

### 4.3 حالات التجربة

```typescript
interface TrialState {
  startedAt: string | null;     // وقت بدء التجربة
  remainingDays: number;        // الأيام المتبقية
  isExpired: boolean;           // هل انتهت؟
  isActive: boolean;            // هل نشطة حالياً؟
  salesCount: number;           // عدد عمليات البيع المنجزة
  remainingSales: number;       // عمليات البيع المتبقية
}
```

#### مصفوفة الحالات:

| الحالة | `isActive` | `isExpired` | الشرط |
|--------|-----------|-------------|-------|
| لم تبدأ بعد | `false` | `false` | `startedAt === null` |
| نشطة | `true` | `false` | `remainingDays > 0 && salesCount < 1000` |
| منتهية (وقت) | `false` | `true` | `remainingDays <= 0` |
| منتهية (حد المبيعات) | `false` | `true` | `salesCount >= 1000` |
| مرخّص (تجاوز التجربة) | `false` | `false` | `isLicensed() === true` |

### 4.4 العلاقة مع الترخيص

```typescript
export function getTrialState(): TrialState {
  // إذا كان التطبيق مرخصاً → التجربة غير ذات صلة
  if (isLicensed()) {
    return {
      isActive: false,
      isExpired: false,
      remainingDays: Infinity,
      remainingSales: Infinity,
      // ...
    };
  }
  // ... منطق التجربة الاعتيادي
}
```

---

## 5. 🛡 المرحلة الرابعة: تفعيل التطبيق (الترخيص)

### 5.1 بنية نظام الترخيص

```
┌─────────────────────────────────────────────────────────┐
│              Electron Main Process                       │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │ licenseManager   │  │ verifyLicense    │             │
│  │                  │  │  (Ed25519 sig    │             │
│  │ .activate()      │──│   verification)  │             │
│  │ .deactivate()    │  └──────────────────┘             │
│  │ .getStatus()     │                                   │
│  │ .isLicensed()    │  ┌──────────────────┐             │
│  │                  │──│ licenseStorage   │             │
│  └─────────────────┘  │  (.lic file R/W) │             │
│                       └──────────────────┘             │
│           │                                             │
│           │ IPC                                         │
├───────────┼─────────────────────────────────────────────┤
│           ▼                                             │
│  ┌─────────────────────────┐                            │
│  │ Renderer Process         │                            │
│  │                          │                            │
│  │  licenseService.ts       │                            │
│  │  ├── fetchLicenseStatus()│                            │
│  │  ├── isLicensed()        │                            │
│  │  ├── activateLicenseWithKey() │                       │
│  │  └── deactivateCurrentLicense() │                    │
│  └─────────────────────────┘                            │
└─────────────────────────────────────────────────────────┘
```

### 5.2 حالات الترخيص

| الحالة | `status` | `isLicensed` | الوصف |
|--------|----------|-------------|-------|
| 🔴 غير مرخّص | `unlicensed` | `false` | لم يُدخل كود تفعيل بعد |
| 🟡 تجريبي | `trial` | `false` | يعمل ضمن الفترة التجريبية |
| 🟢 مفعّل | `active` | `true` | ترخيص ساري ومطابق للعتاد |
| 🔴 منتهي الصلاحية | `expired` | `false` | انتهى تاريخ الاشتراك |
| 🔴 تلاعب | `tampered` | `false` | بصمة العتاد لا تتطابق |

### 5.3 عملية التفعيل

```
المستخدم ──► إعدادات النظام ──► إدخال كود التفعيل
                                        │
                                        ▼
                              licenseService.activateLicenseWithKey(key)
                                        │
                                        ▼
                              electronAPI.license.activate(key)
                                        │
                              ┌─────────┼─────────┐
                              ▼                   ▼
                        IPC Bridge           ipc/license.ts
                              │                   │
                              ▼                   ▼
                        licenseManager.activate(keyOrFileContent)
                              │
                     ┌────────┼────────────────────┐
                     ▼        ▼                    ▼
               parseAndVerify  فحص الصلاحية     فحص العتاد
               Key(Ed25519)    الزمنية           (بصمة الجهاز)
                     │              │                   │
                     ▼              ▼                   ▼
                توقيع صالح؟    غير منتهي؟          متطابق؟
                 ✅/❌          ✅/❌               ✅/❌
                     │              │                   │
                     └──────────────┴───────────────────┘
                                    │
                              كل الفحوصات ناجحة
                                    │
                                    ▼
                         saveStoredLicense(.lic file)
                         localStorage cache update
                                    │
                                    ▼
                         return { success: true, status: 'active' }
```

### 5.4 خصائص الترخيص المشفرة

```typescript
interface LicenseStatusResponse {
  status: 'active' | 'trial' | 'expired' | 'tampered' | 'unlicensed';
  isLicensed: boolean;
  storeId?: string;              // معرف المتجر/العميل
  expiresAt?: number;            // 0 = مدى الحياة، أو Unix timestamp
  maxMobileDevices: number;      // الحد الأقصى لأجهزة الهاتف (افتراضي: 5)
  hardwareFingerprint: string;   // بصمة عتاد الجهاز
  activatedAt?: string;          // تاريخ التفعيل
  rawKey?: string;               // المفتاح الخام
  daysRemaining?: number | null; // الأيام المتبقية (null = مدى الحياة)
}
```

### 5.5 خطط الترخيص

| الخطة | `plan` | `expiresAt` | الوصف |
|-------|--------|-------------|-------|
| مدى الحياة | `lifetime` | `0` | لا ينتهي أبداً |
| اشتراك | `subscription` | `> 0` | ينتهي في تاريخ محدد |
| تجريبي | `trial` | — | تُدار عبر `trialService.ts` |

### 5.6 بصمة العتاد (Hardware Fingerprint)

النظام يولّد بصمة فريدة للجهاز لربط الترخيص بعتاد محدد:

```
بصمة العتاد = hash(CPU ID + Motherboard Serial + Disk Serial + MAC Address)
```

- **الملف**: `electron/main/license/hardwareFingerprint.ts`
- **الاستخدام**: عند التفعيل، يُقارن `hwHashInt` المشفر في المفتاح مع بصمة الجهاز الحالي
- **إذا لم يتطابق**: يُرجع حالة `tampered`

---

## 6. 🎭 المرحلة الخامسة: نظام الأدوار والصلاحيات

### 6.1 الأدوار الوظيفية المعرّفة في النظام

**الملف**: `src/types/index.ts`

```typescript
type UserRole = 'admin' | 'accountant' | 'sales_manager' |
                'inventory_manager' | 'cashier' | 'seller';
```

| الدور | الرمز | الوصف | الصلاحيات الافتراضية |
|-------|-------|-------|---------------------|
| 🔴 مدير النظام | `admin` | صلاحيات كاملة على كل شيء | `{ '*': true }` |
| 🟣 كاشير | `cashier` | عمليات الصندوق والبيع | بيع + صندوق |
| 🔵 بائع | `seller` | البيع والعملاء | بيع + عرض |
| 🟢 مدير مبيعات | `sales_manager` | إشراف على المبيعات | بيع + تقارير |
| 🟠 مدير مخزون | `inventory_manager` | إدارة المخزون | مخزون + منتجات |
| 🟦 محاسب | `accountant` | العمليات المالية | تقارير + قيود |

### 6.2 بنية الصلاحيات التفصيلية (Granular Permissions)

**الملف**: `src/utils/permissions.ts`

```
الصلاحيات مقسمة إلى 9 مجموعات رئيسية:

📊 نقطة البيع (POS)
├── pos.complete_sale   → إتمام البيع
├── pos.cancel_sale     → إلغاء البيع
└── pos.view_sales      → عرض المبيعات

📄 الفواتير (Invoice)
├── invoice.create      → إنشاء فاتورة
├── invoice.edit        → تعديل فاتورة
├── invoice.delete      → حذف فاتورة
├── invoice.print       → طباعة فاتورة
└── invoice.reprint     → إعادة طباعة

📦 المنتجات (Product)
├── product.add         → إضافة منتج
├── product.edit        → تعديل منتج
├── product.delete      → حذف منتج
└── product.view        → عرض المنتجات

👥 العملاء (Customer)
├── customer.add        → إضافة عميل
├── customer.edit       → تعديل عميل
├── customer.delete     → حذف عميل
└── customer.view       → عرض العملاء

🏭 الموردين (Supplier)
├── supplier.add        → إضافة مورد
├── supplier.edit       → تعديل مورد
├── supplier.delete     → حذف مورد
└── supplier.view       → عرض الموردين

📦 المخزون (Inventory)
├── inventory.add       → إضافة حركة
├── inventory.edit      → تعديل حركة
├── inventory.delete    → حذف حركة
└── inventory.view      → عرض المخزون

📈 التقارير (Report)
├── report.view         → عرض التقارير
└── report.export       → تصدير التقارير

⚙️ الإعدادات (Settings)
├── settings.edit       → تعديل الإعدادات
└── settings.view       → عرض الإعدادات

👤 المستخدمون (User)
├── user.add            → إضافة مستخدم
├── user.edit           → تعديل مستخدم
├── user.delete         → حذف مستخدم
├── user.view           → عرض المستخدمين
└── user.assign_permissions → تعيين صلاحيات
```

### 6.3 آلية التحقق من الصلاحيات

```typescript
// التحقق من صلاحية واحدة
function hasPermission(role: RoleEntity, permission: string): boolean {
  if (role.permissions['*']) return true;  // المدير لديه كل شيء
  return role.permissions[permission] === true;
}

// التحقق من أي صلاحية (OR)
function hasAnyPermission(role, permissions[]): boolean;

// التحقق من جميع الصلاحيات (AND)
function hasAllPermissions(role, permissions[]): boolean;

// دوال الصلاحيات القديمة المبنية على الدور (Legacy)
canControlCash(role)     → admin || cashier
canSeeProfit(role)       → admin
canManageSettings(role)  → admin
canManageInventory(role) → admin
canManageAccounts(role)  → admin
canManageEntries(role)   → admin || accountant
canReviewEntries(role)   → admin || accountant
canPrintReports(role)    → admin || accountant
canViewEntries(role)     → admin || accountant || cashier
```

### 6.4 جدول الأدوار (SQLite)

```sql
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,          -- اسم فريد (admin, seller, ...)
  description TEXT DEFAULT '',         -- وصف الدور
  permissions TEXT NOT NULL DEFAULT '{}', -- JSON: {"pos.complete_sale": true, ...}
  is_system INTEGER NOT NULL DEFAULT 0,  -- 1 = دور نظامي (غير قابل للحذف)
  created_at TEXT NOT NULL
);
```

### 6.5 إدارة الأدوار والصلاحيات (واجهة المدير)

**الملف**: `src/features/settings/tabs/UsersRolesTab.tsx`

#### التبويبات الفرعية:

| التبويب | الغرض |
|---------|-------|
| **المستخدمون** | قائمة المستخدمين + بحث + فلترة + إضافة/تعديل/حذف |
| **سجل النشاطات** | كل عمليات الدخول والخروج والتعديلات |
| **الأدوار والصلاحيات** | إنشاء أدوار مخصصة + تعيين صلاحيات دقيقة |

#### عمليات إدارة المستخدمين (admin فقط):

| العملية | الوصف | القيود |
|---------|-------|--------|
| ➕ إضافة مستخدم | فتح نموذج إنشاء مستخدم جديد | admin فقط |
| ✏️ تعديل مستخدم | تغيير الاسم، الدور، البريد، الهاتف | admin فقط |
| 🔑 إعادة تعيين كلمة المرور | تعيين رمز سري جديد | admin فقط |
| 🔄 تبديل الحالة | تفعيل/تعطيل الحساب | لا يمكن تعطيل الحساب الحالي |
| 🗑️ حذف مستخدم | حذف نهائي | لا يمكن حذف الحساب الحالي |

#### إنشاء دور مخصص:

```
المدير ──► تبويب "الأدوار والصلاحيات" ──► "إضافة دور مخصص"
                                                  │
                                                  ▼
                                          نموذج إنشاء الدور
                                          ├── اسم الدور
                                          ├── الوصف
                                          ├── ☐ صلاحيات المدير الكاملة (*)
                                          └── تفاصيل الصلاحيات:
                                              ├── ☐ نقطة البيع (3 صلاحيات)
                                              ├── ☐ الفواتير (5 صلاحيات)
                                              ├── ☐ المنتجات (4 صلاحيات)
                                              ├── ☐ العملاء (4 صلاحيات)
                                              ├── ☐ الموردين (4 صلاحيات)
                                              ├── ☐ المخزون (4 صلاحيات)
                                              ├── ☐ التقارير (2 صلاحيات)
                                              ├── ☐ الإعدادات (2 صلاحيات)
                                              └── ☐ المستخدمون (5 صلاحيات)
```

---

## 7. 🚧 حراسات التوجيه (Route Guards)

### 7.1 `FirstRunGuard` — حارس الإعداد الأولي

**الملف**: `src/app/guards/FirstRunGuard.tsx`

```typescript
function FirstRunGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const trial = getTrialState();

  if (isAuthenticated || trial.isActive) {
    return <Outlet />;      // ← مسموح بالمرور
  }

  return <Navigate to="/login" replace />;  // ← إعادة توجيه لتسجيل الدخول
}
```

#### شروط السماح بالمرور:

| الشرط | الوصف |
|-------|-------|
| `isAuthenticated === true` | المستخدم مسجّل الدخول |
| `trial.isActive === true` | التجربة المجانية نشطة |

### 7.2 `AuthGuard` — حارس المصادقة

**الملف**: `src/app/guards/AuthGuard.tsx`

```typescript
function AuthGuard({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) return <>{children}</>;

  const trial = getTrialState();
  if (trial.isActive) return <>{children}</>;

  return <Navigate to="/login" state={{ from: location }} replace />;
}
```

### 7.3 خريطة المسارات المحمية

```
/login                    ← عام (AuthLayout)
│
├── / (Dashboard)         ← FirstRunGuard → DashboardLayout
├── /inventory            ← FirstRunGuard → DashboardLayout
├── /products/new         ← FirstRunGuard → DashboardLayout
├── /products/:id/edit    ← FirstRunGuard → DashboardLayout
├── /categories           ← FirstRunGuard → DashboardLayout
├── /customers            ← FirstRunGuard → DashboardLayout
├── /suppliers            ← FirstRunGuard → DashboardLayout
├── /sales                ← FirstRunGuard → DashboardLayout
├── /cash                 ← FirstRunGuard → DashboardLayout
├── /expenses             ← FirstRunGuard → DashboardLayout
├── /promotions           ← FirstRunGuard → DashboardLayout
├── /settings             ← FirstRunGuard → DashboardLayout
├── /delivery-orders      ← FirstRunGuard → DashboardLayout
├── /support              ← FirstRunGuard → DashboardLayout
│
├── /pos                  ← FirstRunGuard → PosLayout
├── /pos/advanced         ← FirstRunGuard → PosLayout
├── /pos/quick            ← FirstRunGuard → PosLayout
│
├── /barcode/labels       ← FirstRunGuard → DashboardLayout
│
└── * (أي مسار آخر)       ← إعادة توجيه إلى /login
```

---

## 8. 🔄 مخطط تدفق الحالة الكامل

```
                    ┌──────────────────────────────┐
                    │      فتح التطبيق (App Start)  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ restoreSession()              │
                    │ (هل يوجد userId في localStorage?)│
                    └──────────────┬───────────────┘
                              ┌────┴────┐
                              ▼         ▼
                           نعم         لا
                              │         │
                              ▼         ▼
                    getCurrentUser()   FirstRunGuard
                         │              │
                    ┌────┴────┐    ┌────┴────┐
                    ▼         ▼    ▼         ▼
                 صالح      غير   trial     لا
                    │      صالح  .isActive  │
                    │         │     │        │
                    ▼         │     ▼        ▼
              isAuthenticated │  الصفحة    /login
              = true          │  الرئيسية    │
                    │         │     │        │
                    ▼         │     │        ▼
              الصفحة الرئيسية │     │  ┌─────────────────┐
                              │     │  │   شاشة الدخول    │
                              │     │  │                  │
                              ▼     │  │ ┌──────┬────────┐│
                         /login     │  │ │تسجيل │ إنشاء  ││
                              │     │  │ │دخول  │ حساب   ││
                              │     │  │ ├──────┼────────┤│
                              │     │  │ │       تجربة   ││
                              │     │  │ │       مجانية  ││
                              └─────┘  │ └──────┴────────┘│
                                       └─────────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              ▼               ▼               ▼
                        تسجيل دخول      إنشاء حساب      تجربة مجانية
                              │               │               │
                              ▼               ▼               ▼
                        SQLite auth      SQLite INSERT    localStorage
                              │               │          trial_started
                              ▼               ▼               │
                        isAuthenticated  ← view='login'       ▼
                        = true              │          trial.isActive
                              │               │          = true
                              │               │               │
                              ▼               │               ▼
                    ┌─────────────────────┐   │    ┌─────────────────┐
                    │   الصفحة الرئيسية    │◄──┘    │   الصفحة الرئيسية│
                    │                      │       │  (وضع تجريبي)   │
                    │  ┌────────────────┐  │       └─────────────────┘
                    │  │ هل مرخّص؟      │  │
                    │  │ (isLicensed)   │  │
                    │  └───────┬────────┘  │
                    │     ┌────┴────┐      │
                    │     ▼         ▼      │
                    │   نعم        لا      │
                    │     │         │      │
                    │     ▼         ▼      │
                    │  كامل     شريط       │
                    │  الوظائف  تنبيه      │
                    │           + تفعيل    │
                    └─────────────────────┘
```

---

## 9. 💾 جداول البيانات والمخطط التخزيني

### 9.1 SQLite (Main Process)

| الجدول | الغرض | المفتاح |
|--------|-------|---------|
| `users` | بيانات المستخدمين | `id` (UUID) |
| `roles` | الأدوار والصلاحيات | `id` (UUID) |
| `user_activities` | سجل التدقيق | `id` (UUID) |
| `refresh_tokens` | رموز التحديث (تراثي) | `id` (UUID) |
| `audit_logs` | سجلات المراجعة | `id` (UUID) |

### 9.2 localStorage (Renderer Process)

| المفتاح | القيمة | الغرض |
|---------|--------|-------|
| `anpos_setup_completed` | `'true'` | علامة إكمال الإعداد الأولي |
| `anpos_user_id` | UUID | معرف جلسة المستخدم الحالي |
| `anpos_trial_started` | ISO timestamp | وقت بدء التجربة |
| `anpos_trial_sales` | رقم | عدّاد مبيعات التجربة |
| `anpos_license_cache` | JSON | كاش حالة الترخيص |

### 9.3 ملف الترخيص (Disk)

| العنصر | الموقع | الغرض |
|--------|--------|-------|
| `.lic` file | `appData/license/` | ملف الترخيص المشفر والموقّع (Ed25519) |

---

## 10. 📂 خريطة الملفات المصدرية

### طبقة Renderer (React)

| الملف | الغرض |
|-------|-------|
| `src/pages/auth/LoginPage.tsx` | واجهة تسجيل الدخول + إنشاء حساب + تجربة مجانية |
| `src/store/authStore.ts` | مخزن حالة المصادقة (Zustand) |
| `src/services/trialService.ts` | إدارة التجربة المجانية (7 أيام / 1000 عملية) |
| `src/services/licenseService.ts` | جسر الترخيص بين Renderer و Main |
| `src/app/guards/FirstRunGuard.tsx` | حارس الإعداد الأولي |
| `src/app/guards/AuthGuard.tsx` | حارس المصادقة |
| `src/utils/permissions.ts` | نظام الصلاحيات التفصيلية (33 صلاحية) |
| `src/features/settings/tabs/UsersRolesTab.tsx` | واجهة إدارة المستخدمين والأدوار |
| `src/features/settings/constants/permissionGroups.ts` | مجموعات وترجمات الصلاحيات |
| `src/types/index.ts` | تعريف `UserRole` |
| `src/App.tsx` | التوجيه والحراسات |

### طبقة Main Process (Electron/Node.js)

| الملف | الغرض |
|-------|-------|
| `electron/preload/index.ts` | جسر IPC (Preload Script) |
| `electron/main/ipc/auth.ts` | معالجات IPC للمصادقة |
| `electron/main/handlers/auth.ts` | منطق المصادقة (login, register, logout) |
| `electron/main/ipc/license.ts` | معالجات IPC للترخيص |
| `electron/main/license/licenseManager.ts` | مدير دورة حياة الترخيص |
| `electron/main/license/verifyLicense.ts` | التحقق التشفيري (Ed25519) |
| `electron/main/license/hardwareFingerprint.ts` | حساب بصمة العتاد |
| `electron/main/license/licenseStorage.ts` | قراءة/كتابة ملف الترخيص |
| `electron/main/license/keys.ts` | المفتاح العام للتحقق |
| `electron/main/schema-init.ts` | إنشاء جداول SQLite |

---

## 📊 ملخص نقاط القوة والتحسينات المقترحة

### ✅ نقاط القوة الحالية

- ✅ نظام صلاحيات تفصيلي مرن (33 صلاحية في 9 مجموعات)
- ✅ ترخيص مشفر (Ed25519) ومرتبط ببصمة العتاد
- ✅ قفل تلقائي بعد 5 محاولات فاشلة
- ✅ سجل تدقيق شامل لكل العمليات
- ✅ دعم أدوار مخصصة بجانب الأدوار النظامية
- ✅ التجربة المجانية محدودة بالوقت والعمليات

### ⚠️ تحسينات مقترحة

| المشكلة | الأولوية | الحل المقترح |
|---------|---------|-------------|
| كلمات المرور مخزّنة كنص عادي | 🔴 حرج | تطبيق bcrypt/argon2 hashing |
| لا يوجد تحقق من قوة كلمة المرور | 🟡 متوسط | إضافة فحص التعقيد (أحرف + أرقام + رموز) |
| `role_id` غير مستخدم فعلياً في `registerUser` | 🟡 متوسط | ربط المستخدم الجديد بدور مخصص عند الإنشاء |
| الدور الافتراضي `seller` ثابت | 🟢 منخفض | جعل الدور الافتراضي قابلاً للتكوين من الإعدادات |
| لا يوجد صلاحية لمنع التسجيل الذاتي | 🟡 متوسط | إضافة خيار لإغلاق التسجيل العام (admin-only registration) |
