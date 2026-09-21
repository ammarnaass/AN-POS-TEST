import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import {
  Lock,
  Sparkles,
  Tv,
  CheckCircle2,
  X,
  Clock,
  Crown,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { LOCKED_FEATURES, UNLOCK_DURATION_HOURS } from '@/lib/subscriptionService';
import { useSubscriptionStore } from '@/store/subscriptionStore';

interface FeatureUnlockAdModalProps {
  visible: boolean;
  featureKey: string;
  featureTitle?: string;
  featureDescription?: string;
  onClose: () => void;
  onUnlocked?: () => void;
  onContactUsPress?: () => void;
}

export const FeatureUnlockAdModal: React.FC<FeatureUnlockAdModalProps> = ({
  visible,
  featureKey,
  featureTitle,
  featureDescription,
  onClose,
  onUnlocked,
  onContactUsPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { unlockFeature } = useSubscriptionStore();

  const [step, setStep] = useState<'prompt' | 'watching' | 'completed'>('prompt');
  const [countdown, setCountdown] = useState(5);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [progressAnim] = useState(new Animated.Value(0));

  const featMeta = LOCKED_FEATURES[featureKey] || {
    name: featureTitle || 'ميزة متقدمة',
    desc: featureDescription || 'هذه الميزة متاحة عبر مشاهدة إعلان قصير لمدة 24 ساعة.',
  };

  const displayName = featureTitle || featMeta.name;
  const displayDesc = featureDescription || featMeta.desc;

  useEffect(() => {
    if (visible) {
      setStep('prompt');
      setCountdown(5);
      progressAnim.setValue(0);
    }
  }, [visible, featureKey]);

  const startWatchingAd = () => {
    setStep('watching');
    setCountdown(5);
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    let current = 5;
    const interval = setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        clearInterval(interval);
        handleAdFinished();
      }
    }, 1000);
  };

  const handleAdFinished = async () => {
    setLoadingUnlock(true);
    try {
      await unlockFeature(featureKey, UNLOCK_DURATION_HOURS);
      setStep('completed');
    } catch (e) {
      console.warn('Unlock feature failed:', e);
    } finally {
      setLoadingUnlock(false);
    }
  };

  const handleEnterFeature = () => {
    onClose();
    if (onUnlocked) {
      onUnlocked();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={step === 'watching' ? () => {} : onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          {/* Close button */}
          {step !== 'watching' && (
            <TouchableOpacity
              style={[
                styles.closeBtn,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100],
                  [isRTL ? 'left' : 'right']: spacing.md,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}

          {/* ── STEP 1: Prompt to Unlock with Ad ── */}
          {step === 'prompt' && (
            <View style={styles.body}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                  },
                ]}
              >
                <Lock size={32} color="#f59e0b" />
              </View>

              <Text style={[styles.title, { color: colors.text.primary }]}>
                {t('subscription.featureLocked')}
              </Text>
              <Text style={[styles.featureHighlightName, { color: colors.primary[600] }]}>
                {displayName}
              </Text>
              <Text style={[styles.description, { color: colors.text.secondary }]}>
                {displayDesc}
              </Text>

              {/* Unlock Pass Info Badge */}
              <View
                style={[
                  styles.durationBadge,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : '#f0fdf4',
                    borderColor: colors.emerald[300],
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Clock size={16} color={colors.emerald[600]} />
                <Text style={[styles.durationBadgeText, { color: colors.emerald[700] }]}>
                  {t('subscription.unlockedBadge')}
                </Text>
              </View>

              {/* Action 1: Watch Ad to Unlock */}
              <TouchableOpacity
                style={[
                  styles.primaryRewardBtn,
                  {
                    backgroundColor: colors.primary[600],
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={startWatchingAd}
                activeOpacity={0.88}
              >
                <Tv size={20} color="#ffffff" />
                <Text style={styles.primaryRewardBtnText}>
                  {t('subscription.unlockWithAdBtn')}
                </Text>
              </TouchableOpacity>

              {/* Action 2: Remove Ads / Contact Us */}
              {onContactUsPress && (
                <TouchableOpacity
                  style={[
                    styles.secondaryContactBtn,
                    {
                      borderColor: colors.border.default,
                      backgroundColor: isDark ? colors.surfaceElevated : '#f8fafc',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => {
                    onClose();
                    onContactUsPress();
                  }}
                  activeOpacity={0.8}
                >
                  <Crown size={17} color={colors.amber[500]} />
                  <Text style={[styles.secondaryContactBtnText, { color: colors.text.primary }]}>
                    {t('subscription.removeAdsBannerCta')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── STEP 2: Watching Ad ── */}
          {step === 'watching' && (
            <View style={styles.body}>
              <View
                style={[
                  styles.adPlayerCard,
                  {
                    backgroundColor: isDark ? '#0b1329' : '#0f172a',
                  },
                ]}
              >
                <View style={styles.adHeader}>
                  <View style={styles.adBadge}>
                    <Text style={styles.adBadgeText}>إعلان ممول • AN POS</Text>
                  </View>
                  <View style={styles.adTimerBadge}>
                    <Text style={styles.adTimerText}>{countdown}s</Text>
                  </View>
                </View>

                <View style={styles.adContentCenter}>
                  <Sparkles size={46} color="#60a5fa" />
                  <Text style={styles.adPromoTitle}>AN POS Cloud & Desktop</Text>
                  <Text style={styles.adPromoSubtitle}>
                    إدارة شاملة لنقاط البيع، المزامنة الفورية مع سطح المكتب، وتقارير أرباح متقدمة
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarTrack}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.watchingStatusRow}>
                {loadingUnlock ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <Text style={[styles.watchingStatusText, { color: colors.text.secondary }]}>
                    {t('subscription.watchingAd')} ({countdown} ثوانٍ متبقية)
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* ── STEP 3: Completed & Unlocked ── */}
          {step === 'completed' && (
            <View style={styles.body}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7',
                  },
                ]}
              >
                <CheckCircle2 size={36} color={colors.emerald[600]} />
              </View>

              <Text style={[styles.title, { color: colors.text.primary }]}>
                {t('subscription.unlockedSuccessTitle')}
              </Text>
              <Text style={[styles.featureHighlightName, { color: colors.emerald[600] }]}>
                {displayName}
              </Text>
              <Text style={[styles.description, { color: colors.text.secondary }]}>
                {t('subscription.unlockedSuccessMsg')}
              </Text>

              <TouchableOpacity
                style={[
                  styles.primaryRewardBtn,
                  {
                    backgroundColor: colors.emerald[600],
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    marginTop: spacing.md,
                  },
                ]}
                onPress={handleEnterFeature}
                activeOpacity={0.88}
              >
                <CheckCircle2 size={18} color="#ffffff" />
                <Text style={styles.primaryRewardBtnText}>
                  {t('subscription.enterFeatureBtn')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    position: 'relative',
    ...shadows.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  body: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureHighlightName: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  durationBadge: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  durationBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  primaryRewardBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  primaryRewardBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
  },
  secondaryContactBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  secondaryContactBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  adPlayerCard: {
    width: '100%',
    height: 200,
    borderRadius: radii.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  adBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  adTimerBadge: {
    backgroundColor: '#ef4444',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: radii.full,
  },
  adTimerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  adContentCenter: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  adPromoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  adPromoSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  watchingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  watchingStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default FeatureUnlockAdModal;
