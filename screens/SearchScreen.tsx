import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
  ScrollView,
  TextInput,
  SafeAreaView,
  StatusBar,
  Animated,
  Platform,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
const { useNavigation } = require("@react-navigation/native");
import type { EventData, LocationData } from "./RootStackParamList";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import EnhancedInput from "../components/EnhancedInput";
import OptimizedApiService from "../services/OptimizedApiService";
import { getShadow, hapticFeedback, debounce } from "../utils/responsive";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Advanced color palette with gradients
const COLORS = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  secondary: "#8b5cf6",
  accent: "#f59e0b",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  
  // Category colors with proper gradient format
  cafenea: ["#ff9a9e", "#fecfef"] as const,
  pub: ["#a8edea", "#fed6e3"] as const, 
  club: ["#667eea", "#764ba2"] as const,
  restaurant: ["#ffecd2", "#fcb69f"] as const,
  
  // Gradients
  backgroundGradient: ["#0f0f23", "#1a1a3a", "#2d2d5f"],
  cardGradient: ["#1e1e3f", "#2a2a5a"],
  searchGradient: ["#6366f1", "#8b5cf6"],
  
  // Neutral colors
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  
  // Additional theme colors
  background: "#f8fafc",
  backgroundDark: "#0f172a",
  surface: "#ffffff",
  surfaceDark: "#1e293b",
  text: "#1e293b",
  textDark: "#f1f5f9",
  textSecondary: "#64748b",
  textSecondaryDark: "#94a3b8",
  border: "#e2e8f0",
  borderDark: "#334155",
};

// Filter types with all categories
type FilterType = "all" | "cafenea" | "pub" | "club" | "restaurant" | "events";

// Category definitions
const CATEGORIES = [
  { 
    id: "all", 
    label: "All", 
    icon: "apps-outline", 
    iconType: "ionicon",
    gradient: ["#6366f1", "#8b5cf6"] as const,
    color: "#6366f1"
  },
  { 
    id: "cafenea", 
    label: "Cafenea", 
    icon: "storefront", 
    iconType: "ionicon",
    gradient: ["#ff9a9e", "#fecfef"] as const,
    color: "#ff9a9e"
  },
  { 
    id: "pub", 
    label: "Pub", 
    icon: "beer", 
    iconType: "ionicon",
    gradient: ["#a8edea", "#fed6e3"] as const,
    color: "#a8edea"
  },
  { 
    id: "club", 
    label: "Club", 
    icon: "musical-notes", 
    iconType: "ionicon",
    gradient: ["#667eea", "#764ba2"] as const,
    color: "#667eea"
  },
  { 
    id: "restaurant", 
    label: "Restaurant", 
    icon: "restaurant", 
    iconType: "ionicon",
    gradient: ["#ffecd2", "#fcb69f"] as const,
    color: "#ffecd2"
  },
  { 
    id: "events", 
    label: "Events", 
    icon: "calendar", 
    iconType: "ionicon",
    gradient: ["#f59e0b", "#fbbf24"] as const,
    color: "#f59e0b"
  },
];

