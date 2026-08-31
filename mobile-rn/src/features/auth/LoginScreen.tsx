import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Store,
  UserPlus,
  Mail,
  Phone,
  ShieldCheck,
  Wifi,
  Sparkles,
  CheckCircle2,
  Layers,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useI18n } from '@/store/i18nStore';
import { AppImages } from '@/assets';
import { db, ensureInit } from '@/lib/db';
import { getStoredMode } from '@/infrastructure/database/UnifiedDB';
import { session } from '@/lib/apiClient';
import { useTheme } from '@/theme';
import { radii, spacing, typography, shadows } from '@/theme/tokens';
import { LanguageQuickButton } from '@/components/ui';

type ViewMode = 'login' | 'register';

export const LoginScreen = ({ navigation }: any) => {
  const { login, loading } = useAuthStore();
  const { isDark, colors } = useTheme();
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Responsive breakpoints
  const isSmallPhone = width < 360;
  const isPhoneLandscape = width > height && height < 550 && width < 950;
  const isTablet = width >= 600;
  const isLargeTabletLandscape = width >= 900 && width > height;

  const [mode, setMode] = useState<'connected' | 'standalone'>('standalone');
  const [activeServerUrl, setActiveServerUrl] = useState<string | null>(null);
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

  useEffect(() => {
    const detectMode = async () => {
      try {
        const stored = await getStoredMode();
        const sUrl = await session.getServerUrl();
        setMode(stored);
        setActiveServerUrl(sUrl);
        if (sUrl) {
          useAuthStore.getState().setServerUrl(sUrl);
        }
        await ensureInit();
      } catch (e) {
        console.warn('Initial DB init error:', e);
      } finally {
        setModeChecked(true);
      }
    };
    detectMode();
  }, []);

  const handleLogin = async () => {
    setSubmitError(null);
    const cleanUsername = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUsername || !cleanPin) {
      setSubmitError(t('auth.enterUserAndPin'));
      return;
    }

    try {
      await ensureInit();
      const currentMode = await getStoredMode();
      const currentServerUrl = await session.getServerUrl();

      // 1. If Connected Mode: Try Server Authentication first
      if (currentMode === 'connected' && currentServerUrl) {
        const res = await login(cleanUsername, cleanPin);
        if (res.success) {
          navigation.replace('Home', { screen: 'Dashboard' });
          return;
        }
        if (res.error) {
          if (
            res.error === 'serverOffline' ||
            res.error.includes('Network') ||
            res.error.includes('Failed to fetch') ||
            res.error.includes('ECONNREFUSED') ||
            res.error.includes('timeout')
          ) {
            setSubmitError(t('auth.serverOffline'));
          } else if (
            res.error === 'loginFailed' ||
            res.error === 'فشل تسجيل الدخول' ||
            res.error.toLowerCase().includes('invalid') ||
            res.error.toLowerCase().includes('unauthorized') ||
            res.error.toLowerCase().includes('credential')
          ) {
            setSubmitError(t('auth.loginFailed'));
          } else {
            setSubmitError(res.error);
          }
          return;
        }
      }

      // 2. Local Database Authentication (Standalone Mode or Local Fallback)
      const results = await db.users.where('username').equals(cleanUsername).toArray().catch(() => []);
      let localUser = results[0] as any;

      // First run provision: if DB has no users at all, provision default admin
      if (!localUser) {
        const totalUsers = await db.users.count().catch(() => 0);
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

      if (localUser && (localUser.pin === cleanPin || (localUser.pin === '' && cleanPin === '1234'))) {
        useAuthStore.setState({ user: localUser, isAuthenticated: true, loading: false });
        navigation.replace('Home', { screen: 'Dashboard' });
        return;
      }

      setSubmitError(t('auth.invalidCredentials'));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  const handleRegister = async () => {
    setSubmitError(null);

    const cleanName = regName.trim();
    const cleanUsername = regUsername.trim();
    const cleanPin = regPin.trim();
    const cleanPinConfirm = regPinConfirm.trim();

    if (!cleanName || !cleanUsername || !cleanPin) {
      setSubmitError(t('auth.fillAllFields'));
      return;
    }
    if (cleanPin !== cleanPinConfirm) {
      setSubmitError(t('auth.pinMismatch'));
      return;
    }
    if (cleanPin.length < 4) {
      setSubmitError(t('auth.pinMismatch'));
      return;
    }

    try {
      await ensureInit();
      const existing = await db.users.where('username').equals(cleanUsername).toArray();
      if (existing.length > 0) {
        setSubmitError(t('auth.invalidCredentials'));
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
      Alert.alert(t('common.success'), `${t('auth.loginSuccess')} (${cleanName})`);
      navigation.replace('Home', { screen: 'Dashboard' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('common.error'));
    }
  };

  if (!modeChecked) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const inputBg = isDark ? '#131b2e' : '#f8fafc';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const cardBg = isDark ? '#0f172a' : '#ffffff';
  const SubmitArrow = isRTL ? ArrowLeft : ArrowRight;

  // Render Left Hero section (for tablet landscape)
  const renderTabletHero = () => (
    <View
      style={[
        styles.tabletHeroCol,
        {
          backgroundColor: isDark ? 'rgba(30, 58, 138, 0.25)' : 'rgba(239, 246, 255, 0.85)',
          borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(191, 219, 254, 0.6)',
        },
      ]}
    >
      <View style={styles.tabletHeroContent}>
        <View style={[styles.logoSquircle, { width: 92, height: 92, borderRadius: 26 }]}>
          <Image source={AppImages.logo} style={{ width: 74, height: 74 }} resizeMode="contain" />
        </View>

        <View style={styles.brandTitleWrap}>
          <Text style={[styles.appTitle, { color: colors.text.primary, fontSize: 28 }]}>
            AN POS
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.miniPill, { backgroundColor: colors.primary[500] + '20', borderColor: colors.primary[500] + '40' }]}>
              <Sparkles size={12} color={colors.primary[500]} />
              <Text style={[styles.miniPillText, { color: colors.primary[500] }]}>Enterprise Edition</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.appSubtitle, { color: colors.text.secondary, textAlign: 'center', fontSize: 13.5, lineHeight: 22, maxWidth: 300 }]}>
          {t('auth.loginSubtitle')} — منظومة إدارة المبيعات ونقاط البيع السريعة
        </Text>

        {/* Feature bullets */}
        <View style={styles.heroFeatureList}>
          <View style={[styles.heroFeatureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <CheckCircle2 size={16} color="#22c55e" />
            <Text style={[styles.heroFeatureText, { color: colors.text.secondary }]}>مزامنة فورية على الشبكة المحلية LAN</Text>
          </View>
          <View style={[styles.heroFeatureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <CheckCircle2 size={16} color="#22c55e" />
            <Text style={[styles.heroFeatureText, { color: colors.text.secondary }]}>إدارة ذكية للمخزون والباركود</Text>
          </View>
          <View style={[styles.heroFeatureItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <CheckCircle2 size={16} color="#22c55e" />
            <Text style={[styles.heroFeatureText, { color: colors.text.secondary }]}>طباعة الإيصالات والفواتير الرسمية</Text>
          </View>
        </View>

        {/* Server Status info */}
        {mode === 'connected' ? (
          <View
            style={[
              styles.connectedServerBadge,
              {
                backgroundColor: isDark ? 'rgba(30, 58, 138, 0.35)' : '#eff6ff',
                borderColor: isDark ? '#3b82f6' : '#bfdbfe',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                marginTop: 16,
              },
            ]}
          >
            <View style={styles.connectedGreenDot} />
            <Text style={[styles.connectedServerText, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
              {t('auth.connectedToPC')} {activeServerUrl ? `(${activeServerUrl.replace(/^https?:\/\//, '')})` : ''}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.pairPillBtn,
              {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
                borderColor: isDark ? '#1e3a8a' : '#bfdbfe',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                marginTop: 16,
              },
            ]}
          >
            <Store size={14} color={isDark ? '#60a5fa' : '#2563eb'} />
            <Text style={[styles.pairPillBtnText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
              {t('modeSelect.standaloneTitle')} (وضع غير متصل)
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  // Render Form Content
  const renderFormContent = () => (
    <View style={[styles.formWrapper, isLargeTabletLandscape && styles.tabletFormWrapper]}>
      {/* Top Bar inside card: Language button + Mode indicator */}
      <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Compact Mode Pill */}
        <TouchableOpacity
          style={[
            styles.modeHeaderTag,
            {
              backgroundColor: mode === 'connected'
                ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4')
                : (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff'),
              borderColor: mode === 'connected'
                ? (isDark ? '#15803d' : '#86efac')
                : (isDark ? '#1d4ed8' : '#bfdbfe'),
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => navigation.navigate('ModeSelect')}
          activeOpacity={0.8}
        >
          {mode === 'connected' ? (
            <View style={styles.connectedGreenDot} />
          ) : (
            <Store size={12} color={isDark ? '#60a5fa' : '#2563eb'} />
          )}
          <Text
            style={[
              styles.modeHeaderTagText,
              { color: mode === 'connected' ? (isDark ? '#4ade80' : '#15803d') : (isDark ? '#93c5fd' : '#1d4ed8') },
            ]}
          >
            {mode === 'connected' ? t('modeSelect.connectedTitle') : t('modeSelect.standaloneTitle')}
          </Text>
        </TouchableOpacity>

        {/* Language quick switcher */}
        <LanguageQuickButton />
      </View>

      {/* Brand Header for Phones and Tablet Portrait */}
      {!isLargeTabletLandscape && (
        <View style={[styles.brandingHeader, isPhoneLandscape && styles.brandingHeaderLandscape]}>
          <View
            style={[
              styles.logoSquircle,
              isSmallPhone && { width: 68, height: 68, borderRadius: 20 },
              isPhoneLandscape && { width: 54, height: 54, borderRadius: 16, marginBottom: 4 },
            ]}
          >
            <Image
              source={AppImages.logo}
              style={[
                styles.logoImg,
                isSmallPhone && { width: 52, height: 52 },
                isPhoneLandscape && { width: 42, height: 42 },
              ]}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appTitle, { color: colors.text.primary, fontSize: isSmallPhone ? 22 : 25 }]}>
            AN POS
          </Text>
          <Text style={[styles.appSubtitle, { color: colors.text.secondary, fontSize: isSmallPhone ? 12 : 13 }]}>
            {mode === 'connected'
              ? t('auth.connectedSubtitle')
              : view === 'login'
              ? t('auth.loginSubtitle')
              : t('auth.register')}
          </Text>
          {mode === 'connected' && (
            <TouchableOpacity
              style={[
                styles.connectedServerBadge,
                {
                  backgroundColor: isDark ? 'rgba(30, 58, 138, 0.35)' : '#eff6ff',
                  borderColor: isDark ? '#3b82f6' : '#bfdbfe',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => navigation.navigate('Pair', { initialTab: 'discover' })}
              activeOpacity={0.8}
            >
              <View style={styles.connectedGreenDot} />
              <Text style={[styles.connectedServerText, { color: isDark ? '#93c5fd' : '#1d4ed8' }]}>
                {t('auth.connectedToPC')} {activeServerUrl ? `(${activeServerUrl.replace(/^https?:\/\//, '')})` : ''} • {t('pair.changeDesktop')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Main View: Login or Register */}
      {view === 'login' ? (
        <View style={styles.formSection}>
          {/* Username Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.username')}
            </Text>
            <View
              style={[
                styles.inputFieldContainer,
                {
                  backgroundColor: inputBg,
                  borderColor: borderColor,
                  flexDirection: isRTL ? 'row' : 'row-reverse',
                  height: isSmallPhone ? 48 : isPhoneLandscape ? 46 : 52,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left', fontSize: isSmallPhone ? 13.5 : 14.5 },
                ]}
                placeholder={t('auth.usernamePlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel={t('auth.username')}
              />
              <User size={18} color={colors.text.tertiary} style={styles.fieldIcon} />
            </View>
          </View>

          {/* Password / PIN Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.pin')}
            </Text>
            <View
              style={[
                styles.inputFieldContainer,
                {
                  backgroundColor: inputBg,
                  borderColor: borderColor,
                  flexDirection: isRTL ? 'row' : 'row-reverse',
                  height: isSmallPhone ? 48 : isPhoneLandscape ? 46 : 52,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => setShowPin(!showPin)}
                style={styles.eyeToggleBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Toggle PIN visibility"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPin ? (
                  <EyeOff size={18} color={colors.text.tertiary} />
                ) : (
                  <Eye size={18} color={colors.text.tertiary} />
                )}
              </TouchableOpacity>

              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left', fontSize: isSmallPhone ? 13.5 : 14.5 },
                ]}
                placeholder="••••••••"
                placeholderTextColor={colors.text.tertiary}
                value={pin}
                onChangeText={setPin}
                secureTextEntry={!showPin}
                keyboardType="default"
                accessibilityLabel={t('auth.pin')}
              />
              <Lock size={18} color={colors.text.tertiary} style={styles.fieldIcon} />
            </View>
          </View>

          {/* Error Banner */}
          {submitError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.danger.light, borderColor: colors.danger.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <AlertCircle size={16} color={colors.danger.main} />
              <Text style={[styles.errorBannerText, { color: colors.danger.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {submitError}
              </Text>
            </View>
          ) : null}

          {/* Primary Submit Button */}
          <TouchableOpacity
            style={[
              styles.primarySubmitBtn,
              {
                flexDirection: isRTL ? 'row' : 'row-reverse',
                paddingVertical: isSmallPhone ? 13 : isPhoneLandscape ? 12 : 15,
              },
            ]}
            onPress={handleLogin}
            activeOpacity={0.88}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={t('auth.loginButton')}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <SubmitArrow size={18} color="#ffffff" />
                <Text style={[styles.primarySubmitBtnText, { fontSize: isSmallPhone ? 14.5 : 15.5 }]}>
                  {t('auth.loginButton')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Quick Pair / Action Links */}
          <TouchableOpacity
            style={[
              styles.quickPairActionBtn,
              {
                borderColor,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                paddingVertical: isSmallPhone ? 10 : 12,
              },
            ]}
            onPress={() => navigation.navigate('Pair', { initialTab: 'discover' })}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <Store size={15} color={isDark ? '#60a5fa' : '#2563eb'} />
            <Text style={[styles.quickPairActionText, { color: isDark ? '#60a5fa' : '#2563eb', fontSize: isSmallPhone ? 12 : 13 }]}>
              {mode === 'connected' ? t('pair.changeDesktop') : t('pair.discoverTab')}
            </Text>
          </TouchableOpacity>

          {/* Switch View Link (Register only in Standalone) */}
          {mode === 'standalone' && (
            <TouchableOpacity
              style={styles.switchViewBtn}
              onPress={() => {
                setView('register');
                setSubmitError(null);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.switchViewText, { color: colors.text.secondary, fontSize: isSmallPhone ? 12 : 13 }]}>
                {t('auth.noAccount')}{' '}
                <Text style={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: '700' }}>
                  {t('auth.createAccount')}
                </Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* Register View */
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.fullName')}
            </Text>
            <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse', height: isSmallPhone ? 48 : 52 }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left', fontSize: isSmallPhone ? 13.5 : 14.5 }]}
                placeholder={t('auth.fullNamePlaceholder')}
                placeholderTextColor={colors.text.tertiary}
                value={regName}
                onChangeText={setRegName}
              />
              <User size={18} color={colors.text.tertiary} style={styles.fieldIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.username')}
            </Text>
            <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse', height: isSmallPhone ? 48 : 52 }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left', fontSize: isSmallPhone ? 13.5 : 14.5 }]}
                placeholder="admin..."
                placeholderTextColor={colors.text.tertiary}
                value={regUsername}
                onChangeText={setRegUsername}
                autoCapitalize="none"
              />
              <UserPlus size={18} color={colors.text.tertiary} style={styles.fieldIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.email')} / {t('auth.phone')} ({t('common.optional')})
            </Text>
            <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse', height: isSmallPhone ? 48 : 52 }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left', fontSize: isSmallPhone ? 13.5 : 14.5 }]}
                placeholder="user@store.com"
                placeholderTextColor={colors.text.tertiary}
                value={regEmail}
                onChangeText={setRegEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Mail size={18} color={colors.text.tertiary} style={styles.fieldIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.pin')}
            </Text>
            <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse', height: isSmallPhone ? 48 : 52 }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left', fontSize: isSmallPhone ? 13.5 : 14.5 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.text.tertiary}
                value={regPin}
                onChangeText={setRegPin}
                secureTextEntry
              />
              <Lock size={18} color={colors.text.tertiary} style={styles.fieldIcon} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('auth.confirmPin')}
            </Text>
            <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse', height: isSmallPhone ? 48 : 52 }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left', fontSize: isSmallPhone ? 13.5 : 14.5 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.text.tertiary}
                value={regPinConfirm}
                onChangeText={setRegPinConfirm}
                secureTextEntry
              />
              <Lock size={18} color={colors.text.tertiary} style={styles.fieldIcon} />
            </View>
          </View>

          {submitError ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.danger.light, borderColor: colors.danger.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <AlertCircle size={16} color={colors.danger.main} />
              <Text style={[styles.errorBannerText, { color: colors.danger.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {submitError}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primarySubmitBtn, { flexDirection: isRTL ? 'row' : 'row-reverse', paddingVertical: isSmallPhone ? 13 : 15 }]}
            onPress={handleRegister}
            activeOpacity={0.88}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <SubmitArrow size={18} color="#ffffff" />
                <Text style={[styles.primarySubmitBtnText, { fontSize: isSmallPhone ? 14.5 : 15.5 }]}>
                  {t('auth.registerButton')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchViewBtn}
            onPress={() => {
              setView('login');
              setSubmitError(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.switchViewText, { color: colors.text.secondary, fontSize: isSmallPhone ? 12 : 13 }]}>
              {t('auth.haveAccount')}{' '}
              <Text style={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: '700' }}>
                {t('auth.loginButton')}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 8, 16),
            paddingBottom: Math.max(insets.bottom + 24, 32),
            paddingHorizontal: isTablet ? 32 : isSmallPhone ? 14 : 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main Card Container */}
        <View
          style={[
            styles.mainCard,
            {
              backgroundColor: isTablet ? cardBg : 'transparent',
              borderColor: isTablet ? borderColor : 'transparent',
              borderWidth: isTablet ? 1 : 0,
              maxWidth: isLargeTabletLandscape ? 940 : isTablet ? 520 : '100%',
              ...((isTablet && !isDark) ? shadows.lg : {}),
            },
          ]}
        >
          {isLargeTabletLandscape ? (
            <View style={[styles.tabletTwoColRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {renderTabletHero()}
              {renderFormContent()}
            </View>
          ) : (
            renderFormContent()
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Responsive Card
  mainCard: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
  },
  formWrapper: {
    width: '100%',
    paddingHorizontal: 4,
  },
  tabletFormWrapper: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
  },

  // Two column tablet landscape
  tabletTwoColRow: {
    width: '100%',
    minHeight: 520,
  },
  tabletHeroCol: {
    width: '44%',
    padding: 32,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletHeroContent: {
    alignItems: 'center',
    width: '100%',
  },
  brandTitleWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  miniPillText: {
    fontSize: 10.5,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },
  heroFeatureList: {
    marginTop: 20,
    gap: 10,
    width: '100%',
    paddingHorizontal: 12,
  },
  heroFeatureItem: {
    alignItems: 'center',
    gap: 8,
  },
  heroFeatureText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    fontWeight: '600',
  },

  // Card Top Row (Language switcher + Mode Tag)
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  modeHeaderTag: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  modeHeaderTagText: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },

  // Branding for mobile / portrait
  brandingHeader: {
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
  },
  brandingHeaderLandscape: {
    marginVertical: 4,
    gap: 4,
  },
  logoSquircle: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    ...shadows.md,
  },
  logoImg: {
    width: 66,
    height: 66,
  },
  appTitle: {
    fontSize: 25,
    fontWeight: '800',
    fontFamily: 'Cairo',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo',
    textAlign: 'center',
    maxWidth: 320,
  },
  connectedServerBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginTop: 4,
    borderWidth: 1,
    gap: 6,
  },
  connectedGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  connectedServerText: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
    fontWeight: '700',
  },

  // Form Section
  formSection: {
    gap: 14,
    marginTop: 8,
    width: '100%',
  },
  inputGroup: {
    gap: 5,
    alignItems: 'stretch',
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  inputFieldContainer: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Cairo',
    paddingHorizontal: 6,
  },
  fieldIcon: {
    marginHorizontal: 2,
  },
  eyeToggleBtn: {
    padding: 6,
  },

  // Error Banner
  errorBanner: {
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  errorBannerText: {
    fontSize: 12,
    fontFamily: 'Cairo',
    flex: 1,
    fontWeight: '600',
  },

  // Primary Action Button
  primarySubmitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
    ...shadows.md,
  },
  primarySubmitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },

  // Secondary Links
  quickPairActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 2,
  },
  quickPairActionText: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  pairPillBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    marginTop: 4,
    borderWidth: 1,
  },
  pairPillBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  switchViewBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  switchViewText: {
    fontSize: 12.5,
    fontFamily: 'Cairo',
  },
});

export default LoginScreen;
