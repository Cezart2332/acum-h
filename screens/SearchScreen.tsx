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
  FlatList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Alert,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
// Using require to avoid ESM/CommonJS interop issues in this configuration
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useNavigation } = require("@react-navigation/native");
// Type import removed due to module system constraints; falling back to any.
// import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
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

// Enhanced dark violet palette with more gradients
const PALETTE = {
  black: "#0A0A0F",
  blackSoft: "#121218",
  surface: "#1A1A24",
  surfaceElevated: "#232330",
  surfaceHover: "#2A2A3A",
  border: "#3A3A4A",
  borderLight: "#4A4A5A",
  accent: "#7C5DFF",
  accentBright: "#9575FF", 
  accentLight: "#B39DFF",
  accentSoft: "#4A3B7A",
  accentGlow: "#7C5DFF40",
  text: "#FFFFFF",
  textPrimary: "#F8F9FA",
  textSecondary: "#C8CDD8",
  textTertiary: "#8B92A8",
  textMuted: "#5A6270",
  success: "#00E676",
  warning: "#FFB74D",
  danger: "#FF5252",
  info: "#40C4FF",
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Filter types
type FilterType = "all" | "restaurants" | "coffee" | "pubs" | "clubs" | "events" | string;

interface CategoryFilter {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// Fallback type alias (suppressed) until ESM config fixed
type SearchScreenNavigationProp = any;

interface SearchItem {
  id: number;
  title: string;
  subtitle?: string;
  image: string;
  type: "event" | "restaurant" | "coffee" | "pub" | "club";
  address?: string;
  tags?: string[];
  rating?: number;
  likes?: number;
  category?: string;
  originalData: EventData | LocationData;
}

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>([]);
  const [restaurants, setRestaurants] = useState<LocationData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const filterAnim = useRef(new Animated.Value(0)).current;

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
      
      // Transform data into unified search items
      const allSearchItems = transformDataToSearchItems(restaurantsData, eventsData);
      setAllItems(allSearchItems);
      
      // Build category filters
      buildCategoryFilters(restaurantsData);
      
      // Apply initial filtering
      applyFilters(allSearchItems, searchQuery, selectedFilter);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Could not load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const transformDataToSearchItems = (
    restaurantsData: LocationData[],
    eventsData: EventData[]
  ): SearchItem[] => {
    const coffeePredicate = (cat: string | undefined) =>
      !!cat && /(coffee|cafe|cafenea|caf(e|é)|espresso|coffee shop)/i.test(cat);
    
    const pubPredicate = (cat: string | undefined) =>
      !!cat && /(pub|bar|tavern|brasserie)/i.test(cat);
    
    const clubPredicate = (cat: string | undefined) =>
      !!cat && /(club|nightclub|discotheque|disco)/i.test(cat);

    const getLocationTypeFromCategory = (category: string | undefined): "restaurant" | "coffee" | "pub" | "club" => {
      if (coffeePredicate(category)) return "coffee";
      if (pubPredicate(category)) return "pub";
      if (clubPredicate(category)) return "club";
      return "restaurant";
    };

    const restaurantItems: SearchItem[] = restaurantsData.map((restaurant) => ({
      id: restaurant.id || 0,
      title: restaurant.name || "",
      subtitle: restaurant.category,
      image: restaurant.photo || "",
      type: getLocationTypeFromCategory(restaurant.category),
      address: restaurant.address,
      tags: restaurant.tags,
      category: restaurant.category,
      originalData: restaurant,
    }));

    const eventItems: SearchItem[] = eventsData.map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: event.company,
      image: event.photo,
      type: "event" as const,
      address: `${event.address}, ${event.city}`,
      tags: event.tags,
      likes: event.likes,
      originalData: event,
    }));

    return [...restaurantItems, ...eventItems];
  };

  const buildCategoryFilters = (restaurantsData: LocationData[]) => {
    const categoryMap = new Map<string, number>();
    
    // Count items by category
    restaurantsData.forEach((restaurant) => {
      const category = (restaurant.category || "").trim();
      if (category) {
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      }
    });

    // Create filter objects
    const filters: CategoryFilter[] = Array.from(categoryMap.entries())
      .map(([name, count]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        icon: getCategoryIcon(name),
        count,
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    setCategoryFilters(filters);
  };

  const getCategoryIcon = (category: string): string => {
    const cat = category.toLowerCase();
    if (/(coffee|cafe|cafenea|espresso)/i.test(cat)) return "cafe-outline";
    if (/(pizza|italian)/i.test(cat)) return "pizza-outline";
    if (/(sushi|japonez)/i.test(cat)) return "fish-outline";
    if (/(traditional|românesc)/i.test(cat)) return "home-outline";
    if (/(fast|burger)/i.test(cat)) return "fast-food-outline";
    if (/(pub|bar|tavern|brasserie)/i.test(cat)) return "wine-outline";
    if (/(club|nightclub|discotheque|disco)/i.test(cat)) return "musical-notes-outline";
    return "restaurant-outline";
  };

  const applyFilters = (
    items: SearchItem[],
    query: string,
    filter: FilterType
  ) => {
    let filtered = [...items];
    
    // Apply search query
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.subtitle?.toLowerCase().includes(searchLower) ||
        item.address?.toLowerCase().includes(searchLower) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply type/category filter
    if (filter !== "all") {
      if (filter === "restaurants") {
        filtered = filtered.filter((item) => item.type === "restaurant");
      } else if (filter === "coffee") {
        filtered = filtered.filter((item) => item.type === "coffee");
      } else if (filter === "pubs") {
        filtered = filtered.filter((item) => item.type === "pub");
      } else if (filter === "clubs") {
        filtered = filtered.filter((item) => item.type === "club");
      } else if (filter === "events") {
        filtered = filtered.filter((item) => item.type === "event");
      } else {
        // Category filter
        filtered = filtered.filter((item) => 
          item.category?.toLowerCase() === filter.toLowerCase()
        );
      }
    }

    setFilteredItems(filtered);
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
      category: "restaurant",
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
      category: "restaurant",
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
      category: "restaurant",
      company: {
        id: 1,
      },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 4,
      name: "Coffee Corner",
      address: "Str. Mărășești nr. 25, Timișoara",
      latitude: 45.7550,
      longitude: 21.2250,
      tags: ["coffee", "espresso", "latte"],
      photo: "",
      menuName: "Meniu Cafenea",
      hasMenu: true,
      category: "cafenea",
      company: {
        id: 2,
      },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 5,
      name: "The Irish Pub",
      address: "Str. Unirii nr. 10, Timișoara",
      latitude: 45.7580,
      longitude: 21.2290,
      tags: ["beer", "irish", "pub"],
      photo: "",
      menuName: "Meniu Pub",
      hasMenu: true,
      category: "pub",
      company: {
        id: 3,
      },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 6,
      name: "Club Euphoria",
      address: "Str. Victoriei nr. 55, Timișoara",
      latitude: 45.7600,
      longitude: 21.2310,
      tags: ["club", "dancing", "nightlife"],
      photo: "",
      menuName: "Meniu Bar",
      hasMenu: false,
      category: "club",
      company: {
        id: 4,
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
    // This function is replaced by applyFilters - keeping for compatibility
    console.warn("updateSections is deprecated, use applyFilters instead");
  };

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        applyFilters(allItems, query, selectedFilter);
      }, 300),
    [allItems, selectedFilter]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleFilterChange = (filter: FilterType) => {
    hapticFeedback("light");
    setSelectedFilter(filter);
    applyFilters(allItems, searchQuery, filter);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
    Animated.timing(filterAnim, {
      toValue: showFilters ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
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
        const eventData = item.originalData as EventData;
        navigation.navigate("EventScreen", { event: eventData });
      } else {
        const locationData = item.originalData as LocationData;
        navigation.navigate("Info", { location: locationData });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Could not open details. Please try again.");
    }
  };

  const renderQuickFilter = (
    filter: FilterType,
    title: string,
    icon: string,
    count?: number
  ) => {
    const isSelected = selectedFilter === filter;
    return (
      <TouchableOpacity
        style={[
          styles.quickFilter,
          isSelected && styles.quickFilterActive,
        ]}
        onPress={() => handleFilterChange(filter)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={
            isSelected
              ? [PALETTE.accent, PALETTE.accentBright]
              : [PALETTE.surface, PALETTE.surfaceElevated]
          }
          style={styles.quickFilterGradient}
        >
          <Ionicons
            name={icon as any}
            size={20}
            color={isSelected ? PALETTE.text : PALETTE.textSecondary}
          />
          <Text
            style={[
              styles.quickFilterText,
              { color: isSelected ? PALETTE.text : PALETTE.textSecondary },
            ]}
          >
            {title}
          </Text>
          {count !== undefined && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderCategoryFilter = (category: CategoryFilter) => {
    const isSelected = selectedFilter === category.name;
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryFilter,
          isSelected && styles.categoryFilterActive,
        ]}
        onPress={() => handleFilterChange(category.name)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={category.icon as any}
          size={18}
          color={isSelected ? PALETTE.text : PALETTE.textTertiary}
        />
        <Text
          style={[
            styles.categoryFilterText,
            { color: isSelected ? PALETTE.text : PALETTE.textSecondary },
          ]}
        >
          {category.name}
        </Text>
        <View style={styles.categoryCount}>
          <Text style={styles.categoryCountText}>{category.count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }: { item: SearchItem }) => (
    <TouchableOpacity
      style={[styles.itemContainer, getShadow(3)]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[PALETTE.surface, PALETTE.surfaceElevated]}
        style={styles.itemCard}
      >
        {item.image ? (
          <Image
            source={{ uri: `data:image/jpg;base64,${item.image}` }}
            style={styles.itemImage}
          />
        ) : (
          <LinearGradient
            colors={[PALETTE.borderLight, PALETTE.border]}
            style={styles.itemImagePlaceholder}
          >
            <Ionicons
              name={
                item.type === "restaurant"
                  ? "restaurant-outline"
                  : item.type === "coffee"
                  ? "cafe-outline"
                  : item.type === "pub"
                  ? "wine-outline"
                  : item.type === "club"
                  ? "musical-notes-outline"
                  : "calendar-outline"
              }
              size={24}
              color={PALETTE.textTertiary}
            />
          </LinearGradient>
        )}

        <View style={styles.itemContent}>
          <Text
            style={[styles.itemTitle, { color: PALETTE.textPrimary }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {item.subtitle && (
            <Text
              style={[
                styles.itemSubtitle,
                { color: PALETTE.textSecondary },
              ]}
              numberOfLines={1}
            >
              {item.subtitle}
            </Text>
          )}

          {item.address && (
            <Text
              style={[styles.itemAddress, { color: PALETTE.textTertiary }]}
              numberOfLines={1}
            >
              📍 {item.address}
            </Text>
          )}

          {item.likes && (
            <Text style={[styles.itemLikes, { color: PALETTE.accent }]}> 
              👍 {item.likes} likes
            </Text>
          )}

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <LinearGradient
                  key={index}
                  colors={[PALETTE.accentSoft, PALETTE.accentGlow]}
                  style={styles.tag}
                >
                  <Text style={[styles.tagText, { color: PALETTE.accentLight }]}>
                    {tag}
                  </Text>
                </LinearGradient>
              ))}
            </View>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={PALETTE.textTertiary}
        />
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderFilterButton = (
    filter: FilterType,
    title: string,
    icon?: string
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { borderColor: PALETTE.border },
        selectedFilter === filter && [
          styles.activeFilterButton,
          { backgroundColor: PALETTE.accent },
        ],
      ]}
      onPress={() => handleFilterChange(filter)}
      activeOpacity={0.85}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={18}
          color={
            selectedFilter === filter ? PALETTE.text : PALETTE.textSecondary
          }
        />
      )}
      <Text
        style={[
          styles.filterButtonText,
          {
            color:
              selectedFilter === filter ? PALETTE.text : PALETTE.textSecondary,
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={[PALETTE.surface, PALETTE.surfaceElevated]}
        style={styles.emptyStateCard}
      >
        <Ionicons
          name="search-outline"
          size={64}
          color={PALETTE.textTertiary}
        />
        <Text style={[styles.emptyStateTitle, { color: PALETTE.textPrimary }]}>
          {searchQuery ? "Nu am găsit rezultate" : "Începe să cauți"}
        </Text>
        <Text
          style={[styles.emptyStateText, { color: PALETTE.textSecondary }]}
        >
          {searchQuery
            ? "Încearcă să modifici termenul de căutare"
            : "Caută restaurante și evenimente în Constanta"}
        </Text>
      </LinearGradient>
    </View>
  );

  const getFilterCounts = () => {
    const restaurants = allItems.filter((item) => item.type === "restaurant").length;
    const coffee = allItems.filter((item) => item.type === "coffee").length;
    const pubs = allItems.filter((item) => item.type === "pub").length;
    const clubs = allItems.filter((item) => item.type === "club").length;
    const events = allItems.filter((item) => item.type === "event").length;
    return { restaurants, coffee, pubs, clubs, events, all: allItems.length };
  };

  const counts = getFilterCounts();

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
        <LinearGradient
          colors={[PALETTE.black, PALETTE.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Text style={[styles.headerTitle, { color: PALETTE.textPrimary }]}>
            Căutare
          </Text>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={toggleFilters}
            activeOpacity={0.8}
          >
            <Ionicons
              name={showFilters ? "filter" : "filter-outline"}
              size={24}
              color={PALETTE.accent}
            />
          </TouchableOpacity>
        </LinearGradient>

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

        {/* Quick Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContainer}
        >
          {renderQuickFilter("all", "Toate", "apps-outline", counts.all)}
          {renderQuickFilter("restaurants", "Restaurante", "restaurant-outline", counts.restaurants)}
          {renderQuickFilter("coffee", "Cafenele", "cafe-outline", counts.coffee)}
          {renderQuickFilter("pubs", "Pub-uri", "wine-outline", counts.pubs)}
          {renderQuickFilter("clubs", "Club-uri", "musical-notes-outline", counts.clubs)}
          {renderQuickFilter("events", "Evenimente", "calendar-outline", counts.events)}
        </ScrollView>

        {/* Category Filters */}
        <Animated.View
          style={[
            styles.categoryFiltersContainer,
            {
              opacity: filterAnim,
              transform: [
                {
                  translateY: filterAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {showFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFilters}
            >
              {categoryFilters.map(renderCategoryFilter)}
            </ScrollView>
          )}
        </Animated.View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PALETTE.accent} />
            <Text
              style={[
                styles.loadingText,
                { color: PALETTE.textSecondary },
              ]}
            >
              Se încarcă...
            </Text>
          </View>
        ) : filteredItems.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[PALETTE.accent]}
                tintColor={PALETTE.accent}
                progressBackgroundColor={PALETTE.surface}
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
    backgroundColor: PALETTE.black,
  },
  header: {
    paddingVertical: getResponsiveSpacing("lg"),
    paddingHorizontal: getResponsiveSpacing("md"),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: getResponsiveSpacing("md"),
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  filterToggle: {
    padding: getResponsiveSpacing("sm"),
    borderRadius: 12,
    backgroundColor: PALETTE.surfaceElevated,
  },
  searchContainer: {
    marginBottom: getResponsiveSpacing("lg"),
  },
  searchInput: {
    marginBottom: 0,
  },
  quickFiltersContainer: {
    paddingHorizontal: getResponsiveSpacing("sm"),
    gap: getResponsiveSpacing("sm"),
    marginBottom: getResponsiveSpacing("md"),
  },
  quickFilter: {
    minWidth: 120,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: getResponsiveSpacing("sm"),
  },
  quickFilterActive: {
    ...getShadow(4),
    shadowColor: PALETTE.accent,
  },
  quickFilterGradient: {
    paddingVertical: getResponsiveSpacing("md"),
    paddingHorizontal: getResponsiveSpacing("sm"),
    alignItems: "center",
    gap: getResponsiveSpacing("xs"),
  },
  quickFilterText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    textAlign: "center",
  },
  countBadge: {
    backgroundColor: PALETTE.accentGlow,
    paddingHorizontal: getResponsiveSpacing("xs"),
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  countText: {
    fontSize: TYPOGRAPHY.tiny,
    fontWeight: "700",
    color: PALETTE.text,
  },
  categoryFiltersContainer: {
    marginBottom: getResponsiveSpacing("lg"),
  },
  categoryFilters: {
    paddingHorizontal: getResponsiveSpacing("sm"),
    gap: getResponsiveSpacing("sm"),
  },
  categoryFilter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: getResponsiveSpacing("md"),
    paddingVertical: getResponsiveSpacing("sm"),
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: PALETTE.border,
    backgroundColor: PALETTE.surface,
    gap: getResponsiveSpacing("xs"),
  },
  categoryFilterActive: {
    backgroundColor: PALETTE.accent,
    borderColor: PALETTE.accentBright,
    ...getShadow(2),
    shadowColor: PALETTE.accent,
  },
  categoryFilterText: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: "600",
  },
  categoryCount: {
    backgroundColor: PALETTE.borderLight,
    paddingHorizontal: getResponsiveSpacing("xs"),
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
  },
  categoryCountText: {
    fontSize: TYPOGRAPHY.tiny,
    fontWeight: "700",
    color: PALETTE.textMuted,
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
  emptyStateCard: {
    padding: getResponsiveSpacing("xl"),
    borderRadius: 24,
    alignItems: "center",
    gap: getResponsiveSpacing("md"),
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.h4,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.body,
    textAlign: "center",
    lineHeight: TYPOGRAPHY.body * 1.4,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.borderLight,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  itemImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
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
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  tagText: {
    fontSize: TYPOGRAPHY.tiny,
    fontWeight: "600",
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
    backgroundColor: PALETTE.surface,
  },
  activeFilterButton: {
    ...getShadow(2),
    shadowColor: PALETTE.accent,
  },
  filterButtonText: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: "600",
  },
});

export default SearchScreen;
