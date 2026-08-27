import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
  TextInputProps,
} from 'react-native';
import { X, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { radii, spacing, shadows } from '@/theme/tokens';

export interface InputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  onFocus?: TextInputProps['onFocus'];
  onBlur?: TextInputProps['onBlur'];
  textAlign?: TextInputProps['textAlign'];
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  [key: string]: any;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  clearable = false,
  onClear,
  value,
  onChangeText,
  containerStyle,
  inputStyle,
  placeholderTextColor,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    if (onChangeText) onChangeText('');
    if (onClear) onClear();
  };

  const showClear = clearable && value && value.length > 0;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBg,
            borderColor: isFocused ? colors.primary[500] : colors.border.default,
          },
          !!error && { borderColor: colors.danger.main },
        ]}
      >
        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}

        <TextInput
          style={[styles.input, { color: colors.text.primary }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={placeholderTextColor || colors.slate[400]}
          textAlign="right"
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          {...props}
        />

        {showClear ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn} activeOpacity={0.7}>
            <X size={13} color={colors.slate[500]} />
          </TouchableOpacity>
        ) : null}

        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <AlertCircle size={12} color={colors.danger.main} />
          <Text style={[styles.errorText, { color: colors.danger.main }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.text.tertiary }]}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: 'Cairo',
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    minHeight: 46,
    ...shadows.xs,
  },
  input: {
    flex: 1,
    fontFamily: 'Cairo',
    fontSize: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  errorText: {
    fontSize: 11.5,
    fontFamily: 'Cairo',
  },
  hintText: {
    fontSize: 11,
    fontFamily: 'Cairo',
    marginTop: 4,
    textAlign: 'right',
  },
});

export default Input;
