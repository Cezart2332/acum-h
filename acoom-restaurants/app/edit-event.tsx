import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BASE_URL from "../config";

interface Event {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  address: string;
  city: string;
  photo: string;
  photoUrl?: string;
  hasPhoto?: boolean;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  companyId: number;
}

export default function EditEventScreen() {
  const { id } = useLocalSearchParams();
  const eventId = parseInt(id as string);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Constanta");
  const [image, setImage] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, []);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`${BASE_URL}/events/${eventId}`);
      if (response.ok) {
        const event: Event = await response.json();
        console.log("Edit event data received:", {
          id: event.id,
          title: event.title,
          hasPhoto: !!event.photo,
          photoLength: event.photo ? event.photo.length : 0,
        });
        setTitle(event.title);
        setDescription(event.description);
        setEventDate(new Date(event.eventDate));

        // Parse time strings
        const [startHours, startMinutes] = event.startTime.split(":");
        const startTimeDate = new Date();
        startTimeDate.setHours(parseInt(startHours), parseInt(startMinutes));
        setStartTime(startTimeDate);

        const [endHours, endMinutes] = event.endTime.split(":");
        const endTimeDate = new Date();
        endTimeDate.setHours(parseInt(endHours), parseInt(endMinutes));
        setEndTime(endTimeDate);

        setAddress(event.address || "");
        setCity(event.city || "Constanta");
        
        // Handle both photoUrl and base64 photo formats
        if (event.photoUrl) {
          setImage(event.photoUrl);
        } else if (event.photo && event.photo !== "use_photo_url") {
          setImage(event.photo);
        } else {
          setImage(null);
        }
        
        setIsActive(event.isActive);
      } else {
        console.log(
          "Failed to fetch event for editing, status:",
          response.status
        );
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      Alert.alert("Error", "Failed to load event data");
    } finally {
      setInitialLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(result.assets[0].base64);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter an event title");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter an event description");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Error", "Please enter an address");
      return;
    }

    setLoading(true);

    try {
      // Get user data for CompanyId
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        Alert.alert("Error", "User not found");
        setLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      const companyId = user.Id || user.id;

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("eventDate", eventDate.toISOString());
      formData.append("startTime", startTime.toTimeString().split(" ")[0]);
      formData.append("endTime", endTime.toTimeString().split(" ")[0]);
      formData.append("address", address.trim());
      formData.append("city", city);
      formData.append("companyId", companyId.toString());
      formData.append("isActive", isActive.toString());

      if (image) {
        // If image is a URL, don't re-upload; backend will keep existing photoPath
        if (image.startsWith("http") || image.startsWith("https")) {
          console.log("Image is a URL, not appending file for update");
        } else {
          // Assume base64 and try to append as file for multipart upload
          try {
            const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
            formData.append("file", {
              uri: `data:image/jpeg;base64,${base64Data}`,
              name: "event.jpg",
              type: "image/jpeg",
            } as any);
            console.log("Appended image as file for event update, base64 length:", base64Data.length);
          } catch (err) {
            console.warn("Failed to append file for update, falling back to base64 field:", err);
            formData.append("photo", image);
          }
        }
      }

      const response = await fetch(`${BASE_URL}/events/${eventId}`, {
        method: "PUT",
        body: formData,
      });

      if (response.ok) {
        Alert.alert("Success", "Event updated successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const errorText = await response.text();
        Alert.alert("Error", `Failed to update event: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating event:", error);
      Alert.alert("Error", "Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: "Edit Event",
            headerShown: true,
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
              borderColor: "#1A3A2E",
              borderTopColor: "#10B981",
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
            Loading event...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Edit Event",
          headerShown: true,
          headerStyle: { backgroundColor: "#0F0F0F" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
          {/* Event Status */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Status
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => setIsActive(true)}
                style={{
                  flex: 1,
                  backgroundColor: isActive ? "#10B981" : "#1F2937",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: isActive ? "#10B981" : "#374151",
                }}
              >
                <Text
                  style={{
                    color: isActive ? "#FFFFFF" : "#9CA3AF",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsActive(false)}
                style={{
                  flex: 1,
                  backgroundColor: !isActive ? "#EF4444" : "#1F2937",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: !isActive ? "#EF4444" : "#374151",
                }}
              >
                <Text
                  style={{
                    color: !isActive ? "#FFFFFF" : "#9CA3AF",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  Inactive
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Event Image */}
          <TouchableOpacity
            onPress={pickImage}
            style={{
              backgroundColor: "#1F2937",
              borderRadius: 12,
              height: 200,
              marginBottom: 20,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#374151",
              borderStyle: image ? "solid" : "dashed",
            }}
          >
            {image ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${image}` }}
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 10,
                }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ alignItems: "center" }}>
                <Ionicons name="camera" size={40} color="#6B7280" />
                <Text
                  style={{
                    color: "#9CA3AF",
                    fontSize: 14,
                    marginTop: 8,
                  }}
                >
                  Tap to add event image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Title */}
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
            />
          </View>

          {/* Description */}
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
            />
          </View>

          {/* Location */}
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
                City: {city} (Fixed)
              </Text>
            </View>
          </View>

          {/* Image */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              Event Photo
            </Text>
            <TouchableOpacity
              onPress={pickImage}
              style={{
                backgroundColor: "#1F2937",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#374151",
                borderStyle: "dashed",
                padding: 20,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 120,
              }}
            >
              {image ? (
                <View style={{ width: "100%", alignItems: "center" }}>
                  <Image
                    source={{
                      uri: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
                    }}
                    style={{
                      width: "100%",
                      height: 200,
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                    resizeMode="cover"
                  />
                  <Text style={{ color: "#10B981", fontSize: 14 }}>
                    Tap to change photo
                  </Text>
                </View>
              ) : (
                <View style={{ alignItems: "center" }}>
                  <Ionicons name="camera-outline" size={40} color="#6B7280" />
                  <Text
                    style={{
                      color: "#6B7280",
                      fontSize: 16,
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    Tap to add photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Date */}
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
              onPress={() => setShowDatePicker(true)}
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
                {eventDate.toLocaleDateString()}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={eventDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setEventDate(selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* Time Range */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 20,
            }}
          >
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
                onPress={() => setShowStartTimePicker(true)}
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
                  {startTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowStartTimePicker(false);
                    if (selectedTime) {
                      setStartTime(selectedTime);
                    }
                  }}
                />
              )}
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
                onPress={() => setShowEndTimePicker(true)}
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
                  {endTime.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Ionicons name="time-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    setShowEndTimePicker(false);
                    if (selectedTime) {
                      setEndTime(selectedTime);
                    }
                  }}
                />
              )}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#374151" : "#10B981",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 20,
              marginBottom: 40,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {loading ? "Updating Event..." : "Update Event"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
