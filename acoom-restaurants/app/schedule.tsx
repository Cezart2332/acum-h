import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import BASE_URL from "@/config";

const { width: screenWidth } = Dimensions.get("window");

interface DaySchedule {
  day: string;
  dayName: string;
  isOpen: boolean;
  is24Hours: boolean;
  openTime: string;
  closeTime: string;
}

export default function Schedule() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    {
      day: "Monday",
      dayName: "Luni",
      isOpen: true,
      is24Hours: false,
      openTime: "09:00",
      closeTime: "22:00",
    },
    {
      day: "Tuesday",
      dayName: "Marți",
      isOpen: true,
      is24Hours: false,
      openTime: "09:00",
      closeTime: "22:00",
    },
    {
      day: "Wednesday",
      dayName: "Miercuri",
      isOpen: true,
      is24Hours: false,
      openTime: "09:00",
      closeTime: "22:00",
    },
    {
      day: "Thursday",
      dayName: "Joi",
      isOpen: true,
      is24Hours: false,
      openTime: "09:00",
      closeTime: "22:00",
    },
    {
      day: "Friday",
      dayName: "Vineri",
      isOpen: true,
      is24Hours: false,
      openTime: "09:00",
      closeTime: "23:00",
    },
    {
      day: "Saturday",
      dayName: "Sâmbătă",
      isOpen: true,
      is24Hours: false,
      openTime: "10:00",
      closeTime: "23:00",
    },
    {
      day: "Sunday",
      dayName: "Duminică",
      isOpen: false,
      is24Hours: false,
      openTime: "10:00",
      closeTime: "22:00",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState<"open" | "close">(
    "open"
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [tempTime, setTempTime] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Fetch company ID and load schedule
  useEffect(() => {
    const getCompanyAndLoadSchedule = async () => {
      const raw = await AsyncStorage.getItem("company");
      if (raw) {
        const company = JSON.parse(raw);
        setCompanyId(company.id);
        await loadSchedule(company.id);
      }
    };
    getCompanyAndLoadSchedule();

    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadSchedule = async (companyId: number) => {
    try {
      const response = await fetch(`${BASE_URL}/companyhours/${companyId}`);
      if (response.ok) {
        const scheduleData = await response.json();

        // Check if we have existing schedule data
        if (scheduleData && scheduleData.length > 0) {
          setHasExistingSchedule(true);

          // Transform API data to match our local format
          const transformedSchedule = schedule.map((day) => {
            const apiDay = scheduleData.find(
              (d: any) => d.dayOfWeek === day.day
            );
            if (apiDay) {
              return {
                ...day,
                isOpen: apiDay.openTime !== "" || apiDay.is24Hours,
                is24Hours: apiDay.is24Hours,
                openTime: apiDay.openTime || day.openTime,
                closeTime: apiDay.closeTime || day.closeTime,
              };
            }
            return day;
          });

          setSchedule(transformedSchedule);
        } else {
          setHasExistingSchedule(false);
          // Keep default schedule
        }
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
      setHasExistingSchedule(false);
      // Keep default schedule on error
    }
  };

  const handleDayToggle = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].isOpen = !newSchedule[index].isOpen;
    setSchedule(newSchedule);
  };

  const handle24HoursToggle = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].is24Hours = !newSchedule[index].is24Hours;
    setSchedule(newSchedule);
  };

  const handleTimeChange = (
    index: number,
    type: "open" | "close",
    time: string
  ) => {
    const newSchedule = [...schedule];
    if (type === "open") {
      newSchedule[index].openTime = time;
    } else {
      newSchedule[index].closeTime = time;
    }
    setSchedule(newSchedule);
  };

  const openTimePicker = (index: number, type: "open" | "close") => {
    setSelectedDayIndex(index);
    setTimePickerType(type);

    // Set current time as default
    const currentTime =
      type === "open" ? schedule[index].openTime : schedule[index].closeTime;
    const [hours, minutes] = currentTime.split(":");
    const timeDate = new Date();
    timeDate.setHours(parseInt(hours), parseInt(minutes));
    setTempTime(timeDate);

    setShowTimePicker(true);
  };

  const handleTimePickerChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      setTempTime(selectedTime);
      if (Platform.OS === "android") {
        confirmTimeChange(selectedTime);
      }
    }
  };

  const confirmTimeChange = (selectedTime?: Date) => {
    const timeToUse = selectedTime || tempTime;
    const timeString = timeToUse.toTimeString().substring(0, 5);
    handleTimeChange(selectedDayIndex, timePickerType, timeString);
    setShowTimePicker(false);
  };

  const handleSave = async () => {
    if (!companyId) {
      Alert.alert("Eroare", "Nu s-a putut identifica restaurantul");
      return;
    }

    setLoading(true);
    try {
      // Transform schedule data for API
      const scheduleData = schedule.map((day) => ({
        dayOfWeek: day.day,
        is24Hours: day.is24Hours,
        openTime: day.isOpen && !day.is24Hours ? day.openTime : "",
        closeTime: day.isOpen && !day.is24Hours ? day.closeTime : "",
      }));

      // Choose method based on whether schedule exists
      const method = hasExistingSchedule ? "PUT" : "POST";
      const url = `${BASE_URL}/companyhours/${companyId}`;

      // Make API call to save the schedule
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scheduleData),
      });

      if (response.ok) {
        const message = hasExistingSchedule
          ? "Programul a fost actualizat cu succes!"
          : "Programul a fost creat cu succes!";

        Alert.alert("Succes", message, [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);

        // Update the state to reflect that schedule now exists
        setHasExistingSchedule(true);
      } else {
        const errorText = await response.text();
        Alert.alert("Eroare", `Nu s-a putut salva programul: ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving schedule:", error);
      Alert.alert("Eroare", "Nu s-a putut salva programul");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      {/* Hero Header */}
      <Animated.View
        style={{
          opacity: fadeAnim,
        }}
      >
        <View
          style={{
            backgroundColor: "#8B5CF6",
            paddingTop: 60,
            paddingHorizontal: 24,
            paddingBottom: 30,
          }}
        >
          {/* Header Actions */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <Text
              style={{
                color: "white",
                fontSize: 24,
                fontWeight: "bold",
              }}
            >
              Program Restaurant
            </Text>
            <View style={{ width: 44 }} />
          </View>

          <Text
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 16,
              textAlign: "center",
            }}
          >
            Configurează orele de funcționare
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24 }}
      >
        {/* Schedule Days */}
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim,
          }}
        >
          {schedule.map((day, index) => (
            <View
              key={day.day}
              style={{
                backgroundColor: "#1F1F1F",
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "rgba(139, 92, 246, 0.2)",
              }}
            >
              {/* Day Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: "bold",
                  }}
                >
                  {day.dayName}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: day.isOpen ? "#10B981" : "#EF4444",
                      fontSize: 14,
                      fontWeight: "600",
                      marginRight: 12,
                    }}
                  >
                    {day.isOpen ? "Deschis" : "Închis"}
                  </Text>
                  <Switch
                    value={day.isOpen}
                    onValueChange={() => handleDayToggle(index)}
                    trackColor={{ false: "#374151", true: "#8B5CF6" }}
                    thumbColor={day.isOpen ? "#FFFFFF" : "#9CA3AF"}
                    ios_backgroundColor="#374151"
                  />
                </View>
              </View>

              {day.isOpen && (
                <View>
                  {/* 24 Hours Toggle */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                      backgroundColor: "rgba(139, 92, 246, 0.1)",
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(139, 92, 246, 0.3)",
                    }}
                  >
                    <View>
                      <Text
                        style={{
                          color: "white",
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        Program 24 ore
                      </Text>
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        Deschis toată ziua
                      </Text>
                    </View>
                    <Switch
                      value={day.is24Hours}
                      onValueChange={() => handle24HoursToggle(index)}
                      trackColor={{ false: "#374151", true: "#8B5CF6" }}
                      thumbColor={day.is24Hours ? "#FFFFFF" : "#9CA3AF"}
                      ios_backgroundColor="#374151"
                    />
                  </View>

                  {/* Time Selection */}
                  {!day.is24Hours && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      {/* Open Time */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: 14,
                            fontWeight: "600",
                            marginBottom: 8,
                          }}
                        >
                          Ora deschiderii
                        </Text>
                        <TouchableOpacity
                          onPress={() => openTimePicker(index, "open")}
                          style={{
                            backgroundColor: "rgba(139, 92, 246, 0.2)",
                            borderWidth: 1,
                            borderColor: "rgba(139, 92, 246, 0.5)",
                            borderRadius: 12,
                            padding: 16,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontSize: 16,
                              fontWeight: "600",
                            }}
                          >
                            {day.openTime}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Separator */}
                      <View
                        style={{
                          paddingHorizontal: 16,
                          paddingTop: 24,
                        }}
                      >
                        <Ionicons
                          name="arrow-forward"
                          size={20}
                          color="#8B5CF6"
                        />
                      </View>

                      {/* Close Time */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: 14,
                            fontWeight: "600",
                            marginBottom: 8,
                          }}
                        >
                          Ora închiderii
                        </Text>
                        <TouchableOpacity
                          onPress={() => openTimePicker(index, "close")}
                          style={{
                            backgroundColor: "rgba(139, 92, 246, 0.2)",
                            borderWidth: 1,
                            borderColor: "rgba(139, 92, 246, 0.5)",
                            borderRadius: 12,
                            padding: 16,
                            alignItems: "center",
                          }}
                        >
                          <Text
                            style={{
                              color: "white",
                              fontSize: 16,
                              fontWeight: "600",
                            }}
                          >
                            {day.closeTime}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* 24 Hours Display */}
                  {day.is24Hours && (
                    <View
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.2)",
                        borderWidth: 1,
                        borderColor: "rgba(16, 185, 129, 0.5)",
                        borderRadius: 12,
                        padding: 16,
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="time" size={20} color="#10B981" />
                        <Text
                          style={{
                            color: "#10B981",
                            fontSize: 16,
                            fontWeight: "600",
                            marginLeft: 8,
                          }}
                        >
                          24 ore - Deschis non-stop
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Closed Display */}
              {!day.isOpen && (
                <View
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.5)",
                    borderRadius: 12,
                    padding: 16,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                    <Text
                      style={{
                        color: "#EF4444",
                        fontSize: 16,
                        fontWeight: "600",
                        marginLeft: 8,
                      }}
                    >
                      Închis
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={{
              marginTop: 20,
              marginBottom: 40,
            }}
          >
            <View
              style={{
                backgroundColor: loading ? "#4B5563" : "#8B5CF6",
                borderRadius: 16,
                padding: 20,
                alignItems: "center",
                shadowColor: "#8B5CF6",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="save-outline" size={20} color="white" />
                  <Text
                    style={{
                      color: "white",
                      fontSize: 18,
                      fontWeight: "bold",
                      marginLeft: 8,
                    }}
                  >
                    {hasExistingSchedule
                      ? "Actualizează Programul"
                      : "Salvează Programul"}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Time Picker Modal for iOS */}
      {Platform.OS === "ios" && showTimePicker && (
        <Modal transparent={true} animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <View
              style={{
                backgroundColor: "#1F1F1F",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderWidth: 1,
                borderColor: "rgba(139, 92, 246, 0.3)",
              }}
            >
              {/* Modal Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(139, 92, 246, 0.2)",
                }}
              >
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text
                    style={{
                      color: "#8B5CF6",
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    Anulează
                  </Text>
                </TouchableOpacity>
                <Text
                  style={{
                    color: "white",
                    fontSize: 18,
                    fontWeight: "bold",
                  }}
                >
                  {timePickerType === "open"
                    ? "Ora deschiderii"
                    : "Ora închiderii"}
                </Text>
                <TouchableOpacity onPress={() => confirmTimeChange()}>
                  <Text
                    style={{
                      color: "#8B5CF6",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    Confirmă
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Time Picker */}
              <View style={{ paddingBottom: 30 }}>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  display="spinner"
                  onChange={handleTimePickerChange}
                  is24Hour={true}
                  textColor="#FFFFFF"
                  themeVariant="dark"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android Time Picker */}
      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          display="default"
          onChange={handleTimePickerChange}
          is24Hour={true}
        />
      )}
    </View>
  );
}
