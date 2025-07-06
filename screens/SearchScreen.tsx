import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  SectionList,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import BASE_URL from "../config";

interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: string;
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
  tags?: string[];
  latitude?: number;
  longitude?: number;
}

// Unified interface for section list items
interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  type: 'event' | 'restaurant';
  address?: string;
  tags?: string[];
  rating?: number;
  likes?: number;
  originalData: EventData | CompanyData;
}

interface SearchSection {
  title: string;
  data: SearchItem[];
}

const { width } = Dimensions.get('window');

// Mock data for when backend is unavailable
const getMockRestaurants = (): CompanyData[] => [
  {
    id: 1,
    name: "La Mama",
    category: "Românesc",
    address: "Str. Republicii nr. 15, Timișoara",
    description: "Restaurant traditional românesc cu mâncăruri casnice delicioase, preparat cu ingrediente proaspete",
    email: "contact@lamama.ro",
    profileImage: "",
    tags: ["traditional", "românesc", "casnic", "proaspăt"],
    latitude: 45.7494,
    longitude: 21.2272,
    cui: 12345678
  },
  {
    id: 2,
    name: "Pizza Bella",
    category: "Italian",
    address: "Bulevardul Revoluției nr. 42, Timișoara",
    description: "Pizzerie autentică cu ingrediente proaspete aduse din Italia, aluat făcut în casă",
    email: "info@pizzabella.ro",
    profileImage: "",
    tags: ["pizza", "italian", "proaspăt", "autentic"],
    latitude: 45.7578,
    longitude: 21.2270,
    cui: 87654321
  },
  {
    id: 3,
    name: "Sushi Zen",
    category: "Japonez",
    address: "Str. Eminescu nr. 8, Timișoara",
    description: "Restaurant japonez cu sushi proaspăt pregătit de maeștri japonezi",
    email: "contact@sushizen.ro",
    profileImage: "",
    tags: ["sushi", "japonez", "fresh", "autentic"],
    latitude: 45.7528,
    longitude: 21.2285,
    cui: 11223344
  },
  {
    id: 4,
    name: "Bistro Central",
    category: "Internațional",
    address: "Piața Victoriei nr. 2, Timișoara",
    description: "Bistro modern cu bucătărie internațională și atmosferă elegantă",
    email: "info@bistrocentral.ro",
    profileImage: "",
    tags: ["bistro", "modern", "elegant", "internațional"],
    latitude: 45.7575,
    longitude: 21.2298,
    cui: 22334455
  },
  {
    id: 5,
    name: "Casa Bunicii",
    category: "Românesc",
    address: "Str. Aleea Studentilor nr. 12, Timișoara",
    description: "Mâncare tradițională românească ca la bunica acasă",
    email: "contact@casabunicii.ro",
    profileImage: "",
    tags: ["tradițional", "casnic", "românesc", "nostalgie"],
    latitude: 45.7466,
    longitude: 21.2371,
    cui: 33445566
  }
];

const getMockEvents = (): EventData[] => [
  {
    id: "1",
    title: "Concert Rock în Centrul Vechi",
    description: "Seară de rock cu cele mai bune trupe locale din Timișoara",
    company: "Rock Club Timișoara",
    photo: "",
    tags: ["rock", "muzică", "concert", "live"],
    likes: 127
  },
  {
    id: "2", 
    title: "Festival de Artă Stradală",
    description: "Trei zile de spectacole de artă stradală și performanțe creative",
    company: "Primăria Timișoara",
    photo: "",
    tags: ["artă", "festival", "stradal", "spectacol"],
    likes: 89
  },
  {
    id: "3",
    title: "Noaptea Muzeelor",
    description: "Intrare gratuită la toate muzeele din oraș până la miezul nopții",
    company: "Consiliul Județean Timiș",
    photo: "",
    tags: ["muzee", "cultură", "gratuit", "noapte"],
    likes: 203
  },
  {
    id: "4",
    title: "Târgul de Craciun",
    description: "Târg tradițional cu produse locale și vin fiert",
    company: "Centrul de Evenimente Timișoara",
    photo: "",
    tags: ["craciun", "târg", "tradițional", "local"],
    likes: 156
  },
  {
    id: "5",
    title: "Concurs de Tango Argentinian",
    description: "Competiție de dans tango cu participanți din toată țara",
    company: "Club de Dans Timișoara",
    photo: "",
    tags: ["dans", "tango", "competiție", "argentinian"],
    likes: 78
  }
];

