import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  LogIn,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Database,
  Camera,
  Keyboard,
  UserPlus,
  Mail,
  Phone,
  Wifi,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { session, electronAPI } from '@/lib/apiClient';
import { AppImages } from '@/assets';
import { db, ensureInit } from '@/lib/db';
import { getStoredMode } from '@/infrastructure/database/UnifiedDB';
import { colors, radii, spacing, typography, shadows } from '@/theme';
import { Card, Badge, Button, Input } from '@/components/ui';

type ViewMode = 'login' | 'register';

export const LoginScreen = ({ navigation }: any) => {
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

  useEffect(() => {
    const detectMode = async () => {
      const stored = await getStoredMode();
      setMode(stored);
      setModeChecked(true);
      try {
        await ensureInit();
      } catch (e) {
        console.warn('Initial DB init error:', e);
      }
    };
    detectMode();
  }, []);

  const handleLogin = async () => {
    setSubmitError(null);
    const cleanUsername = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUsername || !cleanPin) {
      setSubmitError('يرجى إدخال اسم المستخدم ورمز PIN');
      return;
    }

    try {
      await ensureInit();

      // 1. Check local SQLite DB first
      const results = await db.users.where('username').equals(cleanUsername).toArray();
      const localUser = results[0] as any;
      if (localUser && localUser.pin === cleanPin) {
        useAuthStore.setState({ user: localUser, isAuthenticated: true, loading: false });
        navigation.replace('Home', { screen: 'Dashboard' });
        return;
      }

      // 2. If connected mode & server is available, try server login
      if (mode === 'connected' && serverUrl) {
        const res = await login(cleanUsername, cleanPin);
        if (res.success) {
          navigation.replace('Home', { screen: 'Dashboard' });
          return;
        } else {
          setSubmitError(res.error ?? 'فشل تسجيل الدخول من الخادم');
          return;
        }
      }

      setSubmitError('اسم المستخدم أو رمز PIN غير صحيح (الافتراضي: admin / 1234)');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'خطأ أثناء تسجيل الدخول');
    }
  };

  const handleRegister = async () => {
    setSubmitError(null);

    const cleanName = regName.trim();
    const cleanUsername = regUsername.trim();
    const cleanPin = regPin.trim();
    const cleanPinConfirm = regPinConfirm.trim();

    if (!cleanName || !cleanUsername || !cleanPin) {
      setSubmitError('الاسم الكامل واسم المستخدم ورمز PIN مطلوبة');
      return;
    }
    if (cleanPin !== cleanPinConfirm) {
      setSubmitError('رمز PIN وتأكيد الرمز غير متطابقين');
      return;
    }
    if (cleanPin.length < 4) {
      setSubmitError('رمز PIN يجب أن يتكون من 4 أرقام على الأقل');
      return;
    }

    try {
      await ensureInit();
      const existing = await db.users.where('username').equals(cleanUsername).toArray();
      if (existing.length > 0) {
        setSubmitError('اسم المستخدم مسجل بالفعل، يرجى اختيار اسم آخر');
        return;
      }

      const newUser: any = {
        id: `usr-${Date.now()}`,
        username: cleanUsername,
        name: cleanName,
        pin: cleanPin,
        email: regEmail.trim(),
        phone: regPhone.trim(),
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.users.add(newUser);
      useAuthStore.setState({ user: newUser as any, isAuthenticated: true, loading: false });
      Alert.alert('تم بنجاح', `تم إنشاء الحساب بنجاح، مرحباً بك ${cleanName}!`);
      navigation.replace('Home', { screen: 'Dashboard' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'خطأ أثناء إنشاء الحساب');
    }
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
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  const isConnected = !!serverUrl;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Branding Hero */}
      <View style={styles.branding}>
        <Image
          source={AppImages.logo}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <Text style={styles.appTitle}>AN POS Mobile</Text>
        <Text style={styles.appTagline}>منظومة نقاط البيع وإدارة المخازن</Text>

        <Badge
          variant={mode === 'connected' ? (isConnected ? 'success' : 'warning') : 'neutral'}
          size="sm"
          style={styles.statusBadge}
        >
          {mode === 'connected'
            ? isConnected
              ? `متصل: ${serverUrl}`
              : 'غير متصل — بحاجة للاقتران بالحاسوب'
            : 'الوضع المستقل — قاعدة بيانات محلية (SQLite)'}
        </Badge>
      </View>

      {/* Mode Segment Selector */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, view === 'login' && styles.segmentActive]}
          onPress={() => {
            setView('login');
            setSubmitError(null);
            setPairError('');
          }}
          activeOpacity={0.8}
        >
          <LogIn
            size={16}
            color={view === 'login' ? colors.primary[700] : colors.slate[500]}
          />
          <Text
            style={[
              styles.segmentText,
              view === 'login' && styles.segmentTextActive,
            ]}
          >
            تسجيل الدخول
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, view === 'register' && styles.segmentActive]}
          onPress={() => {
            setView('register');
            setSubmitError(null);
            setPairError('');
          }}
          activeOpacity={0.8}
        >
          <UserPlus
            size={16}
            color={view === 'register' ? colors.primary[700] : colors.slate[500]}
          />
          <Text
            style={[
              styles.segmentText,
              view === 'register' && styles.segmentTextActive,
            ]}
          >
            إنشاء حساب
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Form Card */}
      <Card variant="elevated" style={styles.formCard}>
        {view === 'login' ? (
          <View style={styles.formContent}>
            <Input
              label="اسم المستخدم"
              placeholder="admin أو اسم المستخدم"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              rightIcon={<User size={18} color={colors.slate[400]} />}
            />

            <View style={{ width: '100%' }}>
              <Text style={styles.inputLabel}>الرمز السري (PIN)</Text>
              <View style={styles.pinContainer}>
                <Lock
                  size={18}
                  color={colors.slate[400]}
                  style={{ marginLeft: spacing.sm }}
                />
                <TextInput
                  style={styles.pinInput}
                  placeholder="••••"
                  value={pin}
                  onChangeText={setPin}
                  placeholderTextColor={colors.slate[400]}
                  secureTextEntry={!showPin}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <TouchableOpacity
                  onPress={() => setShowPin(!showPin)}
                  style={styles.eyeBtn}
                >
                  {showPin ? (
                    <EyeOff size={18} color={colors.slate[500]} />
                  ) : (
                    <Eye size={18} color={colors.slate[500]} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {submitError ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={15} color={colors.danger.main} />
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            ) : null}

            <Button
              title="دخول إلى نقطة البيع"
              onPress={handleLogin}
              loading={loading}
              disabled={!username || !pin || loading}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.xs }}
            />
          </View>
        ) : (
          <View style={styles.formContent}>
            <Input
              label="الاسم الكامل"
              placeholder="مثال: محمد أحمد"
              value={regName}
              onChangeText={setRegName}
            />

            <Input
              label="اسم المستخدم"
              placeholder="mohammed"
              value={regUsername}
              onChangeText={setRegUsername}
              autoCapitalize="none"
            />

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="البريد الإلكتروني"
                  placeholder="email@shop.com"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="الهاتف"
                  placeholder="0555000000"
                  value={regPhone}
                  onChangeText={setRegPhone}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="الرمز السري (PIN)"
                  placeholder="••••"
                  value={regPin}
                  onChangeText={setRegPin}
                  secureTextEntry
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="تأكيد PIN"
                  placeholder="••••"
                  value={regPinConfirm}
                  onChangeText={setRegPinConfirm}
                  secureTextEntry
                  keyboardType="numeric"
                />
              </View>
            </View>

            {submitError ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={15} color={colors.danger.main} />
                <Text style={styles.errorText}>{submitError}</Text>
              </View>
            ) : null}

            <Button
              title="إنشاء الحساب وبدء الاستخدام"
              onPress={handleRegister}
              loading={loading}
              disabled={!regName || !regUsername || !regPin || loading}
              fullWidth
              size="lg"
              style={{ marginTop: spacing.xs }}
            />
          </View>
        )}
      </Card>

      {/* Quick Connection Actions */}
      <View style={styles.quickPairSection}>
        <Button
          title="مسح QR للاتصال مع برنامج الحاسوب"
          variant="outline"
          icon={<Camera size={18} color={colors.primary[600]} />}
          onPress={() => navigation.navigate('Pair')}
          fullWidth
          disabled={pairLoading}
        />

        <Button
          title="العمل بدون حاسوب (الوضع المستقل المحلي)"
          variant="secondary"
          icon={<Database size={17} color={colors.slate[600]} />}
          onPress={handleStandalone}
          fullWidth
          loading={pairLoading}
        />

        {pairError ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={15} color={colors.danger.main} />
            <Text style={styles.errorText}>{pairError}</Text>
          </View>
        ) : null}
      </View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <View style={styles.securityRow}>
          <ShieldCheck size={14} color={colors.slate[400]} />
          <Text style={styles.securityText}>قاعدة بيانات محلية مشفرة وسريعة</Text>
        </View>
        <Text style={styles.versionText}>الإصدار 2.0.0 (React Native Engine)</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  branding: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  logoImg: {
    width: 72,
    height: 72,
    marginBottom: spacing.xs,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    fontFamily: 'Cairo',
  },
  appTagline: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  statusBadge: {
    marginTop: spacing.xs,
  },

  // Segment Toggle
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    borderRadius: radii.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[500],
    fontFamily: 'Cairo',
  },
  segmentTextActive: {
    color: colors.primary[700],
    fontWeight: '700',
  },

  // Form Card
  formCard: {
    padding: spacing.lg,
  },
  formContent: {
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[700],
    fontFamily: 'Cairo',
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  pinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  pinInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    fontFamily: 'Cairo',
    paddingHorizontal: spacing.sm,
  },
  eyeBtn: {
    padding: 6,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger.light,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.danger.border,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger.text,
    fontFamily: 'Cairo',
    flex: 1,
    textAlign: 'right',
  },

  // Quick Pair Section
  quickPairSection: {
    gap: spacing.sm,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  securityText: {
    fontSize: 11,
    color: colors.slate[500],
    fontFamily: 'Cairo',
  },
  versionText: {
    fontSize: 11,
    color: colors.slate[400],
    fontFamily: 'Cairo',
  },
});

export default LoginScreen;
