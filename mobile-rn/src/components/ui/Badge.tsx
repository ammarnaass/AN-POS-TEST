import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme';
import { radii, spacing } from '@/theme/tokens';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'outline'
    | 'indigo'
    | 'purple'
    | 'emerald';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  icon,
  dot = false,
  style,
  textStyle,
}) => {
  const { colors, isDark } = useTheme();

  const variantStyles = {
    primary: {
      bg: colors.primary[50],
      border: colors.primary[200],
      text: colors.primary[700],
      dot: colors.primary[600],
    },
    success: {
      bg: colors.success.light,
      border: colors.success.border,
      text: colors.success.text,
      dot: colors.success.main,
    },
    warning: {
      bg: colors.warning.light,
      border: colors.warning.border,
      text: colors.warning.text,
      dot: colors.warning.main,
    },
    danger: {
      bg: colors.danger.light,
      border: colors.danger.border,
      text: colors.danger.text,
      dot: colors.danger.main,
    },
    neutral: {
      bg: isDark ? colors.slate[200] : colors.slate[100],
      border: isDark ? colors.slate[300] : colors.slate[200],
      text: isDark ? colors.slate[800] : colors.slate[700],
      dot: colors.slate[500],
    },
    outline: {
      bg: colors.surface,
      border: colors.border.default,
      text: colors.text.secondary,
      dot: colors.slate[400],
    },
    indigo: {
      bg: colors.indigo[50],
      border: colors.indigo[200],
      text: colors.indigo[700],
      dot: colors.indigo[600],
    },
    purple: {
      bg: colors.purple[50],
      border: colors.purple[200],
      text: colors.purple[700],
      dot: colors.purple[600],
    },
    emerald: {
      bg: colors.emerald[50],
      border: colors.emerald[200],
      text: colors.emerald[700],
      dot: colors.emerald[600],
    },
  };

  const current = variantStyles[variant] || variantStyles.neutral;

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: current.bg, borderColor: current.border },
        styles[`size_${size}`],
        style,
      ]}
    >
      {dot ? (
        <View style={[styles.dot, { backgroundColor: current.dot }]} />
      ) : null}
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        style={[
          styles.text,
          { color: current.text },
          styles[`textSize_${size}`],
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  icon: {
    marginLeft: 4,
  },
  // Sizes
  size_xs: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  size_sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2.5,
  },
  size_md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  size_lg: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  // Typography
  text: {
    fontFamily: 'Cairo',
    fontWeight: '700',
  },
  textSize_xs: {
    fontSize: 10,
  },
  textSize_sm: {
    fontSize: 11.5,
  },
  textSize_md: {
    fontSize: 13,
  },
  textSize_lg: {
    fontSize: 14.5,
  },
});

export default Badge;
