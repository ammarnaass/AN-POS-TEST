import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  ShieldCheck,
  RefreshCw,
  Lock,
  Unlock,
  Clock,
  Layers,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import {
  getAllFeatureStatuses,
  type UnlockedFeatureInfo,
} from '@/lib/subscriptionService';
import RewardAdModal from '@/components/subscription/RewardAdModal';
import FeatureUnlockAdModal from '@/components/subscription/FeatureUnlockAdModal';
import ContactUsModal from '@/components/subscription/ContactUsModal';
import RemoveAdsBanner from '@/components/subscription/RemoveAdsBanner';

export const SubscriptionScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { status, refreshStatus, unlockAllFeatures } = useSubscriptionStore();

  const [featureStatuses, setFeatureStatuses] = useState<UnlockedFeatureInfo[]>([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [showRewardAdModal, setShowRewardAdModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedFeatureToUnlock, setSelectedFeatureToUnlock] = useState<{
    key: string;
    name: string;
  } | null>(null);

  const [unlockingAll, setUnlockingAll] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingFeatures(true);
    await refreshStatus();
    const feats = await getAllFeatureStatuses();
    setFeatureStatuses(feats);
    setLoadingFeatures(false);
  };

  const handleUnlockAll = async () => {
    setUnlockingAll(true);
    await unlockAllFeatures(24);
    await loadData();
    setUnlockingAll(false);
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const isAdFree = status?.isAdFree || status?.isUnlimitedOrConnected;

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
          onPress={loadData}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Prominent Remove Ads Banner ── */}
        <RemoveAdsBanner style={{ marginBottom: spacing.md }} />

        {/* ── 2. Sales Quota & Status Card ── */}
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: colors.surface,
              borderColor: isAdFree ? colors.emerald[400] : colors.border.default,
            },
          ]}
        >
          <View style={[styles.statusCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.currentPlanLabel, { color: colors.text.tertiary }]}>
                {t('subscription.currentPlan')}
              </Text>
              <View style={[styles.tierBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {isAdFree ? (
                  <ShieldCheck size={22} color={colors.emerald[600]} />
                ) : (
                  <Sparkles size={22} color={colors.purple[600]} />
                )}
                <Text style={[styles.tierBadgeTitle, { color: colors.text.primary }]}>
                  {isAdFree
                    ? t('subscription.adFreeStatus')
                    : t('subscription.adSupportedStatus')}
                </Text>
              </View>
            </View>

            {!isAdFree && (
              <TouchableOpacity
                style={[
                  styles.quickAdBtn,
                  {
                    backgroundColor: colors.primary[600],
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => setShowRewardAdModal(true)}
                activeOpacity={0.85}
              >
                <Tv size={15} color="#ffffff" />
                <Text style={styles.quickAdBtnText}>+20 مبيعة</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quota Progress Bar (for ad-supported) */}
          {!isAdFree ? (
            <View style={styles.quotaSection}>
              <View style={[styles.quotaLabelsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.quotaLabelText, { color: colors.text.secondary }]}>
                  {t('subscription.salesRemaining')}:{' '}
                  <Text
                    style={{
                      fontWeight: '800',
                      color:
                        (status?.remainingSales || 0) < 20 ? colors.danger.main : colors.emerald[600],
                    }}
                  >
                    {status?.remainingSales ?? 300}
                  </Text>{' '}
                  {t('subscription.salesUnit')}
                </Text>
                <Text style={[styles.quotaLabelText, { color: colors.text.tertiary }]}>
                  {percentUsed}% مستهلك
                </Text>
              </View>

              <View
                style={[
                  styles.progressBarTrack,
                  { backgroundColor: isDark ? colors.surfaceElevated : colors.slate[200] },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(4, 100 - percentUsed)}%`,
                      backgroundColor:
                        (status?.remainingSales || 0) < 20 ? colors.danger.main : colors.primary[500],
                    },
                  ]}
                />
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.unlimitedNoticeBox,
                {
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
                  borderColor: colors.emerald[300],
                },
              ]}
            >
              <Text style={[styles.unlimitedNoticeText, { color: colors.emerald[700] }]}>
                ✓ تم تفعيل النسخة الكاملة: مبيعات وفواتير غير محدودة وكافة الميزات مفعلة دائماً.
              </Text>
            </View>
          )}

          {/* 4 Stats Chips */}
          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statChip,
                { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle },
              ]}
            >
              <Text style={[styles.statChipValue, { color: colors.text.primary }]}>
                {status?.usedSales ?? 0}
              </Text>
              <Text style={[styles.statChipLabel, { color: colors.text.tertiary }]}>
                {t('subscription.salesUsed')}
              </Text>
            </View>

            <View
              style={[
                styles.statChip,
                { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle },
              ]}
            >
              <Text style={[styles.statChipValue, { color: colors.text.primary }]}>
                {isAdFree ? 'غير محدود' : status?.baseQuota ?? 300}
              </Text>
              <Text style={[styles.statChipLabel, { color: colors.text.tertiary }]}>
                الرصيد الأساسي
              </Text>
            </View>

            <View
              style={[
                styles.statChip,
                { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle },
              ]}
            >
              <Text style={[styles.statChipValue, { color: colors.emerald[600] }]}>
                +{status?.bonusSales ?? 0}
              </Text>
              <Text style={[styles.statChipLabel, { color: colors.text.tertiary }]}>
                مكافآت الإعلانات
              </Text>
            </View>

            <View
              style={[
                styles.statChip,
                { backgroundColor: isDark ? colors.surfaceElevated : colors.surfaceSubtle },
              ]}
            >
              <Text style={[styles.statChipValue, { color: colors.primary[600] }]}>
                {status?.adsWatched ?? 0}
              </Text>
              <Text style={[styles.statChipLabel, { color: colors.text.tertiary }]}>
                إعلانات مشاهدة
              </Text>
            </View>
          </View>
        </View>

        {/* ── 3. Feature Unlock Passes Hub ── */}
        <View style={styles.featuresHubHeader}>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              فتح الميزات المتقدمة عبر الإعلانات
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
              شاهد إعلاناً قصيراً لفتح أي ميزة لمدة 24 ساعة مجاناً
            </Text>
          </View>

          {!isAdFree && (
            <TouchableOpacity
              style={[
                styles.unlockAllBtn,
                {
                  backgroundColor: isDark ? '#312e81' : '#ede9fe',
                  borderColor: isDark ? '#4338ca' : '#c7d2fe',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={handleUnlockAll}
              disabled={unlockingAll}
              activeOpacity={0.8}
            >
              {unlockingAll ? (
                <ActivityIndicator size="small" color="#7c3aed" />
              ) : (
                <>
                  <Layers size={14} color="#7c3aed" />
                  <Text style={styles.unlockAllBtnText}>
                    {t('subscription.unlockAllFeaturesAdBtn')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* List of Features */}
        <View style={styles.featuresListCol}>
          {featureStatuses.map((feat) => {
            return (
              <View
                key={feat.key}
                style={[
                  styles.featureRowCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: feat.isUnlocked ? colors.emerald[300] : colors.border.default,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconBadge,
                    {
                      backgroundColor: feat.isUnlocked
                        ? isDark
                          ? 'rgba(16, 185, 129, 0.15)'
                          : '#dcfce7'
                        : isDark
                        ? 'rgba(245, 158, 11, 0.15)'
                        : '#fef3c7',
                    },
                  ]}
                >
                  {feat.isUnlocked ? (
                    <Unlock size={18} color={colors.emerald[600]} />
                  ) : (
                    <Lock size={18} color="#f59e0b" />
                  )}
                </View>

                <View
                  style={[
                    styles.featureInfoContent,
                    { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <Text style={[styles.featureCardName, { color: colors.text.primary }]}>
                    {feat.name}
                  </Text>

                  {feat.isUnlocked ? (
                    <View
                      style={[
                        styles.remainingTimeRow,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <Clock size={12} color={colors.emerald[600]} />
                      <Text style={[styles.remainingTimeText, { color: colors.emerald[700] }]}>
                        {isAdFree
                          ? 'مفتوحة دائماً (النسخة الكاملة)'
                          : `مفتوحة (${feat.hoursRemaining || 24} ${t('subscription.hoursRemaining')})`}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.featureLockedNotice, { color: colors.text.tertiary }]}>
                      {t('subscription.lockedBadge')}
                    </Text>
                  )}
                </View>

                {!isAdFree && (
                  <TouchableOpacity
                    style={[
                      styles.featureUnlockBtn,
                      {
                        backgroundColor: feat.isUnlocked ? colors.surfaceSubtle : colors.primary[600],
                        borderColor: feat.isUnlocked ? colors.border.default : colors.primary[600],
                      },
                    ]}
                    onPress={() =>
                      setSelectedFeatureToUnlock({ key: feat.key, name: feat.name })
                    }
                    activeOpacity={0.8}
                  >
                    <Tv size={13} color={feat.isUnlocked ? colors.text.secondary : '#ffffff'} />
                    <Text
                      style={[
                        styles.featureUnlockBtnText,
                        { color: feat.isUnlocked ? colors.text.secondary : '#ffffff' },
                      ]}
                    >
                      {feat.isUnlocked ? 'تمديد 24س' : 'مشاهدة إعلان'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* ── 4. Contact Us Card ── */}
        <View
          style={[
            styles.contactSupportCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border.default,
            },
          ]}
        >
          <View style={[styles.contactCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Crown size={20} color="#f59e0b" />
            <Text style={[styles.contactCardTitle, { color: colors.text.primary }]}>
              {t('subscription.contactUsTitle')}
            </Text>
          </View>
          <Text
            style={[
              styles.contactCardSub,
              { color: colors.text.secondary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t('subscription.contactUsSubtitle')}
          </Text>

          <TouchableOpacity
            style={[
              styles.contactOpenModalBtn,
              {
                backgroundColor: '#7c3aed',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            onPress={() => setShowContactModal(true)}
            activeOpacity={0.88}
          >
            <Sparkles size={16} color="#ffffff" />
            <Text style={styles.contactOpenModalBtnText}>
              {t('subscription.contactUs')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rewarded Ad Modal (Sales Quota) */}
      <RewardAdModal
        visible={showRewardAdModal}
        onClose={() => setShowRewardAdModal(false)}
        onRewardClaimed={loadData}
      />

      {/* Feature Unlock Rewarded Ad Modal */}
      {selectedFeatureToUnlock && (
        <FeatureUnlockAdModal
          visible={!!selectedFeatureToUnlock}
          featureKey={selectedFeatureToUnlock.key}
          featureTitle={selectedFeatureToUnlock.name}
          onClose={() => setSelectedFeatureToUnlock(null)}
          onUnlocked={loadData}
          onContactUsPress={() => {
            setSelectedFeatureToUnlock(null);
            setShowContactModal(true);
          }}
        />
      )}

      {/* Contact Us to Remove Ads Modal */}
      <ContactUsModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSuccess={loadData}
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
    paddingVertical: spacing.sm,
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
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
  },
  statusCard: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  statusCardTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  currentPlanLabel: {
    fontSize: 12,
    fontWeight: '600',
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
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.xs,
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
    marginBottom: 6,
  },
  quotaLabelText: {
    fontSize: 12.5,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  unlimitedNoticeBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  unlimitedNoticeText: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  statChipValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statChipLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  featuresHubHeader: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  unlockAllBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  unlockAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  featuresListCol: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  featureRowCard: {
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureInfoContent: {
    flex: 1,
  },
  featureCardName: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  remainingTimeRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  remainingTimeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  featureLockedNotice: {
    fontSize: 11.5,
    marginTop: 2,
  },
  featureUnlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  featureUnlockBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  contactSupportCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  contactCardHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  contactCardSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  contactOpenModalBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  contactOpenModalBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

export default SubscriptionScreen;
