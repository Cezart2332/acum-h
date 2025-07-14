import BASE_URL from "@/config";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function Signup() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Constanta");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [cui, setCui] = useState("");
  const [category, setCategory] = useState("Restaurants");
  const [password, setPassword] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState(false);

  const defaultImage = require("./assets/default.jpg");

  const onAddTag = () => {
    if (tagInput.trim()) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const onRegister = async () => {
    const { uri: defaultUri } = Image.resolveAssetSource(defaultImage);
    if (
      !name.trim() ||
      !email.trim() ||
      !address.trim() ||
      !cui.trim() ||
      !category.trim() ||
      !password.trim()
    ) {
      setError(true);
      return;
    }

    // Geocoding
    let lat = null;
    let lon = null;
    try {
      const API_KEY = "d5466dbfa4a84344b872af4009106e17";
      const encoded = encodeURI(`${address.trim()}, ${city.trim()}`);
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encoded}&limit=1&lang=ro&filter=countrycode:ro&apiKey=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      const location = data.features && data.features[0];
      if (!location) {
        Alert.alert(
          "Error",
          "Location not found. Please enter a valid address."
        );
        return;
      }
      lat = location.properties.lat;
      lon = location.properties.lon;
      setLatitude(lat);
      setLongitude(lon);
    } catch {
      // silent
    }

    // Submit
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("cui", cui);
    formData.append("category", category);
    formData.append("password", password);
    formData.append("address", address);
    formData.append("latitude", lat?.toString() || "0");
    formData.append("longitude", lon?.toString() || "0");
    formData.append("tags", tags.join(","));
    formData.append("default", {
      uri: defaultUri,
      name: "default.jpg",
      type: "image/jpg",
    } as any);

    try {
      const response = await fetch(`${BASE_URL}/companies`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to register company.");
      const data = await response.json();
      await AsyncStorage.setItem("company", JSON.stringify(data));
      await AsyncStorage.setItem("loggedIn", JSON.stringify(true));
      router.replace("/company-profile");
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                />
              </View>
            </View>

            {/* Address */}
            <View className="mb-5">
              <Text className="text-violet-400 mb-2 font-medium">Adresă</Text>
              <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
                <Ionicons name="location-outline" size={20} color="#A78BFA" />
                <TextInput
                  className="flex-1 ml-3 h-10 text-white"
                  placeholder="Stradă, număr"
                  placeholderTextColor="#7C3AED"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* City */}
            <View className="mb-5">
              <Text className="text-violet-400 mb-2 font-medium">Oraș</Text>
              <View className="flex-row items-center bg-[#2A1A4A] rounded-xl px-4 py-3 border border-violet-700">
                <Ionicons name="map-outline" size={20} color="#A78BFA" />
                <TextInput
                  className="flex-1 ml-3 h-10 text-violet-300"
                  editable={false}
                  value={city}
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
              <Text className="text-violet-400 mb-2 font-medium">
                Categorie
              </Text>
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
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#A78BFA"
                />
                <TextInput
                  className="flex-1 ml-3 h-10 text-white"
                  placeholder="Creează o parolă sigură"
                  placeholderTextColor="#7C3AED"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {/* Tags */}
            <View className="mb-6">
              <Text className="text-violet-400 mb-2 font-medium">Etichete</Text>
              <View className="flex-row items-center mb-2">
                <TextInput
                  className="flex-1 bg-[#2A1A4A] rounded-xl px-4 py-3 h-12 text-white border border-violet-700"
                  placeholder="Adaugă o etichetă (ex: pizza, sushi)"
                  placeholderTextColor="#7C3AED"
                  value={tagInput}
                  onChangeText={setTagInput}
                />
                <TouchableOpacity
                  onPress={onAddTag}
                  className="ml-2 p-3 bg-violet-600 rounded-xl"
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap mt-2">
                {tags.map((t, i) => (
                  <View
                    key={i}
                    className="bg-violet-900 px-4 py-2 mr-2 mb-2 rounded-full flex-row items-center"
                  >
                    <Text className="text-violet-300 mr-2">#{t}</Text>
                    <TouchableOpacity onPress={() => removeTag(i)}>
                      <Ionicons name="close" size={16} color="#A78BFA" />
                    </TouchableOpacity>
                  </View>
                ))}
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
                <Text className="text-violet-400 font-bold">
                  Autentifică-te
                </Text>
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
    </TouchableWithoutFeedback>
  );
}
