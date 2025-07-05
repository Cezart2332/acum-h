import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import BASE_URL from "../config";
import { cachedFetch, cachedAsyncStorage } from "../utils/apiCache";

type HomeNav = NativeStackNavigationProp<RootStackParamList, "Home">;

interface UserData {
  id?: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
}

interface CompanyData {
  id: number;
  name: string;
  email: string;
  address: string;
  cui: number;
  category: string;
  profileImage: string;
  description: string;
  tags: string[];
}

interface EventData {
  id: string;
  title: string;
  description: string;
  photo: string;
}

// Memoized header component
const HeaderComponent = React.memo(({ 
  eOrR, 
  loading, 
  userData, 
  onProfilePress 
}: {
  eOrR: boolean;
  loading: boolean;
  userData: UserData | null;
  onProfilePress: () => void;
}) => (
  <View style={styles.headerContainer}>
    <Text style={styles.headerTitle}>
      {eOrR ? "Evenimente" : "Restaurante"}
    </Text>
    {loading ? (
      <View style={styles.profilePlaceholder} />
    ) : userData?.profileImage ? (
      <TouchableOpacity onPress={onProfilePress}>
        <Image
          style={styles.profilePic}
          source={{ uri: `data:image/jpg;base64,${userData.profileImage}` }}
        />
      </TouchableOpacity>
    ) : (
      <View style={styles.profilePlaceholder} />
    )}
  </View>
));

// Memoized selector component
const SelectorComponent = React.memo(({ 
  eOrR, 
  onToggle 
}: {
  eOrR: boolean;
  onToggle: (value: boolean) => void;
}) => (
  <View style={styles.selectorContainer}>
    <TouchableOpacity
      style={[styles.selectContentButton, eOrR && styles.activeButton]}
      onPress={() => onToggle(true)}
    >
      <Text style={eOrR ? styles.activeSelectorText : styles.selectorText}>
        Evenimente
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[styles.selectContentButton, !eOrR && styles.activeButton]}
      onPress={() => onToggle(false)}
    >
      <Text style={!eOrR ? styles.activeSelectorText : styles.selectorText}>
        Restaurante
      </Text>
    </TouchableOpacity>
  </View>
));

// Memoized list item component
const ListItemComponent = React.memo(({ 
  item, 
  isEvent, 
  onPress 
}: {
  item: EventData | CompanyData;
  isEvent: boolean;
  onPress: () => void;
}) => {
  const eventItem = item as EventData;
  const companyItem = item as CompanyData;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <ImageBackground
        source={{
          uri: `data:image/jpg;base64,${
            isEvent ? eventItem.photo : companyItem.profileImage
          }`,
        }}
        style={styles.cardImage}
        imageStyle={styles.cardImageStyle}
      >
        <View style={styles.cardOverlay} />
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>
            {isEvent ? eventItem.title : companyItem.name}
          </Text>

          {!isEvent && (
            <View style={styles.tagsContainer}>
              {companyItem.tags?.map((tag, index) => (
                <View key={`${item.id}-${index}`} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.cardDate}>
            {isEvent ? eventItem.description : companyItem.category}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
});

export default function HomeScreen({ navigation }: { navigation: HomeNav }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [restaurants, setRestaurants] = useState<CompanyData[]>([]);
  const [eOrR, setEorR] = useState<boolean>(true);

  // Memoized API functions
  const loadUserData = useCallback(async () => {
    try {
      const user = await cachedAsyncStorage(
        "user",
        async () => {
          const jsonValue = await AsyncStorage.getItem("user");
          return jsonValue ? JSON.parse(jsonValue) : null;
        },
        5 * 60 * 1000 // 5 minutes cache
      );
      setUserData(user);
    } catch (err) {
      console.warn("Loading user data failed", err);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      const eventData = await cachedFetch<EventData[]>(
        `${BASE_URL}/events`,
        { ttl: 10 * 60 * 1000 } // 10 minutes cache
      );
      setEvents(eventData);
    } catch (err) {
      console.warn("Fetching events failed", err);
    }
  }, []);

  const loadCompanies = useCallback(async () => {
    try {
      const companyData = await cachedFetch<CompanyData[]>(
        `${BASE_URL}/companies`,
        { ttl: 15 * 60 * 1000 } // 15 minutes cache
      );
      setRestaurants(companyData);
    } catch (e) {
      console.error("Error fetching companies:", e);
      Alert.alert("Error", "Could not load companies");
    }
  }, []);

  // Memoized data loading function
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUserData(),
        loadEvents(),
        loadCompanies(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadUserData, loadEvents, loadCompanies]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Refresh on screen focus (less frequently)
  useFocusEffect(
    useCallback(() => {
      // Only refresh user data on focus, not all data
      loadUserData();
    }, [loadUserData])
  );

  // Memoized navigation handlers
  const handleProfilePress = useCallback(() => {
    navigation.navigate("Profile");
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: EventData | CompanyData) => {
      if (eOrR) {
        navigation.navigate("EventScreen", { event: item as EventData });
      } else {
        navigation.navigate("Info", { company: item as CompanyData });
      }
    },
    [navigation, eOrR]
  );

  const handleToggle = useCallback((value: boolean) => {
    setEorR(value);
  }, []);

  // Memoized data for rendering
  const currentData = useMemo(() => {
    return eOrR ? events : restaurants;
  }, [eOrR, events, restaurants]);

  // Memoized render item function
  const renderItem = useCallback(
    ({ item }: { item: EventData | CompanyData }) => (
      <ListItemComponent
        item={item}
        isEvent={eOrR}
        onPress={() => handleItemPress(item)}
      />
    ),
    [eOrR, handleItemPress]
  );

  // Memoized key extractor
  const keyExtractor = useCallback(
    (item: EventData | CompanyData) => item.id.toString(),
    []
  );

  // Memoized list performance props
  const listProps = useMemo(
    () => ({
      data: currentData,
      keyExtractor,
      renderItem,
      contentContainerStyle: styles.listContent,
      showsVerticalScrollIndicator: false,
      removeClippedSubviews: true,
      maxToRenderPerBatch: 10,
      windowSize: 10,
      initialNumToRender: 8,
      updateCellsBatchingPeriod: 50,
      getItemLayout: undefined, // Let FlatList handle this for variable heights
    }),
    [currentData, keyExtractor, renderItem]
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0817" />
      
      <HeaderComponent
        eOrR={eOrR}
        loading={loading}
        userData={userData}
        onProfilePress={handleProfilePress}
      />

      <SelectorComponent eOrR={eOrR} onToggle={handleToggle} />

      {loading ? (
        <ActivityIndicator size="large" color="#6C3AFF" style={styles.loader} />
      ) : (
        <FlatList {...listProps} />
      )}
    </SafeAreaView>
  );
}

// Styles remain the same as original
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0817",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 0,
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#6C3AFF",
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2A1A4A",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#A78BFA",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  selectorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 24,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#2A1A4A",
  },
  selectContentButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  activeButton: {
    backgroundColor: "#6C3AFF",
  },
  selectorText: {
    color: "#A78BFA",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  activeSelectorText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  loader: {
    marginTop: 50,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16,
  },
  card: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#2A1A4A",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 240,
    justifyContent: "flex-end",
  },
  cardImageStyle: {
    borderRadius: 24,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,8,23,0.4)",
  },
  cardTextContainer: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textShadowColor: "rgba(108,58,255,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardDate: {
    fontSize: 14,
    color: "#C4B5FD",
    marginTop: 8,
    fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  tag: {
    backgroundColor: "#2A1A4A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#6C3AFF",
  },
  tagText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "500",
  },
});