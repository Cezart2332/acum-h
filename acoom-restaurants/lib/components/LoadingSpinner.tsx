import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { theme } from "../constants/theme";
import { getResponsiveSize } from "../utils/responsive";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  color?: string;
  text?: string;
  overlay?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function LoadingSpinner({
  size = "large",
  color = theme.colors.primary[600],
  text,
  overlay = false,
  style,
  textStyle,
}: LoadingSpinnerProps) {
  const containerStyle: ViewStyle = {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    ...(overlay && {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 999,
    }),
    ...style,
  };

  const defaultTextStyle: TextStyle = {
    color: theme.colors.text.primary,
    fontSize: getResponsiveSize(theme.typography.sizes.base),
    fontWeight: theme.typography.weights.medium,
    marginTop: theme.spacing.md,
    textAlign: "center",
    ...textStyle,
  };

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={defaultTextStyle}>{text}</Text>}
    </View>
  );
}

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

export function LoadingOverlay({
  visible,
  text = "Se încarcă...",
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <LoadingSpinner
      overlay
      text={text}
      style={{
        backgroundColor: "rgba(15, 8, 23, 0.8)",
      }}
    />
  );
}
