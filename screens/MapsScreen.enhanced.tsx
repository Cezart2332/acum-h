import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Alert,
  ActivityIndicator,
  Text,
  ImageBackground,
  Platform,
  TouchableOpacity,
  Animated,
  StatusBar,
} from "react-native";
import MapView, {
  Marker,
  Region,
  Callout,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import * as Location from "expo-location";
import haversine from "haversine-distance";
import { cachedFetch } from "../utils/apiCache";
import BASE_URL from "../config";
import { Ionicons } from "@expo/vector-icons";

// Enhanced dark map style with more visual appeal
const ENHANCED_DARK_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#0F0817" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#E0E0FF" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#0F0817" }, { weight: 2 }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2A1A4A" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#6C3AFF" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#4A2D75" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#1A1A2E" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#16213E" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#2D4A3A" }],
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#1A1A1A" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#6C3AFF" }, { weight: 1 }],
  },
];

type MapNav = {
  navigate: (screen: string, params?: any) => void;
};

interface CompanyData {
  id: number;
  name: string;
  category: string;
  profileImage: string;
  latitude: number;
  longitude: number;
  address: string;
  email?: string;
  cui?: number;
  description?: string;
  tags: string[];
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// Enhanced callout content component with beautiful styling
const CalloutContent = React.memo(({
  company,
  distKm,
}: {
  company: CompanyData;
  distKm: string;
}) => (
  <View style={styles.callout}>
    <LinearGradient
      colors={['#6C3AFF', '#9B59B6']}
      style={styles.calloutGradient}
    >
      <View style={styles.calloutImageContainer}>
        <ImageBackground
          source={{
            uri: `data:image/jpg;base64,${company.profileImage}`,
          }}
          style={styles.calloutImage}
          imageStyle={styles.calloutImageStyle}
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.calloutImageOverlay}
          />
          <View style={styles.calloutImageContent}>
            <Text style={styles.calloutTitle} numberOfLines={1}>
              {company.name}
            </Text>
          </View>
        </ImageBackground>
      </View>
      
      <View style={styles.calloutDetails}>
        <View style={styles.calloutRow}>
          <Ionicons name="restaurant" size={14} color="#E0E0FF" />
          <Text style={styles.calloutCategory} numberOfLines={1}>
            {company.category}
          </Text>
        </View>
        
        <View style={styles.calloutRow}>
          <Ionicons name="location" size={14} color="#BB86FC" />
          <Text style={styles.calloutDistance}>{distKm} km</Text>
        </View>
        
        {company.tags && company.tags.length > 0 && (
          <View style={styles.calloutTagsContainer}>
            {company.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={styles.calloutTag}>
                <Text style={styles.calloutTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </LinearGradient>
  </View>
));

// Enhanced custom marker component
const CustomMarker = React.memo(({
  company,
  onPress,
}: {
  company: CompanyData;
  onPress: () => void;
}) => {
  const [markerScale] = useState(new Animated.Value(1));

  const animateMarker = () => {
    Animated.sequence([
      Animated.timing(markerScale, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(markerScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity onPress={() => { animateMarker(); onPress(); }}>
      <Animated.View style={[styles.customMarker, { transform: [{ scale: markerScale }] }]}>
        <LinearGradient
          colors={['#6C3AFF', '#BB86FC']}
          style={styles.markerGradient}
        >
          <View style={styles.markerInner}>
            <Ionicons name="restaurant" size={16} color="#FFFFFF" />
          </View>
        </LinearGradient>
        <View style={styles.markerTail} />
      </Animated.View>
    </TouchableOpacity>
  );
});

// Enhanced cluster marker component
const ClusterMarker = React.memo(({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) => {
  const [scale] = useState(new Animated.Value(1));

  const animateCluster = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableOpacity onPress={() => { animateCluster(); onPress(); }}>
      <Animated.View style={[styles.clusterMarker, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          style={styles.clusterGradient}
        >
          <Text style={styles.clusterText}>{count}</Text>
        </LinearGradient>
        <View style={styles.clusterPulse} />
      </Animated.View>
    </TouchableOpacity>
  );
});

// Simple clustering logic for better performance
const clusterMarkers = (
  companies: CompanyData[],
  region: MapRegion,
  clusterRadius = 50
): (CompanyData | { cluster: boolean; companies: CompanyData[]; coordinate: { latitude: number; longitude: number } })[] => {
  const clustered: any[] = [];
  const processed = new Set<number>();

  for (const company of companies) {
    if (processed.has(company.id)) continue;

    const nearby = companies.filter(other => {
      if (processed.has(other.id) || company.id === other.id) return false;
      
      const distance = haversine(
        { lat: company.latitude, lng: company.longitude },
        { lat: other.latitude, lng: other.longitude }
      );
      
      return distance < clusterRadius * 1000; // Convert to meters
    });

    if (nearby.length > 0) {
      // Create cluster
      nearby.forEach(c => processed.add(c.id));
      processed.add(company.id);
      
      const allCompanies = [company, ...nearby];
      const avgLat = allCompanies.reduce((sum, c) => sum + c.latitude, 0) / allCompanies.length;
      const avgLng = allCompanies.reduce((sum, c) => sum + c.longitude, 0) / allCompanies.length;
      
      clustered.push({
        cluster: true,
        companies: allCompanies,
        coordinate: { latitude: avgLat, longitude: avgLng }
      });
    } else {
      processed.add(company.id);
      clustered.push(company);
    }
  }

  return clustered;
};

// Viewport filtering for better performance
const filterVisibleCompanies = (companies: CompanyData[], region: MapRegion): CompanyData[] => {
  const padding = 0.1; // Add some padding to viewport
  const minLat = region.latitude - region.latitudeDelta / 2 - padding;
  const maxLat = region.latitude + region.latitudeDelta / 2 + padding;
  const minLng = region.longitude - region.longitudeDelta / 2 - padding;
  const maxLng = region.longitude + region.longitudeDelta / 2 + padding;

  return companies.filter(company => 
    company.latitude >= minLat &&
    company.latitude <= maxLat &&
    company.longitude >= minLng &&
    company.longitude <= maxLng
  );
};

export default function MapsScreen({ navigation }: { navigation?: any }) {
  const mapRef = useRef<MapView>(null);
  const { width, height } = Dimensions.get("window");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRegion, setCurrentRegion] = useState<MapRegion | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(100);

  // Animate components on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Memoized location request
  const requestLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permisiunea pentru locație a fost refuzată");
      return null;
    }
    return await Location.getCurrentPositionAsync({});
  }, []);

  // Memoized companies fetch
  const fetchCompanies = useCallback(async () => {
    try {
      const data = await cachedFetch<CompanyData[]>(
        `${BASE_URL}/companies`,
        { ttl: 15 * 60 * 1000 } // 15 minutes cache
      );
      return data;
    } catch (e) {
      console.error("Error fetching companies:", e);
      Alert.alert("Eroare", "Nu s-au putut încărca restaurantele");
      return [];
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    const loadMapData = async () => {
      setLoading(true);
      try {
        const [loc, companiesData] = await Promise.all([
          requestLocationPermission(),
          fetchCompanies(),
        ]);
        
        if (loc) setLocation(loc);
        setCompanies(companiesData);
      } finally {
        setLoading(false);
      }
    };

    loadMapData();
  }, [requestLocationPermission, fetchCompanies]);

  // Memoized initial region
  const initialRegion = useMemo((): MapRegion | undefined => {
    if (!location) return undefined;
    
    const region = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    
    if (!currentRegion) {
      setCurrentRegion(region);
    }
    
    return region;
  }, [location, currentRegion]);

  // Memoized visible companies (filtered and clustered)
  const visibleMarkers = useMemo(() => {
    if (!currentRegion || companies.length === 0) return [];
    
    const visible = filterVisibleCompanies(companies, currentRegion);
    return clusterMarkers(visible, currentRegion);
  }, [companies, currentRegion]);

  // Memoized region change handler
  const handleRegionChange = useCallback((region: MapRegion) => {
    setCurrentRegion(region);
  }, []);

  // Memoized navigation handler
  const handleMarkerPress = useCallback((company: CompanyData) => {
    setSelectedCompany(company);
    if (navigation) {
      navigation.navigate("Info", { company });
    }
  }, [navigation]);

  // Auto-fit to coordinates on data load
  useEffect(() => {
    if (!loading && location && companies.length && mapRef.current) {
      const coords = [
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        ...companies.slice(0, 20).map((c) => ({ // Limit to first 20 for performance
          latitude: c.latitude,
          longitude: c.longitude,
        })),
      ];
      
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          animated: true,
        });
      }, 1000);
    }
  }, [loading, location, companies]);

  if (loading || !location || !initialRegion) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0F0817" />
        <LinearGradient
          colors={['#0F0817', '#1A1A1A', '#6C3AFF20']}
          style={styles.loadingGradient}
        >
          <Animated.View style={[styles.loadingContent, { opacity: fadeAnim }]}>
            <View style={styles.loadingSpinner}>
              <LinearGradient
                colors={['#6C3AFF', '#BB86FC']}
                style={styles.spinnerGradient}
              >
                <ActivityIndicator size="large" color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.loadingText}>Încărcăm harta...</Text>
            <Text style={styles.loadingSubtext}>Găsim cele mai bune restaurante în zona ta</Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0817" />
      
      <Animated.View style={[styles.mapContainer, { opacity: fadeAnim }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          customMapStyle={ENHANCED_DARK_MAP_STYLE}
          initialRegion={initialRegion}
          onRegionChangeComplete={handleRegionChange}
          showsUserLocation={true}
          showsMyLocationButton={false}
          maxZoomLevel={18}
          minZoomLevel={10}
          rotateEnabled={false}
          pitchEnabled={false}
          loadingEnabled={true}
          loadingIndicatorColor="#6C3AFF"
          loadingBackgroundColor="#0F0817"
        >
          {visibleMarkers.map((item, index) => {
            if ((item as any).cluster) {
              const clusterItem = item as any;
              return (
                <Marker
                  key={`cluster-${index}`}
                  coordinate={clusterItem.coordinate}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <ClusterMarker
                    count={clusterItem.companies.length}
                    onPress={() => {
                      // Zoom into cluster
                      mapRef.current?.animateToRegion({
                        ...clusterItem.coordinate,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      });
                    }}
                  />
                  <Callout tooltip={false}>
                    <View style={styles.clusterCallout}>
                      <LinearGradient
                        colors={['#6C3AFF', '#BB86FC']}
                        style={styles.clusterCalloutGradient}
                      >
                        <Text style={styles.clusterCalloutTitle}>
                          {clusterItem.companies.length} restaurante
                        </Text>
                        {clusterItem.companies.slice(0, 3).map((company: CompanyData, idx: number) => (
                          <TouchableOpacity
                            key={company.id}
                            onPress={() => handleMarkerPress(company)}
                            style={styles.clusterItem}
                          >
                            <Text style={styles.clusterItemText}>{company.name}</Text>
                          </TouchableOpacity>
                        ))}
                        {clusterItem.companies.length > 3 && (
                          <Text style={styles.moreText}>
                            +{clusterItem.companies.length - 3} mai multe
                          </Text>
                        )}
                      </LinearGradient>
                    </View>
                  </Callout>
                </Marker>
              );
            }

            // Render single marker
            const company = item as CompanyData;
            const distKm = location ? (
              haversine(
                { lat: location.coords.latitude, lng: location.coords.longitude },
                { lat: company.latitude, lng: company.longitude }
              ) / 1000
            ).toFixed(1) : "0.0";

            return (
              <Marker
                key={company.id}
                coordinate={{
                  latitude: company.latitude,
                  longitude: company.longitude,
                }}
                anchor={{ x: 0.5, y: 1 }}
              >
                <CustomMarker
                  company={company}
                  onPress={() => handleMarkerPress(company)}
                />
                <Callout
                  tooltip={Platform.OS === "ios"}
                  style={Platform.OS === "android" ? styles.androidCallout : undefined}
                  onPress={() => handleMarkerPress(company)}
                >
                  {Platform.OS === "android" ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleMarkerPress(company)}
                    >
                      <CalloutContent company={company} distKm={distKm} />
                    </TouchableOpacity>
                  ) : (
                    <CalloutContent company={company} distKm={distKm} />
                  )}
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      </Animated.View>

      {/* Custom Location Button */}
      <Animated.View 
        style={[
          styles.customLocationButton,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            if (location && mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            }
          }}
          style={styles.locationButton}
        >
          <LinearGradient
            colors={['#6C3AFF', '#BB86FC']}
            style={styles.locationButtonGradient}
          >
            <Ionicons name="location" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Performance stats (development only) */}
      {__DEV__ && (
        <Animated.View 
          style={[
            styles.debugInfo,
            { opacity: fadeAnim }
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(108,58,255,0.3)']}
            style={styles.debugGradient}
          >
            <Text style={styles.debugText}>
              Visible: {visibleMarkers.length} / {companies.length}
            </Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#0F0817" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingGradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingSpinner: {
    marginBottom: 24,
  },
  spinnerGradient: {
    borderRadius: 40,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#E0E0FF",
    marginBottom: 8,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  loadingSubtext: {
    color: "#BB86FC",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  // Custom marker styles
  customMarker: {
    alignItems: "center",
  },
  markerGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  markerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#6C3AFF",
    marginTop: -2,
  },
  // Cluster marker styles
  clusterMarker: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  clusterGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  clusterText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  clusterPulse: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#FF6B6B40",
    backgroundColor: "transparent",
  },
  // Callout styles
  androidCallout: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    borderRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  callout: {
    minWidth: 200,
    maxWidth: 250,
  },
  calloutGradient: {
    borderRadius: 16,
    padding: 0,
    overflow: "hidden",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  calloutImageContainer: {
    height: 100,
    overflow: "hidden",
  },
  calloutImage: {
    flex: 1,
    justifyContent: "flex-end",
  },
  calloutImageStyle: { 
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  calloutImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  calloutImageContent: {
    padding: 12,
    justifyContent: "flex-end",
  },
  calloutTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  calloutDetails: {
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  calloutCategory: {
    marginLeft: 6,
    fontSize: 14,
    color: "#E0E0FF",
    flex: 1,
  },
  calloutDistance: {
    marginLeft: 6,
    fontSize: 12,
    color: "#BB86FC",
    fontWeight: "600",
  },
  calloutTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  calloutTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  calloutTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "500",
  },
  // Cluster callout styles
  clusterCallout: {
    minWidth: 200,
  },
  clusterCalloutGradient: {
    borderRadius: 12,
    padding: 16,
  },
  clusterCalloutTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  clusterItem: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  clusterItemText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  moreText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  // Custom location button
  customLocationButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },
  locationButton: {
    width: 56,
    height: 56,
  },
  locationButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6C3AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  // Debug info
  debugInfo: {
    position: "absolute",
    top: 60,
    left: 20,
    borderRadius: 8,
    overflow: "hidden",
  },
  debugGradient: {
    padding: 8,
  },
  debugText: {
    color: "#BB86FC",
    fontSize: 12,
    fontWeight: "500",
  },
});