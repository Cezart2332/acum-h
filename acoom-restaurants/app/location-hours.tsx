import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import BASE_URL from "../config";

interface LocationHour {
  id?: number;
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface TimeSlot {
  hour: number;
  minute: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday", shortLabel: "Sun" },
  { value: 1, label: "Monday", shortLabel: "Mon" },
  { value: 2, label: "Tuesday", shortLabel: "Tue" },
  { value: 3, label: "Wednesday", shortLabel: "Wed" },
  { value: 4, label: "Thursday", shortLabel: "Thu" },
  { value: 5, label: "Friday", shortLabel: "Fri" },
  { value: 6, label: "Saturday", shortLabel: "Sat" },
];

export default function LocationHoursScreen() {
  const { id, name } = useLocalSearchParams();
  const locationId = parseInt(id as string);
  const locationName = name as string;

  const [hours, setHours] = useState<LocationHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLocationHours();
  }, []);

  const fetchLocationHours = async () => {
    try {
      const response = await fetch(`${BASE_URL}/locations/${locationId}/hours`);
      if (response.ok) {
        const data = await response.json();
        // Map backend response to frontend interface
        const mappedHours = data.map((item: any) => {
          // Handle DayOfWeek whether it's a string or number
          let dayOfWeek = 0;
          if (typeof item.DayOfWeek === "number") {
            dayOfWeek = item.DayOfWeek;
          } else if (typeof item.DayOfWeek === "string") {
            const parsed = parseInt(item.DayOfWeek);
            if (!isNaN(parsed)) {
              dayOfWeek = parsed;
            } else {
              // Try to find by string name
              const found = DAYS_OF_WEEK.find(
                (d) => d.label.toLowerCase() === item.DayOfWeek.toLowerCase()
              );
              dayOfWeek = found ? found.value : 0;
            }
          }

          return {
            id: item.Id,
            dayOfWeek: dayOfWeek,
            isOpen: !item.IsClosed, // Backend uses IsClosed, frontend uses isOpen
            openTime: item.OpenTime || "09:00",
            closeTime: item.CloseTime || "22:00",
          };
        });

        // Ensure we have entries for all 7 days
        const completeHours = DAYS_OF_WEEK.map((day) => {
          const existingHour = mappedHours.find(
            (h: any) => h.dayOfWeek === day.value
          );
          return (
            existingHour || {
              dayOfWeek: day.value,
              isOpen: true,
              openTime: "09:00",
              closeTime: "22:00",
            }
          );
        });

        setHours(completeHours);
      } else {
        // If no hours exist, create default structure
        const defaultHours = DAYS_OF_WEEK.map((day) => ({
          dayOfWeek: day.value,
          isOpen: true,
          openTime: "09:00",
          closeTime: "22:00",
        }));
        setHours(defaultHours);
      }
    } catch (error) {
      console.error("Error fetching hours:", error);
      // Create default hours on error
      const defaultHours = DAYS_OF_WEEK.map((day) => ({
        dayOfWeek: day.value,
        isOpen: true,
        openTime: "09:00",
        closeTime: "22:00",
      }));
      setHours(defaultHours);
    } finally {
      setLoading(false);
    }
  };

  const updateDayHours = (dayOfWeek: number, field: string, value: any) => {
    setHours((prevHours) =>
      prevHours.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, [field]: value } : hour
      )
    );
  };

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const parseTimeFromString = (timeString: string): TimeSlot => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return { hour: hours, minute: minutes };
  };

  const formatTimeForServer = (hour: number, minute: number): string => {
    return `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
  };

  const saveHours = async () => {
    setSaving(true);
    try {
      const formData = new FormData();

      // Convert hours array to form data format expected by backend
      hours.forEach((hour, index) => {
        formData.append(`day_${index}_closed`, (!hour.isOpen).toString());
        if (hour.isOpen) {
          formData.append(`day_${index}_open`, hour.openTime);
          formData.append(`day_${index}_close`, hour.closeTime);
        }
      });

      const response = await fetch(
        `${BASE_URL}/locations/${locationId}/hours`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        Alert.alert("Success", "Hours updated successfully!");
      } else {
        const errorText = await response.text();
        console.error("Save hours error:", errorText);
        Alert.alert("Error", "Failed to update hours");
      }
    } catch (error) {
      console.error("Error saving hours:", error);
      Alert.alert("Error", "Failed to update hours");
    } finally {
      setSaving(false);
    }
  };

  const renderTimePicker = (
    value: string,
    onChange: (time: string) => void,
    label: string
  ) => {
    const currentTime = parseTimeFromString(value);

    return (
      <View style={{ flex: 1, marginHorizontal: 4 }}>
        <Text
          style={{
            color: "#e2e8f0",
            fontSize: 13,
            fontWeight: "600",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
        <View
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            borderWidth: 1,
            borderColor: "rgba(139, 92, 246, 0.3)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <Picker
                selectedValue={currentTime.hour}
                onValueChange={(hour) =>
                  onChange(formatTimeForServer(hour, currentTime.minute))
                }
                style={{ color: "white", backgroundColor: "transparent" }}
                dropdownIconColor="#8b5cf6"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <Picker.Item
                    key={i}
                    label={i.toString().padStart(2, "0")}
                    value={i}
                    color="white"
                  />
                ))}
              </Picker>
            </View>
            <View style={{ flex: 1 }}>
              <Picker
                selectedValue={currentTime.minute}
                onValueChange={(minute) =>
                  onChange(formatTimeForServer(currentTime.hour, minute))
                }
                style={{ color: "white", backgroundColor: "transparent" }}
                dropdownIconColor="#8b5cf6"
              >
                {[0, 15, 30, 45].map((minute) => (
                  <Picker.Item
                    key={minute}
                    label={minute.toString().padStart(2, "0")}
                    value={minute}
                    color="white"
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: "Hours",
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
            Loading hours...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Hours",
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
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 28,
              fontWeight: "700",
              marginBottom: 8,
              letterSpacing: 0.5,
            }}
          >
            Opening Hours
          </Text>
          <Text
            style={{
              color: "#C4B5FD",
              fontSize: 16,
              marginBottom: 32,
              letterSpacing: 0.2,
            }}
          >
            {locationName}
          </Text>

          {/* Quick Actions */}
          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                color: "#c4b5fd",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 16,
              }}
            >
              Quick Actions
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.3)",
                  borderWidth: 1,
                  borderColor: "rgba(34, 197, 94, 0.5)",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
                onPress={() => {
                  const newHours = hours.map((h) => ({
                    ...h,
                    isOpen: true,
                    openTime: "09:00",
                    closeTime: "22:00",
                  }));
                  setHours(newHours);
                }}
              >
                <Text
                  style={{
                    color: "#bbf7d0",
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  Open All (9 AM - 10 PM)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.3)",
                  borderWidth: 1,
                  borderColor: "rgba(239, 68, 68, 0.5)",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
                onPress={() => {
                  const newHours = hours.map((h) => ({ ...h, isOpen: false }));
                  setHours(newHours);
                }}
              >
                <Text
                  style={{
                    color: "#fecaca",
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  Close All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.3)",
                  borderWidth: 1,
                  borderColor: "rgba(59, 130, 246, 0.5)",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
                onPress={() => {
                  const newHours = hours.map((h) => ({
                    ...h,
                    isOpen: h.dayOfWeek >= 1 && h.dayOfWeek <= 5 ? true : false,
                    openTime: "09:00",
                    closeTime: "18:00",
                  }));
                  setHours(newHours);
                }}
              >
                <Text
                  style={{
                    color: "#bfdbfe",
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  Weekdays Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(139, 92, 246, 0.3)",
                  borderWidth: 1,
                  borderColor: "rgba(139, 92, 246, 0.5)",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
                onPress={() => {
                  const newHours = hours.map((h) => ({
                    ...h,
                    isOpen:
                      h.dayOfWeek === 0 || h.dayOfWeek === 6 ? true : false,
                    openTime: "10:00",
                    closeTime: "23:00",
                  }));
                  setHours(newHours);
                }}
              >
                <Text
                  style={{
                    color: "#c4b5fd",
                    fontSize: 14,
                    fontWeight: "500",
                  }}
                >
                  Weekends Only
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hours Configuration */}
          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                color: "#c4b5fd",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 16,
              }}
            >
              Set Hours by Day
            </Text>
            {DAYS_OF_WEEK.map((day) => {
              const dayHours = hours.find((h) => h.dayOfWeek === day.value);
              if (!dayHours) return null;

              return (
                <View
                  key={day.value}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    borderWidth: 1,
                    borderColor: "rgba(139, 92, 246, 0.2)",
                    borderRadius: 16,
                    padding: 20,
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: "white",
                        fontSize: 18,
                        fontWeight: "700",
                      }}
                    >
                      {day.label}
                    </Text>
                    <Switch
                      value={dayHours.isOpen}
                      onValueChange={(value) =>
                        updateDayHours(day.value, "isOpen", value)
                      }
                      trackColor={{
                        false: "#374151",
                        true: "rgba(139, 92, 246, 0.7)",
                      }}
                      thumbColor={dayHours.isOpen ? "#8b5cf6" : "#9ca3af"}
                    />
                  </View>

                  {dayHours.isOpen && (
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {renderTimePicker(
                        dayHours.openTime,
                        (time) => updateDayHours(day.value, "openTime", time),
                        "Open"
                      )}
                      {renderTimePicker(
                        dayHours.closeTime,
                        (time) => updateDayHours(day.value, "closeTime", time),
                        "Close"
                      )}
                    </View>
                  )}

                  {!dayHours.isOpen && (
                    <Text
                      style={{
                        color: "#ef4444",
                        fontSize: 16,
                        fontWeight: "600",
                        textAlign: "center",
                      }}
                    >
                      Closed
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={saveHours}
            disabled={saving}
            style={{
              backgroundColor: saving ? "rgba(100, 116, 139, 0.4)" : "#8b5cf6",
              paddingVertical: 20,
              borderRadius: 16,
              marginBottom: 20,
              shadowColor: "#8b5cf6",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {saving ? (
                <Text
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  Saving...
                </Text>
              ) : (
                <>
                  <Ionicons name="save" size={22} color="white" />
                  <Text
                    style={{
                      color: "white",
                      fontSize: 18,
                      fontWeight: "700",
                      marginLeft: 10,
                    }}
                  >
                    Save Hours
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
