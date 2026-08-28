import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  QrCode,
  RefreshCw,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { session, electronAPI } from '@/lib/apiClient';
import { AppImages } from '@/assets';
import { db, ensureInit } from '@/lib/db';
import { getStoredMode } from '@/infrastructure/database/UnifiedDB';
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { Card, Badge, Button, Input } from '@/components/ui';

type ViewMode = 'login' | 'register';

export const LoginScreen = ({ navigation }: any) => {
  const { login, loading, serverUrl, setServerUrl } = useAuthStore();
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [mode, setMode] = useState<'connected' | 'standalone'>('connected');
  const [modeChecked, setModeChecked] = useState(false);
  const [view, setView] = useState<ViewMode>('login');
  const [showPin, setShowPin] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Login fields (clean initial states)
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');

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
      let localUser = results[0] as any;

      // First run provision: if DB has no users at all, provision default admin
      if (!localUser) {
        const totalUsers = await db.users.count();
        if (totalUsers === 0 && cleanUsername.toLowerCase() === 'admin' && cleanPin === '1234') {
          localUser = {
            id: 'usr_admin',
            username: 'admin',
            name: 'المدير العام',
            pin: '1234',
            role: 'admin',
            status: 'active',
            permissions: JSON.stringify(['*']),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          try {
            await db.users.put(localUser);
          } catch {}
        }
      }

      if (localUser && localUser.pin === cleanPin) {
        useAuthStore.setState({ user: localUser, isAuthenticated: true, loading: false });
        navigation.replace('Home', { screen: 'Dashboard' });
        return;
      }

      // 2. If connected mode & server is available, try server login with 5s timeout
      if (mode === 'connected' && serverUrl) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('مهلة الاتصال بالخادم انتهت (تأكد من تشغيل برنامج سطح المكتب)')), 5000)
        );

        const res: any = await Promise.race([
          login(cleanUsername, cleanPin),
          timeoutPromise,
        ]);

        if (res?.success) {
          navigation.replace('Home', { screen: 'Dashboard' });
          return;
        } else if (res?.error) {
          setSubmitError(res.error);
          return;
        }
      }

      setSubmitError('اسم المستخدم أو الرمز السري (PIN) غير صحيح');
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

      {/* Connection & Network Status Card */}
      <View style={[styles.connectionCard, { backgroundColor: colors.surface, borderColor: colors.border.default }]}>
        <View style={styles.connectionInfoRow}>
          <View
            style={[
              styles.connectionIconBox,
              { backgroundColor: mode === 'connected' && isConnected ? (isDark ? '#064e3b' : colors.emerald[50]) : (isDark ? '#1e293b' : colors.slate[100]) },
            ]}
          >
            {mode === 'connected' && isConnected ? (
              <Wifi size={20} color={isDark ? '#34d399' : colors.emerald[600]} />
            ) : (
              <Database size={20} color={isDark ? '#94a3b8' : colors.slate[600]} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.connectionCardTitle, { color: colors.text.primary }]}>
              {mode === 'connected' && isConnected
                ? 'متصل ببرنامج سطح المكتب'
                : 'الوضع المحلي المستقل (SQLite)'}
            </Text>
            <Text style={[styles.connectionCardSub, { color: colors.text.tertiary }]}>
              {mode === 'connected' && isConnected
                ? `الخادم: ${serverUrl}`
                : 'البيانات والمصادقة محفوظة محلياً على هذا الجهاز'}
            </Text>
          </View>
        </View>

        <Button
          title={mode === 'connected' ? 'تغيير الخادم / مسح QR جديد' : 'ربط الهاتف مع برنامج الحاسوب (مسح QR)'}
          variant="outline"
          size="sm"
          icon={<QrCode size={16} color={colors.primary[600]} />}
          onPress={() => navigation.navigate('Pair')}
          fullWidth
          disabled={loading}
          style={{ marginTop: spacing.sm }}
        />
      </View>

      {/* Footer Branding */}
      <View style={styles.footer}>
        <View style={styles.securityRow}>
          <ShieldCheck size={14} color={colors.slate[400]} />
          <Text style={[styles.securityText, { color: colors.text.tertiary }]}>قاعدة بيانات محلية مشفرة وسريعة</Text>
        </View>
        <Text style={[styles.versionText, { color: colors.text.tertiary }]}>الإصدار 2.0.0 (AN POS Engine)</Text>
      </View>
    </ScrollView>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
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
      backgroundColor: isDark ? colors.surfaceSubtle : colors.slate[100],
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
      color: colors.text.secondary,
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

    // Connection Card
    connectionCard: {
      borderRadius: radii.xl,
      borderWidth: 1,
      padding: spacing.md,
    },
    connectionInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    connectionIconBox: {
      width: 40,
      height: 40,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    connectionCardTitle: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Cairo',
      textAlign: 'right',
    },
    connectionCardSub: {
      fontSize: 11,
      fontFamily: 'Cairo',
      textAlign: 'right',
      marginTop: 2,
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
      fontFamily: 'Cairo',
    },
    versionText: {
      fontSize: 11,
      fontFamily: 'Cairo',
    },
  });

export default LoginScreen;
