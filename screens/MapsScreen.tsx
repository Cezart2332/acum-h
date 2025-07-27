import React, { useEffect, useState, useRef } from "react";
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
import type { RootStackParamList, LocationData } from "./RootStackParamList";
import * as Location from "expo-location";
import haversine from "haversine-distance";
import { BASE_URL } from "../config";
import { SafeAreaView } from "react-native-safe-area-context";

// Dark map style optimized for black/violet theme
const DARK_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#0F0817" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#A78BFA" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#000000" }, { weight: 2 }],
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
    stylers: [{ color: "#4A2E6B" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#1A0A2E" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1A1A2E" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2A1A4A" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#6C3AFF" }],
  },
];

type MapNav = NativeStackNavigationProp<RootStackParamList, "Map">;

export default function MapsScreen({ navigation }: { navigation: MapNav }) {
  const mapRef = useRef<MapView>(null);
  const { width, height } = Dimensions.get("window");
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permisiune",
            "Permisiunea pentru localizare a fost refuzată"
          );
          setLoading(false);
          return;
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        // Fetch locations
        const response = await fetch(`${BASE_URL}/locations`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const locationsData = await response.json();
        setLocations(locationsData);
      } catch (error) {
        console.error("Error loading map data:", error);
        Alert.alert("Eroare", "Nu s-au putut încărca datele hărții");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-fit to show all markers
  useEffect(() => {
    if (!loading && location && locations.length > 0 && mapRef.current) {
      const coordinates = [
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        ...locations.map((locationItem) => ({
          latitude: locationItem.latitude,
          longitude: locationItem.longitude,
        })),
      ];

      // Delay to ensure map is ready
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
          animated: true,
        });
      }, 1000);
    }
  }, [loading, location, locations]);

  if (loading || !location) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A78BFA" />
        <Text style={styles.loadingText}>Se încarcă harta...</Text>
      </SafeAreaView>
    );
  }

  const initialRegion: Region = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const renderCalloutContent = (
    locationItem: LocationData,
    distance: string
  ) => (
    <View style={styles.callout}>
      <ImageBackground
        source={{
          uri: `data:image/jpg;base64,${locationItem.photo}`,
        }}
        style={styles.calloutImage}
        imageStyle={styles.calloutImageStyle}
      >
        <View style={styles.overlay} />
        <Text style={styles.calloutTitle}>{locationItem.name}</Text>
      </ImageBackground>
      <View style={styles.calloutInfo}>
        <Text style={styles.calloutCategory}>
          {locationItem.company.category}
        </Text>
        <Text style={styles.calloutDistance}>{distance} km</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        zoomControlEnabled={true}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        {locations.map((locationItem) => {
          const distance = (
            haversine(
              { lat: location.coords.latitude, lng: location.coords.longitude },
              { lat: locationItem.latitude, lng: locationItem.longitude }
            ) / 1000
          ).toFixed(1);

          return (
            <Marker
              key={locationItem.id}
              coordinate={{
                latitude: locationItem.latitude,
                longitude: locationItem.longitude,
              }}
              pinColor="#A78BFA"
            >
              {Platform.OS === "ios" ? (
                <Callout
                  tooltip={true}
                  onPress={() =>
                    navigation.navigate("Info", { location: locationItem })
                  }
                >
                  {renderCalloutContent(locationItem, distance)}
                </Callout>
              ) : (
                // Android callout - use default bubble style with better styling
                <Callout
                  onPress={() =>
                    navigation.navigate("Info", { location: locationItem })
                  }
                  style={styles.androidCallout}
                >
                  <View style={styles.androidCalloutContent}>
                    <View style={styles.androidCalloutImageContainer}>
                      <ImageBackground
                        source={{
                          uri: `data:image/jpg;base64,${locationItem.photo}`,
                        }}
                        style={styles.androidCalloutImage}
                        imageStyle={styles.androidCalloutImageStyle}
                      >
                        <View style={styles.androidCalloutOverlay} />
                        <Text style={styles.androidCalloutTitle}>
                          {locationItem.name}
                        </Text>
                      </ImageBackground>
                    </View>
                    <View style={styles.androidCalloutInfo}>
                      <Text style={styles.androidCalloutCategory}>
                        {locationItem.company.category}
                      </Text>
                      <Text style={styles.androidCalloutDistance}>
                        {distance} km
                      </Text>
                    </View>
                  </View>
                </Callout>
              )}
            </Marker>
          );
        })}
      </MapView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0817",
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F0817",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#A78BFA",
    textAlign: "center",
  },
  // Android callout styling
  androidCallout: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    borderRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  androidCalloutContainer: {
    minWidth: 200,
    backgroundColor: "transparent",
  },
  androidCalloutTouchable: {
    borderRadius: 16,
    overflow: "hidden",
  },
  androidCalloutContent: {
    width: 180,
    backgroundColor: "#1A0A2E",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#6C3AFF",
  },
  androidCalloutImageContainer: {
    width: "100%",
    height: 80,
  },
  androidCalloutImage: {
    width: "100%",
    height: 80,
    justifyContent: "flex-end",
  },
  androidCalloutImageStyle: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  androidCalloutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  androidCalloutTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    textShadowColor: "#000000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  androidCalloutInfo: {
    padding: 8,
    alignItems: "center",
  },
  androidCalloutCategory: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  androidCalloutDistance: {
    color: "#C4B5FD",
    fontSize: 10,
    fontWeight: "500",
  },
  // Callout container
  callout: {
    width: 200,
    backgroundColor: "#1A0A2E",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#6C3AFF",
  },
  calloutImage: {
    width: "100%",
    height: 100,
    justifyContent: "flex-end",
  },
  calloutImageStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  calloutTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    textShadowColor: "#000000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  calloutInfo: {
    padding: 12,
    alignItems: "center",
  },
  calloutCategory: {
    color: "#A78BFA",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  calloutDistance: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "500",
  },
});
