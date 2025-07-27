import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BASE_URL from "@/config";

type Reservation = {
  id: number;
  customerName: string;
  date: string;
  time: string;
  people: number;
  status: "confirmed" | "pending" | "canceled" | "completed";
  specialRequests?: string;
  timestamp?: number; // Added for sorting
};

export default function Reservations() {
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | Reservation["status"]
  >("all");

  // Fetch company ID
  useEffect(() => {
    const getCompany = async () => {
      const raw = await AsyncStorage.getItem("company");
      if (raw) {
        const company = JSON.parse(raw);
        setCompanyId(company.id);
      }
    };
    getCompany();
  }, []);

  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    if (!companyId) return;

    setRefreshing(true);
    try {
      // Make API call to fetch reservations
      const response = await fetch(
        `${BASE_URL}/reservation/company/${companyId}`
      );

      if (response.ok) {
        const responseText = await response.text();
        if (responseText.trim() === "") {
          // Empty response, use empty array
          setReservations([]);
          return;
        }

        const apiReservations = JSON.parse(responseText);

        // Transform API data to match our local format
        const transformedReservations: Reservation[] = apiReservations.map(
          (res: any) => {
            // Convert enum value to string
            const statusMap: { [key: number]: string } = {
              0: "pending",
              1: "confirmed",
              2: "completed",
              3: "canceled",
              4: "noshow",
            };

            return {
              id: res.id,
              customerName: res.customerName,
              date: new Date(res.reservationDate).toLocaleDateString("ro-RO", {
                day: "numeric",
                month: "long",
              }),
              time: res.reservationTime.substring(0, 5), // Extract HH:MM from time string
              people: res.numberOfPeople,
              status: statusMap[res.status] || "pending",
              specialRequests: res.specialRequests,
              timestamp: new Date(
                res.reservationDate + "T" + res.reservationTime
              ).getTime(),
            };
          }
        );

        setReservations(transformedReservations);
      } else {
        // Fallback to mock data if API fails
        const mockReservations: Reservation[] = [
          {
            id: 1,
            customerName: "Andrei Popescu",
            date: "15 Iunie",
            time: "19:30",
            people: 4,
            status: "confirmed",
            specialRequests: "Masă lângă fereastră",
            timestamp: new Date("2023-06-15T19:30:00").getTime(),
          },
          {
            id: 2,
            customerName: "Maria Ionescu",
            date: "16 Iunie",
            time: "20:00",
            people: 2,
            status: "pending",
            timestamp: new Date("2023-06-16T20:00:00").getTime(),
          },
          {
            id: 3,
            customerName: "Cristian Moldovan",
            date: "17 Iunie",
            time: "13:00",
            people: 6,
            status: "confirmed",
            specialRequests: "Aniversare - tort cu surpriză",
            timestamp: new Date("2023-06-17T13:00:00").getTime(),
          },
          {
            id: 4,
            customerName: "Elena Vasilescu",
            date: "18 Iunie",
            time: "14:30",
            people: 3,
            status: "completed",
            timestamp: new Date("2023-06-18T14:30:00").getTime(),
          },
          {
            id: 5,
            customerName: "Alexandru Georgescu",
            date: "19 Iunie",
            time: "21:00",
            people: 5,
            status: "canceled",
            timestamp: new Date("2023-06-19T21:00:00").getTime(),
          },
        ];
        setReservations(mockReservations);
      }
    } catch (error) {
      Alert.alert("Eroare", "Nu s-au putut încărca rezervările");
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [companyId]);

  useFocusEffect(
    useCallback(() => {
      fetchReservations();
    }, [fetchReservations])
  );

  const handleStatusChange = async (
    id: number,
    newStatus: Reservation["status"]
  ) => {
    try {
      console.log("Updating reservation:", id, "to status:", newStatus);

      // Convert status to Pascal case for backend
      const statusMap = {
        pending: "Pending",
        confirmed: "Confirmed",
        completed: "Completed",
        canceled: "Canceled",
      };

      const backendStatus = statusMap[newStatus];

      // Create URL-encoded body instead of FormData
      const bodyParams = new URLSearchParams();
      bodyParams.append("status", backendStatus);
      bodyParams.append("notes", "");
      if (newStatus === "canceled") {
        bodyParams.append("cancellationReason", "Anulat de restaurant");
      }

      console.log("Sending request to:", `${BASE_URL}/reservation/${id}`);
      console.log("Body contents:", {
        status: backendStatus,
        notes: "",
        cancellationReason:
          newStatus === "canceled" ? "Anulat de restaurant" : undefined,
      });

      const response = await fetch(`${BASE_URL}/reservation/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);

      if (response.ok) {
        const responseData = await response.text();
        console.log("Response data:", responseData);

        // Update local state
        setReservations((prev) =>
          prev.map((res) =>
            res.id === id ? { ...res, status: newStatus } : res
          )
        );

        Alert.alert("Succes", "Statusul rezervării a fost actualizat");
      } else {
        const errorText = await response.text();
        console.log("Error response:", errorText);
        Alert.alert(
          "Eroare",
          `Nu s-a putut actualiza statusul rezervării. Status: ${response.status}`
        );
      }
    } catch (error) {
      console.error("Network error:", error);
      Alert.alert(
        "Eroare",
        "Nu s-a putut actualiza statusul rezervării - eroare de rețea"
      );
    }
  };

  // Sort reservations by status priority and then by timestamp
  const getSortedReservations = (reservations: Reservation[]) => {
    const statusPriority = {
      pending: 0,
      confirmed: 1,
      completed: 2,
      canceled: 3,
    };

    return [...reservations].sort((a, b) => {
      // First sort by status priority
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }

      // Then sort by timestamp (most recent first)
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  };

  // Get filtered and sorted reservations
  const filteredReservations =
    activeFilter === "all"
      ? getSortedReservations(reservations)
      : getSortedReservations(
          reservations.filter((r) => r.status === activeFilter)
        );

  const renderReservation = ({ item }: { item: Reservation }) => {
    const statusColors = {
      confirmed: "bg-green-500/20 border-green-500",
      pending: "bg-amber-500/20 border-amber-500",
      canceled: "bg-red-500/20 border-red-500",
      completed: "bg-blue-500/20 border-blue-500",
    };

    const statusText = {
      confirmed: "Confirmată",
      pending: "În așteptare",
      canceled: "Anulată",
      completed: "Finalizată",
    };

    return (
      <View
        style={{
          backgroundColor: "#312e81", // violet-800/40 equivalent
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          shadowColor: "#7c3aed",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 12,
          }}
        >
          <View>
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
              {item.customerName}
            </Text>
            <Text style={{ color: "#a78bfa", marginTop: 4 }}>
              {item.people} persoană{item.people > 1 ? "e" : ""}
            </Text>
          </View>

          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: statusColors[item.status],
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color:
                  item.status === "confirmed"
                    ? "#4ade80"
                    : item.status === "pending"
                    ? "#fbbf24"
                    : item.status === "canceled"
                    ? "#f87171"
                    : "#60a5fa",
              }}
            >
              {statusText[item.status]}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#312e81",
            paddingBottom: 16,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>
              Dată
            </Text>
            <Text style={{ color: "white", fontWeight: "500" }}>
              {item.date}
            </Text>
          </View>

          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>
              Ora
            </Text>
            <Text style={{ color: "white", fontWeight: "500" }}>
              {item.time}
            </Text>
          </View>

          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>
              ID
            </Text>
            <Text style={{ color: "#c4b5fd", fontWeight: "500" }}>
              #{item.id}
            </Text>
          </View>
        </View>

        {item.specialRequests && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: "#9ca3af", fontSize: 12, marginBottom: 4 }}>
              Cerințe speciale
            </Text>
            <Text style={{ color: "white", fontStyle: "italic" }}>
              {item.specialRequests}
            </Text>
          </View>
        )}

        {item.status === "pending" && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => handleStatusChange(item.id, "confirmed")}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: "#059669", // green-600 equivalent
              }}
            >
              <Ionicons name="checkmark" size={18} color="white" />
              <Text
                style={{ color: "white", fontWeight: "500", marginLeft: 8 }}
              >
                Confirmă
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleStatusChange(item.id, "canceled")}
              className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 py-3 rounded-xl items-center flex-row justify-center"
            >
              <Ionicons name="close" size={18} color="white" />
              <Text className="text-white font-medium ml-2">Respinge</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === "confirmed" && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => handleStatusChange(item.id, "completed")}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: "#2563eb", // blue-600 equivalent
              }}
            >
              <Ionicons name="checkmark-done" size={18} color="white" />
              <Text
                style={{ color: "white", fontWeight: "500", marginLeft: 8 }}
              >
                Finalizează
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleStatusChange(item.id, "canceled")}
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 12,
                borderRadius: 16,
                backgroundColor: "#dc2626", // red-600 equivalent
              }}
            >
              <Ionicons name="close" size={18} color="white" />
              <Text
                style={{ color: "white", fontWeight: "500", marginLeft: 8 }}
              >
                Anulează
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filterReservations = (status: Reservation["status"]) => {
    return reservations.filter((r) => r.status === status);
  };

  const filterCounts = {
    all: reservations.length,
    pending: filterReservations("pending").length,
    confirmed: filterReservations("confirmed").length,
    completed: filterReservations("completed").length,
    canceled: filterReservations("canceled").length,
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#0F0817",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0F0817" }}>
      {/* Header with Gradient */}
      <View
        style={{
          backgroundColor: "#4c1d95", // violet-900/90 equivalent
          paddingHorizontal: 20,
          paddingBottom: 16,
          paddingTop: 8,
          borderBottomLeftRadius: 40,
          borderBottomRightRadius: 40,
          shadowColor: "#7c3aed",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingVertical: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              backgroundColor: "#5b21b6",
              padding: 8,
              borderRadius: 20,
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#d8b4fe" />
          </TouchableOpacity>

          <Text style={{ fontSize: 20, fontWeight: "bold", color: "white" }}>
            Rezervări
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: "#5b21b6",
              padding: 8,
              borderRadius: 20,
            }}
            onPress={fetchReservations}
          >
            <Ionicons name="refresh" size={22} color="#d8b4fe" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, paddingTop: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchReservations}
            colors={["#7c3aed"]}
            tintColor="#7c3aed"
          />
        }
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {/* Stats Overview */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <View
              style={{
                backgroundColor: "#312e81",
                padding: 16,
                borderRadius: 16,
                flex: 1,
                marginRight: 8,
                shadowColor: "#7c3aed",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#c4b5fd",
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                Total
              </Text>
              <Text
                style={{
                  textAlign: "center",
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 4,
                }}
              >
                {reservations.length}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#312e81",
                padding: 16,
                borderRadius: 16,
                flex: 1,
                marginHorizontal: 8,
                shadowColor: "#7c3aed",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#fbbf24",
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                În așteptare
              </Text>
              <Text
                style={{
                  textAlign: "center",
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 4,
                }}
              >
                {filterReservations("pending").length}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#312e81",
                padding: 16,
                borderRadius: 16,
                flex: 1,
                marginLeft: 8,
                shadowColor: "#7c3aed",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <Text
                style={{
                  textAlign: "center",
                  color: "#4ade80",
                  fontSize: 12,
                  fontWeight: "500",
                }}
              >
                Confirmate
              </Text>
              <Text
                style={{
                  textAlign: "center",
                  color: "white",
                  fontSize: 20,
                  fontWeight: "bold",
                  marginTop: 4,
                }}
              >
                {filterReservations("confirmed").length}
              </Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 24 }}
          >
            <View style={{ flexDirection: "row", gap: 12, paddingBottom: 4 }}>
              {[
                { id: "all", label: "Toate", color: "#7c3aed" },
                { id: "pending", label: "În așteptare", color: "#d97706" },
                { id: "confirmed", label: "Confirmate", color: "#059669" },
                { id: "completed", label: "Finalizate", color: "#2563eb" },
                { id: "canceled", label: "Anulate", color: "#dc2626" },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.id as any)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: filter.color,
                    borderWidth: activeFilter === filter.id ? 2 : 0,
                    borderColor:
                      activeFilter === filter.id ? "#c4b5fd" : "transparent",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "500" }}>
                    {filter.label}{" "}
                    {filterCounts[filter.id as keyof typeof filterCounts]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Reservations List */}
          {filteredReservations.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <View
                style={{
                  backgroundColor: "#312e81",
                  padding: 24,
                  borderRadius: 50,
                  marginBottom: 24,
                }}
              >
                <Ionicons name="calendar-outline" size={50} color="#a78bfa" />
              </View>
              <Text
                style={{
                  color: "#c4b5fd",
                  fontSize: 18,
                  fontWeight: "500",
                  marginBottom: 4,
                }}
              >
                Nicio rezervare înregistrată
              </Text>
              <Text
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  paddingHorizontal: 40,
                }}
              >
                Rezervările clienților vor apărea aici
              </Text>

              <TouchableOpacity
                style={{
                  marginTop: 24,
                  backgroundColor: "#5b21b6",
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 16,
                }}
                onPress={fetchReservations}
              >
                <Text style={{ color: "white", fontWeight: "500" }}>
                  Reîncarcă
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "bold",
                  color: "#c4b5fd",
                  marginBottom: 16,
                }}
              >
                {activeFilter === "all"
                  ? `Toate rezervările (${reservations.length})`
                  : `${filteredReservations.length} ${
                      activeFilter === "pending"
                        ? "în așteptare"
                        : activeFilter === "confirmed"
                        ? "confirmate"
                        : activeFilter === "completed"
                        ? "finalizate"
                        : "anulate"
                    }`}
              </Text>

              <FlatList
                data={filteredReservations}
                renderItem={renderReservation}
                keyExtractor={(item, index) =>
                  item.id?.toString() || index.toString()
                }
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
