import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { colors, radii, spacing, shadows } from '@/theme';

export interface ButtonProps {
  onPress: () => void;
  children?: React.ReactNode;
  title?: string;
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'ghost'
    | 'success'
    | 'indigo'
    | 'purple'
    | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  children,
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'right',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const content = children || title;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        variant === 'primary' && styles.primaryShadow,
        variant === 'success' && styles.successShadow,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'outline' || variant === 'ghost'
              ? colors.primary[600]
              : '#ffffff'
          }
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'right' ? (
            <View style={styles.iconRight}>{icon}</View>
          ) : null}
          {content ? (
            <Text
              style={[
                styles.text,
                styles[`text_${variant}`],
                styles[`textSize_${size}`],
                textStyle,
              ]}
            >
              {content}
            </Text>
          ) : null}
          {icon && iconPosition === 'left' ? (
            <View style={styles.iconLeft}>{icon}</View>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primaryShadow: {
    ...shadows.glowPrimary,
  },
  successShadow: {
    ...shadows.glowSuccess,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
    shadowColor: 'transparent',
    elevation: 0,
  },
  // Variants
  primary: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[700],
  },
  secondary: {
    backgroundColor: colors.slate[100],
    borderColor: colors.slate[200],
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.border.default,
  },
  destructive: {
    backgroundColor: colors.danger.main,
    borderColor: colors.danger.dark,
  },
  success: {
    backgroundColor: colors.success.main,
    borderColor: colors.success.dark,
  },
  emerald: {
    backgroundColor: colors.emerald[600],
    borderColor: colors.emerald[700],
  },
  indigo: {
    backgroundColor: colors.indigo[600],
    borderColor: colors.indigo[700],
  },
  purple: {
    backgroundColor: colors.purple[600],
    borderColor: colors.purple[700],
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  // Sizes
  size_sm: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    minHeight: 46,
  },
  size_lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.xl,
    minHeight: 54,
  },
  // Typography
  text: {
    fontFamily: 'Cairo',
    fontWeight: '700',
    textAlign: 'center',
  },
  text_primary: {
    color: '#ffffff',
  },
  text_secondary: {
    color: colors.slate[800],
  },
  text_outline: {
    color: colors.slate[800],
  },
  text_destructive: {
    color: '#ffffff',
  },
  text_success: {
    color: '#ffffff',
  },
  text_emerald: {
    color: '#ffffff',
  },
  text_indigo: {
    color: '#ffffff',
  },
  text_purple: {
    color: '#ffffff',
  },
  text_ghost: {
    color: colors.primary[600],
  },
  textSize_sm: {
    fontSize: 12.5,
  },
  textSize_md: {
    fontSize: 14.5,
  },
  textSize_lg: {
    fontSize: 16,
  },
});

