import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp, TouchableOpacity } from 'react-native';
import { useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'subtle' | 'outlined' | 'elevated' | 'primary' | 'success' | 'danger';
  onPress?: () => void;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  activeOpacity = 0.8,
}) => {
  const { colors, isDark } = useTheme();

  const dynamicStyles = {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border.default,
    },
    subtle: {
      backgroundColor: colors.surfaceSubtle,
      borderColor: colors.border.subtle,
    },
    outlined: {
      backgroundColor: colors.surface,
      borderColor: colors.border.default,
      shadowColor: 'transparent',
      elevation: 0,
    },
    elevated: {
      backgroundColor: colors.surfaceElevated,
      borderColor: isDark ? colors.border.emphasis : 'rgba(226, 232, 240, 0.8)',
    },
    primary: {
      backgroundColor: colors.primary[50],
      borderColor: colors.primary[200],
    },
    success: {
      backgroundColor: colors.emerald[50],
      borderColor: colors.emerald[200],
    },
    danger: {
      backgroundColor: colors.danger.light,
      borderColor: colors.danger.border,
    },
  };

  const cardStyle = [
    styles.cardBase,
    dynamicStyles.card,
    variant === 'subtle' && dynamicStyles.subtle,
    variant === 'outlined' && dynamicStyles.outlined,
    variant === 'elevated' && dynamicStyles.elevated,
    variant === 'primary' && dynamicStyles.primary,
    variant === 'success' && dynamicStyles.success,
    variant === 'danger' && dynamicStyles.danger,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={onPress}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

export const CardTitle: React.FC<{
  children: React.ReactNode;
  subtitle?: string;
  style?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}> = ({ children, subtitle, style, icon }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.titleWrapper}>
      {icon ? (
        <View style={[styles.titleIcon, { backgroundColor: colors.primary[50] }]}>
          {icon}
        </View>
      ) : null}
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text.primary }, style]}>{children}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.text.secondary }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

export const CardContent: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  return <View style={[styles.content, style]}>{children}</View>;
};

export const CardFooter: React.FC<{
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}> = ({ children, style }) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  titleIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Cairo',
    marginTop: 2,
    textAlign: 'right',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
});

export default Card;
