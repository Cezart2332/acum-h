import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar, Platform } from "react-native";
import { EventProvider } from "../lib/EventContext";
import ErrorBoundary from "../lib/components/ErrorBoundary";
import { useToast } from "../lib/components/Toast";
import "./globals.css";

// Import polyfills for better compatibility
import "react-native-get-random-values";

function AppContent() {
  const { ToastContainer } = useToast();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 200,
          gestureEnabled: true,
          gestureDirection: "horizontal",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            animation: "none",
          }}
        />
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="company-profile"
          options={{
            headerShown: false,
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="schedule"
          options={{
            headerShown: false,
            animation: "slide_from_right",
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="events/add"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="dashboard"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="events"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="add-event"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="edit-event"
          options={{
            headerShown: false,
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="event-detail"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="reservations"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
        <Stack.Screen
          name="stats"
          options={{
            headerShown: false,
            animation: "slide_from_right",
          }}
        />
      </Stack>
      <ToastContainer />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Set status bar style for better UX
    if (Platform.OS === "ios") {
      StatusBar.setBarStyle("light-content", true);
    }
  }, []);

  return (
    <ErrorBoundary>
      <EventProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#0F0817"
          translucent={Platform.OS === "android"}
        />
        <AppContent />
      </EventProvider>
    </ErrorBoundary>
  );
}
