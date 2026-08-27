import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import {
  Cloud,
  Search,
  QrCode,
  Keyboard,
  Database,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import { session, electronAPI } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';
import { AppImages } from '@/assets';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';
import CloudStep from './steps/CloudStep';
import DiscoveryStep from './steps/DiscoveryStep';
import QRStep from './steps/QRStep';
import ManualStep from './steps/ManualStep';
import { colors, radii, spacing, typography, shadows } from '@/theme';
import { Card, Button, Badge } from '@/components/ui';

type Step = 'hub' | 'cloud' | 'discover' | 'manual' | 'qr' | 'connecting';

export const ConnectionHubScreen = ({ navigation }: any) => {
  const { setServerUrl } = useAuthStore();
  const [step, setStep] = useState<Step>('hub');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const check = async () => {
      if (await session.isConnected()) {
        navigation.replace('Login');
      }
    };
    check();
  }, [navigation]);

  const handleConnect = async (serverUrl: string, key: string) => {
    setStep('connecting');
    setLoading(true);
    setError('');
    try {
      await session.save(serverUrl, key);
      await setServerUrl(serverUrl);
      const res = await electronAPI.pair.pair({
        deviceName: 'AN POS Mobile',
        connectionKey: key,
      });
      if ('error' in res && res.error) throw new Error(res.error.detail);
      if (res.success && res.sessionToken && res.deviceId) {
        await session.savePairing(res.sessionToken, res.deviceId);
        navigation.replace('Login');
      } else {
        throw new Error('استجابة الاقتران غير مكتملة');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الاتصال بالخادم');
      setStep('hub');
    } finally {
      setLoading(false);
    }
  };

  const handleStandalone = async () => {
    setLoading(true);
    setError('');
    try {
      await unifiedDB.switchToStandalone();
      navigation.replace('Login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل تهيئة قاعدة البيانات');
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.title}>مركز الاقتران والاتصال</Text>
        <Text style={styles.subtitle}>
          اختر طريقة الاتصال مع تطبيق سطح المكتب أو العمل محلياً
        </Text>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <AlertCircle size={16} color={colors.danger.main} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {step === 'hub' && (
        <View style={styles.hubContainer}>
          {/* Method Cards Grid */}
          <View style={styles.grid}>
            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => setStep('qr')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.primary[50] },
                ]}
              >
                <QrCode size={24} color={colors.primary[600]} />
              </View>
              <Text style={styles.cardTitle}>مسح رمز QR</Text>
              <Text style={styles.cardSubtitle}>من شاشة الحاسوب</Text>
              <Badge variant="primary" size="sm" style={styles.recommendedBadge}>
                موصى به
              </Badge>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => setStep('discover')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.success.light },
                ]}
              >
                <Search size={24} color={colors.success.dark} />
              </View>
              <Text style={styles.cardTitle}>البحث التلقائي</Text>
              <Text style={styles.cardSubtitle}>على نفس شبكة Wi-Fi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => setStep('cloud')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.warning.light },
                ]}
              >
                <Cloud size={24} color={colors.warning.dark} />
              </View>
              <Text style={styles.cardTitle}>الاتصال السحابي</Text>
              <Text style={styles.cardSubtitle}>عبر الإنترنت</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodCard}
              onPress={() => setStep('manual')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.slate[100] },
                ]}
              >
                <Keyboard size={24} color={colors.slate[700]} />
              </View>
              <Text style={styles.cardTitle}>الاتصال اليدوي</Text>
              <Text style={styles.cardSubtitle}>IP + رقم المنفذ</Text>
            </TouchableOpacity>
          </View>

          {/* Standalone Button */}
          <Button
            title="العمل بدون خادم (الوضع المستقل المحلي)"
            variant="secondary"
            icon={<Database size={18} color={colors.slate[700]} />}
            onPress={handleStandalone}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.xs }}
          />

          <View style={styles.securityNote}>
            <ShieldCheck size={14} color={colors.slate[400]} />
            <Text style={styles.securityText}>
              اتصال آمن ومشفر بين الهاتف والحاسوب
            </Text>
          </View>
        </View>
      )}

      {step === 'cloud' && (
        <CloudStep
          onConnect={handleConnect}
          onBack={() => setStep('hub')}
          loading={loading}
        />
      )}
      {step === 'discover' && (
        <DiscoveryStep
          onConnect={handleConnect}
          onBack={() => setStep('hub')}
        />
      )}
      {step === 'qr' && (
        <QRStep
          onConnect={handleConnect}
          onBack={() => setStep('hub')}
          loading={loading}
        />
      )}
      {step === 'manual' && (
        <ManualStep
          onConnect={handleConnect}
          onBack={() => setStep('hub')}
          loading={loading}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    width: 68,
    height: 68,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text.primary,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'Cairo',
    textAlign: 'center',
    maxWidth: 280,
  },

  hubContainer: {
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  methodCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  recommendedBadge: {
    marginTop: spacing.xs,
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  securityText: {
    fontSize: 11,
    color: colors.slate[400],
    fontFamily: 'Cairo',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger.light,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger.border,
  },
  errorText: {
    color: colors.danger.text,
    fontSize: 12,
    fontFamily: 'Cairo',
    flex: 1,
    textAlign: 'right',
  },
});

export default ConnectionHubScreen;
