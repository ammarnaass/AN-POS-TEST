import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Sparkles, MessageCircle, Crown, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import ContactUsModal from './ContactUsModal';

interface RemoveAdsBannerProps {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export const RemoveAdsBanner: React.FC<RemoveAdsBannerProps> = ({
  style,
  compact = false,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { status, refreshStatus } = useSubscriptionStore();
  const [showContactModal, setShowContactModal] = useState(false);

  // If already ad-free or connected mode, hide banner or show activated badge
  if (status?.isAdFree || status?.isUnlimitedOrConnected) {
    if (compact) return null;
    return (
      <View
        style={[
          styles.activatedCard,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
            borderColor: colors.emerald[300],
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
          style,
        ]}
      >
        <ShieldCheck size={20} color={colors.emerald[600]} />
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.activatedTitle, { color: colors.emerald[700] }]}>
            {t('subscription.adFreeStatus')}
          </Text>
          <Text style={[styles.activatedSub, { color: colors.text.secondary }]}>
            {t('subscription.adFreeBadge')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.bannerCard,
          {
            backgroundColor: isDark ? '#1e1b4b' : '#ede9fe',
            borderColor: isDark ? '#4338ca' : '#c7d2fe',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
          compact && styles.compactBanner,
          style,
        ]}
        onPress={() => setShowContactModal(true)}
        activeOpacity={0.88}
      >
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isDark ? '#312e81' : '#ddd6fe',
            },
          ]}
        >
          <Crown size={compact ? 20 : 24} color="#8b5cf6" />
        </View>

        <View style={[styles.contentWrapper, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.bannerTitle,
                { color: isDark ? '#f5f3ff' : '#4c1d95' },
              ]}
              numberOfLines={1}
            >
              {t('subscription.removeAdsTitle')}
            </Text>
          </View>

          {!compact && (
            <Text
              style={[
                styles.bannerSub,
                { color: isDark ? '#c7d2fe' : '#5b21b6' },
              ]}
              numberOfLines={2}
            >
              {t('subscription.removeAdsSubtitle')}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.ctaButton,
            {
              backgroundColor: '#7c3aed',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <MessageCircle size={15} color="#ffffff" />
          <Text style={styles.ctaButtonText}>{t('subscription.contactUs')}</Text>
        </View>
      </TouchableOpacity>

      <ContactUsModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSuccess={() => {
          refreshStatus();
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bannerCard: {
    width: '100%',
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  compactBanner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  proPillText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bannerSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  ctaButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    ...shadows.xs,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  activatedCard: {
    width: '100%',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  activatedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  activatedSub: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default RemoveAdsBanner;
