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
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";

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

export default function HomeScreen({ navigation }: { navigation: HomeNav }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [restaurants, setRestaurants] = useState<CompanyData[]>([]);
  const [eOrR, setEorR] = useState<boolean>(true);

  const loadUserAndData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("user");
      const parsed = jsonValue ? JSON.parse(jsonValue) : null;
      setUserData(parsed);
    } catch (err) {
      console.warn("Loading data failed", err);
    }
  };

  const loadEvents = async () => {
    try {
      const response = await fetch("http://172.20.10.2:5298/events");
      const data: EventData[] = await response.json();
      setEvents(data);
    } catch (err) {
      console.warn("Fetching events failed", err);
    }
  };

  const loadCompanies = async () => {
    try {
      const res = await fetch("http://172.20.10.2:5298/companies");
      if (!res.ok) throw new Error(res.statusText);
      const data: CompanyData[] = await res.json();
      setRestaurants(data);
    } catch (e) {
      console.error("Error fetching companies:", e);
      Alert.alert("Error", "Could not load companies");
    }
  };

  useEffect(() => {
    loadEvents();
    loadCompanies();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadUserAndData().finally(() => setLoading(false));
      loadEvents();
      loadCompanies();
    }, [])
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>
        {eOrR ? "Evenimente" : "Restaurante"}
      </Text>
      {loading ? (
        <View style={styles.profilePlaceholder} />
      ) : userData?.profileImage ? (
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <Image
            style={styles.profilePic}
            source={{ uri: `data:image/jpg;base64,${userData.profileImage}` }}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.profilePlaceholder} />
      )}
    </View>
  );

  const renderItem = ({ item }: { item: EventData | CompanyData }) => {
    const isEvent = eOrR;
    const { id, title, description } = item as EventData;
    const company = item as CompanyData;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (isEvent) {
            navigation.navigate("EventScreen", { event: item as EventData });
          } else {
            navigation.navigate("Info", { company });
          }
        }}
      >
        <ImageBackground
          source={{
            uri: `data:image/jpg;base64,${
              isEvent ? (item as EventData).photo : company.profileImage
            }`,
          }}
          style={styles.cardImage}
          imageStyle={styles.cardImageStyle}
        >
          <View style={styles.cardOverlay} />
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>
              {isEvent ? title : company.name}
            </Text>

            {!isEvent && (
              <View style={styles.tagsContainer}>
                {company.tags?.map((tag, index) => (
                  <View key={`${id}-${index}`} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.cardDate}>
              {isEvent ? description : company.category}
            </Text>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0817" />
      {renderHeader()}
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[styles.selectContentButton, eOrR && styles.activeButton]}
          onPress={() => setEorR(true)}
        >
          <Text style={eOrR ? styles.activeSelectorText : styles.selectorText}>
            Evenimente
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectContentButton, !eOrR && styles.activeButton]}
          onPress={() => setEorR(false)}
        >
          <Text style={!eOrR ? styles.activeSelectorText : styles.selectorText}>
            Restaurante
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6C3AFF" style={styles.loader} />
      ) : (
        <FlatList
          data={eOrR ? events : restaurants}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

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
