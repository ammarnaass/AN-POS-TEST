import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Zap,
  Crown,
  Check,
  Tv,
  Key,
  ShieldCheck,
  RefreshCw,
  Gift,
  HelpCircle,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { TIER_FEATURES, type SubscriptionTier } from '@/lib/subscriptionService';
import RewardAdModal from '@/components/subscription/RewardAdModal';

export const SubscriptionScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { status, loading, refreshStatus, upgrade } = useSubscriptionStore();

  const [showAdModal, setShowAdModal] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<SubscriptionTier | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    refreshStatus();
  }, []);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const currentTier = status?.tier || 'free';

  const handleUpgradeTier = async (tier: SubscriptionTier) => {
    if (tier === currentTier) return;

    if (tier === 'free') {
      Alert.alert(t('common.confirm'), 'هل تريد العودة للباقة المجانية؟', [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setUpgrading(true);
            await upgrade('free');
            setUpgrading(false);
          },
        },
      ]);
      return;
    }

    // For Lite or Pro: ask for activation or test activate
    Alert.alert(
      `ترقية الباقة إلى ${tier === 'lite' ? 'لايت (Lite)' : 'برو (Pro)'}`,
      `تتيح لك باقة ${tier === 'lite' ? 'لايت' : 'برو'} رصيداً يصل إلى ${
        tier === 'lite' ? '5,000' : '100,000'
      } مبيعة مع كافة الميزات المتقدمة.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'تفعيل الآن',
          onPress: async () => {
            setUpgrading(true);
            const success = await upgrade(tier, licenseInput.trim() || `LIC-${tier.toUpperCase()}-${Date.now()}`);
            setUpgrading(false);
            if (success) {
              Alert.alert(t('subscription.upgradeSuccess'), `${t('subscription.upgradeSuccessMsg')} ${tier.toUpperCase()}`);
            }
          },
        },
      ]
    );
  };

  const percentUsed =
    status && status.totalQuota > 0
      ? Math.min(100, Math.round((status.usedSales / status.totalQuota) * 100))
      : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border.default,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <BackArrow size={20} color={colors.text.primary} />
        </TouchableOpacity>

        <View style={[styles.headerTitles, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.headerMainTitle, { color: colors.text.primary }]}>
            {t('subscription.title')}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text.tertiary }]}>
            {t('subscription.subtitle')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[100] }]}
          onPress={() => refreshStatus()}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Current Plan Bento Card ── */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.surface,
              borderColor: currentTier === 'pro' ? '#f59e0b' : currentTier === 'lite' ? '#3b82f6' : colors.border.default,
            },
          ]}
        >
          <View style={[styles.statusCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.currentPlanLabel, { color: colors.text.tertiary }]}>
                {t('subscription.currentPlan')}
              </Text>
              <View style={[styles.tierBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {currentTier === 'pro' ? (
                  <Crown size={22} color="#f59e0b" />
                ) : currentTier === 'lite' ? (
                  <Zap size={22} color="#3b82f6" />
                ) : (
                  <Sparkles size={22} color={colors.emerald[600]} />
                )}
                <Text style={[styles.tierBadgeTitle, { color: colors.text.primary }]}>
                  {currentTier === 'pro'
                    ? t('subscription.proBadge')
                    : currentTier === 'lite'
                    ? t('subscription.liteBadge')
                    : t('subscription.freeBadge')}
                </Text>
              </View>
            </View>

            {currentTier === 'free' && (
              <TouchableOpacity
                style={[
                  styles.quickAdBtn,
                  {
                    backgroundColor: colors.primary[600],
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => setShowAdModal(true)}
                activeOpacity={0.85}
              >
                <Tv size={15} color="#ffffff" />
                <Text style={styles.quickAdBtnText}>+20 مبيعة</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quota Progress Bar */}
          <View style={styles.quotaSection}>
            <View style={[styles.quotaLabelsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.quotaLabelText, { color: colors.text.secondary }]}>
                {t('subscription.salesRemaining')}:{' '}
                <Text style={{ fontWeight: '800', color: (status?.remainingSales || 0) < 20 ? colors.danger.main : colors.emerald[600] }}>
                  {status?.remainingSales ?? 300}
                </Text>{' '}
                {t('subscription.salesUnit')}
              </Text>
              <Text style={[styles.quotaLabelText, { color: colors.text.tertiary }]}>
                {percentUsed}% مستهلك
              </Text>
            </View>

            <View style={[styles.progressBarTrack, { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[200] }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.max(4, 100 - percentUsed)}%`,
                    backgroundColor: (status?.remainingSales || 0) < 20 ? colors.danger.main : colors.primary[500],
                  },
                ]}
              />
            </View>
          </View>

          {/* 4 Stats Chips */}
          <View style={styles.statsGrid}>
            <View style={[styles.statChip, { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle }]}>
              <Text style={[styles.statChipValue, { color: colors.text.primary }]}>
                {status?.usedSales ?? 0}
              </Text>
              <Text style={[styles.statChipLabel, { color: colors.text.tertiary }]}>
                {t('subscription.salesUsed')}
              </Text>
            </View>

            <View style={[styles.statChip, { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle }]}>
              <Text style={[styles.statChipValue, { color: colors.text.primary }]}>
                {status?.baseQuota ?? 300}
              </Text>
              <Text style={[styles.statChipLabel, { color: colors.text.tertiary }]}>
                الرصيد الأساسي
              </Text>
            </View>

            <View style={[styles.statChip, { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle }]}>
              <Text style={[styles.statChipValue, { color: colors.emerald[600] }]}>
                +{status?.bonusSales ?? 0}
              </Text>
              <Text style={[styles.statChipLabel, { color: colors.text.tertiary }]}>
                مكافآت الإعلانات
              </Text>
            </View>

            <View style={[styles.statChip, { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle }]}>
              <Text style={[styles.statChipValue, { color: colors.primary[600] }]}>
                {status?.adsWatched ?? 0}
              </Text>
              <Text style={[styles.statChipLabel, { color: colors.text.tertiary }]}>
                إعلانات مشاهدة
              </Text>
            </View>
          </View>
        </View>

        {/* ── 2. Plans Comparison Section ── */}
        <Text style={[styles.sectionTitle, { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' }]}>
          مقارنة باقات الاشتراك
        </Text>

        {/* Free Plan Card */}
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: colors.surface,
              borderColor: currentTier === 'free' ? colors.primary[500] : colors.border.default,
            },
          ]}
        >
          <View style={[styles.planCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.planName, { color: colors.text.primary }]}>
                {t('subscription.free')}
              </Text>
              <Text style={[styles.planQuotaHighlight, { color: colors.primary[600] }]}>
                300 مبيعة + إعلانات بمكافأة (+20)
              </Text>
            </View>
            {currentTier === 'free' && (
              <View style={[styles.activePlanBadge, { backgroundColor: colors.primary[50] }]}>
                <Text style={[styles.activePlanBadgeText, { color: colors.primary[700] }]}>
                  الباقة الحالية
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.planDesc, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('subscription.freeDesc')}
          </Text>

          <View style={styles.featuresList}>
            {TIER_FEATURES.free.map((feat, idx) => (
              <View key={idx} style={[styles.featureItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Check size={15} color={colors.emerald[600]} />
                <Text style={[styles.featureItemText, { color: colors.text.secondary }]}>
                  {feat}
                </Text>
              </View>
            ))}
          </View>

          {currentTier === 'free' && (
            <TouchableOpacity
              style={[
                styles.planActionBtn,
                {
                  backgroundColor: colors.emerald[600],
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => setShowAdModal(true)}
              activeOpacity={0.88}
            >
              <Tv size={16} color="#ffffff" />
              <Text style={styles.planActionBtnText}>{t('subscription.watchAdBtn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lite Plan Card */}
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: colors.surface,
              borderColor: currentTier === 'lite' ? '#3b82f6' : colors.border.default,
            },
          ]}
        >
          <View style={[styles.planCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.planName, { color: colors.text.primary }]}>
                {t('subscription.lite')}
              </Text>
              <Text style={[styles.planQuotaHighlight, { color: '#2563eb' }]}>
                5,000 مبيعة • بدون إعلانات
              </Text>
            </View>
            {currentTier === 'lite' ? (
              <View style={[styles.activePlanBadge, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.activePlanBadgeText, { color: '#2563eb' }]}>
                  الباقة الحالية
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.upgradeMiniBtn, { backgroundColor: '#2563eb' }]}
                onPress={() => handleUpgradeTier('lite')}
                activeOpacity={0.85}
                disabled={upgrading}
              >
                <Text style={styles.upgradeMiniBtnText}>ترقية إلى لايت</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.planDesc, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('subscription.liteDesc')}
          </Text>

          <View style={styles.featuresList}>
            {TIER_FEATURES.lite.map((feat, idx) => (
              <View key={idx} style={[styles.featureItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Check size={15} color="#2563eb" />
                <Text style={[styles.featureItemText, { color: colors.text.secondary }]}>
                  {feat}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pro Plan Card */}
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: colors.surface,
              borderColor: currentTier === 'pro' ? '#f59e0b' : colors.border.default,
            },
          ]}
        >
          <View style={[styles.planCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.proBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Crown size={16} color="#d97706" />
                <Text style={[styles.planName, { color: colors.text.primary }]}>
                  {t('subscription.pro')}
                </Text>
              </View>
              <Text style={[styles.planQuotaHighlight, { color: '#d97706' }]}>
                100,000 مبيعة • سعة قصوى
              </Text>
            </View>
            {currentTier === 'pro' ? (
              <View style={[styles.activePlanBadge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.activePlanBadgeText, { color: '#d97706' }]}>
                  الباقة الحالية
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.upgradeMiniBtn, { backgroundColor: '#d97706' }]}
                onPress={() => handleUpgradeTier('pro')}
                activeOpacity={0.85}
                disabled={upgrading}
              >
                <Text style={styles.upgradeMiniBtnText}>ترقية إلى برو</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.planDesc, { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('subscription.proDesc')}
          </Text>

          <View style={styles.featuresList}>
            {TIER_FEATURES.pro.map((feat, idx) => (
              <View key={idx} style={[styles.featureItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Check size={15} color="#d97706" />
                <Text style={[styles.featureItemText, { color: colors.text.secondary }]}>
                  {feat}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rewarded Ad Modal */}
      <RewardAdModal
        visible={showAdModal}
        onClose={() => setShowAdModal(false)}
        onRewardClaimed={() => refreshStatus()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
  },
  headerMainTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  statusCard: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    ...shadows.sm,
  },
  statusCardTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  currentPlanLabel: {
    fontSize: 12,
  },
  tierBadgeRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  tierBadgeTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  quickAdBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    alignItems: 'center',
    gap: 5,
  },
  quickAdBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  quotaSection: {
    marginBottom: spacing.md,
  },
  quotaLabelsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quotaLabelText: {
    fontSize: 12.5,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  statChip: {
    flex: 1,
    minWidth: '46%',
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  statChipValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statChipLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  planCard: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    ...shadows.sm,
  },
  planCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  planName: {
    fontSize: 17,
    fontWeight: '800',
  },
  proBadgeRow: {
    alignItems: 'center',
    gap: 4,
  },
  planQuotaHighlight: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  activePlanBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
  },
  activePlanBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  upgradeMiniBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
  },
  upgradeMiniBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  planDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  featuresList: {
    gap: 6,
    marginBottom: spacing.sm,
  },
  featureItemRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureItemText: {
    fontSize: 12.5,
    flexShrink: 1,
  },
  planActionBtn: {
    paddingVertical: 10,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  planActionBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

export default SubscriptionScreen;