interface SearchItem {
  id: string | number;
  type: "restaurant" | "event";
  title: string;
  subtitle?: string;
  imageUrl?: string;
  category?: string;
  date?: string;
  originalData: LocationData | EventData;
}

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  // Core state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [restaurants, setRestaurants] = useState<LocationData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const isDark = theme.name === "dark";
  const colors = isDark ? {
    background: COLORS.backgroundDark,
    surface: COLORS.surfaceDark,
    text: COLORS.textDark,
    textSecondary: COLORS.textSecondaryDark,
    border: COLORS.borderDark,
  } : {
    background: COLORS.background,
    surface: COLORS.surface,
    text: COLORS.text,
    textSecondary: COLORS.textSecondary,
    border: COLORS.border,
  };

  // Transform data into unified search items with proper category filtering
  const searchItems = useMemo((): SearchItem[] => {
    const items: SearchItem[] = [];

    // Add restaurants with category mapping
    restaurants.forEach((restaurant) => {
      let category = "restaurant"; // default
      const restaurantCategory = restaurant.category?.toLowerCase();
      
      if (restaurantCategory?.includes("cafenea") || restaurantCategory?.includes("cafe") || restaurantCategory?.includes("coffee")) {
        category = "cafenea";
      } else if (restaurantCategory?.includes("pub") || restaurantCategory?.includes("bar")) {
        category = "pub";
      } else if (restaurantCategory?.includes("club") || restaurantCategory?.includes("nightclub")) {
        category = "club";
      }

      items.push({
        id: restaurant.id,
        type: "restaurant",
        title: restaurant.name || "Restaurant",
        subtitle: restaurant.category || "Restaurant",
        imageUrl: restaurant.photoUrl || restaurant.photo,
        category: category,
        originalData: restaurant,
      });
    });

    // Add events
    events.forEach((event) => {
      items.push({
        id: event.id,
        type: "event",
        title: event.title || "Event",
        subtitle: event.address || event.city || "Event",
        imageUrl: event.photo,
        date: event.eventDate,
        originalData: event,
      });
    });

    return items;
  }, [restaurants, events]);

  // Filter items based on search query and active filter
  const filteredItems = useMemo(() => {
    let items = searchItems;

    // Apply category filter
    if (activeFilter !== "all") {
      if (activeFilter === "events") {
        items = items.filter(item => item.type === "event");
      } else {
        // Filter by restaurant category
        items = items.filter(item => 
          item.type === "restaurant" && item.category === activeFilter
        );
      }
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.subtitle?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [searchItems, activeFilter, searchQuery]);

  // Get filter counts for each category
  const filterCounts = useMemo(() => {
    const counts = {
      all: searchItems.length,
      cafenea: searchItems.filter(item => item.type === "restaurant" && item.category === "cafenea").length,
      pub: searchItems.filter(item => item.type === "restaurant" && item.category === "pub").length,
      club: searchItems.filter(item => item.type === "restaurant" && item.category === "club").length,
      restaurant: searchItems.filter(item => item.type === "restaurant" && item.category === "restaurant").length,
      events: searchItems.filter(item => item.type === "event").length,
    };
    return counts;
  }, [searchItems]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim() && query.length >= 2) {
        loadData(true, query);
      }
    }, 300),
    []
  );

  // Load data function
  const loadData = useCallback(async (reset = false, searchTerm?: string) => {
    if (loading && !reset) return;

    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const page = reset ? 1 : currentPage;
      const query = searchTerm || searchQuery;

      // Load restaurants and events in parallel
      const [restaurantsResponse, eventsResponse] = await Promise.all([
        OptimizedApiService.getLocations({ 
          page, 
          limit: 10, 
          search: query || undefined 
        }),
        OptimizedApiService.getEvents({ 
          page, 
          limit: 10, 
          search: query || undefined 
        }),
      ]);

      if (reset) {
        setRestaurants(restaurantsResponse.data || []);
        setEvents(eventsResponse.data || []);
      } else {
        setRestaurants(prev => [...prev, ...(restaurantsResponse.data || [])]);
        setEvents(prev => [...prev, ...(eventsResponse.data || [])]);
      }

      // Check if there's more data
      const hasMoreRestaurants = restaurantsResponse.pagination?.hasNext || false;
      const hasMoreEvents = eventsResponse.pagination?.hasNext || false;
      setHasMoreData(hasMoreRestaurants || hasMoreEvents);

      if (!reset) {
        setCurrentPage(prev => prev + 1);
      }

    } catch (error) {
      console.error("Error loading search data:", error);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [loading, currentPage, searchQuery]);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, []);

  // Handle search query change
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      debouncedSearch(searchQuery);
    } else if (searchQuery.trim().length === 0) {
      loadData(true);
    }
  }, [searchQuery, debouncedSearch]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [loadData]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMoreData && filteredItems.length > 0) {
      loadData(false);
    }
  }, [loadingMore, hasMoreData, filteredItems.length, loadData]);

  // Handle filter change
  const handleFilterChange = useCallback((filter: FilterType) => {
    hapticFeedback("light");
    setActiveFilter(filter);
  }, []);

  // Handle item press
  const handleItemPress = useCallback((item: SearchItem) => {
    hapticFeedback("light");
    
    if (item.type === "restaurant") {
      navigation.navigate("Info", { location: item.originalData });
    } else if (item.type === "event") {
      navigation.navigate("EventScreen", { event: item.originalData });
    }
  }, [navigation]);

  // Render filter chip
  const renderFilterChip = useCallback(({ filter, label }: { filter: FilterType; label: string }) => {
    const isActive = activeFilter === filter;
    const count = filterCounts[filter];

    return (
      <TouchableOpacity
        key={filter}
        onPress={() => handleFilterChange(filter)}
        style={[styles.filterChip, { borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={isActive ? [COLORS.primary, COLORS.primaryDark] : [colors.surface, colors.surface]}
          style={styles.filterChipGradient}
        >
          <Text style={[
            styles.filterChipText,
            { color: isActive ? COLORS.surface : colors.text }
          ]}>
            {label}
          </Text>
          {count > 0 && (
            <View style={[
              styles.countBadge,
              { backgroundColor: isActive ? COLORS.surface : COLORS.primary }
            ]}>
              <Text style={[
                styles.countText,
                { color: isActive ? COLORS.primary : COLORS.surface }
              ]}>
                {count}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [activeFilter, filterCounts, colors, handleFilterChange]);

  // Render search item
  const renderSearchItem = useCallback(({ item }: { item: SearchItem }) => (
    <TouchableOpacity
      style={[styles.searchItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ 
            uri: item.imageUrl || 'https://via.placeholder.com/100x100/e2e8f0/64748b?text=No+Image'
          }}
          style={styles.itemImage}
          defaultSource={require("../assets/default.jpg")}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.1)']}
          style={styles.imageOverlay}
        />
      </View>
      
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.typeTag, { 
            backgroundColor: item.type === "restaurant" ? COLORS.success : COLORS.accent 
          }]}>
            <Ionicons
              name={item.type === "restaurant" ? "restaurant" : "calendar"}
              size={10}
              color={COLORS.surface}
            />
            <Text style={[styles.typeText, { color: COLORS.surface }]}>
              {item.type === "restaurant" ? "Restaurant" : "Event"}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.subtitle}
        </Text>
        
        {item.date && (
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.chevronContainer}>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  ), [colors, handleItemPress]);

  // Render list footer
  const renderListFooter = useCallback(() => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.secondary]}
          style={styles.footerLoaderGradient}
        >
          <ActivityIndicator size="small" color="white" />
          <Text style={[styles.footerText, { color: "white" }]}>
            Loading more...
          </Text>
        </LinearGradient>
      </View>
    );
  }, [loadingMore]);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={isDark ? 
          ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)'] : 
          ['rgba(99, 102, 241, 0.05)', 'rgba(139, 92, 246, 0.02)']
        }
        style={styles.emptyIconContainer}
      >
        <Ionicons
          name={searchQuery ? "search" : "restaurant"}
          size={48}
          color={COLORS.primary}
        />
      </LinearGradient>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery ? "No results found" : "Discover amazing places"}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {searchQuery
          ? `No items match "${searchQuery}". Try adjusting your search.`
          : "Search for restaurants and events in your area"
        }
      </Text>
      {!searchQuery && (
        <View style={styles.emptyActions}>
          <TouchableOpacity 
            style={[styles.emptyButton, { backgroundColor: COLORS.primary }]}
            onPress={() => setActiveFilter("restaurant")}
          >
            <Ionicons name="restaurant" size={16} color="white" />
            <Text style={styles.emptyButtonText}>Browse Restaurants</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.emptyButton, { backgroundColor: COLORS.accent }]}
            onPress={() => setActiveFilter("events")}
          >
            <Ionicons name="calendar" size={16} color="white" />
            <Text style={styles.emptyButtonText}>View Events</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDark ? 
          ['#0f0f23', '#1a1a3a', '#2d2d5f'] : 
          ['#f8fafc', '#f1f5f9', '#e2e8f0']
        }
        style={styles.innerContainer}
      >
        {/* Enhanced Search Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.05)']}
            style={styles.searchContainer}
          >
            <Ionicons 
              name="search" 
              size={22} 
              color={COLORS.primary} 
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search cafenea, pub, club & more..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[
                styles.searchInput,
                {
                  color: colors.text,
                  backgroundColor: 'transparent'
                }
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Category Filter Chips */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => {
                  hapticFeedback();
                  setActiveFilter(category.id as FilterType);
                }}
                style={styles.categoryChipContainer}
              >
                <LinearGradient
                  colors={activeFilter === category.id 
                    ? category.gradient 
                    : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] as const
                  }
                  style={[
                    styles.categoryChip,
                    activeFilter === category.id && styles.categoryChipActive
                  ]}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={18}
                    color={activeFilter === category.id ? '#ffffff' : colors.textSecondary}
                    style={styles.categoryIcon}
                  />
                  <Text style={[
                    styles.categoryLabel,
                    {
                      color: activeFilter === category.id ? '#ffffff' : colors.text,
                      fontWeight: activeFilter === category.id ? '600' : '500'
                    }
                  ]}>
                    {category.label}
                  </Text>
                  {filterCounts[category.id as keyof typeof filterCounts] > 0 && (
                    <View style={[
                      styles.categoryBadge,
                      { backgroundColor: activeFilter === category.id ? 'rgba(255,255,255,0.3)' : category.color }
                    ]}>
                      <Text style={[
                        styles.categoryBadgeText,
                        { color: activeFilter === category.id ? '#ffffff' : '#ffffff' }
                      ]}>
                        {filterCounts[category.id as keyof typeof filterCounts]}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => loadData(true)} style={styles.retryButton}>
              <Text style={[styles.retryText, { color: COLORS.primary }]}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {loading && filteredItems.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading amazing places...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            renderItem={renderSearchItem}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderListFooter}
            ListEmptyComponent={renderEmptyState}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 8,
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 48,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "500",
    ...getShadow(2),
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  filtersContainer: {
    paddingVertical: 12,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  filterChipGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  countText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  searchItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    ...getShadow(3),
  },
  imageContainer: {
    position: "relative",
    marginRight: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  itemSubtitle: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.8,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  typeText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  chevronContainer: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  footerLoader: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  footerLoaderGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    maxWidth: SCREEN_WIDTH * 0.8,
    lineHeight: 22,
  },
  emptyActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    color: "#ef4444",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  // Category chip styles
  categoryChipContainer: {
    marginRight: 12,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    minHeight: 40,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChipActive: {
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  categoryIcon: {
    marginRight: 4,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: '#ffffff',
  },
});

export default SearchScreen;
