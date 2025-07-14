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
  const { company } = route.params;
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [people, setPeople] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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

  // Calculate max date (1 week from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) setDate(selectedDate);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) setTime(selectedTime);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const handleSubmit = () => {
    if (!people) {
      Alert.alert("Eroare", "Vă rugăm introduceți numărul de persoane");
      return;
    }

    Alert.alert(
      "Rezervare confirmată",
      `Rezervare la ${
        company.name
      } pentru ${people} persoane pe data de ${date.toLocaleDateString()} la ora ${formatTime(
        time
      )}. Cerințe speciale: ${specialRequest || "Niciuna"}`,
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Close both pickers
  const closePickers = () => {
    setShowDatePicker(false);
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
            <Text style={styles.headerTitle}>Rezervări</Text>
          </View>

          {/* Content Card */}
          <View style={styles.card}>
            <View style={styles.companyHeader}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyCategory}>{company.category}</Text>
            </View>

            {/* Date Picker */}
            <View style={styles.section}>
              <Text style={styles.label}>Dată</Text>
              <TouchableOpacity
                onPress={() => {
                  closePickers();
                  setShowDatePicker(true);
                }}
                style={styles.inputContainer}
              >
                <Ionicons name="calendar" size={24} color="#A78BFA" />
                <Text style={styles.inputText}>
                  {date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dateHint}>
                Maxim 1 săptămână în avans ({maxDate.toLocaleDateString()})
              </Text>
            </View>

            {/* Time Picker */}
            <View style={styles.section}>
              <Text style={styles.label}>Oră</Text>
              <TouchableOpacity
                onPress={() => {
                  closePickers();
                  setShowTimePicker(true);
                }}
                style={styles.inputContainer}
              >
                <Ionicons name="time" size={24} color="#A78BFA" />
                <Text style={styles.inputText}>{formatTime(time)}</Text>
              </TouchableOpacity>
            </View>

            {/* People Selector */}
            <View style={styles.section}>
              <Text style={styles.label}>Număr de persoane</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people" size={24} color="#A78BFA" />
                <TextInput
                  style={styles.input}
                  value={people}
                  onChangeText={setPeople}
                  placeholder="Ex: 2"
                  placeholderTextColor="#6D6D78"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Special Requests */}
            <View style={styles.section}>
              <Text style={styles.label}>Cerințe speciale</Text>
              <View style={[styles.inputContainer, styles.multilineContainer]}>
                <Ionicons name="create" size={24} color="#A78BFA" />
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={specialRequest}
                  onChangeText={setSpecialRequest}
                  placeholder="Alergii, loc preferat, etc."
                  placeholderTextColor="#6D6D78"
                  multiline
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Confirmă Rezervarea</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* iOS Picker Modal */}
        {Platform.OS === "ios" && (showDatePicker || showTimePicker) && (
          <Modal transparent={true} animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={closePickers}>
                  <Text style={styles.doneButton}>Gata</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    maximumDate={maxDate} // Added max date
                    textColor="#FFFFFF"
                    themeVariant="dark"
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    is24Hour={true}
                    textColor="#FFFFFF"
                    themeVariant="dark"
                  />
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* Android Pickers */}
        {Platform.OS === "android" && showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            minimumDate={new Date()}
            maximumDate={maxDate} // Added max date
            textColor="#FFFFFF"
            themeVariant="dark"
          />
        )}
        {Platform.OS === "android" && showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            is24Hour={true}
            textColor="#FFFFFF"
            themeVariant="dark"
          />
        )}
      </Animated.View>
    </UniversalScreen>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  card: {
    margin: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  companyHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#2D2D2D",
    paddingBottom: 16,
    marginBottom: 16,
  },
  companyName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#E0E0FF",
    marginBottom: 4,
  },
  companyCategory: {
    fontSize: 16,
    color: "#A78BFA",
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#C4B5FD",
    marginBottom: 8,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A1A4A",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#44337A",
  },
  multilineContainer: {
    alignItems: "flex-start",
    minHeight: 100,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#E0E0FF",
    marginLeft: 12,
    paddingVertical: 2,
  },
  multilineInput: {
    textAlignVertical: "top",
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: "#E0E0FF",
    marginLeft: 12,
  },
  submitButton: {
    backgroundColor: "#6C3AFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  doneButton: {
    color: "#A78BFA",
    fontSize: 18,
    fontWeight: "600",
    padding: 8,
  },
  pickerContainer: {
    backgroundColor: "#1A1A1A",
    paddingBottom: 20,
  },
  // NEW: Date hint text style
  dateHint: {
    fontSize: 12,
    color: "#A78BFA",
    marginTop: 6,
    marginLeft: 8,
    fontStyle: "italic",
  },
});

export default Reservation;
