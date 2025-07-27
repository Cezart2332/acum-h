import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../constants/theme";
import { getResponsiveSize } from "../utils/responsive";

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  shadow?: boolean;
  padding?: keyof typeof theme.spacing;
}

export function Card({
  children,
  style,
  onPress,
  shadow = true,
  padding = "md",
}: CardProps) {
  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[padding],
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    ...(shadow && theme.shadows.md),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({
  title,
  subtitle,
  rightElement,
  style,
}: CardHeaderProps) {
  const headerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: subtitle ? theme.spacing.xs : theme.spacing.sm,
    ...style,
  };

  const titleStyle: TextStyle = {
    fontSize: getResponsiveSize(theme.typography.sizes.lg),
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text.primary,
    flex: 1,
  };

  const subtitleStyle: TextStyle = {
    fontSize: getResponsiveSize(theme.typography.sizes.sm),
    color: theme.colors.text.secondary,
    marginTop: 2,
  };

  return (
    <View style={headerStyle}>
      <View style={{ flex: 1 }}>
        <Text style={titleStyle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={subtitleStyle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style }: CardContentProps) {
  return (
    <View style={[{ marginBottom: theme.spacing.sm }, style]}>{children}</View>
  );
}

interface CardActionsProps {
  children: React.ReactNode;
  style?: ViewStyle;
  direction?: "row" | "column";
  spacing?: keyof typeof theme.spacing;
}

export function CardActions({
  children,
  style,
  direction = "row",
  spacing = "sm",
}: CardActionsProps) {
  const actionsStyle: ViewStyle = {
    flexDirection: direction,
    gap: theme.spacing[spacing],
    ...style,
  };

  return <View style={actionsStyle}>{children}</View>;
}
