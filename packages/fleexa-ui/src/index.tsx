import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export const colors = {
  canvas: '#F7F8FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F6',
  border: '#D8DEE8',
  text: '#121826',
  textMuted: '#5C667A',
  teal: '#0EA5A0',
  green: '#2F9E62',
  amber: '#B7791F',
  red: '#C43D4B',
  navy: '#162033',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 8,
} as const;

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  leftIcon,
  style,
  testID,
}: ButtonProps) => {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        isDisabled && styles.buttonDisabled,
        pressed && !isDisabled && styles.buttonPressed,
        style,
      ]}
      testID={testID}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : colors.text} /> : leftIcon}
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`], isDisabled && styles.buttonTextDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
};

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  leftIcon?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = ({ label, error, leftIcon, containerStyle, style, ...props }: TextFieldProps) => (
  <View style={[styles.field, containerStyle]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputWrap, error && styles.inputError]}>
      {leftIcon ? <View style={styles.inputIcon}>{leftIcon}</View> : null}
      <TextInput
        placeholderTextColor="#7A8497"
        style={[styles.input, style]}
        {...props}
      />
    </View>
    {error ? <Text style={styles.fieldError}>{error}</Text> : null}
  </View>
);

export interface StatusPillProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const StatusPill = ({ label, tone = 'neutral', style, textStyle }: StatusPillProps) => (
  <View style={[styles.pill, styles[`pill_${tone}`], style]}>
    <Text style={[styles.pillText, styles[`pillText_${tone}`], textStyle]}>{label}</Text>
  </View>
);

export interface ScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const Screen = ({ children, style }: ScreenProps) => (
  <View style={[styles.screen, style]}>{children}</View>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  button: {
    minHeight: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  button_primary: {
    backgroundColor: colors.teal,
  },
  button_secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  button_ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  button_danger: {
    backgroundColor: colors.red,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonText_primary: {
    color: '#FFFFFF',
  },
  buttonText_secondary: {
    color: colors.text,
  },
  buttonText_ghost: {
    color: colors.text,
  },
  buttonText_danger: {
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: colors.textMuted,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  inputWrap: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    paddingLeft: spacing.md,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.red,
  },
  fieldError: {
    color: colors.red,
    fontSize: 12,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pill_neutral: {
    backgroundColor: colors.surfaceMuted,
  },
  pill_success: {
    backgroundColor: '#E6F6EF',
  },
  pill_warning: {
    backgroundColor: '#FFF4D8',
  },
  pill_danger: {
    backgroundColor: '#FDE7EA',
  },
  pill_info: {
    backgroundColor: '#E7F7F6',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillText_neutral: {
    color: colors.textMuted,
  },
  pillText_success: {
    color: colors.green,
  },
  pillText_warning: {
    color: colors.amber,
  },
  pillText_danger: {
    color: colors.red,
  },
  pillText_info: {
    color: colors.teal,
  },
});
