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

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  backgroundColor?: string;
  centerTitle?: boolean;
}

export default function Header({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  style,
  titleStyle,
  backgroundColor = theme.colors.background.primary,
  centerTitle = true,
}: HeaderProps) {
  const headerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor,
    minHeight: getResponsiveSize(60),
    ...style,
  };

  const titleContainerStyle: ViewStyle = {
    flex: 1,
    alignItems: centerTitle ? "center" : "flex-start",
    marginHorizontal: theme.spacing.sm,
  };

  const defaultTitleStyle: TextStyle = {
    fontSize: getResponsiveSize(theme.typography.sizes["2xl"]),
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text.primary,
    ...titleStyle,
  };

  const subtitleStyle: TextStyle = {
    fontSize: getResponsiveSize(theme.typography.sizes.sm),
    color: theme.colors.text.secondary,
    marginTop: 2,
  };

  const iconButtonStyle: ViewStyle = {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  };

  const IconButton = ({
    iconName,
    onPress,
    accessibilityLabel,
  }: {
    iconName: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    accessibilityLabel: string;
  }) => (
    <TouchableOpacity
      style={iconButtonStyle}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.7}
    >
      <Ionicons
        name={iconName}
        size={getResponsiveSize(24)}
        color={theme.colors.primary[400]}
      />
    </TouchableOpacity>
  );

  return (
    <View style={headerStyle}>
      {/* Left Icon */}
      <View style={{ width: 44 }}>
        {leftIcon && onLeftPress && (
          <IconButton
            iconName={leftIcon}
            onPress={onLeftPress}
            accessibilityLabel="Înapoi"
          />
        )}
      </View>

      {/* Title and Subtitle */}
      <View style={titleContainerStyle}>
        <Text style={defaultTitleStyle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={subtitleStyle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Icon */}
      <View style={{ width: 44 }}>
        {rightIcon && onRightPress && (
          <IconButton
            iconName={rightIcon}
            onPress={onRightPress}
            accessibilityLabel="Meniu"
          />
        )}
      </View>
    </View>
  );
}
