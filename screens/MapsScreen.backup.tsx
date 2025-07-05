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
import type { RootStackParamList } from "./RootStackParamList";
import * as Location from "expo-location";
import haversine from "haversine-distance";
import BASE_URL from "../config";

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
    elementType: "labels.text.stroke",
    stylers: [{ color: "#000000" }, { weight: 1 }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2e2e2e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3e3e3e" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#333333" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0d1b2a" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1f1f1f" }],
  },
];

type MapNav = NativeStackNavigationProp<RootStackParamList, "Map">;

export default function MapsScreen({ navigation }: { navigation: MapNav }) {
  const mapRef = useRef<MapView>(null);
  const { width, height } = Dimensions.get("window");
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      try {
        const res = await fetch(`${BASE_URL}/companies`);
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        setCompanies(data);
      } catch (e) {
        console.error("Error fetching companies:", e);
        Alert.alert("Error", "Could not load companies");
      }

      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading && location && companies.length && mapRef.current) {
      const coords = [
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        ...companies.map((c) => ({
          latitude: c.latitude,
          longitude: c.longitude,
        })),
      ];
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
  }, [loading, location, companies]);

  if (loading || !location)
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#9b59b6" />
    );

  const initialRegion: Region = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ width, height }}
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {companies.map((company, idx) => {
          const distKm = (
            haversine(
              { lat: location.coords.latitude, lng: location.coords.longitude },
              { lat: company.latitude, lng: company.longitude }
            ) / 1000
          ).toFixed(1);

          return (
            <Marker
              key={idx}
              coordinate={{
                latitude: company.latitude,
                longitude: company.longitude,
              }}
              pinColor="#bb86fc"
            >
              <Callout
                tooltip={Platform.OS === "ios"}
                style={
                  Platform.OS === "android" ? styles.androidCallout : undefined
                }
                // This is required for iOS to work
                onPress={() => navigation.navigate("Info", { company })}
              >
                {/* Conditionally wrap content for Android */}
                {Platform.OS === "android" ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate("Info", { company })}
                  >
                    <CalloutContent company={company} distKm={distKm} />
                  </TouchableOpacity>
                ) : (
                  // For iOS, we don't need TouchableOpacity since Callout handles it
                  <CalloutContent company={company} distKm={distKm} />
                )}
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

// Separate component for callout content
const CalloutContent = ({
  company,
  distKm,
}: {
  company: any;
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
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  // Fix for Android's default callout styling
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
  calloutImageStyle: { borderRadius: 12 },
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
});
