import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList, LocationData } from "./RootStackParamList";
import { useTheme } from "../context/ThemeContext";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  SCREEN_DIMENSIONS,
  getResponsiveSpacing,
  getResponsiveFontSize,
} from "../utils/responsive";
import { BASE_URL } from "../config";

type ReservationNav = NativeStackNavigationProp<
  RootStackParamList,
  "Reservation"
>;
type ReservationRoute = RouteProp<RootStackParamList, "Reservation">;

interface Props {
  navigation: ReservationNav;
  route: ReservationRoute;
}

const Reservation: React.FC<Props> = ({ navigation, route }) => {
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
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(() => {
    const now = new Date();
    // Set to next hour if it's past 30 minutes, otherwise current hour
    const hour = now.getMinutes() > 30 ? now.getHours() + 1 : now.getHours();
    const defaultTime = new Date();
    defaultTime.setHours(Math.max(12, hour), 0, 0, 0); // Default to 12:00 PM or later
    return defaultTime;
  });
  const [people, setPeople] = useState("2");
  const [specialRequest, setSpecialRequest] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [restaurantSchedule, setRestaurantSchedule] = useState<any>(null);

  // Animation refs for smooth interactions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  const styles = createStyles(theme);

  // Calculate max date (1 week from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);

  useEffect(() => {
    loadUser();
    loadRestaurantSchedule();
    startAnimations();
  }, []);

  useEffect(() => {
    if (date) {
      loadAvailableTimes();
    }
  }, [date]);

  const loadRestaurantSchedule = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/locations/${location.id}/hours`
      );
      if (response.ok) {
        const hoursArray = await response.json();
        console.log("Hours API response:", hoursArray);

        // If it's an array, find today's hours or use the first available day
        if (Array.isArray(hoursArray) && hoursArray.length > 0) {
          const today = new Date().toLocaleDateString("en-US", {
            weekday: "long",
          });
          const todayHours =
            hoursArray.find((h) => h.dayOfWeek === today) || hoursArray[0];

          setRestaurantSchedule({
            openTime: todayHours.openTime || "10:00",
            closeTime: todayHours.closeTime || "22:00",
            days: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
            isClosed: todayHours.isClosed || false,
          });
        } else {
          // Fallback to default schedule
          setRestaurantSchedule({
            openTime: "10:00",
            closeTime: "22:00",
            days: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
            isClosed: false,
          });
        }
      }
    } catch (error) {
      console.error("Error loading restaurant schedule:", error);
      // Set default schedule if API fails
      setRestaurantSchedule({
        openTime: "10:00",
        closeTime: "22:00",
        days: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
      });
    }
  };

  const startAnimations = () => {
    Animated.sequence([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      console.log(userData);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const isRestaurantOpen = (selectedDate: Date) => {
    if (!restaurantSchedule) return true;

    const dayOfWeek = selectedDate.getDay();
    return restaurantSchedule.days?.includes(dayOfWeek) ?? true;
  };

  const getValidTimeRange = () => {
    if (!restaurantSchedule) {
      return { minTime: new Date(), maxTime: new Date() };
    }

    const today = new Date();
    const [openHour, openMinute] = (restaurantSchedule.openTime || "09:00")
      .split(":")
      .map(Number);
    const [closeHour, closeMinute] = (restaurantSchedule.closeTime || "18:00")
      .split(":")
      .map(Number);

    const minTime = new Date(today);
    minTime.setHours(openHour, openMinute, 0, 0);

    const maxTime = new Date(today);
    maxTime.setHours(closeHour - 1, 30, 0, 0); // Last reservation 30 min before close

    return { minTime, maxTime };
  };

  const isTimeValid = (selectedTime: Date) => {
    if (!restaurantSchedule) return true;

    const { minTime, maxTime } = getValidTimeRange();
    const timeOnly = new Date();
    timeOnly.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

    return timeOnly >= minTime && timeOnly <= maxTime;
  };

  const loadAvailableTimes = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/reservation/available-times/${location.id}?date=${
          date.toISOString().split("T")[0]
        }`
      );
      if (response.ok) {
        const times = await response.json();
        const formattedTimes = times.map((timeSpan: string) => {
          return timeSpan.substring(0, 5);
        });
        setAvailableTimes(formattedTimes);
      }
    } catch (error) {
      console.error("Error loading available times:", error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      if (!isRestaurantOpen(selectedDate)) {
        Alert.alert(
          "Restaurant Closed",
          "The restaurant is closed on this day. Please select another date.",
          [{ text: "OK" }]
        );
        return;
      }
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (selectedTime) {
      if (!isTimeValid(selectedTime)) {
        const { minTime, maxTime } = getValidTimeRange();
        Alert.alert(
          "Invalid Time",
          `Please select a time between ${formatTime(minTime)} and ${formatTime(
            maxTime
          )} when the restaurant is open.`,
          [{ text: "OK" }]
        );
        return;
      }
      setTime(selectedTime);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleSubmit = async () => {
    if (!people) {
      Alert.alert("Error", "Please enter the number of people");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User information not found");
      return;
    }

    if (!location?.id) {
      Alert.alert("Error", "Restaurant information not found");
      return;
    }

    // Validate selected date
    if (!isRestaurantOpen(date)) {
      Alert.alert(
        "Invalid Date",
        "The restaurant is closed on the selected date. Please choose another day.",
        [{ text: "OK" }]
      );
      return;
    }

    // Validate selected time
    if (!isTimeValid(time)) {
      const { minTime, maxTime } = getValidTimeRange();
      Alert.alert(
        "Invalid Time",
        `The restaurant is closed at the selected time. Please choose a time between ${formatTime(
          minTime
        )} and ${formatTime(maxTime)}.`,
        [{ text: "OK" }]
      );
      return;
    }

    setLoading(true);
    hapticFeedback("medium");

    try {
      const formData = new FormData();
      formData.append("userId", user.id.toString());
      formData.append("locationId", location.id.toString());
      formData.append("customerName", user.username || "");
      formData.append("customerPhone", user.phoneNumber || "");
      console.log(user.phoneNumber);
      formData.append("customerEmail", user.email || "");
      formData.append("reservationDate", date.toISOString().split("T")[0]);
      formData.append(
        "reservationTime",
        `${time.getHours().toString().padStart(2, "0")}:${time
          .getMinutes()
          .toString()
          .padStart(2, "0")}:00`
      );
      formData.append("numberOfPeople", people);
      formData.append("specialRequests", specialRequest || "");

      const response = await fetch(`${BASE_URL}/reservation`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const reservation = await response.json();
        Alert.alert(
          "Reservation Confirmed",
          `Reservation at ${
            location.name
          } for ${people} people on ${date.toLocaleDateString()} at ${formatTime(
            time
          )}. Special requests: ${specialRequest || "None"}`,
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        const error = await response.text();
        Alert.alert("Error", error || "Could not create reservation");
      }
    } catch (error) {
      Alert.alert("Error", "Could not create reservation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0A0A0A"
        translucent
      />

      {/* Modern Header with Enhanced Gradient */}
      <Animated.View
        style={[styles.headerGradient, { opacity: headerOpacity }]}
      >
        {/* Subtle gradient overlay */}
        <View style={styles.gradientOverlay} />
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              hapticFeedback("light");
              navigation.goBack();
            }}
            style={styles.backButtonModern}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Reserve Table</Text>
            <Text style={styles.headerSubtitle}>{location.name}</Text>
          </View>

          {/* Add a subtle restaurant icon */}
          <View style={styles.headerIconContainer}>
            <Ionicons name="restaurant-outline" size={24} color="#9F7AEA" />
          </View>
        </View>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
            scrollEventThrottle={16}
          >
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: formOpacity,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              {/* Floating Form Card with Header */}
              <View style={styles.floatingCard}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={24}
                      color="#9F7AEA"
                    />
                  </View>
                  <View style={styles.cardHeaderText}>
                    <Text style={styles.cardTitle}>Reservation Details</Text>
                    <Text style={styles.cardSubtitle}>
                      Select your preferred date and time
                    </Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.cardDivider} />
                {/* Date Selection */}
                <View style={styles.inputSection}>
                  <Text style={styles.modernLabel}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback("light");
                      setShowDatePicker(true);
                    }}
                    style={[
                      styles.modernInput,
                      !isRestaurantOpen(date) && styles.invalidInput,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.inputIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={22}
                        color={
                          isRestaurantOpen(date)
                            ? theme.colors.primary
                            : theme.colors.error
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.inputValue,
                        !isRestaurantOpen(date) && styles.invalidText,
                      ]}
                    >
                      {date.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {!isRestaurantOpen(date) && (
                    <Text style={styles.validationError}>
                      Restaurant is closed on this day
                    </Text>
                  )}
                </View>

                {/* Time Selection */}
                <View style={styles.inputSection}>
                  <Text style={styles.modernLabel}>Select Time</Text>
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback("light");
                      setShowTimePicker(true);
                    }}
                    style={[
                      styles.modernInput,
                      !isTimeValid(time) && styles.invalidInput,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.inputIcon}>
                      <Ionicons
                        name="time-outline"
                        size={22}
                        color={
                          isTimeValid(time)
                            ? theme.colors.primary
                            : theme.colors.error
                        }
                      />
                    </View>
                    <Text
                      style={[
                        styles.inputValue,
                        !isTimeValid(time) && styles.invalidText,
                      ]}
                    >
                      {formatTime(time)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                  {!isTimeValid(time) && (
                    <Text style={styles.validationError}>
                      Restaurant is closed at this time
                    </Text>
                  )}
                  {restaurantSchedule && (
                    <Text style={styles.scheduleInfo}>
                      Restaurant hours: {restaurantSchedule.openTime} -{" "}
                      {restaurantSchedule.closeTime}
                    </Text>
                  )}
                </View>

                {/* Guest Count */}
                <View style={styles.inputSection}>
                  <Text style={styles.modernLabel}>Number of Guests</Text>
                  <View style={styles.guestSelector}>
                    <TouchableOpacity
                      onPress={() => {
                        const currentNum = parseInt(people || "1", 10);
                        const num = Math.max(1, currentNum - 1);
                        setPeople(num.toString());
                        hapticFeedback("light");
                      }}
                      style={styles.guestButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>

                    <View style={styles.guestDisplay}>
                      <Text style={styles.guestCount}>{people || "1"}</Text>
                      <Text style={styles.guestLabel}>
                        {parseInt(people || "1", 10) === 1 ? "Guest" : "Guests"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => {
                        const currentNum = parseInt(people || "1", 10);
                        const num = Math.min(20, currentNum + 1);
                        setPeople(num.toString());
                        hapticFeedback("light");
                      }}
                      style={styles.guestButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Special Requests */}
                <View style={styles.inputSection}>
                  <Text style={styles.modernLabel}>Special Requests</Text>
                  <View style={styles.textAreaContainer}>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Any special requirements or notes..."
                      placeholderTextColor={theme.colors.textSecondary}
                      value={specialRequest}
                      onChangeText={setSpecialRequest}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

              {/* Enhanced Submit Button with Gradient */}
              <TouchableOpacity
                onPress={handleSubmit}
                style={[
                  styles.submitButton,
                  (loading || !isTimeValid(time) || !isRestaurantOpen(date)) &&
                    styles.submitButtonDisabled,
                ]}
                disabled={
                  loading ||
                  !people ||
                  parseInt(people || "0") < 1 ||
                  !isTimeValid(time) ||
                  !isRestaurantOpen(date)
                }
                activeOpacity={0.8}
              >
                <View style={styles.submitButtonGlow} />
                <View
                  style={[
                    styles.submitGradient,
                    (loading ||
                      !isTimeValid(time) ||
                      !isRestaurantOpen(date)) &&
                      styles.submitButtonDisabled,
                  ]}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitText}>Processing...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={26}
                        color="#FFFFFF"
                      />
                      <Text style={styles.submitText}>Reserve Table</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {Platform.OS === "ios" && showDatePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                maximumDate={maxDate}
                textColor={theme.colors.text}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker Modal */}
      {Platform.OS === "ios" && showTimePicker && (
        <Modal transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.modalButton}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={time}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                is24Hour={true}
                textColor={theme.colors.text}
                minuteInterval={30}
                minimumDate={
                  restaurantSchedule
                    ? (() => {
                        const { minTime } = getValidTimeRange();
                        return minTime;
                      })()
                    : undefined
                }
                maximumDate={
                  restaurantSchedule
                    ? (() => {
                        const { maxTime } = getValidTimeRange();
                        return maxTime;
                      })()
                    : undefined
                }
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android Date/Time Pickers */}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
          maximumDate={maxDate}
        />
      )}
      {Platform.OS === "android" && showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          is24Hour={true}
          minuteInterval={30}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#0A0A0A",
    },

    // Modern Header with Gradient
    headerGradient: {
      height: 110,
      paddingTop: 20,
      backgroundColor: "#0A0A0A",
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      position: "relative",
    },
    gradientOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "transparent",
      background:
        "linear-gradient(135deg, rgba(123, 44, 191, 0.1) 0%, rgba(26, 26, 26, 0.05) 100%)",
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 24,
      zIndex: 1,
    },
    backButtonModern: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(123, 44, 191, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "rgba(123, 44, 191, 0.4)",
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    headerTextContainer: {
      flex: 1,
      marginLeft: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: "#FFFFFF",
      marginBottom: 4,
      letterSpacing: 0.5,
      textShadowColor: "rgba(123, 44, 191, 0.3)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    headerSubtitle: {
      fontSize: 16,
      color: "#B19CD9",
      fontWeight: "600",
      letterSpacing: 0.3,
    },
    headerIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(159, 122, 234, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(159, 122, 234, 0.2)",
    },

    // Layout Styles with Enhanced Spacing
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 80,
    },
    formContainer: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
    },

    // Glassmorphism Card Design
    floatingCard: {
      borderRadius: 24,
      padding: 28,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: "rgba(123, 44, 191, 0.25)",
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
      // Glassmorphism effect with single backgroundColor
      backgroundColor: "rgba(26, 26, 26, 0.8)",
    },

    // Card Header Styles
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    cardHeaderIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "rgba(159, 122, 234, 0.15)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "rgba(159, 122, 234, 0.3)",
      shadowColor: "#9F7AEA",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeaderText: {
      flex: 1,
      marginLeft: 16,
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: "#FFFFFF",
      marginBottom: 4,
      letterSpacing: 0.4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: "#9F7AEA",
      fontWeight: "500",
      letterSpacing: 0.2,
    },
    cardDivider: {
      height: 1,
      backgroundColor: "rgba(123, 44, 191, 0.2)",
      marginBottom: 24,
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },

    // Enhanced Input Section Styles
    inputSection: {
      marginBottom: 28,
    },
    modernLabel: {
      fontSize: 20,
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: 16,
      letterSpacing: 0.4,
      textShadowColor: "rgba(123, 44, 191, 0.2)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    scheduleInfo: {
      fontSize: 13,
      color: "#9F7AEA",
      marginTop: 8,
      fontStyle: "italic",
      letterSpacing: 0.2,
    },
    invalidInput: {
      borderColor: "#EF4444",
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      shadowColor: "#EF4444",
      shadowOpacity: 0.2,
    },
    invalidText: {
      color: "#EF4444",
    },
    validationError: {
      fontSize: 13,
      color: "#EF4444",
      marginTop: 8,
      marginLeft: 6,
      fontWeight: "500",
    },
    modernInput: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(15, 15, 15, 0.8)",
      borderRadius: 16,
      padding: 20,
      borderWidth: 1.5,
      borderColor: "rgba(123, 44, 191, 0.3)",
      minHeight: 56,
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    inputIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(123, 44, 191, 0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    inputValue: {
      flex: 1,
      fontSize: 17,
      fontWeight: "600",
      color: "#FFFFFF",
      letterSpacing: 0.2,
    },

    // Enhanced Guest Selector
    guestSelector: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(15, 15, 15, 0.8)",
      borderRadius: 16,
      padding: 8,
      borderWidth: 1.5,
      borderColor: "rgba(123, 44, 191, 0.3)",
      minHeight: 56,
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    guestButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(123, 44, 191, 0.25)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: "rgba(123, 44, 191, 0.5)",
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    guestDisplay: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 20,
    },
    guestCount: {
      fontSize: 24,
      fontWeight: "800",
      color: "#FFFFFF",
      textShadowColor: "rgba(123, 44, 191, 0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    guestLabel: {
      fontSize: 14,
      color: "#B19CD9",
      fontWeight: "600",
      marginTop: 4,
      letterSpacing: 0.3,
    },

    // Enhanced Text Area
    textAreaContainer: {
      backgroundColor: "rgba(15, 15, 15, 0.8)",
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: "rgba(123, 44, 191, 0.3)",
      minHeight: 100,
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    textArea: {
      padding: 20,
      fontSize: 16,
      color: "#FFFFFF",
      fontWeight: "500",
      lineHeight: 24,
      letterSpacing: 0.2,
    },

    // Enhanced Submit Button with Glow
    submitButton: {
      borderRadius: 20,
      marginTop: 32,
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
      overflow: "hidden",
      position: "relative",
    },
    submitButtonGlow: {
      position: "absolute",
      top: -2,
      left: -2,
      right: -2,
      bottom: -2,
      borderRadius: 22,
      backgroundColor: "rgba(123, 44, 191, 0.3)",
      opacity: 0.6,
    },
    submitGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
      paddingHorizontal: 32,
      minHeight: 64,
      gap: 12,
      backgroundColor: "#7B2CBF",
      // Enhanced gradient simulation with multiple layers
      borderWidth: 1,
      borderColor: "rgba(159, 122, 234, 0.5)",
    },
    submitText: {
      fontSize: 18,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.5,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    submitButtonDisabled: {
      opacity: 0.4,
      shadowOpacity: 0.1,
    },

    // Enhanced Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      justifyContent: "flex-end",
      backdropFilter: "blur(10px)",
    },
    modalContent: {
      backgroundColor: "rgba(26, 26, 26, 0.95)",
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingBottom: Platform.OS === "ios" ? 50 : 30,
      borderTopWidth: 1.5,
      borderTopColor: "rgba(123, 44, 191, 0.4)",
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 16,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(123, 44, 191, 0.2)",
    },
    modalButton: {
      paddingVertical: 16,
      paddingHorizontal: 28,
      backgroundColor: "rgba(123, 44, 191, 0.25)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "rgba(123, 44, 191, 0.4)",
      shadowColor: "#7B2CBF",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    modalButtonText: {
      fontSize: 17,
      fontWeight: "700",
      color: "#9F7AEA",
      letterSpacing: 0.3,
    },
  });

export default Reservation;
