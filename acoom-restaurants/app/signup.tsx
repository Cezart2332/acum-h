import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SecureApiService } from "@/lib/SecureApiService";

export default function Signup() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("Restaurants");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [certificate, setCertificate] = useState<any>(null);
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: "", color: "#6B7280" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { strength: score, text: "Slabă", color: "#EF4444" };
    if (score <= 3) return { strength: score, text: "Medie", color: "#F59E0B" };
    if (score <= 4) return { strength: score, text: "Bună", color: "#3B82F6" };
    return { strength: score, text: "Foarte bună", color: "#10B981" };
  };

  const passwordStrength = getPasswordStrength(password);

  const pickCertificateFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCertificate(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const pickCertificateImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCertificate(result.assets[0]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const showFilePickerOptions = () => {
    Alert.alert(
      "Alege tipul fișierului",
      "Selectează din ce sursă vrei să încarci certificatul",
      [
        { text: "PDF", onPress: pickCertificateFile },
        { text: "Poză", onPress: pickCertificateImage },
        { text: "Anulează", style: "cancel" },
      ]
    );
  };

  const onRegister = async () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !category.trim() ||
      !password.trim() ||
      !confirmPassword.trim() ||
      !certificate
    ) {
      setError(true);
      Alert.alert(
        "Eroare",
        "Trebuie să completezi toate câmpurile obligatorii"
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(true);
      Alert.alert("Eroare", "Parolele nu se potrivesc");
      return;
    }

    if (password.length < 8) {
      setError(true);
      Alert.alert("Eroare", "Parola trebuie să aibă cel puțin 8 caractere");
      return;
    }

    try {
      console.log("Starting registration process...");

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("Name", name.trim());
      formData.append("Email", email.trim());
      formData.append("Password", password.trim());
      formData.append("Category", category.trim());
      formData.append("IsActive", "0"); // Set as inactive by default

      if (certificate) {
        formData.append("Certificate", {
          uri: certificate.uri,
          type: certificate.mimeType || "application/pdf",
          name: certificate.name || "certificate.pdf",
        } as any);
        console.log("Certificate added to form data:", certificate.name);
      }

      console.log("Calling SecureApiService.registerWithFile...");
      const response = await SecureApiService.registerWithFile(formData);

      console.log("Registration response:", {
        success: response.success,
        status: response.status,
        error: response.error,
        hasData: !!response.data,
      });

      if (!response.success) {
        console.error("Registration failed:", response.error);
        throw new Error(response.error || "Failed to register company.");
      }

      console.log("Registration successful:", response.data);

      // Add a small delay to ensure AsyncStorage operations complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify data was stored
      const storedCompany = await AsyncStorage.getItem("company");
      const storedUser = await AsyncStorage.getItem("user");
      const storedLoggedIn = await AsyncStorage.getItem("loggedIn");

      console.log("Verification - Stored data:");
      console.log("Company:", storedCompany ? "Found" : "Not found");
      console.log("User:", storedUser ? "Found" : "Not found");
      console.log("LoggedIn:", storedLoggedIn);

      router.replace("/dashboard" as any);
    } catch (err) {
      console.error("Registration error:", err);
      Alert.alert(
        "Error",
        typeof err === "object" && err !== null && "message" in err
          ? String((err as { message?: string }).message)
          : "Something went wrong."
      );
    }
  };

  return (
    <View className="flex-1 bg-[#0F0817]">
      <StatusBar style="light" />

      {/* Background Elements */}
      <View className="absolute top-0 left-0 right-0 h-40 bg-violet-900 rounded-b-[50px]" />
      <View className="absolute top-20 right-10 w-20 h-20 bg-violet-800 rounded-full opacity-30" />
      <View className="absolute top-40 left-5 w-10 h-10 bg-violet-700 rounded-full opacity-50" />

      <ScrollView
        className="flex-1 p-4 pt-10"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="items-center mb-8">
          <View className="bg-gradient-to-br from-violet-600 to-indigo-800 p-5 rounded-2xl mb-4 shadow-lg shadow-violet-900">
            <Ionicons name="business" size={40} color="white" />
          </View>
          <Text className="text-3xl font-bold text-white">Înregistrare</Text>
          <Text className="text-violet-300 mt-2">
            Creează-ți contul de business
          </Text>
        </View>

        {/* Form Container */}
        <View className="bg-[#1A1A1A] rounded-2xl p-6 shadow-lg shadow-black">
          {/* Name */}
          <View className="mb-5">
            <Text className="text-violet-400 mb-2 font-medium">
              Nume companie
            </Text>
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
              <Ionicons name="business-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-white"
                placeholder="Introdu numele companiei"
                placeholderTextColor="#7C3AED"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setError(false);
                }}
              />
            </View>
          </View>

          {/* Email */}
          <View className="mb-5">
            <Text className="text-violet-400 mb-2 font-medium">Email</Text>
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
              <Ionicons name="mail-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-white"
                placeholder="adresa@email.com"
                placeholderTextColor="#7C3AED"
                keyboardType="email-address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(false);
                }}
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Category */}
          <View className="mb-5">
            <Text className="text-violet-400 mb-2 font-medium">Categorie</Text>
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
              <Ionicons name="pricetags-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-violet-300"
                editable={false}
                value={category}
              />
            </View>
          </View>

          {/* Certificate Upload */}
          <View className="mb-5">
            <Text className="text-violet-400 mb-2 font-medium">
              Certificat de înregistrare *
            </Text>
            <TouchableOpacity
              onPress={showFilePickerOptions}
              className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700"
            >
              <Ionicons name="document-outline" size={20} color="#A78BFA" />
              <View className="flex-1 ml-3">
                {certificate ? (
                  <Text className="text-white" numberOfLines={1}>
                    {certificate.name || "Fișier selectat"}
                  </Text>
                ) : (
                  <Text className="text-violet-400">
                    Încarcă certificatul de înregistrare (PDF sau poză)
                  </Text>
                )}
              </View>
              <Ionicons name="cloud-upload-outline" size={20} color="#A78BFA" />
            </TouchableOpacity>
            {certificate && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-green-400 text-sm ml-2">
                  Fișier încărcat cu succes
                </Text>
              </View>
            )}
          </View>

          {/* Password */}
          <View className="mb-5">
            <Text className="text-violet-400 mb-2 font-medium">Parolă</Text>
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
              <Ionicons name="lock-closed-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-white"
                placeholder="Creează o parolă sigură"
                placeholderTextColor="#7C3AED"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError(false);
                }}
                textContentType="newPassword"
                autoComplete="new-password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="ml-2"
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#A78BFA"
                />
              </TouchableOpacity>
            </View>
            {password && (
              <View className="mt-2">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm text-gray-400">
                    Puterea parolei:
                  </Text>
                  <Text
                    className="text-sm font-medium"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.text}
                  </Text>
                </View>
                <View className="flex-row gap-1">
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <View
                      key={dot}
                      className="flex-1 h-1 rounded-full"
                      style={{
                        backgroundColor:
                          dot <= passwordStrength.strength
                            ? passwordStrength.color
                            : "#374151",
                      }}
                    />
                  ))}
                </View>
                <View className="mt-2 px-3 py-2 bg-[#1A1A2E] rounded-lg border border-violet-800">
                  <Text className="text-xs text-violet-300 mb-1">
                    Parola trebuie să conțină:
                  </Text>
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name={
                        password.length >= 8
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={12}
                      color={password.length >= 8 ? "#10B981" : "#6B7280"}
                    />
                    <Text
                      className={`text-xs ml-2 ${
                        password.length >= 8
                          ? "text-green-400"
                          : "text-gray-400"
                      }`}
                    >
                      Cel puțin 8 caractere
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name={
                        /[a-z]/.test(password)
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={12}
                      color={/[a-z]/.test(password) ? "#10B981" : "#6B7280"}
                    />
                    <Text
                      className={`text-xs ml-2 ${
                        /[a-z]/.test(password)
                          ? "text-green-400"
                          : "text-gray-400"
                      }`}
                    >
                      Cel puțin o literă mică
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name={
                        /[A-Z]/.test(password)
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={12}
                      color={/[A-Z]/.test(password) ? "#10B981" : "#6B7280"}
                    />
                    <Text
                      className={`text-xs ml-2 ${
                        /[A-Z]/.test(password)
                          ? "text-green-400"
                          : "text-gray-400"
                      }`}
                    >
                      Cel puțin o literă mare
                    </Text>
                  </View>
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name={
                        /[0-9]/.test(password)
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={12}
                      color={/[0-9]/.test(password) ? "#10B981" : "#6B7280"}
                    />
                    <Text
                      className={`text-xs ml-2 ${
                        /[0-9]/.test(password)
                          ? "text-green-400"
                          : "text-gray-400"
                      }`}
                    >
                      Cel puțin o cifră
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        /[^a-zA-Z0-9]/.test(password)
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={12}
                      color={
                        /[^a-zA-Z0-9]/.test(password) ? "#10B981" : "#6B7280"
                      }
                    />
                    <Text
                      className={`text-xs ml-2 ${
                        /[^a-zA-Z0-9]/.test(password)
                          ? "text-green-400"
                          : "text-gray-400"
                      }`}
                    >
                      Cel puțin un caracter special
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View className="mb-5">
            <Text className="text-violet-400 mb-2 font-medium">
              Confirmă parola
            </Text>
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
              <Ionicons name="lock-closed-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-white"
                placeholder="Confirmă parola"
                placeholderTextColor="#7C3AED"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setError(false);
                }}
                textContentType="newPassword"
                autoComplete="new-password"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="ml-2"
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#A78BFA"
                />
              </TouchableOpacity>
            </View>
            {password && confirmPassword && password !== confirmPassword && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text className="text-red-400 text-sm ml-2">
                  Parolele nu se potrivesc
                </Text>
              </View>
            )}
            {password && confirmPassword && password === confirmPassword && (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-green-400 text-sm ml-2">
                  Parolele se potrivesc
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={onRegister}
            className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-xl py-4 items-center shadow-lg shadow-violet-800/50"
          >
            <Text className="text-white font-bold text-lg">
              Înregistrează compania
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-400">Ai deja cont?</Text>
            <TouchableOpacity
              onPress={() => router.push("/login")}
              className="ml-1"
            >
              <Text className="text-violet-400 font-bold">Autentifică-te</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View className="mt-4 p-3 bg-red-900/30 rounded-lg border border-red-700">
              <Text className="text-red-400 text-center">
                Trebuie să completezi toate câmpurile obligatorii și să te
                asiguri că parolele se potrivesc
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Decorative Bottom */}
      <View className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-violet-900/80 to-transparent" />
    </View>
  );
}
