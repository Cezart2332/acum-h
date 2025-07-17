import BASE_URL from "@/config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
} from "react-native";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Trebuie completate toate câmpurile");
      return;
    }
    setError("");
    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Username: username.trim(),
          Password: password.trim(),
        }),
      });

      if (response.status === 401) {
        setError("Nume sau parolă incorectă");
        return;
      }

      const data = await response.json();
      await AsyncStorage.setItem("company", JSON.stringify(data));
      await AsyncStorage.setItem("loggedIn", JSON.stringify(true));
      router.replace("/company-profile");
    } catch {
      Alert.alert("Error", "A apărut o eroare, încearcă din nou");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1 bg-[#0F0817]">
        <StatusBar style="light" />

        {/* Background Gradient */}
        <View className="absolute top-0 left-0 right-0 h-1/3 bg-violet-900 rounded-b-[50px]" />

        <View className="flex-1 justify-center p-6">
          {/* Logo Section */}
          <View className="items-center mb-10">
            <View className="bg-violet-600 p-4 rounded-2xl mb-4 shadow-lg shadow-violet-800">
              <Image
                source={require("../../acoomh.png")}
                style={{ width: 48, height: 48 }}
                resizeMode="contain"
              />
            </View>
            <Text className="text-3xl font-bold text-white">
              AcoomH Business
            </Text>
            <Text className="text-violet-300 mt-1">
              Conectează-te la contul tău
            </Text>
          </View>

          {/* Login Form */}
          <View className="bg-[#1A1A1A] rounded-2xl p-6 shadow-lg shadow-black">
            {/* Username */}
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 mb-4 border border-violet-700">
              <Ionicons name="person-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-white"
                placeholder="Email sau Username"
                placeholderTextColor="#8B5CF6"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Password */}
            <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 mb-4 border border-violet-700">
              <Ionicons name="lock-closed-outline" size={20} color="#A78BFA" />
              <TextInput
                className="flex-1 ml-3 h-10 text-white"
                placeholder="Parolă"
                placeholderTextColor="#8B5CF6"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error ? (
              <View className="bg-red-900/30 p-3 rounded-lg mb-4 border border-red-700">
                <Text className="text-red-400 text-center">{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={onLogin}
              className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-xl py-4 items-center mb-4 shadow-lg shadow-violet-800/50"
            >
              <Text className="text-white font-bold text-lg">
                Autentificare
              </Text>
            </TouchableOpacity>

            <View className="flex-row justify-center mt-2">
              <Text className="text-gray-400">Nu ai cont? </Text>
              <TouchableOpacity onPress={() => router.push("/signup")}>
                <Text className="text-violet-400 font-bold">
                  Înregistrează-te
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Decorative Elements */}
        <View className="absolute bottom-0 left-0 right-0 h-20 bg-violet-900 rounded-t-[50px]" />
        <View className="absolute bottom-10 left-0 right-0 flex-row justify-center">
          {[1, 2, 3].map((i) => (
            <View key={i} className="w-2 h-2 bg-violet-600 rounded-full mx-1" />
          ))}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
