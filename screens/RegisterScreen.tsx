import React, { useState, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config";

const { width, height } = Dimensions.get('window');

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

  // Focus states
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
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

  const AnimatedButton = ({ onPress, children, loading }: any) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={styles.buttonContainer}
    >
      <LinearGradient
        colors={loading ? ['#4A4A4A', '#6A6A6A'] : ['#6C3AFF', '#9B59B6', '#E91E63']}
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
  );

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
    secureState
  }: any) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        focused && styles.inputWrapperFocused,
        error && styles.inputWrapperError
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={focused ? "#6C3AFF" : error ? "#E91E63" : "#A78BFA"}
          style={styles.inputIcon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          style={styles.textInput}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {showEye && (
          <TouchableOpacity
            onPress={eyePressed}
            style={styles.eyeButton}
          >
            <Ionicons
              name={secureState ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={focused ? "#6C3AFF" : "#A78BFA"}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
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
                    <Ionicons name="person-add" size={40} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.title}>Înregistrare</Text>
                  <Text style={styles.subtitle}>Creează-ți contul nou!</Text>
                </View>

                {/* Form Section */}
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
                    error={usernameError}
                    focused={usernameFocused}
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => {
                      setUsernameFocused(false);
                      validateUsername(username);
                    }}
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
                        error={firstNameError}
                        focused={firstNameFocused}
                        onFocus={() => setFirstNameFocused(true)}
                        onBlur={() => {
                          setFirstNameFocused(false);
                          validateFirstName(firstName);
                        }}
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
                        error={lastNameError}
                        focused={lastNameFocused}
                        onFocus={() => setLastNameFocused(true)}
                        onBlur={() => {
                          setLastNameFocused(false);
                          validateLastName(lastName);
                        }}
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
                    error={emailError}
                    focused={emailFocused}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => {
                      setEmailFocused(false);
                      validateEmail(email);
                    }}
                  />

                  <InputField
                    label="Parolă"
                    value={password}
                    onChangeText={(text: string) => {
                      setPassword(text);
                      if (passwordError) validatePassword(text);
                      if (confirmPassword && confirmPasswordError) validateConfirmPassword(confirmPassword);
                    }}
                    placeholder="Introdu parola ta"
                    icon="lock-closed-outline"
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    error={passwordError}
                    focused={passwordFocused}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => {
                      setPasswordFocused(false);
                      validatePassword(password);
                    }}
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
                    error={confirmPasswordError}
                    focused={confirmPasswordFocused}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => {
                      setConfirmPasswordFocused(false);
                      validateConfirmPassword(confirmPassword);
                    }}
                    showEye={true}
                    eyePressed={() => setSecureConfirm(!secureConfirm)}
                    secureState={secureConfirm}
                  />

                  {/* Register Button */}
                  <AnimatedButton onPress={onRegister} loading={loading}>
                    <View style={styles.buttonContent}>
                      <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.buttonText}>Înregistrează-te</Text>
                    </View>
                  </AnimatedButton>

                  {/* Footer */}
                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Ai deja cont?</Text>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate("Login")}
                      style={styles.footerButton}
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
      </View>
    </TouchableWithoutFeedback>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingCircle1: {
    position: 'absolute',
    top: height * 0.05,
    right: width * 0.15,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6C3AFF',
  },
  floatingCircle2: {
    position: 'absolute',
    bottom: height * 0.15,
    left: width * 0.1,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#9B59B6',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#A78BFA',
    fontWeight: '500',
  },
  formSection: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(108, 58, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 10,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  nameField: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: '#6C3AFF',
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperError: {
    borderColor: '#E91E63',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: '#E91E63',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#A78BFA',
    marginBottom: 12,
  },
  footerButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  footerButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
