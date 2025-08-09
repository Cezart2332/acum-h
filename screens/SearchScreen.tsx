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
import LazyImage from "../components/LazyImage";
import OptimizedApiService from "../services/OptimizedApiService";
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SearchItem[]>([]);
  const [restaurants, setRestaurants] = useState<LocationData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("all");
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 20;

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
    loadData(true);
  }, []);

  // Debounced search with pagination reset
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        if (query !== searchQuery) {
          setCurrentPage(1);
          setHasMoreData(true);
          loadData(true, query);
        }
      }, 500),
    []
  );

  const loadData = async (reset: boolean = false, query: string = searchQuery) => {
    if (reset) {
      setLoading(true);
      setCurrentPage(1);
      setHasMoreData(true);
      setAllItems([]);
      setFilteredItems([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const page = reset ? 1 : currentPage;
      console.log("Loading data from production backend...");
      
      // Load data based on current filter
      let newItems: SearchItem[] = [];
      
      if (selectedFilter === "events") {
        try {
          const eventsResponse = await OptimizedApiService.getEvents({
            page,
            limit: pageSize,
            search: query,
          });
          
          const eventItems = eventsResponse.data.map((event) => ({
            id: event.id,
            title: event.title,
            subtitle: event.company,
            image: event.photo || "",
            type: "event" as const,
            address: `${event.address}, ${event.city}`,
            tags: event.tags,
            likes: event.likes,
            originalData: event,
          }));
          
          newItems = eventItems;
          setHasMoreData(eventsResponse.pagination.hasNext);
          setTotalItems(eventsResponse.pagination.total);
        } catch (error) {
          console.warn("Events API failed, using mock data:", error);
          // Fallback to mock events data
          if (reset) {
            const mockEvents = getMockEvents();
            newItems = mockEvents.map((event) => ({
              id: event.id,
              title: event.title,
              subtitle: event.company,
              image: event.photo || "",
              type: "event" as const,
              address: `${event.address}, ${event.city}`,
              tags: event.tags,
              likes: event.likes,
              originalData: event,
            }));
            setHasMoreData(false);
            setTotalItems(mockEvents.length);
          }
        }
      } else {
        try {
          // Load locations (with category filter if specified)
          const category = selectedFilter !== "all" && selectedFilter !== "restaurants" && selectedFilter !== "coffee" && selectedFilter !== "pubs" && selectedFilter !== "clubs" 
            ? selectedFilter 
            : undefined;
            
          const locationsResponse = await OptimizedApiService.getLocations({
            page,
            limit: pageSize,
            search: query,
            category,
          });
          
          const locationItems = locationsResponse.data.map((restaurant) => ({
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
          
          newItems = locationItems;
          setHasMoreData(locationsResponse.pagination.hasNext);
          setTotalItems(locationsResponse.pagination.total);
          
          // Build category filters from first page
          if (reset) {
            buildCategoryFilters(locationsResponse.data);
          }
          
          // Preload photos for visible items (background task)
          const locationIds = locationItems.map(item => item.id);
          OptimizedApiService.preloadPhotos(locationIds);
        } catch (error) {
          console.warn("Locations API failed, using mock data:", error);
          // Fallback to mock locations data
          if (reset) {
            const mockLocations = getMockRestaurants();
            newItems = mockLocations.map((restaurant) => ({
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
            setHasMoreData(false);
            setTotalItems(mockLocations.length);
            buildCategoryFilters(mockLocations);
          }
        }
      }
      
      // Filter items based on type filters (coffee, pubs, clubs)
      if (selectedFilter === "coffee" || selectedFilter === "pubs" || selectedFilter === "clubs") {
        newItems = newItems.filter(item => item.type === selectedFilter.slice(0, -1)); // Remove 's'
      }
      
      if (reset) {
        setAllItems(newItems);
        setFilteredItems(newItems);
      } else {
        setAllItems(prev => [...prev, ...newItems]);
        setFilteredItems(prev => [...prev, ...newItems]);
        setCurrentPage(prev => prev + 1);
      }
      
    } catch (error) {
      console.error("Error loading data:", error);
      if (reset) {
        // Complete fallback to mock data
        console.log("Complete API failure, falling back to mock data");
        const mockLocations = getMockRestaurants();
        const mockLocationItems = mockLocations.map((restaurant) => ({
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
        
        setAllItems(mockLocationItems);
        setFilteredItems(mockLocationItems);
        setHasMoreData(false);
        setTotalItems(mockLocationItems.length);
        buildCategoryFilters(mockLocations);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getLocationTypeFromCategory = (category: string | undefined): "restaurant" | "coffee" | "pub" | "club" => {
    if (!category) return "restaurant";
    
    const cat = category.toLowerCase();
    if (/(coffee|cafe|cafenea|caf(e|é)|espresso|coffee shop)/i.test(cat)) return "coffee";
    if (/(pub|bar|tavern|brasserie)/i.test(cat)) return "pub";
    if (/(club|nightclub|discotheque|disco)/i.test(cat)) return "club";
    return "restaurant";
  };

  // Mock data functions for fallback when API fails
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
      company: { id: 1 },
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
      company: { id: 2 },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 3,
      name: "Coffee Corner",
      address: "Str. Mărășești nr. 25, Timișoara",
      latitude: 45.7550,
      longitude: 21.2250,
      tags: ["coffee", "espresso", "latte"],
      photo: "",
      menuName: "Meniu Cafenea",
      hasMenu: true,
      category: "cafenea",
      company: { id: 3 },
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 4,
      name: "The Irish Pub",
      address: "Str. Unirii nr. 10, Timișoara",
      latitude: 45.7580,
      longitude: 21.2290,
      tags: ["beer", "irish", "pub"],
      photo: "",
      menuName: "Meniu Pub",
      hasMenu: true,
      category: "pub",
      company: { id: 4 },
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
      latitude: 45.7494,
      longitude: 21.2272,
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
      latitude: 45.7597,
      longitude: 21.2301,
    },
  ];

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

  // Helper function to get filter counts for quick filters
  const getFilterCounts = () => {
    const restaurantCount = filteredItems.filter(item => item.type === "restaurant").length;
    const coffeeCount = filteredItems.filter(item => item.type === "coffee").length;
    const pubCount = filteredItems.filter(item => item.type === "pub").length;
    const clubCount = filteredItems.filter(item => item.type === "club").length;
    const eventCount = filteredItems.filter(item => item.type === "event").length;
    
    return {
      all: filteredItems.length,
      restaurants: restaurantCount,
      coffee: coffeeCount,
      pubs: pubCount,
      clubs: clubCount,
      events: eventCount,
    };
  };

  const updateSections = (
    restaurantData: LocationData[],
    eventData: EventData[],
    query: string,
    filter: string
  ) => {
    // This function is replaced by loadData - keeping for compatibility
    console.warn("updateSections is deprecated, use loadData instead");
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleFilterChange = (filter: FilterType) => {
    hapticFeedback("light");
    setSelectedFilter(filter);
    setCurrentPage(1);
    setHasMoreData(true);
    loadData(true);
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
    OptimizedApiService.clearCache(); // Clear cache on refresh
    await loadData(true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData) {
      loadData(false);
    }
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
        <LazyImage
          locationId={item.type !== "event" ? item.id : undefined}
          defaultPhoto={item.image}
          style={styles.itemImage}
          fallbackImage={
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
        />

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
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={() => 
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={PALETTE.accent} />
                  <Text style={[styles.loadingMoreText, { color: PALETTE.textSecondary }]}>
                    Loading more...
                  </Text>
                </View>
              ) : hasMoreData ? null : (
                filteredItems.length > 0 ? (
                  <View style={styles.endOfList}>
                    <Text style={[styles.endOfListText, { color: PALETTE.textTertiary }]}>
                      You've reached the end! ({totalItems} total items)
                    </Text>
                  </View>
                ) : null
              )
            }
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
  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: getResponsiveSpacing("lg"),
    gap: getResponsiveSpacing("sm"),
  },
  loadingMoreText: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: "500",
  },
  endOfList: {
    alignItems: "center",
    paddingVertical: getResponsiveSpacing("lg"),
  },
  endOfListText: {
    fontSize: TYPOGRAPHY.bodySmall,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default SearchScreen;
