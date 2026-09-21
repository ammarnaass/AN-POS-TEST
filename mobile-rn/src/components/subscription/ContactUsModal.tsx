import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  X,
  Sparkles,
  Phone,
  MessageCircle,
  Mail,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/store/i18nStore';
import { radii, spacing, shadows } from '@/theme/tokens';
import { SUPPORT_CONTACT } from '@/lib/subscriptionService';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { notify } from '@/lib/notify';

interface ContactUsModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ContactUsModal: React.FC<ContactUsModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const { t, isRTL } = useI18n();
  const { activateAdFree } = useSubscriptionStore();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWhatsApp = async () => {
    const msg = encodeURIComponent(
      SUPPORT_CONTACT.whatsappMessage || 'مرحباً، أود تفعيل النسخة الكاملة لتطبيق AN POS وحذف الإعلانات.'
    );
    const appUrl = `whatsapp://send?phone=${SUPPORT_CONTACT.whatsapp}&text=${msg}`;
    const webUrl = `https://wa.me/${SUPPORT_CONTACT.whatsapp}?text=${msg}`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
        return;
      }
    } catch {}

    Linking.openURL(webUrl).catch(() => {
      notify.error(t('subscription.contactWhatsappFailed') || 'تعذر فتح تطبيق واتساب');
    });
  };

  const handlePhone = () => {
    const url = `tel:${SUPPORT_CONTACT.phone}`;
    Linking.openURL(url).catch(() => {
      notify.error(t('subscription.contactPhoneFailed') || 'تعذر إجراء الاتصال');
    });
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('طلب تفعيل النسخة الكاملة لتطبيق AN POS - حذف الإعلانات');
    const body = encodeURIComponent(
      'مرحباً،\n\nأود الحصول على كود تفعيل النسخة الكاملة لتطبيق AN POS لإزالة الإعلانات والحصول على رصيد مبيعات غير محدود.\n\nوشكراً.'
    );
    const url = `mailto:${SUPPORT_CONTACT.email}?subject=${subject}&body=${body}`;
    Linking.openURL(url).catch(() => {
      notify.error('تعذر فتح تطبيق البريد الإلكتروني');
    });
  };

  const handleActivate = async () => {
    if (!code.trim()) {
      notify.warning(t('subscription.enterCodePrompt') || 'يرجى إدخال كود التفعيل');
      return;
    }

    setLoading(true);
    try {
      const res = await activateAdFree(code);
      if (res.success) {
        notify.success(t('subscription.activationSuccess') || 'تم تفعيل النسخة الكاملة بنجاح!');
        setCode('');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        notify.error(res.error || t('subscription.invalidLicense'));
      }
    } catch (e) {
      notify.error(e, 'حدث خطأ أثناء التفعيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Icon */}
            <View
              style={[
                styles.headerIconWrapper,
                {
                  backgroundColor: isDark
                    ? 'rgba(245, 158, 11, 0.15)'
                    : '#fef3c7',
                },
              ]}
            >
              <Sparkles size={32} color="#f59e0b" />
            </View>

            {/* Title & Subtitle */}
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {t('subscription.removeAdsTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
              {t('subscription.removeAdsSubtitle')}
            </Text>

            {/* Feature Benefits List */}
            <View
              style={[
                styles.benefitsCard,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : '#f8fafc',
                  borderColor: colors.border.default,
                },
              ]}
            >
              <View style={[styles.benefitRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <CheckCircle2 size={16} color={colors.emerald[600]} />
                <Text style={[styles.benefitText, { color: colors.text.primary }]}>
                  إزالة كاملة للإعلانات من جميع الشاشات
                </Text>
              </View>

              <View style={[styles.benefitRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Zap size={16} color="#f59e0b" />
                <Text style={[styles.benefitText, { color: colors.text.primary }]}>
                  رصيد مبيعات غير محدود بدون أي قيود أو شحن
                </Text>
              </View>

              <View style={[styles.benefitRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ShieldCheck size={16} color={colors.primary[600]} />
                <Text style={[styles.benefitText, { color: colors.text.primary }]}>
                  فتح دائم لجميع الميزات المتقدمة (الربحية، الزكاة، المستودعات)
                </Text>
              </View>
            </View>

            {/* Contact Channels */}
            <Text style={[styles.sectionHeading, { color: colors.text.primary }]}>
              {t('subscription.contactChannelsTitle')}
            </Text>

            <View style={styles.contactButtonsGrid}>
              {/* WhatsApp Button */}
              <TouchableOpacity
                style={[
                  styles.contactCardBtn,
                  {
                    backgroundColor: isDark ? 'rgba(37, 211, 102, 0.12)' : '#ecfdf5',
                    borderColor: isDark ? '#059669' : '#10b981',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={handleWhatsApp}
                activeOpacity={0.85}
              >
                <View style={[styles.contactIconCircle, { backgroundColor: '#25D366' }]}>
                  <MessageCircle size={22} color="#ffffff" />
                </View>
                <View style={[styles.contactCardContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.contactCardTitle, { color: isDark ? '#6ee7b7' : '#065f46' }]}>
                    زر واتساب (WhatsApp)
                  </Text>
                  <Text style={[styles.contactCardSub, { color: isDark ? '#a7f3d0' : '#047857' }]}>
                    {SUPPORT_CONTACT.phoneDisplay} — يفتح محادثة جاهزة مباشرة
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Phone Call Button */}
              <TouchableOpacity
                style={[
                  styles.contactCardBtn,
                  {
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : '#eff6ff',
                    borderColor: isDark ? '#2563eb' : '#3b82f6',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={handlePhone}
                activeOpacity={0.85}
              >
                <View style={[styles.contactIconCircle, { backgroundColor: colors.primary[600] }]}>
                  <Phone size={21} color="#ffffff" />
                </View>
                <View style={[styles.contactCardContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.contactCardTitle, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                    زر اتصال هاتفي مباشر (Phone Call)
                  </Text>
                  <Text style={[styles.contactCardSub, { color: isDark ? '#bfdbfe' : '#2563eb' }]}>
                    {SUPPORT_CONTACT.phoneDisplay} — يفتح لوحة الاتصال فوراً
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Email Button */}
              <TouchableOpacity
                style={[
                  styles.contactCardBtn,
                  {
                    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#f5f3ff',
                    borderColor: isDark ? '#7c3aed' : '#8b5cf6',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={handleEmail}
                activeOpacity={0.85}
              >
                <View style={[styles.contactIconCircle, { backgroundColor: '#7c3aed' }]}>
                  <Mail size={20} color="#ffffff" />
                </View>
                <View style={[styles.contactCardContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.contactCardTitle, { color: isDark ? '#c4b5fd' : '#5b21b6' }]}>
                    زر البريد الإلكتروني (Email)
                  </Text>
                  <Text style={[styles.contactCardSub, { color: isDark ? '#ddd6fe' : '#6d28d9' }]}>
                    {SUPPORT_CONTACT.email}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Activation Code Section */}
            <View
              style={[
                styles.activationBox,
                {
                  backgroundColor: isDark ? colors.surfaceSubtle : '#f1f5f9',
                  borderColor: colors.border.default,
                },
              ]}
            >
              <View style={[styles.activationHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <KeyRound size={17} color={colors.amber[600]} />
                <Text style={[styles.activationTitle, { color: colors.text.primary }]}>
                  {t('subscription.haveActivationCode')}
                </Text>
              </View>

              <View style={[styles.activationInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TextInput
                  style={[
                    styles.licenseInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border.default,
                      color: colors.text.primary,
                      textAlign: 'center',
                    },
                  ]}
                  placeholder={t('subscription.licenseKeyPlaceholder')}
                  placeholderTextColor={colors.text.tertiary}
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.activateButton,
                    {
                      backgroundColor: colors.primary[600],
                    },
                  ]}
                  onPress={handleActivate}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.activateButtonText}>
                      {t('subscription.activateLicense')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    maxWidth: 440,
    maxHeight: '90%',
    borderRadius: radii.xl,
    borderWidth: 1,
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
  scrollContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  headerIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  benefitsCard: {
    width: '100%',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  benefitRow: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    alignSelf: 'stretch',
    marginBottom: spacing.sm,
  },
  contactButtonsGrid: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  contactCardBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  contactIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCardContent: {
    flex: 1,
    gap: 2,
  },
  contactCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  contactCardSub: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  activationBox: {
    width: '100%',
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activationHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  activationTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  activationInputRow: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  licenseInput: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  activateButton: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activateButtonText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

export default ContactUsModal;
