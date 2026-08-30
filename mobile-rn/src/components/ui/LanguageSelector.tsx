import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Globe, Check, X, ChevronDown } from 'lucide-react-native';
import { useI18n } from '@/store/i18nStore';
import { useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';
import type { Language } from '@/locales';

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  badge: string;
  subtitle: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    badge: 'AR',
    subtitle: 'العربية (الافتراضية)',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    badge: 'EN',
    subtitle: 'English (US/UK)',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    badge: 'FR',
    subtitle: 'Français (FR)',
  },
];

/**
 * 3-Card Grid Language Selector for Settings / MoreScreen
 */
export const LanguageSelectorGrid = ({ style }: { style?: any }) => {
  const { language, setLanguage } = useI18n();
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.gridContainer, style]}>
      {LANGUAGES.map((lang) => {
        const isSelected = language === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.cardOption,
              {
                backgroundColor: colors.surface,
                borderColor: isSelected ? colors.primary[600] : colors.border.default,
              },
              isSelected && {
                borderWidth: 2,
                backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50],
              },
            ]}
            onPress={() => setLanguage(lang.code)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.badgeBox,
                {
                  backgroundColor: isSelected
                    ? colors.primary[600]
                    : isDark
                    ? colors.surfaceElevated
                    : colors.slate[100],
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: isSelected ? '#ffffff' : colors.text.secondary },
                ]}
              >
                {lang.badge}
              </Text>
            </View>

            <Text style={[styles.nativeTitle, { color: colors.text.primary }]}>
              {lang.nativeName}
            </Text>
            <Text style={[styles.subTitle, { color: colors.text.tertiary }]}>
              {lang.name}
            </Text>

            {isSelected && (
              <View
                style={[
                  styles.checkBadge,
                  { backgroundColor: colors.primary[600] },
                ]}
              >
                <Check size={11} color="#ffffff" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * Compact Pill / Quick Selector Button for Top Headers / Login / Onboarding
 */
export const LanguageQuickButton = ({
  style,
  variant = 'outline',
}: {
  style?: any;
  variant?: 'outline' | 'ghost' | 'filled';
}) => {
  const { language, setLanguage, metadata } = useI18n();
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.quickBtn,
          variant === 'outline' && {
            borderWidth: 1,
            borderColor: colors.border.default,
            backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
          },
          variant === 'filled' && {
            backgroundColor: isDark ? colors.surfaceElevated : colors.primary[50],
            borderWidth: 1,
            borderColor: colors.primary[200],
          },
          variant === 'ghost' && {
            backgroundColor: 'transparent',
          },
          style,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <Globe size={16} color={colors.primary[600]} />
        <Text style={[styles.quickBtnText, { color: colors.text.primary }]}>
          {metadata.nativeName}
        </Text>
        <ChevronDown size={14} color={colors.text.tertiary} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border.default,
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Globe size={20} color={colors.primary[600]} />
                    <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                      اختيار اللغة / Select Language
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeBtn}
                  >
                    <X size={18} color={colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalList}>
                  {LANGUAGES.map((lang) => {
                    const isSelected = language === lang.code;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          styles.modalLangItem,
                          {
                            borderColor: isSelected
                              ? colors.primary[600]
                              : colors.border.default,
                            backgroundColor: isSelected
                              ? isDark
                                ? colors.surfaceElevated
                                : colors.primary[50]
                              : colors.surface,
                          },
                          isSelected && { borderWidth: 2 },
                        ]}
                        onPress={() => {
                          setLanguage(lang.code);
                          setModalVisible(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.modalLangLeft}>
                          <View
                            style={[
                              styles.modalBadge,
                              {
                                backgroundColor: isSelected
                                  ? colors.primary[600]
                                  : isDark
                                  ? colors.surfaceElevated
                                  : colors.slate[100],
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.modalBadgeText,
                                {
                                  color: isSelected ? '#ffffff' : colors.text.secondary,
                                },
                              ]}
                            >
                              {lang.badge}
                            </Text>
                          </View>
                          <View>
                            <Text
                              style={[
                                styles.modalLangName,
                                { color: colors.text.primary },
                              ]}
                            >
                              {lang.nativeName}
                            </Text>
                            <Text
                              style={[
                                styles.modalLangSub,
                                { color: colors.text.tertiary },
                              ]}
                            >
                              {lang.subtitle}
                            </Text>
                          </View>
                        </View>

                        {isSelected && (
                          <View
                            style={[
                              styles.modalCheck,
                              { backgroundColor: colors.primary[600] },
                            ]}
                          >
                            <Check size={14} color="#ffffff" strokeWidth={3} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Grid styles
  gridContainer: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  cardOption: {
    flex: 1,
    borderRadius: radii.xl,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
    ...shadows.xs,
  },
  badgeBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
    letterSpacing: 0.5,
  },
  nativeTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 10,
    fontFamily: 'Cairo',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Button styles
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    ...shadows.xs,
  },
  quickBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    padding: 20,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  closeBtn: {
    padding: 4,
  },
  modalList: {
    gap: 10,
  },
  modalLangItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radii.xl,
    borderWidth: 1,
  },
  modalLangLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Cairo',
  },
  modalLangName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Cairo',
  },
  modalLangSub: {
    fontSize: 11,
    fontFamily: 'Cairo',
  },
  modalCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LanguageSelectorGrid;
