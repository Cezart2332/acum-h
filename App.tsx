import "react-native-gesture-handler";
import { enableScreens } from "react-native-screens";
enableScreens();
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";

import { ThemeProvider } from "./context/ThemeContext";
import { UserProvider, useUser } from "./context/UserContext";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import TermsAndConditionsScreen from "./screens/TermsAndConditionsScreen";
import HomeTabs from "./screens/HomeTabs";
import Profile from "./screens/Profile";
import EventScreen from "./screens/EventScreen";
import Info from "./screens/Info";
import Reservation from "./screens/Reservation";
import ScheduleScreen from "./screens/ScheduleScreen";
import ReservationsHistory from "./screens/ReservationsHistory";
import ChangePasswordScreen from "./screens/ChangePasswordScreen";
import BugReportScreen from "./screens/BugReportScreen";
import { RootStackParamList } from "./screens/RootStackParamList";
import { useMenuPreloader } from "./hooks/useMenuPreloader";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { SecureApiService } from "./services/SecureApiService";
import { ApiTester } from "./utils/ApiTester";
import { AuthenticationDebugger } from "./utils/AuthenticationDebugger";

const Stack = createNativeStackNavigator<RootStackParamList>();

// Navigation component that uses UserContext
function AppNavigator() {
  const { isLoggedIn, loading } = useUser();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C3AFF" />
        <Text style={styles.loadingTitle}>ACUM-H</Text>
        <Text style={styles.loadingSubtitle}>Se încarcă...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        id={undefined}
        initialRouteName={isLoggedIn ? "Home" : "Login"}
        screenOptions={{ headerShown: false }}
      >
        {!isLoggedIn ? (
          // Auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="TermsAndConditions"
              component={TermsAndConditionsScreen}
            />
          </>
        ) : (
          // Main app screens
          <>
            <Stack.Screen name="Home" component={HomeTabs} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="EventScreen" component={EventScreen} />
            <Stack.Screen name="Info" component={Info} />
            <Stack.Screen name="Reservation" component={Reservation} />
            <Stack.Screen name="Schedule" component={ScheduleScreen} />
            <Stack.Screen
              name="ReservationsHistory"
              component={ReservationsHistory}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
            />
            <Stack.Screen name="BugReport" component={BugReportScreen} />
            <Stack.Screen
              name="TermsAndConditions"
              component={TermsAndConditionsScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [isAppReady, setIsAppReady] = useState<boolean>(false);

  // Initialize SecureApiService and menu preloader
  const { status } = useMenuPreloader({
    refreshIntervalMinutes: 60,
    enableBackgroundRefresh: true,
    retryFailedParsing: true,
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Run API tests to debug the JSON parse issues
        if (__DEV__) {
          await ApiTester.runBasicTests();
        }
        
        // Test API connectivity first
        const connectivityTest = await SecureApiService.testConnectivity();
        console.log("API Connectivity Test:", connectivityTest);
        
        // Initialize SecureApiService early
        await SecureApiService.initialize();
        console.log("SecureApiService initialized");

        // Log authentication state at startup for debugging
        try {
          await AuthenticationDebugger.logAuthState("App initializeApp");
        } catch (e) {
          console.warn("Failed to run AuthenticationDebugger at startup:", e);
        }
      } catch (error) {
        console.error("Failed to initialize SecureApiService:", error);
      }
      
      // Wait for initial menu preload to complete before showing main app
      if (!status.isPreloading && status.locationsTotal > 0) {
        setIsAppReady(true);
      }
    };

    initializeApp();
  }, [status.isPreloading, status.locationsTotal]);

  // Show loading screen during initial menu preload
  if (!isAppReady) {
    const styles = StyleSheet.create({
      loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
      },
      loadingTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#6C3AFF",
        marginTop: 20,
      },
      loadingSubtitle: {
        fontSize: 16,
        color: "#6C3AFF",
        marginTop: 10,
      },
      errorText: {
        fontSize: 14,
        color: "red",
        marginTop: 10,
      },
    });

    return (
      <ThemeProvider>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C3AFF" />
            <Text style={styles.loadingTitle}>ACUM-H</Text>
            <Text style={styles.loadingSubtitle}>
              Inițializare aplicație... {status.locationsProcessed}/
              {status.locationsTotal}
            </Text>
            {status.errors.length > 0 && (
              <Text style={styles.errorText}>
                Erori: {status.errors.length}
              </Text>
            )}
          </View>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6C3AFF",
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 4,
  },
});
