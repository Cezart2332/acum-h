import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  companyId: number;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const eventId = parseInt(id as string);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEventData();
  }, []);

  const fetchEventData = async () => {
    try {
      // Fetch event details
      const eventResponse = await fetch(`${BASE_URL}/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        console.log("Event data received:", {
          id: eventData.id,
          title: eventData.title,
          hasPhoto: !!eventData.photo,
          photoLength: eventData.photo ? eventData.photo.length : 0,
        });
        setEvent(eventData);
      } else {
        console.log("Failed to fetch event, status:", eventResponse.status);
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchEventData().finally(() => setRefreshing(false));
  }, []);

  const deleteEvent = async () => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/events/${eventId}`, {
                method: "DELETE",
              });
              if (response.ok) {
                Alert.alert("Success", "Event deleted successfully", [
                  { text: "OK", onPress: () => router.back() },
                ]);
              } else {
                Alert.alert("Error", "Failed to delete event");
              }
            } catch (error) {
              console.error("Error deleting event:", error);
              Alert.alert("Error", "Failed to delete event");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: "Event Details",
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

  if (!event) {
    return (
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: "Event Details",
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
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#2D1421",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 24,
              borderWidth: 2,
              borderColor: "#7F1D1D",
            }}
          >
            <Ionicons name="warning-outline" size={40} color="#EF4444" />
          </View>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Event not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "#10B981",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Event Details",
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
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 8, marginRight: 16 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: "#1A3A2E",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#2D5A47",
                }}
                onPress={() => router.push(`./edit-event?id=${event.id}`)}
              >
                <Ionicons name="pencil" size={18} color="#6EE7B7" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#2D1421",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#7F1D1D",
                }}
                onPress={deleteEvent}
              >
                <Ionicons name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
            colors={["#10B981"]}
            progressBackgroundColor="#0F0F0F"
          />
        }
      >
        <View>
          {/* Event Image */}
          {event.photo && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${event.photo}` }}
              style={{
                width: "100%",
                height: 250,
              }}
              resizeMode="cover"
            />
          )}

          <View style={{ padding: 20 }}>
            {/* Event Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 24,
                  fontWeight: "700",
                  flex: 1,
                  marginRight: 12,
                }}
              >
                {event.title}
              </Text>
              <View
                style={{
                  backgroundColor: event.isActive
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(107, 114, 128, 0.2)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: event.isActive ? "#10B981" : "#6B7280",
                }}
              >
                <Text
                  style={{
                    color: event.isActive ? "#10B981" : "#6B7280",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {event.isActive ? "ACTIVE" : "INACTIVE"}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text
              style={{
                color: "#B8B8B8",
                fontSize: 16,
                lineHeight: 24,
                marginBottom: 24,
              }}
            >
              {event.description}
            </Text>

            {/* Event Details */}
            <View
              style={{
                backgroundColor: "#0F0F0F",
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: "#1F2937",
              }}
            >
              <Text
                style={{
                  color: "#10B981",
                  fontSize: 18,
                  fontWeight: "600",
                  marginBottom: 16,
                }}
              >
                Event Details
              </Text>

              <View style={{ gap: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#1A3A2E",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#10B981"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Date</Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                    >
                      {formatDate(event.eventDate)}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#1A3A2E",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="time-outline" size={20} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Time</Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                    >
                      {formatTime(event.startTime)} -{" "}
                      {formatTime(event.endTime)}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#1A3A2E",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#10B981"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                      Location
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "500",
                      }}
                    >
                      {event.address}
                    </Text>
                    {event.city && (
                      <Text style={{ color: "#9CA3AF", fontSize: 14 }}>
                        {event.city}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
