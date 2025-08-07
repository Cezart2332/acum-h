import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View, Image, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SafeAreaView from "../lib/components/SafeAreaView";
import LoadingSpinner from "../lib/components/LoadingSpinner";
import { theme } from "../lib/constants/theme";

export default function Index() {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    if (hasNavigated) {
      console.log("Already navigated, skipping initialization");
      return;
    }

    const initializeApp = async () => {
      console.log("App initialization starting...");
      try {
        // Add a small delay for splash screen visibility
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const loggedIn = await AsyncStorage.getItem("loggedIn");
        const hasUserData = await AsyncStorage.getItem("user");
        const hasCompanyData = await AsyncStorage.getItem("company");

        console.log("App initialization check:");
        console.log("loggedIn:", loggedIn);
        console.log("hasUserData:", hasUserData ? "YES" : "NO");
        console.log("hasCompanyData:", hasCompanyData ? "YES" : "NO");

        // Check if user is logged in and has valid data
        if (
          (loggedIn === "true" || loggedIn === JSON.stringify(true)) &&
          (hasUserData || hasCompanyData)
        ) {
          try {
            // Try to parse the data to ensure it's valid JSON
            let userData = null;
            if (hasUserData) {
              userData = JSON.parse(hasUserData);
              console.log("Parsed user data:", userData);
            } else if (hasCompanyData) {
              userData = JSON.parse(hasCompanyData);
              console.log("Parsed company data:", userData);
              // Also save as user data for consistency
              await AsyncStorage.setItem("user", hasCompanyData);
            }

            // Verify the user data has required fields (be more flexible)
            if (userData && (userData.Id || userData.id || userData.name || userData.email)) {
              console.log("Valid session found, going to dashboard");
              setHasNavigated(true);
              router.replace("/dashboard" as any);
            } else {
              console.log("User data missing required fields, but not clearing storage");
              console.log("Available userData fields:", userData ? Object.keys(userData) : "none");
              // Don't clear storage, just go to login - let user manually logout if needed
              setHasNavigated(true);
              router.replace("/login");
            }
          } catch (parseError) {
            console.log("Error parsing stored data, but NOT clearing storage:", parseError);
            console.log("Raw data that failed to parse:");
            console.log("hasUserData:", hasUserData ? hasUserData.substring(0, 100) + "..." : "null");
            console.log("hasCompanyData:", hasCompanyData ? hasCompanyData.substring(0, 100) + "..." : "null");
            
            // Don't clear storage! Just go to login and let them try again
            setHasNavigated(true);
            router.replace("/login");
          }
        } else {
          console.log("No session found, going to login");
          setHasNavigated(true);
          router.replace("/login");
        }
      } catch (error) {
        console.error("App initialization error:", error);
        // Don't clear storage on initialization errors - preserve user data
        console.log("Initialization failed, going to login but preserving data");
        setHasNavigated(true);
        router.replace("/login");
      } finally {
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, [hasNavigated]);

  // Show loading screen while initializing
  return (
    <SafeAreaView backgroundColor={theme.colors.background.primary}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {/* Logo */}
        <View
          style={{
            backgroundColor: theme.colors.primary[600],
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.xl,
            marginBottom: theme.spacing.xl,
            ...theme.shadows.lg,
          }}
        >
          <Image
            source={require("../assets/icon.png")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        {/* App Name */}
        <Text
          style={{
            fontSize: 36,
            fontWeight: theme.typography.weights.bold,
            color: theme.colors.text.primary,
            textAlign: "center",
            marginBottom: theme.spacing.sm,
          }}
        >
          AcoomH Business
        </Text>

        <Text
          style={{
            fontSize: theme.typography.sizes.lg,
            color: theme.colors.text.secondary,
            textAlign: "center",
            marginBottom: theme.spacing.xl,
          }}
        >
          Gestionează-ți restaurantul cu ușurință
        </Text>

        {/* Loading Indicator */}
        <LoadingSpinner
          color={theme.colors.primary[600]}
          text="Se încarcă aplicația..."
        />

        {/* Version Info */}
        <View
          style={{
            position: "absolute",
            bottom: theme.spacing.xl,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.gray[500],
              textAlign: "center",
            }}
          >
            Versiunea 1.0.0
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
