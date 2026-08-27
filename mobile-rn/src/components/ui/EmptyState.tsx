import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onAction,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon ? (
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: colors.primary[50],
              borderColor: colors.primary[200],
            },
          ]}
        >
          {icon}
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.text.secondary }]}>{description}</Text>
      ) : null}
      {actionTitle && onAction ? (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="sm"
          style={styles.actionBtn}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: radii.circle,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.xs,
  },
  title: {
    fontSize: 16.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Cairo',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 21,
  },
  actionBtn: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
});
