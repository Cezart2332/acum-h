import React, { use, useState } from "react";
import { Image } from "react-native";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { jsx } from "react/jsx-runtime";

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Register"
>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

export default function RegisterScreen({ navigation }: Props) {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secure, setSecure] = useState(true);
  const [error, setError] = React.useState(false);
  const defaultImage = require("../assets/default.jpg");

  const onRegister = async () => {
    const { uri: defaultUri } = Image.resolveAssetSource(defaultImage);

    if (
      username.trim() === "" ||
      firstName.trim() === "" ||
      lastName.trim() === "" ||
      email.trim() === ""
    ) {
      setError(true);
      return;
    } else {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("firstname", firstName);
      formData.append("lastname", lastName);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("default", {
        uri: defaultUri,
        name: "default.jpg",
        type: "image/jpg",
      } as any);

      const Register = {
        method: "POST",
        body: formData,
      };
      const response = await fetch("http://172.20.10.2:5298/users", Register);
      const data = await response.json();
      await AsyncStorage.setItem("user", JSON.stringify(data));
      await AsyncStorage.setItem("loggedIn", JSON.stringify(true));
      navigation.replace("Home");
    }
  };

  return (
    <TouchableWithoutFeedback onPressIn={() => Keyboard.dismiss()}>
      <LinearGradient colors={["#000e4a", "#1e3c72"]} style={styles.gradient}>
        <SafeAreaView style={styles.container}>
          <Text style={styles.title}>Înregistrare</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#555"
                style={styles.icon}
              />
              <TextInput
                placeholder="Usename"
                placeholderTextColor="#888"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                placeholder="First Name"
                placeholderTextColor="#888"
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                placeholder="Last Name"
                placeholderTextColor="#888"
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#555"
                style={styles.icon}
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor="#888"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#555"
                style={styles.icon}
              />
              <TextInput
                placeholder="Parolă"
                placeholderTextColor="#888"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secure}
              />
              <TouchableOpacity
                onPressIn={() => setSecure(!secure)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={secure ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#555"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#555"
                style={styles.icon}
              />
              <TextInput
                placeholder="Confirmă parola"
                placeholderTextColor="#888"
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={true}
              />
            </View>

            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={onRegister}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#4900ff", "#743ad5"]}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Înregistrează-te</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerInfo}>Ai deja cont?</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                <Text style={styles.footerLink}> Autentifică-te</Text>
              </TouchableOpacity>
            </View>
            {error ? (
              <Text style={styles.errorText}>
                Trebuie sa completezi toate campurile
              </Text>
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
    paddingHorizontal: 20,
  },
  title: { fontSize: 36, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  icon: { marginRight: 5 },
  input: {
    flex: 1,
    height: Platform.OS === "ios" ? 40 : 45,
    color: "#333",
    paddingVertical: 5,
  },
  eyeIcon: { padding: 5 },
  buttonContainer: {
    marginTop: 10,
    width: "100%",
    borderRadius: 15,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 15,
  },
  buttonText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 15 },
  footerInfo: { color: "#555" },
  footerLink: { color: "#4900ff", fontWeight: "bold", marginLeft: 5 },
  errorText: {
    color: "red",
    fontSize: 18,
    marginTop: 5,
    textAlign: "center",
    fontWeight: "bold",
  },
});
