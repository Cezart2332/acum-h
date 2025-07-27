import React from "react";
import {
  View,
  ViewStyle,
  SafeAreaView as RNSafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { theme } from "../constants/theme";
import { getStatusBarHeight, getBottomInset } from "../utils/responsive";

interface SafeAreaViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
}

export default function SafeAreaView({
  children,
  style,
  backgroundColor = theme.colors.background.primary,
  edges = ["top", "bottom"],
  scrollable = false,
  keyboardAvoiding = false,
}: SafeAreaViewProps) {
  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    paddingTop: edges.includes("top") ? getStatusBarHeight() : 0,
    paddingBottom: edges.includes("bottom") ? getBottomInset() : 0,
    ...style,
  };

  const ContentWrapper = ({
    children: content,
  }: {
    children: React.ReactNode;
  }) => {
    if (keyboardAvoiding) {
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {content}
        </KeyboardAvoidingView>
      );
    }
    return <>{content}</>;
  };

  if (scrollable) {
    return (
      <View style={containerStyle}>
        <ContentWrapper>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </ContentWrapper>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <ContentWrapper>{children}</ContentWrapper>
    </View>
  );
}
