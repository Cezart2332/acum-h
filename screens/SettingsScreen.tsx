import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../context/ThemeContext";
import { RootStackParamList } from "./RootStackParamList";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  SCREEN_DIMENSIONS,
} from "../utils/responsive";

type HomeNav = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function SettingsScreen({
  navigation,
}: {
  navigation: HomeNav;
}) {
  const { theme } = useTheme();
  const [notif, setNotif] = useState<boolean>(true);
  const [dark, setDark] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Removed createStyles call - using direct styles

  interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }

  const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    danger = false,
  }) => {
    const [scaleAnim] = useState(new Animated.Value(1));

    const animatePress = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <Animated.View
        style={[
          styles.settingItemWrapper,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.settingItem, danger && styles.dangerItem]}
          onPress={() => {
            animatePress();
            setTimeout(() => onPress?.(), 150);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.settingItemGradient}>
            <View style={styles.settingItemLeft}>
              <View
                style={[
                  styles.iconContainer,
                  danger && styles.dangerIconContainer,
                ]}
              >
                <View style={styles.iconGradient}>
                  <Ionicons
                    name={icon as any}
                    size={24}
                    color={danger ? "#FFFFFF" : "#FFFFFF"}
                  />
                </View>
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[styles.settingTitle, danger && styles.dangerText]}
                >
                  {title}
                </Text>
                {subtitle && (
                  <Text
                    style={[
                      styles.settingSubtitle,
                      danger && styles.dangerSubtext,
                    ]}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.settingItemRight}>
              {rightElement || (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={danger ? "#FFFFFF80" : "#B19CD9"}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const CustomSwitch: React.FC<{
    value: boolean;
    onValueChange: (value: boolean) => void;
  }> = ({ value, onValueChange }) => {
    const [switchAnim] = useState(new Animated.Value(value ? 1 : 0));

    useEffect(() => {
      Animated.timing(switchAnim, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [value]);

    return (
      <TouchableOpacity
        style={styles.customSwitchContainer}
        onPress={() => onValueChange(!value)}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.customSwitchTrack,
            {
              backgroundColor: switchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["#2A1A4A", "#6C3AFF"],
              }),
            },
          ]}
        >
          <Animated.View
            style={[
              styles.customSwitchThumb,
              {
                transform: [
                  {
                    translateX: switchAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [2, 22],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.thumbGradient} />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Load settings
    (async () => {
      const n = await AsyncStorage.getItem("notif");
      const d = await AsyncStorage.getItem("dark");
      if (n !== null) setNotif(JSON.parse(n));
      if (d !== null) setDark(JSON.parse(d));
    })();
  }, []);

  const toggleNotif = async (val: boolean) => {
    setNotif(val);
    await AsyncStorage.setItem("notif", JSON.stringify(val));
  };

  const toggleDark = async (val: boolean) => {
    setDark(val);
    await AsyncStorage.setItem("dark", JSON.stringify(val));
  };

  const logOut = async () => {
    Alert.alert(
      "Confirmare Deconectare",
      "Ești sigur că vrei să te deconectezi?",
      [
        {
          text: "Anulează",
          style: "cancel",
        },
        {
          text: "Deconectează",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiSet([
              ["loggedIn", "false"],
              ["user", "null"],
            ]);
            navigation.replace("Login");
          },
        },
      ]
    );
  };

  const onChangePassword = () => {
    hapticFeedback();
    navigation.navigate("ChangePassword");
  };

  const onAbout = () =>
    Alert.alert(
      "Despre Aplicație",
      "Acum-H\nVersiune: 1.0.0\nO aplicație pentru găsirea celor mai bune restaurante și evenimente.\n\n© 2024 Acum-H Team",
      [{ text: "OK", style: "default" }]
    );

  const onPrivacy = () =>
    Alert.alert(
      "Politica de Confidențialitate",
      "Respectăm confidențialitatea datelor tale. Pentru mai multe detalii, vezi politica completă în aplicație.",
      [{ text: "OK", style: "default" }]
    );

  const onSupport = () =>
    Alert.alert("Suport", "Ai întrebări? Contactează-ne la support@acum-h.ro", [
      { text: "OK", style: "default" },
    ]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.headerGradient}>
          <Text style={styles.headerTitle}>Setări</Text>
          <Text style={styles.headerSubtitle}>
            Personalizează experiența ta
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Account Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionHeaderGradient}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
                <Text style={styles.sectionHeader}>Cont</Text>
              </View>
            </View>

            <SettingItem
              icon="key-outline"
              title="Schimbă Parola"
              subtitle="Actualizează parola contului"
              onPress={onChangePassword}
            />

            <SettingItem
              icon="shield-checkmark-outline"
              title="Confidențialitate"
              subtitle="Politica de confidențialitate"
              onPress={onPrivacy}
            />
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionHeaderGradient}>
                <Ionicons name="settings" size={20} color="#FFFFFF" />
                <Text style={styles.sectionHeader}>Preferințe</Text>
              </View>
            </View>

            <SettingItem
              icon="notifications-outline"
              title="Notificări"
              subtitle={notif ? "Activat" : "Dezactivat"}
              rightElement={
                <CustomSwitch value={notif} onValueChange={toggleNotif} />
              }
            />
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionHeaderGradient}>
                <Ionicons name="help-circle" size={20} color="#FFFFFF" />
                <Text style={styles.sectionHeader}>Suport</Text>
              </View>
            </View>

            <SettingItem
              icon="chatbubble-ellipses-outline"
              title="Suport Tehnic"
              subtitle="Contactează echipa de suport"
              onPress={onSupport}
            />

            <SettingItem
              icon="information-circle-outline"
              title="Despre Aplicație"
              subtitle="Versiune și informații"
              onPress={onAbout}
            />
          </View>

          {/* Logout Section */}
          <View style={[styles.section, styles.lastSection]}>
            <SettingItem
              icon="log-out-outline"
              title="Deconectează"
              subtitle="Ieși din cont"
              onPress={logOut}
              danger={true}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingBottom: 8,
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#000000",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#B19CD9",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeaderContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionHeaderGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#7B2CBF",
    borderRadius: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  settingItemWrapper: {
    marginBottom: 12,
  },
  settingItem: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#7B2CBF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerItem: {
    shadowColor: "#FF6B6B",
  },
  settingItemGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#1A1A1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333333",
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 16,
    overflow: "hidden",
  },
  dangerIconContainer: {
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7B2CBF",
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  dangerText: {
    color: "#FF6B6B",
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#B19CD9",
    lineHeight: 18,
  },
  dangerSubtext: {
    color: "#FF6B6B80",
  },
  settingItemRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Custom Switch Styles
  customSwitchContainer: {
    width: 48,
    height: 28,
  },
  customSwitchTrack: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    justifyContent: "center",
    position: "relative",
    shadowColor: "#7B2CBF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  customSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
});
