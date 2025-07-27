import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
} from "react-native";
import { theme } from "../constants/theme";
import { getResponsiveSize } from "../utils/responsive";

interface ButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      ...theme.shadows.md,
    };

    // Size variants
    const sizeStyles: Record<typeof size, ViewStyle> = {
      sm: {
        paddingVertical: getResponsiveSize(8),
        paddingHorizontal: getResponsiveSize(16),
        minHeight: getResponsiveSize(36),
      },
      md: {
        paddingVertical: getResponsiveSize(12),
        paddingHorizontal: getResponsiveSize(24),
        minHeight: getResponsiveSize(48),
      },
      lg: {
        paddingVertical: getResponsiveSize(16),
        paddingHorizontal: getResponsiveSize(32),
        minHeight: getResponsiveSize(56),
      },
    };

    // Color variants
    const colorStyles: Record<typeof variant, ViewStyle> = {
      primary: {
        backgroundColor: disabled
          ? theme.colors.gray[500]
          : theme.colors.primary[600],
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: disabled
          ? theme.colors.gray[700]
          : theme.colors.background.secondary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: disabled
          ? theme.colors.gray[500]
          : theme.colors.primary[600],
      },
      ghost: {
        backgroundColor: "transparent",
        borderWidth: 0,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...colorStyles[variant],
      width: fullWidth ? "100%" : undefined,
      opacity: disabled || loading ? 0.6 : 1,
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: theme.typography.weights.semibold,
    };

    const sizeTextStyles: Record<typeof size, TextStyle> = {
      sm: { fontSize: getResponsiveSize(theme.typography.sizes.sm) },
      md: { fontSize: getResponsiveSize(theme.typography.sizes.base) },
      lg: { fontSize: getResponsiveSize(theme.typography.sizes.lg) },
    };

    const colorTextStyles: Record<typeof variant, TextStyle> = {
      primary: { color: theme.colors.text.primary },
      secondary: { color: theme.colors.text.primary },
      outline: {
        color: disabled ? theme.colors.gray[500] : theme.colors.primary[600],
      },
      ghost: { color: theme.colors.primary[600] },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...colorTextStyles[variant],
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      activeOpacity={0.7}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" || variant === "ghost"
              ? theme.colors.primary[600]
              : theme.colors.text.primary
          }
          style={{ marginRight: theme.spacing.sm }}
        />
      )}
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
}
