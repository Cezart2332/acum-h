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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

      {/* Modern Header with Gradient */}
      <Animated.View
        style={[styles.headerGradient, { opacity: headerOpacity }]}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback("light");
                navigation.goBack();
              }}
              style={styles.backButtonModern}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Reserve Table</Text>
              <Text style={styles.headerSubtitle}>{location.name}</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>
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
              {/* Floating Form Card */}
              <View style={styles.floatingCard}>
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

              {/* Floating Action Button */}
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
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={
                    loading || !isTimeValid(time) || !isRestaurantOpen(date)
                      ? [theme.colors.textSecondary, theme.colors.textSecondary]
                      : [theme.colors.accent, theme.colors.primary]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.submitText}>Reserve Table</Text>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#FFFFFF"
                      />
                    </>
                  )}
                </LinearGradient>
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
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Modern Header Styles
    headerGradient: {
      height: 120,
      paddingTop: Platform.OS === "ios" ? 50 : 20,
    },
    gradient: {
      flex: 1,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getResponsiveSpacing("lg"),
      paddingTop: getResponsiveSpacing("sm"),
      paddingBottom: getResponsiveSpacing("lg"),
    },
    backButtonModern: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTextContainer: {
      flex: 1,
      marginLeft: getResponsiveSpacing("lg"),
    },
    headerTitle: {
      fontSize: TYPOGRAPHY.h2,
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: TYPOGRAPHY.body,
      color: "rgba(255,255,255,0.8)",
      fontWeight: "500",
    },
    headerSpacer: {
      width: 40,
    },

    // Layout Styles
    keyboardView: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: getResponsiveSpacing("xxxl"),
    },
    formContainer: {
      flex: 1,
      paddingHorizontal: getResponsiveSpacing("lg"),
      paddingTop: getResponsiveSpacing("xl"),
    },

    // Modern Card Styles
    floatingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: getResponsiveSpacing("lg"),
      marginBottom: getResponsiveSpacing("lg"),
      ...getShadow(4),
      elevation: 4,
    },

    // Input Section Styles
    inputSection: {
      marginBottom: getResponsiveSpacing("lg"),
    },
    modernLabel: {
      fontSize: TYPOGRAPHY.h4,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: getResponsiveSpacing("md"),
      letterSpacing: 0.5,
    },
    scheduleInfo: {
      fontSize: TYPOGRAPHY.caption,
      color: theme.colors.textSecondary,
      marginTop: getResponsiveSpacing("xs"),
      fontStyle: "italic",
    },
    invalidInput: {
      borderColor: theme.colors.error,
      backgroundColor: theme.colors.error + "08",
    },
    invalidText: {
      color: theme.colors.error,
    },
    validationError: {
      fontSize: TYPOGRAPHY.caption,
      color: theme.colors.error,
      marginTop: getResponsiveSpacing("xs"),
      marginLeft: getResponsiveSpacing("xs"),
    },
    modernInput: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: getResponsiveSpacing("md"),
      borderWidth: 1.5,
      borderColor: theme.colors.border + "40",
      minHeight: 48,
    },
    inputIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginRight: getResponsiveSpacing("sm"),
    },
    inputValue: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      fontWeight: "500",
      color: theme.colors.text,
    },

    // Guest Selector Styles
    guestSelector: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: getResponsiveSpacing("xs"),
      borderWidth: 1.5,
      borderColor: theme.colors.border + "40",
      minHeight: 48,
    },
    guestButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    guestDisplay: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: getResponsiveSpacing("md"),
    },
    guestCount: {
      fontSize: TYPOGRAPHY.h3,
      fontWeight: "700",
      color: theme.colors.text,
    },
    guestLabel: {
      fontSize: TYPOGRAPHY.caption,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginTop: 2,
    },

    // Text Area Styles
    textAreaContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.colors.border + "40",
      minHeight: 80,
    },
    textArea: {
      padding: getResponsiveSpacing("md"),
      fontSize: TYPOGRAPHY.body,
      color: theme.colors.text,
      fontWeight: "500",
      lineHeight: 20,
    },

    // Submit Button Styles
    submitButton: {
      borderRadius: 20,
      overflow: "hidden",
      marginTop: getResponsiveSpacing("lg"),
      ...getShadow(6),
      elevation: 6,
    },
    submitGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getResponsiveSpacing("lg"),
      paddingHorizontal: getResponsiveSpacing("xl"),
      minHeight: 56,
      gap: getResponsiveSpacing("sm"),
    },
    submitText: {
      fontSize: TYPOGRAPHY.h4,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: Platform.OS === "ios" ? 40 : 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: getResponsiveSpacing("lg"),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + "30",
    },
    modalButton: {
      paddingVertical: getResponsiveSpacing("sm"),
      paddingHorizontal: getResponsiveSpacing("lg"),
    },
    modalButtonText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "600",
      color: theme.colors.primary,
    },
  });

export default Reservation;
