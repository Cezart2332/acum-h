import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import { BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import UniversalScreen from "../components/UniversalScreen";
import {
  getResponsiveFontSize,
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  getResponsiveSpacing,
  SCREEN_DIMENSIONS,
} from "../utils/responsive";

type HomeNav = NativeStackNavigationProp<RootStackParamList, "Home">;

interface LocationData {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  tags: string[];
  photo: string;
  menuName: string;
  hasMenu: boolean;
  category: string;
  company: {
    id: number;
  };
  createdAt: string;
  updatedAt: string;
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

export default function HomeScreen({ navigation }: { navigation: HomeNav }) {
  const { theme } = useTheme();
  const { user } = useUser();
  const [eOrR, setEOrR] = useState(false); // false = locations, true = events
  const [selectedCategory, setSelectedCategory] = useState<string>("toate"); // New category filter
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState<LocationData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);

  const styles = createStyles(theme);

  // Categories for location filtering
  const categories = [
    { id: "toate", name: "Toate", icon: "grid-outline" },
    { id: "restaurant", name: "Restaurant", icon: "restaurant-outline" },
    { id: "cafenea", name: "Cafenea", icon: "cafe-outline" },
    { id: "pub", name: "Pub", icon: "wine-outline" },
    { id: "club", name: "Club", icon: "musical-notes-outline" },
  ];

  // Load data on component mount
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [restaurantsData, eventsData] = await Promise.all([
        fetch(`${BASE_URL}/locations`).then((res) => res.json()),
        fetch(`${BASE_URL}/events`).then((res) => res.json()),
      ]);

      setRestaurants(restaurantsData || []);
      setEvents(eventsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const navigateToInfo = useCallback(
    (location: LocationData) => {
      hapticFeedback("medium");
      navigation.navigate("Info", { location });
    },
    [navigation]
  );

  const navigateToEvent = useCallback(
    (event: EventData) => {
      hapticFeedback("medium");
      navigation.navigate("EventScreen", { event });
    },
    [navigation]
  );

  const navigateToProfile = useCallback(() => {
    hapticFeedback("light");
    navigation.navigate("Profile");
  }, [navigation]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bună dimineața";
    if (hour < 18) return "Bună ziua";
    return "Bună seara";
  };

  const getUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || "Utilizator";
  };

  // Filter locations by category
  const filteredRestaurants =
    selectedCategory === "toate"
      ? restaurants
      : restaurants.filter(
          (location) =>
            location.category?.toLowerCase() === selectedCategory.toLowerCase()
        );

  const currentData = eOrR ? events : filteredRestaurants;

  const renderCard = ({ item }: { item: LocationData | EventData }) => {
    const isEvent = "title" in item;
    const eventItem = item as EventData;
    const locationItem = item as LocationData;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          isEvent ? navigateToEvent(eventItem) : navigateToInfo(locationItem)
        }
        activeOpacity={0.95}
      >
        <ImageBackground
          source={{
            uri: `data:image/jpg;base64,${
              isEvent ? eventItem.photo : locationItem.photo
            }`,
          }}
          style={styles.cardImage}
          imageStyle={styles.cardImageStyle}
        >
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)", "rgba(16, 16, 16, 0.9)"]}
            style={styles.cardOverlay}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardBadge}>
                <Ionicons
                  name={isEvent ? "calendar" : "location"}
                  size={14}
                  color="#A78BFA"
                />
                <Text style={styles.cardBadgeText}>
                  {isEvent
                    ? "EVENT"
                    : locationItem.category?.toUpperCase() || "LOCAȚIE"}
                </Text>
              </View>
              <Text style={styles.cardTitle}>
                {isEvent ? eventItem.title : locationItem.name}
              </Text>
              {isEvent ? (
                <View>
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {eventItem.description}
                  </Text>
                  {eventItem.likes !== undefined && eventItem.likes > 0 && (
                    <View style={styles.cardFooter}>
                      <Ionicons name="heart" size={16} color="#8B5CF6" />
                      <Text style={styles.cardAddress}>
                        {eventItem.likes} likes
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <Text style={styles.cardCategory}>
                    {locationItem.category}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color="#A78BFA"
                    />
                    <Text style={styles.cardAddress} numberOfLines={1}>
                      {locationItem.address}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <UniversalScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Se încarcă...
          </Text>
        </View>
      </UniversalScreen>
    );
  }

  return (
    <UniversalScreen>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        decelerationRate="normal"
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View
          style={[styles.header, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.greetingContainer}>
            <Text
              style={[styles.greeting, { color: theme.colors.textSecondary }]}
            >
              {getGreeting()}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {getUserName()}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.profileButton,
              { backgroundColor: theme.colors.accent },
            ]}
            onPress={navigateToProfile}
            activeOpacity={0.8}
          >
            {user?.profileImage ? (
              <Image
                source={{
                  uri: `data:image/jpg;base64,${user.profileImage}`,
                }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle Section */}
        <View style={styles.toggleSection}>
          <View
            style={[
              styles.toggleContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !eOrR && {
                  backgroundColor: "#6B46C1", // Dark violet
                },
              ]}
              onPress={() => {
                hapticFeedback("light");
                setEOrR(false);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: !eOrR ? "#FFFFFF" : theme.colors.text,
                  },
                ]}
              >
                Locații
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                eOrR && {
                  backgroundColor: "#6B46C1", // Dark violet
                },
              ]}
              onPress={() => {
                hapticFeedback("light");
                setEOrR(true);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  {
                    color: eOrR ? "#FFFFFF" : theme.colors.text,
                  },
                ]}
              >
                Evenimente
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filter Section - Only show when locations are selected */}
        {!eOrR && (
          <View style={styles.categorySection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryContainer}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor:
                        selectedCategory === category.id
                          ? "#6B46C1"
                          : "rgba(255, 255, 255, 0.1)",
                      borderColor:
                        selectedCategory === category.id
                          ? "#8B5CF6"
                          : "rgba(255, 255, 255, 0.2)",
                    },
                  ]}
                  onPress={() => {
                    hapticFeedback("light");
                    setSelectedCategory(category.id);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={18}
                    color={
                      selectedCategory === category.id ? "#FFFFFF" : "#A78BFA"
                    }
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color:
                          selectedCategory === category.id
                            ? "#FFFFFF"
                            : "#A78BFA",
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content Section */}
        <View style={styles.contentSection}>
          <FlatList
            data={currentData}
            renderItem={renderCard}
            keyExtractor={(item) =>
              `${eOrR ? "event" : "restaurant"}-${item.id}`
            }
            scrollEnabled={false}
            contentContainerStyle={styles.cardContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={8}
          />
        </View>
      </ScrollView>
    </UniversalScreen>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: getResponsiveSpacing("lg"),
    },
    loadingText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "500",
    },
    scrollContent: {
      paddingBottom: getResponsiveSpacing("xxl"),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getResponsiveSpacing("xl"),
      paddingVertical: getResponsiveSpacing("lg"),
      marginBottom: getResponsiveSpacing("md"),
      borderRadius: 16,
      marginHorizontal: getResponsiveSpacing("lg"),
      marginTop: getResponsiveSpacing("md"),
      ...getShadow(2),
    },
    greetingContainer: {
      flex: 1,
    },
    greeting: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "500",
      marginBottom: getResponsiveSpacing("xs"),
      opacity: 0.8,
    },
    userName: {
      fontSize: TYPOGRAPHY.h3,
      fontWeight: "700",
    },
    profileButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      overflow: "hidden",
      ...getShadow(3),
    },
    profileImage: {
      width: "100%",
      height: "100%",
      borderRadius: 21,
    },
    profilePlaceholder: {
      width: "100%",
      height: "100%",
      borderRadius: 21,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    toggleSection: {
      paddingHorizontal: getResponsiveSpacing("xl"),
      marginBottom: getResponsiveSpacing("xl"),
    },
    toggleContainer: {
      flexDirection: "row",
      borderRadius: 20,
      padding: getResponsiveSpacing("xs"),
      ...getShadow(1),
    },
    toggleButton: {
      flex: 1,
      paddingVertical: getResponsiveSpacing("md"),
      paddingHorizontal: getResponsiveSpacing("lg"),
      borderRadius: 16,
      alignItems: "center",
      minHeight: getResponsiveSpacing("xl") + 8,
    },
    toggleText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
    },
    contentSection: {
      flex: 1,
      paddingHorizontal: getResponsiveSpacing("lg"),
    },
    cardContainer: {
      gap: getResponsiveSpacing("lg"),
    },
    card: {
      height: 140,
      borderRadius: 16,
      overflow: "hidden",
      marginBottom: getResponsiveSpacing("md"),
      ...getShadow(2),
    },
    cardImage: {
      width: "100%",
      height: "100%",
    },
    cardImageStyle: {
      borderRadius: 32,
    },
    cardOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      padding: getResponsiveSpacing("xl"),
    },
    cardContent: {
      gap: getResponsiveSpacing("sm"),
    },
    cardBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: getResponsiveSpacing("md"),
      paddingVertical: getResponsiveSpacing("sm"),
      borderRadius: 16,
      alignSelf: "flex-start",
      gap: getResponsiveSpacing("xs"),
    },
    cardBadgeText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    cardTitle: {
      fontSize: TYPOGRAPHY.h2,
      fontWeight: "800",
      color: "#FFFFFF",
      marginTop: getResponsiveSpacing("sm"),
    },
    cardCategory: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "600",
      color: "#FFFFFF",
      opacity: 0.9,
    },
    cardDescription: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "500",
      color: "#FFFFFF",
      opacity: 0.9,
      lineHeight: 24,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: getResponsiveSpacing("xs"),
      marginTop: getResponsiveSpacing("xs"),
    },
    cardAddress: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "500",
      color: "#FFFFFF",
      opacity: 0.8,
      flex: 1,
    },
    categorySection: {
      paddingVertical: getResponsiveSpacing("md"),
      backgroundColor: "rgba(0, 0, 0, 0.05)",
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.1)",
    },
    categoryContainer: {
      paddingHorizontal: getResponsiveSpacing("xl"),
      gap: getResponsiveSpacing("md"),
    },
    categoryButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getResponsiveSpacing("sm"),
      paddingHorizontal: getResponsiveSpacing("lg"),
      borderRadius: 20,
      borderWidth: 1.5,
      gap: getResponsiveSpacing("sm"),
      minWidth: 100,
      justifyContent: "center",
    },
    categoryText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      textTransform: "capitalize",
    },
  });