export default function SearchScreen({ navigation }: { navigation: any }) {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventData[]>([]);
  const [restaurants, setRestaurants] = useState<CompanyData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.95);

  // Memoized filter functions for better performance
  const filteredEvents = useMemo(() => {
    if (!query.trim()) return events.slice(0, 10); // Show first 10 when no query
    
    return events.filter((e) =>
      e.title?.toLowerCase().includes(query.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(query.toLowerCase())) ||
      (e.company && e.company.toLowerCase().includes(query.toLowerCase())) ||
      (e.tags && e.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
  }, [events, query]);

  const filteredRestaurants = useMemo(() => {
    if (!query.trim()) return restaurants.slice(0, 10); // Show first 10 when no query
    
    return restaurants.filter((r) =>
      (r.name && r.name.toLowerCase().includes(query.toLowerCase())) ||
      (r.category && r.category.toLowerCase().includes(query.toLowerCase())) ||
      (r.address && r.address.toLowerCase().includes(query.toLowerCase())) ||
      (r.description && r.description.toLowerCase().includes(query.toLowerCase())) ||
      (r.tags && r.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
  }, [restaurants, query]);

  const startAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const fetchData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setDataLoading(true);
      setError(null);

      console.log('Fetching data from:', BASE_URL);

      // Add timeout for better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const fetchOptions = {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      };

      try {
        // Try to fetch from backend first
        const [eventsResponse, companiesResponse] = await Promise.allSettled([
          fetch(`${BASE_URL}/events`, fetchOptions),
          fetch(`${BASE_URL}/companies`, fetchOptions),
        ]);

        clearTimeout(timeoutId);

        let backendWorking = false;
        
        // Process events
        let eventsData: EventData[] = [];
        if (eventsResponse.status === 'fulfilled' && eventsResponse.value.ok) {
          try {
            eventsData = await eventsResponse.value.json();
            console.log('Events loaded from backend:', eventsData.length);
            backendWorking = true;
          } catch (e) {
            console.warn('Events JSON parse error:', e);
          }
        }

        // Process companies  
        let companiesData: CompanyData[] = [];
        if (companiesResponse.status === 'fulfilled' && companiesResponse.value.ok) {
          try {
            companiesData = await companiesResponse.value.json();
            console.log('Companies loaded from backend:', companiesData.length);
            backendWorking = true;
          } catch (e) {
            console.warn('Companies JSON parse error:', e);
          }
        }

        // If backend failed, use mock data
        if (!backendWorking) {
          console.log('Backend unavailable, using mock data');
          eventsData = getMockEvents();
          companiesData = getMockRestaurants();
          setBackendAvailable(false);
          setError("Backend nu este disponibil. Se afișează date demonstrative.");
        } else {
          setBackendAvailable(true);
        }

        // Ensure data is arrays
        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setRestaurants(Array.isArray(companiesData) ? companiesData : []);

      } catch (fetchError) {
        // On any fetch error, fall back to mock data
        console.log('Fetch failed, using mock data:', fetchError);
        setEvents(getMockEvents());
        setRestaurants(getMockRestaurants());
        setBackendAvailable(false);
        setError("Nu s-a putut conecta la server. Se afișează date demonstrative.");
      }

    } catch (err) {
      console.error("General fetch error:", err);
      // Final fallback to mock data
      setEvents(getMockEvents());
      setRestaurants(getMockRestaurants());
      setBackendAvailable(false);
      setError("Eroare de conectare. Se afișează date demonstrative.");
    } finally {
      setDataLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    startAnimations();
    fetchData();
  }, [startAnimations, fetchData]);

  // Convert data to unified format with better error handling
  const convertEventsToSearchItems = useCallback((events: EventData[]): SearchItem[] => {
    return events.map(event => ({
      id: event.id || `event-${Math.random()}`,
      title: event.title || 'Eveniment fără titlu',
      subtitle: event.description || event.company || '',
      image: event.photo || '',
      type: 'event' as const,
      tags: event.tags || [],
      likes: event.likes || 0,
      originalData: event,
    }));
  }, []);

  const convertRestaurantsToSearchItems = useCallback((restaurants: CompanyData[]): SearchItem[] => {
    return restaurants.map(restaurant => ({
      id: restaurant.id?.toString() || `restaurant-${Math.random()}`,
      title: restaurant.name || 'Restaurant fără nume',
      subtitle: restaurant.category || restaurant.description || '',
      image: restaurant.profileImage || '',
      type: 'restaurant' as const,
      address: restaurant.address,
      tags: restaurant.tags || [],
      rating: 4.5, // Default rating since it's not in the backend
      originalData: restaurant,
    }));
  }, []);

  const handleItemPress = useCallback((item: SearchItem) => {
    if (!navigation) {
      Alert.alert("Info", "Navigarea nu este disponibilă momentan");
      return;
    }
    
    try {
      if (item.type === 'event') {
        navigation.navigate("EventScreen", { event: item.originalData });
      } else {
        navigation.navigate("Info", { company: item.originalData });
      }
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Eroare", "Nu s-a putut naviga la această secțiune");
    }
  }, [navigation]);

  const sections: SearchSection[] = useMemo(() => {
    const eventItems = convertEventsToSearchItems(filteredEvents);
    const restaurantItems = convertRestaurantsToSearchItems(filteredRestaurants);

    return [
      { 
        title: "Evenimente", 
        data: eventItems
      },
      { 
        title: "Restaurante", 
        data: restaurantItems
      },
    ].filter(section => section.data.length > 0); // Only show sections with data
  }, [filteredEvents, filteredRestaurants, convertEventsToSearchItems, convertRestaurantsToSearchItems]);

  const EmptyResults = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['rgba(108, 58, 255, 0.1)', 'rgba(155, 89, 182, 0.1)']}
        style={styles.emptyGradient}
      >
        <Ionicons 
          name={dataLoading ? "hourglass-outline" : error ? "information-circle-outline" : "search-outline"} 
          size={64} 
          color="#6C3AFF" 
        />
        <Text style={styles.emptyTitle}>
          {dataLoading ? "Încărcăm datele..." : 
           error ? "Mod demonstrativ" :
           query ? "Nu am găsit rezultate" : "Începe să cauți"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {dataLoading ? "Te rugăm să aștepți..." :
           error ? "Datele afișate sunt demonstrative până se conectează backend-ul" :
           query ? "Încearcă să cauți cu alți termeni" : 
           "Caută evenimente sau restaurante"}
        </Text>
        {dataLoading && (
          <ActivityIndicator 
            size="large" 
            color="#6C3AFF" 
            style={{ marginTop: 20 }}
          />
        )}
        {error && !backendAvailable && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchData()}
          >
            <Text style={styles.retryButtonText}>Încearcă conectarea din nou</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );

  const renderItem = useCallback(({ item }: { item: SearchItem }) => (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardImageContainer}>
          {item.image ? (
            <Image
              source={{
                uri: item.image.startsWith('data:') ? item.image : `data:image/jpg;base64,${item.image}`,
              }}
              style={styles.cardImage}
              defaultSource={require('../assets/default.jpg')}
              onError={() => {
                console.log('Image load error for:', item.title);
              }}
            />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Ionicons 
                name={item.type === 'event' ? "calendar" : "restaurant"} 
                size={32} 
                color="#6C3AFF" 
              />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(15,8,23,0.8)']}
            style={styles.cardImageOverlay}
          />
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          {item.subtitle && (
            <Text style={styles.cardSubtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>
          )}

          {item.type === 'restaurant' && item.address && (
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={14} color="#A78BFA" />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

          {item.type === 'event' && item.likes !== undefined && (
            <View style={styles.likesContainer}>
              <Ionicons name="heart-outline" size={14} color="#FF6B9D" />
              <Text style={styles.likesText}>
                {item.likes} like{item.likes !== 1 ? '-uri' : ''}
              </Text>
            </View>
          )}

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 2).map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {item.tags.length > 2 && (
                <Text style={styles.moreTagsText}>
                  +{item.tags.length - 2}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.cardAction}>
          <LinearGradient
            colors={['#6C3AFF', '#9B59B6']}
            style={styles.actionButton}
          >
            <Ionicons 
              name={item.type === 'event' ? "calendar" : "restaurant"} 
              size={20} 
              color="#FFFFFF" 
            />
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  ), [fadeAnim, handleItemPress]);

  const hasResults = sections.length > 0 && sections.some(section => section.data.length > 0);
  const totalResults = sections.reduce((sum, section) => sum + section.data.length, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0817" />
      
      {/* Header with gradient */}
      <LinearGradient
        colors={['#0F0817', '#1A1A1A']}
        style={styles.headerGradient}
      >
        <Animated.View 
          style={[
            styles.searchContainer,
            { 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={[
            styles.searchBox,
            searchFocused && styles.searchBoxFocused
          ]}>
            <Ionicons 
              name="search-outline" 
              size={24} 
              color={searchFocused ? "#6C3AFF" : "#6B7280"} 
            />
            <TextInput
              style={styles.input}
              placeholder="Caută evenimente sau restaurante..."
              placeholderTextColor="#6B7280"
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
          
          {(query.length > 0 || hasResults) && (
            <View style={styles.resultsInfo}>
              <Text style={styles.resultsCount}>
                {totalResults} rezultate găsite
                {!backendAvailable && " (demo)"}
              </Text>
              {dataLoading && (
                <ActivityIndicator size="small" color="#A78BFA" style={{ marginLeft: 10 }} />
              )}
            </View>
          )}
          
          {error && (
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={16} color="#F59E0B" />
              <Text style={styles.warningText}>{error}</Text>
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      {/* Content Area */}
      {!hasResults ? (
        <EmptyResults />
      ) : (
        <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
          <SectionList<SearchItem>
            sections={sections}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            renderSectionHeader={({ section: { title, data } }) => (
              <View style={styles.sectionHeaderContainer}>
                <LinearGradient
                  colors={['#6C3AFF', '#9B59B6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sectionHeaderGradient}
                >
                  <Text style={styles.sectionHeader}>{title}</Text>
                  <Text style={styles.sectionCount}>{data.length}</Text>
                </LinearGradient>
              </View>
            )}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchData(true)}
                colors={['#6C3AFF']}
                tintColor="#6C3AFF"
              />
            }
            initialNumToRender={6}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 120,
              offset: 120 * index,
              index,
            })}
          />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0817",
  },
  headerGradient: {
    paddingBottom: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    height: 60,
  },
  searchBoxFocused: {
    borderColor: "#6C3AFF",
    shadowOpacity: 0.3,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    height: 60,
    marginLeft: 12,
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: "#A78BFA",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    width: "100%",
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: "#A78BFA",
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#6C3AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
  },
  sectionHeaderContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionHeaderGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listContent: {
    paddingBottom: 32,
  },
  cardWrapper: {
    marginHorizontal: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#2A1A4A",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardImageContainer: {
    width: 100,
    height: 100,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2A1A4A",
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#A78BFA",
    marginTop: 4,
    lineHeight: 20,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  addressText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#C4B5FD",
    flex: 1,
  },
  likesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  likesText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#FF6B9D",
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#2A1A4A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#6C3AFF",
  },
  tagText: {
    fontSize: 10,
    color: "#C4B5FD",
    fontWeight: "500",
  },
  moreTagsText: {
    fontSize: 10,
    color: "#A78BFA",
    fontWeight: "500",
  },
  cardAction: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  separator: {
    height: 12,
    backgroundColor: "transparent",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderTopWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#92400E",
    fontWeight: "600",
  },
});