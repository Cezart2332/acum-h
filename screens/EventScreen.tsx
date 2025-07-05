import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  FlatList,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "./RootStackParamList";
import { Ionicons } from "@expo/vector-icons";
import BASE_URL from "../config";

type EventNav = NativeStackNavigationProp<RootStackParamList, "EventScreen">;
type EventRoute = RouteProp<RootStackParamList, "EventScreen">;

interface Props {
  navigation: EventNav;
  route: EventRoute;
}

interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: string;
  tags?: string[];
}

const { width } = Dimensions.get("window");

const EventScreen: React.FC<Props> = ({ route }) => {
  const { event } = route.params;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Image */}
      <ImageBackground
        source={{ uri: `data:image/jpg;base64,${event.photo}` }}
        style={styles.imageBackground}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.overlay} />
        <Text style={styles.title}>{event.title}</Text>
      </ImageBackground>

      {/* Info sections */}
      <View style={styles.infoContainer}>
        {event.tags && event.tags.length > 0 && (
          <Section title="Tags">
            <View style={styles.tagsContainer}>
              {event.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        <Section title="Description">
          <Text style={styles.text}>
            {event.description || "No description available."}
          </Text>
        </Section>

        <Section title="Location">
          <View style={styles.row}>
            <Ionicons name="location-sharp" size={20} color="#A78BFA" />
            <Text style={styles.text}>123 Main Street, Bucharest</Text>
          </View>
        </Section>

        <Section title="Schedule">
          <View style={styles.row}>
            <Ionicons name="time-outline" size={20} color="#A78BFA" />
            <Text style={styles.text}>10:00 AM - 4:00 PM</Text>
          </View>
        </Section>

        <TouchableOpacity style={styles.button} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Participate</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0817" },
  content: { paddingBottom: 40 },
  imageBackground: { width, height: width * 0.7 },
  imageStyle: { resizeMode: "cover" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,8,23,0.5)",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#E0E0FF",
    padding: 24,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  infoContainer: {
    marginTop: -24,
    backgroundColor: "#1A1A1A",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingVertical: 24,
  },
  section: { marginHorizontal: 24, marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#C4B5FD",
    marginBottom: 16,
  },
  text: { fontSize: 16, color: "#D1D5DB", lineHeight: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  button: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: "#6C3AFF",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: "#2A1A4A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#6C3AFF",
  },
  tagText: {
    color: "#C4B5FD",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default EventScreen;
