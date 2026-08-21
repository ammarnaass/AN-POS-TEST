import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LogIn, User, Lock, Eye, EyeOff, AlertCircle, Database, Camera, Keyboard, UserPlus, Mail, Phone, Wifi } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { session, electronAPI } from '@/lib/apiClient';
import { db, ensureInit } from '@/lib/db';
import { getStoredMode } from '@/infrastructure/database/UnifiedDB';

type ViewMode = 'login' | 'register';

const LoginScreen = ({ navigation }: any) => {
  const { login, loading, serverUrl, setServerUrl } = useAuthStore();
  const [mode, setMode] = useState<'connected' | 'standalone'>('connected');
  const [modeChecked, setModeChecked] = useState(false);
  const [view, setView] = useState<ViewMode>('login');
  const [showPin, setShowPin] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Login fields
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');

  // Pair fields
  const [pairLoading, setPairLoading] = useState(false);
  const [pairError, setPairError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('4321');
  const [manualKey, setManualKey] = useState('');

  useEffect(() => {
    const detectMode = async () => {
      const stored = await getStoredMode();
      setMode(stored);
      setModeChecked(true);
    };
    detectMode();
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setSubmitError(null);

    if (mode === 'standalone') {
      try {
        await ensureInit();
        const results = await db.users.where('username').equals(username).toArray();
        const user = results[0] as any;
        if (!user || user.pin !== pin) {
          setSubmitError('اسم المستخدم أو PIN غير صحيح');
          return;
        }
        await setServerUrl('');
        navigation.replace('Home', { screen: 'Dashboard' });
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'خطأ في تسجيل الدخول');
      }
      return;
    }

    const res = await login(username, pin);
    if (res.success) {
      navigation.replace('Home', { screen: 'Dashboard' });
    } else {
      setSubmitError(res.error ?? 'فشل تسجيل الدخول');
    }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setSubmitError(null);

    if (!regName.trim() || !regUsername.trim() || !regPin.trim()) {
      setSubmitError('الاسم واسم المستخدم والPIN مطلوبون');
      return;
    }
    if (regPin !== regPinConfirm) {
      setSubmitError('PIN وتأكيد PIN غير متطابقان');
      return;
    }
    if (regPin.length < 4) {
      setSubmitError('PIN يجب أن يكون 4 أرقام على الأقل');
      return;
    }

    try {
      await ensureInit();
      if (mode === 'standalone') {
        const existing = await db.users.where('username').equals(regUsername).toArray();
        if (existing.length > 0) {
          setSubmitError('اسم المستخدم مستخدم بالفعل');
          return;
        }
        await db.users.add({
          id: `usr-${Date.now()}`,
          username: regUsername,
          name: regName,
          pin: regPin,
          email: regEmail,
          phone: regPhone,
          role: 'seller',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        navigation.replace('Home', { screen: 'Dashboard' });
      } else {
        setView('login');
        Alert.alert('تم إنشاء الحساب. سجّل الدخول الآن.');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'خطأ في التسجيل');
    }
  };

  const connectToServer = async (serverUrl: string, key: string) => {
    try {
      setPairLoading(true);
      setPairError('');
      await session.save(serverUrl, key);
      await setServerUrl(serverUrl);
      const res = await electronAPI.pair.pair({ deviceName: 'AN POS Mobile', connectionKey: key });
      if ('error' in res && res.error) throw new Error(res.error.detail);
      if (res.success && res.sessionToken && res.deviceId) {
        await session.savePairing(res.sessionToken, res.deviceId);
        navigation.replace('Login');
      } else {
        throw new Error('استجابة الاقتران غير مكتملة');
      }
    } catch (e) {
      setPairError(e instanceof Error ? e.message : 'فشل الاتصال');
      await session.clear();
    } finally {
      setPairLoading(false);
    }
  };

  const handleManualConnect = async () => {
    if (!manualIp.trim() || !manualKey.trim()) {
      setPairError('أدخل عنوان IP ومفتاح الاتصال');
      return;
    }
    const serverUrl = `http://${manualIp.trim()}:${manualPort.trim() || '4321'}`;
    await connectToServer(serverUrl, manualKey.trim());
  };

  const handleStandalone = async () => {
    setPairLoading(true);
    setPairError('');
    try {
      const { db: unifiedDB } = await import('@/infrastructure/database/UnifiedDB');
      await unifiedDB.switchToStandalone();
      navigation.replace('Login');
    } catch (e) {
      setPairError(e instanceof Error ? e.message : 'فشل تهيئة قاعدة البيانات');
    } finally {
      setPairLoading(false);
    }
  };

  if (!modeChecked) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const isConnected = !!serverUrl;
  const statusText = mode === 'connected' ? (isConnected ? `متصل بـ ${serverUrl}` : 'غير متصل — اربط مع الحاسوب أدناه') : 'الوضع المستقل — بيانات محلية';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={styles.branding}>
        <View style={styles.logo}>
          <Text style={styles.logoTxt}>AN</Text>
        </View>
        <Text style={styles.title}>AN POS</Text>
        <Text style={styles.subtitle}>{statusText}</Text>
      </View>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'login' && styles.toggleActive]}
          onPress={() => { setView('login'); setSubmitError(null); setPairError(''); }}
        >
          <LogIn size={18} color={view === 'login' ? '#fff' : '#94a3b8'} />
          <Text style={[styles.toggleText, view === 'login' && styles.toggleTextActive]}>تسجيل الدخول</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'register' && styles.toggleActive]}
          onPress={() => { setView('register'); setSubmitError(null); setPairError(''); }}
        >
          <UserPlus size={18} color={view === 'register' ? '#fff' : '#94a3b8'} />
          <Text style={[styles.toggleText, view === 'register' && styles.toggleTextActive]}>حساب جديد</Text>
        </TouchableOpacity>
      </View>

      {/* Pair buttons */}
      <View style={{ gap: 8 }}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Pair')}
          disabled={pairLoading}
        >
          <Camera size={20} color="#fff" />
          <Text style={styles.btnText}>امسح رمز QR للاتصال مع الحاسوب</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => { setManualIp(''); setManualKey(''); setPairError(''); navigation.navigate('Pair'); }}
          disabled={pairLoading}
        >
          <Keyboard size={18} color="#94a3b8" />
          <Text style={styles.ghostBtnText}>إدخال يدوي للعنوان والمفتاح</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={handleStandalone}
          disabled={pairLoading}
        >
          <Database size={18} color="#94a3b8" />
          <Text style={styles.ghostBtnText}>العمل بدون حاسوب (وضع مستقل)</Text>
        </TouchableOpacity>

        {pairError ? (
          <View style={styles.errorBox}>
            <AlertCircle size={14} color="#ef4444" />
            <Text style={styles.errorText}>{pairError}</Text>
          </View>
        ) : null}
      </View>

      {/* Login form */}
      {view === 'login' && (
        <View style={{ gap: 12 }}>
          <View>
            <Text style={styles.label}>اسم المستخدم أو البريد</Text>
            <View style={styles.inputContainer}>
              <User size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="example@shop.com أو admin"
                value={username}
                onChangeText={setUsername}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>الرمز السري (PIN)</Text>
            <View style={styles.inputContainer}>
              <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingLeft: 44 }]}
                placeholder="••••"
                value={pin}
                onChangeText={setPin}
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPin}
              />
              <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.showPinBtn}>
                {showPin ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
              </TouchableOpacity>
            </View>
          </View>

          {submitError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color="#ef4444" />
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.actionBtn, (!username || !pin || loading) && styles.actionBtnDisabled]}
            onPress={handleLogin}
            disabled={!username || !pin || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>دخول</Text>}
          </TouchableOpacity>
        </View>
      )}

      {view === 'register' && (
        <View style={{ gap: 12 }}>
          <InputField label="الاسم الكامل" value={regName} onChangeText={setRegName} placeholder="محمد أحمد" />
          <InputField label="اسم المستخدم" value={regUsername} onChangeText={setRegUsername} placeholder="mohammed" />

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <InputField label="البريد الإلكتروني" value={regEmail} onChangeText={setRegEmail} placeholder="email@shop.com" keyboardType="email-address" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="الهاتف" value={regPhone} onChangeText={setRegPhone} placeholder="0555123456" keyboardType="phone-pad" />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <InputField label="الرمز السري (PIN)" value={regPin} onChangeText={setRegPin} placeholder="****" secureTextEntry secureTextEntryVal={!showPin} />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="تأكيد PIN" value={regPinConfirm} onChangeText={setRegPinConfirm} placeholder="****" secureTextEntryVal={!showPin} />
            </View>
          </View>

          {submitError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={14} color="#ef4444" />
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnTertiary, (!regName || !regUsername || !regPin || loading) && styles.actionBtnDisabled]}
            onPress={handleRegister}
            disabled={!regName || !regUsername || !regPin || loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>إنشاء الحساب</Text>}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.versionText}>v2.0.0 (React Native)</Text>
    </ScrollView>
  );
};

