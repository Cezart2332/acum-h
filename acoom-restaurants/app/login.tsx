import React, { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  Image,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SecureApiService } from "@/lib/SecureApiService";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const clearError = useCallback(() => {
    if (error) setError("");
  }, [error]);

  const validateInputs = () => {
    if (!username.trim()) {
      setError("Te rog să introduci email-ul sau username-ul");
      return false;
    }
    if (!password.trim()) {
      setError("Te rog să introduci parola");
      return false;
    }
    if (password.length < 6) {
      setError("Parola trebuie să conțină cel puțin 6 caractere");
      return false;
    }
    return true;
  };

  const onLogin = async () => {
    if (!validateInputs()) return;

    setError("");
    setLoading(true);

    try {
      console.log("Starting login process...");
      const response = await SecureApiService.login({
        username: username.trim(),
        password: password.trim(),
      });

      console.log("Login response:", {
        success: response.success,
        status: response.status,
        error: response.error,
        hasData: !!response.data
      });

      if (!response.success) {
        if (response.status === 401) {
          setError(
            "Email sau parolă incorectă. Te rog să verifici datele introduse."
          );
        } else {
          setError(
            response.error || "A apărut o eroare de conexiune. Te rog să încerci din nou."
          );
        }
        return;
      }

      console.log("Login successful:", response.data);

      // Small delay to ensure data is written
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      // Verify data was stored
      const storedCompany = await AsyncStorage.getItem("company");
      const storedUser = await AsyncStorage.getItem("user");
      const storedLoggedIn = await AsyncStorage.getItem("loggedIn");
      
      console.log("Verification - Stored data after login:");
      console.log("Company:", storedCompany ? "Found" : "Not found");
      console.log("User:", storedUser ? "Found" : "Not found");
      console.log("LoggedIn:", storedLoggedIn);
      
      // Add another longer delay before navigation
      console.log("Waiting additional 1 second before navigation...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Check one more time before navigation
      const finalCompany = await AsyncStorage.getItem("company");
      const finalUser = await AsyncStorage.getItem("user");
      const finalLoggedIn = await AsyncStorage.getItem("loggedIn");
      const finalAllKeys = await AsyncStorage.getAllKeys();
      
      console.log("FINAL verification before navigation:");
      console.log("Company:", finalCompany ? "Found" : "Not found");
      console.log("User:", finalUser ? "Found" : "Not found");
      console.log("LoggedIn:", finalLoggedIn);
      console.log("All keys:", finalAllKeys);

      console.log("🚀 ABOUT TO NAVIGATE TO DASHBOARD...");
      
      // Navigate to main screen
      router.replace("/dashboard" as any);
      
      console.log("📱 NAVIGATION COMPLETED");
      
      // Check if data still exists after navigation call
      setTimeout(async () => {
        console.log("🔍 POST-NAVIGATION CHECK (500ms later):");
        const postNavCompany = await AsyncStorage.getItem("company");
        const postNavUser = await AsyncStorage.getItem("user");
        const postNavLoggedIn = await AsyncStorage.getItem("loggedIn");
        const postNavAllKeys = await AsyncStorage.getAllKeys();
        
        console.log("Post-nav Company:", postNavCompany ? "Found" : "Not found");
        console.log("Post-nav User:", postNavUser ? "Found" : "Not found");
        console.log("Post-nav LoggedIn:", postNavLoggedIn);
        console.log("Post-nav All keys:", postNavAllKeys);
      }, 500);
    } catch (error) {
      console.error("Login error:", error);
      setError("A apărut o eroare de conexiune. Te rog să încerci din nou.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Recuperare parolă",
      "Pentru a-ți recupera parola, te rog să contactezi echipa de suport.",
      [{ text: "OK", style: "default" }]
    );
  };

  const handleUsernameChange = useCallback(
    (text: string) => {
      setUsername(text);
      clearError();
    },
    [clearError]
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      clearError();
    },
    [clearError]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0F0817" }}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Background Design Elements */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 200,
              backgroundColor: "#6B46C1",
              borderBottomLeftRadius: 50,
              borderBottomRightRadius: 50,
            }}
          />

          <View
            style={{
              position: "absolute",
              top: 80,
              right: 40,
              width: 80,
              height: 80,
              backgroundColor: "#7C3AED",
              borderRadius: 40,
              opacity: 0.3,
            }}
          />

          <View
            style={{
              position: "absolute",
              top: 160,
              left: 20,
              width: 40,
              height: 40,
              backgroundColor: "#8B5CF6",
              borderRadius: 20,
              opacity: 0.5,
            }}
          />

          {/* Content Container */}
          <View
            style={{
              flex: 1,
              paddingHorizontal: 24,
              paddingTop: 60,
              paddingBottom: 40,
            }}
          >
            {/* Logo Section */}
            <View
              style={{
                alignItems: "center",
                marginBottom: 48,
                marginTop: 40,
              }}
            >
              <View
                style={{
                  backgroundColor: "#6B46C1",
                  padding: 16,
                  borderRadius: 20,
                  marginBottom: 16,
                  shadowColor: "#6B46C1",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Image
                  source={require("../assets/icon.png")}
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "bold",
                  color: "white",
                  textAlign: "center",
                }}
              >
                AcoomH Business
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#A78BFA",
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Conectează-te la contul tău
              </Text>
            </View>

            {/* Form Container */}
            <View
              style={{
                backgroundColor: "#1A1A1A",
                borderRadius: 20,
                padding: 24,
                marginBottom: 24,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              {/* Email/Username Input */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#A78BFA",
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  Email sau Username
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#2A1A4A",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: "#7C3AED",
                  }}
                >
                  <Ionicons name="person-outline" size={20} color="#A78BFA" />
                  <TextInput
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      height: 40,
                      color: "white",
                      fontSize: 16,
                    }}
                    placeholder="Introdu email-ul sau username-ul"
                    placeholderTextColor="#7C3AED"
                    value={username}
                    onChangeText={handleUsernameChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="username"
                    autoComplete="username"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#A78BFA",
                    marginBottom: 8,
                    fontWeight: "500",
                  }}
                >
                  Parolă
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#2A1A4A",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: "#7C3AED",
                  }}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#A78BFA"
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      marginLeft: 12,
                      height: 40,
                      color: "white",
                      fontSize: 16,
                    }}
                    placeholder="Introdu parola"
                    placeholderTextColor="#7C3AED"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={handlePasswordChange}
                    textContentType="password"
                    autoComplete="current-password"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={{ padding: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#A78BFA"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <Text
                    style={{
                      color: "#EF4444",
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Login Button */}
              <TouchableOpacity
                onPress={onLogin}
                disabled={loading}
                style={{
                  backgroundColor: loading ? "#6B46C1" : "#8B5CF6",
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: "center",
                  marginBottom: 16,
                  shadowColor: "#8B5CF6",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {loading ? (
                  <Text
                    style={{
                      color: "white",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Se conectează...
                  </Text>
                ) : (
                  <Text
                    style={{
                      color: "white",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Conectează-te
                  </Text>
                )}
              </TouchableOpacity>

              {/* Forgot Password */}
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text
                  style={{
                    color: "#A78BFA",
                    textAlign: "center",
                    fontSize: 14,
                  }}
                >
                  Ai uitat parola?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                Nu ai cont?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/signup")}>
                <Text
                  style={{
                    color: "#A78BFA",
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  Înregistrează-te
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Decorative dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#6B46C1",
                  marginHorizontal: 4,
                  opacity: 0.3,
                }}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
