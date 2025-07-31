import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  SectionList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type {
  RootStackParamList,
  EventData,
  LocationData,
} from "./RootStackParamList";
import { BASE_URL } from "../config";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import EnhancedInput from "../components/EnhancedInput";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  getResponsiveSpacing,
  SCREEN_DIMENSIONS,
  debounce,
} from "../utils/responsive";

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

interface SearchItem {
  id: number;
  title: string;
  subtitle?: string;
  image: string;
  type: "event" | "restaurant";
  address?: string;
  tags?: string[];
  rating?: number;
  likes?: number;
  originalData: EventData | LocationData;
}

interface SearchSection {
  title: string;
  data: SearchItem[];
}

const SearchScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState<SearchSection[]>([]);
  const [restaurants, setRestaurants] = useState<LocationData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "restaurants" | "events"
  >("all");

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Load initial data
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [restaurantsData, eventsData] = await Promise.all([
        loadRestaurants(),
        loadEvents(),
      ]);

      setRestaurants(restaurantsData);
      setEvents(eventsData);
      updateSections(restaurantsData, eventsData, searchQuery, selectedFilter);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Could not load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurants = async (): Promise<LocationData[]> => {
    try {
      const response = await fetch(`${BASE_URL}/locations`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error("Failed to load restaurants");
    } catch (error) {
      console.warn("Using mock restaurant data");
      return getMockRestaurants();
    }
  };

  const loadEvents = async (): Promise<EventData[]> => {
    try {
      const response = await fetch(`${BASE_URL}/events`);
      if (response.ok) {
        return await response.json();
      }
      throw new Error("Failed to load events");
    } catch (error) {
      console.warn("Using mock event data");
      return getMockEvents();
    }
  };

  const getMockRestaurants = (): LocationData[] => [
    {
      id: 1,
      name: "La Mama",
      address: "Str. Republicii nr. 15, Timișoara",
      latitude: 45.7494,
      longitude: 21.2272,
      tags: ["traditional", "românesc", "casnic"],
      photo: "",
      category: "",
      company: {
        id: 1,
      },
      menuName: "Meniu Traditional",
      hasMenu: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      name: "Pizza Bella",
      address: "Bulevardul Revoluției nr. 42, Timișoara",
      latitude: 45.7597,
      longitude: 21.2301,
      tags: ["pizza", "italian", "autentic"],
      photo: "",
      menuName: "Meniu Italian",
      hasMenu: true,
      category: "",
      company: {
        id: 1,
      },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 3,
      name: "Sushi Zen",
      address: "Str. Eminescu nr. 8, Timișoara",
      latitude: 45.7489,
      longitude: 21.2087,
      tags: ["sushi", "japonez", "fresh"],
      photo: "",
      menuName: "Meniu Japonez",
      hasMenu: true,
      category: "",
      company: {
        id: 1,
      },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  const getMockEvents = (): EventData[] => [
    {
      id: 1,
      title: "Concert Rock în Centrul Vechi",
      description: "Seară de rock cu cele mai bune trupe locale",
      eventDate: "2024-02-15",
      startTime: "20:00",
      endTime: "23:00",
      address: "Strada Mărășești 1-3",
      city: "Timișoara",
      photo: "",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      companyId: 1,
      company: "Rock Club Timișoara",
      tags: ["rock", "muzică", "concert"],
      likes: 127,
    },
    {
      id: 2,
      title: "Festival de Artă Stradală",
      description: "Trei zile de spectacole de artă stradală",
      eventDate: "2024-02-20",
      startTime: "18:00",
      endTime: "22:00",
      address: "Piața Victoriei",
      city: "Timișoara",
      photo: "",
      isActive: true,
      createdAt: "2024-01-01T00:00:00Z",
      companyId: 2,
      company: "Primăria Timișoara",
      tags: ["artă", "festival", "stradală"],
      likes: 89,
    },
  ];

  const updateSections = (
    restaurantData: LocationData[],
    eventData: EventData[],
    query: string,
    filter: string
  ) => {
    const searchLower = query.toLowerCase();

    let filteredRestaurants = restaurantData;
    let filteredEvents = eventData;

    if (query) {
      filteredRestaurants = restaurantData.filter(
        (restaurant) =>
          restaurant.name?.toLowerCase().includes(searchLower) ||
          restaurant.category?.toLowerCase().includes(searchLower) ||
          restaurant.tags?.some((tag) =>
            tag.toLowerCase().includes(searchLower)
          )
      );

      filteredEvents = eventData.filter(
        (event) =>
          event.title.toLowerCase().includes(searchLower) ||
          event.description?.toLowerCase().includes(searchLower) ||
          event.company?.toLowerCase().includes(searchLower) ||
          event.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    const newSections: SearchSection[] = [];

    if (filter === "all" || filter === "restaurants") {
      if (filteredRestaurants.length > 0) {
        newSections.push({
          title: `🍽️ Restaurante (${filteredRestaurants.length})`,
          data: filteredRestaurants.map((restaurant) => ({
            id: restaurant.id || 0,
            title: restaurant.name || "",
            subtitle: restaurant.category,
            image: restaurant.photo || "",
            type: "restaurant" as const,
            address: restaurant.address,
            tags: restaurant.tags,
            originalData: restaurant,
          })),
        });
      }
    }

    if (filter === "all" || filter === "events") {
      if (filteredEvents.length > 0) {
        newSections.push({
          title: `🎉 Evenimente (${filteredEvents.length})`,
          data: filteredEvents.map((event) => ({
            id: event.id,
            title: event.title,
            subtitle: event.company,
            image: event.photo,
            type: "event" as const,
            likes: event.likes,
            tags: event.tags,
            originalData: event,
          })),
        });
      }
    }

    setSections(newSections);
  };

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        updateSections(restaurants, events, query, selectedFilter);
      }, 300),
    [restaurants, events, selectedFilter]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleFilterChange = (filter: "all" | "restaurants" | "events") => {
    hapticFeedback("light");
    setSelectedFilter(filter);
    updateSections(restaurants, events, searchQuery, filter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleItemPress = (item: SearchItem) => {
    hapticFeedback("medium");

    try {
      if (item.type === "event") {
        // Navigate to EventScreen with event data
        const eventData = item.originalData as EventData;
        navigation.navigate("EventScreen", { event: eventData });
      } else if (item.type === "restaurant") {
        // Navigate to Info (restaurant details) with company data
        const locationData = item.originalData as LocationData;
        navigation.navigate("Info", { location: locationData });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Could not open details. Please try again.");
    }
  };

  const renderSectionHeader = ({ section }: { section: SearchSection }) => (
    <View
      style={[styles.sectionHeader, { backgroundColor: theme.colors.surface }]}
    >
      <Text style={[styles.sectionHeaderText, { color: theme.colors.text }]}>
        {section.title}
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: SearchItem }) => (
    <TouchableOpacity
      style={[styles.itemContainer, getShadow(3)]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.9}
    >
      <View
        style={[styles.itemCard, { backgroundColor: theme.colors.surface }]}
      >
        {item.image ? (
          <Image
            source={{ uri: `data:image/jpg;base64,${item.image}` }}
            style={styles.itemImage}
          />
        ) : (
          <View
            style={[
              styles.itemImagePlaceholder,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <Ionicons
              name={
                item.type === "restaurant"
                  ? "restaurant-outline"
                  : "calendar-outline"
              }
              size={24}
              color={theme.colors.textTertiary}
            />
          </View>
        )}

        <View style={styles.itemContent}>
          <Text
            style={[styles.itemTitle, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {item.subtitle && (
            <Text
              style={[
                styles.itemSubtitle,
                { color: theme.colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          )}

          {item.address && (
            <Text
              style={[styles.itemAddress, { color: theme.colors.textTertiary }]}
              numberOfLines={1}
            >
              📍 {item.address}
            </Text>
          )}

          {item.likes && (
            <Text style={[styles.itemLikes, { color: theme.colors.accent }]}>
              👍 {item.likes} likes
            </Text>
          )}

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View
                  key={index}
                  style={[
                    styles.tag,
                    { backgroundColor: theme.colors.accentLight + "30" },
                  ]}
                >
                  <Text
                    style={[styles.tagText, { color: theme.colors.accent }]}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textTertiary}
        />
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (
    filter: "all" | "restaurants" | "events",
    title: string,
    icon: string
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && [
          styles.activeFilterButton,
          { backgroundColor: theme.colors.accent },
        ],
        { borderColor: theme.colors.border },
      ]}
      onPress={() => handleFilterChange(filter)}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={
          selectedFilter === filter
            ? theme.colors.text
            : theme.colors.textSecondary
        }
      />
      <Text
        style={[
          styles.filterButtonText,
          {
            color:
              selectedFilter === filter
                ? theme.colors.text
                : theme.colors.textSecondary,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="search-outline"
        size={64}
        color={theme.colors.textTertiary}
      />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
        {searchQuery ? "Nu am găsit rezultate" : "Începe să cauți"}
      </Text>
      <Text
        style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}
      >
        {searchQuery
          ? "Încearcă să modifici termenul de căutare"
          : "Caută restaurante și evenimente în Constanta"}
      </Text>
    </View>
  );

  return (
    <UniversalScreen safeAreaEdges={["top", "bottom"]}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Căutare
          </Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <EnhancedInput
            placeholder="Caută restaurante și evenimente..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            leftIcon="search-outline"
            style={styles.searchInput}
          />
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {renderFilterButton("all", "Toate", "apps-outline")}
          {renderFilterButton(
            "restaurants",
            "Restaurante",
            "restaurant-outline"
          )}
          {renderFilterButton("events", "Evenimente", "calendar-outline")}
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text
              style={[
                styles.loadingText,
                { color: theme.colors.textSecondary },
              ]}
            >
              Se încarcă...
            </Text>
          </View>
        ) : sections.length === 0 ? (
          renderEmptyState()
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.accent]}
                tintColor={theme.colors.accent}
                progressBackgroundColor={theme.colors.surface}
              />
            }
          />
        )}
      </Animated.View>
    </UniversalScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing("lg"),
  },
  header: {
    paddingVertical: getResponsiveSpacing("lg"),
    alignItems: "center",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  searchContainer: {
    marginBottom: getResponsiveSpacing("lg"),
  },
  searchInput: {
    marginBottom: 0,
  },
  filterContainer: {
    flexDirection: "row",
    gap: getResponsiveSpacing("sm"),
    marginBottom: getResponsiveSpacing("lg"),
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveSpacing("md"),
    paddingVertical: getResponsiveSpacing("sm"),
    borderRadius: 20,
    borderWidth: 1,
    gap: getResponsiveSpacing("xs"),
  },
  activeFilterButton: {
    ...getShadow(2),
  },
  filterButtonText: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: getResponsiveSpacing("md"),
  },
  loadingText: {
    fontSize: TYPOGRAPHY.body,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: getResponsiveSpacing("xl"),
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.h4,
    fontWeight: "700",
    marginTop: getResponsiveSpacing("lg"),
    marginBottom: getResponsiveSpacing("sm"),
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.body,
    textAlign: "center",
    lineHeight: TYPOGRAPHY.body * 1.4,
  },
  sectionHeader: {
    paddingVertical: getResponsiveSpacing("md"),
    paddingHorizontal: getResponsiveSpacing("md"),
    borderRadius: 12,
    marginBottom: getResponsiveSpacing("sm"),
    marginTop: getResponsiveSpacing("lg"),
  },
  sectionHeaderText: {
    fontSize: TYPOGRAPHY.h6,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: getResponsiveSpacing("xxl"),
  },
  itemContainer: {
    marginBottom: getResponsiveSpacing("md"),
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: getResponsiveSpacing("md"),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  itemContent: {
    flex: 1,
    marginLeft: getResponsiveSpacing("md"),
    gap: getResponsiveSpacing("xs"),
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    lineHeight: TYPOGRAPHY.body * 1.3,
  },
  itemSubtitle: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: "500",
  },
  itemAddress: {
    fontSize: TYPOGRAPHY.caption,
  },
  itemLikes: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "600",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: getResponsiveSpacing("xs"),
    marginTop: getResponsiveSpacing("xs"),
  },
  tag: {
    paddingHorizontal: getResponsiveSpacing("sm"),
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: {
    fontSize: TYPOGRAPHY.tiny,
    fontWeight: "500",
  },
});

export default SearchScreen;
