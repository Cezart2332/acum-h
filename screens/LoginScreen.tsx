import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";

type LoginNav = NativeStackNavigationProp<RootStackParamList, "Login">;
export default function LoginScreen({ navigation }: { navigation: LoginNav }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error1, setError1] = useState(false);
  const [error2, setError2] = useState(false);

  const onLogin = async () => {
    if (email.trim() === "" || password.trim() === "") {
      setError1(true);
      return;
    } else {
      setError1(false);
      const loginData = {
        Username: email,
        Password: password,
      };
      const loginRequest = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      };
      const response = await fetch(
        "http://172.20.10.2:5298/login",
        loginRequest
      );
      console.log(response.ok);
      console.log(response.status);
      if (response.status === 401) {
        setError2(true);
        return;
      }
      const data = await response.json();
      await AsyncStorage.setItem("user", JSON.stringify(data));

      await AsyncStorage.setItem("loggedIn", JSON.stringify(true));
      navigation.replace("Home");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <LinearGradient colors={["#1e3c72", "#2a5298"]} style={styles.gradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>AcoomH</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#888"
                style={styles.icon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email or Username"
                placeholderTextColor="#aaa"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#888"
                style={styles.icon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Parolă"
                placeholderTextColor="#aaa"
                style={styles.input}
                secureTextEntry={secure}
              />
              <TouchableOpacity
                onPress={() => setSecure(!secure)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={secure ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#888"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={onLogin}
              style={styles.button}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Nu ai cont?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Register")}>
                <Text style={styles.footerLink}>Înregistrează-te</Text>
              </TouchableOpacity>
            </View>
            {error1 ? (
              <Text style={styles.errorText}>
                Trebuie sa completezi toate campurile!
              </Text>
            ) : null}
            {error2 ? (
              <Text style={styles.errorText}>Ai gresit parola/numele!</Text>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: { fontSize: 40, color: "#fff", fontWeight: "bold", marginBottom: 20 },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 5,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  icon: { marginRight: 8 },
  input: {
    flex: 1,
    height: Platform.OS === "ios" ? 44 : 48,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: { padding: 8 },
  button: {
    backgroundColor: "#2a5298",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  footerText: { color: "#555" },
  footerLink: { color: "#2a5298", fontWeight: "bold", marginLeft: 4 },
  errorText: {
    color: "red",
    fontSize: 18,
    marginTop: 5,
    textAlign: "center",
    fontWeight: "bold",
  },
});
