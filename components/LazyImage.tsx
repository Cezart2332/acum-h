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
  // Start with defaultPhoto if it's a base64 string, otherwise empty
  const initialPhoto = defaultPhoto?.startsWith('data:image') ? defaultPhoto : "";
  const [imageUri, setImageUri] = useState<string>(initialPhoto);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // Always use API call for locations when locationId is provided,
    // unless defaultPhoto is a base64 string
    if (locationId) {
      if (!defaultPhoto || (!defaultPhoto.startsWith('data:image') && defaultPhoto.startsWith('http'))) {
        setLoading(true);
        setImageUri("");
        loadImage();
      }
    }
  }, [locationId, defaultPhoto]);

  const loadImage = async () => {
    if (!locationId) return;

    try {
      setLoading(true);
      const photoResult = await OptimizedApiService.getLocationPhoto(locationId);
      if (photoResult) {
        // PhotoResult is now either a URL or base64 data string
        setImageUri(photoResult);
      } else {
        setError(true);
      }
    } catch (err) {
      // Silent error handling - failed to load image
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
