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

interface Location {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  tags: string[];
  photo: string;
  menuName: string;
  hasMenu: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LocationHour {
  id: number;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface Reservation {
  id: number;
  customerName: string;
  customerEmail: string;
  reservationDate: string;
  timeSlot: string;
  numberOfPeople: number;
  status: string;
  createdAt: string;
}

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function LocationProfileScreen() {
  const { id } = useLocalSearchParams();
  const locationId = parseInt(id as string);

  const [location, setLocation] = useState<Location | null>(null);
  const [hours, setHours] = useState<LocationHour[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLocationData();
  }, []);

  const fetchLocationData = async () => {
    try {
      // Fetch location details
      const locationResponse = await fetch(
        `${BASE_URL}/locations/${locationId}`
      );
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        setLocation(locationData);
      }

      // Fetch location hours
      const hoursResponse = await fetch(
        `${BASE_URL}/locations/${locationId}/hours`
      );
      if (hoursResponse.ok) {
        const hoursData = await hoursResponse.json();

        // Map backend response to frontend interface
        const mappedHours = hoursData.map((item: any) => {
          // Handle DayOfWeek - convert string day names to numbers
          let dayOfWeek = 0;
          if (typeof item.dayOfWeek === "string") {
            // Map string day names to numbers (0=Sunday, 1=Monday, etc.)
            const dayNames = [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ];
            dayOfWeek = dayNames.indexOf(item.dayOfWeek);
            if (dayOfWeek === -1) dayOfWeek = 0; // Default to Sunday if not found
          } else if (typeof item.dayOfWeek === "number") {
            dayOfWeek = item.dayOfWeek;
          }

          return {
            id: item.id, // Backend uses lowercase 'id'
            dayOfWeek: dayOfWeek,
            isOpen: !item.isClosed, // Backend uses lowercase 'isClosed', frontend uses isOpen
            openTime: item.openTime || "09:00",
            closeTime: item.closeTime || "22:00",
          };
        });

        // Ensure we have entries for all 7 days (0=Sunday to 6=Saturday)
        const completeHours = [];
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const existingHour = mappedHours.find(
            (h: any) => h.dayOfWeek === dayIndex
          );
          const hourEntry = existingHour || {
            id: -dayIndex, // Use negative IDs for default entries
            dayOfWeek: dayIndex,
            isOpen: false, // Default to closed for missing days
            openTime: "09:00",
            closeTime: "22:00",
          };
          completeHours.push(hourEntry);
        }

        setHours(completeHours);
        console.log(completeHours);
      }

      // Fetch reservations
      const reservationsResponse = await fetch(
        `${BASE_URL}/locations/${locationId}/reservations`
      );
      if (reservationsResponse.ok) {
        const responseText = await reservationsResponse.text();
        if (responseText.trim() === "") {
          // Empty response, use empty array
          setReservations([]);
        } else {
          const reservationsData = JSON.parse(responseText);
          setReservations(reservationsData);
        }
      }
    } catch (error) {
      console.error("Error fetching location data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchLocationData().finally(() => setRefreshing(false));
  }, []);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTodayHours = () => {
    const today = new Date().getDay();
    const todayHours = hours.find((h) => h.dayOfWeek === today);
    if (!todayHours || !todayHours.isOpen) {
      return "Closed today";
    }
    return `${formatTime(todayHours.openTime)} - ${formatTime(
      todayHours.closeTime
    )}`;
  };

