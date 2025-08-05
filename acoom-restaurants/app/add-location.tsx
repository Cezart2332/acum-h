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
    category: "",
    phoneNumber: "",
    tags: "",
    latitude: "",
    longitude: "",
  });
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [nameError, setNameError] = useState("");

  const checkLocationNameExists = async (companyId: string, name: string) => {
    try {
      const response = await fetch(
        `${BASE_URL}/companies/${companyId}/locations`
      );
      if (response.ok) {
        const locations = await response.json();
        return locations.some(
          (location: any) => location.name.toLowerCase() === name.toLowerCase()
        );
      }
    } catch (error) {
      console.error("Error checking location names:", error);
    }
    return false;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });

    // Clear name error when user changes the name
    if (field === "name" && nameError) {
      setNameError("");
    }

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
        // Extract coordinates from geometry.coordinates [longitude, latitude]
        const [longitude, latitude] = location.geometry.coordinates;
        setFormData((prev) => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        }));
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.name.trim() ||
      !formData.address.trim() ||
      !formData.category.trim() ||
      !formData.phoneNumber.trim()
    ) {
      Alert.alert("Eroare", "Te rog să completezi toate câmpurile obligatorii");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      Alert.alert("Eroare", "Te rog să aștepți ca adresa să fie procesată");
      return;
    }

    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        Alert.alert("Eroare", "Utilizatorul nu a fost găsit");
        return;
      }

      const user = JSON.parse(userData);
      const companyId = user.Id || user.id;

      // Check for duplicate location name before submitting
      const nameExists = await checkLocationNameExists(
        companyId,
        formData.name.trim()
      );
      if (nameExists) {
        setNameError(
          "O locație cu acest nume există deja. Te rog să alegi un nume diferit."
        );
        Alert.alert(
          "Nume Locație Duplicat",
          "O locație cu acest nume există deja pentru compania ta. Te rog să alegi un nume diferit.",
          [{ text: "OK" }]
        );
        return;
      }

      const locationData = {
        name: formData.name,
        address: formData.address,
        category: formData.category,
        phoneNumber: formData.phoneNumber,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        tags: formData.tags,
      };

      const formDataToSend = new FormData();
      formDataToSend.append("name", locationData.name);
      formDataToSend.append("address", locationData.address);
      formDataToSend.append("category", locationData.category);
      formDataToSend.append("phoneNumber", locationData.phoneNumber);
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
        Alert.alert("Succes", "Locația a fost adăugată cu succes!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        let errorMessage = "Adăugarea locației a eșuat";
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
          Alert.alert("Nume Locație Duplicat", errorMessage, [
            { text: "OK" },
          ]);
        } else {
          Alert.alert("Eroare", errorMessage);
        }
      }
    } catch (error) {
      console.error("Error adding location:", error);
      Alert.alert("Eroare", "Adăugarea locației a eșuat");
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
              Locație Nouă
            </Text>
            <Text
              style={{
                color: "#8b5cf6",
                fontSize: 17,
                fontWeight: "500",
                opacity: 0.9,
              }}
            >
              Extinde prezența afacerii tale
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
                Numele Locației
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
                borderColor: nameError
                  ? "#ef4444"
                  : formData.name
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
            {nameError ? (
              <Text
                style={{
                  color: "#ef4444",
                  fontSize: 14,
                  marginTop: 8,
                  marginLeft: 8,
                  fontWeight: "500",
                }}
              >
                {nameError}
              </Text>
            ) : null}
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

          {/* Phone Number */}
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
                <Ionicons name="call" size={18} color="#a855f7" />
              </View>
              <Text
                style={{
                  color: "#f1f5f9",
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Phone Number
              </Text>
              <Text style={{ color: "#ef4444", marginLeft: 6, fontSize: 16 }}>
                *
              </Text>
            </View>
            <TextInput
              value={formData.phoneNumber}
              onChangeText={(text) => handleInputChange("phoneNumber", text)}
              placeholder="e.g., 0712345678 or +40712345678"
              placeholderTextColor="#64748b"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                borderWidth: 1.5,
                borderColor: formData.phoneNumber
                  ? "rgba(139, 92, 246, 0.5)"
                  : "rgba(139, 92, 246, 0.2)",
                borderRadius: 18,
                paddingHorizontal: 24,
                paddingVertical: 20,
                color: "white",
                fontSize: 17,
                fontWeight: "600",
              }}
              keyboardType="phone-pad"
            />
          </View>

          {/* Category */}
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
                <Ionicons name="business" size={18} color="#a855f7" />
              </View>
              <Text
                style={{
                  color: "#f1f5f9",
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                Category
              </Text>
              <Text style={{ color: "#ef4444", marginLeft: 6, fontSize: 16 }}>
                *
              </Text>
            </View>

            {/* Category Selection */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {["restaurant", "pub", "cafenea", "club"].map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => handleInputChange("category", category)}
                  style={{
                    backgroundColor:
                      formData.category === category
                        ? "rgba(139, 92, 246, 0.3)"
                        : "rgba(15, 23, 42, 0.9)",
                    borderWidth: 1.5,
                    borderColor:
                      formData.category === category
                        ? "#a855f7"
                        : "rgba(139, 92, 246, 0.2)",
                    borderRadius: 16,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    minWidth: 100,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color:
                        formData.category === category ? "#a855f7" : "#f1f5f9",
                      fontSize: 16,
                      fontWeight: "600",
                      textTransform: "capitalize",
                    }}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
