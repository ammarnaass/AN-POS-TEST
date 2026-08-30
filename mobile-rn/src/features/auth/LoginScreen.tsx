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
} from 'react-native';
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
          setSubmitError(res.error);
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

  const inputBg = isDark ? '#131b2e' : '#f1f5f9';
  const borderColor = isDark ? '#1e293b' : '#e2e8f0';
  const SubmitArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Language Quick Switch Row */}
        <View style={[styles.langRow, { justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
          <LanguageQuickButton />
        </View>

        {/* Brand / Logo Top Area */}
        <View style={styles.brandingHeader}>
          <View style={styles.logoSquircle}>
            <Image
              source={AppImages.logo}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appTitle, { color: colors.text.primary }]}>
            AN POS
          </Text>
          <Text style={[styles.appSubtitle, { color: colors.text.secondary }]}>
            {view === 'login'
              ? t('auth.loginSubtitle')
              : t('auth.register')}
          </Text>
          {mode === 'connected' && activeServerUrl && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(30, 58, 138, 0.4)' : '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: '#3b82f6' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0 }} />
              <Text style={{ color: isDark ? '#93c5fd' : '#1d4ed8', fontSize: 11.5, fontFamily: 'Cairo', fontWeight: '600' }}>
                {isRTL ? `متصل بالحاسوب (${activeServerUrl.replace('http://', '')})` : `Connected to PC (${activeServerUrl.replace('http://', '')})`}
              </Text>
            </View>
          )}
        </View>

        {/* Form Container */}
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
                  { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse' },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('auth.usernamePlaceholder')}
                  placeholderTextColor={colors.text.tertiary}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                <User size={20} color={colors.text.tertiary} style={styles.fieldIcon} />
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
                  { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse' },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setShowPin(!showPin)}
                  style={styles.eyeToggleBtn}
                  activeOpacity={0.7}
                >
                  {showPin ? (
                    <EyeOff size={18} color={colors.text.tertiary} />
                  ) : (
                    <Eye size={18} color={colors.text.tertiary} />
                  )}
                </TouchableOpacity>

                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.tertiary}
                  value={pin}
                  onChangeText={setPin}
                  secureTextEntry={!showPin}
                  keyboardType="default"
                />
                <Lock size={20} color={colors.text.tertiary} style={styles.fieldIcon} />
              </View>
            </View>

            {/* Error Message */}
            {submitError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger.light, borderColor: colors.danger.border }]}>
                <AlertCircle size={16} color={colors.danger.main} />
                <Text style={[styles.errorBannerText, { color: colors.danger.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {submitError}
                </Text>
              </View>
            ) : null}

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.primarySubmitBtn, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
              onPress={handleLogin}
              activeOpacity={0.88}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <SubmitArrow size={20} color="#ffffff" />
                  <Text style={styles.primarySubmitBtnText}>{t('auth.loginButton')}</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Navigation & Mode Link */}
            <TouchableOpacity
              style={styles.modeLinkBtn}
              onPress={() => navigation.navigate('ModeSelect')}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeLinkText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>
                {t('modeSelect.switchLang')} • {t('modeSelect.standaloneTitle')}
              </Text>
            </TouchableOpacity>

            {/* Switch to Register */}
            <TouchableOpacity
              style={styles.switchViewBtn}
              onPress={() => {
                setView('register');
                setSubmitError(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.switchViewText, { color: colors.text.secondary }]}>
                {t('auth.noAccount')}{' '}
                <Text style={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: '700' }}>
                  {t('auth.createAccount')}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Register Form */
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.fullName')}
              </Text>
              <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t('auth.fullNamePlaceholder')}
                  placeholderTextColor={colors.text.tertiary}
                  value={regName}
                  onChangeText={setRegName}
                />
                <User size={20} color={colors.text.tertiary} style={styles.fieldIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.username')}
              </Text>
              <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="admin..."
                  placeholderTextColor={colors.text.tertiary}
                  value={regUsername}
                  onChangeText={setRegUsername}
                  autoCapitalize="none"
                />
                <UserPlus size={20} color={colors.text.tertiary} style={styles.fieldIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.email')} / {t('auth.phone')} ({t('common.optional')})
              </Text>
              <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="user@store.com"
                  placeholderTextColor={colors.text.tertiary}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Mail size={20} color={colors.text.tertiary} style={styles.fieldIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.pin')}
              </Text>
              <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.tertiary}
                  value={regPin}
                  onChangeText={setRegPin}
                  secureTextEntry
                />
                <Lock size={20} color={colors.text.tertiary} style={styles.fieldIcon} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('auth.confirmPin')}
              </Text>
              <View style={[styles.inputFieldContainer, { backgroundColor: inputBg, borderColor: borderColor, flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.tertiary}
                  value={regPinConfirm}
                  onChangeText={setRegPinConfirm}
                  secureTextEntry
                />
                <Lock size={20} color={colors.text.tertiary} style={styles.fieldIcon} />
              </View>
            </View>

            {submitError ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger.light, borderColor: colors.danger.border }]}>
                <AlertCircle size={16} color={colors.danger.main} />
                <Text style={[styles.errorBannerText, { color: colors.danger.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {submitError}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primarySubmitBtn, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
              onPress={handleRegister}
              activeOpacity={0.88}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <SubmitArrow size={20} color="#ffffff" />
                  <Text style={styles.primarySubmitBtnText}>{t('auth.registerButton')}</Text>
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
              <Text style={[styles.switchViewText, { color: colors.text.secondary }]}>
                {t('auth.haveAccount')}{' '}
                <Text style={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: '700' }}>
                  {t('auth.loginButton')}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },

  // Branding
  brandingHeader: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  logoSquircle: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    ...shadows.md,
  },
  logoImg: {
    width: 74,
    height: 74,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Cairo',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  // Form Section
  formSection: {
    gap: 18,
    marginTop: 6,
  },
  inputGroup: {
    gap: 6,
    alignItems: 'stretch',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  inputFieldContainer: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    fontFamily: 'Cairo',
    paddingHorizontal: 8,
  },
  fieldIcon: {
    marginHorizontal: 4,
  },
  eyeToggleBtn: {
    padding: 6,
  },

  // Errors
  errorBanner: {
    flexDirection: 'row',
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

  // Submit Button
  primarySubmitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    paddingVertical: 15,
    marginTop: 6,
    ...shadows.md,
  },
  primarySubmitBtnText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
  },

  // Links
  modeLinkBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  modeLinkText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  switchViewBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  switchViewText: {
    fontSize: 13,
    fontFamily: 'Cairo',
  },
});

export default LoginScreen;
