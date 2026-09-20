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
  Sparkles,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Crown,
  Tv,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { useSubscriptionStore } from '@/store/subscriptionStore';

interface RewardAdModalProps {
  visible: boolean;
  onClose: () => void;
  onRewardClaimed?: () => void;
  onUpgradePress?: () => void;
}

export const RewardAdModal: React.FC<RewardAdModalProps> = ({
  visible,
  onClose,
  onRewardClaimed,
  onUpgradePress,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { status, claimAdReward } = useSubscriptionStore();

  const [step, setStep] = useState<'prompt' | 'watching' | 'completed'>('prompt');
  const [countdown, setCountdown] = useState(5);
  const [loadingClaim, setLoadingClaim] = useState(false);
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      setStep('prompt');
      setCountdown(5);
      progressAnim.setValue(0);
    }
  }, [visible]);

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
    setLoadingClaim(true);
    try {
      await claimAdReward();
      setStep('completed');
    } catch (e) {
      console.warn('Claim reward failed:', e);
    } finally {
      setLoadingClaim(false);
    }
  };

  const handleDone = () => {
    onClose();
    if (onRewardClaimed) {
      onRewardClaimed();
    }
  };

  const NextArrow = isRTL ? ArrowLeft : ArrowRight;

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
          {/* Top Close Button (disabled while watching) */}
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

          {/* ── STEP 1: Prompt to Watch Ad or Upgrade ── */}
          {step === 'prompt' && (
            <View style={styles.body}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                  },
                ]}
              >
                <AlertCircle size={32} color={colors.danger.main} />
              </View>

              <Text style={[styles.title, { color: colors.text.primary }]}>
                {t('subscription.limitReached')}
              </Text>
              <Text style={[styles.description, { color: colors.text.secondary }]}>
                {t('subscription.limitReachedDesc')}
              </Text>

              {/* Status Pill */}
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                <Text style={[styles.statusPillLabel, { color: colors.text.tertiary }]}>
                  {t('subscription.salesUsed')}:
                </Text>
                <Text style={[styles.statusPillValue, { color: colors.danger.main }]}>
                  {status?.usedSales || 300} / {status?.totalQuota || 300} {t('subscription.salesUnit')}
                </Text>
              </View>

              {/* Action 1: Watch Ad (+20 Sales) */}
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
                  {t('subscription.watchAdBtn')}
                </Text>
              </TouchableOpacity>

              {/* Action 2: Upgrade to Lite/Pro */}
              {onUpgradePress && (
                <TouchableOpacity
                  style={[
                    styles.secondaryUpgradeBtn,
                    {
                      borderColor: colors.primary[500],
                      backgroundColor: isDark ? 'rgba(37, 99, 235, 0.08)' : '#eff6ff',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => {
                    onClose();
                    onUpgradePress();
                  }}
                  activeOpacity={0.8}
                >
                  <Crown size={18} color={colors.primary[600]} />
                  <Text style={[styles.secondaryUpgradeBtnText, { color: colors.primary[600] }]}>
                    {t('subscription.upgradePlan')}
                  </Text>
                  <NextArrow size={16} color={colors.primary[600]} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── STEP 2: Watching Ad (Simulation / Ad Engine) ── */}
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
                  <Sparkles size={48} color="#60a5fa" />
                  <Text style={styles.adPromoTitle}>AN POS Cloud & Desktop</Text>
                  <Text style={styles.adPromoSubtitle}>
                    إدارة نقاط البيع والمخزون المتعدد بكل سهولة ومزامنة فورية بين الأجهزة
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
                {loadingClaim ? (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                ) : (
                  <Text style={[styles.watchingStatusText, { color: colors.text.secondary }]}>
                    {t('subscription.watchingAd')} ({countdown} ثوانٍ متبقية)
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* ── STEP 3: Completed & Rewarded ── */}
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
                {t('subscription.adCompletedTitle')}
              </Text>
              <Text style={[styles.description, { color: colors.text.secondary }]}>
                {t('subscription.adCompletedMsg')}
              </Text>

              {/* Reward Highlight Box */}
              <View
                style={[
                  styles.rewardSuccessBox,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
                    borderColor: colors.emerald[300],
                  },
                ]}
              >
                <Zap size={22} color={colors.emerald[600]} />
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.rewardSuccessNumber, { color: colors.emerald[700] }]}>
                    +20 {t('subscription.salesUnit')}
                  </Text>
                  <Text style={[styles.rewardSuccessSub, { color: colors.text.secondary }]}>
                    {t('subscription.salesRemaining')}: {status?.remainingSales || 20} {t('subscription.salesUnit')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryRewardBtn,
                  {
                    backgroundColor: colors.emerald[600],
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    marginTop: spacing.md,
                  },
                ]}
                onPress={handleDone}
                activeOpacity={0.88}
              >
                <CheckCircle2 size={18} color="#ffffff" />
                <Text style={styles.primaryRewardBtnText}>
                  متابعة عملية البيع الآن
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
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  statusPillLabel: {
    fontSize: 12.5,
  },
  statusPillValue: {
    fontSize: 13,
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
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryUpgradeBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  secondaryUpgradeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Ad Player Simulation Styles
  adPlayerCard: {
    width: '100%',
    height: 200,
    borderRadius: radii.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
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
  rewardSuccessBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.xs,
  },
  rewardSuccessNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  rewardSuccessSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
});

export default RewardAdModal;
