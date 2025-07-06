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

// Enhanced AnimatedButton with press animation
const AnimatedButton = React.memo(
  ({ onPress, children, loading }: any) => {
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
            colors={loading ? ['#4A4A4A', '#6A6A6A'] : ['#6C3AFF', '#9B59B6', '#E91E63']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingDot} />
                <Text style={styles.buttonText}>Se încarcă...</Text>
              </View>
            ) : (
              children
            )}
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }
);

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
  // CRITICAL: Track component mount state to prevent async warnings
  const [isMounted, setIsMounted] = useState(true);

  // Error states
  const [usernameError, setUsernameError] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Simplified focus management - like LoginScreen
  type FocusedInput = 'username' | 'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword' | null;
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

  // Simplified focus handlers - like LoginScreen
  const handleFocus = useCallback((inputName: FocusedInput) => {
    setFocusedInput(inputName);
  }, []);

  const handleBlur = useCallback((inputName: FocusedInput) => {
    setFocusedInput(current => current === inputName ? null : current);
  }, []);

  // Individual input handlers
  const handleUsernameFocus = useCallback(() => handleFocus('username'), [handleFocus]);
  const handleUsernameBlur = useCallback(() => handleBlur('username'), [handleBlur]);
  const handleFirstNameFocus = useCallback(() => handleFocus('firstName'), [handleFocus]);
  const handleFirstNameBlur = useCallback(() => handleBlur('firstName'), [handleBlur]);
  const handleLastNameFocus = useCallback(() => handleFocus('lastName'), [handleFocus]);
  const handleLastNameBlur = useCallback(() => handleBlur('lastName'), [handleBlur]);
  const handleEmailFocus = useCallback(() => handleFocus('email'), [handleFocus]);
  const handleEmailBlur = useCallback(() => handleBlur('email'), [handleBlur]);
  const handlePasswordFocus = useCallback(() => handleFocus('password'), [handleFocus]);
  const handlePasswordBlur = useCallback(() => handleBlur('password'), [handleBlur]);
  const handleConfirmPasswordFocus = useCallback(() => handleFocus('confirmPassword'), [handleFocus]);
  const handleConfirmPasswordBlur = useCallback(() => handleBlur('confirmPassword'), [handleBlur]);

  const defaultImage = require("../assets/default.jpg");

  React.useEffect(() => {
    setIsMounted(true);
    
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

    // CRITICAL: Cleanup function to prevent async warnings
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Validation functions
  const validateUsername = (username: string): boolean => {
    if (!username.trim()) {
      setUsernameError("Numele de utilizator este obligatoriu");
      return false;
    }
    if (username.length < 3) {
      setUsernameError("Numele de utilizator trebuie să aibă cel puțin 3 caractere");
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
    // CRITICAL: Don't proceed if component unmounted
    if (!isMounted) return;
    
    // Validate all inputs
    const isUsernameValid = validateUsername(username);
    const isFirstNameValid = validateFirstName(firstName);
    const isLastNameValid = validateLastName(lastName);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isUsernameValid || !isFirstNameValid || !isLastNameValid || 
        !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      // Shake animation for errors
      if (isMounted) {
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
      }
      return;
    }

    if (isMounted) setLoading(true);

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

      // Success animation - only if component still mounted
      if (isMounted) {
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          if (isMounted) {
            navigation.replace("Home");
          }
        });
      }

    } catch (error) {
      if (!isMounted) return; // Don't show alerts on unmounted component
      
      console.error("Register error:", error);
      Alert.alert(
        "Eroare la înregistrare",
        "Nu s-a putut crea contul. Verifică conexiunea la internet și încearcă din nou.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      // CRITICAL: Only update loading state if component is mounted
      if (isMounted) {
        setLoading(false);
      }
    }
  };

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
          colors={['#0F0817', '#1A0B2E', '#2D1B69']}
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
                    colors={['#6C3AFF', '#9B59B6']}
                    style={styles.logoContainer}
                  >
                    <Ionicons name="person-add" size={getScaledSize(45)} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.title}>Înregistrare</Text>
                  <Text style={styles.subtitle}>Creează-ți contul nou!</Text>
                </View>

                {/* Enhanced Form Section */}
                <View style={styles.formSection}>
                  {/* Username Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Nume de utilizator</Text>
                    <TouchableOpacity
                      activeOpacity={1}
                      style={[
                        styles.inputWrapper,
                        focusedInput === 'username' && styles.inputWrapperFocused,
                        usernameError && styles.inputWrapperError,
                      ]}
                      onPress={() => usernameRef.current?.focus()}
                      // CRITICAL: Enhanced touch handling for immediate focus
                      delayPressIn={0}
                      delayPressOut={0}
                    >
                      <Ionicons
                        name="person-outline"
                        size={getScaledSize(22)}
                        color={
                          focusedInput === 'username'
                            ? "#6C3AFF"
                            : usernameError
                            ? "#E91E63"
                            : "#A78BFA"
                        }
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={usernameRef}
                        value={username}
                        onChangeText={(text) => {
                          setUsername(text);
                          if (usernameError) validateUsername(text);
                        }}
                        placeholder="Introdu numele de utilizator"
                        placeholderTextColor="#6B7280"
                        style={styles.textInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="username"
                        textContentType="username"
                        returnKeyType="next"
                        enablesReturnKeyAutomatically={true}
                        clearButtonMode="while-editing"
                        onFocus={handleUsernameFocus}
                        onBlur={handleUsernameBlur}
                        onSubmitEditing={() => firstNameRef.current?.focus()}
                      />
                    </TouchableOpacity>
                    {usernameError ? (
                      <Text style={styles.errorText}>{usernameError}</Text>
                    ) : null}
                  </View>

                  {/* Name Row */}
                  <View style={styles.nameRow}>
                    <View style={styles.nameField}>
                      <Text style={styles.inputLabel}>Prenume</Text>
                      <TouchableOpacity
                        activeOpacity={1}
                        style={[
                          styles.inputWrapper,
                          focusedInput === 'firstName' && styles.inputWrapperFocused,
                          firstNameError && styles.inputWrapperError,
                        ]}
                        onPress={() => firstNameRef.current?.focus()}
                        delayPressIn={0}
                        delayPressOut={0}
                      >
                        <Ionicons
                          name="person-outline"
                          size={getScaledSize(22)}
                          color={
                            focusedInput === 'firstName'
                              ? "#6C3AFF"
                              : firstNameError
                              ? "#E91E63"
                              : "#A78BFA"
                          }
                          style={styles.inputIcon}
                        />
                        <TextInput
                          ref={firstNameRef}
                          value={firstName}
                          onChangeText={(text) => {
                            setFirstName(text);
                            if (firstNameError) validateFirstName(text);
                          }}
                          placeholder="Prenumele tău"
                          placeholderTextColor="#6B7280"
                          style={styles.textInput}
                          autoCapitalize="words"
                          autoCorrect={false}
                          autoComplete="given-name"
                          textContentType="givenName"
                          returnKeyType="next"
                          enablesReturnKeyAutomatically={true}
                          clearButtonMode="while-editing"
                          onFocus={handleFirstNameFocus}
                          onBlur={handleFirstNameBlur}
                          onSubmitEditing={() => lastNameRef.current?.focus()}
                        />
                      </TouchableOpacity>
                      {firstNameError ? (
                        <Text style={styles.errorText}>{firstNameError}</Text>
                      ) : null}
                    </View>

                    <View style={styles.nameField}>
                      <Text style={styles.inputLabel}>Nume</Text>
                      <TouchableOpacity
                        activeOpacity={1}
                        style={[
                          styles.inputWrapper,
                          focusedInput === 'lastName' && styles.inputWrapperFocused,
                          lastNameError && styles.inputWrapperError,
                        ]}
                        onPress={() => lastNameRef.current?.focus()}
                        delayPressIn={0}
                        delayPressOut={0}
                      >
                        <Ionicons
                          name="person-outline"
                          size={getScaledSize(22)}
                          color={
                            focusedInput === 'lastName'
                              ? "#6C3AFF"
                              : lastNameError
                              ? "#E91E63"
                              : "#A78BFA"
                          }
                          style={styles.inputIcon}
                        />
                        <TextInput
                          ref={lastNameRef}
                          value={lastName}
                          onChangeText={(text) => {
                            setLastName(text);
                            if (lastNameError) validateLastName(text);
                          }}
                          placeholder="Numele tău"
                          placeholderTextColor="#6B7280"
                          style={styles.textInput}
                          autoCapitalize="words"
                          autoCorrect={false}
                          autoComplete="family-name"
                          textContentType="familyName"
                          returnKeyType="next"
                          enablesReturnKeyAutomatically={true}
                          clearButtonMode="while-editing"
                          onFocus={handleLastNameFocus}
                          onBlur={handleLastNameBlur}
                          onSubmitEditing={() => emailRef.current?.focus()}
                        />
                      </TouchableOpacity>
                      {lastNameError ? (
                        <Text style={styles.errorText}>{lastNameError}</Text>
                      ) : null}
                    </View>
                  </View>

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
                      onPress={() => emailRef.current?.focus()}
                      delayPressIn={0}
                      delayPressOut={0}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={getScaledSize(22)}
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
                        ref={emailRef}
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
                        onSubmitEditing={() => passwordRef.current?.focus()}
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
                      onPress={() => passwordRef.current?.focus()}
                      // CRITICAL: Enhanced touch handling for immediate focus
                      delayPressIn={0}
                      delayPressOut={0}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={getScaledSize(22)}
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
                        ref={passwordRef}
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          if (passwordError) validatePassword(text);
                          if (confirmPassword && confirmPasswordError) validateConfirmPassword(confirmPassword);
                        }}
                        placeholder="Introdu parola ta"
                        placeholderTextColor="#6B7280"
                        style={styles.textInput}
                        secureTextEntry={secure}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="next"
                        enablesReturnKeyAutomatically={true}
                        onFocus={handlePasswordFocus}
                        onBlur={handlePasswordBlur}
                        onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                      />
                      <TouchableOpacity
                        onPress={() => setSecure(!secure)}
                        style={styles.eyeButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} // Reduced since we have proper minWidth/Height
                        delayPressIn={0}
                        delayPressOut={0}
                      >
                        <Ionicons
                          name={secure ? "eye-off-outline" : "eye-outline"}
                          size={getScaledSize(22)}
                          color={focusedInput === 'password' ? "#6C3AFF" : "#A78BFA"}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {passwordError ? (
                      <Text style={styles.errorText}>{passwordError}</Text>
                    ) : null}
                  </View>

                  {/* Confirm Password Input */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Confirmă parola</Text>
                    <TouchableOpacity
                      activeOpacity={1}
                      style={[
                        styles.inputWrapper,
                        focusedInput === 'confirmPassword' && styles.inputWrapperFocused,
                        confirmPasswordError && styles.inputWrapperError,
                      ]}
                      onPress={() => confirmPasswordRef.current?.focus()}
                      delayPressIn={0}
                      delayPressOut={0}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={getScaledSize(22)}
                        color={
                          focusedInput === 'confirmPassword'
                            ? "#6C3AFF"
                            : confirmPasswordError
                            ? "#E91E63"
                            : "#A78BFA"
                        }
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={confirmPasswordRef}
                        value={confirmPassword}
                        onChangeText={(text) => {
                          setConfirmPassword(text);
                          if (confirmPasswordError) validateConfirmPassword(text);
                        }}
                        placeholder="Confirmă parola"
                        placeholderTextColor="#6B7280"
                        style={styles.textInput}
                        secureTextEntry={secureConfirm}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="done"
                        enablesReturnKeyAutomatically={true}
                        onFocus={handleConfirmPasswordFocus}
                        onBlur={handleConfirmPasswordBlur}
                        onSubmitEditing={onRegister}
                      />
                      <TouchableOpacity
                        onPress={() => setSecureConfirm(!secureConfirm)}
                        style={styles.eyeButton}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} // Reduced since we have proper minWidth/Height
                        delayPressIn={0}
                        delayPressOut={0}
                      >
                        <Ionicons
                          name={secureConfirm ? "eye-off-outline" : "eye-outline"}
                          size={getScaledSize(22)}
                          color={focusedInput === 'confirmPassword' ? "#6C3AFF" : "#A78BFA"}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {confirmPasswordError ? (
                      <Text style={styles.errorText}>{confirmPasswordError}</Text>
                    ) : null}
                  </View>

                  {/* Enhanced Register Button */}
                  <AnimatedButton onPress={onRegister} loading={loading}>
                    <View style={styles.buttonContent}>
                      <Ionicons name="person-add-outline" size={getScaledSize(22)} color="#FFFFFF" />
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
                        colors={['#6C3AFF', '#9B59B6']}
                        style={styles.footerButtonGradient}
                      >
                        <Text style={styles.footerButtonText}>Conectează-te</Text>
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

