import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Smartphone,
  Monitor,
  Cloud,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Package,
  Printer,
  MonitorOff,
  Gift,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react-native';
import { db as unifiedDB } from '@/infrastructure/database/UnifiedDB';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { AppImages } from '@/assets';
import { LanguageQuickButton } from '@/components/ui';

interface Props {
  navigation: any;
}

export const ModeSelectScreen = ({ navigation }: Props) => {
  const { isDark, colors } = useTheme();
  const { t, isRTL } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleStartStandalone = async () => {
    setLoading(true);
    try {
      await unifiedDB.switchToStandalone();
      navigation.replace('Login');
    } catch (e) {
      console.warn('Switch to standalone error:', e);
      navigation.replace('Login');
    } finally {
      setLoading(false);
    }
  };

  const handleDesktopPair = () => {
    navigation.navigate('Pair', { initialTab: 'discover' });
  };

  const handleCloudPair = () => {
    navigation.navigate('Pair', { initialTab: 'cloud' });
  };

  const ActionArrow = isRTL ? ArrowLeft : ArrowRight;
  const OptionChevron = isRTL ? ChevronLeft : ChevronRight;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Language Switcher Row */}
      <View style={[styles.langRow, { justifyContent: isRTL ? 'flex-start' : 'flex-end' }]}>
        <LanguageQuickButton />
      </View>

      {/* Top App Branding */}
      <View style={styles.header}>
        <View style={styles.topIconBox}>
          <Image
            source={AppImages.logo}
            style={styles.topLogoImg}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brandName, { color: colors.text.tertiary }]}>
          AN POS
        </Text>
        <Text style={[styles.welcomeTitle, { color: colors.text.primary }]}>
          {t('modeSelect.welcomeTitle')}
        </Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.text.secondary }]}>
          {t('modeSelect.welcomeSubtitle')}
        </Text>
      </View>

      {/* Hero Card: Standalone Mode (الوضع المستقل) */}
      <View style={styles.heroCard}>
        {/* Top Badges & Icon */}
        <View style={[styles.heroTopRow, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>
              {t('modeSelect.standaloneBadge')}
            </Text>
          </View>
          <View style={styles.phoneIconBox}>
            <Smartphone size={26} color="#ffffff" />
          </View>
        </View>

        {/* Titles */}
        <View style={styles.heroTitles}>
          <Text style={styles.heroMainTitle}>{t('modeSelect.standaloneTitle')}</Text>
          <Text style={styles.heroSubTitle}>{t('modeSelect.standaloneSub')}</Text>
        </View>

        {/* Highlight Feature */}
        <View style={[styles.highlightRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Sparkles size={16} color="#ffffff" />
          <Text style={styles.highlightText}>
            {t('modeSelect.standaloneFeat1')}
          </Text>
        </View>

        {/* Feature Pills */}
        <View style={styles.pillsContainer}>
          <View style={styles.pillItem}>
            <Package size={13} color="#ffffff" />
            <Text style={styles.pillText}>{t('nav.inventory')}</Text>
          </View>
          <View style={styles.pillItem}>
            <Printer size={13} color="#ffffff" />
            <Text style={styles.pillText}>{t('nav.pos')}</Text>
          </View>
          <View style={styles.pillItem}>
            <MonitorOff size={13} color="#ffffff" />
            <Text style={styles.pillText}>Offline</Text>
          </View>
          <View style={styles.pillItem}>
            <Gift size={13} color="#ffffff" />
            <Text style={styles.pillText}>Trial</Text>
          </View>
        </View>

        {/* Trial Note */}
        <Text style={styles.trialNote}>
          {t('modeSelect.standaloneFeat2')}
        </Text>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.heroCtaBtn, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
          onPress={handleStartStandalone}
          activeOpacity={0.9}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <>
              <ActionArrow size={18} color="#2563eb" />
              <Text style={styles.heroCtaText}>{t('modeSelect.standaloneBtn')}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Advanced Options Section */}
      <View style={styles.dividerSection}>
        <View style={[styles.dividerLine, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]} />
        <Text style={[styles.dividerText, { color: colors.text.tertiary }]}>
          {t('settings.operationsHub')}
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]} />
      </View>

      {/* Option 1: Desktop Link */}
      <TouchableOpacity
        style={[
          styles.optionCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            flexDirection: isRTL ? 'row' : 'row-reverse',
          },
        ]}
        onPress={handleDesktopPair}
        activeOpacity={0.8}
      >
        <OptionChevron size={18} color={colors.text.tertiary} />
        <View style={[styles.optionContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.optionTitle, { color: colors.text.primary }]}>
            {t('modeSelect.connectedTitle')}
          </Text>
          <Text style={[styles.optionSubtitle, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('modeSelect.connectedSub')}
          </Text>
        </View>
        <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
          <Monitor size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
        </View>
      </TouchableOpacity>

      {/* Option 2: Cloud Mode */}
      <TouchableOpacity
        style={[
          styles.optionCard,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? '#1e293b' : '#e2e8f0',
            flexDirection: isRTL ? 'row' : 'row-reverse',
          },
        ]}
        onPress={handleCloudPair}
        activeOpacity={0.8}
      >
        <OptionChevron size={18} color={colors.text.tertiary} />
        <View style={[styles.optionContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.optionTitle, { color: colors.text.primary }]}>
            {t('modeSelect.cloudTitle')}
          </Text>
          <Text style={[styles.optionSubtitle, { color: colors.text.tertiary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('modeSelect.cloudSub')}
          </Text>
        </View>
        <View style={[styles.optionIconBox, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
          <Cloud size={22} color={isDark ? '#60a5fa' : '#2563eb'} />
        </View>
      </TouchableOpacity>

      {/* Bottom Footer Note */}
      <Text style={[styles.footerText, { color: colors.text.tertiary }]}>
        {t('modeSelect.brandTagline')}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  topIconBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    ...shadows.sm,
  },
  topLogoImg: {
    width: 50,
    height: 50,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#2563eb',
    borderRadius: 24,
    padding: 20,
    gap: 14,
    ...shadows.md,
  },
  heroTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recommendedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recommendedBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  phoneIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitles: {
    gap: 2,
    alignItems: 'center',
  },
  heroMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  heroSubTitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  highlightRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  highlightText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Cairo',
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Cairo',
    fontWeight: '600',
  },
  trialNote: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontFamily: 'Cairo',
    textAlign: 'center',
    lineHeight: 16,
  },
  heroCtaBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.sm,
  },
  heroCtaText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },

  // Divider
  dividerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
  },

  // Option Cards
  optionCard: {
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    ...shadows.xs,
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  optionSubtitle: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },

  // Footer
  footerText: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ModeSelectScreen;
