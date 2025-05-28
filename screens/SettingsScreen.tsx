import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Profile: undefined;
};
type HomeNav = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function SettingsScreen({
  navigation,
}: {
  navigation: HomeNav;
}) {
  const [notif, setNotif] = useState<boolean>(true);
  const [dark, setDark] = useState<boolean>(false);

  useEffect(() => {
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
    // you can also trigger theme context here
  };

  const logOut = async () => {
    await AsyncStorage.multiSet([
      ["loggedIn", "false"],
      ["user", "null"],
    ]);
    navigation.replace("Login");
  };

  const onChangePassword = () =>
    Alert.alert("Change Password", "Redirect to change password screen");
  const onAbout = () => Alert.alert("About", "App version: Alpha 0.1.0");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionHeader}>Account</Text>
        <TouchableOpacity style={styles.item} onPress={onChangePassword}>
          <Text style={styles.itemText}>Change Password</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.itemRow}>
          <Text style={styles.itemText}>Notifications</Text>
          <Switch value={notif} onValueChange={toggleNotif} />
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.itemText}>Dark Mode</Text>
          <Switch value={dark} onValueChange={toggleDark} />
        </View>

        <Text style={styles.sectionHeader}>Other</Text>
        <TouchableOpacity style={styles.item} onPress={onAbout}>
          <Text style={styles.itemText}>About</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logout} onPress={logOut}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { padding: 20 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: "#444",
    marginTop: 20,
    marginBottom: 10,
  },
  item: {
    backgroundColor: "#f4f4f4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f4f4f4",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  itemText: { fontSize: 16, color: "#333" },
  logout: {
    marginTop: 30,
    backgroundColor: "#e74c3c",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
