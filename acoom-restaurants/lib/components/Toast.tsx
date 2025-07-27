import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../constants/theme";
import { getResponsiveSize, getStatusBarHeight } from "../utils/responsive";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastProps extends ToastConfig {
  visible: boolean;
  onHide: () => void;
}

const { width: screenWidth } = Dimensions.get("window");

const Toast: React.FC<ToastProps> = ({
  visible,
  type,
  title,
  message,
  duration = 4000,
  action,
  onHide,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (visible) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getToastConfig = () => {
    const configs = {
      success: {
        backgroundColor: "rgba(16, 185, 129, 0.95)",
        borderColor: "#10b981",
        icon: "checkmark-circle-outline" as const,
        iconColor: "#ffffff",
      },
      error: {
        backgroundColor: "rgba(239, 68, 68, 0.95)",
        borderColor: "#ef4444",
        icon: "close-circle-outline" as const,
        iconColor: "#ffffff",
      },
      warning: {
        backgroundColor: "rgba(245, 158, 11, 0.95)",
        borderColor: "#f59e0b",
        icon: "warning-outline" as const,
        iconColor: "#ffffff",
      },
      info: {
        backgroundColor: "rgba(59, 130, 246, 0.95)",
        borderColor: "#3b82f6",
        icon: "information-circle-outline" as const,
        iconColor: "#ffffff",
      },
    };
    return configs[type];
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: getStatusBarHeight() + theme.spacing.md,
        left: theme.spacing.md,
        right: theme.spacing.md,
        zIndex: 9999,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View
        style={{
          backgroundColor: config.backgroundColor,
          borderRadius: theme.borderRadius.lg,
          borderLeftWidth: 4,
          borderLeftColor: config.borderColor,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          flexDirection: "row",
          alignItems: "flex-start",
          ...theme.shadows.lg,
          maxWidth: screenWidth - theme.spacing.md * 2,
        }}
      >
        <Ionicons
          name={config.icon}
          size={24}
          color={config.iconColor}
          style={{ marginRight: theme.spacing.sm, marginTop: 2 }}
        />

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: getResponsiveSize(theme.typography.sizes.base),
              fontWeight: theme.typography.weights.semibold,
              color: "#ffffff",
              marginBottom: message ? theme.spacing.xs : 0,
            }}
          >
            {title}
          </Text>

          {message && (
            <Text
              style={{
                fontSize: getResponsiveSize(theme.typography.sizes.sm),
                color: "rgba(255, 255, 255, 0.9)",
                lineHeight: 20,
              }}
            >
              {message}
            </Text>
          )}

          {action && (
            <TouchableOpacity
              onPress={action.onPress}
              style={{
                marginTop: theme.spacing.sm,
                alignSelf: "flex-start",
              }}
            >
              <Text
                style={{
                  fontSize: getResponsiveSize(theme.typography.sizes.sm),
                  fontWeight: theme.typography.weights.semibold,
                  color: "#ffffff",
                  textDecorationLine: "underline",
                }}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={hideToast}
          style={{
            padding: theme.spacing.xs,
            marginLeft: theme.spacing.sm,
          }}
        >
          <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Toast Manager Hook
export const useToast = () => {
  const [toasts, setToasts] = useState<(ToastConfig & { id: string })[]>([]);

  const showToast = (config: ToastConfig) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...config, id }]);
  };

  const hideToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const success = (
    title: string,
    message?: string,
    action?: ToastConfig["action"]
  ) => {
    showToast({ type: "success", title, message, action });
  };

  const error = (
    title: string,
    message?: string,
    action?: ToastConfig["action"]
  ) => {
    showToast({ type: "error", title, message, action });
  };

  const warning = (
    title: string,
    message?: string,
    action?: ToastConfig["action"]
  ) => {
    showToast({ type: "warning", title, message, action });
  };

  const info = (
    title: string,
    message?: string,
    action?: ToastConfig["action"]
  ) => {
    showToast({ type: "info", title, message, action });
  };

  const ToastContainer = () => (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          visible={true}
          onHide={() => hideToast(toast.id)}
          {...toast}
        />
      ))}
    </>
  );

  return {
    success,
    error,
    warning,
    info,
    ToastContainer,
  };
};

export default Toast;
