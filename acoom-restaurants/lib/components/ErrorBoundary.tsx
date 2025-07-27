import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../constants/theme";
import { getResponsiveSize } from "../utils/responsive";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Here you could log to crash analytics service
    // Example: crashlytics().recordError(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background.primary,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: theme.spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.background.secondary,
              borderRadius: theme.borderRadius.xl,
              padding: theme.spacing.xl,
              alignItems: "center",
              width: "100%",
              maxWidth: 400,
              ...theme.shadows.lg,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: theme.spacing.lg,
              }}
            >
              <Ionicons
                name="warning-outline"
                size={40}
                color={theme.colors.text.error}
              />
            </View>

            <Text
              style={{
                fontSize: getResponsiveSize(theme.typography.sizes["2xl"]),
                fontWeight: theme.typography.weights.bold,
                color: theme.colors.text.primary,
                textAlign: "center",
                marginBottom: theme.spacing.sm,
              }}
            >
              Oops! Ceva nu a mers bine
            </Text>

            <Text
              style={{
                fontSize: getResponsiveSize(theme.typography.sizes.base),
                color: theme.colors.text.secondary,
                textAlign: "center",
                marginBottom: theme.spacing.xl,
                lineHeight: 24,
              }}
            >
              A apărut o eroare neașteptată în aplicație. Te rog să încerci din
              nou.
            </Text>

            {__DEV__ && this.state.error && (
              <View
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderRadius: theme.borderRadius.md,
                  padding: theme.spacing.md,
                  marginBottom: theme.spacing.lg,
                  width: "100%",
                }}
              >
                <Text
                  style={{
                    fontSize: getResponsiveSize(theme.typography.sizes.xs),
                    color: theme.colors.text.error,
                    fontFamily: "monospace",
                  }}
                >
                  {this.state.error.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: theme.colors.primary[600],
                borderRadius: theme.borderRadius.lg,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.xl,
                width: "100%",
                alignItems: "center",
                ...theme.shadows.md,
              }}
              onPress={this.handleRetry}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: getResponsiveSize(theme.typography.sizes.base),
                  fontWeight: theme.typography.weights.semibold,
                  color: theme.colors.text.primary,
                }}
              >
                Încearcă din nou
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
