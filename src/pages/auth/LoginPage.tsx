import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { completeFirstRun } from '@/app/guards/FirstRunGuard';
import { Lock, User, Eye, EyeOff, UserPlus, Phone, Shield, Check, Sparkles, LogIn, ArrowRight } from 'lucide-react';
import { db } from '@/infrastructure/database/dexie/db';
import { generateId } from '@/utils';
import { startTrial } from '@/services/trialService';

const API_BASE = 'http://localhost:3001/api';

type View = 'login' | 'register' | 'success';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');

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

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const resetForms = () => {
    setUsername(''); setPassword(''); setError('');
    setRegName(''); setRegUsername(''); setRegPhone(''); setRegPassword('');
    setRegError(''); setRegSuccess(false);
  };

  const handleLogin = async () => {
    if (!username.trim()) { setError('أدخل اسم المستخدم'); return; }
    if (!password) { setError('أدخل كلمة المرور'); return; }
    setError('');

    const hasElectronAPI = !!(window as any).electronAPI;
    console.log('login attempt:', username.trim(), '| hasElectronAPI:', hasElectronAPI);

    try {
      const result = await login(username.trim(), password);
      console.log('login result:', result);
      if (!result.success) {
        // رسائل تشخيصية أوضح
        if (result.error?.includes('Electron API')) {
          if (!hasElectronAPI) {
            setError('لم يتم تحميل Electron API. تأكد من تشغيل التطبيق عبر npm run dev وليس عبر المتصفح.');
          } else {
            setError(result.error);
          }
        } else {
          setError(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
        }
        return;
      }
      // نجح تسجيل الدخول — انتقل للداشبورد مباشرة (لا تعتمد على useEffect فقط)
      navigate('/', { replace: true });
    } catch (e) {
      console.error('login threw:', e);
      setError('حدث خطأ غير متوقع أثناء تسجيل الدخول');
    }
  };

  const handleRegister = async () => {
    if (!regName.trim()) { setRegError('أدخل الاسم الكامل'); return; }
    if (!regUsername.trim()) { setRegError('أدخل اسم المستخدم'); return; }
    if (!regPassword) { setRegError('أدخل كلمة المرور'); return; }
    if (regPassword.length < 8) { setRegError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    setRegError('');

    const exists = await db.users.where('username').equals(regUsername.trim()).first();
    if (exists) { setRegError('اسم المستخدم مستخدم بالفعل'); return; }

    const now = new Date().toISOString();
    const userId = generateId();

    await db.users.add({
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
    });

    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: regUsername.trim(),
        name: regName.trim(),
        pin: regPassword,
        phone: regPhone.trim(),
      }),
    }).then(async (res) => {
      if (!res.ok) {
        let detail = 'تعذر التسجيل على الخادم';
        try { const data = await res.json(); detail = data.detail || detail; } catch { /* ignore */ }
        throw new Error(detail);
      }
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'تعذر الاتصال بالخادم';
      // أبلغ المستخدم دون إيقاف الإ的成功 المحلي (تم إنشاء الحساب في Dexie)
      console.warn('Server register failed:', msg);
      setRegError(`تحذير: ${msg} — تم إنشاء الحساب محلياً فقط`);
      setTimeout(() => setRegError(''), 4000);
    });

    setRegSuccess(true);
    setRegError('');
    setTimeout(() => {
      setRegSuccess(false);
      resetForms();
      setView('login');
    }, 1500);
  };

  const handleSkipTrial = () => {
    startTrial();
    completeFirstRun();
    // Set auth state directly so guards allow entry immediately
    useAuthStore.setState({
      user: { id: 'trial-user', username: 'trial', name: 'مستخدم تجريبي', role: 'seller', status: 'active' },
      isAuthenticated: true,
    });
    navigate('/', { replace: true });
  };

  // ===== Branding =====
  const Branding = () => (
    <div className="flex flex-col items-center mb-6 sm:mb-8">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-primary/10">
        <span className="text-primary font-black text-xl sm:text-2xl font-cairo">AN</span>
      </div>
      <h1 className="text-xl sm:text-headline-lg font-bold text-on-surface font-cairo">AN POS</h1>
      <p className="text-xs sm:text-body-sm text-on-surface-variant mt-1">نظام إدارة المبيعات الذكية</p>
    </div>
  );

  // ===== Success =====
  if (view === 'success' || regSuccess) {
    return (
      <div className="w-full max-w-sm sm:max-w-md px-4">
        <Branding />
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-outline-variant/20 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-success/15 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-5 border border-success/20">
            <Check className="w-8 h-8 sm:w-10 sm:h-10 text-success" />
          </div>
          <h2 className="font-cairo text-lg sm:text-headline-md text-on-surface mb-2">تم بنجاح!</h2>
          <p className="text-sm sm:text-body-md text-on-surface-variant">جاري تحويلك إلى لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // ===== Register =====
  if (view === 'register') {
    return (
      <div className="w-full max-w-sm sm:max-w-md px-4">
        <Branding />
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-outline-variant/20 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

          <button
            onClick={() => { resetForms(); setView('login'); }}
            className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface mb-4 sm:mb-5 transition-colors text-xs sm:text-sm"
          >
            <ArrowRight className="w-4 h-4" /> تسجيل الدخول
          </button>

          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-cairo text-base sm:text-headline-sm text-on-surface font-bold">إنشاء حساب جديد</h2>
              <p className="text-xs sm:text-body-sm text-on-surface-variant">أنشئ حسابك وابدأ استخدام النظام</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="relative">
              <input type="text" value={regName} onChange={(e) => { setRegName(e.target.value); setRegError(''); }} placeholder="الاسم الكامل"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pr-11 sm:pr-12 pl-4 py-3 sm:py-3.5 text-sm sm:text-body-md placeholder-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              <User className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-on-surface-variant" />
            </div>
            <div className="relative">
              <input type="text" value={regUsername} onChange={(e) => { setRegUsername(e.target.value); setRegError(''); }} placeholder="اسم المستخدم"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pr-11 sm:pr-12 pl-4 py-3 sm:py-3.5 text-sm sm:text-body-md placeholder-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              <Shield className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-on-surface-variant" />
            </div>
            <div className="relative">
              <input type="tel" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pr-11 sm:pr-12 pl-4 py-3 sm:py-3.5 text-sm sm:text-body-md placeholder-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              <Phone className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-on-surface-variant" />
            </div>
            <div className="relative">
              <input type={regShowPassword ? 'text' : 'password'} value={regPassword} onChange={(e) => { setRegPassword(e.target.value); setRegError(''); }} placeholder="كلمة المرور (8 أحرف على الأقل)"
                className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pr-11 sm:pr-12 pl-11 sm:pl-12 py-3 sm:py-3.5 text-sm sm:text-body-md placeholder-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              <Lock className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-on-surface-variant" />
              <button type="button" onClick={() => setRegShowPassword(!regShowPassword)} className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                {regShowPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>

            {regError && (
              <div className="bg-error/10 border border-error/20 text-error text-xs sm:text-body-sm text-center py-2.5 sm:py-3 rounded-xl">{regError}</div>
            )}

            <button onClick={handleRegister} className="w-full py-3 sm:py-3.5 bg-primary text-on-primary rounded-xl font-cairo font-bold text-sm sm:text-headline-sm shadow-lg shadow-primary/20 hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              إنشاء الحساب
            </button>

            <p className="text-xs text-on-surface-variant text-center">
              سيتم تسجيلك كبائع. يمكن للمدير تعديل الصلاحيات لاحقاً.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== Login (Default) =====
  return (
    <div className="w-full max-w-sm sm:max-w-md px-4">
      <Branding />

      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-outline-variant/20 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

        {/* Lock Icon */}
        <div className="flex justify-center mb-4 sm:mb-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-5 sm:mb-6">
          <h2 className="font-cairo text-lg sm:text-headline-md font-bold text-on-surface mb-1">تسجيل الدخول</h2>
          <p className="text-xs sm:text-body-sm text-on-surface-variant">أدخل بيانات الاعتماد للوصول للنظام</p>
        </div>

        {/* Form */}
        <div className="space-y-3 sm:space-y-4">
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="اسم المستخدم"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pr-11 sm:pr-12 pl-4 py-3 sm:py-3.5 text-sm sm:text-body-md placeholder-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
            />
            <User className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-on-surface-variant" />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="كلمة المرور"
              className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl pr-11 sm:pr-12 pl-11 sm:pl-12 py-3 sm:py-3.5 text-sm sm:text-body-md placeholder-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <Lock className="absolute right-3.5 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-on-surface-variant" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/20 text-error text-xs sm:text-body-sm text-center py-2.5 sm:py-3 rounded-xl">{error}</div>
          )}

          <button onClick={handleLogin} className="w-full py-3 sm:py-3.5 bg-primary text-on-primary rounded-xl font-cairo font-bold text-sm sm:text-headline-sm shadow-lg shadow-primary/20 hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
            تسجيل الدخول
          </button>
        </div>

        {/* Divider */}
        <div className="relative py-3 sm:py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/15" /></div>
          <div className="relative flex justify-center"><span className="bg-surface-container px-3 text-xs text-on-surface-variant">أو</span></div>
        </div>

        {/* Other Options */}
        <div className="space-y-2.5 sm:space-y-3">
          <button
            onClick={() => { resetForms(); setView('register'); }}
            className="w-full py-3 sm:py-3.5 border border-outline-variant/20 rounded-xl text-on-surface text-xs sm:text-label-md hover:bg-surface-container-high hover:border-outline-variant/40 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span>إنشاء حساب جديد</span>
          </button>

          <button
            onClick={handleSkipTrial}
            className="w-full py-3 sm:py-3.5 border border-dashed border-tertiary/25 rounded-xl text-tertiary text-xs sm:text-label-md hover:bg-tertiary/5 hover:border-tertiary/50 transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>تجربة مجانية — 7 أيام</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 sm:mt-5 px-1">
        <p className="text-xs text-on-surface-variant">AN POS V3.0</p>
        <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-success rounded-full" />
          الخادم متصل
        </p>
      </div>
    </div>
  );
}
