import React, { useState, useRef, useCallback } from "react";
import { Image } from "react-native";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  PixelRatio,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config";

const { width: screenWidth } = Dimensions.get("window");

// Enhanced responsive font scaling
const fontScale = PixelRatio.getFontScale();
const getScaledSize = (size: number) => size / fontScale;

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Register"
>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

export default function RegisterScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);

  // Error states
  const [usernameError, setUsernameError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Simplified focus management
  type FocusedInput =
    | "username"
    | "firstName"
    | "lastName"
    | "email"
    | "password"
    | "confirmPassword"
    | null;
  const [focusedInput, setFocusedInput] = useState<FocusedInput>(null);

  // Input refs for proper focus management
  const usernameRef = useRef<TextInput>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Simplified focus handlers
  const handleFocus = useCallback((inputName: FocusedInput) => {
    setFocusedInput(inputName);
  }, []);

  const handleBlur = useCallback((inputName: FocusedInput) => {
    setFocusedInput((current) => (current === inputName ? null : current));
  }, []);

  // Individual input handlers
  const handleUsernameFocus = useCallback(
    () => handleFocus("username"),
    [handleFocus]
  );
  const handleUsernameBlur = useCallback(
    () => handleBlur("username"),
    [handleBlur]
  );
  const handleFirstNameFocus = useCallback(
    () => handleFocus("firstName"),
    [handleFocus]
  );
  const handleFirstNameBlur = useCallback(
    () => handleBlur("firstName"),
    [handleBlur]
  );
  const handleLastNameFocus = useCallback(
    () => handleFocus("lastName"),
    [handleFocus]
  );
  const handleLastNameBlur = useCallback(
    () => handleBlur("lastName"),
    [handleBlur]
  );
  const handleEmailFocus = useCallback(
    () => handleFocus("email"),
    [handleFocus]
  );
  const handleEmailBlur = useCallback(() => handleBlur("email"), [handleBlur]);
  const handlePasswordFocus = useCallback(
    () => handleFocus("password"),
    [handleFocus]
  );
  const handlePasswordBlur = useCallback(
    () => handleBlur("password"),
    [handleBlur]
  );
  const handleConfirmPasswordFocus = useCallback(
    () => handleFocus("confirmPassword"),
    [handleFocus]
  );
  const handleConfirmPasswordBlur = useCallback(
    () => handleBlur("confirmPassword"),
    [handleBlur]
  );

  const defaultImage = require("../assets/default.jpg");

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

  // Validation functions
  const validateUsername = (username: string): boolean => {
    if (!username.trim()) {
      setUsernameError("Numele de utilizator este obligatoriu");
      return false;
    }
    if (username.length < 3) {
      setUsernameError(
        "Numele de utilizator trebuie să aibă cel puțin 3 caractere"
      );
      return false;
    }
    setUsernameError("");
    return true;
  };

  const validateFirstName = (firstName: string): boolean => {
    if (!firstName.trim()) {
      setFirstNameError("Prenumele este obligatoriu");
      return false;
    }
    setFirstNameError("");
    return true;
  };

  const validateLastName = (lastName: string): boolean => {
    if (!lastName.trim()) {
      setLastNameError("Numele este obligatoriu");
      return false;
    }
    setLastNameError("");
    return true;
  };

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

  const onRegister = async () => {
    // Validate all inputs
    const isUsernameValid = validateUsername(username);
    const isFirstNameValid = validateFirstName(firstName);
    const isLastNameValid = validateLastName(lastName);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (
      !isUsernameValid ||
      !isFirstNameValid ||
      !isLastNameValid ||
      !isEmailValid ||
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
      return;
    }

    setLoading(true);

    try {
      const { uri: defaultUri } = Image.resolveAssetSource(defaultImage);

      const formData = new FormData();
      formData.append("username", username.trim());
      formData.append("firstname", firstName.trim());
      formData.append("lastname", lastName.trim());
      formData.append("email", email.trim());
      formData.append("password", password);
      formData.append("default", {
        uri: defaultUri,
        name: "default.jpg",
        type: "image/jpg",
      } as any);

      const registerRequest = {
        method: "POST",
        body: formData,
      };

      const response = await fetch(`${BASE_URL}/users`, registerRequest);

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
      console.error("Register error:", error);
      Alert.alert(
        "Eroare la înregistrare",
        "Nu s-a putut crea contul. Verifică conexiunea la internet și încearcă din nou.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Enhanced AnimatedButton with press animation
  const AnimatedButton = ({ onPress, children, loading }: any) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={loading}
        activeOpacity={0.9}
        style={styles.buttonContainer}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <LinearGradient
            colors={
              loading
                ? ["#4A4A4A", "#6A6A6A"]
                : ["#6C3AFF", "#9B59B6", "#E91E63"]
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
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Enhanced InputField component with better styling
  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    secureTextEntry = false,
    keyboardType = "default",
    autoCapitalize = "words",
    error,
    focused,
    onFocus,
    onBlur,
    showEye = false,
    eyePressed,
    secureState,
    inputRef,
    returnKeyType = "next",
    onSubmitEditing,
    autoComplete = "off",
    textContentType = "none",
  }: any) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        activeOpacity={1}
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
        ]}
        onPress={() => inputRef.current?.focus()}
      >
        <Ionicons
          name={icon}
          size={getScaledSize(22)}
          color={focused ? "#6C3AFF" : error ? "#E91E63" : "#A78BFA"}
          style={styles.inputIcon}
        />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          style={styles.textInput}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          enablesReturnKeyAutomatically={true}
          clearButtonMode={secureTextEntry ? "never" : "while-editing"}
          onFocus={onFocus}
          onBlur={onBlur}
          onSubmitEditing={onSubmitEditing}
        />
        {showEye && (
          <TouchableOpacity
            onPress={eyePressed}
            style={styles.eyeButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons
              name={secureState ? "eye-off-outline" : "eye-outline"}
              size={getScaledSize(22)}
              color={focused ? "#6C3AFF" : "#A78BFA"}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
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
                    transform: [
                      { translateY: slideAnim },
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                {/* Logo/Title Section */}
                <View style={styles.headerSection}>
                  <LinearGradient
                    colors={["#6C3AFF", "#9B59B6"]}
                    style={styles.logoContainer}
                  >
                    <Ionicons
                      name="person-add"
                      size={getScaledSize(40)}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                  <Text style={styles.title}>Înregistrare</Text>
                  <Text style={styles.subtitle}>Creează-ți contul nou!</Text>
                </View>

                {/* Enhanced Form Section */}
                <View style={styles.formSection}>
                  <InputField
                    label="Nume de utilizator"
                    value={username}
                    onChangeText={(text: string) => {
                      setUsername(text);
                      if (usernameError) validateUsername(text);
                    }}
                    placeholder="Introdu numele de utilizator"
                    icon="person-outline"
                    autoCapitalize="none"
                    autoComplete="username"
                    textContentType="username"
                    error={usernameError}
                    focused={focusedInput === "username"}
                    inputRef={usernameRef}
                    onFocus={handleUsernameFocus}
                    onBlur={handleUsernameBlur}
                    onSubmitEditing={() => firstNameRef.current?.focus()}
                  />

                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      <InputField
                        label="Prenume"
                        value={firstName}
                        onChangeText={(text: string) => {
                          setFirstName(text);
                          if (firstNameError) validateFirstName(text);
                        }}
                        placeholder="Prenumele tău"
                        icon="person-outline"
                        autoComplete="given-name"
                        textContentType="givenName"
                        error={firstNameError}
                        focused={focusedInput === "firstName"}
                        inputRef={firstNameRef}
                        onFocus={handleFirstNameFocus}
                        onBlur={handleFirstNameBlur}
                        onSubmitEditing={() => lastNameRef.current?.focus()}
                      />
                    </View>
                    <View style={styles.nameField}>
                      <InputField
                        label="Nume"
                        value={lastName}
                        onChangeText={(text: string) => {
                          setLastName(text);
                          if (lastNameError) validateLastName(text);
                        }}
                        placeholder="Numele tău"
                        icon="person-outline"
                        autoComplete="family-name"
                        textContentType="familyName"
                        error={lastNameError}
                        focused={focusedInput === "lastName"}
                        inputRef={lastNameRef}
                        onFocus={handleLastNameFocus}
                        onBlur={handleLastNameBlur}
                        onSubmitEditing={() => emailRef.current?.focus()}
                      />
                    </View>
                  </View>

                  <InputField
                    label="Email"
                    value={email}
                    onChangeText={(text: string) => {
                      setEmail(text);
                      if (emailError) validateEmail(text);
                    }}
                    placeholder="Introdu email-ul tău"
                    icon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    error={emailError}
                    focused={focusedInput === "email"}
                    inputRef={emailRef}
                    onFocus={handleEmailFocus}
                    onBlur={handleEmailBlur}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />

                  <InputField
                    label="Parolă"
                    value={password}
                    onChangeText={(text: string) => {
                      setPassword(text);
                      if (passwordError) validatePassword(text);
                      if (confirmPassword && confirmPasswordError)
                        validateConfirmPassword(confirmPassword);
                    }}
                    placeholder="Introdu parola ta"
                    icon="lock-closed-outline"
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    error={passwordError}
                    focused={focusedInput === "password"}
                    inputRef={passwordRef}
                    onFocus={handlePasswordFocus}
                    onBlur={handlePasswordBlur}
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    showEye={true}
                    eyePressed={() => setSecure(!secure)}
                    secureState={secure}
                  />

                  <InputField
                    label="Confirmă parola"
                    value={confirmPassword}
                    onChangeText={(text: string) => {
                      setConfirmPassword(text);
                      if (confirmPasswordError) validateConfirmPassword(text);
                    }}
                    placeholder="Confirmă parola"
                    icon="lock-closed-outline"
                    secureTextEntry={secureConfirm}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    error={confirmPasswordError}
                    focused={focusedInput === "confirmPassword"}
                    inputRef={confirmPasswordRef}
                    returnKeyType="done"
                    onFocus={handleConfirmPasswordFocus}
                    onBlur={handleConfirmPasswordBlur}
                    onSubmitEditing={onRegister}
                    showEye={true}
                    eyePressed={() => setSecureConfirm(!secureConfirm)}
                    secureState={secureConfirm}
                  />

                  {/* Enhanced Register Button */}
                  <AnimatedButton onPress={onRegister} loading={loading}>
                    <View style={styles.buttonContent}>
                      <Ionicons
                        name="person-add-outline"
                        size={getScaledSize(22)}
                        color="#FFFFFF"
                      />
                      <Text style={styles.buttonText}>Înregistrează-te</Text>
                    </View>
                  </AnimatedButton>

                  {/* Enhanced Footer */}
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Ai deja cont?</Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Login")}
                      style={styles.footerButton}
                      activeOpacity={0.8}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <LinearGradient
                        colors={["#6C3AFF", "#9B59B6"]}
                        style={styles.footerButtonGradient}
                      >
                        <Text style={styles.footerButtonText}>
                          Conectează-te
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
    </TouchableWithoutFeedback>
  );
}

// Enhanced responsive styles with better visual hierarchy
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
    top: "5%",
    right: "15%",
    width: screenWidth * 0.2,
    height: screenWidth * 0.2,
    borderRadius: screenWidth * 0.1,
    backgroundColor: "#6C3AFF",
    aspectRatio: 1,
  },
  floatingCircle2: {
    position: "absolute",
    bottom: "15%",
    left: "10%",
    width: screenWidth * 0.12,
    height: screenWidth * 0.12,
    borderRadius: screenWidth * 0.06,
    backgroundColor: "#9B59B6",
    aspectRatio: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: "5%",
    paddingVertical: "2%",
    minHeight: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    width: "90%", // Enhanced width
    maxWidth: 500, // Maximum width constraint
    alignSelf: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: "8%", // Increased spacing
  },
  logoContainer: {
    width: screenWidth * 0.2, // Slightly larger
    height: screenWidth * 0.2,
    borderRadius: screenWidth * 0.05,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "4%",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    aspectRatio: 1,
  },
  title: {
    fontSize: getScaledSize(32), // Larger title
    fontWeight: "800", // Bolder weight
    color: "#FFFFFF",
    marginBottom: "2%",
    letterSpacing: 1.2,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: getScaledSize(18), // Larger subtitle
    color: "#A78BFA",
    fontWeight: "600", // Bolder weight
    textAlign: "center",
  },
  formSection: {
    backgroundColor: "rgba(255, 255, 255, 0.08)", // Lighter background
    borderRadius: 28, // Larger border radius
    padding: 25, // Increased padding (20-25px)
    borderWidth: 1,
    borderColor: "rgba(108, 58, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.4,
    shadowRadius: 50,
    elevation: 15,
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
    gap: 15, // Enhanced gap
  },
  nameField: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20, // Consistent 20px spacing
  },
  inputLabel: {
    fontSize: getScaledSize(16), // Larger label
    fontWeight: "700", // Bolder weight
    color: "#FFFFFF",
    marginBottom: 8,
    marginLeft: 16, // 16px horizontal margin
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)", // Lighter background
    borderRadius: 18, // Larger border radius
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16, // 16px horizontal margin
    height: 60, // 60px height
    paddingVertical: 10, // 10px vertical padding
  },
  inputWrapperFocused: {
    borderColor: "#6C3AFF",
    backgroundColor: "rgba(108, 58, 255, 0.1)",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  inputWrapperError: {
    borderColor: "#E91E63",
    backgroundColor: "rgba(233, 30, 99, 0.1)",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: getScaledSize(17), // Larger font
    color: "#FFFFFF",
    fontWeight: "500",
    paddingVertical: 0,
    includeFontPadding: false,
  },
  eyeButton: {
    padding: 12, // Larger touch target
    borderRadius: 10,
    marginLeft: 8,
  },
  errorText: {
    color: "#E91E63",
    fontSize: getScaledSize(13), // Larger error text
    marginTop: 8,
    marginLeft: 16,
    fontWeight: "600",
  },
  buttonContainer: {
    marginTop: 20, // 20px spacing
    marginBottom: 25,
    borderRadius: 18,
    overflow: "hidden",
  },
  buttonGradient: {
    height: 60, // 60px button height
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: getScaledSize(18), // 18px font size
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 10,
    letterSpacing: 0.8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
  },
  footer: {
    alignItems: "center",
    marginTop: 20, // Additional spacing
  },
  footerText: {
    fontSize: getScaledSize(16), // Larger footer text
    color: "#A78BFA",
    marginBottom: 15,
    textAlign: "center",
    fontWeight: "500",
  },
  footerButton: {
    borderRadius: 15,
    overflow: "hidden",
  },
  footerButtonGradient: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 15,
  },
  footerButtonText: {
    fontSize: getScaledSize(16), // Larger button text
    fontWeight: "700", // Bolder weight
    color: "#FFFFFF",
    textAlign: "center",
  },
});
