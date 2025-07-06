import React, { useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  TextInput,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  PixelRatio,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import BASE_URL from "../config";

const { width: screenWidth } = Dimensions.get("window");

// Simplified responsive font scaling
const fontScale = PixelRatio.getFontScale();
const getScaledSize = (size: number) => size / fontScale;

type LoginNav = NativeStackNavigationProp<RootStackParamList, "Login">;

// Optimized AnimatedButton with proper touch handling
const AnimatedButton = React.memo(
  ({ onPress, children, loading, fadeAnim }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={styles.buttonContainer}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // Better touch target
    >
      <LinearGradient
        colors={
          loading ? ["#4A4A4A", "#6A6A6A"] : ["#6C3AFF", "#9B59B6", "#E91E63"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.buttonGradient}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingDot,
                {
                  transform: [
                    {
                      scale: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Text style={styles.buttonText}>Se încarcă...</Text>
          </View>
        ) : (
          children
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
);

export default function LoginScreen({ navigation }: { navigation: LoginNav }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  // Simplified focus management - no complex timeout logic
  type FocusedInput = 'email' | 'password' | null;
  const [focusedInput, setFocusedInput] = useState<FocusedInput>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Input refs for proper focus management
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Simplified focus handlers - React Native handles the rest
  const handleFocus = useCallback((inputName: FocusedInput) => {
    setFocusedInput(inputName);
  }, []);

  const handleBlur = useCallback((inputName: FocusedInput) => {
    // Only clear if this input was focused
    setFocusedInput(current => current === inputName ? null : current);
  }, []);

  // Individual input handlers - simplified
  const handleEmailFocus = useCallback(() => handleFocus('email'), [handleFocus]);
  const handleEmailBlur = useCallback(() => handleBlur('email'), [handleBlur]);
  const handlePasswordFocus = useCallback(() => handleFocus('password'), [handleFocus]);
  const handlePasswordBlur = useCallback(() => handleBlur('password'), [handleBlur]);

  React.useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email-ul este obligatoriu");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Email invalid");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password.trim()) {
      setPasswordError("Parola este obligatorie");
      return false;
    }
    if (password.length < 6) {
      setPasswordError("Parola trebuie să aibă cel puțin 6 caractere");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const onLogin = async () => {
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      // Shake animation for errors
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    setLoading(true);

    try {
      const loginData = {
        Username: email.trim(),
        Password: password,
      };

      const loginRequest = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(loginData),
      };

      const response = await fetch(`${BASE_URL}/login`, loginRequest);

      if (response.status === 401) {
        Alert.alert(
          "Eroare de autentificare",
          "Email sau parolă incorrecte. Te rog să încerci din nou.",
          [{ text: "OK", style: "default" }]
        );
        setPasswordError("Email sau parolă incorrecte");
        return;
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      await AsyncStorage.setItem("user", JSON.stringify(data));
      await AsyncStorage.setItem("loggedIn", JSON.stringify(true));

      // Success animation
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace("Home");
      });
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Eroare de conectare",
        "Nu s-a putut conecta la server. Verifică conexiunea la internet și încearcă din nou.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F0817" />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#0F0817", "#1A0B2E", "#2D1B69"]}
        style={styles.backgroundGradient}
      >
        {/* Floating Elements - Using Flexbox positioning */}
        <View style={styles.floatingElements}>
          <Animated.View
            style={[
              styles.floatingCircle1,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.1],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.floatingCircle2,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.15],
                }),
              },
            ]}
          />
        </View>

        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              {/* Logo/Title Section */}
              <View style={styles.headerSection}>
                <LinearGradient
                  colors={["#6C3AFF", "#9B59B6"]}
                  style={styles.logoContainer}
                >
                  <Ionicons name="restaurant" size={getScaledSize(40)} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.title}>AcoomH</Text>
                <Text style={styles.subtitle}>Bun venit înapoi!</Text>
              </View>

              {/* Form Section */}
              <View style={styles.formSection}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'email' && styles.inputWrapperFocused,
                      emailError && styles.inputWrapperError,
                    ]}
                    onPress={() => emailInputRef.current?.focus()} // Direct focus on tap
                  >
                    <Ionicons
                      name="mail-outline"
                      size={getScaledSize(20)}
                      color={
                        focusedInput === 'email'
                          ? "#6C3AFF"
                          : emailError
                          ? "#E91E63"
                          : "#A78BFA"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={emailInputRef}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (emailError) validateEmail(text);
                      }}
                      placeholder="Introdu email-ul tău"
                      placeholderTextColor="#6B7280"
                      style={styles.textInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      enablesReturnKeyAutomatically={true}
                      clearButtonMode="while-editing"
                      onFocus={handleEmailFocus}
                      onBlur={handleEmailBlur}
                      onSubmitEditing={() => {
                        passwordInputRef.current?.focus();
                      }}
                    />
                  </TouchableOpacity>
                  {emailError ? (
                    <Text style={styles.errorText}>{emailError}</Text>
                  ) : null}
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Parolă</Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={[
                      styles.inputWrapper,
                      focusedInput === 'password' && styles.inputWrapperFocused,
                      passwordError && styles.inputWrapperError,
                    ]}
                    onPress={() => passwordInputRef.current?.focus()} // Direct focus on tap
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={getScaledSize(20)}
                      color={
                        focusedInput === 'password'
                          ? "#6C3AFF"
                          : passwordError
                          ? "#E91E63"
                          : "#A78BFA"
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) validatePassword(text);
                      }}
                      placeholder="Introdu parola ta"
                      placeholderTextColor="#6B7280"
                      style={styles.textInput}
                      secureTextEntry={secure}
                      autoComplete="current-password"
                      textContentType="password"
                      returnKeyType="done"
                      enablesReturnKeyAutomatically={true}
                      onFocus={handlePasswordFocus}
                      onBlur={handlePasswordBlur}
                      onSubmitEditing={onLogin}
                    />
                    <TouchableOpacity
                      onPress={() => setSecure(!secure)}
                      style={styles.eyeButton}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={secure ? "eye-off-outline" : "eye-outline"}
                        size={getScaledSize(20)}
                        color={focusedInput === 'password' ? "#6C3AFF" : "#A78BFA"}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                  {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  ) : null}
                </View>

                {/* Login Button */}
                <AnimatedButton
                  onPress={onLogin}
                  loading={loading}
                  fadeAnim={fadeAnim}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="log-in-outline" size={getScaledSize(20)} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Conectează-te</Text>
                  </View>
                </AnimatedButton>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Nu ai cont încă?</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Register")}
                    style={styles.footerButton}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <LinearGradient
                      colors={["#6C3AFF", "#9B59B6"]}
                      style={styles.footerButtonGradient}
                    >
                      <Text style={styles.footerButtonText}>
                        Înregistrează-te
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// Percentage-based responsive styles using Flexbox
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  floatingElements: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Floating circles using percentage positioning
  floatingCircle1: {
    position: "absolute",
    top: "10%",
    right: "10%",
    width: screenWidth * 0.25,
    height: screenWidth * 0.25,
    borderRadius: screenWidth * 0.125,
    backgroundColor: "#6C3AFF",
    aspectRatio: 1, // Maintains square shape
  },
  floatingCircle2: {
    position: "absolute",
    bottom: "20%",
    left: "5%",
    width: screenWidth * 0.15,
    height: screenWidth * 0.15,
    borderRadius: screenWidth * 0.075,
    backgroundColor: "#9B59B6",
    aspectRatio: 1, // Maintains square shape
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: "6%", // Percentage-based padding
    paddingVertical: "2%",
    justifyContent: 'center',
    minHeight: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    maxWidth: "90%", // Percentage-based max width
    alignSelf: 'center',
  },
  headerSection: {
    alignItems: "center",
    marginBottom: "8%", // Percentage-based margin
  },
  logoContainer: {
    width: screenWidth * 0.2,
    height: screenWidth * 0.2,
    borderRadius: screenWidth * 0.05,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "4%",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    aspectRatio: 1, // Maintains square shape
  },
  title: {
    fontSize: getScaledSize(32),
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: "2%",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: getScaledSize(16),
    color: "#A78BFA",
    fontWeight: "500",
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderRadius: 24,
    padding: "6%", // Percentage-based padding
    borderWidth: 1,
    borderColor: "rgba(108, 58, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  inputContainer: {
    marginBottom: "5%", // Percentage-based margin
  },
  inputLabel: {
    fontSize: getScaledSize(14),
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: "2%",
    marginLeft: "1%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1F1F",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2A2A2A",
    paddingHorizontal: "4%", // Percentage-based padding
    minHeight: 56, // Minimum height for accessibility
    paddingVertical: 12,
  },
  inputWrapperFocused: {
    borderColor: "#6C3AFF",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: "#E91E63",
  },
  inputIcon: {
    marginRight: "3%", // Percentage-based margin
  },
  textInput: {
    flex: 1,
    fontSize: getScaledSize(16),
    color: "#FFFFFF",
    fontWeight: "500",
    paddingVertical: 0, // Remove default padding to avoid height issues
    includeFontPadding: false, // Android-specific: removes extra padding
  },
  eyeButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: "2%",
  },
  errorText: {
    color: "#E91E63",
    fontSize: getScaledSize(12),
    marginTop: "1%",
    marginLeft: "1%",
    fontWeight: "500",
  },
  buttonContainer: {
    marginTop: "2%",
    marginBottom: "6%",
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonGradient: {
    minHeight: 56, // Minimum height for accessibility
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 16,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    fontSize: getScaledSize(16),
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: "2%",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: getScaledSize(14),
    color: "#A78BFA",
    marginBottom: "3%",
    textAlign: 'center',
  },
  footerButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  footerButtonGradient: {
    paddingHorizontal: "6%", // Percentage-based padding
    paddingVertical: "3%",
    borderRadius: 12,
  },
  footerButtonText: {
    fontSize: getScaledSize(14),
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: 'center',
  },
});
