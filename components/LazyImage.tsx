import React, { useState, useEffect } from "react";
import { Image, View, ActivityIndicator, StyleSheet } from "react-native";
import OptimizedApiService from "../services/OptimizedApiService";

interface LazyImageProps {
  locationId?: number;
  fallbackImage?: string;
  style?: any;
  defaultPhoto?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  locationId,
  fallbackImage,
  style,
  defaultPhoto,
}) => {
  const [imageUri, setImageUri] = useState<string>(defaultPhoto || "");
  const [loading, setLoading] = useState<boolean>(!!locationId && !defaultPhoto);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (locationId && !defaultPhoto) {
      loadImage();
    }
  }, [locationId, defaultPhoto]);

  const loadImage = async () => {
    if (!locationId) return;

    try {
      setLoading(true);
      const photo = await OptimizedApiService.getLocationPhoto(locationId);
      if (photo) {
        setImageUri(`data:image/jpeg;base64,${photo}`);
      } else {
        setError(true);
      }
    } catch (err) {
      console.warn(`Failed to load image for location ${locationId}:`, err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="small" color="#7C5DFF" />
      </View>
    );
  }

  if (error || !imageUri) {
    return (
      <View style={[styles.container, style, styles.placeholder]}>
        <View style={styles.placeholderContent} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      onError={() => setError(true)}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2A2A3A",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    backgroundColor: "#1A1A24",
    borderRadius: 8,
  },
  placeholderContent: {
    width: "60%",
    height: "60%",
    backgroundColor: "#3A3A4A",
    borderRadius: 4,
  },
});

export default LazyImage;
