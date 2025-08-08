import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  SafeAreaView,
  Image,
} from "react-native";
import { Stack, router, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import BASE_URL from "../config";

interface Location {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  tags: string[];
  photo: string;
  menuName: string;
  hasMenu: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function LocationsScreen() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) {
      console.log("LocationsScreen already initialized, skipping...");
      return;
    }
    console.log("LocationsScreen mounted, loading company data...");
    setHasInitialized(true);
    loadCompanyData();
  }, [hasInitialized]);

  const loadCompanyData = async () => {
    console.log("📍 LOCATIONS loadCompanyData called");
    try {
      // Add a small delay to ensure AsyncStorage operations from login are complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // First, let's debug what keys actually exist
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("📍 LOCATIONS - All AsyncStorage keys:", allKeys);

      // CRITICAL: Let's also try to access AsyncStorage in different ways to see if there's a context issue
      console.log("📍 LOCATIONS - Testing AsyncStorage access methods...");

      try {
        // Method 1: Direct getItem calls
        const userData = await AsyncStorage.getItem("user");
        const companyData = await AsyncStorage.getItem("company");
        const loggedInStatus = await AsyncStorage.getItem("loggedIn");

        console.log("📍 LOCATIONS - Method 1 (direct getItem):");
        console.log("userData:", userData ? "EXISTS" : "NULL");
        console.log("companyData:", companyData ? "EXISTS" : "NULL");
        console.log("loggedIn:", loggedInStatus);

        // Method 2: multiGet
        const multiGetResult = await AsyncStorage.multiGet([
          "user",
          "company",
          "loggedIn",
        ]);
        console.log("📍 LOCATIONS - Method 2 (multiGet):", multiGetResult);

        // Method 3: getAllKeys then individual gets
        const allKeys2 = await AsyncStorage.getAllKeys();
        console.log("📍 LOCATIONS - Method 3 (getAllKeys):", allKeys2);

        for (const key of allKeys2) {
          const value = await AsyncStorage.getItem(key);
          console.log(
            `📍 LOCATIONS - Key "${key}":`,
            value ? "HAS_VALUE" : "NULL"
          );
        }
      } catch (accessError) {
        console.error("📍 LOCATIONS - AsyncStorage access error:", accessError);
      }

      // Continue with original logic but with enhanced logging...
      const userData = await AsyncStorage.getItem("user");
      const companyData = await AsyncStorage.getItem("company");
      const loggedInStatus = await AsyncStorage.getItem("loggedIn");

      console.log("📍 LOCATIONS - userData:", userData ? "EXISTS" : "NULL");
      console.log(
        "📍 LOCATIONS - companyData:",
        companyData ? "EXISTS" : "NULL"
      );
      console.log("📍 LOCATIONS - loggedIn:", loggedInStatus);

      // If no data found, let's check all keys for debugging
      if (!userData && !companyData) {
        console.log(
          "LocationsScreen - Debugging: No data found, checking all keys:"
        );
        for (const key of allKeys) {
          const value = await AsyncStorage.getItem(key);
          console.log(
            `  ${key}: ${value ? value.substring(0, 50) + "..." : "null"}`
          );
        }
      }

      // Try user data first, then company data as fallback
      let user = null;
      if (userData) {
        user = JSON.parse(userData);
        console.log("LocationsScreen - parsed user from userData:", user);
      } else if (companyData) {
        user = JSON.parse(companyData);
        console.log("LocationsScreen - parsed user from companyData:", user);
      }

      if (user && (user.Id || user.id)) {
        const userId = user.Id || user.id;
        console.log("LocationsScreen - valid user found, userId:", userId);
        setCompanyId(userId.toString());
        await fetchLocations(userId);
      } else {
        // No valid user data, but let's check if we're actually logged in first
        if (loggedInStatus === "true" || loggedInStatus === '"true"') {
          console.log(
            "LocationsScreen - LoggedIn is true but no user data, waiting and retrying..."
          );
          // Wait a bit more and try again
          await new Promise((resolve) => setTimeout(resolve, 500));

          const retryUserData = await AsyncStorage.getItem("user");
          const retryCompanyData = await AsyncStorage.getItem("company");

          console.log(
            "LocationsScreen - Retry userData:",
            retryUserData ? "EXISTS" : "NULL"
          );
          console.log(
            "LocationsScreen - Retry companyData:",
            retryCompanyData ? "EXISTS" : "NULL"
          );

          let retryUser = null;
          if (retryUserData) {
            retryUser = JSON.parse(retryUserData);
          } else if (retryCompanyData) {
            retryUser = JSON.parse(retryCompanyData);
          }

          if (retryUser && (retryUser.Id || retryUser.id)) {
            const userId = retryUser.Id || retryUser.id;
            console.log("LocationsScreen - retry successful, userId:", userId);
            setCompanyId(userId.toString());
            await fetchLocations(userId);
            return;
          }
        }

        // No valid user data, redirect to login
        console.log(
          "LocationsScreen - No valid user data found, redirecting to login"
        );
        console.log("No valid user data found, redirecting to login");
        router.replace("/login");
      }
    } catch (error) {
      console.error("Error loading company data:", error);
      // On error, redirect to login
      router.replace("/login");
    } finally {
      console.log("LocationsScreen - Setting loading to false");
      setLoading(false);
      console.log("LocationsScreen - Loading should now be false");
    }
  };

  const fetchLocations = async (companyId: number) => {
    console.log("fetchLocations called with companyId:", companyId);
    console.log("BASE_URL:", BASE_URL);
    try {
      const url = `${BASE_URL}/companies/${companyId}/locations`;
      console.log("Fetching locations from:", url);
      const response = await fetch(url);
      console.log("fetchLocations response status:", response.status);

      if (response.ok) {
        const responseText = await response.text();
        if (responseText.trim() === "") {
          // Empty response, use empty array
          setLocations([]);
        } else {
          const data = JSON.parse(responseText);
          console.log("fetchLocations data received:", data);
          setLocations(data);
        }
      } else {
        console.error("Failed to fetch locations, status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        setLocations([]);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      console.error("Error details:", JSON.stringify(error));
      setLocations([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (companyId) {
      await fetchLocations(parseInt(companyId));
    }
    setRefreshing(false);
  };

  const handleDeleteLocation = async (locationId: number) => {
    Alert.alert(
      "Șterge Locația",
      "Ești sigur că vrei să ștergi această locație? Această acțiune nu poate fi anulată.",
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Șterge",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `${BASE_URL}/locations/${locationId}`,
                {
                  method: "DELETE",
                }
              );
              if (response.ok) {
                Alert.alert("Succes", "Locația a fost ștearsă cu succes");
                onRefresh();
              } else {
                Alert.alert("Eroare", "Ștergerea locației a eșuat");
              }
            } catch (error) {
              Alert.alert("Eroare", "A apărut o eroare de rețea");
            }
          },
        },
      ]
    );
  };

  const LocationCard = ({ location }: { location: Location }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/location-profile" as any,
          params: { id: location.id.toString() },
        })
      }
      activeOpacity={0.8}
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        backgroundColor: "#0F0F0F",
        borderWidth: 1,
        borderColor: "#2D1B69",
        overflow: "hidden",
        elevation: 8,
        shadowColor: "#6A0DAD",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}
    >
      <LinearGradient
        colors={["#0F0F0F", "#1A0B2E"]}
        style={{
          padding: 20,
        }}
      >
        {/* Photo Section */}
        {location.photo && (
          <View style={{ marginBottom: 16, alignItems: "center" }}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${location.photo}` }}
              style={{
                width: "100%",
                height: 120,
                borderRadius: 12,
                backgroundColor: "#2D1B69",
              }}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Header Section */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              {location.name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="location-outline" size={14} color="#7C3AED" />
              <Text
                style={{
                  color: "#B8B8B8",
                  fontSize: 14,
                  marginLeft: 6,
                  letterSpacing: 0.2,
                }}
              >
                {location.address}
              </Text>
            </View>

            {/* Tags */}
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {location.tags?.map((tag, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: "#2D1B69",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginRight: 8,
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: "#4C1D95",
                  }}
                >
                  <Text
                    style={{
                      color: "#C4B5FD",
                      fontSize: 11,
                      fontWeight: "500",
                      letterSpacing: 0.3,
                    }}
                  >
                    {tag.trim()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/edit-location" as any,
                  params: { id: location.id.toString() },
                })
              }
              style={{
                backgroundColor: "#2D1B69",
                width: 40,
                height: 40,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 8,
                borderWidth: 1,
                borderColor: "#4C1D95",
              }}
            >
              <Ionicons name="pencil" size={18} color="#7C3AED" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteLocation(location.id)}
              style={{
                backgroundColor: "#2D1421",
                width: 40,
                height: 40,
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#7F1D1D",
              }}
            >
              <Ionicons name="trash" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Section */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: "#2D1B69",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: location.hasMenu ? "#10B981" : "#6B7280",
                marginRight: 8,
              }}
            />
            <Text
              style={{
                color: location.hasMenu ? "#10B981" : "#9CA3AF",
                fontSize: 13,
                fontWeight: "500",
                letterSpacing: 0.2,
              }}
            >
              {location.hasMenu ? "Meniu Disponibil" : "Fără Meniu"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push(`/location-hours?id=${location.id}` as any)
            }
            style={{
              backgroundColor: "#2D1B69",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#4C1D95",
            }}
          >
            <Text
              style={{
                color: "#C4B5FD",
                fontSize: 13,
                fontWeight: "600",
                letterSpacing: 0.3,
              }}
            >
              Program
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <Stack.Screen
          options={{
            title: "Locations",
            headerStyle: { backgroundColor: "#0F0F0F" },
            headerTintColor: "#FFFFFF",
            headerTitleStyle: { fontWeight: "700", fontSize: 18 },
            headerShadowVisible: false,
          }}
        />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              borderWidth: 3,
              borderColor: "#2D1B69",
              borderTopColor: "#7C3AED",
              marginBottom: 16,
            }}
          />
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 16,
              fontWeight: "500",
              letterSpacing: 0.5,
            }}
          >
            Se încarcă locațiile...
          </Text>
        </View>
      </LinearGradient>
    );
  }

  try {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
        <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
          <Stack.Screen
            options={{
              title: "Locațiile Mele",
              headerStyle: { backgroundColor: "#0F0F0F" },
              headerTintColor: "#FFFFFF",
              headerTitleStyle: { fontWeight: "700", fontSize: 18 },
              headerShadowVisible: false,
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => {
                    console.log("Add Location button pressed");
                    router.push("/add-location" as any);
                  }}
                  style={{
                    backgroundColor: "#7C3AED",
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                    elevation: 4,
                    shadowColor: "#7C3AED",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
                >
                  <Ionicons name="add" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              ),
            }}
          />

          <ScrollView
            style={{ flex: 1 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#7C3AED"
                colors={["#7C3AED"]}
                progressBackgroundColor="#0F0F0F"
              />
            }
          >
            <View style={{ paddingTop: 24 }}>
              {locations.length === 0 ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingVertical: 80,
                    paddingHorizontal: 32,
                  }}
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: "#1A0B2E",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 24,
                      borderWidth: 2,
                      borderColor: "#2D1B69",
                    }}
                  >
                    <Ionicons
                      name="location-outline"
                      size={40}
                      color="#7C3AED"
                    />
                  </View>

                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 22,
                      fontWeight: "700",
                      marginBottom: 8,
                      textAlign: "center",
                      letterSpacing: 0.5,
                    }}
                  >
                    Nu există locații încă
                  </Text>

                  <Text
                    style={{
                      color: "#B8B8B8",
                      fontSize: 16,
                      textAlign: "center",
                      lineHeight: 24,
                      marginBottom: 32,
                      letterSpacing: 0.2,
                    }}
                  >
                    Adaugă prima ta locație pentru a începe să îți gestionezi
                    prezența comercială
                  </Text>

                  <TouchableOpacity
                    onPress={() => {
                      console.log("Add Location button pressed");
                      router.push("/add-location" as any);
                    }}
                    style={{
                      backgroundColor: "#7C3AED",
                      paddingHorizontal: 32,
                      paddingVertical: 16,
                      borderRadius: 16,
                      elevation: 8,
                      shadowColor: "#7C3AED",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 16,
                        fontWeight: "700",
                        letterSpacing: 0.5,
                      }}
                    >
                      Adaugă Locație
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginHorizontal: 16,
                      marginBottom: 24,
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 26,
                        fontWeight: "700",
                        letterSpacing: 0.5,
                      }}
                    >
                      Locațiile Tale
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#2D1B69",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#4C1D95",
                      }}
                    >
                      <Text
                        style={{
                          color: "#C4B5FD",
                          fontSize: 14,
                          fontWeight: "600",
                          letterSpacing: 0.3,
                        }}
                      >
                        {locations.length} location
                        {locations.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  {locations.map((location) => (
                    <LocationCard key={location.id} location={location} />
                  ))}

                  {/* Add Location Button for when locations exist */}
                  <View
                    style={{
                      marginHorizontal: 16,
                      marginTop: 8,
                      marginBottom: 80,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        console.log("Add Another Location button pressed");
                        router.push("/add-location" as any);
                      }}
                      style={{
                        backgroundColor: "#2D1B69",
                        paddingVertical: 16,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: "#4C1D95",
                        borderStyle: "dashed",
                        justifyContent: "center",
                        alignItems: "center",
                        elevation: 4,
                        shadowColor: "#7C3AED",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                      }}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={24}
                          color="#C4B5FD"
                        />
                        <Text
                          style={{
                            color: "#C4B5FD",
                            fontSize: 16,
                            fontWeight: "600",
                            marginLeft: 8,
                            letterSpacing: 0.3,
                          }}
                        >
                          Add Another Location
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  } catch (error) {
    console.error("LocationsScreen - Render error:", error);
    return (
      <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#2D1421",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 24,
              borderWidth: 2,
              borderColor: "#7F1D1D",
            }}
          >
            <Ionicons name="warning-outline" size={40} color="#EF4444" />
          </View>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Error loading locations
          </Text>
          <Text
            style={{
              color: "#B8B8B8",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {String(error)}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/locations")}
            style={{
              backgroundColor: "#7C3AED",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }
}
