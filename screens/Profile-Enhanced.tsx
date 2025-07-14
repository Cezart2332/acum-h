import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Animated,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import BASE_URL from "../config";
import { useTheme } from "../context/ThemeContext";
import UniversalScreen from "../components/UniversalScreen";
import EnhancedButton from "../components/EnhancedButton";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  getResponsiveSpacing,
  SCREEN_DIMENSIONS,
} from "../utils/responsive";

interface UserData {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
}

interface CompanyData {
  id: number;
  name?: string;
  email?: string;
  category?: string;
  profileImage?: string;
  description?: string;
}

interface EventData {
  id: string;
  title: string;
  description?: string;
  photo: string;
  likes?: number;
  company?: string;
}

type ProfileData = UserData | CompanyData;

const Profile: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { theme } = useTheme();
  const [user, setUser] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const [events, setEvents] = useState<EventData[]>([]);
  const [stats, setStats] = useState({
    eventsLiked: 0,
    restaurantsVisited: 0,
    reviewsWritten: 0,
  });

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadUserData();

    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
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

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem("user");
      if (stored) {
        const userData = JSON.parse(stored);
        setUser(userData);
        await loadUserStats(userData.id);
      }
    } catch (e) {
      console.error("Error loading user data:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async (userId: number) => {
    try {
      // Mock stats for now - can be replaced with real API calls
      setStats({
        eventsLiked: Math.floor(Math.random() * 50),
        restaurantsVisited: Math.floor(Math.random() * 25),
        reviewsWritten: Math.floor(Math.random() * 15),
      });
    } catch (error) {
      console.warn("Could not load user stats:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  }, []);

  const handleImagePicker = async () => {
    hapticFeedback("light");

    Alert.alert("Schimbă poza de profil", "Alege o opțiune", [
      { text: "Anulează", style: "cancel" },
      { text: "Camera", onPress: () => openCamera() },
      { text: "Galerie", onPress: () => openGallery() },
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Acces refuzat", "Avem nevoie de permisiune pentru camera");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      updateProfileImage(result.assets[0]);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Acces refuzat", "Avem nevoie de permisiune pentru galerie");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      updateProfileImage(result.assets[0]);
    }
  };

  const updateProfileImage = async (asset: any) => {
    if (!user || !("id" in user)) {
      Alert.alert("Eroare", "Nu există utilizator autentificat");
      return;
    }

    setImageLoading(true);

    try {
      const uri = asset.uri;
      const filename = uri.split("/").pop() ?? "photo.jpg";
      const match = filename.match(/\.(\w+)$/);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      const newBase64 = asset.base64;

      const form = new FormData();
      form.append("id", user.id.toString());
      form.append("file", { uri, name: filename, type } as any);

      const response = await fetch(`${BASE_URL}/changepfp`, {
        method: "PUT",
        body: form,
      });

      if (response.ok) {
        hapticFeedback("medium");
        Alert.alert("Succes", "Poza de profil a fost actualizată");
        const updatedUser = { ...user, profileImage: newBase64 };
        setUser(updatedUser);
        await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error updating profile image:", error);
      Alert.alert("Eroare", "Nu s-a putut actualiza poza de profil");
      hapticFeedback("heavy");
    } finally {
      setImageLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Deconectare", "Ești sigur că vrei să te deconectezi?", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Deconectare",
        style: "destructive",
        onPress: async () => {
          hapticFeedback("medium");
          try {
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("loggedIn");
            navigation?.replace("Login");
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    hapticFeedback("light");
    // Navigate to edit profile screen
    Alert.alert(
      "În dezvoltare",
      "Funcția de editare profil va fi disponibilă în curând"
    );
  };

  const renderStatCard = (
    title: string,
    value: number,
    icon: string,
    color: string
  ) => (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.colors.surface },
        getShadow(3),
      ]}
    >
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );

  const getUserDisplayName = () => {
    if (!user) return "Utilizator";

    if ("firstName" in user && "lastName" in user) {
      return (
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.username ||
        "Utilizator"
      );
    }

    if ("name" in user) {
      return user.name || "Companie";
    }

    return user.username || "Utilizator";
  };

  const getUserSubtitle = () => {
    if (!user) return "";

    if ("email" in user) {
      return user.email || "";
    }

    if ("category" in user) {
      return user.category || "";
    }

    return "";
  };

  if (loading) {
    return (
      <UniversalScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Se încarcă profilul...
          </Text>
        </View>
      </UniversalScreen>
    );
  }

  return (
    <UniversalScreen
      scrollable={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.accent]}
          tintColor={theme.colors.accent}
          progressBackgroundColor={theme.colors.surface}
        />
      }
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <LinearGradient
          colors={[theme.colors.accent, theme.colors.accentSecondary]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            {/* Profile Image */}
            <TouchableOpacity
              style={[styles.profileImageContainer, getShadow(5)]}
              onPress={handleImagePicker}
              activeOpacity={0.8}
            >
              {imageLoading ? (
                <View style={[styles.profileImage, styles.profileImageLoading]}>
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                </View>
              ) : user?.profileImage ? (
                <Image
                  source={{ uri: `data:image/jpg;base64,${user.profileImage}` }}
                  style={styles.profileImage}
                />
              ) : (
                <View
                  style={[styles.profileImage, styles.profileImagePlaceholder]}
                >
                  <Ionicons
                    name="person"
                    size={40}
                    color={theme.colors.textTertiary}
                  />
                </View>
              )}
              <View
                style={[
                  styles.editIconContainer,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Ionicons name="camera" size={16} color={theme.colors.text} />
              </View>
            </TouchableOpacity>

            {/* User Info */}
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {getUserDisplayName()}
            </Text>

            {getUserSubtitle() && (
              <Text
                style={[
                  styles.userSubtitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {getUserSubtitle()}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <EnhancedButton
                title="Editează profilul"
                onPress={handleEditProfile}
                variant="outline"
                size="small"
                icon={
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={theme.colors.accent}
                  />
                }
                style={styles.actionButton}
              />
            </View>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Statistici
          </Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              "Evenimente apreciate",
              stats.eventsLiked,
              "heart",
              theme.colors.error
            )}
            {renderStatCard(
              "Restaurante vizitate",
              stats.restaurantsVisited,
              "restaurant",
              theme.colors.warning
            )}
            {renderStatCard(
              "Recenzii scrise",
              stats.reviewsWritten,
              "star",
              theme.colors.success
            )}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Setări
          </Text>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: theme.colors.surface },
            ]}
            activeOpacity={0.8}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.colors.textSecondary}
              />
              <Text
                style={[styles.settingItemText, { color: theme.colors.text }]}
              >
                Notificări
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: theme.colors.surface },
            ]}
            activeOpacity={0.8}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons
                name="shield-outline"
                size={24}
                color={theme.colors.textSecondary}
              />
              <Text
                style={[styles.settingItemText, { color: theme.colors.text }]}
              >
                Confidențialitate
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: theme.colors.surface },
            ]}
            activeOpacity={0.8}
          >
            <View style={styles.settingItemLeft}>
              <Ionicons
                name="help-circle-outline"
                size={24}
                color={theme.colors.textSecondary}
              />
              <Text
                style={[styles.settingItemText, { color: theme.colors.text }]}
              >
                Ajutor și suport
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>

          {/* Logout Button */}
          <EnhancedButton
            title="Deconectare"
            onPress={handleLogout}
            variant="outline"
            style={[styles.logoutButton, { borderColor: theme.colors.error }]}
            textStyle={{ color: theme.colors.error }}
            icon={
              <Ionicons
                name="log-out-outline"
                size={20}
                color={theme.colors.error}
              />
            }
          />
        </View>
      </Animated.View>
    </UniversalScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: getResponsiveSpacing("md"),
  },
  loadingText: {
    fontSize: TYPOGRAPHY.body,
  },
  header: {
    paddingHorizontal: getResponsiveSpacing("lg"),
    paddingVertical: getResponsiveSpacing("xl"),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: getResponsiveSpacing("lg"),
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
  },
  profileImageLoading: {
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileImagePlaceholder: {
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  editIconContainer: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  userName: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: "800",
    marginBottom: getResponsiveSpacing("xs"),
    textAlign: "center",
  },
  userSubtitle: {
    fontSize: TYPOGRAPHY.body,
    marginBottom: getResponsiveSpacing("lg"),
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: getResponsiveSpacing("md"),
  },
  actionButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  statsContainer: {
    padding: getResponsiveSpacing("lg"),
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.h5,
    fontWeight: "700",
    marginBottom: getResponsiveSpacing("lg"),
  },
  statsGrid: {
    flexDirection: "row",
    gap: getResponsiveSpacing("md"),
  },
  statCard: {
    flex: 1,
    padding: getResponsiveSpacing("md"),
    borderRadius: 16,
    alignItems: "center",
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: getResponsiveSpacing("sm"),
  },
  statValue: {
    fontSize: TYPOGRAPHY.h4,
    fontWeight: "800",
    marginBottom: getResponsiveSpacing("xs"),
  },
  statTitle: {
    fontSize: TYPOGRAPHY.caption,
    textAlign: "center",
    fontWeight: "500",
  },
  settingsContainer: {
    padding: getResponsiveSpacing("lg"),
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: getResponsiveSpacing("md"),
    borderRadius: 12,
    marginBottom: getResponsiveSpacing("sm"),
    ...getShadow(2),
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveSpacing("md"),
  },
  settingItemText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "500",
  },
  logoutButton: {
    marginTop: getResponsiveSpacing("lg"),
  },
});

export default Profile;