  const deleteLocation = async () => {
    Alert.alert(
      "Delete Location",
      "Are you sure you want to delete this location? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `${BASE_URL}/locations/${locationId}`,
                {
                  method: "DELETE",
                }
              );
              if (response.ok) {
                Alert.alert("Success", "Location deleted successfully", [
                  { text: "OK", onPress: () => router.back() },
                ]);
              } else {
                Alert.alert("Error", "Failed to delete location");
              }
            } catch (error) {
              console.error("Error deleting location:", error);
              Alert.alert("Error", "Failed to delete location");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: "Location Profile",
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
    );
  }

  if (!location) {
    return (
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: "Location Profile",
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
            Location not found
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "#7C3AED",
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
          title: "Location Profile",
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
                backgroundColor: "#2D1421",
                width: 40,
                height: 40,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
                borderWidth: 1,
                borderColor: "#7F1D1D",
              }}
              onPress={deleteLocation}
            >
              <Ionicons name="trash" size={18} color="#EF4444" />
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
            tintColor="#7C3AED"
            colors={["#7C3AED"]}
            progressBackgroundColor="#0F0F0F"
          />
        }
      >
        <View style={{ padding: 20 }}>
          {/* Location Info Card */}
          <View
            style={{
              backgroundColor: "#0F0F0F",
              borderRadius: 20,
              padding: 24,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: "#2D1B69",
              elevation: 8,
              shadowColor: "#6A0DAD",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            }}
          >
            {location.photo && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${location.photo}` }}
                style={{
                  width: "100%",
                  height: 200,
                  borderRadius: 16,
                  marginBottom: 20,
                }}
                resizeMode="cover"
              />
            )}
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 26,
                fontWeight: "700",
                marginBottom: 12,
                letterSpacing: 0.5,
              }}
            >
              {location.name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="location-outline" size={18} color="#7C3AED" />
              <Text
                style={{
                  color: "#B8B8B8",
                  fontSize: 16,
                  marginLeft: 8,
                  flex: 1,
                  letterSpacing: 0.2,
                }}
              >
                {location.address}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginBottom: 20,
              }}
            >
              {location.tags &&
                location.tags.map((tag, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#2D1B69",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      marginRight: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: "#4C1D95",
                    }}
                  >
                    <Text
                      style={{
                        color: "#C4B5FD",
                        fontSize: 12,
                        fontWeight: "500",
                        letterSpacing: 0.3,
                      }}
                    >
                      {tag.trim()}
                    </Text>
                  </View>
                ))}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#1A0B2E",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#2D1B69",
              }}
            >
              <Ionicons name="time-outline" size={18} color="#10B981" />
              <Text
                style={{
                  color: "#10B981",
                  fontSize: 16,
                  marginLeft: 8,
                  fontWeight: "500",
                  letterSpacing: 0.2,
                }}
              >
                {getTodayHours()}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#2D1B69",
                borderWidth: 1,
                borderColor: "#4C1D95",
                paddingVertical: 16,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                elevation: 4,
                shadowColor: "#7C3AED",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
              onPress={() =>
                router.push(
                  `/location-hours?id=${locationId}&name=${location.name}`
                )
              }
            >
              <Ionicons name="time-outline" size={20} color="#C4B5FD" />
              <Text
                style={{
                  color: "#C4B5FD",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                  letterSpacing: 0.3,
                }}
              >
                Hours
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#1A3A2E",
                borderWidth: 1,
                borderColor: "#2D5A47",
                paddingVertical: 16,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                elevation: 4,
                shadowColor: "#10B981",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
              onPress={() =>
                router.push(
                  `/reservations?id=${locationId}&name=${location.name}`
                )
              }
            >
              <Ionicons name="calendar-outline" size={20} color="#6EE7B7" />
              <Text
                style={{
                  color: "#6EE7B7",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                  letterSpacing: 0.3,
                }}
              >
                Reservations
              </Text>
            </TouchableOpacity>
          </View>

          {/* Statistics */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: "#c4b5fd",
                fontSize: 20,
                fontWeight: "600",
                marginBottom: 16,
              }}
            >
              Statistics
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  borderWidth: 1,
                  borderColor: "rgba(139, 92, 246, 0.2)",
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#8b5cf6",
                    fontSize: 28,
                    fontWeight: "bold",
                  }}
                >
                  {reservations.length}
                </Text>
                <Text
                  style={{
                    color: "#9ca3af",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Total Reservations
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  borderWidth: 1,
                  borderColor: "rgba(139, 92, 246, 0.2)",
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#10b981",
                    fontSize: 28,
                    fontWeight: "bold",
                  }}
                >
                  {hours.filter((h) => h.isOpen).length}
                </Text>
                <Text
                  style={{
                    color: "#9ca3af",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  Open Days
                </Text>
              </View>
            </View>
          </View>

          {/* Recent Reservations */}
          {reservations.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  color: "#c4b5fd",
                  fontSize: 20,
                  fontWeight: "600",
                  marginBottom: 16,
                }}
              >
                Recent Reservations
              </Text>
              {reservations.slice(0, 3).map((reservation) => (
                <View
                  key={reservation.id}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    borderWidth: 1,
                    borderColor: "rgba(139, 92, 246, 0.2)",
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      {reservation.customerName}
                    </Text>
                    <View
                      style={{
                        backgroundColor:
                          reservation.status === "confirmed"
                            ? "rgba(34, 197, 94, 0.2)"
                            : reservation.status === "pending"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(239, 68, 68, 0.2)",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            reservation.status === "confirmed"
                              ? "#22c55e"
                              : reservation.status === "pending"
                              ? "#f59e0b"
                              : "#ef4444",
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        {reservation.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                    {new Date(reservation.reservationDate).toLocaleDateString()}{" "}
                    at {reservation.timeSlot}
                  </Text>
                  <Text style={{ color: "#9ca3af", fontSize: 14 }}>
                    {reservation.numberOfPeople} people
                  </Text>
                </View>
              ))}
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(139, 92, 246, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(139, 92, 246, 0.3)",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={() =>
                  router.push(
                    `/reservations?id=${locationId}&name=${location.name}`
                  )
                }
              >
                <Text
                  style={{
                    color: "#8b5cf6",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  View All Reservations
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Opening Hours Summary */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                color: "#c4b5fd",
                fontSize: 20,
                fontWeight: "600",
                marginBottom: 16,
              }}
            >
              Weekly Hours
            </Text>
            {DAYS_OF_WEEK.map((day, index) => {
              const dayHours = hours.find((h) => h.dayOfWeek === index);
              return (
                <View
                  key={index}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(139, 92, 246, 0.1)",
                  }}
                >
                  <Text
                    style={{
                      color: "#d1d5db",
                      fontSize: 16,
                      fontWeight: "500",
                    }}
                  >
                    {day}
                  </Text>
                  <Text
                    style={{
                      color: dayHours?.isOpen ? "#22c55e" : "#ef4444",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {dayHours?.isOpen
                      ? `${formatTime(dayHours.openTime)} - ${formatTime(
                          dayHours.closeTime
                        )}`
                      : "Closed"}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
