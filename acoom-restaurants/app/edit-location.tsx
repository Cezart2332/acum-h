import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  SafeAreaView,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import BASE_URL from "../config";

interface LocationData {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  tags: string;
  description?: string;
  photo: string;
  menuName: string;
  hasMenu: boolean;
}

export default function EditLocationScreen() {
  const { id } = useLocalSearchParams();
  const locationId = parseInt(id as string);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    tags: "",
    description: "",
    latitude: "",
    longitude: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [menu, setMenu] = useState<any>(null);
  const [hasExistingMenu, setHasExistingMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchLocationData();
  }, []);

  const fetchLocationData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/locations/${locationId}`);
      if (response.ok) {
        const data: LocationData = await response.json();
        setFormData({
          name: data.name,
          address: data.address,
          tags: data.tags,
          description: data.description || "",
          latitude: data.latitude.toString(),
          longitude: data.longitude.toString(),
        });
        setPhoto(data.photo);
        setHasExistingMenu(data.hasMenu);
      } else {
        Alert.alert("Error", "Failed to load location data");
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      Alert.alert("Error", "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setNewPhoto(result.assets[0].uri);
    }
  };

  const pickMenu = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setMenu(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking menu:", error);
      Alert.alert("Error", "Failed to pick menu file");
    }
  };

  const getCurrentLocation = () => {
    Alert.alert(
      "Location",
      "This would use GPS to get current location. For demo, using sample coordinates.",
      [
        {
          text: "OK",
          onPress: () => {
            setFormData({
              ...formData,
              latitude: "44.4268",
              longitude: "26.1025",
            });
          },
        },
      ]
    );
  };

  const geocodeAddress = async () => {
    if (!formData.address.trim()) {
      Alert.alert("Error", "Please enter an address first");
      return;
    }

    try {
      const API_KEY = "d5466dbfa4a84344b872af4009106e17";
      const encoded = encodeURI(`${formData.address.trim()}, Romania`);
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

      // Extract coordinates from geometry.coordinates [longitude, latitude]
      const [longitude, latitude] = location.geometry.coordinates;

      setFormData({
        ...formData,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      });

      Alert.alert("Success", "Address geocoded successfully!");
    } catch (error) {
      console.error("Geocoding error:", error);
      Alert.alert("Error", "Failed to geocode address. Please try again.");
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Location name is required");
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert("Error", "Address is required");
      return false;
    }
    if (!formData.latitude || !formData.longitude) {
      Alert.alert("Error", "Location coordinates are required");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setUpdating(true);
    try {
      const formDataToSend = new FormData();

      formDataToSend.append("name", formData.name);
      formDataToSend.append("address", formData.address);
      formDataToSend.append("latitude", formData.latitude);
      formDataToSend.append("longitude", formData.longitude);
      formDataToSend.append("tags", formData.tags);
      formDataToSend.append("description", formData.description);

      if (newPhoto) {
        const filename = newPhoto.split('/').pop() || 'location_photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formDataToSend.append("photo", {
          uri: newPhoto,
          type: type,
          name: filename,
        } as any);
        console.log("Photo attached to FormData with URI:", newPhoto);
      }

      if (menu) {
        formDataToSend.append("menu", {
          uri: menu.uri,
          type: "application/pdf",
          name: menu.name,
        } as any);
      }

      console.log("Sending PUT request to:", `${BASE_URL}/locations/${locationId}`);
      console.log("FormData contents:", {
        name: formData.name,
        address: formData.address,
        hasPhoto: !!newPhoto,
        hasMenu: !!menu
      });

      const response = await fetch(`${BASE_URL}/locations/${locationId}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          // Do NOT set Content-Type for FormData; the browser will add the boundary automatically
        },
        body: formDataToSend,
      });

      if (response.ok) {
        Alert.alert("Success", "Location updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        let errorMessage = "Failed to update location";
        console.log(response);
        try {
          const errorData = await response.json();
          errorMessage = errorData.Error || errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, try text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // Use default message
          }
        }

        if (response.status === 409) {
          // Conflict - duplicate name
          Alert.alert("Duplicate Location Name", errorMessage, [
            { text: "OK" },
          ]);
        } else {
          Alert.alert("Error", errorMessage);
        }
      }
    } catch (error) {
      console.error("Error updating location:", error);
      Alert.alert("Error", "Network error occurred");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
        <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
          <Stack.Screen
            options={{
              title: "Edit Location",
              headerStyle: { backgroundColor: "#0F0F0F" },
              headerTintColor: "#FFFFFF",
              headerTitleStyle: { fontWeight: "700", fontSize: 18 },
              headerShadowVisible: false,
            }}
          />
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 32,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                borderWidth: 3,
                borderColor: "#2D1B69",
                borderTopColor: "#7C3AED",
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "500",
                letterSpacing: 0.5,
              }}
            >
              Loading location...
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: "Edit Location",
            headerStyle: { backgroundColor: "#0F0F0F" },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: { fontWeight: "700", fontSize: 18 },
            headerShadowVisible: false,
          }}
        />

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ padding: 20 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 28,
                fontWeight: "700",
                marginBottom: 24,
                letterSpacing: 0.5,
              }}
            >
              Edit Location
            </Text>

            {/* Location Name */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: "#C4B5FD",
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  letterSpacing: 0.3,
                }}
              >
                Location Name *
              </Text>
              <TextInput
                value={formData.name}
                onChangeText={(text) => handleInputChange("name", text)}
                placeholder="Enter location name..."
                placeholderTextColor="#6B7280"
                style={{
                  backgroundColor: "#0F0F0F",
                  borderWidth: 1,
                  borderColor: "#2D1B69",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  color: "#FFFFFF",
                  fontSize: 16,
                  letterSpacing: 0.2,
                }}
              />
            </View>

            {/* Address */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: "#C4B5FD",
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  letterSpacing: 0.3,
                }}
              >
                Address *
              </Text>
              <TextInput
                value={formData.address}
                onChangeText={(text) => handleInputChange("address", text)}
                placeholder="Enter full address..."
                placeholderTextColor="#6B7280"
                style={{
                  backgroundColor: "#0F0F0F",
                  borderWidth: 1,
                  borderColor: "#2D1B69",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  color: "#FFFFFF",
                  fontSize: 16,
                  letterSpacing: 0.2,
                  height: 80,
                  textAlignVertical: "top",
                }}
                multiline
                numberOfLines={3}
              />
              {/* Geocode Button */}
              <TouchableOpacity
                onPress={geocodeAddress}
                style={{
                  backgroundColor: "#1A3A2E",
                  borderWidth: 1,
                  borderColor: "#2D5A47",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="location-outline" size={18} color="#6EE7B7" />
                <Text
                  style={{
                    color: "#6EE7B7",
                    fontSize: 14,
                    fontWeight: "600",
                    marginLeft: 8,
                    letterSpacing: 0.3,
                  }}
                >
                  Get Coordinates from Address
                </Text>
              </TouchableOpacity>
            </View>

            {/* Location Coordinates */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-purple-200 text-sm font-medium">
                  Coordinates *
                </Text>
                <TouchableOpacity
                  onPress={getCurrentLocation}
                  className="bg-purple-600/30 px-3 py-1 rounded-lg"
                >
                  <Text className="text-purple-200 text-xs">Use Current</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <TextInput
                    value={formData.latitude}
                    onChangeText={(text) => handleInputChange("latitude", text)}
                    placeholder="Latitude"
                    placeholderTextColor="#6b7280"
                    className="bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-4 text-white text-base"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <TextInput
                    value={formData.longitude}
                    onChangeText={(text) =>
                      handleInputChange("longitude", text)
                    }
                    placeholder="Longitude"
                    placeholderTextColor="#6b7280"
                    className="bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-4 text-white text-base"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Tags */}
            <View className="mb-6">
              <Text className="text-purple-200 text-sm font-medium mb-2">
                Tags
              </Text>
              <TextInput
                value={formData.tags}
                onChangeText={(text) => handleInputChange("tags", text)}
                placeholder="e.g., Italian, Pizza, Fine Dining (comma-separated)"
                placeholderTextColor="#6b7280"
                className="bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-4 text-white text-base"
              />
            </View>

            {/* Description */}
            <View className="mb-6">
              <Text className="text-purple-200 text-sm font-medium mb-2">
                Description
              </Text>
              <TextInput
                value={formData.description}
                onChangeText={(text) => handleInputChange("description", text)}
                placeholder="Enter location description..."
                placeholderTextColor="#6b7280"
                className="bg-gray-800/50 border border-purple-500/30 rounded-xl px-4 py-4 text-white text-base"
                multiline
                numberOfLines={4}
                style={{ height: 100, textAlignVertical: "top" }}
              />
            </View>

            {/* Photo */}
            <View className="mb-6">
              <Text className="text-purple-200 text-sm font-medium mb-2">
                Location Photo
              </Text>
              <TouchableOpacity
                onPress={pickImage}
                className="border-2 border-dashed border-purple-500/50 rounded-xl p-6"
              >
                {newPhoto || photo ? (
                  <View className="items-center">
                    <Image
                      source={{
                        uri: newPhoto
                          ? newPhoto
                          : `data:image/jpeg;base64,${photo}`,
                      }}
                      className="w-full h-40 rounded-lg mb-3"
                      resizeMode="cover"
                    />
                    <Text className="text-green-400 text-sm">
                      {newPhoto
                        ? "New photo selected ✓"
                        : "Current photo (tap to change)"}
                    </Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <Ionicons name="camera" size={32} color="#a855f7" />
                    <Text className="text-purple-200 text-base font-medium mt-2">
                      Change Photo
                    </Text>
                    <Text className="text-gray-400 text-sm mt-1">
                      Tap to select from gallery
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Menu */}
            <View className="mb-8">
              <Text className="text-purple-200 text-sm font-medium mb-2">
                Menu (PDF)
              </Text>
              <TouchableOpacity
                onPress={pickMenu}
                className={`border-2 border-dashed rounded-xl p-6 ${
                  menu || hasExistingMenu
                    ? "border-green-500"
                    : "border-purple-500/50"
                }`}
              >
                <View className="items-center">
                  <Ionicons
                    name="document"
                    size={32}
                    color={menu || hasExistingMenu ? "#10b981" : "#a855f7"}
                  />
                  <Text
                    className={`text-base font-medium mt-2 ${
                      menu || hasExistingMenu
                        ? "text-green-400"
                        : "text-purple-200"
                    }`}
                  >
                    {menu
                      ? menu.name
                      : hasExistingMenu
                      ? "Menu exists (tap to replace)"
                      : "Add Menu (Optional)"}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">
                    {menu ? "New menu selected ✓" : "PDF format only"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={updating}
              style={{
                backgroundColor: updating ? "#4C1D95" : "#7C3AED",
                borderRadius: 16,
                paddingVertical: 16,
                opacity: updating ? 0.7 : 1,
                elevation: 8,
                shadowColor: "#7C3AED",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 18,
                  fontWeight: "700",
                  textAlign: "center",
                  letterSpacing: 0.5,
                }}
              >
                {updating ? "Updating Location..." : "Update Location"}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
