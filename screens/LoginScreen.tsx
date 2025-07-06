import React, { useState, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import BASE_URL from "../config";

const { width, height } = Dimensions.get("window");

type LoginNav = NativeStackNavigationProp<RootStackParamList, "Login">;

// Moved AnimatedButton outside the component and memoized it
const AnimatedButton = React.memo(
  ({ onPress, children, loading, fadeAnim }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={styles.buttonContainer}
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
  
  // Focus management - only one input can be focused at a time
  type FocusedInput = 'email' | 'password' | null;
  const [focusedInput, setFocusedInput] = useState<FocusedInput>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Input refs for proper focus management
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Stable focus handlers to prevent re-renders
  const handleFocus = React.useCallback((inputName: FocusedInput) => {
    // Blur other inputs when one gains focus
    if (focusedInput && focusedInput !== inputName) {
      if (focusedInput === 'email' && emailInputRef.current) {
        emailInputRef.current.blur();
      } else if (focusedInput === 'password' && passwordInputRef.current) {
        passwordInputRef.current.blur();
      }
    }
    setFocusedInput(inputName);
  }, [focusedInput]);

  const handleBlur = React.useCallback((inputName: FocusedInput) => {
    // Only clear focus state if this input was actually focused
    if (focusedInput === inputName) {
      setFocusedInput(null);
    }
  }, [focusedInput]);

  // Individual input handlers
  const handleEmailFocus = React.useCallback(() => handleFocus('email'), [handleFocus]);
  const handleEmailBlur = React.useCallback(() => handleBlur('email'), [handleBlur]);
  const handlePasswordFocus = React.useCallback(() => handleFocus('password'), [handleFocus]);
  const handlePasswordBlur = React.useCallback(() => handleBlur('password'), [handleBlur]);

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

  // Calculate keyboard offset for iOS
  const keyboardVerticalOffset =
    Platform.OS === "ios" ? (StatusBar.currentHeight || 0) + 10 : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F0817" />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#0F0817", "#1A0B2E", "#2D1B69"]}
        style={styles.backgroundGradient}
      >
        {/* Floating Elements */}
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
                <Ionicons name="restaurant" size={40} color="#FFFFFF" />
              </LinearGradient>
              <Text style={styles.title}>AcoomH</Text>
              <Text style={styles.subtitle}>Bun venit înapoi!</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedInput === 'email' && styles.inputWrapperFocused,
                    emailError && styles.inputWrapperError,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
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
                    blurOnSubmit={false}
                    onFocus={handleEmailFocus}
                    onBlur={() => {
                      handleEmailBlur();
                      validateEmail(email);
                    }}
                    onSubmitEditing={() => {
                      passwordInputRef.current?.focus();
                    }}
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Parolă</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedInput === 'password' && styles.inputWrapperFocused,
                    passwordError && styles.inputWrapperError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
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
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    onFocus={handlePasswordFocus}
                    onBlur={() => {
                      handlePasswordBlur();
                      validatePassword(password);
                    }}
                    onSubmitEditing={onLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setSecure(!secure)}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={secure ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={focusedInput === 'password' ? "#6C3AFF" : "#A78BFA"}
                    />
                  </TouchableOpacity>
                </View>
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
                  <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Conectează-te</Text>
                </View>
              </AnimatedButton>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Nu ai cont încă?</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Register")}
                  style={styles.footerButton}
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
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

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
  floatingCircle1: {
    position: "absolute",
    top: height * 0.1,
    right: width * 0.1,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#6C3AFF",
  },
  floatingCircle2: {
    position: "absolute",
    bottom: height * 0.2,
    left: width * 0.05,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#9B59B6",
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: "#A78BFA",
    fontWeight: "500",
  },
  formSection: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(108, 58, 255, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F1F1F",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2A2A2A",
    paddingHorizontal: 16,
    height: 56,
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
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: "#E91E63",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: "500",
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonGradient: {
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 8,
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
    fontSize: 14,
    color: "#A78BFA",
    marginBottom: 12,
  },
  footerButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  footerButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
