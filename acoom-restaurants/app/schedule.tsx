import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import BASE_URL from "@/config";

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
    <SafeAreaView className="flex-1 bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900">
      {/* Header */}
      <View className="flex-row items-center justify-between p-6 border-b border-violet-800/30">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full bg-violet-800/20"
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Program</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        {/* Schedule Card */}
        <View className="bg-gradient-to-r from-violet-800/40 to-indigo-900/30 rounded-2xl p-6 shadow-md shadow-violet-900/20">
          <View className="mb-6">
            <Text className="text-white text-2xl font-bold mb-2">
              Program Restaurant
            </Text>
            <Text className="text-violet-300">
              Configurează orele de funcționare
            </Text>
          </View>

          {/* Schedule List */}
          {schedule.map((day, index) => (
            <View
              key={day.day}
              className="mb-6 p-4 bg-violet-800/20 rounded-xl border border-violet-700/30"
            >
              {/* Day Header */}
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-lg font-semibold">
                  {day.dayName}
                </Text>
                <Switch
                  value={day.isOpen}
                  onValueChange={() => handleDayToggle(index)}
                  trackColor={{ false: "#4C1D95", true: "#A855F7" }}
                  thumbColor={day.isOpen ? "#FFFFFF" : "#E5E7EB"}
                />
              </View>

              {day.isOpen && (
                <View className="space-y-4">
                  {/* 24 Hours Toggle */}
                  <View className="flex-row justify-between items-center">
                    <Text className="text-violet-300">24 ore</Text>
                    <Switch
                      value={day.is24Hours}
                      onValueChange={() => handle24HoursToggle(index)}
                      trackColor={{ false: "#4C1D95", true: "#A855F7" }}
                      thumbColor={day.is24Hours ? "#FFFFFF" : "#E5E7EB"}
                    />
                  </View>

                  {/* Time Inputs */}
                  {!day.is24Hours && (
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-violet-300 text-sm mb-2">
                          Ora deschiderii
                        </Text>
                        <TouchableOpacity
                          className="bg-violet-900/40 p-3 rounded-lg border border-violet-700/30"
                          onPress={() => openTimePicker(index, "open")}
                        >
                          <Text className="text-white text-center font-medium">
                            {day.openTime}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text className="text-violet-300 mx-4 text-xl">-</Text>

                      <View className="flex-1">
                        <Text className="text-violet-300 text-sm mb-2">
                          Ora închiderii
                        </Text>
                        <TouchableOpacity
                          className="bg-violet-900/40 p-3 rounded-lg border border-violet-700/30"
                          onPress={() => openTimePicker(index, "close")}
                        >
                          <Text className="text-white text-center font-medium">
                            {day.closeTime}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* 24 Hours Display */}
                  {day.is24Hours && (
                    <View className="bg-violet-900/40 p-3 rounded-lg border border-violet-700/30">
                      <Text className="text-white text-center font-medium">
                        24 ore - Închis
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Closed Display */}
              {!day.isOpen && (
                <View className="bg-red-900/40 p-3 rounded-lg border border-red-700/30">
                  <Text className="text-red-300 text-center font-medium">
                    Închis
                  </Text>
                </View>
              )}
            </View>
          ))}

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`mt-6 p-4 rounded-xl items-center ${
              loading
                ? "bg-gray-600/50"
                : "bg-gradient-to-r from-violet-600 to-purple-600"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-semibold">
                {hasExistingSchedule
                  ? "Actualizează Programul"
                  : "Creează Programul"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      {Platform.OS === "ios" && showTimePicker && (
        <Modal transparent={true} animationType="slide">
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-violet-900 rounded-t-3xl">
              <View className="flex-row justify-between items-center p-4 border-b border-violet-700/30">
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text className="text-violet-300 text-lg">Anulează</Text>
                </TouchableOpacity>
                <Text className="text-white text-lg font-semibold">
                  {timePickerType === "open"
                    ? "Ora deschiderii"
                    : "Ora închiderii"}
                </Text>
                <TouchableOpacity onPress={() => confirmTimeChange()}>
                  <Text className="text-violet-300 text-lg font-semibold">
                    Gata
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="pb-6">
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
    </SafeAreaView>
  );
}
