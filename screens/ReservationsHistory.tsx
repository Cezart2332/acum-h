import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import {
  getShadow,
  hapticFeedback,
  TYPOGRAPHY,
  getResponsiveSpacing,
  SCREEN_DIMENSIONS,
} from "../utils/responsive";
import { BASE_URL } from "../config";

interface ReservationData {
  id: number;
  userId: number;
  companyId: number;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  reservationDate: string;
  reservationTime: string;
  numberOfPeople: number;
  status: "Pending" | "Confirmed" | "Canceled" | "Completed";
  specialRequests?: string;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  canceledAt?: string;
  cancellationReason?: string;
  notes?: string;
}

const ReservationsHistory: React.FC<{ navigation?: any }> = ({
  navigation,
}) => {
  const { theme } = useTheme();
  const { user } = useUser();
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "Pending" | "Confirmed" | "Canceled" | "Completed"
  >("all");

  // Animation refs for smooth interactions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;

  const styles = createStyles(theme);

  useEffect(() => {
    loadReservations();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.sequence([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(cardsOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const loadReservations = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/reservation/user/${user.id}`);
      if (response.ok) {
        const data = await response.json();

        // Transform status from enum integers to strings
        const transformedData = data.map((reservation: any) => {
          const statusMap: { [key: number]: string } = {
            0: "pending",
            1: "confirmed",
            2: "completed",
            3: "canceled",
            4: "noshow",
          };

          return {
            ...reservation,
            status: statusMap[reservation.status] || "pending",
          };
        });

        setReservations(transformedData);
      } else {
        console.error("Failed to load reservations");
        Alert.alert("Error", "Could not load reservations.");
      }
    } catch (error) {
      console.error("Error loading reservations:", error);
      Alert.alert("Error", "An error occurred while loading reservations.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticFeedback("light");
    await loadReservations();
    setRefreshing(false);
  }, []);

  const getStatusConfig = (status: string | undefined) => {
    if (!status) {
      return {
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.textSecondary + "15",
        icon: "help-circle-outline",
        text: "Unknown",
      };
    }

    switch (status.toLowerCase()) {
      case "pending":
        return {
          color: "#FF9500",
          backgroundColor: "#FF950015",
          icon: "time-outline",
          text: "Pending",
        };
      case "confirmed":
        return {
          color: "#34C759",
          backgroundColor: "#34C75915",
          icon: "checkmark-circle-outline",
          text: "Confirmed",
        };
      case "completed":
        return {
          color: "#007AFF",
          backgroundColor: "#007AFF15",
          icon: "checkmark-done-outline",
          text: "Completed",
        };
      case "canceled":
        return {
          color: "#FF3B30",
          backgroundColor: "#FF3B3015",
          icon: "close-circle-outline",
          text: "Canceled",
        };
      default:
        return {
          color: theme.colors.textSecondary,
          backgroundColor: theme.colors.textSecondary + "15",
          icon: "help-circle-outline",
          text: "Unknown",
        };
    }
  };

  const handleCancelReservation = async (reservationId: number) => {
    hapticFeedback("medium");
    Alert.alert(
      "Cancel Reservation",
      "Are you sure you want to cancel this reservation?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const formData = new FormData();
              formData.append("status", "Canceled");
              formData.append("cancellationReason", "Canceled by user");

              const response = await fetch(
                `${BASE_URL}/reservation/${reservationId}`,
                {
                  method: "PUT",
                  body: formData,
                }
              );

              if (response.ok) {
                hapticFeedback("medium");
                Alert.alert("Success", "Reservation canceled successfully.");
                loadReservations();
              } else {
                Alert.alert("Error", "Could not cancel the reservation.");
              }
            } catch (error) {
              console.error("Error canceling reservation:", error);
              Alert.alert(
                "Error",
                "An error occurred while canceling the reservation."
              );
            }
          },
        },
      ]
    );
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (filter === "all") return true;
    if (!reservation.status) return false;
    return reservation.status.toLowerCase() === filter.toLowerCase();
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // HH:MM format
  };

  const renderFilterButton = (filterValue: typeof filter, label: string) => {
    const isActive = filter === filterValue;
    return (
      <TouchableOpacity
        style={[
          styles.filterChip,
          isActive && styles.filterChipActive,
          !isActive && { backgroundColor: theme.colors.card },
        ]}
        onPress={() => {
          hapticFeedback("light");
          setFilter(filterValue);
        }}
        activeOpacity={0.8}
      >
        {isActive && (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.filterGradient}
          />
        )}
        <Text
          style={[
            styles.filterChipText,
            {
              color: isActive ? "#FFFFFF" : theme.colors.textSecondary,
              fontWeight: isActive ? "700" : "600",
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderReservationItem = ({
    item,
    index,
  }: {
    item: ReservationData;
    index: number;
  }) => {
    const statusConfig = getStatusConfig(item.status);
    const animationDelay = index * 100;

    return (
      <Animated.View
        style={[
          styles.modernCard,
          {
            opacity: cardsOpacity,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 30],
                  outputRange: [0, 30],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.restaurantSection}>
            <View style={styles.restaurantIconContainer}>
              <Ionicons
                name="restaurant-outline"
                size={20}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{item.companyName}</Text>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateChip}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.dateChipText}>
                    {formatDate(item.reservationDate)}
                  </Text>
                </View>
                <View style={styles.timeChip}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={theme.colors.accent}
                  />
                  <Text style={styles.timeChipText}>
                    {formatTime(item.reservationTime)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusConfig.backgroundColor,
                borderColor: statusConfig.color + "40",
              },
            ]}
          >
            <Ionicons
              name={statusConfig.icon as any}
              size={14}
              color={statusConfig.color}
            />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="people-outline"
                size={16}
                color={theme.colors.primary}
              />
            </View>
            <Text style={styles.detailText}>
              {item.numberOfPeople}{" "}
              {item.numberOfPeople === 1 ? "Guest" : "Guests"}
            </Text>
          </View>

          {item.specialRequests && (
            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color={theme.colors.accent}
                />
              </View>
              <Text style={styles.detailText} numberOfLines={2}>
                {item.specialRequests}
              </Text>
            </View>
          )}

          <View style={styles.detailItem}>
            <View style={styles.detailIcon}>
              <Ionicons
                name="person-outline"
                size={16}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text style={styles.detailText}>{item.customerName}</Text>
          </View>
        </View>

        {item.status && item.status.toLowerCase() === "pending" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelReservation(item.id)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#FF3B30", "#FF6B6B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cancelGradient}
            >
              <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.cancelButtonText}>Cancel Reservation</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

        <Animated.View
          style={[styles.headerGradient, { opacity: headerOpacity }]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity
                onPress={() => {
                  hapticFeedback("light");
                  navigation?.goBack();
                }}
                style={styles.backButtonModern}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Reservations</Text>
                <Text style={styles.headerSubtitle}>Your booking history</Text>
              </View>

              <View style={styles.headerSpacer} />
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading your reservations...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

      {/* Modern Header with Gradient */}
      <Animated.View
        style={[styles.headerGradient, { opacity: headerOpacity }]}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => {
                hapticFeedback("light");
                navigation?.goBack();
              }}
              style={styles.backButtonModern}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Reservations</Text>
              <Text style={styles.headerSubtitle}>Your booking history</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Modern Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
          bounces={false}
        >
          {renderFilterButton("all", "All")}
          {renderFilterButton("Pending", "Pending")}
          {renderFilterButton("Confirmed", "Confirmed")}
          {renderFilterButton("Completed", "Completed")}
          {renderFilterButton("Canceled", "Canceled")}
        </ScrollView>

        {/* Reservations List */}
        {filteredReservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="calendar-outline"
                size={40}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === "all"
                ? "No reservations yet"
                : `No ${filter.toLowerCase()} reservations`}
            </Text>
            <Text style={styles.emptySubtitle}>
              When you make a reservation, it will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredReservations}
            renderItem={renderReservationItem}
            keyExtractor={(item, index) =>
              item.id?.toString() || index.toString()
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            bounces={true}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
                progressBackgroundColor={theme.colors.surface}
              />
            }
          />
        )}
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Modern Header Styles
    headerGradient: {
      height: 120,
      paddingTop: Platform.OS === "ios" ? 50 : 20,
    },
    gradient: {
      flex: 1,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getResponsiveSpacing("lg"),
      paddingTop: getResponsiveSpacing("sm"),
      paddingBottom: getResponsiveSpacing("lg"),
    },
    backButtonModern: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTextContainer: {
      flex: 1,
      marginLeft: getResponsiveSpacing("lg"),
    },
    headerTitle: {
      fontSize: TYPOGRAPHY.h2,
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: 2,
    },
    headerSubtitle: {
      fontSize: TYPOGRAPHY.body,
      color: "rgba(255,255,255,0.8)",
      fontWeight: "500",
    },
    headerSpacer: {
      width: 40,
    },

    // Content Container
    contentContainer: {
      flex: 1,
    },

    // Loading Styles
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: getResponsiveSpacing("xl"),
    },
    loadingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      padding: getResponsiveSpacing("xxl"),
      alignItems: "center",
      gap: getResponsiveSpacing("lg"),
      ...getShadow(8),
      elevation: 8,
    },
    loadingText: {
      fontSize: TYPOGRAPHY.h4,
      fontWeight: "600",
      color: theme.colors.text,
      textAlign: "center",
    },

    // Filter Styles
    filterContainer: {
      paddingHorizontal: getResponsiveSpacing("xs"),
      paddingVertical: getResponsiveSpacing("xs"),
      maxHeight: 200,
      gap: getResponsiveSpacing("xs"),
    },
    filterChip: {
      paddingHorizontal: getResponsiveSpacing("lg"),
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 0,
      ...getShadow(1),
      elevation: 1,
      borderWidth: 1,
      borderColor: theme.colors.border + "30",
    },
    filterChipActive: {
      borderRadius: 16,
      ...getShadow(4),
      elevation: 4,
    },
    filterGradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    filterChipText: {
      fontSize: TYPOGRAPHY.caption,
      textAlign: "center",
      letterSpacing: 0.3,
      fontWeight: "600",
    },

    // List Styles
    listContainer: {
      paddingHorizontal: getResponsiveSpacing("lg"),
      paddingBottom: getResponsiveSpacing("xxl"),
    },

    // Modern Card Styles
    modernCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: getResponsiveSpacing("sm"),
      marginBottom: getResponsiveSpacing("sm"),
      ...getShadow(2),
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border + "30",
    },

    // Card Header
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: getResponsiveSpacing("sm"),
    },
    restaurantSection: {
      flexDirection: "row",
      flex: 1,
      alignItems: "flex-start",
    },
    restaurantIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
      marginRight: getResponsiveSpacing("xs"),
    },
    restaurantDetails: {
      flex: 1,
    },
    restaurantName: {
      fontSize: TYPOGRAPHY.h4,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: getResponsiveSpacing("xs"),
    },
    dateTimeRow: {
      flexDirection: "row",
      gap: getResponsiveSpacing("sm"),
      flexWrap: "wrap",
    },
    dateChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primary + "15",
      paddingHorizontal: getResponsiveSpacing("sm"),
      paddingVertical: getResponsiveSpacing("xs"),
      borderRadius: 8,
      gap: getResponsiveSpacing("xs"),
    },
    dateChipText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    timeChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.accent + "15",
      paddingHorizontal: getResponsiveSpacing("sm"),
      paddingVertical: getResponsiveSpacing("xs"),
      borderRadius: 8,
      gap: getResponsiveSpacing("xs"),
    },
    timeChipText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      color: theme.colors.accent,
    },

    // Status Badge
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: getResponsiveSpacing("sm"),
      paddingVertical: getResponsiveSpacing("xs"),
      borderRadius: 12,
      gap: getResponsiveSpacing("xs"),
      borderWidth: 1,
    },
    statusText: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },

    // Card Divider
    cardDivider: {
      height: 1,
      backgroundColor: theme.colors.border + "40",
      marginBottom: getResponsiveSpacing("md"),
    },

    // Card Details
    cardDetails: {
      gap: getResponsiveSpacing("sm"),
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: getResponsiveSpacing("sm"),
    },
    detailIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border + "30",
    },
    detailText: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      fontWeight: "500",
      color: theme.colors.text,
      lineHeight: 20,
    },

    // Cancel Button
    cancelButton: {
      borderRadius: 12,
      overflow: "hidden",
      marginTop: getResponsiveSpacing("sm"),
      ...getShadow(2),
      elevation: 2,
    },
    cancelGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getResponsiveSpacing("sm"),
      paddingHorizontal: getResponsiveSpacing("md"),
      gap: getResponsiveSpacing("xs"),
    },
    cancelButtonText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: 0.5,
    },

    // Empty State
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: getResponsiveSpacing("xl"),
      paddingVertical: getResponsiveSpacing("xxl"),
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.card,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: getResponsiveSpacing("lg"),
      ...getShadow(2),
      elevation: 2,
    },
    emptyTitle: {
      fontSize: TYPOGRAPHY.h2,
      fontWeight: "700",
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: getResponsiveSpacing("md"),
    },
    emptySubtitle: {
      fontSize: TYPOGRAPHY.body,
      color: theme.colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      fontWeight: "500",
    },
  });

export default ReservationsHistory;