const InputField = ({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, secureTextEntryVal = true }: any) => (
  <View>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#94a3b8"
      autoCapitalize="none"
      keyboardType={keyboardType || "default"}
      secureTextEntry={secureTextEntry !== undefined ? secureTextEntry : secureTextEntryVal}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { alignItems: 'center', justifyContent: 'center' },
  branding: { alignItems: 'center', gap: 8 },
  logo: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center'
  },
  logoTxt: { fontSize: 24, fontWeight: '800', color: '#3b82f6', fontFamily: 'Cairo' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', fontFamily: 'Cairo' },
  subtitle: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  toggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 2 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  toggleActive: { backgroundColor: '#3b82f6' },
  toggleText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', borderRadius: 16, paddingVertical: 14 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', fontFamily: 'Cairo' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', fontFamily: 'Cairo' },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  ghostBtnText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  actionBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6', borderRadius: 16, paddingVertical: 14 },
  actionBtnTertiary: { backgroundColor: '#d946ef' },
  actionBtnDisabled: { opacity: 0.5 },
  label: { fontSize: 11, color: '#94a3b8', marginBottom: 4, fontFamily: 'Cairo' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#0f172a', paddingLeft: 36, fontFamily: 'Cairo' },
  inputIcon: { position: 'absolute', right: 12, zIndex: 1 },
  showPinBtn: { position: 'absolute', left: 12, zIndex: 1, padding: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 10, borderRadius: 12 },
  errorText: { color: '#ef4444', fontSize: 12, flex: 1 },
  versionText: { fontSize: 10, color: '#cbd5e1', textAlign: 'center', marginTop: 20 },
});

export default LoginScreen;
