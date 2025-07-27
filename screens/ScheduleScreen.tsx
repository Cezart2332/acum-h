import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Animated,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList, LocationData } from "./RootStackParamList";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  SCREEN_DIMENSIONS,
} from "../utils/responsive";
import { BASE_URL } from "../config";

type ScheduleNav = NativeStackNavigationProp<RootStackParamList, "Schedule">;
type ScheduleRoute = RouteProp<RootStackParamList, "Schedule">;

interface Props {
  navigation: ScheduleNav;
  route: ScheduleRoute;
}

interface CompanyHour {
  id: number;
  dayOfWeek: string;
  is24Hours: boolean;
  openTime?: string;
  closeTime?: string;
  companyId: number;
}

interface DaySchedule {
  day: string;
  dayName: string;
  isOpen: boolean;
  is24Hours: boolean;
  openTime: string;
  closeTime: string;
}

const { width, height } = Dimensions.get("window");

const DAYS = [
  { day: "Monday", dayName: "Luni", dayIndex: 1 },
  { day: "Tuesday", dayName: "Marți", dayIndex: 2 },
  { day: "Wednesday", dayName: "Miercuri", dayIndex: 3 },
  { day: "Thursday", dayName: "Joi", dayIndex: 4 },
  { day: "Friday", dayName: "Vineri", dayIndex: 5 },
  { day: "Saturday", dayName: "Sâmbătă", dayIndex: 6 },
  { day: "Sunday", dayName: "Duminică", dayIndex: 0 },
];

const ScheduleScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { location } = route.params || {};

  // Early return if location is not provided
  if (!location) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: Restaurant information not found</Text>
      </View>
    );
  }

  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const styles = createStyles(theme);

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Location object:", location); // Debug log
      console.log("Location ID:", location.id); // Debug log

      // Use location ID for fetching schedule
      const locationId = location.id;
      console.log("Using location ID:", locationId); // Debug log
      console.log(
        "Fetching from URL:",
        `${BASE_URL}/locations/${locationId}/hours`
      ); // Debug log

      const response = await fetch(`${BASE_URL}/locations/${locationId}/hours`);

      console.log("Response status:", response.status); // Debug log
      console.log("Response ok:", response.ok); // Debug log

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Error response:", errorText); // Debug log
        throw new Error(
          `Failed to fetch schedule. Status: ${response.status}. ${errorText}`
        );
      }

      const companyHours = await response.json();
      console.log("API Response:", companyHours); // Debug log

      // Convert API data to frontend format
      const formattedSchedule = DAYS.map((day) => {
        // Handle both numeric (0-6) and string ("Monday", "Tuesday") dayOfWeek values
        const hourData = companyHours.find((h: any) => {
          if (typeof h.dayOfWeek === "string") {
            return h.dayOfWeek === day.day;
          } else if (typeof h.dayOfWeek === "number") {
            return h.dayOfWeek === day.dayIndex;
          }
          return false;
        });

        if (!hourData) {
          return {
            day: day.day,
            dayName: day.dayName,
            isOpen: false,
            is24Hours: false,
            openTime: "09:00",
            closeTime: "18:00",
          };
        }

        return {
          day: day.day,
          dayName: day.dayName,
          isOpen:
            !hourData.isClosed && (hourData.openTime || hourData.is24Hours),
          is24Hours: hourData.is24Hours || false,
          openTime: hourData.openTime || "09:00",
          closeTime: hourData.closeTime || "18:00",
        };
      });

      setSchedule(formattedSchedule);
    } catch (err) {
      console.error("Error fetching schedule:", err);
      setError("Nu s-a putut încărca programul");

      // Set default schedule if API fails
      const defaultSchedule = DAYS.map((day) => ({
        day: day.day,
        dayName: day.dayName,
        isOpen: day.day !== "Sunday",
        is24Hours: false,
        openTime: "09:00",
        closeTime: "18:00",
      }));
      setSchedule(defaultSchedule);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSchedule();
    setRefreshing(false);
  };

  const formatTime = (timeString: string | null | undefined) => {
    try {
      if (!timeString || timeString === "") {
        return "Închis";
      }
      const [hours, minutes] = timeString.split(":");
      return `${hours}:${minutes}`;
    } catch {
      return timeString || "Închis";
    }
  };

  const getStatusColor = (isOpen: boolean, is24Hours: boolean) => {
    if (!isOpen) return theme.colors.error;
    if (is24Hours) return theme.colors.success;
    return theme.colors.primary;
  };

  const getStatusText = (isOpen: boolean, is24Hours: boolean) => {
    if (!isOpen) return "Închis";
    if (is24Hours) return "24 ore";
    return "Deschis";
  };

  if (loading) {
    return (
      <UniversalScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Se încarcă programul...
          </Text>
        </View>
      </UniversalScreen>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Beautiful Gradient Header */}
      <LinearGradient
        colors={["#000000", "#2D1B69", "#7B2CBF"]}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              hapticFeedback("light");
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Program Restaurant</Text>
            <Text style={styles.headerSubtitle}>{location.name}</Text>
          </View>

          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B2CBF" />
          <Text style={styles.loadingText}>Se încarcă programul...</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={[
            styles.scrollView,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7B2CBF"]}
              tintColor="#7B2CBF"
            />
          }
        >
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={24} color="#FF4757" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Modern Schedule Cards */}
          <View style={styles.scheduleContainer}>
            {schedule.map((day, index) => (
              <Animated.View
                key={day.day}
                style={[
                  styles.dayCard,
                  {
                    transform: [
                      {
                        scale: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                    opacity: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ]}
              >
                <LinearGradient
                  colors={
                    day.isOpen
                      ? day.is24Hours
                        ? ["#7B2CBF", "#9D4EDD", "#C77DFF"]
                        : ["#2D1B69", "#7B2CBF", "#9D4EDD"]
                      : ["#000000", "#2D1B69", "#7B2CBF"]
                  }
                  style={styles.dayCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.dayCardContent}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayName}>{day.dayName}</Text>
                      <View style={styles.statusContainer}>
                        <Ionicons
                          name={
                            day.isOpen
                              ? day.is24Hours
                                ? "time"
                                : "checkmark-circle"
                              : "close-circle"
                          }
                          size={20}
                          color="white"
                        />
                        <Text style={styles.statusText}>
                          {getStatusText(day.isOpen, day.is24Hours)}
                        </Text>
                      </View>
                    </View>

                    {day.isOpen && !day.is24Hours && (
                      <View style={styles.timeDisplay}>
                        <View style={styles.timeBlock}>
                          <Ionicons name="sunny" size={16} color="white" />
                          <Text style={styles.timeLabel}>Deschidere</Text>
                          <Text style={styles.timeValue}>
                            {formatTime(day.openTime)}
                          </Text>
                        </View>
                        <View style={styles.timeDivider} />
                        <View style={styles.timeBlock}>
                          <Ionicons name="moon" size={16} color="white" />
                          <Text style={styles.timeLabel}>Închidere</Text>
                          <Text style={styles.timeValue}>
                            {formatTime(day.closeTime)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {day.is24Hours && (
                      <View style={styles.twentyFourHours}>
                        <Ionicons name="infinite" size={24} color="white" />
                        <Text style={styles.twentyFourText}>Deschis 24/7</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>

          {/* Beautiful Info Card */}
          <View style={styles.infoCard}>
            <LinearGradient
              colors={["#000000", "#2D1B69", "#7B2CBF"]}
              style={styles.infoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name="information-circle-outline"
                size={32}
                color="white"
              />
              <Text style={styles.infoTitle}>Informații despre program</Text>
              <Text style={styles.infoText}>
                Programul poate fi modificat doar de către administratorul
                restaurantului. Pentru rezervări sau întrebări, contactează
                restaurantul direct.
              </Text>
            </LinearGradient>
          </View>
        </Animated.ScrollView>
      )}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000000",
    },
    gradientHeader: {
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTextContainer: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "white",
      textAlign: "center",
      textShadowColor: "rgba(0, 0, 0, 0.75)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    headerSubtitle: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.9)",
      textAlign: "center",
      marginTop: 4,
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    },
    backButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    refreshButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      backgroundColor: "#000000",
    },
    loadingText: {
      fontSize: 16,
      marginTop: 16,
      textAlign: "center",
      color: "#C77DFF",
      fontWeight: "500",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 30,
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#2D1B69",
      margin: 20,
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#C77DFF",
      borderWidth: 1,
      borderColor: "rgba(199, 125, 255, 0.3)",
    },
    errorText: {
      fontSize: 16,
      color: "#C77DFF",
      marginLeft: 12,
      flex: 1,
      fontWeight: "500",
    },
    scheduleContainer: {
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    dayCard: {
      marginBottom: 16,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 8,
      shadowColor: "#7B2CBF",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(199, 125, 255, 0.2)",
    },
    dayCardGradient: {
      padding: 20,
      borderRadius: 16,
    },
    dayCardContent: {
      flex: 1,
    },
    dayHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    dayName: {
      fontSize: 20,
      fontWeight: "bold",
      color: "white",
      textShadowColor: "rgba(0, 0, 0, 0.75)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.3)",
    },
    statusText: {
      fontSize: 14,
      color: "white",
      fontWeight: "600",
      marginLeft: 6,
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    },
    timeDisplay: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    timeBlock: {
      flex: 1,
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.25)",
    },
    timeLabel: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.9)",
      marginTop: 4,
      fontWeight: "500",
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    },
    timeValue: {
      fontSize: 18,
      color: "white",
      fontWeight: "bold",
      marginTop: 2,
      textShadowColor: "rgba(0, 0, 0, 0.75)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    timeDivider: {
      width: 12,
    },
    twentyFourHours: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.25)",
    },
    twentyFourText: {
      fontSize: 18,
      color: "white",
      fontWeight: "bold",
      marginLeft: 8,
      textShadowColor: "rgba(0, 0, 0, 0.75)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    infoCard: {
      margin: 20,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 6,
      shadowColor: "#7B2CBF",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      borderWidth: 1,
      borderColor: "rgba(199, 125, 255, 0.2)",
    },
    infoGradient: {
      padding: 20,
      alignItems: "center",
      borderRadius: 16,
    },
    infoTitle: {
      fontSize: 18,
      color: "white",
      fontWeight: "bold",
      marginTop: 12,
      marginBottom: 12,
      textAlign: "center",
      textShadowColor: "rgba(0, 0, 0, 0.75)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    infoText: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.95)",
      textAlign: "center",
      lineHeight: 20,
      textShadowColor: "rgba(0, 0, 0, 0.5)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 1,
    },
  });

export default ScheduleScreen;
