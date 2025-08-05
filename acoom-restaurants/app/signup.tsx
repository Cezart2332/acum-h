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
import { SecureApiService } from "@/lib/SecureApiService";

export default function Signup() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cui, setCui] = useState("");
  const [category, setCategory] = useState("Restaurants");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const onRegister = async () => {
    if (
      !name.trim() ||
      !email.trim() ||
      !cui.trim() ||
      !category.trim() ||
      !password.trim()
    ) {
      setError(true);
      return;
    }

    try {
      const response = await SecureApiService.register({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        cui: cui.trim(),
        category: category.trim(),
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to register company.");
      }

      console.log("Registration successful:", response.data);
      router.replace("/dashboard" as any);
    } catch (err) {
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
                onChangeText={setName}
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
                onChangeText={setEmail}
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* CUI */}
          <View className="mb-5">
            <Text className="text-violet-400 mb-2 font-medium">CUI</Text>
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
              <Ionicons name="card-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-white"
                placeholder="Introdu codul unic de înregistrare"
                placeholderTextColor="#7C3AED"
                keyboardType="numeric"
                value={cui}
                onChangeText={setCui}
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

          {/* Password */}
          <View className="mb-5">
            <Text className="text-violet-400 mb-2 font-medium">Parolă</Text>
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
              <Ionicons name="lock-closed-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-white"
                placeholder="Creează o parolă sigură"
                placeholderTextColor="#7C3AED"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                textContentType="newPassword"
                autoComplete="new-password"
              />
            </View>
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
                Trebuie să completezi toate câmpurile obligatorii
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
