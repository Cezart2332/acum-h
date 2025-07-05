import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  FlatList,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import BASE_URL from "../config";

interface UserData {
  id: number;
  username?: string;
  name?: string;
  profileImage?: string;
}
interface CompanyData {
  id: number;
  name?: string;
  profileImage?: string;
}
interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: string;
}

type ProfileData = UserData | CompanyData;

const Profile: React.FC = () => {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [isCompany, setIsCompany] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [events, setEvents] = useState<EventData[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Access denied", "Need permission to access photos");
      return;
    }
    if (!user || !("id" in user)) {
      Alert.alert("Error", "No authenticated user");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const filename = uri.split("/").pop() ?? "photo.jpg";
    const match = filename.match(/\.(\w+)$/);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    const newBase64 = asset.base64;

    const form = new FormData();
    form.append("id", user.id.toString());
    form.append("file", { uri, name: filename, type } as any);

    try {
      const res = await fetch(`${BASE_URL}/changepfp`, {
        method: "PUT",
        body: form,
      });
      console.log("Upload response:", res);
      if (res.ok) {
        Alert.alert("Success", "Profile image updated");
        const updatedUser = { ...user, profileImage: newBase64 ?? undefined };
        setUser(updatedUser);
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      } else Alert.alert("Error", "Upload failed");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Network error");
    }
  };

  if (loading)
    return (
      <ActivityIndicator style={styles.loader} size="large" color="#6200ee" />
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPressIn={handlePick}
          style={styles.avatarContainer}
          activeOpacity={0.8}
        >
          {user && "profileImage" in user && user.profileImage ? (
            <Image
              source={{ uri: `data:image/jpg;base64,${user.profileImage}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </TouchableOpacity>
        <Text style={styles.username} numberOfLines={1}>
          {user
            ? ("username" in user && user.username) ||
              ("name" in user && user.name) ||
              "No Name"
            : "No Name"}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>20</Text>
          <Text style={styles.statLabel}>Attented</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  loader: { flex: 1, justifyContent: "center" },
  header: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatarContainer: {
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "#6200ee",
    overflow: "hidden",
    marginBottom: 12,
  },
  avatar: { width: 140, height: 140, borderRadius: 70 },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#eee",
  },
  username: { fontSize: 24, fontWeight: "700", color: "#333", maxWidth: 250 },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 16,
  },
  statBox: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "700", color: "#6200ee" },
  statLabel: { fontSize: 14, color: "#666", marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 12,
    color: "#333",
  },
  emptyText: { color: "#999", textAlign: "center", marginTop: 20 },
  list: { paddingBottom: 20 },
  card: {
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8,
    backgroundColor: "#f7f7f7",
    elevation: 2,
  },
  cardImage: { flex: 1, justifyContent: "flex-end" },
  cardImageStyle: { borderRadius: 12 },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  textOverlay: { padding: 12 },
  eventTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  eventDesc: { fontSize: 13, color: "#ddd", marginTop: 4 },
});

export default Profile;
