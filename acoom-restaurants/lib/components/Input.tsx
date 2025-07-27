import React, { useState, useCallback } from "react";
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../constants/theme";
import { getResponsiveSize } from "../utils/responsive";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  variant?: "default" | "filled" | "outlined";
  size?: "sm" | "md" | "lg";
  required?: boolean;
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  variant = "default",
  size = "md",
  required = false,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const getSizeStyles = () => {
    const sizes = {
      sm: {
        height: getResponsiveSize(40),
        fontSize: getResponsiveSize(theme.typography.sizes.sm),
        paddingHorizontal: theme.spacing.sm,
      },
      md: {
        height: getResponsiveSize(48),
        fontSize: getResponsiveSize(theme.typography.sizes.base),
        paddingHorizontal: theme.spacing.md,
      },
      lg: {
        height: getResponsiveSize(56),
        fontSize: getResponsiveSize(theme.typography.sizes.lg),
        paddingHorizontal: theme.spacing.lg,
      },
    };
    return sizes[size];
  };

  const getInputContainerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      ...getSizeStyles(),
    };

    const variantStyles: Record<typeof variant, ViewStyle> = {
      default: {
        backgroundColor: theme.colors.background.accent,
        borderColor: error
          ? theme.colors.text.error
          : isFocused
          ? theme.colors.primary[600]
          : theme.colors.border.primary,
      },
      filled: {
        backgroundColor: theme.colors.gray[100],
        borderColor: "transparent",
      },
      outlined: {
        backgroundColor: "transparent",
        borderColor: error
          ? theme.colors.text.error
          : isFocused
          ? theme.colors.primary[600]
          : theme.colors.border.secondary,
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

  const getInputStyle = (): TextStyle => {
    return {
      flex: 1,
      color: theme.colors.text.primary,
      fontSize: getSizeStyles().fontSize,
      paddingLeft: leftIcon ? theme.spacing.sm : 0,
      paddingRight: rightIcon ? theme.spacing.sm : 0,
      ...inputStyle,
    };
  };

  const iconColor = error
    ? theme.colors.text.error
    : isFocused
    ? theme.colors.primary[400]
    : theme.colors.text.secondary;

  const iconSize = getSizeStyles().fontSize + 4;

  return (
    <View style={[{ marginBottom: theme.spacing.md }, containerStyle]}>
      {label && (
        <Text
          style={{
            fontSize: getResponsiveSize(theme.typography.sizes.sm),
            fontWeight: theme.typography.weights.medium,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.xs,
          }}
        >
          {label}
          {required && (
            <Text style={{ color: theme.colors.text.error }}> *</Text>
          )}
        </Text>
      )}

      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={iconSize}
            color={iconColor}
            style={{ marginLeft: theme.spacing.sm }}
          />
        )}

        <TextInput
          style={getInputStyle()}
          placeholderTextColor={theme.colors.text.muted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...textInputProps}
        />

        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{ padding: theme.spacing.sm }}
            disabled={!onRightIconPress}
          >
            <Ionicons name={rightIcon} size={iconSize} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text
          style={{
            fontSize: getResponsiveSize(theme.typography.sizes.xs),
            color: theme.colors.text.error,
            marginTop: theme.spacing.xs,
            marginLeft: theme.spacing.sm,
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}
