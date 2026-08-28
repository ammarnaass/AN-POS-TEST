import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react-native';
import { notify, type ToastMessage } from '@/lib/notify';
import { useThemeStore } from '@/store/themeStore';
import { radii, spacing, typography, shadows } from '@/theme';

export const ToastContainer = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-20));
  const { colors, isDark } = useThemeStore();

  useEffect(() => {
    const unsubscribe = notify.subscribe((msg) => {
      if (msg) {
        setToast(msg);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }
    });

    return () => unsubscribe();
  }, []);

  if (!toast) return null;

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={20} color={isDark ? colors.success.main : colors.success.dark} />;
      case 'warning':
        return <AlertTriangle size={20} color={isDark ? colors.warning.main : colors.warning.dark} />;
      case 'error':
        return <AlertCircle size={20} color={isDark ? colors.danger.main : colors.danger.dark} />;
      default:
        return <Info size={20} color={colors.primary[600]} />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return colors.success.border;
      case 'warning':
        return colors.warning.border;
      case 'error':
        return colors.danger.border;
      default:
        return colors.primary[300];
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.surface,
          borderColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>{getIcon()}</View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text.primary }]}>{toast.title}</Text>
          <Text style={[styles.message, { color: colors.text.secondary }]} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setToast(null)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeButton}
        >
          <X size={16} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    padding: spacing.md,
    ...shadows.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.fontFamily.arabicBold,
    textAlign: 'right',
  },
  message: {
    fontSize: 11.5,
    fontFamily: typography.fontFamily.arabic,
    textAlign: 'right',
    marginTop: 1,
  },
  closeButton: {
    padding: 4,
  },
});

export default ToastContainer;
