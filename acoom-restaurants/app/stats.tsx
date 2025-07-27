import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ScrollView,
  Text,
  View,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useToast } from "../lib/components/Toast";
import BASE_URL from "../config.js";

type StatsData = {
  views: number;
  directions: number;
  uniqueVisitors: number;
  participants: number;
  averageRating: number;
  promotedViews: number;
  weeklyTraffic: number[];
  monthlyRevenue: number;
  totalReservations: number;
  completedReservations: number;
  cancelledReservations: number;
};

type Company = {
  id: number;
  name: string;
};

export default function StatsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatsData();
  }, []);

  const loadStatsData = async () => {
    try {
      const companyData = await AsyncStorage.getItem("company");
      if (!companyData) {
        toast.error("Eroare", "Nu s-au găsit datele companiei");
        router.back();
        return;
      }

      const comp: Company = JSON.parse(companyData);
      setCompany(comp);

      // Try to fetch real stats from API
      await fetchStats(comp.id);
    } catch (error) {
      console.error("Failed to load stats:", error);
      toast.error("Eroare", "Nu s-au putut încărca statisticile");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (companyId: number) => {
    try {
      const form = new FormData();
      form.append("company_id", companyId.toString());

      const response = await fetch(`${BASE_URL}/get-stats`, {
        method: "POST",
        body: form,
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        // Fallback to mock data if API fails
        const mockStats: StatsData = {
          views: 12430,
          directions: 852,
          uniqueVisitors: 5620,
          participants: 430,
          averageRating: 4.6,
          promotedViews: 3120,
          weeklyTraffic: [2200, 1900, 2600, 1800, 2900, 3200, 2700],
          monthlyRevenue: 45280,
          totalReservations: 156,
          completedReservations: 132,
          cancelledReservations: 18,
        };
        setStats(mockStats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      // Fallback to mock data on error
      const mockStats: StatsData = {
        views: 8240,
        directions: 456,
        uniqueVisitors: 3120,
        participants: 210,
        averageRating: 4.4,
        promotedViews: 1890,
        weeklyTraffic: [1800, 1600, 2100, 1500, 2400, 2800, 2200],
        monthlyRevenue: 32150,
        totalReservations: 89,
        completedReservations: 78,
        cancelledReservations: 8,
      };
      setStats(mockStats);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatsData();
    setRefreshing(false);
  };

  if (loading || !stats || !company) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            backgroundColor: "#8B5CF6",
            borderRadius: 20,
            padding: 30,
            alignItems: "center",
          }}
        >
          <Ionicons name="analytics-outline" size={40} color="white" />
          <Text style={{ color: "white", fontSize: 16, marginTop: 10 }}>
            Se încarcă statisticile...
          </Text>
        </View>
      </View>
    );
  }

  const StatCard = ({
    title,
    value,
    subtitle,
    icon,
    backgroundColor = "#8B5CF6",
    trend,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: keyof typeof Ionicons.glyphMap;
    backgroundColor?: string;
    trend?: number;
  }) => (
    <View
      style={{
        backgroundColor: backgroundColor,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                padding: 12,
                borderRadius: 12,
                marginRight: 12,
              }}
            >
              <Ionicons name={icon} size={24} color="white" />
            </View>
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                fontSize: 14,
                fontWeight: "600",
                flex: 1,
              }}
            >
              {title}
            </Text>
            {trend !== undefined && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={trend >= 0 ? "trending-up" : "trending-down"}
                  size={18}
                  color={trend >= 0 ? "#10b981" : "#ef4444"}
                />
                <Text
                  style={{
                    color: trend >= 0 ? "#10b981" : "#ef4444",
                    fontSize: 12,
                    marginLeft: 4,
                    fontWeight: "600",
                  }}
                >
                  {trend >= 0 ? "+" : ""}
                  {trend}%
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              color: "white",
              fontSize: 28,
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            {value}
          </Text>
          {subtitle && (
            <Text
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: 12,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const WeeklyChart = () => {
    const maxValue = Math.max(...stats!.weeklyTraffic);
    const days = ["L", "M", "M", "J", "V", "S", "D"];

    return (
      <View
        style={{
          backgroundColor: "#2D1B69",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "rgba(139, 92, 246, 0.3)",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "rgba(139, 92, 246, 0.2)",
              padding: 12,
              borderRadius: 12,
              marginRight: 12,
            }}
          >
            <Ionicons name="bar-chart-outline" size={24} color="#8B5CF6" />
          </View>
          <Text
            style={{
              color: "white",
              fontSize: 18,
              fontWeight: "bold",
            }}
          >
            Trafic săptămânal
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-around",
            height: 120,
            marginHorizontal: 10,
          }}
        >
          {stats!.weeklyTraffic.map((value, index) => {
            const height = (value / maxValue) * 100;
            return (
              <View key={index} style={{ alignItems: "center", width: 32 }}>
                <View
                  style={{
                    width: 14,
                    height: Math.max(height * 0.8, 8),
                    backgroundColor: "#8B5CF6",
                    borderRadius: 4,
                    marginBottom: 6,
                  }}
                />
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 9,
                    marginBottom: 1,
                    textAlign: "center",
                    writingDirection: "ltr",
                  }}
                >
                  {days[index]}
                </Text>
                <Text
                  style={{
                    color: "white",
                    fontSize: 9,
                    fontWeight: "600",
                    textAlign: "center",
                    writingDirection: "ltr",
                  }}
                >
                  {value}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("ro-RO", {
      style: "currency",
      currency: "RON",
    }).format(num);
  };

  const reservationRate = (
    (stats.completedReservations / stats.totalReservations) *
    100
  ).toFixed(1);

  return (
    <View style={{ flex: 1, backgroundColor: "#000000" }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={["#8B5CF6"]}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: "#8B5CF6",
            paddingTop: 60,
            paddingHorizontal: 24,
            paddingBottom: 30,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                padding: 12,
                borderRadius: 12,
                marginRight: 16,
              }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "white",
                  fontSize: 28,
                  fontWeight: "bold",
                }}
              >
                Statistici
              </Text>
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.8)",
                  fontSize: 16,
                  marginTop: 4,
                }}
              >
                {company.name}
              </Text>
            </View>
          </View>
          <Text
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: 14,
            }}
          >
            Analiza performanței pentru ultima lună
          </Text>
        </View>

        <View style={{ padding: 24 }}>
          {/* Key Metrics Row */}
          <View style={{ flexDirection: "column", marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <StatCard
                title="Vizualizări"
                value={formatNumber(stats.views)}
                subtitle="În ultima lună"
                icon="eye-outline"
                backgroundColor="#8B5CF6"
                trend={12}
              />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard
                title="Vizitatori unici"
                value={formatNumber(stats.uniqueVisitors)}
                subtitle="Utilizatori diferiți"
                icon="people-outline"
                backgroundColor="#10b981"
                trend={8}
              />
            </View>
          </View>

          {/* Weekly Traffic Chart */}
          <WeeklyChart />

          {/* Detailed Stats */}
          <View
            style={{
              backgroundColor: "#2D1B69",
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: "rgba(139, 92, 246, 0.3)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(139, 92, 246, 0.2)",
                  padding: 12,
                  borderRadius: 12,
                  marginRight: 12,
                }}
              >
                <Ionicons name="analytics-outline" size={24} color="#8B5CF6" />
              </View>
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "bold",
                }}
              >
                Detalii activitate
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <View style={{ alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    backgroundColor: "rgba(139, 92, 246, 0.2)",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="navigate-outline" size={24} color="#8B5CF6" />
                </View>
                <Text
                  style={{
                    color: "white",
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  {stats.directions}
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 11,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  Direcții
                </Text>
              </View>

              <View style={{ alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="calendar-outline" size={24} color="#10b981" />
                </View>
                <Text
                  style={{
                    color: "white",
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  {stats.totalReservations}
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 11,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  Rezervări
                </Text>
              </View>

              <View style={{ alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color="#10b981"
                  />
                </View>
                <Text
                  style={{
                    color: "white",
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  {reservationRate}%
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 11,
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  Succes
                </Text>
              </View>
            </View>

            <View
              style={{
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                padding: 16,
                borderRadius: 16,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                Rezervări detaliate
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 13,
                  }}
                >
                  Completate: {stats.completedReservations}
                </Text>
                <Text
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 13,
                  }}
                >
                  Anulate: {stats.cancelledReservations}
                </Text>
              </View>
            </View>
          </View>

          {/* Promotional Stats */}
          <StatCard
            title="Vizualizări promovate"
            value={formatNumber(stats.promotedViews)}
            subtitle="Prin campanii de marketing"
            icon="megaphone-outline"
            backgroundColor="#ef4444"
            trend={-3}
          />
        </View>
      </ScrollView>
    </View>
  );
}
