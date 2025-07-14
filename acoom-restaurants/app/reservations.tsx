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
      const response = await fetch(`http://localhost:5000/api/reservation/company/${companyId}`);
      
      if (response.ok) {
        const apiReservations = await response.json();
        
        // Transform API data to match our local format
        const transformedReservations: Reservation[] = apiReservations.map((res: any) => ({
          id: res.id,
          customerName: res.customerName,
          date: new Date(res.reservationDate).toLocaleDateString('ro-RO', { 
            day: 'numeric', 
            month: 'long' 
          }),
          time: res.reservationTime.substring(0, 5), // Extract HH:MM from time string
          people: res.numberOfPeople,
          status: res.status.toLowerCase(),
          specialRequests: res.specialRequests,
          timestamp: new Date(res.reservationDate + 'T' + res.reservationTime).getTime(),
        }));
        
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

  const handleStatusChange = async (id: number, newStatus: Reservation["status"]) => {
    try {
      // Make API call to update reservation status
      const response = await fetch(`http://localhost:5000/api/reservation/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: id,
          status: newStatus.toUpperCase(),
          notes: "",
          cancellationReason: newStatus === "canceled" ? "Anulat de restaurant" : ""
        }),
      });

      if (response.ok) {
        // Update local state
        setReservations((prev) =>
          prev.map((res) => (res.id === id ? { ...res, status: newStatus } : res))
        );
      } else {
        Alert.alert("Eroare", "Nu s-a putut actualiza statusul rezervării");
      }
    } catch (error) {
      Alert.alert("Eroare", "Nu s-a putut actualiza statusul rezervării");
      console.error(error);
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
      <View className="bg-gradient-to-r from-violet-800/40 to-indigo-900/30 rounded-2xl p-5 mb-4 shadow-md shadow-violet-900/20">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-white text-lg font-bold">
              {item.customerName}
            </Text>
            <Text className="text-violet-400 mt-1">
              {item.people} persoană{item.people > 1 ? "e" : ""}
            </Text>
          </View>

          <View
            className={`px-3 py-1 rounded-full border ${
              statusColors[item.status]
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                item.status === "confirmed"
                  ? "text-green-400"
                  : item.status === "pending"
                  ? "text-amber-400"
                  : item.status === "canceled"
                  ? "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {statusText[item.status]}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mb-4 border-b border-violet-900/30 pb-4">
          <View className="items-center">
            <Text className="text-gray-400 text-xs mb-1">Dată</Text>
            <Text className="text-white font-medium">{item.date}</Text>
          </View>

          <View className="items-center">
            <Text className="text-gray-400 text-xs mb-1">Ora</Text>
            <Text className="text-white font-medium">{item.time}</Text>
          </View>

          <View className="items-center">
            <Text className="text-gray-400 text-xs mb-1">ID</Text>
            <Text className="text-violet-300 font-medium">#{item.id}</Text>
          </View>
        </View>

        {item.specialRequests && (
          <View className="mb-4">
            <Text className="text-gray-400 text-xs mb-1">Cerințe speciale</Text>
            <Text className="text-white italic">{item.specialRequests}</Text>
          </View>
        )}

        {item.status === "pending" && (
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => handleStatusChange(item.id, "confirmed")}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-700 py-3 rounded-xl items-center flex-row justify-center"
            >
              <Ionicons name="checkmark" size={18} color="white" />
              <Text className="text-white font-medium ml-2">Confirmă</Text>
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
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => handleStatusChange(item.id, "completed")}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 py-3 rounded-xl items-center flex-row justify-center"
            >
              <Ionicons name="checkmark-done" size={18} color="white" />
              <Text className="text-white font-medium ml-2">Finalizează</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleStatusChange(item.id, "canceled")}
              className="flex-1 bg-gradient-to-r from-red-600 to-rose-700 py-3 rounded-xl items-center flex-row justify-center"
            >
              <Ionicons name="close" size={18} color="white" />
              <Text className="text-white font-medium ml-2">Anulează</Text>
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
      <SafeAreaView className="flex-1 bg-[#0F0817] items-center justify-center">
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0F0817]">
      {/* Header with Gradient */}
      <View className="bg-gradient-to-b from-violet-900/90 to-violet-800/70 px-5 pb-4 pt-2 rounded-b-[40px] shadow-lg shadow-violet-900/50">
        <View className="flex-row justify-between items-center py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-violet-800/50 p-2 rounded-full"
          >
            <Ionicons name="arrow-back" size={22} color="#d8b4fe" />
          </TouchableOpacity>

          <Text className="text-xl font-bold text-white">Rezervări</Text>

          <TouchableOpacity
            className="bg-violet-800/50 p-2 rounded-full"
            onPress={fetchReservations}
          >
            <Ionicons name="refresh" size={22} color="#d8b4fe" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchReservations}
            colors={["#7c3aed"]}
            tintColor="#7c3aed"
          />
        }
      >
        <View className="px-5 pb-10">
          {/* Stats Overview */}
          <View className="flex-row justify-between mb-6">
            <View className="bg-gradient-to-br from-violet-800/50 to-indigo-900/40 p-4 rounded-2xl flex-1 mr-2 shadow-md shadow-violet-900/20">
              <Text className="text-center text-violet-300 text-xs font-medium">
                Total
              </Text>
              <Text className="text-center text-white text-xl font-bold mt-1">
                {reservations.length}
              </Text>
            </View>

            <View className="bg-gradient-to-br from-violet-800/50 to-indigo-900/40 p-4 rounded-2xl flex-1 mx-2 shadow-md shadow-violet-900/20">
              <Text className="text-center text-amber-400 text-xs font-medium">
                În așteptare
              </Text>
              <Text className="text-center text-white text-xl font-bold mt-1">
                {filterReservations("pending").length}
              </Text>
            </View>

            <View className="bg-gradient-to-br from-violet-800/50 to-indigo-900/40 p-4 rounded-2xl flex-1 ml-2 shadow-md shadow-violet-900/20">
              <Text className="text-center text-green-400 text-xs font-medium">
                Confirmate
              </Text>
              <Text className="text-center text-white text-xl font-bold mt-1">
                {filterReservations("confirmed").length}
              </Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6"
          >
            <View className="flex-row space-x-3 pb-1">
              {[
                { id: "all", label: "Toate", color: "bg-violet-600" },
                {
                  id: "pending",
                  label: "În așteptare",
                  color: "bg-amber-600/60",
                },
                {
                  id: "confirmed",
                  label: "Confirmate",
                  color: "bg-green-600/60",
                },
                {
                  id: "completed",
                  label: "Finalizate",
                  color: "bg-blue-600/60",
                },
                { id: "canceled", label: "Anulate", color: "bg-red-600/60" },
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => setActiveFilter(filter.id as any)}
                  className={`px-4 py-2 rounded-full ${filter.color} ${
                    activeFilter === filter.id
                      ? "border-2 border-violet-300"
                      : ""
                  }`}
                >
                  <Text className="text-white font-medium">
                    {filter.label}{" "}
                    {filterCounts[filter.id as keyof typeof filterCounts]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Reservations List */}
          {filteredReservations.length === 0 ? (
            <View className="items-center py-10">
              <View className="bg-violet-900/30 p-6 rounded-full mb-6">
                <Ionicons name="calendar-outline" size={50} color="#a78bfa" />
              </View>
              <Text className="text-violet-300 text-lg font-medium mb-1">
                Nicio rezervare înregistrată
              </Text>
              <Text className="text-gray-500 text-center px-10">
                Rezervările clienților vor apărea aici
              </Text>

              <TouchableOpacity
                className="mt-6 bg-gradient-to-r from-violet-700 to-indigo-800 px-6 py-3 rounded-xl"
                onPress={fetchReservations}
              >
                <Text className="text-white font-medium">Reîncarcă</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-lg font-bold text-violet-300 mb-4">
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
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
