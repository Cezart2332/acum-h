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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BASE_URL from "../config";

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
}

type SectionItem = EventData | CompanyData;

type EventSection = {
  title: "Events";
  data: EventData[];
};
type RestaurantSection = {
  title: "Restaurants";
  data: CompanyData[];
};
type SearchSection = EventSection | RestaurantSection;

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<EventData[]>([]);
  const [restaurants, setRestaurants] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [evtRes, compRes] = await Promise.all([
          fetch(`${BASE_URL}/events`),
          fetch(`${BASE_URL}/companies`),
        ]);
        const evtData: EventData[] = await evtRes.json();
        const compData: CompanyData[] = await compRes.json();
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
    e.title.toLowerCase().includes(query.toLowerCase())
  );
  const filteredRestaurants = restaurants.filter((r) =>
    r.name?.toLowerCase().includes(query.toLowerCase())
  );

  if (loading)
    return (
      <ActivityIndicator style={styles.loader} size="large" color="#8A2BE2" />
    );

  const sections: SearchSection[] = [
    { title: "Events", data: filteredEvents },
    { title: "Restaurants", data: filteredRestaurants },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={24} color="#8A2BE2" />
        <TextInput
          style={styles.input}
          placeholder="Search events or restaurants..."
          placeholderTextColor="#666"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <SectionList<SearchSection["data"][number], SearchSection>
        sections={sections}
        keyExtractor={(item, idx) =>
          `${(item as any).id || (item as any).name}-${idx}`
        }
        renderSectionHeader={({ section: { title, data } }) =>
          data.length ? <Text style={styles.sectionHeader}>{title}</Text> : null
        }
        renderItem={({ item, section }) => (
          <TouchableOpacity style={styles.card}>
            {section.title === "Events" ? (
              <Image
                source={{
                  uri: `data:image/jpg;base64,${(item as EventData).photo}`,
                }}
                style={styles.cardImage}
              />
            ) : (
              <Image
                source={{
                  uri: `data:image/jpg;base64,${
                    (item as CompanyData).profileImage
                  }`,
                }}
                style={styles.cardImage}
              />
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>
                {section.title === "Events"
                  ? (item as EventData).title
                  : (item as CompanyData).name}
              </Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {section.title === "Events"
                  ? (item as EventData).description
                  : (item as CompanyData).category}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0F0F0F",
  },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    margin: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2D2D2D",
  },
  input: {
    flex: 1,
    height: 52,
    marginLeft: 12,
    fontSize: 16,
    color: "#FFFFFF",
    // fontFamily: "Inter-Medium", // Uncomment if you have custom font
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#0F0F0F",
    letterSpacing: 0.5,
    borderBottomWidth: 2,
    borderBottomColor: "#8A2BE2",
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 4,
    shadowColor: "#8A2BE2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    // fontFamily: "Inter-SemiBold", // Uncomment if you have custom font
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#BB86FC",
    marginTop: 6,
    opacity: 0.9,
  },
  separator: {
    height: 8,
    backgroundColor: "#0F0F0F",
  },
});
