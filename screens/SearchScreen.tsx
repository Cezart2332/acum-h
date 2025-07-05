import React, { useEffect, useState } from "react";
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
  originalData: EventData | CompanyData;
}

interface SearchSection {
  title: string;
  data: SearchItem[];
}

const { width } = Dimensions.get('window');

export default function SearchScreen({ navigation }: { navigation?: any }) {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventData[]>([]);
  const [restaurants, setRestaurants] = useState<CompanyData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.95);

  useEffect(() => {
    // Start animations immediately
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
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

    // Load data in background with timeout
    const fetchData = async () => {
      try {
        // Set a timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const fetchPromise = Promise.all([
          fetch(`${BASE_URL}/events`).then(res => res.ok ? res.json() : []),
          fetch(`${BASE_URL}/companies`).then(res => res.ok ? res.json() : []),
        ]);

        const [eventsData, companiesData] = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as [EventData[], CompanyData[]];
        
        setEvents(eventsData || []);
        setRestaurants(companiesData || []);
      } catch (err) {
        console.warn("Fetching data failed:", err);
        // Set empty arrays so search still works
        setEvents([]);
        setRestaurants([]);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // Convert data to unified format
  const convertEventsToSearchItems = (events: EventData[]): SearchItem[] => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      subtitle: event.description,
      image: event.photo,
      type: 'event' as const,
      tags: event.tags,
      originalData: event,
    }));
  };

  const convertRestaurantsToSearchItems = (restaurants: CompanyData[]): SearchItem[] => {
    return restaurants.map(restaurant => ({
      id: restaurant.id?.toString() || '',
      title: restaurant.name || '',
      subtitle: restaurant.category,
      image: restaurant.profileImage || '',
      type: 'restaurant' as const,
      address: restaurant.address,
      tags: restaurant.tags,
      originalData: restaurant,
    }));
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(query.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredRestaurants = restaurants.filter((r) =>
    (r.name && r.name.toLowerCase().includes(query.toLowerCase())) ||
    (r.category && r.category.toLowerCase().includes(query.toLowerCase())) ||
    (r.address && r.address.toLowerCase().includes(query.toLowerCase())) ||
    (r.tags && r.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
  );

  const handleItemPress = (item: SearchItem) => {
    if (!navigation) {
      console.warn("Navigation not available");
      return;
    }
    
    if (item.type === 'event') {
      navigation.navigate("EventScreen", { event: item.originalData });
    } else {
      navigation.navigate("Info", { company: item.originalData });
    }
  };

  const sections: SearchSection[] = [
    { 
      title: "Evenimente", 
      data: convertEventsToSearchItems(filteredEvents)
    },
    { 
      title: "Restaurante", 
      data: convertRestaurantsToSearchItems(filteredRestaurants)
    },
  ];

  const EmptyResults = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#6C3AFF20', '#9B59B620']}
        style={styles.emptyGradient}
      >
        <Ionicons name="search-outline" size={64} color="#6C3AFF" />
        <Text style={styles.emptyTitle}>
          {dataLoading ? "Încărcăm datele..." : 
           query ? "Nu am găsit rezultate" : "Începe să cauți"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {dataLoading ? "Te rugăm să aștepți..." :
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
      </LinearGradient>
    </Animated.View>
  );

  const hasResults = filteredEvents.length > 0 || filteredRestaurants.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0817" />
      
      {/* Header with gradient - ALWAYS VISIBLE */}
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
              color={searchFocused ? "#6C3AFF" : "#A78BFA"} 
            />
            <TextInput
              style={styles.input}
              placeholder="Caută evenimente sau restaurante..."
              placeholderTextColor="#666"
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#A78BFA" />
              </TouchableOpacity>
            )}
          </View>
          
          {query.length > 0 && (
            <View style={styles.resultsInfo}>
              <Text style={styles.resultsCount}>
                {filteredEvents.length + filteredRestaurants.length} rezultate găsite
              </Text>
              {dataLoading && (
                <ActivityIndicator size="small" color="#A78BFA" style={{ marginLeft: 10 }} />
              )}
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
            renderSectionHeader={({ section: { title, data } }) =>
              data.length > 0 ? (
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
              ) : null
            }
            renderItem={({ item }) => (
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
                          uri: `data:image/jpg;base64,${item.image}`,
                        }}
                        style={styles.cardImage}
                        defaultSource={require('../assets/default.jpg')}
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
                    
                    <Text style={styles.cardSubtitle} numberOfLines={2}>
                      {item.subtitle}
                    </Text>

                    {item.type === 'restaurant' && item.address && (
                      <View style={styles.addressContainer}>
                        <Ionicons name="location-outline" size={14} color="#A78BFA" />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {item.address}
                        </Text>
                      </View>
                    )}

                    {item.type === 'restaurant' && item.tags && item.tags.length > 0 && (
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
            )}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
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
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2A1A4A",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchBoxFocused: {
    borderColor: "#6C3AFF",
    shadowOpacity: 0.3,
  },
  input: {
    flex: 1,
    height: 52,
    marginLeft: 12,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
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
});