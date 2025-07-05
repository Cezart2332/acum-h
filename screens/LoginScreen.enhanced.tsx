import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config";

const { width, height } = Dimensions.get('window');

interface LoginScreenProps {
  navigation: {
    replace: (screen: string) => void;
    navigate: (screen: string) => void;
  };
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error1, setError1] = useState(false);
  const [error2, setError2] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(100);
  const scaleAnim = new Animated.Value(0.8);
  const logoRotateAnim = new Animated.Value(0);

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

  const onLogin = async () => {
    if (email.trim() === "" || password.trim() === "") {
      setError1(true);
      setError2(false);
      return;
    }

    setError1(false);
    setError2(false);
    setLoading(true);

    try {
      const loginData = {
        Username: email,
        Password: password,
      };
      
      const loginRequest = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      };

      const response = await fetch(`${BASE_URL}/login`, loginRequest);
      
      if (response.status === 401) {
        setError2(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      await AsyncStorage.setItem("user", JSON.stringify(data));
      await AsyncStorage.setItem("loggedIn", JSON.stringify(true));
      
      navigation.replace("Home");
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert("Eroare", "A apărut o eroare. Încearcă din nou.");
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
                    <Ionicons name="restaurant" size={48} color="#FFFFFF" />
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
                  Acum-H
                </Animated.Text>
                <Text style={styles.logoSubtext}>
                  Descoperă. Explorează. Savurează.
                </Text>
              </View>

              {/* Login Card */}
              <Animated.View 
                style={[
                  styles.loginCard,
                  { 
                    transform: [{ scale: scaleAnim }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#1A1A1A', '#2A1A4A']}
                  style={styles.cardGradient}
                >
                  <Text style={styles.welcomeText}>Bine ai venit!</Text>
                  <Text style={styles.subtitleText}>
                    Conectează-te pentru a continua
                  </Text>

                  {/* Email Input */}
                  <View style={styles.inputContainer}>
                    <View style={[styles.inputWrapper, error1 && styles.inputError]}>
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
                            if (error1) setError1(false);
                            if (error2) setError2(false);
                          }}
                          placeholder="Email sau Username"
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
                    <View style={[styles.inputWrapper, error1 && styles.inputError]}>
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
                            if (error1) setError1(false);
                            if (error2) setError2(false);
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

                  {/* Error Messages */}
                  {error1 && (
                    <Animated.View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                      <Text style={styles.errorText}>
                        Completează toate câmpurile!
                      </Text>
                    </Animated.View>
                  )}
                  
                  {error2 && (
                    <Animated.View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
                      <Text style={styles.errorText}>
                        Credențiale incorecte!
                      </Text>
                    </Animated.View>
                  )}

                  {/* Login Button */}
                  <TouchableOpacity
                    onPress={onLogin}
                    style={styles.loginButton}
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
                          <Text style={styles.buttonText}>Se conectează...</Text>
                        </View>
                      ) : (
                        <>
                          <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
                          <Text style={styles.buttonText}>Conectează-te</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Register Link */}
                  <View style={styles.registerContainer}>
                    <Text style={styles.registerText}>Nu ai cont?</Text>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate("Register")}
                      style={styles.registerButton}
                    >
                      <Text style={styles.registerLinkText}>Înregistrează-te</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </Animated.View>
            </Animated.View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#E0E0FF',
    letterSpacing: -1,
    textShadowColor: 'rgba(108, 58, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  logoSubtext: {
    fontSize: 16,
    color: '#A78BFA',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  loginCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6C3AFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  cardGradient: {
    padding: 32,
    borderWidth: 1,
    borderColor: '#2A1A4A',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#E0E0FF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    color: '#A78BFA',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputIcon: {
    marginRight: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#E0E0FF',
    fontWeight: '500',
    height: Platform.OS === 'ios' ? 24 : undefined,
  },
  eyeButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: 12,
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
    paddingVertical: 18,
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
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#A78BFA',
    fontSize: 16,
  },
  registerButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  registerLinkText: {
    color: '#6C3AFF',
    fontSize: 16,
    fontWeight: '700',
  },
});