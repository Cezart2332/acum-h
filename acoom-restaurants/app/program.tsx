import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BASE_URL from "../config";

// Days configuration
const DAYS = [
  { id: 0, name: "Luni", enum: "Monday" },
  { id: 1, name: "Marți", enum: "Tuesday" },
  { id: 2, name: "Miercuri", enum: "Wednesday" },
  { id: 3, name: "Joi", enum: "Thursday" },
  { id: 4, name: "Vineri", enum: "Friday" },
  { id: 5, name: "Sâmbătă", enum: "Saturday" },
  { id: 6, name: "Duminică", enum: "Sunday" },
];

type ScheduleDay = {
  dayOfWeek: string;
  is24Hours: boolean;
  openTime: string | null;
  closeTime: string | null;
  closed: boolean;
};

export default function ProgramPage() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);

  // Initialize default schedule
  const initSchedule = () => {
    return DAYS.map((day) => ({
      dayOfWeek: day.enum,
      is24Hours: false,
      openTime: "09:00",
      closeTime: "18:00",
      closed: day.id === 6, // Sunday closed by default
    }));
  };

  // Fetch company hours
  const fetchCompanyHours = async () => {
    if (!companyId) return;

    setLoading(true);
    try {
      console.log(`Fetching hours for company ID: ${companyId}`);
      const response = await fetch(`${BASE_URL}/companyhours/${companyId}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Fetched hours:", data);

      // Convert API data to frontend format
      const formattedSchedule = DAYS.map((day) => {
        const hourData = data.find((h: any) => h.dayOfWeek === day.enum);
        if (!hourData) {
          return {
            dayOfWeek: day.enum,
            is24Hours: false,
            openTime: null,
            closeTime: null,
            closed: true,
          };
        }

        const hasHours = hourData.openTime || hourData.closeTime;
        return {
          dayOfWeek: day.enum,
          is24Hours: hourData.is24Hours,
          openTime: hourData.openTime
            ? hourData.openTime.substring(0, 5)
            : null,
          closeTime: hourData.closeTime
            ? hourData.closeTime.substring(0, 5)
            : null,
          closed: !hourData.is24Hours && !hasHours,
        };
      });

      setSchedule(formattedSchedule);
    } catch (error: any) {
      console.error("Fetch error:", error.message);
      Alert.alert("Eroare", "Nu s-au putut încărca datele: " + error.message);
      setSchedule(initSchedule());
    } finally {
      setLoading(false);
    }
  };

  // Get company ID
  useEffect(() => {
    const getCompanyId = async () => {
      try {
        const raw = await AsyncStorage.getItem("company");
        if (!raw) {
          router.back();
          return;
        }

        const company = JSON.parse(raw);
        console.log("Company ID:", company.id);
        setCompanyId(company.id);
      } catch (error: any) {
        console.error("Get company ID error:", error.message);
        Alert.alert("Eroare", "Nu s-a putut obține ID-ul companiei");
      }
    };

    getCompanyId();
  }, []);

  // Fetch hours when company ID changes
  useEffect(() => {
    if (companyId) {
      console.log("Company ID changed, fetching hours");
      fetchCompanyHours();
    }
  }, [companyId]);

  // Toggle 24h mode
  const toggle24Hours = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].is24Hours = !newSchedule[index].is24Hours;

    if (newSchedule[index].is24Hours) {
      newSchedule[index].closed = false;
      newSchedule[index].openTime = null;
      newSchedule[index].closeTime = null;
    }

    setSchedule(newSchedule);
  };

  // Toggle closed
  const toggleClosed = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].closed = !newSchedule[index].closed;

    if (newSchedule[index].closed) {
      newSchedule[index].is24Hours = false;
      newSchedule[index].openTime = null;
      newSchedule[index].closeTime = null;
    } else {
      newSchedule[index].openTime = "09:00";
      newSchedule[index].closeTime = "18:00";
    }

    setSchedule(newSchedule);
  };

  // Update time
  const updateTime = (
    index: number,
    field: "openTime" | "closeTime",
    value: string
  ) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  // Validate time format
  const isValidTime = (time: string) => {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  };

  // Save schedule using FormData
  const saveSchedule = async () => {
    if (!companyId) {
      Alert.alert("Eroare", "ID-ul companiei nu este disponibil");
      return;
    }

    // Validate times
    for (const [index, day] of schedule.entries()) {
      if (!day.closed && !day.is24Hours) {
        if (!day.openTime || !isValidTime(day.openTime)) {
          Alert.alert(
            "Eroare",
            `Ora deschiderii pentru ${DAYS[index].name} este invalidă`
          );
          return;
        }
        if (!day.closeTime || !isValidTime(day.closeTime)) {
          Alert.alert(
            "Eroare",
            `Ora închiderii pentru ${DAYS[index].name} este invalidă`
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Prepare DTOs
      const dtos = schedule.map((day) => ({
        DayOfWeek: day.dayOfWeek,
        Is24Hours: day.is24Hours,
        OpenTime: day.openTime,
        CloseTime: day.closeTime,
      }));

      console.log("Saving DTOs:", dtos);

      // Create FormData
      const formData = new FormData();
      formData.append("companyId", companyId.toString());
      formData.append("hours", JSON.stringify(dtos));

      // Send request
      console.log("Sending PUT request to:", `${BASE_URL}/companyhours`);
      const response = await fetch(`${BASE_URL}/companyhours`, {
        method: "PUT",
        body: formData,
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      Alert.alert("Succes", "Programul a fost salvat!");
    } catch (error: any) {
      console.error("Save error:", error.message);
      Alert.alert("Eroare", "Nu s-a putut salva programul: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#0F0817] items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0F0817]">
      {/* Header */}
      <View className="bg-gradient-to-b from-violet-900/90 to-violet-800/70 px-5 pb-4 pt-2 rounded-b-[40px] shadow-lg shadow-violet-900/50">
        <View className="flex-row justify-between items-center py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-violet-800/50 p-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={22} color="#d8b4fe" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-white">Program</Text>

          <TouchableOpacity
            className="bg-violet-800/50 p-2 rounded-full"
            onPress={saveSchedule}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#d8b4fe" />
            ) : (
              <Ionicons name="save-outline" size={22} color="#d8b4fe" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 py-6">
        <Text className="text-lg font-bold text-violet-300 mb-4">
          Setează programul săptămânal
        </Text>

        {DAYS.map((day, index) => {
          const daySchedule = schedule[index];

          return (
            <View
              key={day.id}
              className="bg-gradient-to-b from-violet-900/40 to-indigo-900/30 rounded-xl p-4 mb-4 shadow-md shadow-violet-900/20"
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white font-medium">{day.name}</Text>

                <View className="flex-row items-center space-x-4">
                  <TouchableOpacity
                    onPress={() => toggleClosed(index)}
                    className={`px-3 py-1 rounded-full ${
                      daySchedule.closed ? "bg-red-500/30" : "bg-green-500/30"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        daySchedule.closed ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {daySchedule.closed ? "Închis" : "Deschis"}
                    </Text>
                  </TouchableOpacity>

                  {!daySchedule.closed && (
                    <View className="flex-row items-center">
                      <Text className="text-violet-400 text-xs mr-2">24h</Text>
                      <Switch
                        value={daySchedule.is24Hours}
                        onValueChange={() => toggle24Hours(index)}
                        trackColor={{ false: "#4B5563", true: "#7C3AED" }}
                        thumbColor="#f4f3f4"
                      />
                    </View>
                  )}
                </View>
              </View>

              {!daySchedule.closed && !daySchedule.is24Hours && (
                <View className="flex-row justify-between items-center mt-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-violet-400 text-xs mb-1">
                      Deschidere
                    </Text>
                    <TextInput
                      value={daySchedule.openTime || ""}
                      onChangeText={(text) =>
                        updateTime(index, "openTime", text)
                      }
                      className="bg-violet-900/30 text-white rounded-lg px-3 py-2"
                      placeholder="09:00"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>

                  <View className="flex-1 ml-2">
                    <Text className="text-violet-400 text-xs mb-1">
                      Închidere
                    </Text>
                    <TextInput
                      value={daySchedule.closeTime || ""}
                      onChangeText={(text) =>
                        updateTime(index, "closeTime", text)
                      }
                      className="bg-violet-900/30 text-white rounded-lg px-3 py-2"
                      placeholder="18:00"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })}

        <View className="mt-6">
          <Text className="text-violet-400 text-sm mb-2">
            * Programul setat aici va fi afișat în profilul tău public
          </Text>

          <TouchableOpacity
            className="bg-gradient-to-r from-violet-700 to-indigo-800 rounded-xl py-3 items-center mt-4"
            onPress={saveSchedule}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold">
                Salvează programul
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
