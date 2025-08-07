import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config";
import { SecureApiService } from "@/lib/SecureApiService";

interface LocationOption {
  id: number;
  name: string;
  address?: string;
  city?: string;
}

export default function AddEventScreen() {
  // Remove the render count logging to prevent excessive console output
  // const renderCount = useRef(0);
  // renderCount.current += 1;
  // console.log("AddEventScreen rendered - render count:", renderCount.current);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  // Hardcoded city
  const city = "Constanta";

  // Date/time states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStartTime, setSelectedStartTime] = useState(new Date());
  const [selectedEndTime, setSelectedEndTime] = useState(new Date());

  // UI states
  const [imageBase64, setImageBase64] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showStartTimeModal, setShowStartTimeModal] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null
  );
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Refs
  const hasLoadedLocations = useRef(false);

  // Stable callbacks
  const handleBack = useCallback(() => {
    router.back();
  }, []);

  const handleImagePick = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setImageBase64(result.assets[0].base64);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to select image");
    }
  }, []);

  const loadLocationOptions = useCallback(async () => {
    if (hasLoadedLocations.current) return;

    setLoadingLocations(true);
    try {
      const response = await fetch(`${BASE_URL}/locations`);
      if (response.ok) {
        const data = await response.json();
        setLocationOptions(data || []);
        hasLoadedLocations.current = true;
      }
    } catch (error) {
      console.error("Failed to load locations:", error);
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const handleLocationSelect = useCallback(
    async (location: LocationOption | null) => {
      setSelectedLocationId(location?.id || null);
      setShowLocationModal(false);

      if (location?.id) {
        try {
          const response = await fetch(`${BASE_URL}/locations/${location.id}`);
          if (response.ok) {
            const locationData = await response.json();
            setAddress(locationData.address || "");
            // City is hardcoded to Constanta
          }
        } catch (error) {
          console.error("Failed to fetch location details:", error);
        }
      }
    },
    []
  );

  const getLocationName = useCallback(() => {
    if (!selectedLocationId) return "Select location (optional)";
    const location = locationOptions.find(
      (loc) => loc.id === selectedLocationId
    );
    return location?.name || "Select location (optional)";
  }, [selectedLocationId, locationOptions]);

  const validateInputs = useCallback(() => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter an event title");
      return false;
    }
    if (!description.trim()) {
      Alert.alert("Missing Description", "Please enter a description");
      return false;
    }
    if (!address.trim()) {
      Alert.alert("Missing Address", "Please enter an address");
      return false;
    }
    return true;
  }, [title, description, address]);

  const geocodeLocation = useCallback(async (fullAddress: string) => {
    console.log("Geocoding address:", fullAddress);
    try {
      // Use Geoapify API for better geocoding
      const API_KEY = "d5466dbfa4a84344b872af4009106e17";
      const encoded = encodeURI(`${fullAddress}, Constanta, Romania`);
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encoded}&limit=1&lang=ro&filter=countrycode:ro&apiKey=${API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();
      console.log("Geocoding response:", data);

      if (data && data.features && data.features.length > 0) {
        const location = data.features[0];
        if (location && location.geometry && location.geometry.coordinates) {
          // Geoapify returns coordinates as [longitude, latitude]
          const [lon, lat] = location.geometry.coordinates;
          console.log("Extracted coordinates:", lat, lon);
          return {
            latitude: lat,
            longitude: lon,
          };
        }
      }
      console.log("No coordinates found in response");
      return null;
    } catch (error) {
      console.error("Geocoding failed:", error);
      return null;
    }
  }, []);

  const formatDisplayDate = useCallback((date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const formatDisplayTime = useCallback((time: Date) => {
    return time.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const handleCreateEvent = useCallback(async () => {
    if (!validateInputs()) return;

    setIsCreating(true);
    try {
      const fullAddress = `${address}, ${city}`;
      const coordinates = await geocodeLocation(fullAddress);

      // Get company data to verify we're logged in - with more robust checking
      console.log("Checking AsyncStorage for company data...");
      
      // First, let's get all AsyncStorage keys to debug
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("All AsyncStorage keys:", allKeys);
      
      // Check all possible storage keys
      const companyData = await AsyncStorage.getItem("company");
      const userData = await AsyncStorage.getItem("user");
      const loggedInStatus = await AsyncStorage.getItem("loggedIn");
      
      console.log("Company data:", companyData ? "Found" : "Not found");
      console.log("User data:", userData ? "Found" : "Not found");
      console.log("Logged in status:", loggedInStatus);
      
      // If no data found, try to get raw values to debug
      if (!companyData && !userData) {
        console.log("Debugging: Raw AsyncStorage values:");
        for (const key of allKeys) {
          const value = await AsyncStorage.getItem(key);
          console.log(`  ${key}: ${value ? value.substring(0, 100) + '...' : 'null'}`);
        }
      }
      
      let activeData = null;
      
      if (companyData) {
        try {
          activeData = JSON.parse(companyData);
          console.log("Parsed company data:", activeData);
        } catch (e) {
          console.error("Error parsing company data:", e);
        }
      }
      
      if (!activeData && userData) {
        try {
          activeData = JSON.parse(userData);
          console.log("Parsed user data:", activeData);
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      }
      
      if (!activeData) {
        console.log("No company/user data found in any storage location");
        Alert.alert("Authentication Error", "Please log in again to create events.", [
          { text: "OK", onPress: () => {
            // Navigate to login screen or dashboard
            router.replace("/login");
          }}
        ]);
        setIsCreating(false);
        return;
      }

      console.log("Using data for authentication:", {
        type: activeData.type,
        id: activeData.id || activeData.Id,
        name: activeData.name,
        email: activeData.email
      });
      
      // Check if we have authentication tokens
      const accessToken = await AsyncStorage.getItem("access_token");
      const refreshToken = await AsyncStorage.getItem("refresh_token");
      
      console.log("Access token:", accessToken ? "Found" : "Not found");
      console.log("Refresh token:", refreshToken ? "Found" : "Not found");
      
      if (!accessToken && !refreshToken) {
        console.log("No authentication tokens found");
        Alert.alert("Authentication Error", "No valid session found. Please log in again.", [
          { text: "OK", onPress: () => {
            router.replace("/login");
          }}
        ]);
        setIsCreating(false);
        return;
      }

      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("eventDate", selectedDate.toISOString());
      formData.append(
        "startTime",
        selectedStartTime.toTimeString().split(" ")[0]
      );
      formData.append("endTime", selectedEndTime.toTimeString().split(" ")[0]);
      formData.append("address", address.trim());
      formData.append("city", city);
      formData.append("tags", ""); // Add empty tags field
      formData.append("isActive", "true");

      if (coordinates && coordinates.latitude && coordinates.longitude) {
        formData.append("latitude", coordinates.latitude.toString());
        formData.append("longitude", coordinates.longitude.toString());
        console.log(
          "Added coordinates:",
          coordinates.latitude,
          coordinates.longitude
        );
      } else {
        console.log(
          "No coordinates available - skipping latitude/longitude fields"
        );
      }

      // Only add image if we have valid base64 data
      if (imageBase64 && imageBase64.length > 0) {
        formData.append("photo", imageBase64); // Changed from "image" to "photo"
        console.log("Added photo, length:", imageBase64.length);
      } else {
        console.log("No photo provided");
      }

      console.log("Sending FormData with fields:", {
        title: title.trim(),
        description: description.trim(),
        eventDate: selectedDate.toISOString(),
        startTime: selectedStartTime.toTimeString().split(" ")[0],
        endTime: selectedEndTime.toTimeString().split(" ")[0],
        address: address.trim(),
        city,
        coordinates: coordinates
          ? `${coordinates.latitude},${coordinates.longitude}`
          : "none",
        photoSize: imageBase64 ? imageBase64.length : 0,
      });

      const response = await SecureApiService.post("/events", formData);

      console.log("Response status:", response.status);
      console.log("Response data:", response.data);
      console.log("Response error:", response.error);

      if (response.success) {
        Alert.alert("Success", "Event created successfully!", [
          { text: "OK", onPress: handleBack },
        ]);
      } else {
        console.log("Error response:", response);
        Alert.alert("Error", `Failed to create event: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Create event error:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
    } finally {
      setIsCreating(false);
    }
  }, [
    validateInputs,
    address,
    city,
    geocodeLocation,
    title,
    description,
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    imageBase64,
    handleBack,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      {/* Custom Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingTop: 60, // Account for status bar
          borderBottomWidth: 1,
          borderBottomColor: "#374151",
        }}
      >
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 18,
            fontWeight: "700",
            marginLeft: 16,
          }}
        >
          Create Event
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Section */}
          <TouchableOpacity
            onPress={handleImagePick}
            style={{
              backgroundColor: "#1F2937",
              borderRadius: 12,
              height: 200,
              marginBottom: 20,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#374151",
              borderStyle: "dashed",
            }}
          >
            {imageBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                style={{ width: "100%", height: "100%", borderRadius: 10 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Ionicons name="camera" size={40} color="#6B7280" />
                <Text style={{ color: "#9CA3AF", fontSize: 14, marginTop: 8 }}>
                  Tap to add event image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Title Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Event Title *
            </Text>
            <TextInput
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                color: "#FFFFFF",
                fontSize: 16,
                borderWidth: 1,
                borderColor: "#374151",
              }}
              placeholder="Enter event title"
              placeholderTextColor="#6B7280"
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
            />
          </View>

          {/* Description Input */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Description *
            </Text>
            <TextInput
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                color: "#FFFFFF",
                fontSize: 16,
                borderWidth: 1,
                borderColor: "#374151",
                height: 100,
                textAlignVertical: "top",
              }}
              placeholder="Enter event description"
              placeholderTextColor="#6B7280"
              value={description}
              onChangeText={setDescription}
              multiline
              autoCapitalize="sentences"
            />
          </View>

          {/* Location Section */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Event Location *
            </Text>

            {/* Location Picker */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 8 }}>
                Copy from existing location:
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowLocationModal(true);
                  loadLocationOptions();
                }}
                style={{
                  backgroundColor: "#1F2937",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#374151",
                  padding: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 16, flex: 1 }}>
                  {loadingLocations ? "Loading..." : getLocationName()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Address Input */}
            <TextInput
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                color: "#FFFFFF",
                fontSize: 16,
                borderWidth: 1,
                borderColor: "#374151",
                marginBottom: 12,
              }}
              placeholder="Street Address"
              placeholderTextColor="#6B7280"
              value={address}
              onChangeText={setAddress}
              autoCapitalize="words"
            />

            {/* City Display (Hardcoded) */}
            <View
              style={{
                backgroundColor: "#374151",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#4B5563",
              }}
            >
              <Text style={{ color: "#9CA3AF", fontSize: 16 }}>
                City: Constanta (Fixed)
              </Text>
            </View>
          </View>

          {/* Date Picker */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Event Date *
            </Text>
            <TouchableOpacity
              onPress={() => setShowDateModal(true)}
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#374151",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 16 }}>
                {formatDisplayDate(selectedDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Time Pickers */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                Start Time *
              </Text>
              <TouchableOpacity
                onPress={() => setShowStartTimeModal(true)}
                style={{
                  backgroundColor: "#1F2937",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#374151",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 16 }}>
                  {formatDisplayTime(selectedStartTime)}
                </Text>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                End Time *
              </Text>
              <TouchableOpacity
                onPress={() => setShowEndTimeModal(true)}
                style={{
                  backgroundColor: "#1F2937",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#374151",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 16 }}>
                  {formatDisplayTime(selectedEndTime)}
                </Text>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            onPress={handleCreateEvent}
            disabled={isCreating}
            style={{
              backgroundColor: isCreating ? "#374151" : "#10B981",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 20,
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            {isCreating && (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}>
              {isCreating ? "Creating..." : "Create Event"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              backgroundColor: "#1F2937",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: "60%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#374151",
              }}
            >
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text
                style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "600" }}
              >
                Select Location
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Text
                  style={{
                    color: "#10B981",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#374151",
                }}
                onPress={() => handleLocationSelect(null)}
              >
                <Text
                  style={{
                    color: selectedLocationId === null ? "#10B981" : "#FFFFFF",
                    fontSize: 16,
                  }}
                >
                  None (Enter manually)
                </Text>
              </TouchableOpacity>
              {locationOptions.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#374151",
                  }}
                  onPress={() => handleLocationSelect(location)}
                >
                  <Text
                    style={{
                      color:
                        location.id === selectedLocationId
                          ? "#10B981"
                          : "#FFFFFF",
                      fontSize: 16,
                    }}
                  >
                    {location.name}
                  </Text>
                  {location.address && (
                    <Text
                      style={{ color: "#9CA3AF", fontSize: 14, marginTop: 4 }}
                    >
                      {location.address}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Modal */}
      {showDateModal && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDateModal}
          onRequestClose={() => setShowDateModal(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <View
              style={{
                backgroundColor: "#1F2937",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity onPress={() => setShowDateModal(false)}>
                  <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 18,
                    fontWeight: "600",
                  }}
                >
                  Select Date
                </Text>
                <TouchableOpacity onPress={() => setShowDateModal(false)}>
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Start Time Modal */}
      {showStartTimeModal && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showStartTimeModal}
          onRequestClose={() => setShowStartTimeModal(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <View
              style={{
                backgroundColor: "#1F2937",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity onPress={() => setShowStartTimeModal(false)}>
                  <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 18,
                    fontWeight: "600",
                  }}
                >
                  Start Time
                </Text>
                <TouchableOpacity onPress={() => setShowStartTimeModal(false)}>
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedStartTime}
                mode="time"
                display="spinner"
                onChange={(event, time) => {
                  if (time) {
                    setSelectedStartTime(time);
                  }
                }}
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* End Time Modal */}
      {showEndTimeModal && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showEndTimeModal}
          onRequestClose={() => setShowEndTimeModal(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <View
              style={{
                backgroundColor: "#1F2937",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity onPress={() => setShowEndTimeModal(false)}>
                  <Text style={{ color: "#6B7280", fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 18,
                    fontWeight: "600",
                  }}
                >
                  End Time
                </Text>
                <TouchableOpacity onPress={() => setShowEndTimeModal(false)}>
                  <Text
                    style={{
                      color: "#10B981",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedEndTime}
                mode="time"
                display="spinner"
                onChange={(event, time) => {
                  if (time) {
                    setSelectedEndTime(time);
                  }
                }}
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Modals would go here */}
    </View>
  );
}
