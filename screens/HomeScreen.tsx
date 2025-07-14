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
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import BASE_URL from "../config";
import { cachedFetch, cachedAsyncStorage } from "../utils/apiCache";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import { 
  getResponsiveFontSize, 
  getShadow, 
  hapticFeedback, 
  TYPOGRAPHY,
  getResponsiveSpacing,
  SCREEN_DIMENSIONS 
} from "../utils/responsive";

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
  onProfilePress,
  theme 
}: {
  eOrR: boolean;
  loading: boolean;
  userData: UserData | null;
  onProfilePress: () => void;
  theme: any;
}) => (
  <LinearGradient
    colors={[theme.colors.primary, theme.colors.secondary]}
    style={styles.headerContainer}
  >
    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
      {eOrR ? "Evenimente" : "Restaurante"}
    </Text>
    {loading ? (
      <View style={[styles.profilePlaceholder, { backgroundColor: theme.colors.surface }]} />
    ) : userData?.profileImage ? (
      <TouchableOpacity 
        onPress={onProfilePress}
        style={[styles.profileContainer, getShadow(3)]}
        activeOpacity={0.8}
      >
        <Image
          style={[styles.profilePic, { borderColor: theme.colors.accent }]}
          source={{ uri: `data:image/jpg;base64,${userData.profileImage}` }}
        />
      </TouchableOpacity>
    ) : (
      <TouchableOpacity 
        onPress={onProfilePress}
        style={styles.profileContainer}
        activeOpacity={0.8}
      >
        <View style={[styles.profilePlaceholder, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
        </View>
      </TouchableOpacity>
    )}
  </LinearGradient>
));

// Memoized selector component
const SelectorComponent = React.memo(({ 
  eOrR, 
  onToggle,
  theme 
}: {
  eOrR: boolean;
  onToggle: (value: boolean) => void;
  theme: any;
}) => (
  <View style={[styles.selectorContainer, { backgroundColor: theme.colors.surface }]}>
    <TouchableOpacity
      style={[
        styles.selectContentButton,
        eOrR && [styles.activeButton, { backgroundColor: theme.colors.accent }]
      ]}
      onPress={() => {
        hapticFeedback('light');
        onToggle(true);
      }}
      activeOpacity={0.8}
    >
      <Text style={[
        eOrR ? styles.activeSelectorText : styles.selectorText,
        { color: eOrR ? theme.colors.text : theme.colors.textSecondary }
      ]}>
        Evenimente
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.selectContentButton,
        !eOrR && [styles.activeButton, { backgroundColor: theme.colors.accent }]
      ]}
      onPress={() => {
        hapticFeedback('light');
        onToggle(false);
      }}
      activeOpacity={0.8}
    >
      <Text style={[
        !eOrR ? styles.activeSelectorText : styles.selectorText,
        { color: !eOrR ? theme.colors.text : theme.colors.textSecondary }
      ]}>
        Restaurante
      </Text>
    </TouchableOpacity>
  </View>
));

