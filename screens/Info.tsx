import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  FlatList,
  ImageBackground,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "./RootStackParamList";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BASE_URL from "../config";

type InfoNav = NativeStackNavigationProp<RootStackParamList, "Info">;
type InfoRoute = RouteProp<RootStackParamList, "Info">;

interface Props {
  navigation: InfoNav;
  route: InfoRoute;
}

interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: string;
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

type ProfileData = CompanyData;

const Info: React.FC<Props> = ({ navigation, route }) => {
  const { company } = route.params;
  const [events, setEvents] = useState<EventData[]>([]);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const [hasMenu, setHasMenu] = useState<boolean>(false);
  const [checkingMenu, setCheckingMenu] = useState<boolean>(true);

  // Fetch events
  useEffect(() => {
    (async () => {
      setLoadingEvents(true);
      const form = new FormData();
      if (company.id != null) form.append("id", company.id.toString());
      try {
        console.log("Fetching events for company", company.id);
        const res = await fetch(`${BASE_URL}/companyevents`, {
          method: "POST",
          body: form,
        });
        console.log("Events fetch status", res.status);
        if (res.ok) {
          const data: EventData[] = await res.json();
          setEvents(data);
        }
      } catch (e) {
        console.error("Event fetch error", e);
      } finally {
        setLoadingEvents(false);
      }
    })();
  }, [company.id]);

  // Check if menu exists via GET (inspect 200 vs 404)
  useEffect(() => {
    (async () => {
      setCheckingMenu(true);
      try {
        const url = `${BASE_URL}/companies/${company.id}/menu`;
        console.log("Checking menu at", url);
        const res = await fetch(url, { method: "GET" });
        console.log("Menu check status", res.status);
        setHasMenu(res.status === 200);
      } catch (e) {
        console.error("Menu check failed", e);
        setHasMenu(false);
      } finally {
        setCheckingMenu(false);
      }
    })();
  }, [company.id]);

  const openMenu = async () => {
    try {
      const url = `${BASE_URL}/companies/${company.id}/menu`;
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Eroare", "Nu s-a putut deschide meniul");
    }
  };

  // NEW FUNCTION: Redirect to Reservation page
  const goToReservation = () => {
    navigation.navigate("Reservation", { company });
  };

  const renderEvent = ({ item }: { item: EventData }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("EventScreen", { event: item })}
      style={styles.eventCardWrapper}
    >
      <View style={styles.eventCard}>
        <ImageBackground
          source={{ uri: `data:image/jpg;base64,${item.photo}` }}
          style={styles.eventImage}
          imageStyle={styles.eventImageStyle}
        >
          <View style={styles.eventOverlay} />
          <View style={styles.eventText}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.eventDesc}>{item.description}</Text>
            )}
          </View>
        </ImageBackground>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image
          source={{ uri: `data:image/jpg;base64,${company.profileImage}` }}
          style={styles.heroImage}
        />
        <View style={styles.infoCard}>
          <Text style={styles.companyName}>{company.name}</Text>

          {/* Tags */}
          {company.tags?.length > 0 && (
            <View style={styles.tagsContainer}>
              {company.tags.map((tag, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Contact rows */}
          <View style={styles.row}>
            <Ionicons name="location-outline" size={20} color="#A78BFA" />
            <Text style={styles.infoText}>{company.address}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={20} color="#A78BFA" />
            <Text style={styles.infoText}>{company.email}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="pricetag-outline" size={20} color="#A78BFA" />
            <Text style={styles.infoText}>{company.category}</Text>
          </View>

          {/* Despre noi */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Despre noi</Text>
            <Text style={styles.description}>{company.description}</Text>
          </View>

          {/* Meniu */}
          {checkingMenu ? (
            <Text style={styles.loadingText}>Verificare meniu...</Text>
          ) : hasMenu ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meniu</Text>
              <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
                <Ionicons name="document-text" size={24} color="#A78BFA" />
                <Text style={styles.menuButtonText}>Vizualizează Meniul</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.loadingText}>Meniu indisponibil</Text>
          )}

          {/* NEW RESERVATION BUTTON */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rezervări</Text>
            <TouchableOpacity
              style={styles.reservationButton}
              onPress={goToReservation}
            >
              <Ionicons name="restaurant" size={24} color="#A78BFA" />
              <Text style={styles.reservationButtonText}>Rezervă acum</Text>
            </TouchableOpacity>
          </View>

          {/* Evenimente */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evenimente</Text>
            {loadingEvents ? (
              <Text style={styles.loadingText}>Se încarcă evenimente...</Text>
            ) : events.length === 0 ? (
              <Text style={styles.loadingText}>Nu există evenimente.</Text>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={renderEvent}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsList}
              />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0817" },
  scroll: { paddingBottom: 40 },
  heroImage: {
    width: "100%",
    height: 240,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  infoCard: {
    margin: 16,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  companyName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#A78BFA",
    marginBottom: 16,
    textAlign: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  tag: {
    backgroundColor: "#2A1A4A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#6C3AFF",
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { color: "#C4B5FD", fontSize: 14, fontWeight: "500" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    paddingVertical: 6,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#C4B5FD",
    flexShrink: 1,
  },
  section: {
    marginTop: 24,
    borderLeftWidth: 3,
    borderLeftColor: "#6C3AFF",
    paddingLeft: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#E0E0FF",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#D1D5DB",
    opacity: 0.9,
  },
  loadingText: {
    fontSize: 16,
    color: "#A78BFA",
    textAlign: "center",
    marginVertical: 16,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A1A4A",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6C3AFF",
    marginTop: 8,
  },
  menuButtonText: {
    color: "#C4B5FD",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  // NEW RESERVATION BUTTON STYLES
  reservationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A1A4A",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6C3AFF",
    marginTop: 8,
  },
  reservationButtonText: {
    color: "#C4B5FD",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  eventsList: { paddingVertical: 12 },
  eventCardWrapper: { marginRight: 16 },
  eventCard: {
    width: 180,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#2A1A4A",
  },
  eventImage: { flex: 1, justifyContent: "flex-end" },
  eventImageStyle: { borderRadius: 16 },
  eventOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,8,23,0.4)",
  },
  eventText: { padding: 12 },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  eventDesc: { fontSize: 14, color: "#E0E0FF", marginTop: 4, opacity: 0.9 },
});

export default Info;
