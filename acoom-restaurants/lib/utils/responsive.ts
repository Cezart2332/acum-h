import { Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

export const screenDimensions = {
  width,
  height,
  isSmallDevice: width < 375,
  isMediumDevice: width >= 375 && width < 414,
  isLargeDevice: width >= 414,
  isTablet: width >= 768,
};

export const getResponsiveSize = (baseSize: number): number => {
  if (screenDimensions.isSmallDevice) {
    return baseSize * 0.9;
  }
  if (screenDimensions.isLargeDevice) {
    return baseSize * 1.1;
  }
  return baseSize;
};

export const getResponsivePadding = (basePadding: number): number => {
  if (screenDimensions.isTablet) {
    return basePadding * 1.5;
  }
  return getResponsiveSize(basePadding);
};

export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";

export const platformStyles = {
  headerHeight: isIOS ? 44 : 56,
  statusBarHeight: isIOS ? 20 : 0,
  tabBarHeight: isIOS ? 83 : 56,
};

export const getStatusBarHeight = (): number => {
  if (isIOS) {
    // For newer iPhones with notch
    if (height >= 812) {
      return 44;
    }
    return 20;
  }
  return 0;
};

export const getBottomInset = (): number => {
  if (isIOS && height >= 812) {
    return 34; // Home indicator space
  }
  return 0;
};
