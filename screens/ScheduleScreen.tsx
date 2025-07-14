import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Animated,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "./RootStackParamList";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import EnhancedButton from "../components/EnhancedButton";
import EnhancedInput from "../components/EnhancedInput";
import { 
  getShadow, 
  hapticFeedback, 
  TYPOGRAPHY,
  SCREEN_DIMENSIONS 
} from "../utils/responsive";

type ScheduleNav = NativeStackNavigationProp<
  RootStackParamList,
  "Schedule"
>;
type ScheduleRoute = RouteProp<RootStackParamList, "Schedule">;

interface Props {
  navigation: ScheduleNav;
  route: ScheduleRoute;
}

interface DaySchedule {
  day: string;
  dayName: string;
  isOpen: boolean;
  is24Hours: boolean;
  openTime: Date;
  closeTime: Date;
}

const ScheduleScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { company } = route.params;
  
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: "Monday", dayName: "Luni", isOpen: true, is24Hours: false, openTime: new Date(2024, 0, 1, 9, 0), closeTime: new Date(2024, 0, 1, 22, 0) },
    { day: "Tuesday", dayName: "Marți", isOpen: true, is24Hours: false, openTime: new Date(2024, 0, 1, 9, 0), closeTime: new Date(2024, 0, 1, 22, 0) },
    { day: "Wednesday", dayName: "Miercuri", isOpen: true, is24Hours: false, openTime: new Date(2024, 0, 1, 9, 0), closeTime: new Date(2024, 0, 1, 22, 0) },
    { day: "Thursday", dayName: "Joi", isOpen: true, is24Hours: false, openTime: new Date(2024, 0, 1, 9, 0), closeTime: new Date(2024, 0, 1, 22, 0) },
    { day: "Friday", dayName: "Vineri", isOpen: true, is24Hours: false, openTime: new Date(2024, 0, 1, 9, 0), closeTime: new Date(2024, 0, 1, 23, 0) },
    { day: "Saturday", dayName: "Sâmbătă", isOpen: true, is24Hours: false, openTime: new Date(2024, 0, 1, 10, 0), closeTime: new Date(2024, 0, 1, 23, 0) },
    { day: "Sunday", dayName: "Duminică", isOpen: false, is24Hours: false, openTime: new Date(2024, 0, 1, 10, 0), closeTime: new Date(2024, 0, 1, 22, 0) },
  ]);
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerMode, setTimePickerMode] = useState<'open' | 'close'>('open');
  const [loading, setLoading] = useState(false);
  
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
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleDayToggle = (index: number) => {
    hapticFeedback('light');
    const newSchedule = [...schedule];
    newSchedule[index].isOpen = !newSchedule[index].isOpen;
    setSchedule(newSchedule);
  };

  const handle24HoursToggle = (index: number) => {
    hapticFeedback('light');
    const newSchedule = [...schedule];
    newSchedule[index].is24Hours = !newSchedule[index].is24Hours;
    setSchedule(newSchedule);
  };

  const handleTimePress = (index: number, mode: 'open' | 'close') => {
    hapticFeedback('light');
    setSelectedDay(index);
    setTimePickerMode(mode);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime && selectedDay !== null) {
      const newSchedule = [...schedule];
      if (timePickerMode === 'open') {
        newSchedule[selectedDay].openTime = selectedTime;
      } else {
        newSchedule[selectedDay].closeTime = selectedTime;
      }
      setSchedule(newSchedule);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Here you would make an API call to save the schedule
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        "Succes",
        "Programul a fost salvat cu succes!",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert("Eroare", "Nu s-a putut salva programul");
    } finally {
      setLoading(false);
    }
  };

  const closeTimePicker = () => {
    setShowTimePicker(false);
  };

  return (
    <UniversalScreen>
      <Animated.View 
        style={[
          { flex: 1 },
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim }
            ]
          }
        ]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback('light');
                navigation.goBack();
              }}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Program</Text>
          </View>

          {/* Content Card */}
          <View style={styles.card}>
            <View style={styles.companyHeader}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyCategory}>{company.category}</Text>
            </View>

            {/* Schedule List */}
            {schedule.map((day, index) => (
              <View key={day.day} style={styles.dayContainer}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayName}>{day.dayName}</Text>
                    <Switch
                      value={day.isOpen}
                      onValueChange={() => handleDayToggle(index)}
                      trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                      thumbColor={day.isOpen ? theme.colors.onPrimary : theme.colors.onSurface}
                    />
                  </View>
                </View>

                {day.isOpen && (
                  <View style={styles.timeContainer}>
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>24 ore</Text>
                      <Switch
                        value={day.is24Hours}
                        onValueChange={() => handle24HoursToggle(index)}
                        trackColor={{ false: theme.colors.surface, true: theme.colors.primary }}
                        thumbColor={day.is24Hours ? theme.colors.onPrimary : theme.colors.onSurface}
                      />
                    </View>

                    {!day.is24Hours && (
                      <View style={styles.timeInputs}>
                        <TouchableOpacity
                          style={styles.timeInput}
                          onPress={() => handleTimePress(index, 'open')}
                        >
                          <Ionicons name="time" size={20} color="#A78BFA" />
                          <Text style={styles.timeText}>
                            {formatTime(day.openTime)}
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.timeSeparator}>-</Text>

                        <TouchableOpacity
                          style={styles.timeInput}
                          onPress={() => handleTimePress(index, 'close')}
                        >
                          <Ionicons name="time" size={20} color="#A78BFA" />
                          <Text style={styles.timeText}>
                            {formatTime(day.closeTime)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? "Se salvează..." : "Salvează Programul"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* iOS Time Picker Modal */}
        {Platform.OS === "ios" && showTimePicker && (
          <Modal transparent={true} animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closeTimePicker}>
                  <Text style={styles.doneButton}>Gata</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={selectedDay !== null ? 
                    (timePickerMode === 'open' ? schedule[selectedDay].openTime : schedule[selectedDay].closeTime) : 
                    new Date()}
                  mode="time"
                  display="spinner"
                  onChange={handleTimeChange}
                />
              </View>
            </View>
          </Modal>
        )}

        {/* Android Time Picker */}
        {Platform.OS === "android" && showTimePicker && (
          <DateTimePicker
            value={selectedDay !== null ? 
              (timePickerMode === 'open' ? schedule[selectedDay].openTime : schedule[selectedDay].closeTime) : 
              new Date()}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </Animated.View>
    </UniversalScreen>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.colors.surface,
    ...getShadow(2),
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: theme.colors.onSurface,
    flex: 1,
  },
  card: {
    margin: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    ...getShadow(4),
  },
  companyHeader: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  companyName: {
    ...TYPOGRAPHY.h3,
    color: theme.colors.onSurface,
    marginBottom: 5,
  },
  companyCategory: {
    ...TYPOGRAPHY.body2,
    color: theme.colors.onSurfaceVariant,
  },
  dayContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
  },
  dayHeader: {
    marginBottom: 10,
  },
  dayInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayName: {
    ...TYPOGRAPHY.h4,
    color: theme.colors.onSurface,
    fontWeight: "600",
  },
  timeContainer: {
    marginTop: 10,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  timeLabel: {
    ...TYPOGRAPHY.body1,
    color: theme.colors.onSurfaceVariant,
  },
  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  timeText: {
    ...TYPOGRAPHY.body1,
    color: theme.colors.onSurface,
    marginLeft: 8,
    fontWeight: "500",
  },
  timeSeparator: {
    ...TYPOGRAPHY.h4,
    color: theme.colors.onSurfaceVariant,
    marginHorizontal: 10,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    ...getShadow(2),
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
    color: theme.colors.onPrimary,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalHeader: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: "flex-end",
  },
  doneButton: {
    ...TYPOGRAPHY.button,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  pickerContainer: {
    backgroundColor: theme.colors.surface,
    paddingBottom: 20,
  },
});

export default ScheduleScreen;