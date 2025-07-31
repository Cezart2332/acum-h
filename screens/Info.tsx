import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  ImageBackground,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
  Share,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList, LocationData } from "./RootStackParamList";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import EnhancedButton from "../components/EnhancedButton";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  SCREEN_DIMENSIONS,
} from "../utils/responsive";

type InfoNav = NativeStackNavigationProp<RootStackParamList, "Info">;
type InfoRoute = RouteProp<RootStackParamList, "Info">;

interface Props {
  navigation: InfoNav;
  route: InfoRoute;
}

interface EventData {
  id: number;
  title: string;
  description?: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  address: string;
  city: string;
  photo: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  companyId: number;
  tags?: string[];
  company?: string;
  likes?: number;
}

interface CompanyData {
  id?: number;
  name?: string;
  email?: string;
  address?: string;
  cui?: number;
  category?: string;
  profileImage?: string;
  description?: string;
  tags: string[];
}

type ProfileData = LocationData;

const Info: React.FC<Props> = ({ navigation, route }) => {
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
  const [events, setEvents] = useState<EventData[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const [hasMenu, setHasMenu] = useState<boolean>(false);
  const [checkingMenu, setCheckingMenu] = useState<boolean>(true);

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

  // Fetch events
  useEffect(() => {
    (async () => {
      setLoadingEvents(true);
      try {
        console.log("Fetching events for location", location.id);
        // For now, we'll get events by company since events are still company-based
        const res = await fetch(`${BASE_URL}/companyevents`, {
          method: "POST",
          body: (() => {
            const form = new FormData();
            form.append("id", location.company.id.toString());
            return form;
          })(),
        });
        console.log("Events fetch status", res.status);
        if (res.ok) {
          const data: EventData[] = await res.json();
          setEvents(data);
        }
      } catch (e) {
        console.error("Event fetch error", e);
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, [location.id]);

  // Check if menu exists via GET (inspect 200 vs 404)
  useEffect(() => {
    (async () => {
      setCheckingMenu(true);
      try {
        const url = `${BASE_URL}/locations/${location.id}/menu`;
        console.log("Checking menu at", url);
        const res = await fetch(url, { method: "GET" });
        console.log("Menu check status", res.status);
        setHasMenu(res.status === 200);
      } catch (e) {
        console.error("Menu check failed", e);
        setHasMenu(false);
      } finally {
        setCheckingMenu(false);
      }
    })();
  }, [location.id]);

  const openMenu = async () => {
    try {
      const url = `${BASE_URL}/locations/${location.id}/menu`;
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Eroare", "Nu s-a putut deschide meniul");
    }
  };

  // NEW FUNCTION: Redirect to Reservation page
  const goToReservation = () => {
    navigation.navigate("Reservation", { location });
  };

  // NEW FUNCTION: Redirect to Schedule page
  const goToSchedule = () => {
    navigation.navigate("Schedule", { location });
  };

  const renderEvent = ({ item }: { item: EventData }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("EventScreen", { event: item })}
      style={styles.eventCardWrapper}
    >
      <View style={styles.eventCard}>
        <ImageBackground
          source={{ uri: `data:image/jpg;base64,${item.photo}` }}
          style={styles.eventImage}
          imageStyle={styles.eventImageStyle}
        >
          <View style={styles.eventOverlay} />
          <View style={styles.eventText}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.eventDesc}>{item.description}</Text>
            )}
            {item.likes !== undefined && item.likes > 0 && (
              <View style={styles.eventLikes}>
                <Ionicons name="heart" size={14} color="#ff6b6b" />
                <Text style={styles.eventLikesText}>{item.likes} likes</Text>
              </View>
            )}
          </View>
        </ImageBackground>
      </View>
    </TouchableOpacity>
  );

  return (
    <UniversalScreen>
      <Animated.View
        style={[
          { flex: 1 },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={{ uri: `data:image/jpg;base64,${location.photo}` }}
            style={styles.heroImage}
          />
          <View style={styles.infoCard}>
            <Text style={styles.companyName}>{location.name}</Text>

            {/* Tags */}
            {location.tags?.length > 0 && (
              <View style={styles.tagsContainer}>
                {location.tags.map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Contact rows */}
            <View style={styles.row}>
              <Ionicons name="location-outline" size={20} color="#A78BFA" />
              <Text style={styles.infoText}>{location.address}</Text>
            </View>
            {location.phoneNumber && (
              <TouchableOpacity
                style={styles.row}
                onPress={() => {
                  const phoneUrl = `tel:${location.phoneNumber}`;
                  Linking.canOpenURL(phoneUrl).then((supported) => {
                    if (supported) {
                      return Linking.openURL(phoneUrl);
                    } else {
                      Alert.alert(
                        "Error",
                        "Phone calls are not supported on this device"
                      );
                    }
                  });
                }}
              >
                <Ionicons name="call-outline" size={20} color="#A78BFA" />
                <Text
                  style={[
                    styles.infoText,
                    { color: "#A78BFA", textDecorationLine: "underline" },
                  ]}
                >
                  {location.phoneNumber}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.row}>
              <Ionicons name="pricetag-outline" size={20} color="#A78BFA" />
              <Text style={styles.infoText}>{location.category}</Text>
            </View>

            {/* Despre noi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Despre noi</Text>
              <Text style={styles.description}>
                De adaugat descriere pe locatie !
              </Text>
            </View>

            {/* Meniu */}
            {checkingMenu ? (
              <Text style={styles.loadingText}>Verificare meniu...</Text>
            ) : hasMenu ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Meniu</Text>
                <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
                  <Ionicons name="document-text" size={24} color="#A78BFA" />
                  <Text style={styles.menuButtonText}>Vizualizează Meniul</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.loadingText}>Meniu indisponibil</Text>
            )}

            {/* NEW RESERVATION BUTTON */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rezervări</Text>
              <TouchableOpacity
                style={styles.reservationButton}
                onPress={goToReservation}
              >
                <Ionicons name="restaurant" size={24} color="#A78BFA" />
                <Text style={styles.reservationButtonText}>Rezervă acum</Text>
              </TouchableOpacity>
            </View>

            {/* NEW SCHEDULE BUTTON */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Program</Text>
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={goToSchedule}
              >
                <Ionicons name="time" size={24} color="#A78BFA" />
                <Text style={styles.scheduleButtonText}>Vezi Programul</Text>
              </TouchableOpacity>
            </View>

            {/* Evenimente */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Evenimente</Text>
              {loadingEvents ? (
                <Text style={styles.loadingText}>Se încarcă evenimente...</Text>
              ) : events.length === 0 ? (
                <Text style={styles.loadingText}>Nu există evenimente.</Text>
              ) : (
                <FlatList
                  data={events}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={renderEvent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventsList}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </UniversalScreen>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.surface },
    scroll: { paddingBottom: 40 },
    heroImage: {
      width: "100%",
      height: 240,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    infoCard: {
      margin: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 24,
      ...getShadow(4),
    },
    companyName: {
      fontSize: 28,
      fontWeight: "700",
      color: "white",
      marginBottom: 16,
      textAlign: "center",
    },
    tagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 16,
    },
    tag: {
      backgroundColor: "#2A1A4A",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#6C3AFF",
      marginRight: 8,
      marginBottom: 8,
    },
    tagText: { color: "#C4B5FD", fontSize: 14, fontWeight: "500" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 8,
      paddingVertical: 6,
    },
    infoText: {
      marginLeft: 12,
      fontSize: 16,
      color: "#C4B5FD",
      flexShrink: 1,
    },
    section: {
      marginTop: 24,
      borderLeftWidth: 3,
      borderLeftColor: "#6C3AFF",
      paddingLeft: 12,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: "#E0E0FF",
      marginBottom: 12,
    },
    description: {
      fontSize: 16,
      lineHeight: 24,
      color: "#D1D5DB",
      opacity: 0.9,
    },
    loadingText: {
      fontSize: 16,
      color: "#A78BFA",
      textAlign: "center",
      marginVertical: 16,
    },
    menuButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#2A1A4A",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#6C3AFF",
      marginTop: 8,
    },
    menuButtonText: {
      color: "#C4B5FD",
      fontSize: 16,
      marginLeft: 12,
      fontWeight: "500",
    },
    // NEW RESERVATION BUTTON STYLES
    reservationButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#2A1A4A",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#6C3AFF",
      marginTop: 8,
    },
    reservationButtonText: {
      color: "#C4B5FD",
      fontSize: 16,
      marginLeft: 12,
      fontWeight: "500",
    },
    // NEW SCHEDULE BUTTON STYLES
    scheduleButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#2A1A4A",
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#6C3AFF",
      marginTop: 8,
    },
    scheduleButtonText: {
      color: "#C4B5FD",
      fontSize: 16,
      marginLeft: 12,
      fontWeight: "500",
    },
    eventsList: { paddingVertical: 12 },
    eventCardWrapper: { marginRight: 16 },
    eventCard: {
      width: 180,
      height: 140,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: "#2A1A4A",
    },
    eventImage: { flex: 1, justifyContent: "flex-end" },
    eventImageStyle: { borderRadius: 16 },
    eventOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(15,8,23,0.4)",
    },
    eventText: { padding: 12 },
    eventTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: "#FFFFFF",
      textShadowColor: "rgba(0,0,0,0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    eventDesc: { fontSize: 14, color: "#E0E0FF", marginTop: 4, opacity: 0.9 },
    eventLikes: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
    },
    eventLikesText: {
      fontSize: 12,
      color: "#FFFFFF",
      marginLeft: 4,
      fontWeight: "600",
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  });

export default Info;
