import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Dimensions,
  Alert,
  ActivityIndicator,
  Text,
  ImageBackground,
} from "react-native";
import MapView, { Marker, Region, Callout } from "react-native-maps";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "./RootStackParamList";
import * as Location from "expo-location";
import haversine from "haversine-distance";

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
        const res = await fetch("http://172.20.10.2:5298/companies");
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
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [loading, location, companies]);

  if (loading || !location) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  }

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
        style={{ width, height }}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {companies.map((company, index) => {
          const distMeters = haversine(
            { lat: location.coords.latitude, lng: location.coords.longitude },
            { lat: company.latitude, lng: company.longitude }
          );
          const distKm = (distMeters / 1000).toFixed(1);
          return (
            <Marker
              key={index}
              coordinate={{
                latitude: company.latitude,
                longitude: company.longitude,
              }}
            >
              <Callout
                tooltip
                onPress={() => navigation.navigate("Info", { company })}
              >
                <View style={styles.calloutContainer}>
                  <ImageBackground
                    source={{
                      uri: `data:image/jpg;base64,${company.profileImage}`,
                    }}
                    style={styles.calloutImage}
                    imageStyle={styles.calloutImageStyle}
                  >
                    <View style={styles.calloutOverlay} />
                    <Text style={styles.calloutTitle}>{company.name}</Text>
                  </ImageBackground>
                  <Text style={styles.calloutSubtitle}>{company.category}</Text>
                  <Text style={styles.calloutDistance}>{distKm} km</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  calloutContainer: {
    width: 150,
    padding: 6,
    backgroundColor: "white",
    borderRadius: 8,
    alignItems: "center",
    elevation: 4,
  },
  calloutImage: {
    width: "100%",
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
  },
  calloutImageStyle: { borderRadius: 8 },
  calloutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  calloutTitle: {
    position: "absolute",
    bottom: 4,
    left: 6,
    color: "white",
    fontWeight: "700",
  },
  calloutSubtitle: { marginTop: 4, fontSize: 12, color: "#555" },
  calloutDistance: {
    marginTop: 2,
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
});
