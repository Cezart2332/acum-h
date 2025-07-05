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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import BASE_URL from "../config";
import { cachedFetch } from "../utils/apiCache";

type SearchNav = {
  navigate: (screen: string, params?: any) => void;
};

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
  tags: string[];
}

type SectionItem = EventData | CompanyData;

type EventSection = {
  title: "Evenimente";
  data: EventData[];
};
type RestaurantSection = {
  title: "Restaurante";
  data: CompanyData[];
};
type SearchSection = EventSection | RestaurantSection;

const { width } = Dimensions.get('window');

export default function SearchScreen({ navigation }: { navigation?: any }) {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventData[]>([]);
  const [restaurants, setRestaurants] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.95);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [evtData, compData] = await Promise.all([
          cachedFetch<EventData[]>(`${BASE_URL}/events`, { ttl: 10 * 60 * 1000 }),
          cachedFetch<CompanyData[]>(`${BASE_URL}/companies`, { ttl: 15 * 60 * 1000 }),
        ]);
        setEvents(evtData);
        setRestaurants(compData);
      } catch (err) {
        console.warn("Fetching data failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(query.toLowerCase()) ||
    e.description?.toLowerCase().includes(query.toLowerCase())
  );

  const filteredRestaurants = restaurants.filter((r) =>
    r.name?.toLowerCase().includes(query.toLowerCase()) ||
    r.category?.toLowerCase().includes(query.toLowerCase()) ||
    r.address?.toLowerCase().includes(query.toLowerCase()) ||
    r.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
  );

  const handleItemPress = (item: SectionItem, section: SearchSection) => {
    if (!navigation) return;
    
    if (section.title === "Evenimente") {
      navigation.navigate("EventScreen", { event: item as EventData });
    } else {
      navigation.navigate("Info", { company: item as CompanyData });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0817" />
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingContent, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['#6C3AFF', '#9B59B6', '#BB86FC']}
              style={styles.loadingGradient}
            >
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Căutăm pentru tine...</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  const sections: SearchSection[] = [
    { title: "Evenimente", data: filteredEvents },
    { title: "Restaurante", data: filteredRestaurants },
  ];

  const EmptyResults = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#6C3AFF20', '#9B59B620']}
        style={styles.emptyGradient}
      >
        <Ionicons name="search-outline" size={64} color="#6C3AFF" />
        <Text style={styles.emptyTitle}>
          {query ? "Nu am găsit rezultate" : "Începe să cauți"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {query 
            ? "Încearcă să cauți cu alți termeni" 
            : "Caută evenimente sau restaurante"
          }
        </Text>
      </LinearGradient>
    </Animated.View>
  );

  const hasResults = filteredEvents.length > 0 || filteredRestaurants.length > 0;

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
            <Text style={styles.resultsCount}>
              {filteredEvents.length + filteredRestaurants.length} rezultate găsite
            </Text>
          )}
        </Animated.View>
      </LinearGradient>

      {!hasResults ? (
        <EmptyResults />
      ) : (
        <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
          <SectionList<SearchSection["data"][number], SearchSection>
            sections={sections}
            keyExtractor={(item, idx) =>
              `${(item as any).id || (item as any).name}-${idx}`
            }
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
            renderItem={({ item, section, index }) => (
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
                  onPress={() => handleItemPress(item, section)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={{
                        uri: `data:image/jpg;base64,${
                          section.title === "Evenimente"
                            ? (item as EventData).photo
                            : (item as CompanyData).profileImage
                        }`,
                      }}
                      style={styles.cardImage}
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(15,8,23,0.8)']}
                      style={styles.cardImageOverlay}
                    />
                  </View>
                  
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {section.title === "Evenimente"
                        ? (item as EventData).title
                        : (item as CompanyData).name}
                    </Text>
                    
                    <Text style={styles.cardSubtitle} numberOfLines={2}>
                      {section.title === "Evenimente"
                        ? (item as EventData).description
                        : (item as CompanyData).category}
                    </Text>

                    {section.title === "Restaurante" && (item as CompanyData).address && (
                      <View style={styles.addressContainer}>
                        <Ionicons name="location-outline" size={14} color="#A78BFA" />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {(item as CompanyData).address}
                        </Text>
                      </View>
                    )}

                    {section.title === "Restaurante" && (item as CompanyData).tags && (
                      <View style={styles.tagsContainer}>
                        {(item as CompanyData).tags!.slice(0, 2).map((tag, tagIndex) => (
                          <View key={tagIndex} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                        {(item as CompanyData).tags!.length > 2 && (
                          <Text style={styles.moreTagsText}>
                            +{(item as CompanyData).tags!.length - 2}
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
                        name={section.title === "Evenimente" ? "calendar" : "restaurant"} 
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
  resultsCount: {
    marginTop: 8,
    marginLeft: 4,
    fontSize: 14,
    color: "#A78BFA",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingContent: {
    width: "100%",
    alignItems: "center",
  },
  loadingGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    width: "100%",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
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
