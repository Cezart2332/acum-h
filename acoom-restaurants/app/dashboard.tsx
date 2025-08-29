import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SecureApiService } from "@/lib/SecureApiService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DashboardScreen() {
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    locationsCount: 0,
    eventsCount: 0,
    loading: true,
  });

  useEffect(() => {
    console.log("🏠 DASHBOARD COMPONENT MOUNTED");
    loadCompanyData();
  }, []);

  useEffect(() => {
    if (company?.id) {
      fetchDashboardStats();
    }
  }, [company?.id]);

  const loadCompanyData = async () => {
    try {
      console.log("🏠 DASHBOARD loadCompanyData called");

      // Check AsyncStorage immediately when dashboard loads
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("🏠 DASHBOARD AsyncStorage keys on load:", allKeys);

      setLoading(true);
      setError(null);

      // First try to get company data from AsyncStorage
      const storedCompany = await AsyncStorage.getItem("company");
      if (storedCompany) {
        const companyData = JSON.parse(storedCompany);
        setCompany(companyData);
        setLoading(false);

        // Also fetch fresh data from API
        const response = await SecureApiService.getProfile();
        if (response.success && response.data) {
          const freshCompanyData = response.data.company || response.data;
          setCompany(freshCompanyData);
          // Update stored data
          await AsyncStorage.setItem(
            "company",
            JSON.stringify(freshCompanyData)
          );
        }
      } else {
        // No stored data, fetch from API
        const response = await SecureApiService.getProfile();
        if (response.success && response.data) {
          const companyData = response.data.company || response.data;
          setCompany(companyData);
          await AsyncStorage.setItem("company", JSON.stringify(companyData));
        } else {
          setError("Nu s-au putut încărca datele companiei");
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading company data:", error);
      setError("Eroare la încărcarea datelor");
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      if (!company?.id) return;
      
      setDashboardStats(prev => ({ ...prev, loading: true }));
      
      // Fetch locations count
      const locationsResponse = await SecureApiService.get(`/companies/${company.id}/locations`);
      const locationsData = locationsResponse?.success ? locationsResponse.data : [];
      const locationsCount = Array.isArray(locationsData) ? locationsData.length : 0;
      
      // Fetch events count  
      const formData = new FormData();
      formData.append('id', company.id.toString());
      const eventsResponse = await SecureApiService.post('/companyevents', formData);
      const eventsData = eventsResponse?.success ? eventsResponse.data : [];
      const eventsCount = Array.isArray(eventsData) ? eventsData.length : 0;
      
      setDashboardStats({
        locationsCount,
        eventsCount,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setDashboardStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleLogout = () => {
    Alert.alert("Deconectare", "Ești sigur că vrei să te deconectezi?", [
      {
        text: "Anulează",
        style: "cancel",
      },
      {
        text: "Deconectare",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureApiService.logout();
            router.replace("/");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert(
              "Eroare",
              "Deconectarea a eșuat. Te rog să încerci din nou."
            );
          }
        },
      },
    ]);
  };
  return (
    <LinearGradient colors={["#000000", "#0F0F0F"]} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: "Panou Principal",
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
          {loading ? (
            // Loading State
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 100,
              }}
            >
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={{ color: "#B8B8B8", marginTop: 16, fontSize: 16 }}>
                Se încarcă datele...
              </Text>
            </View>
          ) : error ? (
            // Error State
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 100,
              }}
            >
              <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
              <Text
                style={{
                  color: "#EF4444",
                  marginTop: 16,
                  fontSize: 18,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                {error}
              </Text>
              <TouchableOpacity
                onPress={loadCompanyData}
                style={{
                  backgroundColor: "#7C3AED",
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginTop: 16,
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "600" }}
                >
                  Încearcă din nou
                </Text>
              </TouchableOpacity>
            </View>
          ) : !company?.isActive ? (
            // Pending Approval State
            <View style={{ flex: 1 }}>
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
                  Bine ai venit, {company?.name}!
                </Text>
                <Text
                  style={{
                    color: "#B8B8B8",
                    fontSize: 16,
                    letterSpacing: 0.3,
                  }}
                >
                  Contul tău este în curs de verificare
                </Text>
              </View>

              {/* Pending Approval Card */}
              <View
                style={{
                  backgroundColor: "#0F0F0F",
                  borderRadius: 20,
                  padding: 24,
                  borderWidth: 2,
                  borderColor: "#F59E0B",
                  elevation: 8,
                  shadowColor: "#F59E0B",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  marginBottom: 24,
                }}
              >
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: "rgba(245, 158, 11, 0.2)",
                      justifyContent: "center",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <Ionicons
                      name="hourglass-outline"
                      size={40}
                      color="#F59E0B"
                    />
                  </View>
                  <Text
                    style={{
                      color: "#F59E0B",
                      fontSize: 22,
                      fontWeight: "700",
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    Cont în Așteptare
                  </Text>
                  <Text
                    style={{
                      color: "#B8B8B8",
                      fontSize: 16,
                      textAlign: "center",
                      lineHeight: 22,
                    }}
                  >
                    Contul tău este în curs de verificare de către echipa
                    noastră. Vei primi o notificare când contul va fi activat.
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: "rgba(245, 158, 11, 0.3)",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color="#F59E0B"
                    />
                    <Text
                      style={{
                        color: "#F59E0B",
                        fontSize: 16,
                        fontWeight: "600",
                        marginLeft: 8,
                      }}
                    >
                      Ce se întâmplă acum?
                    </Text>
                  </View>
                  <Text
                    style={{ color: "#E5E5E5", fontSize: 14, lineHeight: 20 }}
                  >
                    • Verificăm certificatul de înregistrare încărcat{"\n"}•
                    Validăm informațiile companiei{"\n"}• Procesul durează de
                    obicei 1-2 zile lucrătoare
                  </Text>
                </View>
              </View>

              {/* Contact Support Card */}
              <TouchableOpacity
                style={{
                  backgroundColor: "#0F0F0F",
                  borderRadius: 16,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: "#2D1B69",
                  flexDirection: "row",
                  alignItems: "center",
                }}
                onPress={() => {
                  Alert.alert(
                    "Suport",
                    "Pentru întrebări despre procesul de verificare, te rog să ne contactezi la support@acoom.com sau +40 123 456 789",
                    [{ text: "OK" }]
                  );
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: "#2D1B69",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="help-circle" size={22} color="#C4B5FD" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: "600",
                      marginBottom: 2,
                    }}
                  >
                    Ai întrebări?
                  </Text>
                  <Text
                    style={{
                      color: "#B8B8B8",
                      fontSize: 14,
                    }}
                  >
                    Contactează echipa de suport
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          ) : (
            // Active Company - Full Dashboard
            <View>
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
                  Bine ai revenit, {company?.name}!
                </Text>
                <Text
                  style={{
                    color: "#B8B8B8",
                    fontSize: 16,
                    letterSpacing: 0.3,
                  }}
                >
                  Alege ce vrei să gestionezi astăzi
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
                        Gestionează Locații
                      </Text>
                      <Text
                        style={{
                          color: "#B8B8B8",
                          fontSize: 14,
                        }}
                      >
                        Adaugă, editează și gestionează locațiile restaurantului
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#7C3AED"
                    />
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
                        Program • Meniuri • Rezervări
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
                        Gestionează Evenimente
                      </Text>
                      <Text
                        style={{
                          color: "#B8B8B8",
                          fontSize: 14,
                        }}
                      >
                        Creează și gestionează evenimente speciale și promoții
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#10B981"
                    />
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
                        Creează • Programează • Promovează
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
                      {dashboardStats.loading ? "..." : dashboardStats.locationsCount}
                    </Text>
                    <Text
                      style={{
                        color: "#B8B8B8",
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      Locații Active
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
                      {dashboardStats.loading ? "..." : dashboardStats.eventsCount}
                    </Text>
                    <Text
                      style={{
                        color: "#B8B8B8",
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      Evenimente Viitoare
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
                    Deconectare
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