// Enhanced responsive styles with better visual hierarchy and form card redesign
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingCircle1: {
    position: 'absolute',
    top: "5%",
    right: "15%",
    width: screenWidth * 0.2,
    height: screenWidth * 0.2,
    borderRadius: screenWidth * 0.1,
    backgroundColor: '#6C3AFF',
    aspectRatio: 1,
  },
  floatingCircle2: {
    position: 'absolute',
    bottom: "15%",
    left: "10%",
    width: screenWidth * 0.12,
    height: screenWidth * 0.12,
    borderRadius: screenWidth * 0.06,
    backgroundColor: '#9B59B6',
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
    justifyContent: 'center',
    width: "90%", // Enhanced width to 90%
    maxWidth: 500, // Maximum width constraint of 500px
    alignSelf: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: "8%", // Increased spacing
  },
  logoContainer: {
    width: screenWidth * 0.22, // Slightly larger
    height: screenWidth * 0.22,
    borderRadius: screenWidth * 0.055,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: "4%",
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
    aspectRatio: 1,
  },
  title: {
    fontSize: getScaledSize(36), // Larger title (24-28px -> 36px)
    fontWeight: '800', // Bolder weight (700-800)
    color: '#FFFFFF',
    marginBottom: "2%",
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: getScaledSize(18), // Larger subtitle
    color: '#A78BFA',
    fontWeight: '600', // Bolder weight
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)', // Lighter background for glass morphism
    borderRadius: 28, // Larger border radius
    padding: 25, // Increased padding (20-25px)
    borderWidth: 1,
    borderColor: 'rgba(108, 58, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.4,
    shadowRadius: 50,
    elevation: 15,
    backdropFilter: 'blur(10px)', // Modern glass effect
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    gap: 15, // Enhanced gap
  },
  nameField: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20, // Consistent 20px spacing between sections
  },
  inputLabel: {
    fontSize: getScaledSize(16), // Larger label
    fontWeight: '700', // Bolder weight (700-800)
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 16, // 16px horizontal margin
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Lighter background
    borderRadius: 18, // Larger border radius
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16, // 16px horizontal margin
    height: 60, // 60px height
    paddingVertical: 10, // 10px vertical padding
  },
  inputWrapperFocused: {
    borderColor: '#6C3AFF',
    backgroundColor: 'rgba(108, 58, 255, 0.1)',
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  inputWrapperError: {
    borderColor: '#E91E63',
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: getScaledSize(17), // Larger font
    color: '#FFFFFF',
    fontWeight: '500',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  eyeButton: {
<<<<<<< HEAD
    // CRITICAL: Enhanced touch target for password visibility button
    minWidth: 48, // Ensure minimum 48px width
    minHeight: 48, // Ensure minimum 48px height
    padding: 12, // 12px padding gives us 24px + 12px + 12px = 48px total
    borderRadius: 12, // Rounded touch area
    marginLeft: 4, // Reduced margin to prevent overflow
    justifyContent: 'center', // Center the icon vertically
    alignItems: 'center', // Center the icon horizontally
    // CRITICAL: Visual debugging (remove in production)
    // backgroundColor: 'rgba(255, 0, 0, 0.1)', // Uncomment to see touch area
=======
    minWidth: 48,
    minHeight: 48,
    padding: 12,
    borderRadius: 12,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
>>>>>>> a814cc5 (Fix critical performance and UX issues in SearchScreen and RegisterScreen)
  },
  errorText: {
    color: '#E91E63',
    fontSize: getScaledSize(13), // Larger error text
    marginTop: 8,
    marginLeft: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 20, // 20px spacing
    marginBottom: 25,
    borderRadius: 18,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 60, // 60px button height
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: getScaledSize(18), // 18px font size
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
    letterSpacing: 0.8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20, // Additional spacing
  },
  footerText: {
    fontSize: getScaledSize(16), // Larger footer text
    color: '#A78BFA',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  footerButton: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  footerButtonGradient: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 15,
  },
  footerButtonText: {
    fontSize: getScaledSize(16), // Larger button text
    fontWeight: '700', // Bolder weight (700-800)
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
