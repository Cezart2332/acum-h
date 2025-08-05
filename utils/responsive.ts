import { Dimensions, Platform, PixelRatio } from "react-native";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Screen breakpoints
export const BREAKPOINTS = {
  small: 375,
  medium: 768,
  large: 1024,
  xlarge: 1280,
};

// Device types
export const DEVICE_TYPES = {
  isSmallDevice: screenWidth < BREAKPOINTS.small,
  isMediumDevice:
    screenWidth >= BREAKPOINTS.small && screenWidth < BREAKPOINTS.medium,
  isLargeDevice:
    screenWidth >= BREAKPOINTS.medium && screenWidth < BREAKPOINTS.large,
  isXLargeDevice: screenWidth >= BREAKPOINTS.large,
  isTablet: screenWidth >= BREAKPOINTS.medium,
};

// Platform utilities
export const PLATFORM = {
  isIOS: Platform.OS === "ios",
  isAndroid: Platform.OS === "android",
  isWeb: Platform.OS === "web",
};

// Get responsive font size
export const getResponsiveFontSize = (size: number): number => {
  const baseWidth = 375; // iPhone 6/7/8 width as base
  const ratio = screenWidth / baseWidth;
  const newSize = size * ratio;

  // Ensure the font doesn't get too small or too large
  const minSize = size * 0.8;
  const maxSize = size * 1.2;

  return Math.max(minSize, Math.min(maxSize, newSize));
};

// Get scaled size based on device
export const getScaledSize = (size: number): number => {
  const fontScale = PixelRatio.getFontScale();
  return size / fontScale;
};

// Get responsive width/height
export const getResponsiveWidth = (percentage: number): number => {
  return (screenWidth * percentage) / 100;
};

export const getResponsiveHeight = (percentage: number): number => {
  return (screenHeight * percentage) / 100;
};

// Spacing system
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Get responsive spacing
export const getResponsiveSpacing = (size: keyof typeof SPACING): number => {
  const baseSpacing = SPACING[size];
  return getResponsiveFontSize(baseSpacing);
};

// Shadow utilities
export const getShadow = (elevation: number = 4) => {
  if (PLATFORM.isIOS) {
    return {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: elevation / 2 },
      shadowOpacity: elevation <= 2 ? 0.15 : elevation <= 4 ? 0.2 : 0.25,
      shadowRadius: elevation * 1.5,
    };
  } else {
    return {
      elevation: elevation + 2, // Slightly more pronounced on Android
    };
  }
};

// Safe area utilities
export const getSafeAreaStyle = () => {
  if (PLATFORM.isIOS) {
    return {
      paddingTop: 44, // Status bar height
      paddingBottom: 34, // Home indicator height
    };
  } else {
    return {
      paddingTop: 24, // Status bar height
      paddingBottom: 0,
    };
  }
};

// Keyboard avoiding behavior
export const getKeyboardBehavior = (): "padding" | "height" | "position" => {
  return PLATFORM.isIOS ? "padding" : "height";
};

// Screen dimensions
export const SCREEN_DIMENSIONS = {
  width: screenWidth,
  height: screenHeight,
  isLandscape: screenWidth > screenHeight,
  isPortrait: screenHeight > screenWidth,
};

// Typography scale
export const TYPOGRAPHY = {
  h1: getResponsiveFontSize(32),
  h2: getResponsiveFontSize(28),
  h3: getResponsiveFontSize(24),
  h4: getResponsiveFontSize(20),
  h5: getResponsiveFontSize(18),
  h6: getResponsiveFontSize(16),
  body: getResponsiveFontSize(16),
  bodySmall: getResponsiveFontSize(14),
  caption: getResponsiveFontSize(12),
  tiny: getResponsiveFontSize(10),
};

// Animation configurations
export const ANIMATION = {
  timing: {
    fast: 200,
    medium: 300,
    slow: 500,
  },
  easing: {
    easeInOut: "easeInOut",
    easeIn: "easeIn",
    easeOut: "easeOut",
  },
};

// Haptic feedback utility (safe version that won't crash)
export const hapticFeedback = (
  type: "light" | "medium" | "heavy" = "medium"
) => {
  try {
    if (PLATFORM.isIOS) {
      // Try to use expo-haptics for iOS
      try {
        const Haptics = require("expo-haptics");
        if (Haptics && Haptics.impactAsync) {
          switch (type) {
            case "light":
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              break;
            case "medium":
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              break;
            case "heavy":
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              break;
          }
        }
      } catch (hapticsError) {
        // Silently fail if expo-haptics is not available
        console.warn("expo-haptics not available:", hapticsError);
      }
    } else if (PLATFORM.isAndroid) {
      // Use React Native's built-in Vibration for Android
      try {
        const { Vibration } = require("react-native");
        const duration = type === "light" ? 25 : type === "medium" ? 50 : 75;
        if (Vibration && Vibration.vibrate) {
          Vibration.vibrate(duration);
        }
      } catch (vibrationError) {
        console.warn("Vibration not available:", vibrationError);
      }
    }
  } catch (error) {
    // Silently ignore all haptic feedback errors
    console.warn("Haptic feedback error:", error);
  }
};

// Color utilities
export const adjustOpacity = (color: string, opacity: number): string => {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const alpha = Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0");
    return `${color}${alpha}`;
  }
  return color;
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 8; // Changed from 6 to 8 to match backend
};

// Debounce utility
export const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle utility
export const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return (...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
