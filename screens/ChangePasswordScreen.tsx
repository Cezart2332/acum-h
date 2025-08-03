import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";
import { hapticFeedback } from "../utils/responsive";
import { BASE_URL } from "../config";
import { RootStackParamList } from "./RootStackParamList";

type ChangePasswordNav = NativeStackNavigationProp<
  RootStackParamList,
  "ChangePassword"
>;

interface Props {
  navigation: ChangePasswordNav;
}

// Move PasswordInput outside to prevent recreation on every render
const PasswordInput: React.FC<{
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  icon: string;
  styles: any;
}> = React.memo(
  ({
    placeholder,
    value,
    onChangeText,
    showPassword,
    onToggleVisibility,
    icon,
    styles,
  }) => {
    console.log("🎯 PasswordInput render for:", placeholder);

    return (
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Ionicons name={icon as any} size={20} color="#7B2CBF" />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder={placeholder}
            placeholderTextColor="#B19CD9"
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={onToggleVisibility}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#B19CD9"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

const ChangePasswordScreen: React.FC<Props> = ({ navigation }) => {
  console.log("🔄 ChangePasswordScreen render");

  const { theme } = useTheme();

  // Debug theme changes
  useEffect(() => {
    console.log("🎨 Theme changed:", theme);
  }, [theme]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Debug state changes that might cause re-renders
  useEffect(() => {
    console.log("📝 State updated:", {
      currentPasswordLength: currentPassword.length,
      newPasswordLength: newPassword.length,
      confirmPasswordLength: confirmPassword.length,
      showCurrentPassword,
      showNewPassword,
      showConfirmPassword,
      loading,
      hasUser: !!user,
    });
  }, [
    currentPassword,
    newPassword,
    confirmPassword,
    showCurrentPassword,
    showNewPassword,
    showConfirmPassword,
    loading,
    user,
  ]);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Memoize styles to prevent recreation on every render
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    console.log("🚀 ChangePasswordScreen useEffect - mounting");
    // Load user data
    loadUser();

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadUser = useCallback(async () => {
    console.log("👤 loadUser called");
    try {
      const userData = await AsyncStorage.getItem("user");
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  }, []);

  // Memoized callback functions to prevent re-renders
  const handleCurrentPasswordChange = useCallback((text: string) => {
    console.log("🔑 Current password changed:", text.length);
    setCurrentPassword(text);
  }, []);

  const handleNewPasswordChange = useCallback((text: string) => {
    console.log("🆕 New password changed:", text.length);
    setNewPassword(text);
  }, []);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    console.log("✅ Confirm password changed:", text.length);
    setConfirmPassword(text);
  }, []);

  const toggleCurrentPasswordVisibility = useCallback(() => {
    console.log("👁️ Toggle current password visibility");
    setShowCurrentPassword(!showCurrentPassword);
  }, [showCurrentPassword]);

  const toggleNewPasswordVisibility = useCallback(() => {
    console.log("👁️ Toggle new password visibility");
    setShowNewPassword(!showNewPassword);
  }, [showNewPassword]);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    console.log("👁️ Toggle confirm password visibility");
    setShowConfirmPassword(!showConfirmPassword);
  }, [showConfirmPassword]);

  const validatePasswords = () => {
    if (!currentPassword) {
      Alert.alert("Error", "Te rog să introduci parola curentă");
      return false;
    }
    if (!newPassword) {
      Alert.alert("Error", "Te rog să introduci parola nouă");
      return false;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Parola nouă trebuie să aibă cel puțin 6 caractere");
      return false;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Parolele nu se potrivesc");
      return false;
    }
    if (currentPassword === newPassword) {
      Alert.alert(
        "Error",
        "Parola nouă trebuie să fie diferită de cea curentă"
      );
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswords()) return;
    if (!user?.id) {
      Alert.alert("Error", "Nu s-au găsit informațiile utilizatorului");
      return;
    }

    setLoading(true);
    hapticFeedback("medium");

    try {
      const formData = new FormData();
      formData.append("currentPassword", currentPassword);
      formData.append("newPassword", newPassword);

      const response = await fetch(
        `${BASE_URL}/users/${user.id}/change-password`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        Alert.alert("Succes", "Parola a fost schimbată cu succes!", [
          {
            text: "OK",
            onPress: () => {
              hapticFeedback("light");
              navigation.goBack();
            },
          },
        ]);
      } else {
        const error = await response.json();
        Alert.alert("Error", error.Error || "Nu s-a putut schimba parola");
      }
    } catch (error) {
      Alert.alert("Error", "Eroare de conexiune. Te rog să încerci din nou.");
      console.error("Change password error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticFeedback("light");
            navigation.goBack();
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Schimbă Parola</Text>
          <Text style={styles.headerSubtitle}>
            Actualizează parola contului tău
          </Text>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Form Card */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Ionicons name="shield-checkmark" size={32} color="#7B2CBF" />
                <Text style={styles.formTitle}>Securitate Cont</Text>
                <Text style={styles.formSubtitle}>
                  Pentru siguranța contului, te rog să introduci parola curentă
                  și noua parolă
                </Text>
              </View>

              <View style={styles.formBody}>
                <PasswordInput
                  placeholder="Parola curentă"
                  value={currentPassword}
                  onChangeText={handleCurrentPasswordChange}
                  showPassword={showCurrentPassword}
                  onToggleVisibility={toggleCurrentPasswordVisibility}
                  icon="lock-closed-outline"
                  styles={styles}
                />

                <PasswordInput
                  placeholder="Parola nouă"
                  value={newPassword}
                  onChangeText={handleNewPasswordChange}
                  showPassword={showNewPassword}
                  onToggleVisibility={toggleNewPasswordVisibility}
                  icon="key-outline"
                  styles={styles}
                />

                <PasswordInput
                  placeholder="Confirmă parola nouă"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  showPassword={showConfirmPassword}
                  onToggleVisibility={toggleConfirmPasswordVisibility}
                  icon="checkmark-circle-outline"
                  styles={styles}
                />

                {/* Password Requirements */}
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsTitle}>Cerințe parolă:</Text>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={
                        newPassword.length >= 6
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={16}
                      color={newPassword.length >= 6 ? "#10B981" : "#B19CD9"}
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        newPassword.length >= 6 && styles.requirementMet,
                      ]}
                    >
                      Cel puțin 6 caractere
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={
                        newPassword !== currentPassword && newPassword
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={16}
                      color={
                        newPassword !== currentPassword && newPassword
                          ? "#10B981"
                          : "#B19CD9"
                      }
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        newPassword !== currentPassword &&
                          newPassword &&
                          styles.requirementMet,
                      ]}
                    >
                      Diferită de parola curentă
                    </Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons
                      name={
                        newPassword === confirmPassword && newPassword
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={16}
                      color={
                        newPassword === confirmPassword && newPassword
                          ? "#10B981"
                          : "#B19CD9"
                      }
                    />
                    <Text
                      style={[
                        styles.requirementText,
                        newPassword === confirmPassword &&
                          newPassword &&
                          styles.requirementMet,
                      ]}
                    >
                      Parolele se potrivesc
                    </Text>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!currentPassword ||
                      !newPassword ||
                      !confirmPassword ||
                      loading) &&
                      styles.submitButtonDisabled,
                  ]}
                  onPress={handleChangePassword}
                  disabled={
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword ||
                    loading
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.submitButtonContent}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text style={styles.submitButtonText}>
                          Schimbă Parola
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000000",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 20,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(123, 44, 191, 0.2)",
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(123, 44, 191, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(123, 44, 191, 0.3)",
    },
    headerTextContainer: {
      flex: 1,
      marginLeft: 16,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },
    headerSubtitle: {
      fontSize: 14,
      color: "#B19CD9",
      marginTop: 4,
      fontWeight: "400",
    },
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    formCard: {
      backgroundColor: "#1A1A1A",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(123, 44, 191, 0.2)",
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    formHeader: {
      alignItems: "center",
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(123, 44, 191, 0.1)",
    },
    formTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#FFFFFF",
      marginTop: 12,
      letterSpacing: 0.3,
    },
    formSubtitle: {
      fontSize: 14,
      color: "#B19CD9",
      textAlign: "center",
      marginTop: 8,
      lineHeight: 20,
    },
    formBody: {
      padding: 24,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#0F0F0F",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(123, 44, 191, 0.2)",
      minHeight: 52,
    },
    inputIcon: {
      width: 48,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    textInput: {
      flex: 1,
      fontSize: 16,
      color: "#FFFFFF",
      paddingVertical: 16,
      paddingRight: 48,
    },
    eyeButton: {
      position: "absolute",
      right: 16,
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    requirementsContainer: {
      marginTop: 20,
      padding: 16,
      backgroundColor: "rgba(123, 44, 191, 0.05)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(123, 44, 191, 0.1)",
    },
    requirementsTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: "#FFFFFF",
      marginBottom: 12,
    },
    requirementItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    requirementText: {
      fontSize: 13,
      color: "#B19CD9",
      marginLeft: 8,
    },
    requirementMet: {
      color: "#10B981",
    },
    submitButton: {
      backgroundColor: "#7B2CBF",
      borderRadius: 12,
      marginTop: 24,
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      gap: 8,
    },
    submitButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },
  });

export default ChangePasswordScreen;
