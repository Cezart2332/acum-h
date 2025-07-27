import React from "react";
import {
  View,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  ViewStyle,
  RefreshControl,
  RefreshControlProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../context/ThemeContext";
import { PLATFORM, getKeyboardBehavior, getShadow } from "../utils/responsive";

interface UniversalScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: boolean;
  scrollable?: boolean;
  keyboardAvoidingView?: boolean;
  safeAreaEdges?: ("top" | "bottom" | "left" | "right")[];
  statusBarStyle?: "light-content" | "dark-content";
  showStatusBar?: boolean;
  backgroundColor?: string;
  paddingHorizontal?: number;
  paddingVertical?: number;
  contentContainerStyle?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

const UniversalScreen: React.FC<UniversalScreenProps> = ({
  children,
  style,
  gradient = false,
  scrollable = false,
  keyboardAvoidingView = false,
  safeAreaEdges = ["top", "bottom"],
  statusBarStyle,
  showStatusBar = true,
  backgroundColor,
  paddingHorizontal = 0,
  paddingVertical = 0,
  contentContainerStyle,
  refreshControl,
}) => {
  const { theme } = useTheme();

  const screenStyle = [
    styles.container,
    {
      backgroundColor: backgroundColor || theme.colors.primary,
      paddingHorizontal,
      paddingVertical,
    },
    style,
  ];

  const StatusBarComponent = showStatusBar ? (
    <StatusBar
      barStyle={statusBarStyle || theme.statusBarStyle}
      backgroundColor={PLATFORM.isAndroid ? theme.colors.primary : undefined}
      translucent={PLATFORM.isAndroid}
    />
  ) : null;

  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContentContainer,
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          nestedScrollEnabled={true}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      );
    }
    return children;
  };

  const renderWithKeyboardAvoidingView = (content: React.ReactNode) => {
    if (keyboardAvoidingView) {
      return (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={getKeyboardBehavior()}
          keyboardVerticalOffset={PLATFORM.isIOS ? 0 : 20}
          enabled={true}
        >
          {content}
        </KeyboardAvoidingView>
      );
    }
    return content;
  };

  const renderWithGradient = (content: React.ReactNode) => {
    if (gradient) {
      return (
        <LinearGradient
          colors={[
            theme.colors.gradientStart,
            theme.colors.gradientEnd,
            theme.colors.secondary,
          ]}
          style={styles.gradientContainer}
        >
          {content}
        </LinearGradient>
      );
    }
    return <View style={screenStyle}>{content}</View>;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={safeAreaEdges}>
      {StatusBarComponent}
      {renderWithGradient(renderWithKeyboardAvoidingView(renderContent()))}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  gradientContainer: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
});

export default UniversalScreen;
