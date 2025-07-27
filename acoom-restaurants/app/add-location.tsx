import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import BASE_URL from "../config";

export default function AddLocationScreen() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    tags: "",
    latitude: "",
    longitude: "",
  });
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });

    // Auto-geocode when address changes
    if (field === "address" && value.trim().length > 5) {
      geocodeAddress(value.trim());
    }
  };

  const geocodeAddress = async (address: string) => {
    if (!address || address.length < 5) return;

    setGeocoding(true);
    try {
      const API_KEY = "d5466dbfa4a84344b872af4009106e17";
      const encoded = encodeURI(`${address}, Constanta, Romania`);
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encoded}&limit=1&lang=ro&filter=countrycode:ro&apiKey=${API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();
      const location = data.features && data.features[0];

      if (location) {
        const { lat, lon } = location.properties;
        setFormData((prev) => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lon.toString(),
        }));
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      Alert.alert("Error", "Please wait for address to be processed");
      return;
    }

    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        Alert.alert("Error", "User not found");
        return;
      }

      const user = JSON.parse(userData);
      const companyId = user.Id || user.id;

      const locationData = {
        name: formData.name,
        address: formData.address,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        tags: formData.tags,
      };

      const formDataToSend = new FormData();
      formDataToSend.append("name", locationData.name);
      formDataToSend.append("address", locationData.address);
      formDataToSend.append("latitude", locationData.latitude.toString());
      formDataToSend.append("longitude", locationData.longitude.toString());
      formDataToSend.append("tags", locationData.tags);

      const response = await fetch(
        `${BASE_URL}/companies/${companyId}/locations`,
        {
          method: "POST",
          body: formDataToSend,
        }
      );

      if (response.ok) {
        Alert.alert("Success", "Location added successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const errorText = await response.text();
        Alert.alert("Error", `Failed to add location: ${errorText}`);
      }
    } catch (error) {
      console.error("Error adding location:", error);
      Alert.alert("Error", "Failed to add location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#0a0a0a", "#1a1a2e", "#16213e"]}
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{
          title: "",
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTransparent: true,
          headerTintColor: "#ffffff",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "rgba(139, 92, 246, 0.15)",
                borderWidth: 1,
                borderColor: "rgba(139, 92, 246, 0.3)",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: 16,
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#a855f7" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1, marginTop: 100 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View style={{ paddingHorizontal: 24 }}>
          {/* Header */}
          <View style={{ marginBottom: 48 }}>
            <Text
              style={{
                color: "white",
                fontSize: 36,
                fontWeight: "900",
                marginBottom: 12,
                letterSpacing: -1.5,
              }}
            >
              New Location
            </Text>
            <Text
              style={{
                color: "#8b5cf6",
                fontSize: 17,
                fontWeight: "500",
                opacity: 0.9,
              }}
            >
              Expand your business footprint
            </Text>
          </View>

          {/* Location Name */}
          <View style={{ marginBottom: 32 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "rgba(139, 92, 246, 0.15)",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="storefront" size={18} color="#a855f7" />
              </View>
              <Text
                style={{
                  color: "#f1f5f9",
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Location Name
              </Text>
              <Text style={{ color: "#ef4444", marginLeft: 6, fontSize: 16 }}>
                *
              </Text>
            </View>
            <TextInput
              value={formData.name}
              onChangeText={(text) => handleInputChange("name", text)}
              placeholder="e.g., Downtown Branch, Main Office"
              placeholderTextColor="#64748b"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                borderWidth: 1.5,
                borderColor: formData.name
                  ? "rgba(139, 92, 246, 0.5)"
                  : "rgba(139, 92, 246, 0.2)",
                borderRadius: 18,
                paddingHorizontal: 24,
                paddingVertical: 20,
                color: "white",
                fontSize: 17,
                fontWeight: "600",
              }}
            />
          </View>

          {/* Address */}
          <View style={{ marginBottom: 32 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "rgba(139, 92, 246, 0.15)",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="location" size={18} color="#a855f7" />
              </View>
              <Text
                style={{
                  color: "#f1f5f9",
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Address
              </Text>
              <Text style={{ color: "#ef4444", marginLeft: 6, fontSize: 16 }}>
                *
              </Text>
            </View>
            <TextInput
              value={formData.address}
              onChangeText={(text) => handleInputChange("address", text)}
              placeholder="Enter complete address..."
              placeholderTextColor="#64748b"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                borderWidth: 1.5,
                borderColor: formData.address
                  ? "rgba(139, 92, 246, 0.5)"
                  : "rgba(139, 92, 246, 0.2)",
                borderRadius: 18,
                paddingHorizontal: 24,
                paddingVertical: 20,
                color: "white",
                fontSize: 17,
                fontWeight: "600",
                height: 120,
                textAlignVertical: "top",
              }}
              multiline
              numberOfLines={4}
            />

            {/* Geocoding Status */}
            {(geocoding || (formData.latitude && formData.longitude)) && (
              <View
                style={{
                  backgroundColor: geocoding
                    ? "rgba(245, 158, 11, 0.1)"
                    : "rgba(34, 197, 94, 0.1)",
                  borderWidth: 1.5,
                  borderColor: geocoding
                    ? "rgba(245, 158, 11, 0.4)"
                    : "rgba(34, 197, 94, 0.4)",
                  borderRadius: 16,
                  padding: 16,
                  marginTop: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={geocoding ? "hourglass" : "checkmark-circle"}
                  size={18}
                  color={geocoding ? "#f59e0b" : "#22c55e"}
                />
                <Text
                  style={{
                    color: geocoding ? "#f59e0b" : "#22c55e",
                    fontSize: 14,
                    fontWeight: "600",
                    marginLeft: 10,
                    flex: 1,
                  }}
                >
                  {geocoding
                    ? "Getting coordinates..."
                    : `Located: ${formData.latitude}, ${formData.longitude}`}
                </Text>
              </View>
            )}
          </View>

          {/* Tags */}
          <View style={{ marginBottom: 48 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: "rgba(139, 92, 246, 0.15)",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="pricetags" size={18} color="#a855f7" />
              </View>
              <Text
                style={{
                  color: "#f1f5f9",
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Tags
              </Text>
              <Text
                style={{
                  color: "#64748b",
                  fontSize: 15,
                  fontWeight: "500",
                  marginLeft: 10,
                }}
              >
                (optional)
              </Text>
            </View>
            <TextInput
              value={formData.tags}
              onChangeText={(text) => handleInputChange("tags", text)}
              placeholder="restaurant, fast-food, delivery, takeaway..."
              placeholderTextColor="#64748b"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                borderWidth: 1.5,
                borderColor: formData.tags
                  ? "rgba(139, 92, 246, 0.5)"
                  : "rgba(139, 92, 246, 0.2)",
                borderRadius: 18,
                paddingHorizontal: 24,
                paddingVertical: 20,
                color: "white",
                fontSize: 17,
                fontWeight: "600",
              }}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={
              loading ||
              !formData.name.trim() ||
              !formData.address.trim() ||
              !formData.latitude ||
              geocoding
            }
            style={{
              backgroundColor:
                loading ||
                !formData.name.trim() ||
                !formData.address.trim() ||
                !formData.latitude ||
                geocoding
                  ? "rgba(100, 116, 139, 0.4)"
                  : "#8b5cf6",
              paddingVertical: 22,
              borderRadius: 18,
              marginBottom: 20,
              shadowColor: "#8b5cf6",
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading ? (
                <Text
                  style={{
                    color: "white",
                    fontSize: 19,
                    fontWeight: "800",
                  }}
                >
                  Creating Location...
                </Text>
              ) : (
                <>
                  <Ionicons name="add-circle" size={24} color="white" />
                  <Text
                    style={{
                      color: "white",
                      fontSize: 19,
                      fontWeight: "800",
                      marginLeft: 10,
                    }}
                  >
                    Create Location
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