// Memoized list item component
const ListItemComponent = React.memo(({ 
  item, 
  isEvent, 
  onPress,
  theme 
}: {
  item: EventData | CompanyData;
  isEvent: boolean;
  onPress: () => void;
  theme: any;
}) => {
  const eventItem = item as EventData;
  const companyItem = item as CompanyData;

  return (
    <TouchableOpacity 
      style={[styles.card, getShadow(4)]} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={{
          uri: `data:image/jpg;base64,${
            isEvent ? eventItem.photo : companyItem.profileImage
          }`,
        }}
        style={styles.cardImage}
        imageStyle={styles.cardImageStyle}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.7)']}
          style={styles.cardOverlay}
        />
        <View style={styles.cardTextContainer}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
            {isEvent ? eventItem.title : companyItem.name}
          </Text>

          {!isEvent && (
            <View style={styles.tagsContainer}>
              {companyItem.tags?.slice(0, 3).map((tag, index) => (
                <View key={`${item.id}-${index}`} style={[styles.tag, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.accent 
                }]}>
                  <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.cardDate, { color: theme.colors.textSecondary }]}>
            {isEvent ? eventItem.description : companyItem.category}
          </Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
});

export default function HomeScreen({ navigation }: { navigation: HomeNav }) {
  const { theme } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // Refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAllData();
    } finally {
      setRefreshing(false);
    }
  }, [loadAllData]);

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
    hapticFeedback('light');
    navigation.navigate("Profile");
  }, [navigation]);

  const handleItemPress = useCallback(
    (item: EventData | CompanyData) => {
      hapticFeedback('medium');
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
        theme={theme}
      />
    ),
    [eOrR, handleItemPress, theme]
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
      refreshControl: (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.accent]}
          tintColor={theme.colors.accent}
          progressBackgroundColor={theme.colors.surface}
        />
      ),
    }),
    [currentData, keyExtractor, renderItem, refreshing, onRefresh, theme]
  );

  return (
    <UniversalScreen 
      gradient={true}
      backgroundColor={theme.colors.primary}
      safeAreaEdges={['top', 'bottom']}
    >
      <HeaderComponent
        eOrR={eOrR}
        loading={loading}
        userData={userData}
        onProfilePress={handleProfilePress}
        theme={theme}
      />

      <SelectorComponent eOrR={eOrR} onToggle={handleToggle} theme={theme} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading {eOrR ? 'events' : 'restaurants'}...
          </Text>
        </View>
      ) : (
        <FlatList {...listProps} />
      )}
    </UniversalScreen>
  );
}

// Enhanced styles with responsive design
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: getResponsiveSpacing('lg'),
    paddingVertical: getResponsiveSpacing('md'),
    minHeight: 80,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: "800",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  profileContainer: {
    borderRadius: 22,
    padding: 2,
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: getResponsiveSpacing('sm'),
    marginHorizontal: getResponsiveSpacing('lg'),
    borderRadius: 16,
    marginTop: getResponsiveSpacing('md'),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...getShadow(2),
  },
  selectContentButton: {
    paddingHorizontal: getResponsiveSpacing('xl'),
    paddingVertical: getResponsiveSpacing('md'),
    borderRadius: 12,
    marginHorizontal: 4,
    minWidth: (SCREEN_DIMENSIONS.width - 80) / 2,
    alignItems: 'center',
  },
  activeButton: {
    ...getShadow(3),
  },
  selectorText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  activeSelectorText: {
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveSpacing('xxl'),
  },
  loadingText: {
    marginTop: getResponsiveSpacing('md'),
    fontSize: TYPOGRAPHY.body,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: getResponsiveSpacing('lg'),
    paddingBottom: getResponsiveSpacing('xxl'),
    paddingTop: getResponsiveSpacing('md'),
  },
  card: {
    marginBottom: getResponsiveSpacing('lg'),
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardImage: {
    width: "100%",
    height: Math.max(240, SCREEN_DIMENSIONS.height * 0.28),
    justifyContent: "flex-end",
  },
  cardImageStyle: {
    borderRadius: 20,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardTextContainer: {
    padding: getResponsiveSpacing('lg'),
    paddingBottom: getResponsiveSpacing('xl'),
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.h5,
    fontWeight: "700",
    letterSpacing: 0.3,
    lineHeight: TYPOGRAPHY.h5 * 1.3,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardDate: {
    fontSize: TYPOGRAPHY.bodySmall,
    marginTop: getResponsiveSpacing('sm'),
    fontWeight: "500",
    lineHeight: TYPOGRAPHY.bodySmall * 1.4,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: getResponsiveSpacing('sm'),
    marginBottom: getResponsiveSpacing('xs'),
  },
  tag: {
    paddingHorizontal: getResponsiveSpacing('md'),
    paddingVertical: getResponsiveSpacing('xs'),
    borderRadius: 20,
    marginRight: getResponsiveSpacing('sm'),
    marginBottom: getResponsiveSpacing('xs'),
    borderWidth: 1,
    ...getShadow(1),
  },
  tagText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "500",
  },
});