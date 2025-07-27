import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DashboardScreen() {
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("loggedIn");
            router.replace("/");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };
  return (
    <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Dashboard",
          headerShown: true,
          headerStyle: { backgroundColor: "#0F0F0F" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.3)",
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
          {/* Welcome Section */}
          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 28,
                fontWeight: "700",
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              Welcome Back!
            </Text>
            <Text
              style={{
                color: "#B8B8B8",
                fontSize: 16,
                letterSpacing: 0.3,
              }}
            >
              Choose what you'd like to manage today
            </Text>
          </View>

          {/* Management Options */}
          <View style={{ gap: 20 }}>
            {/* Manage Locations Card */}
            <TouchableOpacity
              style={{
                backgroundColor: "#0F0F0F",
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: "#2D1B69",
                elevation: 8,
                shadowColor: "#6A0DAD",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              }}
              onPress={() => router.push("/locations")}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 12,
                    backgroundColor: "#2D1B69",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="location" size={24} color="#C4B5FD" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 20,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    Manage Locations
                  </Text>
                  <Text
                    style={{
                      color: "#B8B8B8",
                      fontSize: 14,
                    }}
                  >
                    Add, edit, and manage your restaurant locations
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: "#1A0B2E",
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#C4B5FD",
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    Features
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#B8B8B8",
                      fontSize: 11,
                    }}
                  >
                    Hours • Menus • Reservations
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Manage Events Card */}
            <TouchableOpacity
              style={{
                backgroundColor: "#0F0F0F",
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: "#1F2937",
                elevation: 8,
                shadowColor: "#10B981",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
              }}
              onPress={() => router.push("./events")}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 12,
                    backgroundColor: "#1A3A2E",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="calendar" size={24} color="#6EE7B7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 20,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    Manage Events
                  </Text>
                  <Text
                    style={{
                      color: "#B8B8B8",
                      fontSize: 14,
                    }}
                  >
                    Create and manage special events and promotions
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#10B981" />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  backgroundColor: "#0F1419",
                  padding: 12,
                  borderRadius: 12,
                }}
              >
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#6EE7B7",
                      fontSize: 12,
                      fontWeight: "500",
                    }}
                  >
                    Features
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#B8B8B8",
                      fontSize: 11,
                    }}
                  >
                    Create • Schedule • Promote
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Quick Stats */}
          <View style={{ marginTop: 32 }}>
            <Text
              style={{
                color: "#C4B5FD",
                fontSize: 18,
                fontWeight: "600",
                marginBottom: 16,
              }}
            >
              Quick Overview
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(45, 27, 105, 0.2)",
                  borderWidth: 1,
                  borderColor: "rgba(124, 58, 237, 0.3)",
                  borderRadius: 16,
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Ionicons name="location" size={24} color="#7C3AED" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 20,
                    fontWeight: "bold",
                    marginTop: 8,
                  }}
                >
                  3
                </Text>
                <Text
                  style={{
                    color: "#B8B8B8",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  Active Locations
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(26, 58, 46, 0.2)",
                  borderWidth: 1,
                  borderColor: "rgba(16, 185, 129, 0.3)",
                  borderRadius: 16,
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Ionicons name="calendar" size={24} color="#10B981" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 20,
                    fontWeight: "bold",
                    marginTop: 8,
                  }}
                >
                  5
                </Text>
                <Text
                  style={{
                    color: "#B8B8B8",
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  Upcoming Events
                </Text>
              </View>
            </View>
          </View>

          {/* Logout Section */}
          <View style={{ marginTop: 32, marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.3)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text
                style={{
                  color: "#EF4444",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 12,
                }}
              >
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
