import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { completeFirstRun } from '@/app/guards/FirstRunGuard';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  UserPlus,
  Phone,
  Shield,
  Check,
  Sparkles,
  LogIn,
  ArrowRight,
  Zap,
  Printer,
  Wifi,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import { startTrial } from '@/services/trialService';

type View = 'login' | 'register' | 'success';

export default function LoginPage() {
  const { login, register, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  // Electron & Server state check
  const [isElectronAvailable, setIsElectronAvailable] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
    setIsElectronAvailable(Boolean((window as any).electronAPI));
  }, [isAuthenticated, navigate]);

  const resetForms = () => {
    setUsername('');
    setPassword('');
    setError('');
    setRegName('');
    setRegUsername('');
    setRegPhone('');
    setRegPassword('');
    setRegError('');
    setRegSuccess(false);
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      setError('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }
    setError('');
    setIsLoading(true);

    const hasElectronAPI = !!(window as any).electronAPI;
    console.log('login attempt:', username.trim(), '| hasElectronAPI:', hasElectronAPI);

    try {
      const result = await login(username.trim(), password);
      if (!result.success) {
        if (result.error?.includes('Electron API')) {
          if (!hasElectronAPI) {
            setError('لم يتم تحميل Electron API. تأكد من تشغيل التطبيق عبر npm run dev وليس المتصفح العادي.');
          } else {
            setError(result.error);
          }
        } else {
          setError(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        }
        return;
      }
      navigate('/', { replace: true });
    } catch (e) {
      console.error('login threw:', e);
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) {
      setRegError('أدخل الاسم الكامل');
      return;
    }
    if (!regUsername.trim()) {
      setRegError('أدخل اسم المستخدم');
      return;
    }
    if (!regPassword) {
      setRegError('أدخل كلمة المرور');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    setRegError('');
    setIsLoading(true);

    try {
      // 1. تسجيل المستخدم في قاعدة بيانات SQLite الحقيقية عبر IPC
      const result = await register({
        username: regUsername.trim(),
        name: regName.trim(),
        pin: regPassword,
        phone: regPhone.trim() || undefined,
      });

      if (!result.success) {
        setRegError(result.error || 'فشل إنشاء الحساب');
        setIsLoading(false);
        return;
      }

      // 2. مزامنة Dexie محلياً كنسخة احتياطية للواجهات
      const now = new Date().toISOString();
      const userId = (result.user as any)?.id || generateId();

      await db.users.put({
        id: userId,
        username: regUsername.trim(),
        name: regName.trim(),
        pin: regPassword,
        phone: regPhone || '',
        role: 'seller',
        status: 'active',
        loginAttempts: 0,
        createdAt: now,
        updatedAt: now,
      }).catch((dexErr) => {
        console.warn('Dexie cache sync warning:', dexErr);
      });

      setRegSuccess(true);
      setRegError('');
      setTimeout(() => {
        setRegSuccess(false);
        resetForms();
        setView('login');
      }, 1400);
    } catch (e) {
      console.error('Register failed:', e);
      setRegError('فشل إنشاء الحساب، يرجى المحاولة لاحقاً');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipTrial = () => {
    startTrial();
    completeFirstRun();
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
    navigate('/', { replace: true });
  };

  // ===== Left Side Hero Showcase (Desktop & Large screens >= 1024px) =====
  const ShowcasePanel = () => (
    <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-7 xl:p-8 bg-gradient-to-br from-primary/15 via-primary/5 to-surface-container/60 border-l border-outline-variant/20 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-13 h-13 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-black text-2xl font-cairo shadow-lg shadow-primary/30 ring-4 ring-primary/10">
            AN
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-on-surface font-cairo tracking-tight">AN POS</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                V3.0 Pro
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-tajawal mt-0.5">منظومة إدارة المبيعات ونقاط البيع الذكية</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 font-tajawal">
          حل متكامل وسريع للمتاجر ونقاط البيع، صُمم ليعمل بثبات وموثوقية عالية مع دعم كامل للعمل بدون إنترنت.
        </p>

        {/* Feature Highlights */}
        <div className="space-y-3.5">
          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-lowest/50 border border-outline-variant/15 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface font-cairo">سرعة فائقة (Offline-First)</h4>
              <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">قاعدة بيانات محلية تعمل بكفاءة حتى عند انقطاع الشبكة.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-lowest/50 border border-outline-variant/15 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0 mt-0.5">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface font-cairo">طباعة حرارية وملصقات باركود</h4>
              <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">توافق فوري مع طابعات الفواتير وملصقات المنتجات.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-lowest/50 border border-outline-variant/15 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-info/10 text-info flex items-center justify-center shrink-0 mt-0.5">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface font-cairo">مزامنة الشبكة المحلية (LAN)</h4>
              <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">ربط الشاشات وأجهزة البائعين في المتجر لحظياً.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-xl bg-surface-container-lowest/50 border border-outline-variant/15 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-on-surface font-cairo">إدارة المخزون والصندوق</h4>
              <p className="text-[11px] text-on-surface-variant leading-tight mt-0.5">تقارير جرد ومبيعات دقيقة لحظة بلحظة.</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Pill */}
      <div className="relative z-10 pt-4 mt-4 border-t border-outline-variant/15 flex items-center justify-between text-xs text-on-surface-variant">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          النظام متصل
        </span>
        <span className="font-mono text-[11px] text-on-surface-variant/80">AN-POS V3.0</span>
      </div>
    </div>
  );

  // ===== Compact Mobile/Tablet Branding Header =====
  const MobileBranding = () => (
    <div className="lg:hidden flex flex-col items-center mb-4 sm:mb-5 text-center">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-black text-xl sm:text-2xl font-cairo shadow-md shadow-primary/20 mb-2">
        AN
      </div>
      <h1 className="text-lg sm:text-xl font-bold text-on-surface font-cairo leading-tight">AN POS</h1>
      <p className="text-xs text-on-surface-variant font-tajawal mt-0.5">نظام إدارة المبيعات ونقاط البيع الذكية</p>
    </div>
  );

  return (
    <div className="w-full max-w-sm sm:max-w-md lg:max-w-4xl xl:max-w-5xl transition-all duration-300">
      <div className="glass-card bg-surface-container/90 dark:bg-surface-container-low/90 backdrop-blur-xl border border-outline-variant/30 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0 lg:min-h-[540px]">
          {/* Showcase column for large screens */}
          <ShowcasePanel />

          {/* Form column (Login / Register / Success) */}
          <div className="lg:col-span-7 p-4 sm:p-6 md:p-8 flex flex-col justify-between">
            {/* Header / Brand for mobile */}
            <MobileBranding />

            {/* View: SUCCESS */}
            {(view === 'success' || regSuccess) && (
              <div className="my-auto py-6 sm:py-10 text-center animate-slide-down">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-success/30 ring-8 ring-success/5">
                  <Check className="w-8 h-8 sm:w-10 sm:h-10 text-success animate-bounce" />
                </div>
                <h2 className="font-cairo text-lg sm:text-2xl font-bold text-on-surface mb-2">تم بنجاح!</h2>
                <p className="text-xs sm:text-sm text-on-surface-variant font-tajawal">جاري تحويلك إلى لوحة التحكم...</p>
                <div className="mt-6 flex justify-center">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              </div>
            )}

            {/* View: REGISTER */}
            {view === 'register' && !regSuccess && (
              <div className="flex flex-col justify-center my-auto space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0 text-primary">
                      <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h2 className="font-cairo text-base sm:text-lg font-bold text-on-surface">إنشاء حساب جديد</h2>
                      <p className="text-[11px] sm:text-xs text-on-surface-variant font-tajawal">أنشئ حسابك وابدأ استخدام النظام</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetForms();
                      setView('login');
                    }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-container font-cairo font-semibold p-1.5 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    <span>تسجيل الدخول</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-2.5 sm:space-y-3">
                  {/* Name */}
                  <div className="relative">
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => {
                        setRegName(e.target.value);
                        setRegError('');
                      }}
                      placeholder="الاسم الكامل"
                      className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-3.5 text-xs sm:text-sm text-on-surface placeholder-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70" />
                  </div>

                  {/* Username */}
                  <div className="relative">
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => {
                        setRegUsername(e.target.value);
                        setRegError('');
                      }}
                      placeholder="اسم المستخدم"
                      className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-3.5 text-xs sm:text-sm text-on-surface placeholder-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70" />
                  </div>

                  {/* Phone */}
                  <div className="relative">
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="رقم الهاتف (اختياري)"
                      className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-3.5 text-xs sm:text-sm text-on-surface placeholder-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70" />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <input
                      type={regShowPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => {
                        setRegPassword(e.target.value);
                        setRegError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                      placeholder="كلمة المرور (8 أحرف على الأقل)"
                      className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-10 text-xs sm:text-sm text-on-surface placeholder-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70" />
                    <button
                      type="button"
                      onClick={() => setRegShowPassword(!regShowPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-1"
                      aria-label="تبديل إظهار كلمة المرور"
                    >
                      {regShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {regError && (
                  <div className="bg-error/10 border border-error/25 text-error text-xs p-2.5 rounded-xl flex items-center gap-2 animate-slide-down">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Submit Register */}
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full h-10 sm:h-11 bg-primary text-on-primary rounded-xl font-cairo font-bold text-xs sm:text-sm shadow-md shadow-primary/25 hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري إنشاء الحساب...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>إنشاء الحساب</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-on-surface-variant text-center font-tajawal leading-tight">
                  سيتم تسجيلك كبائع مع صلاحيات أولية. يمكن للمدير تعديل الصلاحيات لاحقاً.
                </p>
              </div>
            )}

            {/* View: LOGIN (Default) */}
            {view === 'login' && !regSuccess && (
              <div className="flex flex-col justify-center my-auto space-y-3.5 sm:space-y-4">
                {/* Title */}
                <div className="text-center sm:text-right">
                  <h2 className="font-cairo text-base sm:text-xl font-bold text-on-surface">تسجيل الدخول</h2>
                  <p className="text-xs text-on-surface-variant font-tajawal mt-0.5">أدخل بيانات الاعتماد للمتابعة إلى النظام</p>
                </div>

                {/* Form fields */}
                <div className="space-y-2.5 sm:space-y-3">
                  {/* Username Field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface font-cairo">اسم المستخدم</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        placeholder="أدخل اسم المستخدم"
                        className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-3.5 text-xs sm:text-sm text-on-surface placeholder-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        autoFocus
                      />
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70" />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-on-surface font-cairo">كلمة المرور / PIN</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        placeholder="••••••••"
                        className="w-full h-10 sm:h-11 bg-surface-container-lowest border border-outline-variant/30 dark:border-white/10 rounded-xl pr-10 pl-10 text-xs sm:text-sm text-on-surface placeholder-on-surface-variant/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      />
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/70" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer p-1"
                        aria-label="تبديل إظهار كلمة المرور"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-error/10 border border-error/25 text-error text-xs p-2.5 rounded-xl flex items-center gap-2 animate-slide-down">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="leading-tight">{error}</span>
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full h-10 sm:h-11 bg-primary text-on-primary rounded-xl font-cairo font-bold text-xs sm:text-sm shadow-md shadow-primary/25 hover:bg-primary-container active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحقق...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-outline-variant/20 dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-surface-container px-3 text-[11px] text-on-surface-variant font-tajawal">أو</span>
                  </div>
                </div>

                {/* Secondary Action Buttons (Register & Trial) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetForms();
                      setView('register');
                    }}
                    className="w-full h-9 sm:h-10 border border-outline-variant/30 dark:border-white/10 rounded-xl text-on-surface text-xs font-cairo font-semibold hover:bg-surface-container-high hover:border-outline-variant/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-primary" />
                    <span>إنشاء حساب جديد</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipTrial}
                    className="w-full h-9 sm:h-10 border border-dashed border-tertiary/40 bg-tertiary/5 rounded-xl text-tertiary text-xs font-cairo font-semibold hover:bg-tertiary/10 hover:border-tertiary/70 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-tertiary" />
                    <span>تجربة مجانية (7 أيام)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Footer Meta */}
            <div className="pt-3 mt-3 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-on-surface-variant font-tajawal">
              <span>AN POS V3.0</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {isElectronAvailable ? 'النظام متصل' : 'الوضع المحلي'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
