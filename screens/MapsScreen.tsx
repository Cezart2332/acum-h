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
} from "react-native";
import MapView, {
  Marker,
  Region,
  Callout,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import * as Location from "expo-location";
import haversine from "haversine-distance";
import { cachedFetch } from "../utils/apiCache";
import BASE_URL from "../config";

// Optimized map style - reduced complexity
const DARK_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#121212" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2e2e2e" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1b2a" }],
  },
];

type MapNav = NativeStackNavigationProp<RootStackParamList, "Map">;

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

// Memoized callout content component
const CalloutContent = React.memo(({
  company,
  distKm,
}: {
  company: CompanyData;
  distKm: string;
}) => (
  <View style={styles.callout}>
    <ImageBackground
      source={{
        uri: `data:image/jpg;base64,${company.profileImage}`,
      }}
      style={styles.calloutImage}
      imageStyle={styles.calloutImageStyle}
    >
      <View style={styles.overlay} />
      <Text style={styles.title}>{company.name}</Text>
    </ImageBackground>
    <Text style={styles.subtitle}>{company.category}</Text>
    <Text style={styles.distance}>{distKm} km</Text>
  </View>
));

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

export default function MapsScreen({ navigation }: { navigation: MapNav }) {
  const mapRef = useRef<MapView>(null);
  const { width, height } = Dimensions.get("window");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRegion, setCurrentRegion] = useState<MapRegion | null>(null);

  // Memoized location request
  const requestLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission to access location was denied");
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
      Alert.alert("Error", "Could not load companies");
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
    navigation.navigate("Info", { company });
  }, [navigation]);

  // Memoized marker render
  const renderMarker = useCallback((item: any, index: number) => {
    if (item.cluster) {
      // Render cluster marker
      return (
        <Marker
          key={`cluster-${index}`}
          coordinate={item.coordinate}
          pinColor="#ff6b6b"
        >
          <View style={styles.clusterMarker}>
            <Text style={styles.clusterText}>{item.companies.length}</Text>
          </View>
          <Callout tooltip={false}>
            <View style={styles.clusterCallout}>
              <Text style={styles.clusterCalloutTitle}>
                {item.companies.length} restaurante
              </Text>
              {item.companies.slice(0, 3).map((company: CompanyData, idx: number) => (
                <TouchableOpacity
                  key={company.id}
                  onPress={() => handleMarkerPress(company)}
                  style={styles.clusterItem}
                >
                  <Text style={styles.clusterItemText}>{company.name}</Text>
                </TouchableOpacity>
              ))}
              {item.companies.length > 3 && (
                <Text style={styles.moreText}>
                  +{item.companies.length - 3} mai multe
                </Text>
              )}
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
        pinColor="#bb86fc"
      >
        <Callout
          tooltip={Platform.OS === "ios"}
          style={Platform.OS === "android" ? styles.androidCallout : undefined}
          onPress={() => handleMarkerPress(company)}
        >
          {Platform.OS === "android" ? (
            <TouchableOpacity
              activeOpacity={0.7}
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
  }, [location, handleMarkerPress]);

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
        <ActivityIndicator size="large" color="#bb86fc" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ width, height }}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton
        maxZoomLevel={18}
        minZoomLevel={10}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {visibleMarkers.map(renderMarker)}
      </MapView>
      
      {/* Performance stats (can be removed in production) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Visible: {visibleMarkers.length} / {companies.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#bb86fc",
    marginTop: 10,
    fontSize: 16,
  },
  androidCallout: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    borderRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  callout: {
    width: 170,
    padding: 10,
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 8,
  },
  calloutImage: {
    width: "100%",
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
  },
  calloutImageStyle: { 
    borderRadius: 12 
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  title: {
    position: "absolute",
    bottom: 6,
    left: 10,
    color: "#bb86fc",
    fontWeight: "bold",
    fontSize: 14,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#ddd",
    textAlign: "center",
    width: "100%",
  },
  distance: {
    marginTop: 4,
    fontSize: 12,
    color: "#aaa",
    fontWeight: "600",
  },
  clusterMarker: {
    backgroundColor: "#ff6b6b",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  clusterText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  clusterCallout: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
  },
  clusterCalloutTitle: {
    color: "#bb86fc",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },
  clusterItem: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  clusterItemText: {
    color: "#fff",
    fontSize: 14,
  },
  moreText: {
    color: "#aaa",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },
  debugInfo: {
    position: "absolute",
    top: 50,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    color: "#bb86fc",
    fontSize: 12,
  },
});