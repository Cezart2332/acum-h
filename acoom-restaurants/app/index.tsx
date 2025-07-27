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

            // Verify the user data has required fields
            if (userData && (userData.Id || userData.id)) {
              console.log("Valid session found, going to locations");
              setHasNavigated(true);
              router.replace("/dashboard" as any);
            } else {
              console.log("No valid user data found, redirecting to login");
              throw new Error("Invalid user data structure");
            }
          } catch (parseError) {
            console.log("Invalid stored data, clearing and going to login");
            // Invalid data, clear storage and go to login
            await AsyncStorage.clear();
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
        // Clear storage and go to login on any error
        try {
          await AsyncStorage.clear();
        } catch (clearError) {
          console.error("Failed to clear storage:", clearError);
        }
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
