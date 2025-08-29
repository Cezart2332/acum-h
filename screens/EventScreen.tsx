import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
  Animated,
  Share,
  Alert,
  Platform,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "./RootStackParamList";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import UniversalScreen from "../components/UniversalScreen";
import EnhancedButton from "../components/EnhancedButton";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  getResponsiveSpacing,
  SCREEN_DIMENSIONS,
} from "../utils/responsive";

type EventNav = NativeStackNavigationProp<RootStackParamList, "EventScreen">;
type EventRoute = RouteProp<RootStackParamList, "EventScreen">;

interface Props {
  navigation: EventNav;
  route: EventRoute;
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
  photo: string; // Legacy base64 field
  photoUrl: string; // New URL field
  photoPath?: string; // File path for new system
  hasPhoto: boolean; // New field
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  companyId: number;
  tags?: string[];
  company?: string;
  likes?: number;
}

const { width } = Dimensions.get("window");

const EventScreen: React.FC<Props> = ({ route, navigation }) => {
  const { event } = route.params || {};
  const { theme } = useTheme();
  const { user } = useUser();

  // Early return if event is not provided
  if (!event) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: Event information not found</Text>
      </View>
    );
  }
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [currentLikes, setCurrentLikes] = useState(event?.likes || 0);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Check like status when component mounts
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!user) {
        console.log("No user found, skipping like status check");
        return;
      }

      console.log(
        `Checking like status for event ${event.id} and user ${user.id}`
      );

      try {
        const response = await fetch(
          `${BASE_URL}/events/${event.id}/like-status/${user.id}`
        );

        console.log("Like status response:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("Like status data:", data);
          setLiked(data.isLiked);
          setCurrentLikes(data.likes);
        } else {
          console.error("Failed to fetch like status:", response.status);
        }
      } catch (error) {
        console.error("Error checking like status:", error);
      }
    };

    checkLikeStatus();
  }, [event.id, user]);

  const handleLike = useCallback(async () => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to like events.");
      return;
    }

    hapticFeedback("light");
    setLikeLoading(true);

    try {
      const endpoint = liked
        ? `${BASE_URL}/events/${event.id}/unlike`
        : `${BASE_URL}/events/${event.id}/like`;

      const formData = new FormData();
      formData.append("userId", user.id.toString());

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Like response data:", data);
        console.log("Setting liked to:", data.isLiked);
        console.log("Setting likes count to:", data.likes);

        setLiked(data.isLiked);
        setCurrentLikes(data.likes);
        console.log(
          `Event ${
            data.isLiked ? "liked" : "unliked"
          } successfully. Total likes: ${data.likes}`
        );
      } else {
        // Get the error details from the response
        const errorData = await response
          .json()
          .catch(() => ({ Error: "Unknown error" }));
        console.log("Response status:", response.status);
        console.log("Error data:", errorData);
        console.log("Event ID:", event.id);
        console.log("User ID:", user.id);
        console.error(
          "Failed to update like status:",
          errorData.Error || "Unknown error"
        );
        Alert.alert(
          "Error",
          errorData.Error || "Failed to update like status. Please try again."
        );
      }
    } catch (error) {
      console.error("Error updating like status:", error);
      Alert.alert("Error", "Network error. Please check your connection.");
    } finally {
      setLikeLoading(false);
    }
  }, [liked, event.id, user]);

  const handleSave = useCallback(async () => {
    hapticFeedback("light");
    setSaved(!saved);
    // TODO: Implement save functionality
  }, [saved]);

  const handleShare = useCallback(async () => {
    hapticFeedback("light");
    try {
      await Share.share({
        message: `Check out this event: ${event.title}`,
        title: event.title,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  }, [event]);

  const styles = createStyles(theme);

  return (
    <UniversalScreen>
      <Animated.View
        style={[
          { flex: 1 },
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <ImageBackground
              source={{ 
                uri: event.photoUrl && event.photoUrl.trim() !== '' 
                  ? event.photoUrl 
                  : `data:image/jpg;base64,${event.photo}`,
                cache: 'force-cache'
              }}
              style={styles.imageBackground}
              imageStyle={styles.imageStyle}
              onError={(error) => {
                console.log('Event image load error for', event.title, ':', error.nativeEvent.error);
              }}
            >
              <LinearGradient
                colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
                style={styles.overlay}
              />

              {/* Header Actions */}
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: theme.colors.card },
                  ]}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>

                <View style={styles.rightActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.colors.card },
                    ]}
                    onPress={handleShare}
                  >
                    <Ionicons
                      name="share-outline"
                      size={24}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: theme.colors.card },
                    ]}
                    onPress={handleSave}
                  >
                    <Ionicons
                      name={saved ? "bookmark" : "bookmark-outline"}
                      size={24}
                      color={saved ? theme.colors.primary : theme.colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Event Title */}
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{event.title}</Text>
                {currentLikes > 0 && (
                  <View style={styles.likesContainer}>
                    <Ionicons name="heart" size={18} color="#ff6b6b" />
                    <Text style={styles.likesText}>{currentLikes} likes</Text>
                  </View>
                )}
              </View>
            </ImageBackground>
          </View>

          {/* Event Details */}
          <View style={styles.detailsContainer}>
            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tags</Text>
                <View style={styles.tagsContainer}>
                  {event.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>
                {event.description ||
                  "No description available for this event."}
              </Text>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.row}>
                <Ionicons
                  name="location-sharp"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.text}>
                  {event.address && event.city
                    ? `${event.address}, ${event.city}`
                    : event.address || event.city || "Location not specified"}
                </Text>
              </View>
            </View>

            {/* Schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Schedule</Text>
              {event.eventDate && (
                <View style={styles.row}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.text}>
                    {new Date(event.eventDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              )}
              <View style={styles.row}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.text}>
                  {event.startTime && event.endTime
                    ? `${event.startTime} - ${event.endTime}`
                    : "Time not specified"}
                </Text>
              </View>
              {event.company && (
                <View style={styles.row}>
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.text}>Organized by {event.company}</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <EnhancedButton
                title={liked ? "Unlike" : "Like"}
                onPress={handleLike}
                style={
                  liked
                    ? StyleSheet.flatten([styles.actionBtn, styles.likedBtn])
                    : styles.actionBtn
                }
                textStyle={liked ? styles.likedBtnText : undefined}
                icon={liked ? "heart" : "heart-outline"}
                loading={likeLoading}
              />

              <EnhancedButton
                title="Participate"
                onPress={() => {
                  Alert.alert(
                    "Success",
                    "You are now participating in this event!"
                  );
                }}
                style={styles.actionBtn}
                icon="checkmark-circle-outline"
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </UniversalScreen>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    content: {
      paddingBottom: 40,
    },
    heroContainer: {
      height: SCREEN_DIMENSIONS.height * 0.4,
      position: "relative",
    },
    imageBackground: {
      flex: 1,
      justifyContent: "space-between",
    },
    imageStyle: {
      resizeMode: "cover",
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
    headerActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    rightActions: {
      flexDirection: "row",
      gap: 8,
    },
    actionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      ...getShadow(2),
    },
    titleContainer: {
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#FFFFFF",
      textShadowColor: "rgba(0, 0, 0, 0.7)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    likesContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
    },
    likesText: {
      marginLeft: 6,
      fontSize: 16,
      color: "#FFFFFF",
      fontWeight: "600",
      textShadowColor: "rgba(0, 0, 0, 0.7)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    detailsContainer: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      marginTop: -20,
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 12,
    },
    tagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tag: {
      backgroundColor: theme.colors.primary + "20",
      borderColor: theme.colors.primary,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    tagText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: "600",
    },
    description: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      lineHeight: 24,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    text: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    actionContainer: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
    },
    actionBtn: {
      flex: 1,
    },
    likedBtn: {
      backgroundColor: theme.colors.error,
    },
    likedBtnText: {
      color: "#FFFFFF",
    },
  });

export default EventScreen;
