import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  Animated,
  Alert,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import BASE_URL from "../config";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import UniversalScreen from "../components/UniversalScreen";
import EnhancedButton from "../components/EnhancedButton";
import EnhancedInput from "../components/EnhancedInput";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  getResponsiveSpacing,
  SCREEN_DIMENSIONS,
  isValidEmail,
  isValidPassword,
} from "../utils/responsive";

type LoginNav = NativeStackNavigationProp<RootStackParamList, "Login">;

export default function LoginScreen({ navigation }: { navigation: LoginNav }) {
  const { theme } = useTheme();
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
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
  }, [fadeAnim, slideAnim, scaleAnim]);

  const validateEmail = useCallback((email: string): boolean => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Email-ul este obligatoriu");
      return false;
    }
    if (!isValidEmail(trimmedEmail)) {
      setEmailError("Email invalid");
      return false;
    }
    setEmailError("");
    return true;
  }, []);

  const validatePassword = useCallback((password: string): boolean => {
    if (!password) {
      setPasswordError("Parola este obligatorie");
      return false;
    }
    if (!isValidPassword(password)) {
      setPasswordError("Parola trebuie să aibă cel puțin 6 caractere");
      return false;
    }
    setPasswordError("");
    return true;
  }, []);

  // Add debounced validation
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (emailError) {
        setEmailError("");
      }
    },
    [emailError]
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (passwordError) {
        setPasswordError("");
      }
    },
    [passwordError]
  );

  const onLogin = useCallback(async () => {
    // Validate inputs
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      // Shake animation for errors
      hapticFeedback("heavy");
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

      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(loginData),
      });

      if (response.status === 401) {
        setPasswordError("Email sau parolă incorrecte");
        hapticFeedback("heavy");
        Alert.alert(
          "Eroare de autentificare",
          "Email sau parolă incorrecte. Te rog să încerci din nou."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      // Use UserContext login method
      await login(data);

      // Success haptic feedback
      hapticFeedback("medium");

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
      hapticFeedback("heavy");
      Alert.alert(
        "Eroare de conectare",
        "Nu s-a putut conecta la server. Verifică conexiunea la internet și încearcă din nou."
      );
    } finally {
      setLoading(false);
    }
  }, [email, password, validateEmail, validatePassword, navigation, scaleAnim]);

  const handleRegisterPress = useCallback(() => {
    hapticFeedback("light");
    navigation.navigate("Register");
  }, [navigation]);

  return (
    <UniversalScreen
      gradient={true}
      keyboardAvoidingView={true}
      scrollable={true}
      backgroundColor={theme.colors.primary}
    >
      {/* Floating Elements */}
      <View style={styles.floatingElements}>
        <Animated.View
          style={[
            styles.floatingCircle1,
            {
              backgroundColor: theme.colors.accent + "20",
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.6],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.floatingCircle2,
            {
              backgroundColor: theme.colors.accentSecondary + "15",
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
            },
          ]}
        />
      </View>

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoImageContainer}>
            <Image
              source={require("../acoomh.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Bun venit înapoi!
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Conectează-te pentru a continua
        </Text>
      </Animated.View>

      {/* Form */}
      <Animated.View
        style={[
          styles.form,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.formContent,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <EnhancedInput
            label="Email"
            placeholder="Introdu email-ul"
            value={email}
            onChangeText={handleEmailChange}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail-outline"
            required
            autoCorrect={false}
          />

          <EnhancedInput
            label="Parola"
            placeholder="Introdu parola"
            value={password}
            onChangeText={handlePasswordChange}
            error={passwordError}
            secureTextEntry
            leftIcon="lock-closed-outline"
            showPasswordToggle
            required
            autoCorrect={false}
          />

          <View style={styles.buttonContainer}>
            <EnhancedButton
              title="Conectează-te"
              onPress={onLogin}
              loading={loading}
              variant="primary"
              size="large"
              fullWidth
              gradient
            />
          </View>
        </View>
      </Animated.View>

      {/* Footer */}
      <Animated.View
        style={[
          styles.footer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text
          style={[styles.footerText, { color: theme.colors.textSecondary }]}
        >
          Nu ai cont încă?
        </Text>
        <TouchableOpacity
          onPress={handleRegisterPress}
          style={styles.registerButton}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.registerButtonText, { color: theme.colors.accent }]}
          >
            Înregistrează-te
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </UniversalScreen>
  );
}

const styles = StyleSheet.create({
  floatingElements: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  floatingCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -50,
    right: -50,
  },
  floatingCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: -30,
    left: -30,
  },
  header: {
    alignItems: "center",
    paddingTop: getResponsiveSpacing("xxl"),
    paddingBottom: getResponsiveSpacing("xl"),
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: getResponsiveSpacing("lg"),
  },
  logoImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    ...getShadow(8),
    overflow: "hidden",
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: getResponsiveSpacing("sm"),
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    textAlign: "center",
    opacity: 0.8,
  },
  form: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing("lg"),
    zIndex: 1,
  },
  formContent: {
    borderRadius: 24,
    padding: getResponsiveSpacing("xl"),
    ...getShadow(12),
  },
  buttonContainer: {
    marginTop: getResponsiveSpacing("lg"),
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: getResponsiveSpacing("xl"),
    paddingHorizontal: getResponsiveSpacing("lg"),
    zIndex: 1,
  },
  footerText: {
    fontSize: TYPOGRAPHY.body,
    marginRight: getResponsiveSpacing("sm"),
  },
  registerButton: {
    paddingVertical: getResponsiveSpacing("sm"),
    paddingHorizontal: getResponsiveSpacing("md"),
  },
  registerButtonText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
  },
});
