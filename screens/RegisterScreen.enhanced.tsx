import React, { useState, useEffect } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "react-native";
import BASE_URL from "../config";

const { width, height } = Dimensions.get('window');

interface RegisterScreenProps {
  navigation: {
    replace: (screen: string) => void;
    navigate: (screen: string) => void;
  };
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [error, setError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(100);
  const scaleAnim = new Animated.Value(0.8);
  const logoRotateAnim = new Animated.Value(0);

  const defaultImage = require("../assets/default.jpg");

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
      Animated.timing(logoRotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateForm = () => {
    if (
      username.trim() === "" ||
      firstName.trim() === "" ||
      lastName.trim() === "" ||
      email.trim() === "" ||
      password.trim() === ""
    ) {
      setError(true);
      setPasswordError(false);
      return false;
    }

    if (password !== confirm) {
      setPasswordError(true);
      setError(false);
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Eroare", "Parola trebuie să aibă cel puțin 6 caractere");
      return false;
    }

    setError(false);
    setPasswordError(false);
    return true;
  };

  const onRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { uri: defaultUri } = Image.resolveAssetSource(defaultImage);

      const formData = new FormData();
      formData.append("username", username);
      formData.append("firstname", firstName);
      formData.append("lastname", lastName);
      formData.append("email", email);
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
        throw new Error('Registration failed');
      }

      const data = await response.json();
      await AsyncStorage.setItem("user", JSON.stringify(data));
      await AsyncStorage.setItem("loggedIn", JSON.stringify(true));
      
      navigation.replace("Home");
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert("Eroare", "A apărut o eroare la înregistrare. Încearcă din nou.");
      setLoading(false);
    }
  };

  const logoRotation = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0817" />
        
        {/* Background Gradient */}
        <LinearGradient
          colors={['#0F0817', '#1A1A1A', '#2A1A4A']}
          style={styles.backgroundGradient}
        >
          {/* Animated Background Elements */}
          <Animated.View 
            style={[
              styles.backgroundCircle1,
              { 
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.1],
                })
              }
            ]}
          />
          <Animated.View 
            style={[
              styles.backgroundCircle2,
              { 
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.08],
                })
              }
            ]}
          />

          <SafeAreaView style={styles.safeContainer}>
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
                    transform: [{ translateY: slideAnim }]
                  }
                ]}
              >
                {/* Logo Section */}
                <View style={styles.logoContainer}>
                  <Animated.View 
                    style={[
                      styles.logoBackground,
                      { 
                        transform: [
                          { scale: scaleAnim },
                          { rotate: logoRotation }
                        ]
                      }
                    ]}
                  >
                    <LinearGradient
                      colors={['#6C3AFF', '#9B59B6', '#BB86FC']}
                      style={styles.logoGradient}
                    >
                      <Ionicons name="person-add" size={48} color="#FFFFFF" />
                    </LinearGradient>
                  </Animated.View>
                  
                  <Animated.Text 
                    style={[
                      styles.logoText,
                      { 
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }]
                      }
                    ]}
                  >
                    Înregistrare
                  </Animated.Text>
                  <Text style={styles.logoSubtext}>
                    Alătură-te comunității noastre
                  </Text>
                </View>

                {/* Register Card */}
                <Animated.View 
                  style={[
                    styles.registerCard,
                    { 
                      transform: [{ scale: scaleAnim }]
                    }
                  ]}
                >
                  <LinearGradient
                    colors={['#1A1A1A', '#2A1A4A']}
                    style={styles.cardGradient}
                  >
                    <Text style={styles.welcomeText}>Creează cont nou</Text>
                    <Text style={styles.subtitleText}>
                      Completează informațiile de mai jos
                    </Text>

                    {/* Username Input */}
                    <View style={styles.inputContainer}>
                      <View style={[styles.inputWrapper, error && styles.inputError]}>
                        <LinearGradient
                          colors={['#2A1A4A', '#3A2A5A']}
                          style={styles.inputGradient}
                        >
                          <Ionicons
                            name="person-outline"
                            size={22}
                            color="#A78BFA"
                            style={styles.inputIcon}
                          />
                          <TextInput
                            value={username}
                            onChangeText={(text) => {
                              setUsername(text);
                              if (error) setError(false);
                            }}
                            placeholder="Nume utilizator"
                            placeholderTextColor="#8B5CF6"
                            style={styles.textInput}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </LinearGradient>
                      </View>
                    </View>

                    {/* First Name Input */}
                    <View style={styles.inputContainer}>
                      <View style={[styles.inputWrapper, error && styles.inputError]}>
                        <LinearGradient
                          colors={['#2A1A4A', '#3A2A5A']}
                          style={styles.inputGradient}
                        >
                          <Ionicons
                            name="person-outline"
                            size={22}
                            color="#A78BFA"
                            style={styles.inputIcon}
                          />
                          <TextInput
                            value={firstName}
                            onChangeText={(text) => {
                              setFirstName(text);
                              if (error) setError(false);
                            }}
                            placeholder="Prenume"
                            placeholderTextColor="#8B5CF6"
                            style={styles.textInput}
                            autoCapitalize="words"
                          />
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Last Name Input */}
                    <View style={styles.inputContainer}>
                      <View style={[styles.inputWrapper, error && styles.inputError]}>
                        <LinearGradient
                          colors={['#2A1A4A', '#3A2A5A']}
                          style={styles.inputGradient}
                        >
                          <Ionicons
                            name="person-outline"
                            size={22}
                            color="#A78BFA"
                            style={styles.inputIcon}
                          />
                          <TextInput
                            value={lastName}
                            onChangeText={(text) => {
                              setLastName(text);
                              if (error) setError(false);
                            }}
                            placeholder="Nume de familie"
                            placeholderTextColor="#8B5CF6"
                            style={styles.textInput}
                            autoCapitalize="words"
                          />
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                      <View style={[styles.inputWrapper, error && styles.inputError]}>
                        <LinearGradient
                          colors={['#2A1A4A', '#3A2A5A']}
                          style={styles.inputGradient}
                        >
                          <Ionicons
                            name="mail-outline"
                            size={22}
                            color="#A78BFA"
                            style={styles.inputIcon}
                          />
                          <TextInput
                            value={email}
                            onChangeText={(text) => {
                              setEmail(text);
                              if (error) setError(false);
                            }}
                            placeholder="Email"
                            placeholderTextColor="#8B5CF6"
                            style={styles.textInput}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                      <View style={[styles.inputWrapper, (error || passwordError) && styles.inputError]}>
                        <LinearGradient
                          colors={['#2A1A4A', '#3A2A5A']}
                          style={styles.inputGradient}
                        >
                          <Ionicons
                            name="lock-closed-outline"
                            size={22}
                            color="#A78BFA"
                            style={styles.inputIcon}
                          />
                          <TextInput
                            value={password}
                            onChangeText={(text) => {
                              setPassword(text);
                              if (error) setError(false);
                              if (passwordError) setPasswordError(false);
                            }}
                            placeholder="Parolă"
                            placeholderTextColor="#8B5CF6"
                            style={styles.textInput}
                            secureTextEntry={secure}
                          />
                          <TouchableOpacity
                            onPress={() => setSecure(!secure)}
                            style={styles.eyeButton}
                          >
                            <Ionicons
                              name={secure ? "eye-off-outline" : "eye-outline"}
                              size={22}
                              color="#A78BFA"
                            />
                          </TouchableOpacity>
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                      <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
                        <LinearGradient
                          colors={['#2A1A4A', '#3A2A5A']}
                          style={styles.inputGradient}
                        >
                          <Ionicons
                            name="lock-closed-outline"
                            size={22}
                            color="#A78BFA"
                            style={styles.inputIcon}
                          />
                          <TextInput
                            value={confirm}
                            onChangeText={(text) => {
                              setConfirm(text);
                              if (passwordError) setPasswordError(false);
                            }}
                            placeholder="Confirmă parola"
                            placeholderTextColor="#8B5CF6"
                            style={styles.textInput}
                            secureTextEntry={secureConfirm}
                          />
                          <TouchableOpacity
                            onPress={() => setSecureConfirm(!secureConfirm)}
                            style={styles.eyeButton}
                          >
                            <Ionicons
                              name={secureConfirm ? "eye-off-outline" : "eye-outline"}
                              size={22}
                              color="#A78BFA"
                            />
                          </TouchableOpacity>
                        </LinearGradient>
                      </View>
                    </View>

                    {/* Error Messages */}
                    {error && (
                      <Animated.View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                        <Text style={styles.errorText}>
                          Completează toate câmpurile!
                        </Text>
                      </Animated.View>
                    )}
                    
                    {passwordError && (
                      <Animated.View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                        <Text style={styles.errorText}>
                          Parolele nu coincid!
                        </Text>
                      </Animated.View>
                    )}

                    {/* Register Button */}
                    <TouchableOpacity
                      onPress={onRegister}
                      style={styles.registerButton}
                      activeOpacity={0.8}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['#6C3AFF', '#9B59B6']}
                        style={styles.buttonGradient}
                      >
                        {loading ? (
                          <View style={styles.loadingContainer}>
                            <Animated.View
                              style={[
                                styles.loadingSpinner,
                                {
                                  transform: [{
                                    rotate: logoRotateAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: ['0deg', '360deg'],
                                    })
                                  }]
                                }
                              ]}
                            >
                              <Ionicons name="sync" size={20} color="#FFFFFF" />
                            </Animated.View>
                            <Text style={styles.buttonText}>Se înregistrează...</Text>
                          </View>
                        ) : (
                          <>
                            <Ionicons name="person-add-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Înregistrează-te</Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Login Link */}
                    <View style={styles.loginContainer}>
                      <Text style={styles.loginText}>Ai deja cont?</Text>
                      <TouchableOpacity 
                        onPress={() => navigation.navigate("Login")}
                        style={styles.loginButton}
                      >
                        <Text style={styles.loginLinkText}>Conectează-te</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </Animated.View>
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
  backgroundCircle1: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#6C3AFF',
    top: -width * 0.5,
    left: -width * 0.25,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#9B59B6',
    bottom: -width * 0.4,
    right: -width * 0.3,
  },
  safeContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  content: {
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#E0E0FF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(108, 58, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  logoSubtext: {
    fontSize: 14,
    color: '#A78BFA',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  registerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  cardGradient: {
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A1A4A',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E0E0FF',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 14,
    color: '#A78BFA',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#2A1A4A',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#E0E0FF',
    fontWeight: '500',
    height: Platform.OS === 'ios' ? 20 : undefined,
  },
  eyeButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  registerButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    marginRight: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#A78BFA',
    fontSize: 16,
  },
  loginButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  loginLinkText: {
    color: '#6C3AFF',
    fontSize: 16,
    fontWeight: '700',
  },
});