import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { Stack, router } from "expo-router";
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

export default function EventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${BASE_URL}/events`);
      if (response.ok) {
        const eventsData = await response.json();
        console.log("Events data received:", eventsData.length, "events");
        eventsData.forEach((event: any, index: number) => {
          console.log(`Event ${index + 1}:`, {
            id: event.id,
            title: event.title,
            hasPhoto: !!event.photo,
            photoLength: event.photo ? event.photo.length : 0,
          });
        });
        setEvents(eventsData);
      } else {
        console.log("Failed to fetch events, status:", response.status);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchEvents().finally(() => setRefreshing(false));
  }, []);

  const deleteEvent = async (eventId: number) => {
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
                Alert.alert("Success", "Event deleted successfully");
                fetchEvents();
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
    return new Date(dateString).toLocaleDateString();
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
            title: "Events",
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
            Loading events...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Events",
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
            <TouchableOpacity
              style={{
                backgroundColor: "#1A3A2E",
                width: 40,
                height: 40,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
                borderWidth: 1,
                borderColor: "#2D5A47",
              }}
              onPress={() => router.push("./add-event")}
            >
              <Ionicons name="add" size={20} color="#6EE7B7" />
            </TouchableOpacity>
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
        <View style={{ padding: 20 }}>
          {events.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 32,
                marginTop: 100,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#1A3A2E",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 24,
                  borderWidth: 2,
                  borderColor: "#2D5A47",
                }}
              >
                <Ionicons name="calendar-outline" size={40} color="#10B981" />
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
                No events yet
              </Text>
              <Text
                style={{
                  color: "#B8B8B8",
                  fontSize: 14,
                  marginBottom: 24,
                  textAlign: "center",
                }}
              >
                Create your first event to get started
              </Text>
              <TouchableOpacity
                onPress={() => router.push("./add-event")}
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
                  Create Event
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={{
                  backgroundColor: "#0F0F0F",
                  borderRadius: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: "#1F2937",
                  overflow: "hidden",
                }}
                onPress={() => router.push(`./event-detail?id=${event.id}`)}
              >
                {event.photo && (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${event.photo}` }}
                    style={{
                      width: "100%",
                      height: 150,
                    }}
                    resizeMode="cover"
                  />
                )}
                <View style={{ padding: 16 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 18,
                        fontWeight: "600",
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
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
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

                  <Text
                    style={{
                      color: "#B8B8B8",
                      fontSize: 14,
                      marginBottom: 12,
                      lineHeight: 20,
                    }}
                    numberOfLines={2}
                  >
                    {event.description}
                  </Text>

                  <View style={{ gap: 8 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={{ color: "#B8B8B8", fontSize: 14 }}>
                        {formatDate(event.eventDate)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color="#10B981" />
                      <Text style={{ color: "#B8B8B8", fontSize: 14 }}>
                        {formatTime(event.startTime)} -{" "}
                        {formatTime(event.endTime)}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={{ color: "#B8B8B8", fontSize: 14 }}>
                        {event.address}, {event.city}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: 8,
                      }}
                    ></View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 16,
                      gap: 12,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => router.push(`./edit-event?id=${event.id}`)}
                      style={{
                        backgroundColor: "#1A3A2E",
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#2D5A47",
                      }}
                    >
                      <Text
                        style={{
                          color: "#6EE7B7",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => deleteEvent(event.id)}
                      style={{
                        backgroundColor: "#2D1421",
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "#7F1D1D",
                      }}
                    >
                      <Text
                        style={{
                          color: "#EF4444",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
