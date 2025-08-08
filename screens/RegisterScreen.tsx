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
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import { BASE_URL, getBaseUrl } from "../config";
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

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Register"
>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

export default function RegisterScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { login, updateProfileImage } = useUser();
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Error states
  const [usernameError, setUsernameError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneNumberError, setPhoneNumberError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

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
  }, []);

  // Validation functions
  const validateUsername = (username: string): boolean => {
    if (!username.trim()) {
      setUsernameError("Username-ul este obligatoriu");
      return false;
    }
    if (username.length < 3) {
      setUsernameError("Username-ul trebuie să aibă cel puțin 3 caractere");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const validateFirstName = (name: string): boolean => {
    if (!name.trim()) {
      setFirstNameError("Prenumele este obligatoriu");
      return false;
    }
    setFirstNameError("");
    return true;
  };

  const validateLastName = (name: string): boolean => {
    if (!name.trim()) {
      setLastNameError("Numele este obligatoriu");
      return false;
    }
    setLastNameError("");
    return true;
  };

  const validateEmailField = (email: string): boolean => {
    if (!email.trim()) {
      setEmailError("Email-ul este obligatoriu");
      return false;
    }
    if (!isValidEmail(email)) {
      setEmailError("Email invalid");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone.trim()) {
      setPhoneNumberError("Numărul de telefon este obligatoriu");
      return false;
    }
    // Basic phone number validation (Romanian format)
    const phoneRegex = /^(\+40|0)[0-9]{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
      setPhoneNumberError(
        "Număr de telefon invalid (ex: 0712345678 sau +40712345678)"
      );
      return false;
    }
    setPhoneNumberError("");
    return true;
  };

  const validatePasswordField = (password: string): boolean => {
    if (!password.trim()) {
      setPasswordError("Parola este obligatorie");
      return false;
    }
    if (!isValidPassword(password)) {
      setPasswordError("Parola trebuie să aibă cel puțin 8 caractere");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string): boolean => {
    if (!confirmPassword.trim()) {
      setConfirmPasswordError("Confirmarea parolei este obligatorie");
      return false;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError("Parolele nu se potrivesc");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  const handleRegister = async () => {
    // Validate all fields
    const isUsernameValid = validateUsername(username);
    const isFirstNameValid = validateFirstName(firstName);
    const isLastNameValid = validateLastName(lastName);
    const isEmailValid = validateEmailField(email);
    const isPhoneNumberValid = validatePhoneNumber(phoneNumber);
    const isPasswordValid = validatePasswordField(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (
      !isUsernameValid ||
      !isFirstNameValid ||
      !isLastNameValid ||
      !isEmailValid ||
      !isPhoneNumberValid ||
      !isPasswordValid ||
      !isConfirmPasswordValid
    ) {
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
      hapticFeedback("heavy");
      return;
    }

    setLoading(true);
    let baseUrl = BASE_URL; // fallback

    try {
      console.log("Getting dynamic base URL...");
      baseUrl = await getBaseUrl();
      console.log("Using base URL:", baseUrl);

      // Prepare registration data for JWT endpoint
      const registrationData = {
        Username: username,
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Password: password,
        PhoneNumber: phoneNumber,
      };

      console.log(
        "Sending registration request to:",
        `${baseUrl}/auth/register`
      );

      const registerResponse = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      console.log("Registration response status:", registerResponse.status);

      if (registerResponse.status === 409) {
        const errorData = await registerResponse.json();
        Alert.alert(
          "Cont existent",
          errorData.Error ||
            "Există deja un cont cu acest email sau username. Te rog să încerci altele.",
          [{ text: "OK", style: "default" }]
        );
        // Check if it's email or username conflict
        if (errorData.Error && errorData.Error.includes("email")) {
          setEmailError("Email-ul este deja folosit");
        } else {
          setUsernameError("Username-ul este deja folosit");
        }
        return;
      }

      if (!registerResponse.ok) {
        const errorText = await registerResponse.text();
        console.error("Registration error response:", errorText);
        throw new Error(`Server error: ${registerResponse.status}`);
      }

      const jwtData = await registerResponse.json();
      console.log("Registration successful, JWT data:", jwtData);

      // Extract user data from JWT response
      const userData = {
        id: jwtData.user.id,
        username: jwtData.user.username,
        firstName: jwtData.user.firstName,
        lastName: jwtData.user.lastName,
        email: jwtData.user.email,
        profileImage: jwtData.user.profileImage,
        type: jwtData.user.role, // "User" or "Company"
        accessToken: jwtData.accessToken,
        refreshToken: jwtData.refreshToken,
        expiresAt: jwtData.expiresAt,
      };

      // Use the UserContext to handle login
      await login(userData);

      // Upload default profile picture after registration
      try {
        console.log("Uploading default profile picture...");

        const defaultImage = require("../acoomh.png");
        const defaultImageUri = Image.resolveAssetSource(defaultImage).uri;

        const formData = new FormData();
        const response = await fetch(defaultImageUri);
        const blob = await response.blob();
        formData.append("file", blob, "profile.jpg");
        formData.append("userId", userData.id.toString());

        const uploadResponse = await fetch(`${baseUrl}/changepfp`, {
          method: "PUT",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${userData.accessToken}`, // Use the JWT token
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          console.log("Profile picture uploaded successfully");
          // Update user context with the new profile picture
          const updatedUserData = await uploadResponse.json();
          if (updatedUserData.profileImage) {
            await updateProfileImage(updatedUserData.profileImage);
          }
        } else {
          console.error(
            "Failed to upload profile picture:",
            uploadResponse.status
          );
        }
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        // Don't fail registration if profile picture upload fails
      }

      // Success animation
      hapticFeedback("medium");
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        Alert.alert("Succes!", "Contul a fost creat cu succes!", [
          {
            text: "OK",
            // Navigation will happen automatically through conditional rendering
          },
        ]);
      });
    } catch (error) {
      console.error("Register error:", error);
      Alert.alert(
        "Eroare de conectare",
        "Nu s-a putut conecta la server. Verifică conexiunea la internet și încearcă din nou.",
        [{ text: "OK", style: "default" }]
      );
      console.log("Used base URL:", baseUrl);
      hapticFeedback("heavy");
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    hapticFeedback("light");
    navigation.navigate("Login");
  };

  const navigateToTerms = () => {
    hapticFeedback("light");
    navigation.navigate("TermsAndConditions");
  };

  return (
    <UniversalScreen
      gradient={true}
      scrollable={true}
      keyboardAvoidingView={true}
      safeAreaEdges={["top", "bottom"]}
    >
      {/* Background Elements */}
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

      {/* Main Content */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, getShadow(3)]}
            onPress={navigateToLogin}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../acoomh.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Creează cont
            </Text>
            <Text
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              Completează toate câmpurile pentru a-ți crea contul
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={[styles.form, getShadow(5)]}>
          <EnhancedInput
            label="Username"
            placeholder="Introdu username-ul"
            value={username}
            onChangeText={setUsername}
            error={usernameError}
            leftIcon="person-outline"
            autoCapitalize="none"
            required
          />

          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <EnhancedInput
                label="Prenume"
                placeholder="Prenume"
                value={firstName}
                onChangeText={setFirstName}
                error={firstNameError}
                leftIcon="person-outline"
                autoCapitalize="words"
                required
              />
            </View>
            <View style={styles.nameField}>
              <EnhancedInput
                label="Nume"
                placeholder="Nume"
                value={lastName}
                onChangeText={setLastName}
                error={lastNameError}
                leftIcon="person-outline"
                autoCapitalize="words"
                required
              />
            </View>
          </View>

          <EnhancedInput
            label="Email"
            placeholder="exemplu@email.com"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            leftIcon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />

          <EnhancedInput
            label="Telefon"
            placeholder="0712345678 sau +40712345678"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            error={phoneNumberError}
            leftIcon="call-outline"
            keyboardType="phone-pad"
            autoCapitalize="none"
            required
          />

          <EnhancedInput
            label="Parolă"
            placeholder="Introdu parola"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            leftIcon="lock-closed-outline"
            secureTextEntry
            showPasswordToggle
            required
          />

          <EnhancedInput
            label="Confirmă parola"
            placeholder="Confirmă parola"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmPasswordError}
            leftIcon="lock-closed-outline"
            secureTextEntry
            showPasswordToggle
            required
          />

          <EnhancedButton
            title="Creează cont"
            onPress={handleRegister}
            loading={loading}
            gradient={true}
            size="large"
            fullWidth={true}
            style={styles.registerButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            style={[styles.footerText, { color: theme.colors.textSecondary }]}
          >
            Ai deja cont?{" "}
          </Text>
          <TouchableOpacity onPress={navigateToLogin} activeOpacity={0.8}>
            <Text style={[styles.footerLink, { color: theme.colors.accent }]}>
              Autentifică-te
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms and Conditions Link */}
        <View style={styles.termsContainer}>
          <TouchableOpacity onPress={navigateToTerms} activeOpacity={0.8}>
            <Text style={styles.termsText}>
              Vizualizează termenii și condițiile
            </Text>
          </TouchableOpacity>
        </View>
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
  },
  floatingCircle1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#6C3AFF",
    opacity: 0.1,
  },
  floatingCircle2: {
    position: "absolute",
    bottom: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#9B59B6",
    opacity: 0.15,
  },
  container: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing("lg"),
    paddingVertical: getResponsiveSpacing("xl"),
  },
  header: {
    marginBottom: getResponsiveSpacing("xl"),
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: getResponsiveSpacing("lg"),
  },
  headerContent: {
    alignItems: "center",
  },
  logoContainer: {
    marginBottom: getResponsiveSpacing("md"),
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: TYPOGRAPHY.h1,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
    marginBottom: getResponsiveSpacing("sm"),
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    textAlign: "center",
    lineHeight: TYPOGRAPHY.body * 1.4,
    paddingHorizontal: getResponsiveSpacing("md"),
  },
  form: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
    padding: getResponsiveSpacing("xl"),
    marginBottom: getResponsiveSpacing("xl"),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  nameRow: {
    flexDirection: "row",
    gap: getResponsiveSpacing("md"),
  },
  nameField: {
    flex: 1,
  },
  registerButton: {
    marginTop: getResponsiveSpacing("lg"),
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: getResponsiveSpacing("lg"),
  },
  footerText: {
    fontSize: TYPOGRAPHY.body,
  },
  footerLink: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
  },
  termsContainer: {
    paddingVertical: getResponsiveSpacing("md"),
    alignItems: "center",
  },
  termsText: {
    fontSize: TYPOGRAPHY.bodySmall,
    color: "#A855F7",
    textAlign: "center",
    textDecorationLine: "underline",
  },
});
